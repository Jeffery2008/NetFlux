import { useState, useRef, useEffect, useCallback } from 'react';
import {
    applyTrafficOutcome,
    calculateWeightedLatency,
    readStreamChunkWithTimeout,
    selectHealthyTrafficNode,
} from '../lib/speedMetrics';

const CONFIG = {
    requestTimeout: 5000,
    trafficReadIdleTimeout: 3000,
    badNodeCooldownBase: 5000,
    badNodeCooldownMax: 30000,
    minUsefulTrafficBytes: 512 * 1024,
    logLimit: 50,
    chartUpdateInterval: 1000,
    latencyUpdateInterval: 1000
};

export function useSpeedTest() {
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState('Idle');

    // Metrics
    const [metrics, setMetrics] = useState({
        speed: '0.00', // MB/s (Total)
        peakSpeed: '0.00',
        delay: '--',   // ms (Average)
        totalFlow: 0,
        totalFlowStr: '0.00 KB',
        duration: '00:00'
    });

    const [logs, setLogs] = useState([
        { time: new Date().toLocaleTimeString(), type: 'info', content: 'Ready to test.' }
    ]);

    // Chart Data
    const chartDataRef = useRef({ time: [], speed: [], delay: [] });
    const onChartUpdateRef = useRef(null);

    // References
    // nodeStatsRef holds the per-node statistics (Speed, Bytes, Latency)
    // Key: Node ID, Value: { id, name, speed, bytes, latency, status }
    const nodeStatsRef = useRef({});

    // Thread tracking (pointers to active promises, though we just use abortController)
    const activeThreadsRef = useRef(0);

    const testStartTimeRef = useRef(0);
    const globalBytesRef = useRef(0);
    const refreshTimerRef = useRef(null);
    const latencyTimerRef = useRef(null);
    const abortControllerRef = useRef(new AbortController());
    const latencyTickingRef = useRef(false);
    const lastAggregateTimeRef = useRef(0);
    const peakSpeedRef = useRef(0);
    const nodeCursorRef = useRef(0);

    // State for per-node status table
    const [workerStats, setWorkerStats] = useState([]);

    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Shanghai', hour12: false });
    };

    const formatFlow = (bytes) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const createRequestController = (signal, timeoutMs) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const onAbort = () => controller.abort();
        if (signal) signal.addEventListener('abort', onAbort);
        let timeoutCleared = false;
        const clearRequestTimeout = () => {
            if (timeoutCleared) return;
            timeoutCleared = true;
            clearTimeout(timeoutId);
        };

        return {
            controller,
            clearRequestTimeout,
            cleanup: () => {
                clearRequestTimeout();
                if (signal) signal.removeEventListener('abort', onAbort);
            }
        };
    };

    const appendLog = useCallback((content, type = 'info') => {
        setLogs((prev) => {
            const next = [...prev, { time: getCurrentTime(), type, content }];
            return next.slice(-CONFIG.logLimit);
        });
    }, []);

    // --- Core Logic ---

    const measureLatency = async (node, signal) => {
        const url = node.url.startsWith('http') ? node.url : `https://${node.url}`;
        const cacheBust = `${url}${url.includes('?') ? '&' : '?'}ping=${Date.now()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
        const onAbort = () => controller.abort();
        if (signal) signal.addEventListener('abort', onAbort);

        try {
            const start = performance.now();
            await fetch(cacheBust, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store',
                mode: 'cors'
            });
            const rtt = Math.max(performance.now() - start, 1);
            return Math.round(rtt);
        } catch (e) {
            return null;
        } finally {
            clearTimeout(timeoutId);
            if (signal) signal.removeEventListener('abort', onAbort);
        }
    };

    // A single thread that continuously picks a random node and downloads
    const runTrafficThread = async (threadId, nodes, signal) => {
        activeThreadsRef.current++;

        while (!signal.aborted) {
            const selected = selectHealthyTrafficNode(
                nodes,
                nodeStatsRef.current,
                nodeCursorRef.current,
                Date.now()
            );

            if (!selected) {
                await new Promise(r => setTimeout(r, 250));
                continue;
            }

            const node = selected.node;
            nodeCursorRef.current = selected.nextCursor;
            const nodeId = node.id;

            // Ensure node entry exists (it should)
            if (!nodeStatsRef.current[nodeId]) continue;

            // Update status to running if not error
            if (nodeStatsRef.current[nodeId].status === 'pending' || nodeStatsRef.current[nodeId].status === 'pinging' || nodeStatsRef.current[nodeId].status === 'cooling') {
                nodeStatsRef.current[nodeId].status = 'downloading';
            }

            // 2. Download Request
            const url = node.url.startsWith('http') ? node.url : `https://${node.url}`;
            // Unique cache bust for every single request
            const cacheBust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}-${threadId}-${Math.random()}`;

            const { controller, clearRequestTimeout, cleanup } = createRequestController(signal, CONFIG.requestTimeout);

            try {
                const reqStart = performance.now();
                const response = await fetch(cacheBust, {
                    signal: controller.signal,
                    cache: 'no-store',
                    mode: 'cors'
                });
                clearRequestTimeout();

                // Update latency from traffic thread (TTFB)
                const lat = Math.round(performance.now() - reqStart);
                if (nodeStatsRef.current[nodeId]) {
                    nodeStatsRef.current[nodeId].latency = lat;
                }

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                if (!response.body) throw new Error("No body");

                const reader = response.body.getReader();
                let lastChunkTime = performance.now();
                const streamStartTime = performance.now();
                let requestBytes = 0;

                while (true) {
                    const { done, value } = await readStreamChunkWithTimeout(
                        reader,
                        CONFIG.trafficReadIdleTimeout,
                        controller
                    );
                    if (done) break;

                    // Force rotation of connections to allow latency checks and fresh TTFB samples
                    if (performance.now() - streamStartTime > 2000) {
                        try {
                             await reader.cancel();
                        } catch (e) {
                            // ignore cancel errors
                        }
                        break;
                    }

                    if (value) {
                        const now = performance.now();
                        const chunkSize = value.length;

                        // Atomic-like update to the specific node's stats
                        if (nodeStatsRef.current[nodeId]) {
                            nodeStatsRef.current[nodeId].bytes += chunkSize;
                            requestBytes += chunkSize;
                        }

                        lastChunkTime = now;
                    }
                }

                applyTrafficOutcome(nodeStatsRef.current[nodeId], {
                    ok: true,
                    bytes: requestBytes,
                    now: Date.now(),
                }, {
                    minUsefulBytes: CONFIG.minUsefulTrafficBytes,
                    cooldownBaseMs: CONFIG.badNodeCooldownBase,
                    cooldownMaxMs: CONFIG.badNodeCooldownMax,
                });
            } catch (e) {
                // Ignore Abort errors
                if (e.name !== 'AbortError' && !signal.aborted) {
                    const entry = nodeStatsRef.current[nodeId];
                    if (entry) {
                        entry.timeouts = (entry.timeouts || 0) + 1;
                    }
                }
                if (!signal.aborted) {
                    applyTrafficOutcome(nodeStatsRef.current[nodeId], {
                        ok: false,
                        bytes: 0,
                        now: Date.now(),
                    }, {
                        minUsefulBytes: CONFIG.minUsefulTrafficBytes,
                        cooldownBaseMs: CONFIG.badNodeCooldownBase,
                        cooldownMaxMs: CONFIG.badNodeCooldownMax,
                    });
                }
            } finally {
                cleanup();
            }

            // Small delay to prevent CPU spinning if network fails instantly
            await new Promise(r => setTimeout(r, 50));
        }

        activeThreadsRef.current--;
    };

    // --- Aggregation & Speed Calculation Loop ---

    const lastBytesMapRef = useRef({}); // { [nodeId]: totalBytesAtLastTick }

    const updateAggregates = () => {
        const now = performance.now();
        const lastAggregateTime = lastAggregateTimeRef.current || now;
        const elapsedSeconds = Math.max((now - lastAggregateTime) / 1000, 0.25);
        lastAggregateTimeRef.current = now;

        // 1. Duration
        let duration = '00:00';
        if (testStartTimeRef.current) {
            const sec = Math.floor((Date.now() - testStartTimeRef.current) / 1000);
            const m = String(Math.floor(sec / 60)).padStart(2, '0');
            const s = String(sec % 60).padStart(2, '0');
            duration = `${m}:${s}`;
        }

        let totalSpeed = 0;
        let totalBytesSession = 0;
        const currentStats = [];

        // 2. Iterate each node to calc speed based on byte delta
        Object.values(nodeStatsRef.current).forEach(node => {
            const currentBytes = node.bytes;
            const lastBytes = lastBytesMapRef.current[node.id] || 0;
            const deltaBytes = Math.max(currentBytes - lastBytes, 0);

            // Use the real sampling interval. Browser timers can drift when the tab is busy,
            // throttled, or resumed, and a fixed 1s divisor creates false traffic spikes.
            const rawNodeSpeed = (deltaBytes / (1024 * 1024)) / elapsedSeconds;
            const nodeSpeed = Number.isFinite(rawNodeSpeed) ? rawNodeSpeed : 0;

            // Update the node's speed display property
            node.speed = nodeSpeed;

            // Update map for next tick
            lastBytesMapRef.current[node.id] = currentBytes;

            // Stats for UI
            totalSpeed += nodeSpeed;
            totalBytesSession += currentBytes;

            // Push to array for Table
            currentStats.push({
                ...node,
                speed: nodeSpeed.toFixed(2),
                totalFlowStr: formatFlow(node.bytes)
            });
        });

        const weightedLatency = calculateWeightedLatency(Object.values(nodeStatsRef.current));

        const totalBytes = globalBytesRef.current + totalBytesSession;
        peakSpeedRef.current = Math.max(peakSpeedRef.current, totalSpeed);

        // 3. Update Global State
        setMetrics({
            speed: totalSpeed.toFixed(2),
            peakSpeed: peakSpeedRef.current.toFixed(2),
            delay: weightedLatency !== null ? String(weightedLatency) : 'Calculating...',
            totalFlow: totalBytes,
            totalFlowStr: formatFlow(totalBytes),
            duration
        });

        setWorkerStats(currentStats.sort((a, b) => a.id - b.id));

        // 4. Update Chart
        const cData = chartDataRef.current;
        cData.time.push(getCurrentTime());
        cData.speed.push(Number(totalSpeed.toFixed(2)));
        cData.delay.push(weightedLatency !== null ? weightedLatency : 0);

        if (onChartUpdateRef.current) {
            onChartUpdateRef.current(cData);
        }
    };

    const startTest = (nodes, threadCount = 16) => {
        if (!nodes || nodes.length === 0) {
            appendLog('No nodes selected.', 'warning');
            setTestStatus('No nodes selected');
            return;
        }

        if (isTesting) stopTest();

        setIsTesting(true);
        setTestStatus(`Running (${threadCount} Threads)`);
        testStartTimeRef.current = Date.now();
        globalBytesRef.current = 0;
        nodeStatsRef.current = {};
        lastBytesMapRef.current = {};
        activeThreadsRef.current = 0;
        lastAggregateTimeRef.current = performance.now();
        peakSpeedRef.current = 0;
        nodeCursorRef.current = 0;

        // Initialize Node Stats
        nodes.forEach(n => {
            nodeStatsRef.current[n.id] = {
                id: n.id,
                name: n.name,
                speed: 0,
                bytes: 0,
                latency: null,
                status: 'pending',
                isPinging: false,
                timeouts: 0,
                failures: 0,
                cooldownUntil: 0
            };
        });

        // Abort Controller
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        appendLog(`Started Traffic Mode: ${nodes.length} Nodes, ${threadCount} Threads.`, 'info');

        const runLatencySweep = () => {
            if (signal.aborted) return;

            nodes.forEach(node => {
                const entry = nodeStatsRef.current[node.id];
                if (!entry || entry.isPinging) return;

                // Mark as pinging to prevent overlapping checks for this specific node
                entry.isPinging = true;
                if (entry.status === 'pending') entry.status = 'pinging';

                measureLatency(node, signal)
                    .then(lat => {
                        if (!signal.aborted && nodeStatsRef.current[node.id]) {
                            // Only update if success, or if we want to show failure (latency=null)
                            // But since traffic threads also update latency, we don't want to overwrite a valid value with null due to queue timeout
                            if (lat !== null) {
                                nodeStatsRef.current[node.id].latency = lat;
                            }
                        }
                    })
                    .finally(() => {
                        if (nodeStatsRef.current[node.id]) {
                            nodeStatsRef.current[node.id].isPinging = false;
                        }
                    });
            });
        };

        // 1. Initial Latency Check + keep updating every second
        runLatencySweep();
        latencyTimerRef.current = setInterval(runLatencySweep, CONFIG.latencyUpdateInterval);

        // 2. Launch Thread Pool
        const actualThreads = Math.max(1, Math.min(64, threadCount));
        for (let i = 0; i < actualThreads; i++) {
            runTrafficThread(i, nodes, signal);
        }

        // 3. Start Aggregator
        refreshTimerRef.current = setInterval(updateAggregates, CONFIG.chartUpdateInterval);
    };

    const stopTest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        if (latencyTimerRef.current) {
            clearInterval(latencyTimerRef.current);
            latencyTimerRef.current = null;
        }
        setIsTesting(false);
        setTestStatus('Stopped');
        appendLog('Test stopped.', 'warning');
    };

    const setChartUpdateCallback = (fn) => {
        onChartUpdateRef.current = fn;
    };

    useEffect(() => {
        return () => stopTest();
    }, []);

    return {
        isTesting,
        testStatus,
        metrics,
        logs,
        workerStats,
        startTest,
        stopTest,
        setChartUpdateCallback,
        chartDataRef
    };
}

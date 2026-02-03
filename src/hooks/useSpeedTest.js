import { useState, useRef, useEffect, useCallback } from 'react';

const CONFIG = {
    requestTimeout: 5000,
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
            // 1. Pick a random node
            // We use simple random weighting for now. Could be round-robin or weighted by speed.
            const node = nodes[Math.floor(Math.random() * nodes.length)];
            const nodeId = node.id;

            // Ensure node entry exists (it should)
            if (!nodeStatsRef.current[nodeId]) continue;

            // Update status to running if not error
            if (nodeStatsRef.current[nodeId].status === 'pending' || nodeStatsRef.current[nodeId].status === 'pinging') {
                nodeStatsRef.current[nodeId].status = 'downloading';
            }

            // 2. Download Request
            const url = node.url.startsWith('http') ? node.url : `https://${node.url}`;
            // Unique cache bust for every single request
            const cacheBust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}-${threadId}-${Math.random()}`;

            try {
                const reqStart = performance.now();
                const response = await fetch(cacheBust, {
                    signal: signal,
                    cache: 'no-store',
                    mode: 'cors'
                });

                // Update latency from traffic thread (TTFB)
                const lat = Math.round(performance.now() - reqStart);
                if (nodeStatsRef.current[nodeId]) {
                    nodeStatsRef.current[nodeId].latency = lat;
                }

                if (!response.body) throw new Error("No body");

                const reader = response.body.getReader();
                let lastChunkTime = performance.now();
                const streamStartTime = performance.now();

                while (true) {
                    const { done, value } = await reader.read();
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
                        const duration = (now - lastChunkTime) / 1000; // seconds

                        // Atomic-like update to the specific node's stats
                        if (nodeStatsRef.current[nodeId]) {
                            nodeStatsRef.current[nodeId].bytes += chunkSize;

                            // Instant speed calculation for this thread's contribution
                            // Aggregation will sum these up, but here we update the node's "current speed" 
                            // Note: This is tricky with multiple threads hitting same node. 
                            // We should probably just track "bytes in last second" for the node, but for simplicity:
                            // We can add "bytes this interval" and let the aggregator calc speed?
                            // Or just simplistic: Speed = Chunk / Duration. 
                            // Since JS is single threaded, we can accumulate "speed points" or just rely on bytes/sec calculation in aggregator?
                            // BETTER APPROACH: The aggregator should calculate speed based on (NewBytes - OldBytes) / Interval.
                            // But keeping logical compatibility with manual update:
                            // We will just accumulate bytes. The speed field on the node might not reflect instantaneous "thread sum" correctly if we just overwrite it.
                            // FIX: We won't write `node.speed` here. We will let the aggregator calculate speed based on byte delta.
                        }

                        lastChunkTime = now;
                    }
                }
            } catch (e) {
                // Ignore Abort errors
                if (e.name !== 'AbortError') {
                    // console.error(e); // Optional debug
                    // Don't mark node as error immediately as other threads might be fine
                    // nodeStatsRef.current[nodeId].status = 'warning'; 
                }
            }

            // Small delay to prevent CPU spinning if network fails instantly
            await new Promise(r => setTimeout(r, 50));
        }

        activeThreadsRef.current--;
    };

    // --- Aggregation & Speed Calculation Loop ---

    const lastBytesMapRef = useRef({}); // { [nodeId]: totalBytesAtLastTick }

    const updateAggregates = () => {
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
        let validLatencySum = 0;
        let validLatencyCount = 0;
        const currentStats = [];

        // 2. Iterate each node to calc speed based on byte delta
        Object.values(nodeStatsRef.current).forEach(node => {
            const currentBytes = node.bytes;
            const lastBytes = lastBytesMapRef.current[node.id] || 0;
            const deltaBytes = currentBytes - lastBytes;

            // Calculate speed for this node based on 1s interval (CONFIG.chartUpdateInterval)
            // Speed = MB per second
            const nodeSpeed = (deltaBytes / (1024 * 1024)) / (CONFIG.chartUpdateInterval / 1000);

            // Update the node's speed display property
            node.speed = nodeSpeed;

            // Update map for next tick
            lastBytesMapRef.current[node.id] = currentBytes;

            // Stats for UI
            totalSpeed += nodeSpeed;
            totalBytesSession += currentBytes;

            if (node.latency !== null) {
                validLatencySum += node.latency;
                validLatencyCount++;
            }

            // Push to array for Table
            currentStats.push({
                ...node,
                speed: nodeSpeed.toFixed(2),
                totalFlowStr: formatFlow(node.bytes)
            });
        });

        const avgLatency = validLatencyCount > 0
            ? Math.round(validLatencySum / validLatencyCount)
            : null;

        const totalBytes = globalBytesRef.current + totalBytesSession;

        // 3. Update Global State
        setMetrics({
            speed: totalSpeed.toFixed(2),
            delay: avgLatency !== null ? String(avgLatency) : 'Calculating...',
            totalFlow: totalBytes,
            totalFlowStr: formatFlow(totalBytes),
            duration
        });

        setWorkerStats(currentStats.sort((a, b) => a.id - b.id));

        // 4. Update Chart
        const cData = chartDataRef.current;
        cData.time.push(getCurrentTime());
        cData.speed.push(Number(totalSpeed.toFixed(2)));
        cData.delay.push(avgLatency !== null ? avgLatency : 0);

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

        // Initialize Node Stats
        nodes.forEach(n => {
            nodeStatsRef.current[n.id] = {
                id: n.id,
                name: n.name,
                speed: 0,
                bytes: 0,
                latency: null,
                status: 'pending',
                isPinging: false
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

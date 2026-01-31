import React, { useRef, useEffect } from 'react';
import { MonitorChart } from './MonitorChart';
import { NodeSelector } from './NodeSelector';
import { StatsCard } from './StatsCard';
import { NodeStatusTable } from './NodeStatusTable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Download, Activity, Zap, Clock, Database, SlidersHorizontal } from 'lucide-react';

export function DashboardLayout({
    groups,
    testStatus,
    isTesting,
    metrics,
    logs,
    workerStats,
    onGroupChange,
    onStart,
    onStop,
    setChartUpdateCallback
}) {
    const chartRef = useRef(null);
    const scrollRef = useRef(null);
    const statsGridRef = useRef(null);
    const [showFloatingStats, setShowFloatingStats] = React.useState(false);
    const [threadCount, setThreadCount] = React.useState(16);
    const [compressionLevel, setCompressionLevel] = React.useState(4); // 0: None, 4: Max Compression

    // Smart Compression Logic
    useEffect(() => {
        const calculateCompression = () => {
            if (!showFloatingStats) {
                // Reset to 0 implies expanding when stats hide. 
                // But wait, if we scroll back up, showFloatingStats becomes false.
                // We want full controls then.
                setCompressionLevel(0);
                return;
            }

            const width = window.innerWidth;
            const halfWidth = width / 2;
            // Center Stats (approx 530px wide with Time / 2 = 265px) + Padding (20px)
            const centerOccupancy = 285;
            const availableSpace = halfWidth - centerOccupancy - 20;

            // Estimated Widths:
            // Full ~ 540px. 
            // Priority: Threads (Leftmost) must collapse FIRST (~160px saved) to avoid collision with Time.
            // Level 0: Show All (> 540px space provided)
            // Level 1: Collapse Threads (> 440px)
            // Level 2: Collapse Status (> 360px)
            // Level 3: Collapse Start (> 310px)
            // Else Level 4: Collapse Export

            if (availableSpace > 540) setCompressionLevel(0);
            else if (availableSpace > 440) setCompressionLevel(1);
            else if (availableSpace > 360) setCompressionLevel(2);
            else if (availableSpace > 310) setCompressionLevel(3);
            else setCompressionLevel(4);
        };

        calculateCompression();
        window.addEventListener('resize', calculateCompression);
        return () => window.removeEventListener('resize', calculateCompression);
    }, [showFloatingStats]);

    const isCollapsed = (level) => showFloatingStats && compressionLevel >= level;

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Connect chart update
    useEffect(() => {
        if (chartRef.current && setChartUpdateCallback) {
            setChartUpdateCallback(chartRef.current.update);
        }
    }, [setChartUpdateCallback]);

    const handleExport = () => {
        if (!chartRef.current) return;
        const imgData = chartRef.current.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#000000' // Dark background for export since theme is dark
        });
        if (imgData) {
            const anchor = document.createElement('a');
            anchor.href = imgData;
            anchor.download = `NetFlux_Export_${new Date().toLocaleString().replace(/[\/: ]/g, '-')}.png`;
            anchor.click();
        }
    };

    // Intersection Observer for Floating Stats Trigger
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If cards are NOT intersecting (scrolled out of view), show floating stats
                // We use isIntersecting: false to detect when it leaves view
                // Adding a small delay to make it feel responsive but not jumpy
                setShowFloatingStats(!entry.isIntersecting && entry.boundingClientRect.top < 0);
            },
            {
                threshold: 0.2, // Trigger when 20% remains visible (almost gone) or fully gone
                rootMargin: "-64px 0px 0px 0px" // Offset for header height
            }
        );

        if (statsGridRef.current) {
            observer.observe(statsGridRef.current);
        }

        return () => {
            if (statsGridRef.current) {
                observer.unobserve(statsGridRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Header */}
            <header
                className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50 transition-all duration-300 animate-enter"
                style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
                <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
                    <div className={`flex items-center space-x-2 transition-opacity duration-500 ${showFloatingStats ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">NETFLUX</h1>
                    </div>

                    {/* Floating Stats - Absolute Center with iOS Dynamic Island Physics */}
                    <div
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center space-x-6
                        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10
                        ${showFloatingStats
                                ? 'opacity-100 scale-100 blur-0 translate-y-[-50%]'
                                : 'opacity-0 scale-90 blur-sm translate-y-[-150%] pointer-events-none'
                            }
                        hidden md:flex bg-background/80 backdrop-blur-xl px-6 py-2 rounded-full border border-border/50 shadow-lg`}
                    >
                        <div className="flex items-center space-x-2">
                            <Zap className="h-3.5 w-3.5 text-[#0070F3]" />
                            <span className="text-xs font-medium text-muted-foreground">Speed</span>
                            <span className="text-sm font-bold tabular-nums text-[#0070F3]">{metrics.speed} <span className="text-[10px]">MB/s</span></span>
                        </div>
                        <div className="w-px h-3 bg-border"></div>
                        <div className="flex items-center space-x-2">
                            <Activity className="h-3.5 w-3.5 text-[#F5A623]" />
                            <span className="text-xs font-medium text-muted-foreground">Latency</span>
                            <span className="text-sm font-bold tabular-nums text-[#F5A623]">{metrics.delay} <span className="text-[10px]">ms</span></span>
                        </div>
                        <div className="w-px h-3 bg-border"></div>
                        <div className="flex items-center space-x-2">
                            <Database className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Data</span>
                            <span className="text-sm font-bold tabular-nums text-foreground">{metrics.totalFlowStr}</span>
                        </div>
                        <div className="w-px h-3 bg-border"></div>
                        <div className="flex items-center space-x-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Time</span>
                            <span className="text-sm font-bold tabular-nums text-foreground">{metrics.duration}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 z-20">
                        <div className="flex items-center space-x-3 z-20">
                            {/* Threads Control - Collapsible (Level 1 - First to Collapse) */}
                            <div
                                className={`flex items-center bg-muted/50 rounded-full border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
                                ${isCollapsed(1) ? 'w-8 h-8 px-0 justify-center bg-transparent border-transparent' : 'w-auto h-8 px-3 space-x-3'}`}
                                style={{ transitionDelay: showFloatingStats ? '0ms' : '150ms' }}
                            >
                                <SlidersHorizontal className={`flex-shrink-0 h-4 w-4 transition-colors duration-300 ${isCollapsed(1) ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground'}`} />

                                <div className={`flex items-center space-x-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left
                                    ${isCollapsed(1) ? 'w-0 opacity-0 translate-x-4' : 'w-[140px] opacity-100 translate-x-0'}`}>
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Threads: <span className="text-foreground font-bold tabular-nums">{threadCount}</span></span>
                                    <Slider
                                        defaultValue={[16]}
                                        max={64}
                                        min={1}
                                        step={1}
                                        className="w-20"
                                        onValueChange={(vals) => setThreadCount(vals[0])}
                                        disabled={isTesting}
                                    />
                                </div>
                            </div>

                            {/* Status Control - Collapsible (Level 2) */}
                            <div
                                className={`flex items-center bg-muted/50 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
                                ${isCollapsed(2) ? 'w-8 h-8 px-0 justify-center bg-transparent' : 'w-auto h-8 px-3 space-x-2'}`}
                                style={{ transitionDelay: showFloatingStats ? '50ms' : '100ms' }}
                            >
                                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${isTesting ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                                <div className={`flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left
                                ${isCollapsed(2) ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>
                                    <span className="text-xs font-medium text-muted-foreground uppercase whitespace-nowrap px-1">
                                        {testStatus}
                                    </span>
                                </div>
                            </div>

                            <div className="h-4 w-px bg-border"></div>

                            {/* Start/Stop Button - Collapsible (Level 3) */}
                            <div
                                className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${isCollapsed(3) ? 'w-9' : 'w-auto'}`}
                                style={{ transitionDelay: showFloatingStats ? '100ms' : '50ms' }}
                            >
                                {isTesting ? (
                                    <Button variant="destructive" size="sm" onClick={onStop} className={`transition-all duration-500 ${isCollapsed(3) ? 'px-0 w-9' : 'px-3'}`}>
                                        <Square className={`h-4 w-4 fill-current ${isCollapsed(3) ? 'mr-0' : 'mr-2'}`} />
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${isCollapsed(3) ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>Stop</span>
                                    </Button>
                                ) : (
                                    <Button size="sm" onClick={() => onStart(threadCount)} className={`transition-all duration-500 ${isCollapsed(3) ? 'px-0 w-9' : 'px-3'}`}>
                                        <Play className={`h-4 w-4 fill-current ${isCollapsed(3) ? 'mr-0' : 'mr-2'}`} />
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${isCollapsed(3) ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>Start</span>
                                    </Button>
                                )}
                            </div>

                            {/* Export Button - Collapsible (Level 4 - Last to Collapse) */}
                            <div
                                className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${isCollapsed(4) ? 'w-9' : 'w-auto'}`}
                                style={{ transitionDelay: showFloatingStats ? '150ms' : '0ms' }}
                            >
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={isTesting} className={`transition-all duration-500 ${isCollapsed(4) ? 'px-0 w-9' : 'px-3'}`}>
                                    <Download className={`h-4 w-4 ${isCollapsed(4) ? 'mr-0' : 'mr-2'}`} />
                                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${isCollapsed(4) ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>Export</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Sidebar: Node Selector */}
                <section
                    className="lg:col-span-3 flex flex-col space-y-4 h-[calc(100vh-8rem)] sticky top-20 animate-enter"
                    style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
                >
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                <Database className="h-4 w-4" /> Targets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 overflow-hidden">
                            <NodeSelector
                                groups={groups}
                                onSelectionChange={onGroupChange}
                                disabled={isTesting}
                            />
                        </CardContent>
                    </Card>
                </section>

                {/* Right Content */}
                <section className="lg:col-span-9 flex flex-col space-y-6">

                    {/* Top: Metrics Cards */}
                    <div
                        ref={statsGridRef}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-enter"
                        style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
                    >
                        <StatsCard
                            title="Speed"
                            value={metrics.speed}
                            unit="MB/s"
                            icon={Zap}
                            colorClass="text-[#0070F3]"
                        />
                        <StatsCard
                            title="Latency"
                            value={metrics.delay}
                            unit="ms"
                            icon={Activity}
                            colorClass="text-[#F5A623]"
                        />
                        <StatsCard
                            title="Total Data"
                            value={metrics.totalFlowStr}
                            // Unit is included in value string now
                            icon={Database}
                        />
                        <StatsCard
                            title="Duration"
                            value={metrics.duration}
                            unit="m:s"
                            icon={Clock}
                        />
                    </div>

                    {/* Middle: Chart */}
                    <Card
                        className="flex-1 min-h-[400px] animate-enter"
                        style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
                    >
                        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider">Real-time Monitor</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[400px]">
                            <MonitorChart ref={chartRef} />
                        </CardContent>
                    </Card>

                    {/* Middle 2: Node Status Table */}
                    <NodeStatusTable workerStats={workerStats} />


                    {/* Bottom: Logs */}
                    <Card
                        className="h-[500px] flex flex-col animate-enter"
                        style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
                    >
                        <CardHeader className="py-3 border-b">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Execution Log</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-3 overflow-y-auto bg-black/5 font-sans text-xs" ref={scrollRef}>
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className={`flex gap-2 ${log.type === 'danger' ? 'text-red-500' :
                                        log.type === 'success' ? 'text-green-500' :
                                            log.type === 'warning' ? 'text-yellow-500' : 'text-muted-foreground'
                                        }`}>
                                        <span className="opacity-50 inline-block w-[60px] tabular-nums">[{log.time}]</span>
                                        <span>{log.content}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </section>
            </main>
        </div>
    );
}

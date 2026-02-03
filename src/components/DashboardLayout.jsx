import React, { useRef, useEffect } from 'react';
import { MonitorChart } from './MonitorChart';
import { NodeSelector } from './NodeSelector';
import { StatsCard } from './StatsCard';
import { NodeStatusTable } from './NodeStatusTable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Download, Activity, Zap, Clock, Database, SlidersHorizontal, Sun, Moon } from 'lucide-react';

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
    setChartUpdateCallback,
    theme,
    onToggleTheme,
    startDisabled,
    showNoNodeToast
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
            const width = window.innerWidth;

            // On mobile, always collapse to ensure layout stability
            if (width < 768) {
                setCompressionLevel(4);
                return;
            }

            if (!showFloatingStats) {
                setCompressionLevel(0);
                return;
            }

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
            backgroundColor: theme === 'light' ? '#ffffff' : '#000000'
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
            {showNoNodeToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60]">
                    <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/90 backdrop-blur px-4 py-2 shadow-lg animate-enter">
                        <span className="text-sm font-medium text-destructive">请先勾选节点再开始测试</span>
                    </div>
                </div>
            )}
            {/* Header */}
            <header
                className="h-28 md:h-16 border-b bg-card rounded-md m-2 mt-2 md:mx-6 md:mt-4 shadow-sm border-border/40 sticky top-0 z-50 transition-all duration-300 animate-enter"
                style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
                <div className="container mx-auto px-4 h-full flex flex-row items-start md:items-center justify-between relative pt-4 md:pt-0">
                    <div className={`flex items-center space-x-3 transition-opacity duration-500 ${showFloatingStats ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
                        <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center transform transition-transform hover:scale-105 active:scale-95 duration-200">
                            <Zap className="h-5 w-5 fill-current" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">NETFLUX</h1>
                            <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase opacity-80">Speed Test</span>
                        </div>
                    </div>

                    {/* Floating Stats - Absolute Center with iOS Dynamic Island Physics */}
                    <div
                        className={`absolute left-2 right-2 md:left-1/2 md:right-auto bottom-3 md:bottom-auto md:top-1/2 md:-translate-x-1/2 flex items-center justify-center space-x-3 md:space-x-6
                        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10
                        ${showFloatingStats
                                ? 'opacity-100 scale-100 blur-0 translate-y-0 md:translate-y-[-50%]'
                                : 'opacity-0 scale-90 blur-sm translate-y-4 md:translate-y-[-150%] pointer-events-none'
                            }
                        bg-background/80 backdrop-blur-xl px-4 py-2 md:px-6 rounded-full border border-border/50 shadow-2xl w-auto md:w-max md:max-w-none ring-1 ring-white/10 dark:ring-white/5`}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex flex-col items-center md:flex-row md:space-x-2">
                                <div className="flex items-center space-x-1.5">
                                    <Zap className="h-3.5 w-3.5 text-[#0070F3]" />
                                    <span className="text-xs font-medium text-muted-foreground">Speed</span>
                                </div>
                                <span className="text-sm font-bold tabular-nums text-[#0070F3]">{metrics.speed} <span className="text-[10px] text-muted-foreground/70">MB/s</span></span>
                            </div>
                            
                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent hidden md:block"></div>
                            
                            <div className="flex flex-col items-center md:flex-row md:space-x-2">
                                <div className="flex items-center space-x-1.5">
                                    <Activity className="h-3.5 w-3.5 text-[#F5A623]" />
                                    <span className="text-xs font-medium text-muted-foreground">Latency</span>
                                </div>
                                <span className="text-sm font-bold tabular-nums text-[#F5A623]">{metrics.delay} <span className="text-[10px] text-muted-foreground/70">ms</span></span>
                            </div>

                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent hidden md:block"></div>

                            <div className="hidden md:flex flex-col items-center md:flex-row md:space-x-2">
                                <div className="flex items-center space-x-1.5">
                                    <Database className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Data</span>
                                </div>
                                <span className="text-sm font-bold tabular-nums text-foreground">{metrics.totalFlowStr}</span>
                            </div>

                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent hidden md:block"></div>

                            <div className="hidden md:flex flex-col items-center md:flex-row md:space-x-2">
                                <div className="flex items-center space-x-1.5">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Time</span>
                                </div>
                                <span className="text-sm font-bold tabular-nums text-foreground">{metrics.duration}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 z-20">
                        <div className="flex items-center space-x-3 z-20">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleTheme}
                                className="rounded-full border border-border/60 bg-background/60 backdrop-blur hover:bg-accent/70"
                                aria-label="Toggle theme"
                            >
                                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            </Button>


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
                                    <Button
                                        size="sm"
                                        onClick={() => onStart(threadCount)}
                                        disabled={startDisabled}
                                        className={`transition-all duration-500 ${isCollapsed(3) ? 'px-0 w-9' : 'px-3'}`}
                                    >
                                        <Play className={`h-4 w-4 fill-current ${isCollapsed(3) ? 'mr-0' : 'mr-2'}`} />
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-500 ${isCollapsed(3) ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>Start</span>
                                    </Button>
                                )}
                            </div>

                            {/* Export Button - Collapsible (Level 4 - Last to Collapse) */}
                            <div
                                className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden hidden sm:block ${isCollapsed(4) ? 'w-9' : 'w-auto'}`}
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
            </header >

            <main className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Sidebar: Node Selector (Order 2 on Mobile, Order 1 on Desktop) */}
                <section
                    className="order-2 lg:order-1 lg:col-span-3 flex flex-col space-y-4 h-auto lg:h-[calc(100vh-8rem)] sticky top-20 animate-enter"
                    style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
                >
                    <Card className="flex flex-col overflow-hidden mb-4">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4" /> Concurrency
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Worker Threads</span>
                                    <span className="text-sm font-bold tabular-nums">{threadCount}</span>
                                </div>
                                <Slider
                                    defaultValue={[16]}
                                    max={64}
                                    min={1}
                                    step={1}
                                    className="w-full"
                                    onValueChange={(vals) => setThreadCount(vals[0])}
                                    disabled={isTesting}
                                />
                            </div>
                        </CardContent>
                    </Card>
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

                {/* Right Content (Order 1 on Mobile, Order 2 on Desktop) */}
                <section className="order-1 lg:order-2 lg:col-span-9 flex flex-col space-y-6">

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
                            colorClass="text-purple-500"
                        />
                        <StatsCard
                            title="Duration"
                            value={metrics.duration}
                            icon={Clock}
                            colorClass="text-blue-500"
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
                        <CardContent className="flex-1 p-3 overflow-y-auto bg-muted/40 font-sans text-xs" ref={scrollRef}>
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

            {/* Footer */}
            <footer className="py-6 border-t mt-auto bg-card/30 backdrop-blur-sm">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground gap-4">
                    <div className="flex items-center gap-1">
                        <span>Built with ❤️ by</span>
                        <a href="https://github.com/Jeffery2008" target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline decoration-border underline-offset-4 transition-colors">
                            Jeffery
                        </a>
                    </div>
                    
                    <div className="flex items-center gap-6">
                         <a href="https://github.com/Jeffery2008/NetFlux" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors group">
                            <span>Project Repo</span>
                        </a>
                        <div className="w-px h-3 bg-border"></div>
                        <a href="https://github.com/Jeffery2008/NetFlux/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                            AGPL-3.0 License
                        </a>
                    </div>
                </div>
            </footer>
        </div >
    );
}

import React, { useRef, useEffect } from 'react';
import { MonitorChart } from './MonitorChart';
import { NodeSelector } from './NodeSelector';
import { StatsCard } from './StatsCard';
import { NodeStatusTable } from './NodeStatusTable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
                data-testid="app-header"
                className="sticky top-0 z-50 mx-2 mt-2 rounded-md border border-border/70 bg-background/90 shadow-sm backdrop-blur-xl transition-all duration-300 md:mx-6 md:mt-4 animate-enter"
                style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
                <div className="relative mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-3 px-4">
                    <div className={`flex min-w-0 items-center space-x-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showFloatingStats ? '-translate-x-5 opacity-0 blur-sm pointer-events-none' : 'translate-x-0 opacity-100 blur-0'}`}>
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-transform duration-200 hover:scale-105 active:scale-95">
                            <Zap className="h-5 w-5 fill-current" />
                        </div>
                        <div className="flex min-w-0 flex-col leading-none">
                            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">NETFLUX</h1>
                            <span className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-80">Speed Test</span>
                        </div>
                    </div>

                    <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-center">
                        <div
                            data-testid="floating-stats"
                            className={`pointer-events-auto flex h-12 min-w-0 origin-center items-center justify-center overflow-hidden rounded-full border ring-1 ring-white/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform dark:ring-white/10
                            ${showFloatingStats
                                    ? 'w-[min(480px,calc(100vw-2rem))] scale-x-100 scale-y-100 border-border/70 bg-background/78 px-2 opacity-100 shadow-[0_12px_44px_rgba(0,0,0,0.22)] backdrop-blur-2xl blur-0 dark:bg-background/72 dark:shadow-[0_12px_44px_rgba(0,0,0,0.58)] sm:px-3'
                                    : 'w-12 scale-x-[0.18] scale-y-75 border-transparent bg-background/10 px-0 opacity-0 shadow-none backdrop-blur-none blur-md pointer-events-none'
                                }`}
                        >
                            <div className={`flex w-full min-w-0 items-center justify-center gap-1.5 transition-all duration-300 sm:gap-2 ${showFloatingStats ? 'translate-y-0 opacity-100 blur-0 delay-100' : 'translate-y-2 opacity-0 blur-sm'}`}>
                                <div className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background sm:flex">
                                    <Zap className="h-4 w-4 fill-current" />
                                </div>

                                <div className="flex min-w-0 items-center gap-1 rounded-full px-1 sm:gap-1.5 sm:px-1.5" title="Current speed">
                                    <Zap className="h-3.5 w-3.5 flex-shrink-0 text-[#0070F3]" />
                                    <span className="truncate text-xs font-semibold tabular-nums text-[#0070F3] sm:text-sm">{metrics.speed}</span>
                                    <span className="flex-shrink-0 text-[9px] font-medium text-muted-foreground/70 sm:text-[10px]">MB/s</span>
                                </div>

                                <div className="h-6 w-px flex-shrink-0 bg-border/80"></div>

                                <div className="flex min-w-0 items-center gap-1 rounded-full px-1 sm:gap-1.5 sm:px-1.5" title="Total data used">
                                    <Database className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                    <span className="max-w-[4.8rem] truncate text-xs font-semibold tabular-nums text-foreground sm:max-w-[7rem] sm:text-sm">{metrics.totalFlowStr}</span>
                                </div>

                                <div className="ml-1 flex-shrink-0">
                                    {isTesting ? (
                                        <Button variant="destructive" size="sm" onClick={onStop} className="h-8 rounded-full px-3">
                                            <Square className="h-3.5 w-3.5 fill-current sm:mr-1.5" />
                                            <span className="hidden sm:inline">Stop</span>
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => onStart(threadCount)}
                                            disabled={startDisabled}
                                            className="h-8 rounded-full px-3"
                                        >
                                            <Play className="h-3.5 w-3.5 fill-current sm:mr-1.5" />
                                            <span className="hidden sm:inline">Start</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div data-testid="header-controls" className={`flex min-w-0 justify-end transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showFloatingStats ? 'translate-x-5 opacity-0 blur-sm pointer-events-none' : 'translate-x-0 opacity-100 blur-0'}`}>
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleTheme}
                                className="h-9 w-9 rounded-md border border-border/60 bg-background/70 backdrop-blur hover:bg-accent/70"
                                aria-label="Toggle theme"
                            >
                                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            </Button>


                            {/* Status Control - Collapsible (Level 2) */}
                            <div
                                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-muted/50 px-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-auto sm:space-x-2 sm:px-3"
                            >
                                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${isTesting ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                                <div className="flex w-0 origin-left translate-x-4 items-center opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-auto sm:translate-x-0 sm:opacity-100">
                                    <span className="text-xs font-medium text-muted-foreground uppercase whitespace-nowrap px-1">
                                        {testStatus}
                                    </span>
                                </div>
                            </div>

                            <div className="hidden h-4 w-px bg-border sm:block"></div>

                            {/* Start/Stop Button - Collapsible (Level 3) */}
                            <div className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                {isTesting ? (
                                    <Button variant="destructive" size="sm" onClick={onStop} className="px-3 transition-all duration-300">
                                        <Square className="mr-0 h-4 w-4 fill-current sm:mr-2" />
                                        <span className="hidden whitespace-nowrap sm:inline">Stop</span>
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => onStart(threadCount)}
                                        disabled={startDisabled}
                                        className="px-3 transition-all duration-300"
                                    >
                                        <Play className="mr-0 h-4 w-4 fill-current sm:mr-2" />
                                        <span className="hidden whitespace-nowrap sm:inline">Start</span>
                                    </Button>
                                )}
                            </div>

                            {/* Export Button - Collapsible (Level 4 - Last to Collapse) */}
                            <div className="hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:block">
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={isTesting} className="px-3 transition-all duration-300">
                                    <Download className="mr-2 h-4 w-4" />
                                    <span className="whitespace-nowrap">Export</span>
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
                            detail={`Peak ${metrics.peakSpeed} MB/s`}
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

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as echarts from 'echarts';

const MonitorChart = forwardRef((props, ref) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useImperativeHandle(ref, () => ({
        update: (data) => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.setOption({
                    xAxis: [{ data: data.time }],
                    series: [
                        { data: data.speed },
                        { data: data.delay }
                    ]
                });
            }
        },
        resize: () => {
            chartInstanceRef.current?.resize();
        },
        getDataURL: (opts) => {
            return chartInstanceRef.current?.getDataURL(opts);
        }
    }));

    const initChart = () => {
        if (!chartRef.current) return;

        // Vercel-like Theme Colors
        const speedColor = '#0070F3'; // Vercel Blue
        const delayColor = '#F5A623'; // Orange
        const gridColor = '#333';
        const textColor = '#888';

        const option = {
            backgroundColor: 'transparent',
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderColor: '#333',
                textStyle: { color: '#fff' },
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: '#444',
                        type: 'dashed'
                    }
                },
                formatter: (params) => {
                    let res = `<div class="font-sans text-xs text-muted-foreground mb-1">Time: ${params[0].name}</div>`;
                    params.forEach(item => {
                        const unit = item.seriesName === 'Speed' ? ' MB/s' : ' ms';
                        res += `<div class="flex items-center gap-2 text-xs font-sans">
                <span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>
                <span>${item.seriesName}:</span> <span class="font-bold tabular-nums">${item.value}</span>${unit}
             </div>`;
                    });
                    return res;
                }
            },
            legend: {
                data: ['Speed', 'Latency'],
                textStyle: { color: textColor, fontFamily: 'Inter, sans-serif' },
                bottom: 0
            },
            grid: {
                top: 30,
                left: 60,  // Increased for Speed label
                right: 60, // Increased for Latency label
                bottom: 40,
                containLabel: true,
                borderColor: gridColor
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: [],
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: textColor, fontSize: 10, fontFamily: 'Inter, sans-serif' },
                splitLine: { show: true, lineStyle: { color: '#222', width: 0.5 } }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Speed (MB/s)', // Added unit for clarity
                    nameLocation: 'middle',
                    nameGap: 40,
                    nameRotate: 90,
                    min: 0,
                    splitLine: { lineStyle: { color: '#222', width: 0.5 } },
                    axisLabel: { color: textColor, fontSize: 10, fontFamily: 'Inter, sans-serif' },
                    show: true,
                    nameTextStyle: {
                        color: textColor,
                        fontFamily: 'Inter, sans-serif'
                    }
                },
                {
                    type: 'value',
                    name: 'Latency (ms)', // Added unit
                    nameLocation: 'middle',
                    nameGap: 40,
                    nameRotate: -90,
                    min: 0,
                    splitLine: { show: false },
                    axisLabel: { show: false },
                    show: true,
                    nameTextStyle: {
                        color: textColor,
                        fontFamily: 'Inter, sans-serif'
                    }
                }
            ],
            series: [
                {
                    name: 'Speed',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: speedColor },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(0, 112, 243, 0.2)' },
                            { offset: 1, color: 'rgba(0, 112, 243, 0)' }
                        ])
                    },
                    data: [],
                    yAxisIndex: 0
                },
                {
                    name: 'Latency',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: delayColor },
                    data: [],
                    yAxisIndex: 1
                }
            ]
        };

        const instance = echarts.init(chartRef.current);
        instance.setOption(option);
        chartInstanceRef.current = instance;

        const resizeObserver = new ResizeObserver(() => instance.resize());
        resizeObserver.observe(chartRef.current);

        return () => {
            resizeObserver.disconnect();
            instance.dispose();
        };
    };

    useEffect(() => {
        return initChart();
    }, []);

    return <div ref={chartRef} className="w-full h-full min-h-[300px]" />;
});

MonitorChart.displayName = 'MonitorChart';

export { MonitorChart };

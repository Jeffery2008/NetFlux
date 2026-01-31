import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';

const CONFIG = {
  dataUrl: '/data/test-groups.json',
  maxDataPoint: 120,
  testInterval: 1000,
  requestTimeout: 3000,
  logLimit: 50
};

const DEFAULT_GROUPS = {
  fast: {
    name: '快速节点组',
    color: '#FF7D00',
    nodes: [
      { id: 1, name: '香港CN2节点', url: 'https://speed.hkcdn.net' },
      { id: 2, name: '东京软银节点', url: 'https://speed.tokyo01.sakura.ne.jp' },
      { id: 3, name: '新加坡直连节点', url: 'https://speed.singapore1.leaseweb.net' },
      { id: 4, name: '美国洛杉矶节点', url: 'https://speed.lax1.leaseweb.net' }
    ]
  },
  isp: {
    name: '运营商节点组',
    color: '#6600CC',
    nodes: [
      { id: 5, name: '北京联通节点', url: 'https://speed.bjtelecom.net.cn' },
      { id: 6, name: '广州移动节点', url: 'https://speed.gd.chinamobile.com' },
      { id: 7, name: '上海电信节点', url: 'https://speed.shtelecom.net.cn' }
    ]
  },
  factory: {
    name: '常规软件节点组',
    color: '#E60012',
    nodes: [
      { id: 8, name: '阿里杭州节点', url: 'https://speed.aliyun.com' },
      { id: 9, name: '腾讯深圳节点', url: 'https://speed.cloud.tencent.com' },
      { id: 10, name: '百度北京节点', url: 'https://speed.baidu.com' }
    ]
  }
};

function normalizeGroups(data) {
  if (!data || typeof data !== 'object') return DEFAULT_GROUPS;
  if (!data.groups || typeof data.groups !== 'object') return DEFAULT_GROUPS;
  return data.groups;
}

async function loadGroups() {
  try {
    const response = await fetch(CONFIG.dataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('数据读取失败');
    const data = await response.json();
    return normalizeGroups(data);
  } catch (error) {
    return DEFAULT_GROUPS;
  }
}

function buildChartOption(data) {
  return {
    title: {
      text: '网速(MB/s) & 延迟(ms) 实时监控',
      textStyle: { fontSize: 16, fontWeight: '500' },
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
      formatter: (params) => {
        let res = `时间：${params[0].name}`;
        params.forEach((item) => {
          const unit = item.seriesName.includes('网速') ? 'MB/s' : 'ms';
          res += `<br/>${item.seriesName}：${item.value}${unit}`;
        });
        return res;
      }
    },
    legend: {
      data: ['实时网速', '实时延迟'],
      top: 30,
      left: 'center'
    },
    grid: {
      left: '5%',
      right: '8%',
      bottom: '8%',
      top: '15%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        name: '测速时间',
        nameLocation: 'middle',
        nameGap: 30,
        data: data.time,
        axisLabel: { fontSize: 12 },
        boundaryGap: false
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '网速（MB/s）',
        nameTextStyle: { color: '#165DFF', fontSize: 12 },
        axisLine: { lineStyle: { color: '#165DFF' } },
        axisLabel: { formatter: '{value}', color: '#165DFF' },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      {
        type: 'value',
        name: '延迟（ms）',
        nameTextStyle: { color: '#00B42A', fontSize: 12 },
        axisLine: { lineStyle: { color: '#00B42A' }, left: 'auto', right: 0 },
        axisLabel: { formatter: '{value}', color: '#00B42A' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '实时网速',
        type: 'line',
        smooth: true,
        lineStyle: { width: 2, color: '#165DFF' },
        itemStyle: { color: '#165DFF' },
        data: data.speed,
        yAxisIndex: 0
      },
      {
        name: '实时延迟',
        type: 'line',
        smooth: true,
        lineStyle: { width: 2, color: '#00B42A' },
        itemStyle: { color: '#00B42A' },
        data: data.delay,
        yAxisIndex: 1
      }
    ],
    responsive: true
  };
}

function logTypeClass(type) {
  const colorMap = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-primary',
    default: 'text-gray-600'
  };
  return colorMap[type] || colorMap.default;
}

export default function App() {
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [currentGroupKey, setCurrentGroupKey] = useState('fast');
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState('未开始');
  const [currentNodeName, setCurrentNodeName] = useState('无');
  const [currentSpeed, setCurrentSpeed] = useState('0.00');
  const [currentDelay, setCurrentDelay] = useState('0');
  const [totalFlow, setTotalFlow] = useState('0.00');
  const [testDuration, setTestDuration] = useState('00:00');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'info', content: '【日志】选择分组后点击开始测速，支持多节点循环测速、图表导出' }
  ]);

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const chartDataRef = useRef({ time: [], speed: [], delay: [] });
  const testTimerRef = useRef(null);
  const currentNodeIndexRef = useRef(0);
  const totalBytesRef = useRef(0);
  const testStartTimeRef = useRef(0);
  const inFlightRef = useRef(false);

  const currentGroup = useMemo(
    () => groups[currentGroupKey] || { name: '未知分组', nodes: [] },
    [groups, currentGroupKey]
  );

  useEffect(() => {
    loadGroups().then((loaded) => {
      setGroups(loaded);
    });
  }, []);

  useEffect(() => {
    const keys = Object.keys(groups);
    if (keys.length === 0) return;
    if (!groups[currentGroupKey]) {
      setCurrentGroupKey(keys[0]);
    }
  }, [groups, currentGroupKey]);

  useEffect(() => {
    if (!chartRef.current) return;
    const instance = echarts.init(chartRef.current);
    chartInstanceRef.current = instance;
    instance.setOption(buildChartOption(chartDataRef.current));

    const resizeHandler = () => instance.resize();
    window.addEventListener('resize', resizeHandler);
    return () => {
      window.removeEventListener('resize', resizeHandler);
      instance.dispose();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) {
        clearInterval(testTimerRef.current);
      }
    };
  }, []);

  function appendLog(content, type = 'info') {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => {
      const next = [...prev, { time, type, content }];
      return next.slice(-CONFIG.logLimit);
    });
  }

  function resetChartData() {
    chartDataRef.current = { time: [], speed: [], delay: [] };
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setOption({
        xAxis: [{ data: [] }],
        series: [
          { name: '实时网速', data: [] },
          { name: '实时延迟', data: [] }
        ]
      });
    }
  }

  function updateChart(speed, delay) {
    const now = new Date();
    const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const chartData = chartDataRef.current;
    chartData.time.push(timeStr);
    chartData.speed.push(Number(speed));
    chartData.delay.push(Number(delay));

    if (chartData.time.length > CONFIG.maxDataPoint) {
      chartData.time.shift();
      chartData.speed.shift();
      chartData.delay.shift();
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.setOption({
        xAxis: [{ data: chartData.time }],
        series: [
          { name: '实时网速', data: chartData.speed },
          { name: '实时延迟', data: chartData.delay }
        ]
      });
    }
  }

  function updateDuration() {
    const duration = Math.floor((Date.now() - testStartTimeRef.current) / 1000);
    const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
    const seconds = String(duration % 60).padStart(2, '0');
    setTestDuration(`${minutes}:${seconds}`);
  }

  function toggleTest() {
    if (isTesting) {
      stopTest();
    } else {
      startTest();
    }
  }

  function startTest() {
    if (!currentGroup || currentGroup.nodes.length === 0) {
      appendLog('【错误】当前分组无可用节点，无法开始测速', 'danger');
      return;
    }
    setIsTesting(true);
    setTestStatus('测速中');
    setCurrentNodeName('无');
    setCurrentNodeId(null);
    setCurrentSpeed('0.00');
    setCurrentDelay('0');
    setTotalFlow('0.00');
    testStartTimeRef.current = Date.now();
    totalBytesRef.current = 0;
    currentNodeIndexRef.current = 0;
    resetChartData();
    appendLog(`【开始】${currentGroup.name}多节点循环测速（共${currentGroup.nodes.length}个节点）`, 'success');
    testTimerRef.current = setInterval(loopTestNode, CONFIG.testInterval);
  }

  function stopTest() {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    setIsTesting(false);
    setTestStatus('已停止');
    setCurrentNodeId(null);
    setProgress(0);
    appendLog(`【停止】${currentGroup.name}循环测速已停止`, 'warning');
  }

  async function loopTestNode() {
    if (!currentGroup || currentGroup.nodes.length === 0) return;
    if (inFlightRef.current) return;
    const node = currentGroup.nodes[currentNodeIndexRef.current];
    currentNodeIndexRef.current = (currentNodeIndexRef.current + 1) % currentGroup.nodes.length;
    setCurrentNodeName(node.name);
    setCurrentNodeId(node.id);
    setProgress((Math.random() * 20 + 80) % 100);
    updateDuration();
    await testSingleNode(node);
  }

  async function testSingleNode(node) {
    inFlightRef.current = true;
    const url = node.url.startsWith('http') ? node.url : `https://${node.url}`;
    const cacheBust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
    const start = performance.now();

    try {
      const response = await fetch(cacheBust, {
        signal: controller.signal,
        cache: 'no-store',
        mode: 'cors'
      });
      const blob = await response.blob();
      const elapsed = Math.max(performance.now() - start, 1);
      const bytes = blob.size || 1024;
      totalBytesRef.current += bytes;
      const speed = (bytes / (1024 * 1024) / (elapsed / 1000)).toFixed(2);
      const delay = Math.round(elapsed);

      setCurrentSpeed(speed);
      setCurrentDelay(String(delay));
      setTotalFlow((totalBytesRef.current / (1024 * 1024)).toFixed(2));
      updateChart(speed, delay);
      appendLog(`【${node.name}】测速成功：网速${speed}MB/s，延迟${delay}ms`, 'info');
    } catch (error) {
      setCurrentSpeed('0.00');
      setCurrentDelay('0');
      updateChart(0, 0);
      appendLog(`【${node.name}】测速失败：${error.message || '请求失败'}`, 'danger');
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
    }
  }

  function handleGroupChange(key) {
    if (isTesting) {
      appendLog('【提示】请先停止测速，再切换分组', 'warning');
      return;
    }
    setCurrentGroupKey(key);
    setCurrentNodeId(null);
    setCurrentNodeName('无');
    resetChartData();
  }

  function exportChart() {
    const chartData = chartDataRef.current;
    if (!chartData.time.length || !chartInstanceRef.current) {
      appendLog('【提示】暂无测速数据，无法导出图表', 'warning');
      return;
    }
    const imgData = chartInstanceRef.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });
    const anchor = document.createElement('a');
    anchor.href = imgData;
    anchor.download = `NetFlux_测速图表_${currentGroup.name}_${new Date().toLocaleString().replace(/[\/: ]/g, '-')}.png`;
    anchor.click();
    appendLog('【成功】图表已导出为PNG图片', 'success');
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <p className="text-xs tracking-[0.35em] text-gray-400 mb-2">NETFLUX</p>
        <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-bold text-primary mb-2">多分组循环测速工具</h1>
        <p className="text-gray-500 text-lg">纯前端 | 多节点循环 | 双轴实时图表 | 图表导出</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg p-6 card-shadow h-fit">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <i className="fa-solid fa-server text-primary"></i> 测速分组
          </h2>

          <div className="flex flex-col gap-3 mb-6">
            <button
              className={`w-full py-2 border rounded-md font-medium fast-group ${currentGroupKey === 'fast' ? 'group-active' : ''}`}
              onClick={() => handleGroupChange('fast')}
            >
              <i className="fa-solid fa-bolt mr-2"></i>快速节点组
              <span className="text-xs bg-fast/20 rounded px-2 py-0.5 ml-2">循环测速</span>
            </button>
            <button
              className={`w-full py-2 border rounded-md font-medium isp-group ${currentGroupKey === 'isp' ? 'group-active' : ''}`}
              onClick={() => handleGroupChange('isp')}
            >
              <i className="fa-solid fa-signal mr-2"></i>运营商节点组
              <span className="text-xs bg-isp/20 rounded px-2 py-0.5 ml-2">联通/移动/电信</span>
            </button>
            <button
              className={`w-full py-2 border rounded-md font-medium factory-group ${currentGroupKey === 'factory' ? 'group-active' : ''}`}
              onClick={() => handleGroupChange('factory')}
            >
              <i className="fa-solid fa-building mr-2"></i>常规软件节点组
              <span className="text-xs bg-factory/20 rounded px-2 py-0.5 ml-2">阿里/腾讯/百度</span>
            </button>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <i className="fa-solid fa-list-ul"></i> 当前分组节点（<span>{currentGroup.nodes.length}</span>个）
            </h3>
            <div className="mt-2 max-h-80 overflow-y-auto space-y-2 p-2 border border-gray-200 rounded-md">
              {currentGroup.nodes.length === 0 ? (
                <div className="text-gray-400 text-center py-4">该分组无可用节点</div>
              ) : (
                currentGroup.nodes.map((node) => (
                  <div key={node.id} className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{node.name}</p>
                      <p className="text-xs text-gray-400 truncate">{node.url}</p>
                    </div>
                    <i className={`fa-solid fa-circle text-xs ${currentNodeId === node.id ? 'text-primary' : 'text-gray-300'}`}></i>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            className={`w-full py-2 rounded-md font-medium ${isTesting ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white hover:bg-primary/90'}`}
            disabled={isTesting}
            onClick={exportChart}
          >
            <i className="fa-solid fa-download mr-2"></i>导出图表为PNG
          </button>
        </div>

        <div className="lg:col-span-3 bg-white rounded-lg p-6 card-shadow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500">当前分组：</span>
                <span className="text-base font-medium text-primary">{currentGroup.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">测速状态：</span>
                <span className={`text-base font-medium ${isTesting ? 'text-primary' : 'text-gray-500'}`}>{testStatus}</span>
                <span className={`text-xs text-gray-400 ${isTesting ? '' : 'hidden'}`}>(当前节点：{currentNodeName})</span>
              </div>
            </div>
            <button
              className={`w-full sm:w-48 py-3 rounded-md font-medium flex items-center justify-center gap-2 ${isTesting ? 'bg-danger text-white hover:bg-danger/90' : 'bg-success text-white hover:bg-success/90'}`}
              onClick={toggleTest}
            >
              <i className={`fa-solid ${isTesting ? 'fa-stop' : 'fa-play'}`}></i>
              {isTesting ? '停止连续测速' : '开始连续测速'}
            </button>
          </div>

          <div className="mb-6">
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary progress-animate" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-primary"></i>实时网络监控图表
            </h3>
            <div ref={chartRef} className="w-full h-96 border border-gray-200 rounded-md p-3"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">当前网速</p>
              <p className="text-2xl font-bold num-animate text-speed">{currentSpeed} <span className="text-sm">MB/s</span></p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">当前延迟</p>
              <p className="text-2xl font-bold num-animate text-delay">{currentDelay} <span className="text-sm">ms</span></p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">累计流量</p>
              <p className="text-2xl font-bold num-animate text-primary">{totalFlow} <span className="text-sm">MB</span></p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">测速时长</p>
              <p className="text-2xl font-bold num-animate text-gray-800">{testDuration}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <i className="fa-solid fa-file-text text-gray-500"></i>测速日志
            </h3>
            <div className="w-full h-40 border border-gray-200 rounded-md p-3 text-sm overflow-y-auto bg-gray-50 font-mono">
              {logs.map((log, index) => (
                <div key={`${log.time}-${index}`} className={logTypeClass(log.type)}>
                  [{log.time}] {log.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

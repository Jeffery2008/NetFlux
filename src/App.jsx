import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { useSpeedTest } from './hooks/useSpeedTest';

// Configuration for loading external data
const DATA_URL = '/data/test-groups.json';
const DEFAULT_GROUPS = {
  fast: {
    name: 'Default Group',
    color: '#FF7D00',
    nodes: [
      { id: 1, name: 'Backup Node', url: 'https://speed.cloudflare.com' }
    ]
  }
};

async function loadGroups() {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load data');
    const data = await response.json();
    return data.groups || DEFAULT_GROUPS;
  } catch (error) {
    console.warn('Using default groups:', error);
    return DEFAULT_GROUPS;
  }
}

function App() {
  const [groups, setGroups] = useState({});
  const [selectedNodes, setSelectedNodes] = useState([]);

  const {
    isTesting,
    testStatus,
    metrics,
    logs,
    workerStats,
    startTest,
    stopTest,
    setChartUpdateCallback
  } = useSpeedTest();

  useEffect(() => {
    loadGroups().then(setGroups);
  }, []);

  const handleStart = (threadCount = 16) => {
    startTest(selectedNodes, threadCount);
  };

  return (
    <DashboardLayout
      groups={groups}
      testStatus={testStatus}
      isTesting={isTesting}
      metrics={metrics}
      logs={logs}
      workerStats={workerStats}
      onGroupChange={setSelectedNodes}
      onStart={handleStart}
      onStop={stopTest}
      setChartUpdateCallback={setChartUpdateCallback}
    />
  );
}

export default App;

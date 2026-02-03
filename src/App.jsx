import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { useSpeedTest } from './hooks/useSpeedTest';

// Configuration for loading external data
const DATA_URL = '/data/test-groups.json';
const THEME_KEY = 'netflux-theme';
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
  const [showNoNodeToast, setShowNoNodeToast] = useState(false);
  const toastTimerRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      return localStorage.getItem(THEME_KEY) || 'system';
    } catch {
      return 'system';
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => setResolvedTheme(media.matches ? 'light' : 'dark');
    sync();
    if (media.addEventListener) {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Apply data-theme attribute
    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.setAttribute('data-theme', systemTheme);
        root.className = systemTheme; // Fallback for some Tailwind configs
    } else {
        root.setAttribute('data-theme', theme);
        root.className = theme;
    }

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleStart = (threadCount = 16) => {
    if (!selectedNodes || selectedNodes.length === 0) {
      setShowNoNodeToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowNoNodeToast(false), 2200);
      startTest(selectedNodes, threadCount);
      return;
    }
    startTest(selectedNodes, threadCount);
  };

  const effectiveTheme = theme === 'system' ? resolvedTheme : theme;
  const handleToggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'system') {
        return resolvedTheme === 'light' ? 'dark' : 'light';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
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
      theme={effectiveTheme}
      onToggleTheme={handleToggleTheme}
      startDisabled={!selectedNodes || selectedNodes.length === 0}
      showNoNodeToast={showNoNodeToast}
    />
  );
}

export default App;

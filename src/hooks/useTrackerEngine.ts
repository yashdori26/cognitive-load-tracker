import { useState, useEffect, useRef, useCallback } from 'react';

interface KeyEvent {
  timestamp: number;
  type: 'down' | 'up';
  key: string;
}

interface MouseEvent {
  timestamp: number;
  x: number;
  y: number;
}

interface TelemetryEvent {
  timestamp: number;
  type: string;
  metric?: string;
  value?: number;
}

interface Metrics {
  load: number;
  volatility: number;
  sampleCount: number;
  mouseBufferSize: number;
  anomalyCount: number;
  isIdle: boolean;
}

const EMA_ALPHA = 0.15;
const IDLE_THRESHOLD_MS = 5000;
const HISTORY_SIZE = 200;
const ANOMALY_THRESHOLD = 2.5;

export const useTrackerEngine = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    load: 0,
    volatility: 0,
    sampleCount: 0,
    mouseBufferSize: 0,
    anomalyCount: 0,
    isIdle: true,
  });

  const [loadHistory, setLoadHistory] = useState<number[]>([]);
  const [mousePositions, setMousePositions] = useState<MouseEvent[]>([]);
  const [telemetryLog, setTelemetryLog] = useState<TelemetryEvent[]>([]);

  const keyEventsRef = useRef<KeyEvent[]>([]);
  const mouseEventsRef = useRef<MouseEvent[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const emaLoadRef = useRef<number>(0);
  const recentLatenciesRef = useRef<number[]>([]);
  const anomalyCountRef = useRef<number>(0);

  const logTelemetry = useCallback((type: string, metric?: string, value?: number) => {
    const event: TelemetryEvent = {
      timestamp: Date.now(),
      type,
      ...(metric && { metric }),
      ...(value !== undefined && { value }),
    };
    setTelemetryLog((prev) => [...prev, event]);
  }, []);

  const computeMetrics = useCallback(() => {
    const now = Date.now();
    const windowStart = now - 1000;

    // Filter events in the last second
    const recentKeyEvents = keyEventsRef.current.filter(e => e.timestamp > windowStart);
    const recentMouseEvents = mouseEventsRef.current.filter(e => e.timestamp > windowStart);

    // Compute dwell and flight times
    const downEvents = recentKeyEvents.filter(e => e.type === 'down');
    const upEvents = recentKeyEvents.filter(e => e.type === 'up');
    
    const dwellTimes: number[] = [];
    downEvents.forEach((down) => {
      const matchingUp = upEvents.find(up => up.key === down.key && up.timestamp > down.timestamp);
      if (matchingUp) {
        dwellTimes.push(matchingUp.timestamp - down.timestamp);
      }
    });

    const flightTimes: number[] = [];
    for (let i = 1; i < downEvents.length; i++) {
      flightTimes.push(downEvents[i].timestamp - downEvents[i - 1].timestamp);
    }

    // Compute mouse intervals and acceleration
    const mouseIntervals: number[] = [];
    const mouseAccels: number[] = [];
    for (let i = 1; i < recentMouseEvents.length; i++) {
      const dt = recentMouseEvents[i].timestamp - recentMouseEvents[i - 1].timestamp;
      mouseIntervals.push(dt);
      
      if (i > 1) {
        const dx1 = recentMouseEvents[i - 1].x - recentMouseEvents[i - 2].x;
        const dy1 = recentMouseEvents[i - 1].y - recentMouseEvents[i - 2].y;
        const dx2 = recentMouseEvents[i].x - recentMouseEvents[i - 1].x;
        const dy2 = recentMouseEvents[i].y - recentMouseEvents[i - 1].y;
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const accel = Math.abs(dist2 - dist1);
        mouseAccels.push(accel);
      }
    }

    const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const variance = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      return arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
    };

    const meanDwell = mean(dwellTimes);
    const meanFlight = mean(flightTimes);
    const meanMouseInterval = mean(mouseIntervals);
    const mouseAccelVariance = variance(mouseAccels);

    // Composite latency metric
    const compositeLatency = (meanDwell * 0.3) + (meanFlight * 0.3) + (meanMouseInterval * 0.2) + (mouseAccelVariance * 0.2);
    
    // Track recent latencies for volatility
    recentLatenciesRef.current.push(compositeLatency);
    if (recentLatenciesRef.current.length > 30) {
      recentLatenciesRef.current.shift();
    }

    const volatility = Math.sqrt(variance(recentLatenciesRef.current));

    // Anomaly detection
    const meanLatency = mean(recentLatenciesRef.current);
    const stdLatency = Math.sqrt(variance(recentLatenciesRef.current));
    if (stdLatency > 0 && Math.abs(compositeLatency - meanLatency) > ANOMALY_THRESHOLD * stdLatency) {
      anomalyCountRef.current += 1;
      logTelemetry('anomaly', 'compositeLatency', compositeLatency);
    }

    // EMA smoothing
    emaLoadRef.current = EMA_ALPHA * compositeLatency + (1 - EMA_ALPHA) * emaLoadRef.current;

    // Normalize to 0-100 scale (arbitrary scaling)
    const normalizedLoad = Math.min(100, Math.max(0, emaLoadRef.current / 2));

    // Check idle
    const isIdle = now - lastActivityRef.current > IDLE_THRESHOLD_MS;

    setMetrics({
      load: isIdle ? 0 : normalizedLoad,
      volatility: isIdle ? 0 : volatility,
      sampleCount: recentKeyEvents.length + recentMouseEvents.length,
      mouseBufferSize: mouseEventsRef.current.length,
      anomalyCount: anomalyCountRef.current,
      isIdle,
    });

    setLoadHistory((prev) => {
      const updated = [...prev, isIdle ? 0 : normalizedLoad];
      return updated.slice(-HISTORY_SIZE);
    });

    logTelemetry('metrics_computed', 'load', normalizedLoad);
  }, [logTelemetry]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      keyEventsRef.current.push({ timestamp: now, type: 'down', key: e.key });
      lastActivityRef.current = now;
      logTelemetry('keydown', e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const now = Date.now();
      keyEventsRef.current.push({ timestamp: now, type: 'up', key: e.key });
      lastActivityRef.current = now;
      logTelemetry('keyup', e.key);
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const now = Date.now();
      const mouseEvent = { timestamp: now, x: e.clientX, y: e.clientY };
      mouseEventsRef.current.push(mouseEvent);
      lastActivityRef.current = now;

      setMousePositions((prev) => {
        const updated = [...prev, mouseEvent];
        return updated.slice(-100); // Keep last 100 positions for heatmap
      });

      // Throttle cleanup
      if (mouseEventsRef.current.length > 1000) {
        mouseEventsRef.current = mouseEventsRef.current.slice(-500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    const interval = setInterval(computeMetrics, 1000);

    // Cleanup old events every 10 seconds
    const cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - 10000;
      keyEventsRef.current = keyEventsRef.current.filter(e => e.timestamp > cutoff);
      mouseEventsRef.current = mouseEventsRef.current.filter(e => e.timestamp > cutoff);
    }, 10000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [computeMetrics, logTelemetry]);

  const exportTelemetry = useCallback(() => {
    const csv = [
      ['Timestamp', 'Type', 'Metric', 'Value'],
      ...telemetryLog.map(e => [
        new Date(e.timestamp).toISOString(),
        e.type,
        e.metric || '',
        e.value?.toString() || '',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognitive-load-telemetry-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [telemetryLog]);

  return {
    metrics,
    loadHistory,
    mousePositions,
    exportTelemetry,
  };
};

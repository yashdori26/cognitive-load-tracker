import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTrackerEngine } from '@/hooks/useTrackerEngine';
import { HUD } from '@/components/HUD';
import { LoadChart } from '@/components/LoadChart';
import { Heatmap } from '@/components/Heatmap';
import { Brain } from 'lucide-react';

const Index = () => {
  const { metrics, loadHistory, mousePositions, exportTelemetry } = useTrackerEngine();

  useEffect(() => {
    document.title = 'Cognitive Load Tracker';
  }, []);

  // Dynamic background color based on load
  const getBgGradient = () => {
    const loadPercent = metrics.load / 100;
    const hue1 = 220 - loadPercent * 40; // Shifts from blue to warmer
    const hue2 = 189 + loadPercent * 30;
    return `linear-gradient(135deg, hsl(${hue1}, 20%, 6%) 0%, hsl(${hue2}, 30%, 8%) 100%)`;
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-all duration-1000"
      style={{ background: getBgGradient() }}
    >
      <Heatmap mousePositions={mousePositions} />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary text-glow-primary" />
            <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">
              Cognitive Load Tracker
            </h1>
          </div>
        </motion.header>

        <HUD {...metrics} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <LoadChart loadHistory={loadHistory} />
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          <p>Real-time cognitive load analysis • Tracking keyboard and mouse interactions</p>
          <p className="mt-1">Move your mouse and type to generate load data</p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;

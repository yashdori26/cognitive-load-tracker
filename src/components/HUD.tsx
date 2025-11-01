import { motion } from 'framer-motion';
import { Activity, TrendingUp, Database, MousePointer, AlertTriangle } from 'lucide-react';

interface HUDProps {
  load: number;
  volatility: number;
  sampleCount: number;
  mouseBufferSize: number;
  anomalyCount: number;
  isIdle: boolean;
}

export const HUD = ({ load, volatility, sampleCount, mouseBufferSize, anomalyCount, isIdle }: HUDProps) => {
  const getLoadColor = () => {
    if (load < 30) return 'text-primary';
    if (load < 70) return 'text-accent';
    return 'text-destructive';
  };

  const stats = [
    {
      icon: Activity,
      label: 'Cognitive Load',
      value: `${load.toFixed(1)}%`,
      color: getLoadColor(),
      glow: load > 50,
    },
    {
      icon: TrendingUp,
      label: 'Volatility',
      value: volatility.toFixed(2),
      color: 'text-muted-foreground',
      glow: false,
    },
    {
      icon: Database,
      label: 'Samples/sec',
      value: sampleCount.toString(),
      color: 'text-muted-foreground',
      glow: false,
    },
    {
      icon: MousePointer,
      label: 'Mouse Buffer',
      value: mouseBufferSize.toString(),
      color: 'text-muted-foreground',
      glow: false,
    },
    {
      icon: AlertTriangle,
      label: 'Anomalies',
      value: anomalyCount.toString(),
      color: anomalyCount > 0 ? 'text-accent' : 'text-muted-foreground',
      glow: anomalyCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative"
        >
          <div className={`bg-card border border-border rounded p-4 ${stat.glow ? 'glow-primary' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${stat.color} ${stat.glow ? 'text-glow-primary' : ''}`}>
              {stat.value}
            </div>
          </div>
        </motion.div>
      ))}
      
      {isIdle && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 bg-muted border border-border rounded px-4 py-2 flex items-center gap-2"
        >
          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">Idle</span>
        </motion.div>
      )}
    </div>
  );
};

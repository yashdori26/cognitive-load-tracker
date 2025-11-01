import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MouseEvent {
  timestamp: number;
  x: number;
  y: number;
}

interface HeatmapProps {
  mousePositions: MouseEvent[];
}

export const Heatmap = ({ mousePositions }: HeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const maxAge = 5000; // 5 seconds

    // Draw fading trail
    mousePositions.forEach((pos, index) => {
      const age = now - pos.timestamp;
      if (age > maxAge) return;

      const opacity = 1 - age / maxAge;
      const size = 3 + (1 - age / maxAge) * 3;

      // Create radial gradient for glow effect
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 3);
      gradient.addColorStop(0, `hsla(189, 100%, 50%, ${opacity * 0.8})`);
      gradient.addColorStop(0.5, `hsla(189, 100%, 50%, ${opacity * 0.4})`);
      gradient.addColorStop(1, `hsla(189, 100%, 50%, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(pos.x - size * 3, pos.y - size * 3, size * 6, size * 6);

      // Draw core point
      ctx.fillStyle = `hsla(189, 100%, 50%, ${opacity})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw connecting lines between recent positions
    if (mousePositions.length > 1) {
      const recentPositions = mousePositions.slice(-20);
      ctx.strokeStyle = 'hsla(189, 100%, 50%, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(recentPositions[0].x, recentPositions[0].y);
      recentPositions.slice(1).forEach(pos => {
        ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
    }
  }, [mousePositions]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

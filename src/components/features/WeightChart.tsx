import React from 'react';
import type { WeightEntry } from '../../types/weight';

interface Props { entries: WeightEntry[]; height?: number; width?: number }

export const WeightChart: React.FC<Props> = ({ entries, height = 120, width = 400 }) => {
  if (!entries || entries.length === 0) return <div>No chart data</div>;

  const points = entries.map(e => ({ x: new Date(e.date).getTime(), y: e.weightKg }));
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const margin = 8;
  const plotW = width - margin * 2;
  const plotH = height - margin * 2;

  const scaleX = (x: number) => ((x - minX) / (maxX - minX || 1)) * plotW + margin;
  const scaleY = (y: number) => plotH - ((y - minY) / (maxY - minY || 1)) * plotH + margin;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ');

  return (
    <svg width={width} height={height} role="img" aria-label="Weight over time">
      <rect x={0} y={0} width={width} height={height} fill="#fff" stroke="#eee" />
      <path d={path} fill="none" stroke="#1976d2" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={scaleX(p.x)} cy={scaleY(p.y)} r={3} fill="#1976d2" />
      ))}
    </svg>
  );
}

export default WeightChart;

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import WeightChart from '../components/features/WeightChart';

describe('WeightChart', () => {
  it('renders an SVG with path and points', () => {
    const entries = [
      { id: '1', date: '2025-11-01', weightKg: 70 },
      { id: '2', date: '2025-11-10', weightKg: 69.5 },
      { id: '3', date: '2025-11-20', weightKg: 69 },
    ];

    const html = renderToString(<WeightChart entries={entries} width={300} height={100} />);
    expect(html).toContain('<svg');
    // path element should be present
    expect(html).toContain('<path');
    // circles equal number of points
    const circleCount = (html.match(/<circle/g) || []).length;
    expect(circleCount).toBe(entries.length);
  });
});

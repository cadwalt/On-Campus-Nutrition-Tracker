import React, { useEffect, useRef, useState } from 'react';
import type { WeightEntry } from '../../types/weight';

interface Props { entries: WeightEntry[]; height?: number; width?: number; range?: 'week'|'month'|'year'|'all'; centerFactor?: number; unit?: 'lb' | 'kg'; targetWeight?: number | null }

export const WeightChart: React.FC<Props> = ({ entries, height = 160, width, range = 'month', centerFactor, unit = 'lb', targetWeight = null }) => {
  if (!entries) return <div>No chart data</div>;

  const points = entries.length === 0 ? [] : entries.map(e => ({ x: new Date(e.date).getTime(), y: e.weightLb }));
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  if (points.length === 0) return <div style={{ height }} />;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  
  // Expand bounds to include target weight if provided
  if (targetWeight !== null) {
    minY = Math.min(minY, targetWeight);
    maxY = Math.max(maxY, targetWeight);
  }

  // axisMargin: space reserved for axis labels; innerPad: extra gap between axis labels and plotted line
  const axisMargin = 28;
  const innerPad = 12;

  // responsive measurement: if a numeric `width` prop provided, use it; otherwise measure container
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(typeof width === 'number' ? width : 600);
  useEffect(() => {
    if (typeof width === 'number') return; // prop controls width
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(0, Math.floor(el.getBoundingClientRect().width));
      setMeasuredWidth(w);
    };

    // Always listen to window resize to ensure updates across environments
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    // Prefer ResizeObserver when available for element-level changes
    let ro: any = null;
    if ((window as any).ResizeObserver) {
      ro = new (window as any).ResizeObserver(() => measure());
      try { ro.observe(el); } catch (e) { /* ignore */ }
    }

    // initial measure
    measure();

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      if (ro) try { ro.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [width]);

  // inner layout: left margin 5%, right label area 15%, and a small 10px gap
  // between the plotted area and the label area. This reserves the far-right
  // 15% for labels and uses the width between 5% and 85%-10px for plotting.
  const innerLeft = Math.round(measuredWidth * 0.05); // 5% left margin
  const labelAreaStartX = Math.round(measuredWidth * 0.85); // 85% -> start of 15% label area
  const rightGraphMarginPx = 0; // no gap between plotted area and label area
  const innerWidth = Math.max(1, labelAreaStartX - innerLeft - rightGraphMarginPx);

  const plotLeft = innerLeft + axisMargin + innerPad;
  const plotRight = innerLeft + innerWidth;
  const plotTop = axisMargin + innerPad;
  const plotBottom = height - (axisMargin + innerPad);

  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);
  // Responsive font sizes to avoid label clipping on small screens
  const xLabelFont = measuredWidth < 360 ? 9 : measuredWidth < 480 ? 10 : 12;
  const yLabelFont = measuredWidth < 360 ? 9 : measuredWidth < 480 ? 10 : 12;
  
  // Y axis ticks: label in increments of 50 from (minY - 50) to (maxY + 50)
  const displayMinY = Math.floor((minY - 50) / 50) * 50;
  const displayMaxY = Math.ceil((maxY + 50) / 50) * 50;
  const yTicks: { y: number; label: string }[] = [];
  for (let v = displayMinY; v <= displayMaxY; v += 50) {
    yTicks.push({ y: v, label: `${v}` });
  }

  // Use displayMinY/displayMaxY for vertical scaling so labels align with ticks
  const scaleY = (y: number) => plotTop + (plotH - ((y - displayMinY) / (displayMaxY - displayMinY || 1)) * plotH);

  // Domain will be determined by ticks so labels extend full width; start with data bounds
  const dataMinX = minX;
  const dataMaxX = maxX;
  let domainStart = dataMinX;
  let domainEnd = dataMaxX;

  

  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(0);

  // Generate X ticks and labels depending on range. Use them to set domainStart/domainEnd so labels span full width.
  const ticks: { x: number; label: string }[] = [];
  if (range === 'week') {
    // Align to the week (Sunday..Saturday) that contains the data
    const d = new Date(dataMinX);
    const sunday = new Date(d);
    sunday.setHours(0,0,0,0);
    sunday.setDate(d.getDate() - d.getDay());
    const start = sunday.getTime();
    const end = start + 6 * 24 * 60 * 60 * 1000;
    domainStart = start;
    domainEnd = end;
    const names = ['S','M','T','W','T','F','S'];
    for (let i = 0; i < 7; i++) {
      const t = start + i * 24 * 60 * 60 * 1000;
      const dd = new Date(t);
      ticks.push({ x: t, label: names[dd.getDay()] });
    }
  } else if (range === 'month') {
    const d = new Date(dataMinX);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    domainStart = monthStart.getTime();
    domainEnd = new Date(year, month, monthEnd.getDate(), 23,59,59,999).getTime();
    const days = [1,5,10,15,20,25,31];
    for (const dnum of days) {
      const day = Math.min(dnum, monthEnd.getDate());
      const dt = new Date(year, month, day).getTime();
      ticks.push({ x: dt, label: `${day}` });
    }
  } else if (range === 'year') {
    const d = new Date(dataMinX);
    const year = d.getFullYear();
    domainStart = new Date(year, 0, 1).getTime();
    domainEnd = new Date(year, 11, 31, 23,59,59,999).getTime();
    const monthNames = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    for (let m = 0; m < 12; m++) {
      const t = new Date(year, m, 1).getTime();
      ticks.push({ x: t, label: monthNames[m] });
    }
  } else { // all
    const startY = new Date(dataMinX).getFullYear();
    const endY = new Date(dataMaxX).getFullYear();
    domainStart = new Date(startY, 0, 1).getTime();
    domainEnd = new Date(endY, 11, 31, 23,59,59,999).getTime();
    for (let y = startY; y <= endY; y++) {
      const t = new Date(y, 0, 1).getTime();
      ticks.push({ x: t, label: `${y}` });
    }
  }

  // Expand domain to include any data outside the ticks
  domainStart = Math.min(domainStart, dataMinX);
  domainEnd = Math.max(domainEnd, dataMaxX);

  const scaleX = (x: number) => ((x - domainStart) / (domainEnd - domainStart || 1)) * plotW + plotLeft;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ');

  // Trigger animation when entries change (run after pathD is available)
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    try {
      const len = el.getTotalLength();
      setPathLength(len);
      // Reset to hidden then animate to 0 offset
      el.style.transition = 'none';
      el.style.strokeDasharray = `${len} ${len}`;
      el.style.strokeDashoffset = `${len}`;
      // Force reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.getBoundingClientRect();
      el.style.transition = 'stroke-dashoffset 800ms ease-in-out';
      el.style.strokeDashoffset = '0';
    } catch (e) {
      // ignore
    }
  }, [pathD]);

  

  const containerStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', overflow: 'visible' };

  // center correction: compute a percentage-based shift so we can tune per breakpoint.
  // paddingLeft and paddingRight represent reserved space for labels and extra right label area.
  const paddingLeft = innerLeft + axisMargin;
  const paddingRight = innerLeft + axisMargin + 24;
  const diff = paddingRight - paddingLeft;
  // If caller provided a centerFactor prop, use it. Otherwise pick a factor by breakpoint.
  // Larger factor => more left shift. Tune values to move plot more left on small screens.
  const computedFactor = typeof centerFactor === 'number'
    ? centerFactor
    : (measuredWidth < 480 ? 0.95 : (measuredWidth < 980 ? 0.85 : 0.91));
  const centerShift = diff * computedFactor;

  return (
    <div ref={containerRef} style={containerStyle}>
      <svg width={measuredWidth} height={height} role="img" aria-label="Weight over time" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
        {/* plotting group is shifted left slightly to visually center with right-side labels */}
        <g transform={`translate(${-centerShift},0)`}>
          {/* X axis (constrained to inner area) */}
          <line x1={innerLeft + axisMargin} y1={height - axisMargin} x2={innerLeft + innerWidth} y2={height - axisMargin} stroke="rgba(255,255,255,0.12)" />

          {/* X ticks and labels */}
          {ticks.map((t, i) => {
            const xPos = scaleX(t.x);
            return (
              <g key={i}>
                <line x1={xPos} y1={height - axisMargin} x2={xPos} y2={height - axisMargin + 6} stroke="rgba(255,255,255,0.12)" />
                <text x={xPos} y={height - axisMargin + 20} textAnchor="middle" fontSize={xLabelFont} fill="#fff">{t.label}</text>
              </g>
            );
          })}

          <path ref={pathRef} d={pathD} fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={scaleX(p.x)} cy={scaleY(p.y)} r={3} fill="#fff" stroke="rgba(0,0,0,0.2)" />
          ))}
          
          {/* Target weight line */}
          {targetWeight !== null && (
            <line
              x1={plotLeft}
              y1={scaleY(targetWeight)}
              x2={plotRight}
              y2={scaleY(targetWeight)}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.7}
            />
          )}
        </g>

        {/* Y tick labels on the right side (not shifted) */}
        {(() => {
          // Place Y ticks at the plotted area's right edge so labels sit immediately to the right
          return yTicks.map((t, i) => {
            // Skip labels within +/- 20 lbs of target weight
            if (targetWeight !== null && Math.abs(t.y - targetWeight) <= 20) {
              return null;
            }
            const yPos = scaleY(t.y);
            const tickX = plotRight; // align tick with plot edge
            // Convert label value to display unit
            const labelValue = unit === 'kg' ? Math.round((t.y / 2.20462) * 10) / 10 : t.y;
            return (
              <g key={i}>
                <text x={tickX + 10} y={yPos + 4} textAnchor="start" fontSize={yLabelFont} fill="#fff">{labelValue}</text>
              </g>
            );
          });
        })()}
        
        {/* Target weight label */}
        {targetWeight !== null && (() => {
          const targetYPos = scaleY(targetWeight);
          const tickX = plotRight;
          const targetLabelValue = unit === 'kg' ? Math.round((targetWeight / 2.20462) * 10) / 10 : targetWeight;
          return (
            <g>
              <text x={tickX + 10} y={targetYPos + 4} textAnchor="start" fontSize={yLabelFont} fill="#3b82f6" fontWeight={600}>{targetLabelValue}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export default WeightChart;

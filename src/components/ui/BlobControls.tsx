import React, { useEffect, useState } from 'react';

const vars = [
  { key: '--blob1-size', label: 'Blob 1 Size', min: 10, max: 80 },
  { key: '--blob2-size', label: 'Blob 2 Size', min: 10, max: 80 },
  { key: '--blob1-opacity', label: 'Blob 1 Opacity', min: 0, max: 100 },
  { key: '--blob2-opacity', label: 'Blob 2 Opacity', min: 0, max: 100 },
  { key: '--blob1-blur', label: 'Blob 1 Blur', min: 0, max: 200 },
  { key: '--blob2-blur', label: 'Blob 2 Blur', min: 0, max: 200 },
  { key: '--center-glow-opacity', label: 'Center Glow', min: 0, max: 100 }
];

function getInitial() {
  const root = getComputedStyle(document.documentElement);
  return vars.reduce((acc: Record<string, number>, v) => {
    const val = root.getPropertyValue(v.key).trim();
    if (val.endsWith('vw')) {
      acc[v.key] = Number(val.replace('vw', ''));
    } else if (val.endsWith('px')) {
      acc[v.key] = Number(val.replace('px', ''));
    } else {
      acc[v.key] = Number(val) || 0;
    }
    return acc;
  }, {});
}

const BlobControls: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    // initialize from CSS variables
    setValues(getInitial());
  }, []);

  useEffect(() => {
    // apply values to document root
    const root = document.documentElement.style;
    Object.entries(values).forEach(([k, v]) => {
      if (k === '--blob1-opacity' || k === '--blob2-opacity' || k === '--center-glow-opacity') {
        root.setProperty(k, String(v / 100));
      } else if (k === '--blob1-blur' || k === '--blob2-blur') {
        root.setProperty(k, `${v}px`);
      } else {
        root.setProperty(k, `${v}vw`);
      }
    });
  }, [values]);

  const handleChange = (key: string, raw: number) => {
    setValues(prev => ({ ...prev, [key]: Math.round(raw) }));
  };

  return (
    <div className={`blob-controls ${open ? 'open' : ''}`}>
      <button className="blob-toggle" onClick={() => setOpen(v => !v)} aria-label="Toggle blob controls">
        ⚙️
      </button>

      <div className="blob-panel" role="dialog" aria-hidden={!open}>
        <h4>Background Blobs</h4>
        {vars.map(v => (
          <label key={v.key} className="blob-row">
            <span className="blob-label">{v.label}</span>
            <input
              type="range"
              min={v.min}
              max={v.max}
              value={values[v.key] ?? 0}
              onChange={(e) => handleChange(v.key, Number(e.target.value))}
            />
            <span className="blob-value">{values[v.key]}</span>
          </label>
        ))}
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button className="blob-reset" onClick={() => window.location.reload()}>Reset</button>
        </div>
      </div>
    </div>
  );
};

export default BlobControls;

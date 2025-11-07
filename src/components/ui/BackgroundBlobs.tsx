import React, { useEffect, useRef } from 'react';

type BlobState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number; // px
  phase: number;
  freq: number;
  blurBase: number;
  opacityBase: number;
  hue: string;
};

const NUM_BLOBS = 7; // increased for higher frequency

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const BackgroundBlobs: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blobsRef = useRef<Array<HTMLDivElement | null>>([]);
  const stateRef = useRef<BlobState[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Initialize states
    const minDim = Math.min(vw, vh);
    const states: BlobState[] = Array.from({ length: NUM_BLOBS }).map((_, i) => {
      // allow many smaller blobs plus some larger ones for variety
      const baseSize = rand(minDim * 0.06, minDim * 0.36); // px
      // scale speed: smaller blobs move a bit faster
      const speedScale = Math.min(1.6, 120 / Math.max(40, baseSize));
      return {
        x: rand(baseSize / 2, vw - baseSize / 2),
        y: rand(baseSize / 2, vh - baseSize / 2),
        vx: rand(-80, 80) * speedScale,
        vy: rand(-60, 60) * speedScale,
        baseSize,
        phase: rand(0, Math.PI * 2),
        freq: rand(0.2, 1.4),
  // use a slightly lower blur base so blobs can appear crisper
  blurBase: rand(8, 60),
  // raise base opacity so blobs are clearly visible
  opacityBase: rand(0.22, 0.6),
        hue: ['purple', 'teal', 'blue', 'pink', 'cyan', 'lime', 'amber'][i % 7]
      };
    });

    stateRef.current = states;

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.06, (now - last) / 1000); // clamp dt
      last = now;
      const vw2 = window.innerWidth;
      const vh2 = window.innerHeight;

      stateRef.current.forEach((s, i) => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        // bounce off edges (consider blob size)
        const half = s.baseSize * 0.5;
        if (s.x < half) {
          s.x = half;
          s.vx *= -1;
        } else if (s.x > vw2 - half) {
          s.x = vw2 - half;
          s.vx *= -1;
        }
        if (s.y < half) {
          s.y = half;
          s.vy *= -1;
        } else if (s.y > vh2 - half) {
          s.y = vh2 - half;
          s.vy *= -1;
        }

        // slowly vary properties with sine waves
        const t = now / 1000;
        const scale = 1 + 0.12 * Math.sin(t * s.freq + s.phase);
        const size = s.baseSize * scale;
  const blur = Math.max(2, s.blurBase + 12 * Math.sin(t * (s.freq * 0.9) + s.phase * 0.7));
  // increase opacity amplitude so blobs pop more
  const opacity = Math.max(0.05, s.opacityBase + 0.16 * Math.sin(t * (s.freq * 1.1) + s.phase * 1.3));
  // increase brightness swing so blobs pop more
  const brightness = 1.0 + 0.5 * Math.max(0, Math.sin(t * (s.freq * 0.7) + s.phase * 0.5));

        const el = blobsRef.current[i];
        if (el) {
          el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) scale(${scale})`;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.filter = `blur(${blur}px) brightness(${brightness})`;
          el.style.opacity = String(opacity);
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // helper to set ref
  const setBlobRef = (el: HTMLDivElement | null, idx: number) => {
    blobsRef.current[idx] = el;
  };

  return (
    <div
      ref={containerRef}
      className="background-blobs"
      aria-hidden
      style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}
    >
      {Array.from({ length: NUM_BLOBS }).map((_, i) => (
        <div
          key={i}
          ref={(el) => setBlobRef(el, i)}
          className={`bg-blob bg-blob-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: i === 0
              ? 'radial-gradient(circle at 30% 30%, rgba(102,126,234,0.85) 0%, rgba(118,75,162,0.6) 45%, rgba(118,75,162,0.25) 100%)'
              : i === 1
              ? 'radial-gradient(circle at 70% 70%, rgba(16,185,129,0.78) 0%, rgba(59,130,246,0.45) 45%, rgba(59,130,246,0.14) 100%)'
              : 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.84) 0%, rgba(102,126,234,0.5) 45%, rgba(102,126,234,0.18) 100%)',
            mixBlendMode: 'screen',
            transform: 'translate(-50%, -50%)',
            willChange: 'transform, width, height, filter, opacity'
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundBlobs;

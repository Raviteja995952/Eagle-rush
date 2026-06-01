import React, { useMemo } from 'react';

const AnimatedBackground: React.FC = () => {
  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: `${2 + Math.random() * 4}s`,
      delay: `${Math.random() * 5}s`,
      size: Math.random() > 0.85 ? 3 : Math.random() > 0.6 ? 2 : 1,
    })), []);

  const clouds = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      top: `${8 + i * 10}%`,
      width: `${180 + Math.random() * 250}px`,
      height: `${28 + Math.random() * 22}px`,
      speed: `${55 + Math.random() * 50}s`,
      delay: `${-i * 9}s`,
    })), []);

  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 30}%`,
      size: Math.random() > 0.6 ? 3 : 2,
      color: i % 4 === 0 ? 'rgba(59,130,246,0.5)' : i % 4 === 1 ? 'rgba(6,182,212,0.4)' : i % 4 === 2 ? 'rgba(139,92,246,0.4)' : 'rgba(236,72,153,0.3)',
      duration: `${10 + Math.random() * 14}s`,
      delay: `${-Math.random() * 14}s`,
    })), []);

  const lightRays = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${10 + i * 18}%`,
      height: `${45 + Math.random() * 35}vh`,
      width: `${80 + Math.random() * 120}px`,
      duration: `${8 + i * 2}s`,
      delay: `${i * 1.6}s`,
    })), []);

  return (
    <div className="bg-animated" aria-hidden="true">
      {/* Base gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Stars */}
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--duration': s.duration,
            '--delay': s.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Clouds */}
      {clouds.map(c => (
        <div
          key={c.id}
          className="cloud"
          style={{
            top: c.top,
            width: c.width,
            height: c.height,
            '--speed': c.speed,
            '--delay': c.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Light rays */}
      {lightRays.map(r => (
        <div
          key={r.id}
          className="light-ray"
          style={{
            left: r.left,
            height: r.height,
            width: r.width,
            top: 0,
            '--dur': r.duration,
            '--delay': r.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Floating particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="bg-particle"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            '--dur': p.duration,
            '--delay': p.delay,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground;

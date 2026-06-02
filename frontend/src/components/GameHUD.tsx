import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Clock, Coins, Zap, X, Menu } from 'lucide-react';
import './GameHUD.css';

interface GameHUDProps {
  level: number;
  hits: number;
  levelTarget: number;
  timeLeft: number;
  score: number;
  combo: number;
  misses: number;
  shakeMiss: boolean;
  onOpenSidebar?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  level,
  hits,
  levelTarget,
  timeLeft,
  score,
  combo,
  misses,
  shakeMiss,
  onOpenSidebar
}) => {
  useEffect(() => {
    console.log("GAME HUD MOUNTED");
    return () => console.log("GAME HUD UNMOUNTED");
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimerBorderColor = () => {
    if (timeLeft <= 10) return 'rgba(239, 68, 68, 0.7)';
    if (timeLeft <= 20) return 'rgba(249, 115, 22, 0.7)';
    return 'rgba(59, 130, 246, 0.5)';
  };

  return (
    <div className="game-hud">
      {/* Mobile Sidebar Toggle */}
      <button onClick={onOpenSidebar} className="sidebar-toggle-btn">
        <Menu size={20} />
      </button>

      {/* Level Card */}
      <div className="hud-card hud-card-blue">
        <Trophy size={18} style={{ color: '#3b82f6' }} />
        <span className="hud-label">Lv</span>
        <span className="hud-value">{level}</span>
      </div>

      {/* Target Card */}
      <div className="hud-card hud-card-cyan">
        <Target size={18} style={{ color: '#06b6d4' }} />
        <span className="hud-label">Target</span>
        <span className="hud-value">{hits}/{levelTarget}</span>
      </div>

      {/* Timer Circle */}
      <div 
        className={`hud-timer-circle ${timeLeft <= 5 && timeLeft > 0 ? 'animate-pulse' : ''} ${timeLeft === 0 ? 'animate-[flash_0.2s_infinite]' : ''}`}
        style={{
          border: `2px solid ${getTimerBorderColor()}`,
          boxShadow: timeLeft <= 10 ? '0 0 15px rgba(239,68,68,0.5)' : timeLeft <= 20 ? '0 0 15px rgba(249,115,22,0.4)' : '0 0 10px rgba(59,130,246,0.3)',
        }}
      >
        <div className="hud-timer-text" style={{ fontSize: '14px', fontFamily: 'Orbitron', fontWeight: 800, color: timeLeft <= 10 ? '#f87171' : timeLeft <= 20 ? '#fb923c' : '#60a5fa', lineHeight: 1, display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '2px' }}>
          <Clock size={12} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Score Card */}
      <div className="hud-card hud-card-amber">
        <Coins size={18} style={{ color: '#f59e0b' }} />
        <span className="hud-label">Score</span>
        <motion.span key={score} initial={{ scale: 1.2, color: '#fbbf24' }} animate={{ scale: 1, color: '#e2e8f0' }} className="hud-value">
          {score.toLocaleString()}
        </motion.span>
      </div>

      {/* Combo Card */}
      <div className="hud-card hud-card-pink" style={{ boxShadow: `0 0 ${Math.min(25, 10 + combo * 1.5)}px rgba(236,72,153,${Math.min(0.6, 0.2 + combo * 0.025)})` }}>
        <Zap size={18} style={{ color: '#ec4899' }} />
        <span className="hud-label">Combo</span>
        <span className="hud-value" style={{ color: combo > 0 ? '#f472b6' : '#e2e8f0' }}>{combo}x</span>
      </div>

      {/* Misses Card */}
      <div className={`hud-card hud-card-red ${shakeMiss ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
        <X size={18} style={{ color: '#ef4444' }} />
        <span className="hud-label">Miss</span>
        <motion.span key={misses} initial={{ scale: 1.2, color: '#ef4444' }} animate={{ scale: 1, color: '#f87171' }} className="hud-value">
          {misses}
        </motion.span>
      </div>
    </div>
  );
};

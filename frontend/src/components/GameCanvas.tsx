import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioSynth } from '../utils/AudioSynth';
import {
  ShieldAlert, Zap, Award, Target, Coins, Trophy,
  Play, RotateCcw, LogOut, Clock, X
} from 'lucide-react';

interface GameCanvasProps {
  level: number;
  onLevelComplete: (earnedCoins: number, earnedXp: number, finalScore: number) => void;
  onGameOver: () => void;
  activeSkin: string;
  isMuted: boolean;
  onBotFlagged: (reason: string) => void;
}

type EagleType = 'common' | 'silver' | 'golden' | 'mythic' | 'shadow' | 'decoy' | 'boss';

interface Eagle {
  id: number;
  type: EagleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speedX: number;
  speedY: number;
  flapSpeed: number;
  flapOffset: number;
  targetY: number;
  curveFrequency: number;
  curveAmplitude: number;
  timeAlive: number;
  points: number;
  hp: number;
  maxHp: number;
  opacity: number;
  trail: { x: number; y: number }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  onLevelComplete,
  onGameOver,
  activeSkin,
  isMuted,
  onBotFlagged
}) => {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState<number | null>(null);
  const [showBossWarning, setShowBossWarning] = useState(false);
  const [levelTarget, setLevelTarget] = useState(10);
  const [isSlowMo, setIsSlowMo] = useState(false);

  const [shakeMiss, setShakeMiss] = useState(false);
  useEffect(() => {
    if (misses > 0) {
      setShakeMiss(true);
      const timer = setTimeout(() => setShakeMiss(false), 400);
      return () => clearTimeout(timer);
    }
  }, [misses]);

  const getInitialTime = (lvl: number) => {
    if (lvl % 5 === 0) return 45;
    if (lvl <= 5) return 90;
    if (lvl <= 10) return 85;
    if (lvl <= 15) return 80;
    if (lvl <= 20) return 75;
    if (lvl <= 25) return 70;
    if (lvl <= 30) return 65;
    if (lvl <= 35) return 60;
    return 55;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Time Limit Countdown State
  const [timeLeft, setTimeLeft] = useState(() => getInitialTime(level));
  const [isPaused, setIsPaused] = useState(false);

  // Game metrics for anti-bot
  const clickTimestampsRef = useRef<number[]>([]);
  const totalClicksRef = useRef(0);
  const mouseTrackedRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
  const clickIntervalsRef = useRef<number[]>([]);

  // Engine arrays
  const eaglesRef = useRef<Eagle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const missesRef = useRef(0);
  const hitsRef = useRef(0);
  const levelRef = useRef(level);
  
  // Shake effect variables
  const shakeRef = useRef({ intensity: 0, duration: 0 });

  // Manage refs for states needed in ticks
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    levelRef.current = level;
    const target = 10 + (level * 5);
    setLevelTarget(target);
    setTimeLeft(getInitialTime(level));
  }, [level]);

  // Particles system generator
  const createExplosion = (x: number, y: number, color: string) => {
    const count = 15 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 1,
        color,
        size: 2 + Math.random() * 4,
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 20)
      });
    }
  };

  const gameStateFinishedRef = useRef(false);
  useEffect(() => {
    gameStateFinishedRef.current = false;
  }, [level]);

  const handleGameOverTimeout = () => {
    gameStateFinishedRef.current = true;
    audioSynth.playBossWarning();
    onGameOver();
  };

  // Handle countdown timer ticking
  useEffect(() => {
    if (gameStateFinishedRef.current || isSlowMo || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOverTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSlowMo, isPaused, level]);

  // Escape key for Pause Menu toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle slow-motion transition when level complete
  const triggerSlowMotion = (finalEarnedCoins: number, finalEarnedXp: number, currentScore: number) => {
    setIsSlowMo(true);
    audioSynth.playRewardClaim();
    gameStateFinishedRef.current = true;
    
    setTimeout(() => {
      setIsSlowMo(false);
      eaglesRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      onLevelComplete(finalEarnedCoins, finalEarnedXp, currentScore);
    }, 2000);
  };

  // Primary requestAnimationFrame Tick
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    audioSynth.setMute(isMuted);
    
    let animationFrameId: number;
    let spawnTimer = 0;
    let gameTime = 0;
    
    const resizeCanvas = () => {
      if (canvas && arenaRef.current) {
        // Use offset dimensions to capture true CSS container size
        const w = arenaRef.current.offsetWidth;
        const h = arenaRef.current.offsetHeight;
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
        }
      }
    };
    // Give DOM a microtask to settle the flex layout before sizing
    setTimeout(resizeCanvas, 0);
    window.addEventListener('resize', resizeCanvas);

    const ambient = audioSynth.playWindAmbient();

    const getSpawnInterval = () => {
      if (levelRef.current <= 10) return 120;
      if (levelRef.current <= 20) return 90;
      if (levelRef.current <= 30) return 70;
      return 55;
    };

    const spawnEagle = (forceBoss = false) => {
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 500;
      
      let type: EagleType = 'common';
      const rand = Math.random() * 100;
      
      const isBossLevel = levelRef.current % 5 === 0;

      if (forceBoss || (isBossLevel && eaglesRef.current.filter(e => e.type === 'boss').length === 0 && hitsRef.current >= levelTarget * 0.6)) {
        type = 'boss';
      } else if (levelRef.current <= 10) {
        type = rand < 75 ? 'common' : 'silver';
      } else if (levelRef.current <= 20) {
        if (rand < 55) type = 'common';
        else if (rand < 85) type = 'silver';
        else type = 'golden';
      } else if (levelRef.current <= 30) {
        if (rand < 45) type = 'common';
        else if (rand < 70) type = 'silver';
        else if (rand < 85) type = 'golden';
        else type = 'shadow';
      } else {
        if (rand < 30) type = 'common';
        else if (rand < 50) type = 'silver';
        else if (rand < 65) type = 'golden';
        else if (rand < 75) type = 'decoy';
        else if (rand < 85) type = 'shadow';
        else type = 'mythic';
      }

      let width = 50;
      let height = 35;
      let hp = 1;
      let points = 1;
      let speedX = 2 + Math.random() * 2;
      let speedY = (Math.random() - 0.5) * 1.5;

      const speedMultiplier = 1 + (levelRef.current * 0.04);
      speedX *= speedMultiplier;
      speedY *= speedMultiplier;

      if (type === 'silver') {
        width = 55;
        height = 38;
        points = 5;
        speedX *= 1.25;
      } else if (type === 'golden') {
        width = 60;
        height = 42;
        points = 50;
        speedX *= 1.55;
        audioSynth.playGolden();
      } else if (type === 'mythic') {
        width = 65;
        height = 45;
        points = 200;
        speedX *= 1.85;
        audioSynth.playGolden();
        shakeRef.current = { intensity: 6, duration: 25 };
        floatingTextsRef.current.push({
          id: Math.random(),
          text: 'MYTHIC EAGLE SPAWNED!',
          x: canvasWidth / 2,
          y: canvasHeight / 3,
          color: '#e040fb',
          alpha: 1,
          scale: 1.5
        });
      } else if (type === 'shadow') {
        width = 52;
        height = 36;
        points = -10;
        speedX *= 1.45;
      } else if (type === 'decoy') {
        width = 60;
        height = 42;
        points = -30;
        speedX *= 1.5;
      } else if (type === 'boss') {
        width = 160;
        height = 110;
        hp = 8 + (levelRef.current / 5) * 5;
        points = 500;
        speedX = 1.2;
        speedY = 0.8;
        setBossMaxHp(hp);
        setBossHp(hp);
        setShowBossWarning(true);
        audioSynth.playBossWarning();
        setTimeout(() => setShowBossWarning(false), 2500);
      }

      const startLeft = Math.random() > 0.5;
      
      // Spawn at the exact edge of the arena so they fly entirely across
      const x = startLeft ? 0 : canvasWidth - width;
      
      // Safe Y spawning within the arena height
      const y = 20 + Math.random() * (canvasHeight - height - 40);
      
      if (!startLeft) {
        speedX = -Math.abs(speedX);
      } else {
        speedX = Math.abs(speedX);
      }

      eaglesRef.current.push({
        id: Date.now() + Math.random(),
        type,
        x,
        y,
        width,
        height,
        speedX,
        speedY,
        flapSpeed: 0.15 + Math.random() * 0.1,
        flapOffset: Math.random() * Math.PI,
        targetY: y,
        curveFrequency: 0.02 + Math.random() * 0.03,
        curveAmplitude: 1.5 + Math.random() * 3,
        timeAlive: 0,
        points,
        hp,
        maxHp: hp,
        opacity: 1,
        trail: []
      });
    };

    const drawEagle = (e: Eagle) => {
      e.timeAlive++;
      const flap = Math.sin(e.timeAlive * e.flapSpeed + e.flapOffset);
      const direction = e.speedX > 0 ? 1 : -1;

      ctx.save();
      
      // Fast fade-in so they don't pop abruptly
      let alpha = 1;
      if (e.timeAlive < 15) alpha = e.timeAlive / 15;
      ctx.globalAlpha = alpha;

      ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
      ctx.scale(direction, 1);

      const rotation = Math.atan2(e.speedY, Math.abs(e.speedX)) * 0.5;
      ctx.rotate(rotation);

      let bodyColor = '#d7ccc8';
      let wingColor = '#8d6e63';
      let wingTipColor = '#4e342e';
      let beakColor = '#ffb300';
      let glowColor: string | null = null;
      let trailColor: string | null = null;

      // Apply Hangar Cosmetics
      if (activeSkin === 'silver_wing' && e.type === 'common') {
        bodyColor = '#cfd8dc';
        wingColor = '#90a4ae';
        wingTipColor = '#546e7a';
      } else if (activeSkin === 'golden_glow' && e.type === 'common') {
        bodyColor = '#ffe082';
        wingColor = '#ffb300';
        wingTipColor = '#ff6f00';
      } else if (activeSkin === 'mythic_shadow' && e.type === 'common') {
        bodyColor = '#b39ddb';
        wingColor = '#7e57c2';
        wingTipColor = '#4527a0';
      } else if (activeSkin === 'legendary_phoenix' && e.type === 'common') {
        bodyColor = '#ffab91';
        wingColor = '#ff7043';
        wingTipColor = '#d84315';
      }

      if (e.type === 'silver') {
        bodyColor = '#e0e0e0';
        wingColor = '#b0bec5';
        wingTipColor = '#78909c';
        trailColor = 'rgba(224, 224, 224, 0.3)';
      } else if (e.type === 'golden') {
        bodyColor = '#ffeb3b';
        wingColor = '#ffd700';
        wingTipColor = '#ffb300';
        beakColor = '#ff6f00';
        glowColor = 'rgba(255, 215, 0, 0.7)';
        trailColor = 'rgba(255, 215, 0, 0.4)';
      } else if (e.type === 'mythic') {
        bodyColor = '#e040fb';
        wingColor = '#a020f0';
        wingTipColor = '#4a148c';
        beakColor = '#00e5ff';
        glowColor = 'rgba(160, 32, 240, 0.9)';
        trailColor = 'rgba(160, 32, 240, 0.5)';
      } else if (e.type === 'shadow') {
        bodyColor = '#212121';
        wingColor = '#424242';
        wingTipColor = '#000000';
        beakColor = '#d50000';
        glowColor = 'rgba(213, 0, 0, 0.4)';
      } else if (e.type === 'decoy') {
        bodyColor = '#ffeb3b';
        wingColor = '#ffd700';
        wingTipColor = '#ffb300';
        beakColor = '#ff6f00';
        glowColor = 'rgba(255, 215, 0, 0.4)';
      } else if (e.type === 'boss') {
        bodyColor = '#1a0505';
        wingColor = '#3e0f0f';
        wingTipColor = '#000000';
        beakColor = '#ff0055';
        glowColor = 'rgba(255, 0, 85, 0.75)';
        trailColor = 'rgba(255, 0, 85, 0.3)';
      }

      if (trailColor) {
        e.trail.push({ x: -e.width / 2, y: 0 });
        if (e.trail.length > 8) e.trail.shift();
        ctx.restore();
        ctx.save();
        
        ctx.beginPath();
        e.trail.forEach((p, idx) => {
          const worldX = e.x + e.width / 2 + p.x * direction;
          const worldY = e.y + e.height / 2 + p.y;
          if (idx === 0) ctx.moveTo(worldX, worldY);
          else ctx.lineTo(worldX, worldY);
        });
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = e.height / 6;
        ctx.lineCap = 'round';
        ctx.shadowColor = glowColor || 'transparent';
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        ctx.restore();
        ctx.save();
        ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
        ctx.scale(direction, 1);
        ctx.rotate(rotation);
      }

      if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = wingTipColor;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.quadraticCurveTo(-15, -15 * flap - 5, -25, -25 * flap - 5);
      ctx.quadraticCurveTo(-10, -10 * flap, 0, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.quadraticCurveTo(-12, -22 * flap - 2, -20, -20 * flap);
      ctx.quadraticCurveTo(-8, -5 * flap, 0, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.width / 2.2, e.height / 2.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(e.width / 2.5, -4, e.height / 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = e.type === 'shadow' || e.type === 'boss' ? '#ff0000' : '#000000';
      ctx.beginPath();
      ctx.arc(e.width / 2.3, -5, e.height / 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = beakColor;
      ctx.beginPath();
      ctx.moveTo(e.width / 2, -7);
      ctx.lineTo(e.width / 1.7, -4);
      ctx.lineTo(e.width / 2.2, -1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(8, -25 * flap - 2, 18, -22 * flap);
      ctx.quadraticCurveTo(8, -5 * flap, -5, -3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = wingTipColor;
      ctx.beginPath();
      ctx.moveTo(5, -3);
      ctx.quadraticCurveTo(12, -28 * flap - 2, 22, -26 * flap);
      ctx.quadraticCurveTo(10, -8 * flap, -2, -3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const tick = () => {
      if (isPausedRef.current) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      gameTime++;
      spawnTimer++;

      let offsetX = 0;
      let offsetY = 0;
      if (shakeRef.current.duration > 0) {
        offsetX = (Math.random() - 0.5) * shakeRef.current.intensity;
        offsetY = (Math.random() - 0.5) * shakeRef.current.intensity;
        shakeRef.current.duration--;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 4; i++) {
        const windX = (gameTime * (2 + i) + i * 200) % (canvas.width + 100) - 50;
        const windY = (i * 120 + 80) % canvas.height;
        ctx.fillRect(windX, windY, 40 + i * 20, 1.5);
      }

      const slowMoFactor = isSlowMo ? 0.2 : 1;
      
      eaglesRef.current.forEach((e) => {
        if (levelRef.current > 20 && e.type !== 'boss') {
          e.y = e.targetY + Math.sin(e.timeAlive * e.curveFrequency) * e.curveAmplitude * 8;
        }

        e.x += e.speedX * slowMoFactor;
        e.y += e.speedY * slowMoFactor;

        if (e.type === 'boss') {
          if (e.x + e.width > canvas.width || e.x < 0) {
            e.speedX = -e.speedX;
          }
          if (e.y + e.height > canvas.height || e.y < 0) {
            e.speedY = -e.speedY;
          }
        }

        if ((e.type === 'golden' || e.type === 'mythic' || e.type === 'boss') && gameTime % 4 === 0) {
          const color = e.type === 'golden' ? 'rgba(255,215,0,0.4)' : e.type === 'mythic' ? 'rgba(160,32,240,0.4)' : 'rgba(255,0,85,0.3)';
          particlesRef.current.push({
            x: e.x + e.width / 2,
            y: e.y + e.height / 2,
            vx: -e.speedX * 0.1,
            vy: (Math.random() - 0.5) * 1,
            color,
            size: 3 + Math.random() * 3,
            alpha: 0.6,
            life: 0,
            maxLife: 20
          });
        }

        drawEagle(e);
      });

      eaglesRef.current = eaglesRef.current.filter((e) => {
        const outLeft = e.speedX < 0 && e.x < -e.width - 10;
        const outRight = e.speedX > 0 && e.x > canvas.width + 10;
        
        if ((outLeft || outRight) && e.type !== 'boss') {
          if (e.type !== 'shadow' && e.type !== 'decoy') {
            comboRef.current = 0;
            missesRef.current++;
            setCombo(0);
            setMisses(missesRef.current);
          }
          return false;
        }
        return true;
      });

      if (spawnTimer >= getSpawnInterval() && !isSlowMo) {
        spawnTimer = 0;
        spawnEagle();
      }

      particlesRef.current.forEach((p) => {
        p.x += p.vx * slowMoFactor;
        p.y += p.vy * slowMoFactor;
        p.life++;
        p.alpha = 1 - (p.life / p.maxLife);
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

      floatingTextsRef.current.forEach((f) => {
        f.y -= 1.2 * slowMoFactor;
        f.alpha -= 0.02 * slowMoFactor;
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.max(0, f.alpha);
        ctx.font = `bold ${Math.floor(16 * f.scale)}px "Orbitron", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1.0;
      floatingTextsRef.current = floatingTextsRef.current.filter(f => f.alpha > 0);

      ctx.restore();

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (ambient) ambient.stop();
    };
  }, [isMuted, levelTarget, isSlowMo, activeSkin]);

  // Click collision detection
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    audioSynth.playClick();

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const now = Date.now();
    totalClicksRef.current++;

    if (event.clientX > 0 && event.clientY > 0) {
      mouseTrackedRef.current = true;
    }

    if (lastClickTimeRef.current > 0) {
      const interval = now - lastClickTimeRef.current;
      clickIntervalsRef.current.push(interval);
      
      if (clickIntervalsRef.current.length > 5) {
        const recentIntervals = clickIntervalsRef.current.slice(-5);
        const avg = recentIntervals.reduce((a, b) => a + b, 0) / 5;
        
        if (recentIntervals.length >= 5) {
          const mean = avg;
          const variance = recentIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentIntervals.length;
          const stdDev = Math.sqrt(variance);
          
          if (stdDev < 3.0 && mean < 200) {
            onBotFlagged("Robotic click spacing deviation triggered Anti-Bot system.");
            return;
          }
        }
      }
    }
    lastClickTimeRef.current = now;
    clickTimestampsRef.current.push(now);

    let hitSomething = false;

    for (let i = eaglesRef.current.length - 1; i >= 0; i--) {
      const e = eaglesRef.current[i];
      const clickedInside = 
        clickX >= e.x - 15 && 
        clickX <= e.x + e.width + 15 && 
        clickY >= e.y - 15 && 
        clickY <= e.y + e.height + 15;

      if (clickedInside && e.opacity > 0.8) {
        hitSomething = true;

        if (e.type === 'boss') {
          e.hp--;
          setBossHp(e.hp);
          
          createExplosion(clickX, clickY, '#ff0055');
          shakeRef.current = { intensity: 5, duration: 10 };
          audioSynth.playHit();

          if (e.hp <= 0) {
            eaglesRef.current.splice(i, 1);
            setBossHp(null);
            setBossMaxHp(null);
            
            const coinsEarned = 100 + levelRef.current * 10;
            const xpEarned = 150 + levelRef.current * 20;

            audioSynth.playAchievement();
            createExplosion(e.x + e.width/2, e.y + e.height/2, '#ff007f');
            shakeRef.current = { intensity: 10, duration: 25 };

            floatingTextsRef.current.push({
              id: Math.random(),
              text: `BOSS DEFEATED! +${coinsEarned} Coins`,
              x: e.x + e.width / 2,
              y: e.y - 20,
              color: '#ff007f',
              alpha: 1,
              scale: 1.6
            });

            const newScore = scoreRef.current + e.points;
            scoreRef.current = newScore;
            setScore(newScore);

            triggerSlowMotion(coinsEarned, xpEarned, newScore);
          }
        } else if (e.type === 'decoy') {
          eaglesRef.current.splice(i, 1);
          audioSynth.playHit();
          createExplosion(clickX, clickY, '#d50000');
          shakeRef.current = { intensity: 6, duration: 15 };

          comboRef.current = 0;
          setCombo(0);
          
          const newScore = Math.max(0, scoreRef.current + e.points);
          scoreRef.current = newScore;
          setScore(newScore);

          floatingTextsRef.current.push({
            id: Math.random(),
            text: `DECOY EXPLODED! ${e.points}`,
            x: clickX,
            y: clickY - 10,
            color: '#ff1744',
            alpha: 1,
            scale: 1.2
          });
        } else {
          eaglesRef.current.splice(i, 1);
          audioSynth.playHit();

          const newCombo = comboRef.current + 1;
          comboRef.current = newCombo;
          setCombo(newCombo);
          if (newCombo > maxCombo) setMaxCombo(newCombo);

          if (newCombo % 5 === 0) {
            audioSynth.playCombo(newCombo);
          }

          let multiplier = 1.0;
          if (newCombo >= 50) multiplier = 5.0;
          else if (newCombo >= 20) multiplier = 3.0;
          else if (newCombo >= 10) multiplier = 2.0;
          else if (newCombo >= 5) multiplier = 1.5;

          const basePoints = e.points;
          let addedPoints = Math.round(basePoints * multiplier);
          
          if (e.type === 'shadow') {
            addedPoints = e.points;
            comboRef.current = 0;
            setCombo(0);
          }

          const newScore = Math.max(0, scoreRef.current + addedPoints);
          scoreRef.current = newScore;
          setScore(newScore);

          const newHits = hitsRef.current + 1;
          hitsRef.current = newHits;
          setHits(newHits);

          let pColor = '#a1887f';
          if (e.type === 'silver') pColor = '#cfd8dc';
          else if (e.type === 'golden') pColor = '#ffd54f';
          else if (e.type === 'mythic') pColor = '#ea80fc';
          else if (e.type === 'shadow') pColor = '#37474f';

          createExplosion(clickX, clickY, pColor);

          const scoreText = e.type === 'shadow' ? `-10` : `+${addedPoints}`;
          floatingTextsRef.current.push({
            id: Math.random(),
            text: scoreText,
            x: clickX,
            y: clickY - 15,
            color: e.type === 'shadow' ? '#ef5350' : e.type === 'golden' ? '#ffca28' : e.type === 'mythic' ? '#e040fb' : '#00e5ff',
            alpha: 1,
            scale: multiplier > 1 ? 1.3 : 1.0
          });

          if (newHits >= levelTarget && !isSlowMo) {
            const bonusCoins = 20 + levelRef.current * 5;
            const bonusXp = 50 + levelRef.current * 10;
            triggerSlowMotion(bonusCoins, bonusXp, newScore);
          }

          // Time Bonus Logic
          let timeBonus = 0;
          if (e.type === 'golden') timeBonus += 3;
          if (e.type === 'mythic') timeBonus += 5;
          if (newCombo === 10) timeBonus += 2;
          if (newCombo === 20) timeBonus += 5;
          
          if (timeBonus > 0) {
            setTimeLeft(prev => prev + timeBonus);
            floatingTextsRef.current.push({
              id: Math.random(),
              text: `+${timeBonus}s`,
              x: clickX,
              y: clickY - 40,
              color: '#4ade80',
              alpha: 1,
              scale: 1.2
            });
          }
        }
        break;
      }
    }

    if (!hitSomething) {
      comboRef.current = 0;
      setCombo(0);
    }
  };


  const getTimerBorderColor = () => {
    if (timeLeft <= 10) return 'rgba(239, 68, 68, 0.7)';
    if (timeLeft <= 20) return 'rgba(249, 115, 22, 0.7)';
    return 'rgba(59, 130, 246, 0.5)';
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-slate-900">
      
      {/* ─── FLOATING TOP HUD (Fixed 80px) ─── */}
      <div 
        style={{ height: '80px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div 
          style={{
            background: 'rgba(10,20,40,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '20px',
            boxShadow: '0 0 25px rgba(59,130,246,0.25)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            height: '70px',
            pointerEvents: 'auto'
          }}
          variants={{
            animate: { y: [0, -2, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } }
          }}
          animate="animate"
        >
          {/* Level Chip */}
          <div style={{ height: '48px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 0 15px rgba(59,130,246,0.2)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Lv</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '20px', color: '#e2e8f0', fontWeight: 700 }}>{level}</span>
          </div>

          {/* Target Chip */}
          <div style={{ height: '48px', borderRadius: '14px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 0 15px rgba(6,182,212,0.2)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} style={{ color: '#06b6d4' }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Target</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '20px', color: '#e2e8f0', fontWeight: 700 }}>{hits}/{levelTarget}</span>
          </div>

          {/* Timer Circle */}
          <div className="relative flex items-center justify-center">
            <div 
              style={{ 
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(10,20,40,0.95)',
                border: `2px solid ${getTimerBorderColor()}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: timeLeft <= 10 ? '0 0 15px rgba(239,68,68,0.5)' : timeLeft <= 20 ? '0 0 15px rgba(249,115,22,0.4)' : '0 0 10px rgba(59,130,246,0.3)',
                transition: 'border-color .3s, box-shadow .3s'
              }} 
              className={`${timeLeft <= 5 && timeLeft > 0 ? 'animate-pulse' : ''} ${timeLeft === 0 ? 'animate-[flash_0.2s_infinite]' : ''}`}
            >
              <div style={{ fontSize: '14px', fontFamily: 'Orbitron', fontWeight: 800, color: timeLeft <= 10 ? '#f87171' : timeLeft <= 20 ? '#fb923c' : '#60a5fa', lineHeight: 1, display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '2px' }}>
                <Clock size={12} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Score Chip */}
          <div style={{ height: '48px', borderRadius: '14px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 15px rgba(245,158,11,0.2)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Score</span>
            <motion.span key={score} initial={{ scale: 1.2, color: '#fbbf24' }} animate={{ scale: 1, color: '#e2e8f0' }} style={{ fontFamily: 'Orbitron', fontSize: '20px', fontWeight: 700 }}>
              {score.toLocaleString()}
            </motion.span>
          </div>

          {/* Combo Chip */}
          <div style={{ height: '48px', borderRadius: '14px', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', boxShadow: `0 0 ${Math.min(25, 10 + combo * 1.5)}px rgba(236,72,153,${Math.min(0.6, 0.2 + combo * 0.025)})`, padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: '#ec4899' }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Combo</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '20px', color: combo > 0 ? '#f472b6' : '#e2e8f0', fontWeight: 700 }}>{combo}x</span>
          </div>

          {/* Misses Chip */}
          <div className={`${shakeMiss ? 'animate-[shake_0.4s_ease-in-out]' : ''}`} style={{ height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: misses > 0 ? '0 0 15px rgba(239,68,68,0.3)' : '0 0 10px rgba(239,68,68,0.1)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <X size={18} style={{ color: '#ef4444' }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Miss</span>
            <motion.span key={misses} initial={{ scale: 1.2, color: '#ef4444' }} animate={{ scale: 1, color: '#f87171' }} style={{ fontFamily: 'Orbitron', fontSize: '20px', fontWeight: 700 }}>
              {misses}
            </motion.span>
          </div>
        </motion.div>
      </div>

      {/* ─── GAME ARENA (Remaining Height) ─── */}
      <div className="arena" ref={arenaRef}>
        {/* SKY ENVIRONMENT PARALLAX LAYERS */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#1e293b]" />
          <div className="absolute top-0 left-1/4 w-[350px] h-[500px] bg-gradient-to-b from-blue-500/10 to-transparent blur-[120px] transform -rotate-12" />
          <div className="absolute top-0 right-1/4 w-[250px] h-[400px] bg-gradient-to-b from-cyan-500/10 to-transparent blur-[90px] transform rotate-12" />
          <div className="absolute top-10 left-10 w-1 h-1 bg-white/40 rounded-full animate-pulse" />
          <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white/60 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-48 left-2/3 w-1 h-1 bg-cyan-400/40 rounded-full animate-pulse" />
          <div className="absolute top-24 left-[-150px] w-64 h-12 bg-white/5 rounded-full blur-xl animate-[cloudDrift_75s_linear_infinite]" />
          <div className="absolute top-48 right-[-180px] w-80 h-16 bg-white/5 rounded-full blur-xl animate-[cloudDrift_95s_linear_infinite]" style={{ animationDelay: '-25s' }} />
        </div>

        {/* High-Performance Canvas spanning full arena */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full cursor-crosshair block z-0"
        />
      </div>

      {/* ─── FLOATING SCREEN OVERLAYS (BOSS WARNS, PAUSE ACTIONS) ─── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
        
        {bossHp !== null && bossMaxHp !== null && (
          <div className="absolute top-28 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-slate-950/90 border border-red-500/40 p-4 rounded-2xl shadow-2xl pointer-events-auto">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-black text-red-500 tracking-widest flex items-center gap-1.5 uppercase animate-pulse">
                <ShieldAlert size={14} className="animate-spin" /> Boss Eagle
              </span>
              <span className="text-xs font-mono text-white">{bossHp} / {bossMaxHp} HP</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-600 to-pink-500 h-full transition-all duration-100"
                style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
              />
            </div>
          </div>
        )}

        {showBossWarning && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-xs">
            <div className="text-center p-8 bg-slate-950/90 border-2 border-red-500/50 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.3)] max-w-md animate-pulse">
              <ShieldAlert size={64} className="text-red-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2 font-orbitron">Boss Incoming!</h2>
              <p className="text-sm text-slate-300 font-mono">AN EXTREME BOSS EAGLE HAS ENTERED THE SKY ARENA. ATTACK IMMEDIATELY!</p>
            </div>
          </div>
        )}

      </div>



      {/* ─── LEVEL COMPLETE MODAL OVERLAY ─── */}
      <AnimatePresence>
        {isSlowMo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-md z-[100]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass p-8 rounded-3xl max-w-md w-full text-center border-white/8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500" />
              
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Award size={32} />
              </div>
              
              <h2 className="text-3xl font-black text-white font-orbitron tracking-wider uppercase mb-2">Arena Conquered!</h2>
              <p className="text-xs text-slate-400 font-mono mb-6">MINTING LEVEL PROGRESS INTO SECURE BASE LEDGER</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Coins Earned</div>
                  <div className="text-2xl font-black text-amber-400 font-orbitron">+{20 + level * 5}</div>
                </div>
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">XP Granted</div>
                  <div className="text-2xl font-black text-purple-400 font-orbitron">+{50 + level * 10}</div>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-1.5 mb-2">
                <span>Transitioning to next sky environment</span>
                <span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span><span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span></span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAUSE MENU MODAL OVERLAY ─── */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-[100]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900/70 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500" />
              
              <h3 className="text-2xl font-black text-center text-white font-orbitron uppercase tracking-widest mb-6">Game Paused</h3>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm"
                >
                  <Play size={16} /> Resume Game
                </button>
                
                <button
                  onClick={() => {
                    eaglesRef.current = [];
                    particlesRef.current = [];
                    floatingTextsRef.current = [];
                    setScore(0);
                    setHits(0);
                    setCombo(0);
                    setTimeLeft(30);
                    setIsPaused(false);
                  }}
                  className="w-full btn-secondary py-3 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white"
                >
                  <RotateCcw size={16} /> Restart Arena
                </button>
                
                <button
                  onClick={() => {
                    setIsPaused(false);
                    onGameOver();
                  }}
                  className="w-full btn-secondary py-3 flex items-center justify-center gap-2 text-sm text-red-400 border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-300"
                >
                  <LogOut size={16} /> Exit to Hangar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

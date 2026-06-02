import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, Target, Award,
  Volume2, VolumeX, Layers, CheckCircle2,
  Compass, ShoppingBag, Terminal, Coins,
  Flame, Shield, Lock, Gift, X, Menu, Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioSynth } from '../utils/AudioSynth';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DashboardProps {
  playerData: any;
  onSelectSkin: (skinId: string) => void;
  onClaimCheckin: () => void;
  onClaimMission: (missionId: string, coinReward: number, xpReward: number) => void;
  leaderboardPeriod: string;
  setLeaderboardPeriod: (period: string) => void;
  leaderboardData: any[];
  onStartGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  web3LedgerLogs: string[];
  onlySidebar?: boolean;
  isSidebarOpen?: boolean;
  onCloseSidebar?: () => void;
  onOpenSidebar?: () => void;
}

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as any } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const NAV = [
  { id: 'play',         label: 'Sky Arena',      Icon: Compass },
  { id: 'profile',      label: 'Hangar',          Icon: ShoppingBag },
  { id: 'checkin',      label: 'Daily Check-In',  Icon: Calendar },
  { id: 'missions',     label: 'Missions',        Icon: Target },
  { id: 'achievements', label: 'Achievements',    Icon: Award },
  { id: 'leaderboard',  label: 'Leaderboards',    Icon: Trophy },
  { id: 'sandbox',      label: 'Web3 Ledger',     Icon: Terminal },
];

const SKINS = [
  { id: 'default',           name: 'Morning Glider',    cost: 0,    grad: 'linear-gradient(135deg,#38bdf8,#3b82f6)',                 note: '' },
  { id: 'silver_wing',       name: 'Silver Talon',      cost: 500,  grad: 'linear-gradient(135deg,#94a3b8,#64748b)',                 note: '' },
  { id: 'golden_glow',       name: 'Golden Harrier',    cost: 1500, grad: 'linear-gradient(135deg,#fbbf24,#f59e0b)',                 note: '' },
  { id: 'mythic_shadow',     name: 'Mythic Falcon',     cost: 4000, grad: 'linear-gradient(135deg,#7c3aed,#312e81)',                 note: '' },
  { id: 'legendary_phoenix', name: 'Phoenix Legend',    cost: 0,    grad: 'linear-gradient(135deg,#f43f5e,#fb923c,#fbbf24)',         note: 'Day 7' },
];

const ACH = [
  { id: 'first_hunt',        title: 'First Hunt',       desc: 'Hit your first eagle.',             e: '🎯', r: 'common'    },
  { id: '100_hits',          title: '100 Eagles',       desc: 'Hunt 100 eagles.',                  e: '🦅', r: 'common'    },
  { id: '500_hits',          title: '500 Eagles',       desc: 'Extinguish 500 eagles.',            e: '⚔️', r: 'rare'      },
  { id: '1000_hits',         title: '1000 Master',      desc: 'Complete 1000 hunts.',              e: '👑', r: 'epic'      },
  { id: 'golden_hunter',     title: 'Golden Hunter',    desc: 'Hit a golden eagle.',               e: '✨', r: 'rare'      },
  { id: 'legendary_hunter',  title: 'Legendary Hunter', desc: 'Hit a mythic eagle.',               e: '🔥', r: 'legendary' },
  { id: 'level_20',          title: 'Level 20',         desc: 'Reach level 20.',                   e: '⛰️', r: 'rare'      },
  { id: 'level_40',          title: 'Level 40 Master',  desc: 'Reach maximum level.',              e: '🌌', r: 'legendary' },
  { id: 'streak_7',          title: '7-Day Streak',     desc: '7 consecutive check-ins.',          e: '📅', r: 'epic'      },
];

const RARITY_BG:   Record<string,string> = { common:'rgba(100,116,139,.18)', rare:'rgba(59,130,246,.18)', epic:'rgba(139,92,246,.18)', legendary:'rgba(245,158,11,.18)' };
const RARITY_BORDER: Record<string,string> = { common:'rgba(100,116,139,.35)', rare:'rgba(59,130,246,.4)', epic:'rgba(139,92,246,.4)', legendary:'rgba(245,158,11,.5)' };
const RARITY_COLOR: Record<string,string> = { common:'#64748b', rare:'#3b82f6', epic:'#8b5cf6', legendary:'#f59e0b' };

export const Dashboard: React.FC<DashboardProps> = ({
  playerData, onSelectSkin, onClaimCheckin, onClaimMission,
  leaderboardPeriod,
  setLeaderboardPeriod, leaderboardData, onStartGame,
  isMuted, onToggleMute, web3LedgerLogs, onlySidebar = false,
  isSidebarOpen = false, onCloseSidebar, onOpenSidebar
}) => {
  const [tab, setTab] = useState('play');
  const [missions, setMissions] = useState([
    { id: 'm1',  title: 'Hit 50 Eagles',       progress: 14,  target: 50,   coins: 150, xp: 200, claimed: false, weekly: false },
    { id: 'm2',  title: 'Hit 5 Golden Eagles', progress: 1,   target: 5,    coins: 300, xp: 400, claimed: false, weekly: false },
    { id: 'm3',  title: 'Reach Combo x10',     progress: 0,   target: 10,   coins: 100, xp: 150, claimed: false, weekly: false },
    { id: 'm4',  title: 'Play 3 Matches',      progress: 1,   target: 3,    coins: 200, xp: 250, claimed: false, weekly: false },
    { id: 'mw1', title: 'Collect 1000 Coins',  progress: 450, target: 1000, coins: 500, xp: 600, claimed: false, weekly: true  },
    { id: 'mw2', title: 'Reach New Level',     progress: 0,   target: 1,    coins: 400, xp: 500, claimed: false, weekly: true  },
  ]);

  useEffect(() => {
    if (!playerData) return;
    setMissions(p => p.map(m => {
      if (m.id === 'm1')  return { ...m, progress: Math.min(m.target, Math.floor(playerData.xp / 10)) };
      if (m.id === 'm3')  return { ...m, progress: playerData.level > 2 ? 10 : 0 };
      if (m.id === 'mw1') return { ...m, progress: Math.min(m.target, playerData.coins) };
      return m;
    }));
  }, [playerData]);

  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!playerData || !playerData.lastCheckIn) {
      setTimeRemaining(0);
      return;
    }
    const calculateTimeLeft = () => {
      const nextClaim = (playerData.lastCheckIn + 86400) * 1000;
      const left = Math.max(0, nextClaim - Date.now());
      setTimeRemaining(left);
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [playerData.lastCheckIn]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const fw = (a: string) => !a ? 'Not Connected' : `${a.slice(0,6)}...${a.slice(-4)}`;

  const claimMission = (m: typeof missions[0]) => {
    if (m.progress < m.target || m.claimed) return;
    audioSynth.playRewardClaim();
    confetti({ particleCount: 90, spread: 65, origin: { y: 0.8 } });
    onClaimMission(m.id, m.coins, m.xp);
    setMissions(p => p.map(x => x.id === m.id ? { ...x, claimed: true } : x));
  };

  const xpMax = playerData.level * 100;
  const xpPct = Math.min(100, Math.floor((playerData.xp / xpMax) * 100));

  // ─── SHARED STYLES ──────────────────────────────────────────────────────────
  const S = {
    card: { background:'rgba(255,255,255,.04)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.07)', borderRadius:24, boxShadow:'0 0 30px rgba(59,130,246,.08),0 8px 32px rgba(0,0,0,.4)', transition:'transform .3s,box-shadow .3s,border-color .3s' } as React.CSSProperties,
    row: { display:'flex', alignItems:'center', gap:12 } as React.CSSProperties,
    label: { fontSize:10, fontFamily:'Orbitron', color:'#475569', textTransform:'uppercase' as const, letterSpacing:1 },
    val:   { fontFamily:'Orbitron', fontWeight:800, color:'#e2e8f0', marginTop:2 },
    h2:    { fontFamily:'Orbitron', fontSize:20, fontWeight:800, color:'#e2e8f0' },
    sub:   { fontSize:13, color:'#475569', marginTop:6 },
    divider: { borderTop:'1px solid rgba(255,255,255,.05)', margin:'0 0 20px' },
  };

  return (
    <div className="app-layout">

      {/* Mobile Backdrop */}
      {isSidebarOpen && onCloseSidebar && (
        <div 
          onClick={onCloseSidebar} 
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[998]"
        />
      )}

      {/* ─── SIDEBAR ────────────────────────────────────────────────────────── */}
      <motion.aside
        initial={{ x:-30, opacity:0 }}
        animate={{ x:0, opacity:1 }}
        transition={{ duration:.5, ease:'easeOut' }}
        className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
        style={{ padding:'24px 16px' }}
      >
        {/* Logo */}
        <div style={{ padding:'0 8px 24px', borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={S.row}>
            <div style={{ width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 22px rgba(59,130,246,.45)',flexShrink:0 }}>
              <span style={{ fontSize:22 }}>🦅</span>
            </div>
            <div>
              <div style={{ fontFamily:'Orbitron',fontSize:17,fontWeight:900,letterSpacing:3,background:'linear-gradient(135deg,#60a5fa,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',textTransform:'uppercase' }}>EAGLE RUSH</div>
              <div style={{ fontSize:9,fontFamily:'Inter',color:'#3b82f6',letterSpacing:2,textTransform:'uppercase',marginTop:1 }}>Sky Hunter Adventure</div>
            </div>
          </div>
          {onCloseSidebar && (
            <button onClick={onCloseSidebar} className="lg:hidden" style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', padding:4 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id}
              onClick={() => { audioSynth.playClick(); setTab(id); if (window.innerWidth < 1024 && onCloseSidebar) onCloseSidebar(); }}
              className={`nav-item${tab === id ? ' active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === 'checkin' && playerData.streak > 0 && (
                <span style={{ marginLeft:'auto',fontSize:9,fontFamily:'Orbitron',background:'rgba(236,72,153,.2)',color:'#ec4899',border:'1px solid rgba(236,72,153,.35)',padding:'2px 6px',borderRadius:6,fontWeight:800 }}>
                  {playerData.streak}D
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Player Stats (Compact) */}
        <div style={{ marginTop:24, marginBottom:20, display:'flex', flexDirection:'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontFamily: 'Orbitron', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Player Stats</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.03)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ fontSize: 11, fontFamily: 'Inter', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}><Flame size={12} color="#ec4899" /> Best Combo</span>
            <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700, color: '#e2e8f0' }}>{(playerData as any).bestCombo || 0}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.03)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ fontSize: 11, fontFamily: 'Inter', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}><Target size={12} color="#06b6d4" /> Arena Progress</span>
            <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700, color: '#e2e8f0' }}>{xpPct}%</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.03)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ fontSize: 11, fontFamily: 'Inter', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={12} color="#3b82f6" /> Highest Level</span>
            <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700, color: '#e2e8f0' }}>{playerData.level}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.03)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ fontSize: 11, fontFamily: 'Inter', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}><Coins size={12} color="#f59e0b" /> Total Coins</span>
            <span style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700, color: '#e2e8f0' }}>{playerData.coins}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:20,display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <button className="btn-secondary" onClick={onToggleMute} style={{ padding:'8px 12px',display:'flex',alignItems:'center' }}>
              {isMuted ? <VolumeX size={15}/> : <Volume2 size={15}/>}
            </button>
          </div>
          <div style={{ marginTop:'auto',borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:20 }}>
            <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
          </div>
        </div>
      </motion.aside>

      {onlySidebar ? null : (
        <div className="main-content">

        {/* TOP BAR */}
        <div className="topbar" style={{ padding:'0 28px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="lg:hidden" onClick={() => onOpenSidebar?.()} style={{ background:'transparent', border:'none', color:'#e2e8f0', cursor:'pointer' }}>
              <Menu size={24} />
            </button>
            <span style={{ fontFamily:'Orbitron',fontSize:13,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:2 }}>
              {NAV.find(n => n.id === tab)?.label}
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
            {[
              { Icon:Coins,  label:'Coins',  val:playerData.coins, c:'#f59e0b' },
              { Icon:Layers, label:'XP',     val:playerData.xp,    c:'#8b5cf6' },
              { Icon:Trophy, label:'Level',  val:playerData.level, c:'#3b82f6' },
              { Icon:Flame,  label:'Streak', val:`${playerData.streak}d`, c:'#ec4899' },
            ].map(s => (
              <div key={s.label} className="stat-pill">
                <s.Icon size={14} style={{ color:s.c,flexShrink:0 }}/>
                <span style={{ fontSize:11,color:'#64748b',fontFamily:'Inter' }}>{s.label}</span>
                <span style={{ fontSize:13,fontFamily:'Orbitron',fontWeight:700,color:'#e2e8f0' }}>{s.val}</span>
              </div>
            ))}
            <ConnectButton showBalance={false} />
          </div>
        </div>

        {/* PAGE BODY */}
        <div style={{ flex:1,overflowY:'auto',padding:'28px 28px 48px' }}>
          <AnimatePresence mode="wait">

            {/* ── PLAY ── */}
            {tab === 'play' && (
              <motion.div key="play" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }} style={{ display:'flex',flexDirection:'column',gap:22 }}>

                {/* Hero card */}
                <motion.div variants={fadeUp} style={{ ...S.card, padding:36, position:'relative', overflow:'hidden', minHeight:270 }}>
                  <div style={{ position:'absolute',right:-60,top:-60,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)',pointerEvents:'none' }}/>
                  <div style={{ position:'absolute',left:'58%',bottom:-10,fontSize:160,opacity:.04,lineHeight:1,userSelect:'none',pointerEvents:'none' }}>🦅</div>
                  <div style={{ position:'relative',zIndex:1 }}>
                    <span style={{ fontSize:10,fontFamily:'Orbitron',color:'#3b82f6',letterSpacing:2,textTransform:'uppercase',background:'rgba(59,130,246,.12)',padding:'4px 12px',borderRadius:20,border:'1px solid rgba(59,130,246,.25)' }}>Ready to Hunt</span>
                    <h1 style={{ fontFamily:'Orbitron',fontSize:36,fontWeight:900,letterSpacing:3,marginTop:16,lineHeight:1.1,background:'linear-gradient(135deg,#60a5fa,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>
                      EAGLE RUSH
                    </h1>
                    <p style={{ marginTop:12,fontSize:14,color:'#64748b',maxWidth:440,lineHeight:1.75 }}>
                      Hunt Common, Silver, Golden & Mythic eagles. Build combos, defeat Boss Eagles, and earn on-chain rewards across 40 progressive sky environments.
                    </p>
                    <div style={{ display:'flex',gap:28,marginTop:22,paddingTop:18,borderTop:'1px solid rgba(255,255,255,.06)' }}>
                      {[['🏆 40','Progressive Levels'],['🦅 Rare','Eagle Bosses'],['🎁 Daily','Rewards'],['⚡ Combo','Multipliers']].map(([v,l]) => (
                        <div key={l}>
                          <div style={{ fontFamily:'Orbitron',fontSize:14,fontWeight:800,color:'#60a5fa' }}>{v}</div>
                          <div style={{ fontSize:10,color:'#475569',fontFamily:'Inter',textTransform:'uppercase',letterSpacing:1,marginTop:2 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <motion.button className="btn-primary" onClick={onStartGame} whileTap={{ scale:.97 }}
                      style={{ marginTop:26,padding:'15px 38px',fontSize:13,letterSpacing:2,display:'flex',alignItems:'center',gap:10 }}>
                      <Compass size={18}/> START SKY HUNT
                    </motion.button>
                  </div>
                </motion.div>

                {/* Stat cards */}
                <motion.div variants={fadeUp} style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14 }}>
                  {[
                    { Icon:Coins,  label:'Coins',  val:playerData.coins, hex:'245,158,11'  },
                    { Icon:Layers, label:'XP',     val:playerData.xp,    hex:'139,92,246'  },
                    { Icon:Trophy, label:'Level',  val:playerData.level, hex:'59,130,246'  },
                    { Icon:Flame,  label:'Streak', val:`${playerData.streak}d`, hex:'236,72,153' },
                  ].map(s => (
                    <div key={s.label} style={{ ...S.card, padding:'20px 22px', display:'flex', alignItems:'center', gap:14, borderRadius:20 }}>
                      <div style={{ width:46,height:46,borderRadius:14,background:`rgba(${s.hex},.14)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 16px rgba(${s.hex},.3)`,flexShrink:0 }}>
                        <s.Icon size={22} style={{ color:`rgb(${s.hex})` }}/>
                      </div>
                      <div>
                        <div style={S.label}>{s.label}</div>
                        <div style={{ ...S.val, fontSize:22 }}>{s.val}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* XP bar */}
                <motion.div variants={fadeUp} style={{ ...S.card, padding:'20px 24px', borderRadius:20 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                    <span style={{ fontFamily:'Orbitron',fontSize:12,fontWeight:700,color:'#3b82f6',textTransform:'uppercase',letterSpacing:1 }}>Level {playerData.level} Progress</span>
                    <span style={{ fontSize:11,fontFamily:'Inter',color:'#475569' }}>{playerData.xp} / {xpMax} XP</span>
                  </div>
                  <div className="progress-track">
                    <motion.div className="progress-fill" initial={{ width:0 }} animate={{ width:`${xpPct}%` }} transition={{ duration:1,ease:'easeOut' }}/>
                  </div>
                  <div style={{ marginTop:7,fontSize:10,color:'#334155' }}>{xpPct}% to Level {playerData.level+1}</div>
                </motion.div>

                {/* Anti-bot */}
                <motion.div variants={fadeUp} style={{ ...S.card, padding:'16px 22px', borderRadius:20, borderLeft:'3px solid #10b981' }}>
                  <div style={S.row}>
                    <Shield size={20} style={{ color:'#10b981',flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Orbitron',fontSize:11,fontWeight:700,color:'#10b981',textTransform:'uppercase',letterSpacing:1 }}>Anti-Bot Shield Active</div>
                      <div style={{ fontFamily:'Inter',fontSize:11,color:'#475569',marginTop:3 }}>Continuous heuristic click-pattern analysis running</div>
                    </div>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 10px #10b981',animation:'pulse 2s infinite' }}/>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ── HANGAR ── */}
            {tab === 'profile' && (
              <motion.div key="profile" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }}>
                <motion.div variants={fadeUp} style={{ marginBottom:22 }}>
                  <h2 style={S.h2}>Hangar & Cosmetics</h2>
                  <p style={S.sub}>Unlock premium skins with coins earned from hunting.</p>
                </motion.div>
                <motion.div variants={fadeUp} style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(215px,1fr))',gap:18 }}>
                  {SKINS.map(sk => {
                    const owned   = playerData.unlockedSkins?.includes(sk.id) || sk.cost === 0;
                    const equipped = playerData.activeSkin === sk.id;
                    return (
                      <div key={sk.id} className={`skin-card${equipped ? ' equipped' : ''}`}>
                        <div style={{ height:108,background:sk.grad,display:'flex',alignItems:'center',justifyContent:'center',position:'relative' }}>
                          <span style={{ fontSize:50,filter:'drop-shadow(0 4px 14px rgba(0,0,0,.5))' }}>🦅</span>
                          {equipped && <span style={{ position:'absolute',top:8,right:8,fontSize:9,fontFamily:'Orbitron',background:'#3b82f6',color:'#fff',padding:'3px 8px',borderRadius:6,fontWeight:800 }}>ACTIVE</span>}
                          {sk.note && <span style={{ position:'absolute',top:8,left:8,fontSize:9,fontFamily:'Orbitron',background:'rgba(0,0,0,.55)',color:'#f59e0b',padding:'3px 8px',borderRadius:6,fontWeight:800,border:'1px solid rgba(245,158,11,.4)' }}>{sk.note}</span>}
                        </div>
                        <div style={{ padding:'14px 16px' }}>
                          <div style={{ fontFamily:'Inter',fontWeight:700,fontSize:14,color:'#e2e8f0' }}>{sk.name}</div>
                          <div style={{ fontSize:11,color:'#475569',marginTop:3 }}>{sk.note ? sk.note : owned ? 'Owned' : `${sk.cost} Coins`}</div>
                          <button
                            className={equipped ? 'btn-secondary' : 'btn-primary'}
                            disabled={equipped}
                            onClick={() => {
                              if (!owned && playerData.coins < sk.cost) { alert('Insufficient coins!'); return; }
                              audioSynth.playClick(); onSelectSkin(sk.id);
                            }}
                            style={{ marginTop:12,width:'100%',padding:'10px',fontSize:11,letterSpacing:1,cursor:equipped?'default':'pointer' }}
                          >
                            {equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `BUY — ${sk.cost} 🪙`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {/* ── CHECK-IN ── */}
            {tab === 'checkin' && (
              <motion.div key="checkin" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }} style={{ maxWidth:540,margin:'0 auto' }}>
                <motion.div variants={fadeUp} style={{ textAlign:'center',marginBottom:30 }}>
                  <div style={{ fontSize:46,marginBottom:10 }}>🗓️</div>
                  <h2 style={{ ...S.h2,fontSize:22,letterSpacing:2 }}>DAILY STREAK</h2>
                  <p style={{ ...S.sub }}>Claim every day. Hit Day 7 for the Legendary Phoenix skin!</p>
                  
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20 }}>
                    <Flame size={16} style={{ color: '#f59e0b' }} />
                    <span style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                      Current Streak: Day {(playerData.streak % 7) || (playerData.streak > 0 && playerData.streak % 7 === 0 ? 7 : 0)} / 7
                    </span>
                  </div>
                </motion.div>
                
                <motion.div variants={fadeUp} style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:9,marginBottom:26 }}>
                  {[1,2,3,4,5,6,7].map(day => {
                    const displayStreak = (playerData.streak % 7) || (playerData.streak > 0 && playerData.streak % 7 === 0 ? 7 : 0);
                    const claimed = day <= displayStreak;
                    const today = timeRemaining === 0 && day === displayStreak + 1;
                    const nextDay = timeRemaining > 0 && day === displayStreak + 1;
                    const locked = !claimed && !today;
                    const r: Record<number,string> = {1:'50🪙',2:'100🪙',3:'150🪙',4:'250🪙',5:'500🪙',6:'📦',7:'🔥'};
                    
                    return (
                      <div key={day} className={`checkin-day ${claimed?'claimed':today?'today':'locked'}`}>
                        <div style={{ fontSize:9,fontFamily:'Orbitron',fontWeight:800,color:claimed?'#10b981':today?'#3b82f6':'#334155',textTransform:'uppercase',letterSpacing:.5 }}>D{day}</div>
                        
                        {claimed ? (
                          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
                          </div>
                        ) : (
                          <div style={{ fontSize:20 }}>{nextDay ? '⭐' : day===7?'👑':day===6?'📦':'🪙'}</div>
                        )}
                        
                        <div style={{ fontSize:10,fontFamily:'Inter',color:claimed?'#10b981':today?'#60a5fa':nextDay?'#f59e0b':'#475569',textAlign:'center',fontWeight:600 }}>
                          {claimed ? 'CLAIMED' : nextDay ? 'NEXT DAY' : r[day]}
                        </div>
                        
                        {today && <motion.div animate={{ scale:[1,1.3,1] }} transition={{ repeat:Infinity,duration:1.5 }} style={{ width:6,height:6,borderRadius:'50%',background:'#3b82f6' }}/>}
                        {locked && <Lock size={12} style={{ color:'#334155',opacity:.45 }}/>}
                      </div>
                    );
                  })}
                </motion.div>
                
                <motion.div variants={fadeUp} style={{ textAlign:'center' }}>
                  {timeRemaining > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <button className="btn-secondary" disabled style={{ padding:'15px 44px',fontSize:13,letterSpacing:2,display:'inline-flex',alignItems:'center',gap:10, opacity: 0.7, cursor: 'not-allowed' }}>
                        <Clock size={17}/> CLAIM AVAILABLE IN
                      </button>
                      <div style={{ fontFamily: 'Orbitron', fontSize: 24, fontWeight: 800, color: '#e2e8f0', textShadow: '0 0 15px rgba(255,255,255,0.2)' }}>
                        {formatCountdown(timeRemaining)}
                      </div>
                    </div>
                  ) : (
                    <motion.button className="btn-primary" onClick={() => { audioSynth.playClick(); onClaimCheckin(); }} whileTap={{ scale:.96 }}
                      style={{ padding:'15px 44px',fontSize:13,letterSpacing:2,display:'inline-flex',alignItems:'center',gap:10 }}>
                      <Gift size={17}/> CLAIM REWARD
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ── MISSIONS ── */}
            {tab === 'missions' && (
              <motion.div key="missions" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }}>
                <motion.div variants={fadeUp} style={{ marginBottom:22 }}>
                  <h2 style={S.h2}>Active Missions</h2>
                  <p style={S.sub}>Complete objectives to earn bonus coins and XP.</p>
                </motion.div>
                <motion.div variants={stagger} style={{ display:'flex',flexDirection:'column',gap:11 }}>
                  {missions.map(m => {
                    const pct  = Math.min(100, Math.floor((m.progress/m.target)*100));
                    const done = m.progress >= m.target;
                    return (
                      <motion.div key={m.id} variants={fadeUp} className="mission-card">
                        <div style={{ width:44,height:44,borderRadius:14,background:done?'rgba(16,185,129,.14)':'rgba(59,130,246,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${done?'rgba(16,185,129,.3)':'rgba(59,130,246,.2)'}`}}>
                          {done ? <CheckCircle2 size={20} style={{ color:'#10b981' }}/> : <Target size={20} style={{ color:'#3b82f6' }}/>}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                            {m.weekly && <span style={{ fontSize:9,fontFamily:'Orbitron',background:'rgba(139,92,246,.2)',color:'#8b5cf6',border:'1px solid rgba(139,92,246,.3)',padding:'2px 7px',borderRadius:6,fontWeight:800 }}>WEEKLY</span>}
                            <span style={{ fontFamily:'Inter',fontWeight:600,fontSize:14,color:'#e2e8f0' }}>{m.title}</span>
                          </div>
                          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                            <div className="progress-track" style={{ flex:1 }}>
                              <motion.div className="progress-fill" initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:.8,ease:'easeOut' }}/>
                            </div>
                            <span style={{ fontSize:11,fontFamily:'Orbitron',color:'#475569',flexShrink:0 }}>{m.progress}/{m.target}</span>
                          </div>
                          <div style={{ fontSize:11,color:'#475569',marginTop:4 }}>🪙 {m.coins} &nbsp;⚡ {m.xp} XP</div>
                        </div>
                        <button
                          className={m.claimed?'btn-secondary':done?'btn-primary':'btn-secondary'}
                          onClick={() => claimMission(m)}
                          disabled={m.claimed||!done}
                          style={{ padding:'9px 16px',fontSize:11,letterSpacing:1,flexShrink:0,opacity:(!done&&!m.claimed)?.4:1 }}
                        >
                          {m.claimed?'CLAIMED':done?'CLAIM':'LOCKED'}
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {/* ── ACHIEVEMENTS ── */}
            {tab === 'achievements' && (
              <motion.div key="achievements" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }}>
                <motion.div variants={fadeUp} style={{ marginBottom:22 }}>
                  <h2 style={S.h2}>Hall of Glory</h2>
                  <p style={S.sub}>Unlocked achievements are minted as NFTs on Base Network.</p>
                </motion.div>
                <motion.div variants={stagger} style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:14 }}>
                  {ACH.map(a => {
                    const unlocked = playerData.achievements?.includes(a.id);
                    return (
                      <motion.div key={a.id} variants={fadeUp} className="achievement-card"
                        style={{ background:unlocked?RARITY_BG[a.r]:'rgba(255,255,255,.02)', borderColor:unlocked?RARITY_BORDER[a.r]:'rgba(255,255,255,.06)', opacity:unlocked?1:.5 }}>
                        <div style={{ width:50,height:50,borderRadius:16,background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,border:`1px solid ${unlocked?RARITY_BORDER[a.r]:'rgba(255,255,255,.06)'}`}}>{a.e}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <span style={{ fontFamily:'Inter',fontWeight:700,fontSize:14,color:'#e2e8f0' }}>{a.title}</span>
                            {unlocked && <span style={{ fontSize:9,fontFamily:'Orbitron',background:'rgba(59,130,246,.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,.3)',padding:'2px 6px',borderRadius:5,fontWeight:800 }}>MINTED</span>}
                          </div>
                          <div style={{ fontSize:12,color:'#475569',marginTop:4 }}>{a.desc}</div>
                          <div style={{ fontSize:10,marginTop:6,fontFamily:'Orbitron',fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:RARITY_COLOR[a.r] }}>{a.r}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {/* ── LEADERBOARD ── */}
            {tab === 'leaderboard' && (
              <motion.div key="leaderboard" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }}>
                <motion.div variants={fadeUp} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,flexWrap:'wrap',gap:12 }}>
                  <div>
                    <h2 style={S.h2}>Sky Rankings</h2>
                    <p style={S.sub}>Top hunters across all time periods.</p>
                  </div>
                  <div style={{ display:'flex',gap:6 }}>
                    {['DAILY','WEEKLY','MONTHLY','ALLTIME'].map(p => (
                      <button key={p} onClick={() => { audioSynth.playClick(); setLeaderboardPeriod(p); }}
                        style={{ padding:'7px 13px',fontSize:10,fontFamily:'Orbitron',fontWeight:700,letterSpacing:1,cursor:'pointer',borderRadius:10,border:leaderboardPeriod===p?'1px solid rgba(59,130,246,.5)':'1px solid rgba(255,255,255,.07)',background:leaderboardPeriod===p?'rgba(59,130,246,.15)':'rgba(255,255,255,.03)',color:leaderboardPeriod===p?'#60a5fa':'#475569',transition:'all .2s' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
                <motion.div variants={fadeUp} style={{ ...S.card,overflow:'hidden',borderRadius:24,padding:0 }}>
                  <div style={{ padding:'12px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'grid',gridTemplateColumns:'52px 1fr 70px 70px 90px',gap:8 }}>
                    {['Rank','Hunter','Lvl','XP','Score'].map(h=>(
                      <div key={h} style={{ fontSize:10,fontFamily:'Orbitron',color:'#334155',textTransform:'uppercase',letterSpacing:1 }}>{h}</div>
                    ))}
                  </div>
                  {leaderboardData.length > 0 ? leaderboardData.map((row,i) => {
                    const self = row.wallet?.toLowerCase() === playerData.wallet?.toLowerCase();
                    const rc   = i===0?'rank-gold':i===1?'rank-silver':i===2?'rank-bronze':'rank-other';
                    return (
                      <motion.div key={row.id??i}
                        initial={{ opacity:0,x:-10 }} animate={{ opacity:1,x:0 }} transition={{ delay:i*.05 }}
                        className={`lb-row${self?' self':''}`}
                        style={{ gridTemplateColumns:'52px 1fr 70px 70px 90px' }}
                      >
                        <div className={`rank-badge ${rc}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
                        <div style={{ display:'flex',alignItems:'center',gap:9,minWidth:0 }}>
                          <div style={{ width:30,height:30,borderRadius:9,background:`hsl(${(parseInt(row.wallet?.slice(2,4)??'0',16)*1.4)%360},55%,28%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0 }}>🦅</div>
                          <span style={{ fontFamily:'Orbitron',fontSize:11,color:self?'#60a5fa':'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{fw(row.wallet??'')}</span>
                        </div>
                        <div style={{ fontFamily:'Orbitron',fontSize:13,color:'#3b82f6' }}>{row.level}</div>
                        <div style={{ fontFamily:'Inter',fontSize:12,color:'#475569' }}>{row.xp}</div>
                        <div style={{ fontFamily:'Orbitron',fontSize:14,fontWeight:800,color:i===0?'#f59e0b':'#e2e8f0' }}>{row.score}</div>
                      </motion.div>
                    );
                  }) : (
                    <div style={{ padding:48,textAlign:'center',color:'#334155',fontSize:13 }}>No entries yet. Complete a match to appear here.</div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ── WEB3 LEDGER ── */}
            {tab === 'sandbox' && (
              <motion.div key="sandbox" variants={stagger} initial="hidden" animate="show" exit={{ opacity:0 }}>
                <motion.div variants={fadeUp} style={{ marginBottom:22 }}>
                  <h2 style={S.h2}>Web3 Ledger</h2>
                  <p style={S.sub}>Live on-chain event stream for Base Network Layer 2.</p>
                </motion.div>
                <motion.div variants={fadeUp} style={{ ...S.card,overflow:'hidden',padding:0 }}>
                  <div style={{ padding:'15px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontFamily:'Orbitron',fontSize:11,color:'#3b82f6',display:'flex',alignItems:'center',gap:8,fontWeight:700,letterSpacing:1 }}>
                      <Terminal size={14}/> BASE L2 EVENT STREAM
                    </span>
                    <span style={{ fontSize:10,fontFamily:'Orbitron',background:'rgba(16,185,129,.15)',color:'#10b981',border:'1px solid rgba(16,185,129,.3)',padding:'4px 10px',borderRadius:8,fontWeight:700 }}>● LIVE</span>
                  </div>
                  <div style={{ padding:20,fontFamily:'monospace',fontSize:12,color:'#64748b',height:320,overflowY:'auto',display:'flex',flexDirection:'column',gap:8 }}>
                    {web3LedgerLogs.length > 0 ? web3LedgerLogs.map((log,i) => (
                      <motion.div key={i} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }}
                        style={{ display:'flex',gap:12,borderBottom:'1px solid rgba(255,255,255,.03)',paddingBottom:8 }}>
                        <span style={{ color:'#ec4899',fontWeight:700,flexShrink:0,fontFamily:'Orbitron',fontSize:10 }}>[{String(i+1).padStart(3,'0')}]</span>
                        <span style={{ color:'#94a3b8',wordBreak:'break-all',lineHeight:1.6 }}>{log}</span>
                      </motion.div>
                    )) : (
                      <div style={{ textAlign:'center',paddingTop:80,color:'#334155',fontSize:12 }}>No transactions recorded. Connect wallet and start hunting!</div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 28px',borderTop:'1px solid rgba(255,255,255,.04)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:10,fontFamily:'Orbitron',color:'#1e293b',letterSpacing:1 }}>EAGLE RUSH v1.0.0</span>
          <span style={{ fontSize:10,fontFamily:'Inter',color:'#1e293b' }}>Built on Base Network · Powered by EVM</span>
        </div>
      </div>
      )}
    </div>
  );
};

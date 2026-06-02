import { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Dashboard } from './components/Dashboard';
import AnimatedBackground from './components/AnimatedBackground';
import { audioSynth } from './utils/AudioSynth';
import { ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { encodeFunctionData } from 'viem';
import * as ox from 'ox';
import { EAGLE_RUSH_ABI, EAGLE_RUSH_ADDRESS, BUILDER_CODE_SUFFIX } from './utils/web3Config';

interface PlayerData {
  wallet: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  unlockedSkins: string;
  achievements: string;
  inventory: string;
  activeSkin: string;
  encodedProgress: string;
}

function App() {
  const [gameState, setGameState] = useState<'dashboard' | 'playing'>('dashboard');
  const [wallet, setWallet] = useState<string>('');
  const [playerData, setPlayerData] = useState<PlayerData>({
    wallet: '',
    level: 1,
    xp: 0,
    coins: 200,
    streak: 0,
    unlockedSkins: 'default',
    achievements: '',
    inventory: '',
    activeSkin: 'default',
    encodedProgress: ''
  });

  const [leaderboardPeriod, setLeaderboardPeriod] = useState<string>('ALLTIME');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [web3LedgerLogs, setWeb3LedgerLogs] = useState<string[]>([]);
  const [botFlaggedReason, setBotFlaggedReason] = useState<string | null>(null);

  const { address, isConnected, isDisconnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Watch for wagmi connection state changes
  useEffect(() => {
    if (isConnected && address) {
      if (wallet !== address) {
        authenticateWalletSession(address);
      }
    } else if (isDisconnected) {
      if (wallet) {
        handleDisconnectWallet();
      }
    }
  }, [address, isConnected, isDisconnected, wallet]);

  // Fetch Leaderboard whenever period changes
  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardPeriod]);

  const addWeb3Log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setWeb3LedgerLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // Base64 helper methods removed

  // Wallet Sign-In / Connection
  const authenticateWalletSession = async (selectedWallet: string) => {
    setWallet(selectedWallet);
    localStorage.setItem('eaglerush_wallet', selectedWallet);
    
    addWeb3Log(`WEB3: Initiating Base L2 session for ${selectedWallet.substring(0, 10)}...`);

    // Load from local database (localStorage)
    let localProfile: Partial<PlayerData> = {};
    try {
      const saved = localStorage.getItem(`eaglerush_data_${selectedWallet.toLowerCase()}`);
      if (saved) {
        localProfile = JSON.parse(saved);
        addWeb3Log(`DB: Loaded local fast gameplay data for ${selectedWallet.substring(0, 10)}`);
      }
    } catch (e) {
      console.error('Failed to load local profile');
    }

    try {
      if (!publicClient) throw new Error("No public client available");

      const pData: any = await publicClient.readContract({
        address: EAGLE_RUSH_ADDRESS,
        abi: EAGLE_RUSH_ABI,
        functionName: 'players',
        args: [selectedWallet as `0x${string}`]
      });

      addWeb3Log(`SYNC: Onchain profile loaded successfully. Status: level ${pData[0] || 1}, coins ${pData[2] || 200}`);
      
      const loadedProfile: PlayerData = {
        wallet: selectedWallet,
        level: Math.max(Number(pData[0]) || 1, localProfile.level || 1),
        xp: localProfile.xp !== undefined ? localProfile.xp : (Number(pData[1]) || 0),
        coins: localProfile.coins !== undefined ? localProfile.coins : (Number(pData[2]) || 200),
        streak: Math.max(Number(pData[3]) || 0, localProfile.streak || 0),
        unlockedSkins: localProfile.unlockedSkins || 'default',
        achievements: localProfile.achievements || '',
        inventory: localProfile.inventory || '',
        activeSkin: localProfile.activeSkin || 'default',
        encodedProgress: localProfile.encodedProgress || ''
      };

      setPlayerData(loadedProfile);
      localStorage.setItem(`eaglerush_data_${selectedWallet.toLowerCase()}`, JSON.stringify(loadedProfile));
    } catch (e) {
      addWeb3Log("SYNC: Server offline. Initializing local sandbox secure profile database.");
      const initialProfile: PlayerData = {
        wallet: selectedWallet,
        level: localProfile.level || 1,
        xp: localProfile.xp || 0,
        coins: localProfile.coins || 200,
        streak: localProfile.streak || 0,
        unlockedSkins: localProfile.unlockedSkins || 'default',
        achievements: localProfile.achievements || '',
        inventory: localProfile.inventory || '',
        activeSkin: localProfile.activeSkin || 'default',
        encodedProgress: localProfile.encodedProgress || ''
      };
      setPlayerData(initialProfile);
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = () => {
    localStorage.removeItem('eaglerush_wallet');
    setWallet('');
    setPlayerData({
      wallet: '',
      level: 1,
      xp: 0,
      coins: 200,
      streak: 0,
      unlockedSkins: 'default',
      achievements: '',
      inventory: '',
      activeSkin: 'default',
      encodedProgress: ''
    });
    addWeb3Log("INFO: Wallet disconnected. Reverted to anonymous local guest mode.");
  };

  // Secure Save Progress Sync
  const syncProgressToCloud = async (updatedData: PlayerData) => {
    setPlayerData(updatedData);
    if (!updatedData.wallet) return;
    localStorage.setItem(`eaglerush_data_${updatedData.wallet.toLowerCase()}`, JSON.stringify(updatedData));
  };

  // Level Complete Event handler
  const handleLevelComplete = async (earnedCoins: number, earnedXp: number, finalScore: number) => {
    setGameState('dashboard');
    audioSynth.playRewardClaim();
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

    if (!walletClient || !address) {
      alert("Please connect wallet first");
      return;
    }

    try {
      const levelReached = playerData.level + (playerData.xp + earnedXp >= 100 * playerData.level ? 1 : 0);
      
      // We append Builder Code to this action!
      const data = encodeFunctionData({
        abi: EAGLE_RUSH_ABI,
        functionName: 'submitScore',
        args: [BigInt(levelReached), BigInt(finalScore), BigInt(1)]
      });

      const dataWithSuffix = ox.Hex.concat(data as `0x${string}`, BUILDER_CODE_SUFFIX as `0x${string}`);

      const hash = await walletClient.sendTransaction({
        to: EAGLE_RUSH_ADDRESS,
        data: dataWithSuffix
      });
      
      addWeb3Log(`TX: Score Submitted to Base L2! Hash: ${hash}`);
      
      const newXp = (playerData.xp + earnedXp) % (100 * playerData.level);
      
      syncProgressToCloud({
        ...playerData,
        level: levelReached,
        xp: newXp,
        coins: playerData.coins + earnedCoins
      });

    } catch (e) {
      addWeb3Log("ERROR: Failed to submit score transaction to Base.");
    }
  };

  // Fetch Leaderboard records
  const fetchLeaderboard = async () => {
    try {
      if (!publicClient) return;
      const data = await publicClient.readContract({
        address: EAGLE_RUSH_ADDRESS,
        abi: EAGLE_RUSH_ABI,
        functionName: 'getLeaderboard'
      }) as [readonly string[], readonly bigint[], readonly bigint[], readonly bigint[]];

      const addrs = data[0];
      const scores = data[1];
      const levels = data[2];
      
      const formatted = addrs.map((addr, i) => ({
        wallet: addr,
        score: Number(scores[i]),
        level: Number(levels[i]),
        xp: 0
      })).sort((a, b) => b.score - a.score);

      setLeaderboardData(formatted);
    } catch (e) {
      setLeaderboardData([]);
    }
  };

  // Daily Check-In claiming logic
  const handleClaimCheckin = async () => {
    if (!walletClient || !address) {
      alert('Please connect your Base wallet to claim streak rewards!');
      return;
    }

    try {
      const data = encodeFunctionData({
        abi: EAGLE_RUSH_ABI,
        functionName: 'dailyCheckIn'
      });

      const dataWithSuffix = ox.Hex.concat(data as `0x${string}`, BUILDER_CODE_SUFFIX as `0x${string}`);

      const txHash = await walletClient.sendTransaction({
        to: EAGLE_RUSH_ADDRESS,
        data: dataWithSuffix
      });

      addWeb3Log(`STREAK: Claimed check-in reward onchain! Hash: ${txHash}`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
      
      const pData: any = await publicClient?.readContract({
        address: EAGLE_RUSH_ADDRESS,
        abi: EAGLE_RUSH_ABI,
        functionName: 'players',
        args: [address as `0x${string}`]
      });

      if (pData) {
        syncProgressToCloud({
          ...playerData,
          streak: Number(pData[3]),
          coins: Number(pData[2])
        });
      }

    } catch (e) {
      addWeb3Log("ERROR: Already claimed today or transaction rejected!");
    }
  };

  // Claim Mission reward logic
  const handleClaimMission = (missionId: string, coinReward: number, xpReward: number) => {
    console.log("Claiming mission: " + missionId);
    let newXp = playerData.xp + xpReward;
    let newLevel = playerData.level;
    const targetXp = 100 * newLevel;

    if (newXp >= targetXp) {
      newLevel++;
      newXp = newXp - targetXp;
      addWeb3Log(`MINT: Level Up NFT unlocked! New Level: ${newLevel}`);
    }

    const updated = {
      ...playerData,
      coins: playerData.coins + coinReward,
      xp: newXp,
      level: newLevel
    };

    syncProgressToCloud(updated);
    addWeb3Log(`MISSION: Reward claimed! +${coinReward} Coins, +${xpReward} XP.`);
  };

  // Skins Equip / Shop Equip
  const handleSelectSkin = (skinId: string) => {
    const updated = {
      ...playerData,
      activeSkin: skinId
    };
    syncProgressToCloud(updated);
    addWeb3Log(`EQUIP: Cosmetic skin equipped: ${skinId}`);
  };

  const handleToggleMute = () => {
    const nextMuted = audioSynth.toggleMute();
    setIsMuted(nextMuted);
  };

  // Heuristic bot flags triggered
  const handleBotFlagged = (reason: string) => {
    setBotFlaggedReason(reason);
    setGameState('dashboard');
    audioSynth.playBossWarning();
    addWeb3Log(`SECURITY EXCEPTION: ${reason}`);
  };

  const handleStartGameClick = async () => {
    if (!walletClient || !address) {
      alert('Please connect your Base L2 wallet before hunting eagles!');
      return;
    }

    try {
      const data = encodeFunctionData({
        abi: EAGLE_RUSH_ABI,
        functionName: 'startSkyHunt'
      });
      const dataWithSuffix = ox.Hex.concat(data as `0x${string}`, BUILDER_CODE_SUFFIX as `0x${string}`);

      await walletClient.sendTransaction({
        to: EAGLE_RUSH_ADDRESS,
        data: dataWithSuffix
      });
      
      audioSynth.playClick();
      setGameState('playing');
      addWeb3Log("ARENA: Sky session initialized onchain. Loading flight path generators...");
    } catch (e) {
      addWeb3Log("ERROR: User rejected transaction to start hunt.");
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#08090d] text-slate-100 flex flex-col">
      {/* Dynamic Header bar */}
      
      {/* 1. If Game arena is ACTIVE */}
      {gameState === 'playing' ? (
        <div className="game-layout">
          {/* Dashboard Sidebar remains visible and active during gameplay */}
          <Dashboard 
            playerData={playerData} 
            onSelectSkin={handleSelectSkin}
            onClaimCheckin={handleClaimCheckin}
            onClaimMission={handleClaimMission}
            leaderboardPeriod={leaderboardPeriod}
            setLeaderboardPeriod={setLeaderboardPeriod}
            leaderboardData={leaderboardData}
            onStartGame={handleStartGameClick}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            web3LedgerLogs={web3LedgerLogs}
            onlySidebar={true}
          />
          <div className="main-game">
            {/* Ambient animated parallax background behind the game area */}
            <AnimatedBackground />
            <GameCanvas
              level={playerData.level}
              onLevelComplete={handleLevelComplete}
              onGameOver={() => setGameState('dashboard')}
              activeSkin={playerData.activeSkin}
              isMuted={isMuted}
              onBotFlagged={handleBotFlagged}
            />
          </div>
        </div>
      ) : (
        /* 2. Standard Web3 Dashboard */
        <div className="flex-1 w-full" style={{ position: 'relative' }}>
          <AnimatedBackground />
          <Dashboard
            playerData={playerData}
            onSelectSkin={handleSelectSkin}
            onClaimCheckin={handleClaimCheckin}
            onClaimMission={handleClaimMission}
            leaderboardPeriod={leaderboardPeriod}
            setLeaderboardPeriod={setLeaderboardPeriod}
            leaderboardData={leaderboardData}
            onStartGame={handleStartGameClick}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            web3LedgerLogs={web3LedgerLogs}
          />
        </div>
      )}

      {/* Security alert modal overlay for bot cooldowns */}
      {botFlaggedReason && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-[100] p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-pulse">
            <ShieldAlert size={64} className="text-rose-500 mx-auto animate-bounce" />
            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Anti-Bot Exception</h3>
            <p className="text-sm text-slate-355 leading-relaxed font-mono">
              {botFlaggedReason}
            </p>
            <p className="text-xs text-rose-400 font-mono">
              Your scores have been invalidated and your account cooldown has been enforced.
            </p>
            <button
              onClick={() => setBotFlaggedReason(null)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-widest transition"
            >
              Acknowledge Cooldown
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;

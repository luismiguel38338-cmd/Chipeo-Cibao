export type ComponentKey = 'drivers' | 'voice' | 'bass' | 'battery';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type GuaguaCategory = 'original' | 'sedan' | 'suv' | 'extremo';

export type CoilLevel = 1 | 2 | 3 | 4;

export interface CoilLoadout {
  bass: CoilLevel;
  voice: CoilLevel;
  drivers: CoilLevel;
}

export type StageLocation = 'campo' | 'patio' | 'colmado' | 'discoteca' | 'carwash';

export type RadioCameraPreset = 'front' | 'angle' | 'knobs';

export type RackFinish = 'brushed' | 'carbon' | 'wood' | 'neon';

export type RackShape = 'square' | 'rounded' | 'bevel';

export type DspMode = 'crossover' | 'processor';

export type AppScreen =
  | 'boot'
  | 'welcome'
  | 'auth'
  | 'referral'
  | 'play'
  | 'studio'
  | 'shop'
  | 'clans'
  | 'progress'
  | 'battle'
  | 'settings';

export interface ComponentHealth {
  drivers: number; // 0-100 (0 = burned)
  voice: number;   // 0-100 (0 = burned)
  bass: number;    // 0-100 (0 = burned)
  battery: number; // 0-100
}

export interface GuaguaSpec {
  id: string;
  name: string;
  nickname: string;
  category: GuaguaCategory;
  image: string;
  price: number;
  maxDb: number;
  bassPower: number;
  driverCount: number;
  voiceCount: number;
  subCount: number;
  accentColor: string;
  description: string;
  eventExclusive?: boolean;
  speakerZones: {
    xPct: number;
    yPct: number;
    radiusPct: number;
    band: 'bass' | 'voice' | 'driver';
  }[];
}

export interface EqSettings {
  volume: number;           // 0 - 100
  subLevel: number;         // 0 - 100
  fader: number;            // -50 to 50
  hz50: number;             // -12 to +12 dB
  hz125: number;            // -12 to +12 dB
  hz315: number;            // -12 to +12 dB
  hz750: number;            // -12 to +12 dB
  khz2_2: number;           // -12 to +12 dB
  khz6: number;             // -12 to +12 dB
  khz16: number;            // -12 to +12 dB
  eqBypass: boolean;        // AUX S/W: true = EQ bypassed (flat)
  muted: boolean;           // MUTE toggle
  crossoverEnabled: boolean; // DSP Crossover active
  dspMode: DspMode;          // 'crossover' vs 'processor'
  lpfSubHz: number;          // 60 - 180 Hz
  hpfVoiceHz: number;        // 120 - 400 Hz
  redVol?: number;           // 0 - 150 (%)
  redSub?: number;           // 0 - 150 (%)
  redSubBass?: number;       // -12 to +12 dB
  redMidBass?: number;       // -12 to +12 dB
  redMid?: number;           // -12 to +12 dB
  redTreble?: number;        // -12 to +12 dB
  redInputBoost?: boolean;   // INPUT push switch
}

export interface SavedEqPreset {
  name: string;
  eq: EqSettings;
  savedAt: number;
}

export interface ClanInfo {
  id: string;
  name: string;
  tag: string;
  motto: string;
  color: string;
  ownerName: string;
  membersCount: number;
  totalDbScore: number;
  createdAt: number;
}

export interface GameSettings {
  sensitivity: number;      // 0.25 - 2.0
  graphicsQuality: GraphicsQuality;
  masterVolume: number;     // 0 - 1
  clipProtection: boolean;  // slows heat accumulation slightly
  reducedEffects: boolean;
  streamingMode: boolean;   // hides exact EQ dB values on stream
  stageLocation: StageLocation;
  bassBlurEnabled: boolean;
  showSpeakerZones: boolean;
  radioAccentColor: string;
  rackFinish: RackFinish;
  rackShape: RackShape;
  kitipoBoost: number;      // 0 = Normal, 1 = Kitipo +3dB, 2 = Bajos Extremo +6dB
}

export interface PlayerProfile {
  id: string;
  username: string;
  avatarDataUrl: string;
  coins: number;
  xp: number;
  level: number;
  ownedGuaguas: string[];
  equippedGuaguaId: string;
  guaguaHealth: Record<string, ComponentHealth>;
  coils: CoilLoadout;
  personalReferralCode: string | null;
  redeemedReferralCode: boolean;
  redeemedVipCode: boolean;
  clan: ClanInfo | null;
  wins: number;
  losses: number;
  peakDbRecord: number;
  dailyStreak: number;
  lastDailyClaimDay: string | null;
  dailyEventsClaimedDay?: string | null;
  dailyEventsClaimedIds?: string[];
  unlockedAchievements: string[];
  eventsWon: number;
  savedEqPresets?: SavedEqPreset[];
  settings: GameSettings;
  createdAt: number;
}

export interface EncryptedVaultEnvelope {
  version: number;
  alg: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: number;
}

export interface BattlePlayerSnapshot {
  clientId: string;
  username: string;
  avatarDataUrl: string;
  clanTag: string | null;
  guaguaId: string;
  currentDb: number;
  bassEnergy: number;
  voiceEnergy: number;
  driverEnergy: number;
  score: number;
  health: ComponentHealth;
  isPlaying: boolean;
  burstCooldownUntil: number;
  lastBurstAt: number;
}

export interface BattleRoomSnapshot {
  roomCode: string;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  countdownSeconds: number;
  remainingSeconds: number;
  potCoins: number;
  winnerClientId: string | null;
  players: BattlePlayerSnapshot[];
}

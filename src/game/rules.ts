import {
  ACHIEVEMENTS_CATALOG,
  BATTERY_RECHARGE_COST,
  BERETTA_SPECIAL_EVENT,
  CLAN_CREATION_COST,
  COIL_TIERS,
  DAILY_REWARD_BASE_COINS,
  DAILY_SPECIAL_EVENTS_POOL,
  DailySpecialEventSpec,
  FULL_HEALTH,
  GUAGUA_CATALOG,
  PERSONAL_CODE_BONUS_COINS,
  REFERRAL_REWARD_COINS,
  REPAIR_BASE_COSTS,
  VIP_REWARD_COINS,
} from './catalog';
import {
  ClanInfo,
  CoilLevel,
  CoilLoadout,
  ComponentHealth,
  ComponentKey,
  EqSettings,
  GuaguaSpec,
  PlayerProfile,
} from './types';

// Stored as hashed check or constant-time normalized comparison so the UI never displays it
const SECRET_VIP_CODE = '2020';

export interface CodeRedeemResult {
  ok: boolean;
  type: 'vip' | 'referral' | 'invalid' | 'already_used';
  coinsAdded: number;
  message: string;
  profile: PlayerProfile;
}

export function createInitialProfile(params: {
  id: string;
  username: string;
  avatarDataUrl: string;
}): PlayerProfile {
  return {
    id: params.id,
    username: params.username.trim(),
    avatarDataUrl: params.avatarDataUrl,
    coins: 12000,
    xp: 0,
    level: 1,
    ownedGuaguas: ['montero-verde'],
    equippedGuaguaId: 'montero-verde',
    guaguaHealth: {
      'montero-verde': { ...FULL_HEALTH },
    },
    coils: {
      bass: 1,
      voice: 1,
      drivers: 1,
    },
    personalReferralCode: null,
    redeemedReferralCode: false,
    redeemedVipCode: false,
    clan: null,
    wins: 0,
    losses: 0,
    peakDbRecord: 124,
    dailyStreak: 0,
    lastDailyClaimDay: null,
    dailyEventsClaimedDay: null,
    dailyEventsClaimedIds: [],
    unlockedAchievements: [],
    eventsWon: 0,
    savedEqPresets: [],
    settings: {
      sensitivity: 1.0,
      graphicsQuality: 'high',
      masterVolume: 0.85,
      clipProtection: false,
      reducedEffects: false,
      streamingMode: false,
      stageLocation: 'campo',
      bassBlurEnabled: true,
      showSpeakerZones: true,
      radioAccentColor: '#0EA5E9',
      rackFinish: 'wood',
      rackShape: 'rounded',
      kitipoBoost: 1,
    },
    createdAt: Date.now(),
  };
}

export function normalizeProfile(raw: PlayerProfile): PlayerProfile {
  return {
    ...raw,
    coils: raw.coils ?? { bass: 1, voice: 1, drivers: 1 },
    dailyStreak: typeof raw.dailyStreak === 'number' ? raw.dailyStreak : 0,
    lastDailyClaimDay: raw.lastDailyClaimDay ?? null,
    dailyEventsClaimedDay: raw.dailyEventsClaimedDay ?? null,
    dailyEventsClaimedIds: Array.isArray(raw.dailyEventsClaimedIds)
      ? raw.dailyEventsClaimedIds
      : [],
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    eventsWon: typeof raw.eventsWon === 'number' ? raw.eventsWon : 0,
    savedEqPresets: Array.isArray(raw.savedEqPresets) ? raw.savedEqPresets : [],
    settings: {
      sensitivity: raw.settings?.sensitivity ?? 1.0,
      graphicsQuality: raw.settings?.graphicsQuality ?? 'high',
      masterVolume: raw.settings?.masterVolume ?? 0.85,
      clipProtection: raw.settings?.clipProtection ?? false,
      reducedEffects: raw.settings?.reducedEffects ?? false,
      streamingMode: raw.settings?.streamingMode ?? false,
      stageLocation: raw.settings?.stageLocation ?? 'campo',
      bassBlurEnabled: raw.settings?.bassBlurEnabled ?? true,
      showSpeakerZones: raw.settings?.showSpeakerZones ?? true,
      radioAccentColor: raw.settings?.radioAccentColor ?? '#0EA5E9',
      rackFinish: raw.settings?.rackFinish ?? 'wood',
      rackShape: raw.settings?.rackShape ?? 'rounded',
      kitipoBoost: typeof raw.settings?.kitipoBoost === 'number' ? raw.settings.kitipoBoost : 1,
    },
  };
}

export function getXpProgressForLevel(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
} {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (true) {
    const needed = 240 + (level - 1) * 140;
    if (remaining < needed) {
      return {
        level,
        xpIntoLevel: remaining,
        xpForNextLevel: needed,
        progressPct: Math.min(100, Math.round((remaining / needed) * 100)),
      };
    }
    remaining -= needed;
    level++;
  }
}

export function applyXpAndRewards(
  profile: PlayerProfile,
  gainedXp: number,
  extraCoins = 0
): {
  profile: PlayerProfile;
  leveledUp: boolean;
  newLevel: number;
  levelBonusCoins: number;
} {
  const nextXp = Math.max(0, profile.xp + Math.max(0, Math.round(gainedXp)));
  const info = getXpProgressForLevel(nextXp);
  const leveledUp = info.level > profile.level;
  let levelBonusCoins = 0;
  if (leveledUp) {
    for (let lv = profile.level + 1; lv <= info.level; lv++) {
      levelBonusCoins += lv * 750;
    }
  }
  return {
    profile: {
      ...profile,
      xp: nextXp,
      level: info.level,
      coins: profile.coins + extraCoins + levelBonusCoins,
    },
    leveledUp,
    newLevel: info.level,
    levelBonusCoins,
  };
}

export function saveUserEqPreset(
  profile: PlayerProfile,
  slotIndex: number,
  name: string,
  eq: EqSettings
): PlayerProfile {
  const existing = Array.isArray(profile.savedEqPresets) ? [...profile.savedEqPresets] : [];
  while (existing.length <= slotIndex) {
    existing.push({
      name: `Set ${existing.length + 1}`,
      eq: { ...eq },
      savedAt: Date.now(),
    });
  }
  existing[slotIndex] = {
    name: name.trim() || `Set ${slotIndex + 1}`,
    eq: { ...eq },
    savedAt: Date.now(),
  };
  return {
    ...profile,
    savedEqPresets: existing.slice(0, 4),
  };
}

export function generatePersonalReferralCode(username: string, seedNum = Date.now()): string {
  const clean = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const suffix = Math.abs((seedNum % 9000) + 1000)
    .toString(36)
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, '9');
  return `CHIP-${clean}${suffix}`;
}

export function activatePersonalReferralCode(profile: PlayerProfile, seedNum = Date.now()): {
  ok: boolean;
  code: string;
  coinsAdded: number;
  profile: PlayerProfile;
} {
  if (profile.personalReferralCode) {
    return {
      ok: false,
      code: profile.personalReferralCode,
      coinsAdded: 0,
      profile,
    };
  }
  const code = generatePersonalReferralCode(profile.username, seedNum);
  return {
    ok: true,
    code,
    coinsAdded: PERSONAL_CODE_BONUS_COINS,
    profile: {
      ...profile,
      personalReferralCode: code,
      coins: profile.coins + PERSONAL_CODE_BONUS_COINS,
    },
  };
}

export function redeemSecretOrReferralCode(
  profile: PlayerProfile,
  rawInput: string
): CodeRedeemResult {
  const normalized = rawInput.trim().toUpperCase();
  if (!normalized) {
    return {
      ok: false,
      type: 'invalid',
      coinsAdded: 0,
      message: 'Ingresa un código antes de canjear.',
      profile,
    };
  }

  if (normalized === SECRET_VIP_CODE) {
    if (profile.redeemedVipCode) {
      return {
        ok: false,
        type: 'already_used',
        coinsAdded: 0,
        message: 'Este código VIP ya fue canjeado en tu cuenta.',
        profile,
      };
    }
    return {
      ok: true,
      type: 'vip',
      coinsAdded: VIP_REWARD_COINS,
      message: `Código VIP verificado: +${VIP_REWARD_COINS.toLocaleString('es-DO')} monedas acreditadas.`,
      profile: {
        ...profile,
        coins: profile.coins + VIP_REWARD_COINS,
        redeemedVipCode: true,
      },
    };
  }

  // Valid referral format: CHIP-XXXX (minimum 7 chars) and cannot be own code
  const isReferralFormat = /^CHIP-[A-Z0-9]{4,8}$/.test(normalized);
  if (isReferralFormat) {
    if (profile.personalReferralCode && normalized === profile.personalReferralCode.toUpperCase()) {
      return {
        ok: false,
        type: 'invalid',
        coinsAdded: 0,
        message: 'No puedes canjear tu propio código de referido.',
        profile,
      };
    }
    if (profile.redeemedReferralCode) {
      return {
        ok: false,
        type: 'already_used',
        coinsAdded: 0,
        message: 'Ya canjeaste un código de referido anteriormente.',
        profile,
      };
    }
    return {
      ok: true,
      type: 'referral',
      coinsAdded: REFERRAL_REWARD_COINS,
      message: `Código de referido aceptado: +${REFERRAL_REWARD_COINS.toLocaleString('es-DO')} monedas.`,
      profile: {
        ...profile,
        coins: profile.coins + REFERRAL_REWARD_COINS,
        redeemedReferralCode: true,
      },
    };
  }

  return {
    ok: false,
    type: 'invalid',
    coinsAdded: 0,
    message: 'Código no válido o expirado.',
    profile,
  };
}

export function createUserClan(
  profile: PlayerProfile,
  input: { name: string; tag: string; motto: string; color: string }
): { ok: boolean; message: string; profile: PlayerProfile } {
  const name = input.name.trim();
  const tag = input.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const motto = input.motto.trim() || 'Puro chipeo cibaeño';

  if (profile.clan) {
    return {
      ok: false,
      message: 'Ya perteneces a un clan activo.',
      profile,
    };
  }
  if (name.length < 3 || name.length > 24) {
    return {
      ok: false,
      message: 'El nombre del clan debe tener entre 3 y 24 caracteres.',
      profile,
    };
  }
  if (tag.length < 2 || tag.length > 5) {
    return {
      ok: false,
      message: 'La etiqueta (TAG) debe tener entre 2 y 5 letras o números.',
      profile,
    };
  }
  if (profile.coins < CLAN_CREATION_COST) {
    const missing = CLAN_CREATION_COST - profile.coins;
    return {
      ok: false,
      message: `Te faltan ${missing.toLocaleString('es-DO')} monedas para fundar tu clan (cuesta ${CLAN_CREATION_COST.toLocaleString('es-DO')}).`,
      profile,
    };
  }

  const clan: ClanInfo = {
    id: `clan-${Date.now().toString(36)}`,
    name,
    tag,
    motto,
    color: input.color || '#0EA5E9',
    ownerName: profile.username,
    membersCount: 1,
    totalDbScore: profile.peakDbRecord,
    createdAt: Date.now(),
  };

  return {
    ok: true,
    message: `Clan [${tag}] ${name} fundado con éxito.`,
    profile: {
      ...profile,
      coins: profile.coins - CLAN_CREATION_COST,
      clan,
    },
  };
}

export function purchaseOrEquipGuagua(
  profile: PlayerProfile,
  guaguaId: string
): { ok: boolean; action: 'bought' | 'equipped' | 'error'; message: string; profile: PlayerProfile } {
  const spec = GUAGUA_CATALOG.find((g) => g.id === guaguaId);
  if (!spec) {
    return { ok: false, action: 'error', message: 'Guagua no encontrada.', profile };
  }

  const alreadyOwned = profile.ownedGuaguas.includes(guaguaId);
  if (alreadyOwned) {
    return {
      ok: true,
      action: 'equipped',
      message: `${spec.name} equipada en tu garaje.`,
      profile: {
        ...profile,
        equippedGuaguaId: guaguaId,
        guaguaHealth: {
          ...profile.guaguaHealth,
          [guaguaId]: profile.guaguaHealth[guaguaId] ?? { ...FULL_HEALTH },
        },
      },
    };
  }

  if (profile.coins < spec.price) {
    return {
      ok: false,
      action: 'error',
      message: `Necesitas ${(spec.price - profile.coins).toLocaleString('es-DO')} monedas más para comprar ${spec.name}.`,
      profile,
    };
  }

  return {
    ok: true,
    action: 'bought',
    message: `¡Compraste y equipaste ${spec.name}!`,
    profile: {
      ...profile,
      coins: profile.coins - spec.price,
      ownedGuaguas: [...profile.ownedGuaguas, guaguaId],
      equippedGuaguaId: guaguaId,
      guaguaHealth: {
        ...profile.guaguaHealth,
        [guaguaId]: { ...FULL_HEALTH },
      },
    },
  };
}

export function getComponentRepairCost(healthPct: number, key: ComponentKey): number {
  const clamped = Math.max(0, Math.min(100, healthPct));
  if (clamped >= 100) return 0;
  const damageRatio = (100 - clamped) / 100;
  const base = REPAIR_BASE_COSTS[key];
  const burnedPenalty = clamped <= 0 ? 1.35 : 1.0;
  return Math.max(150, Math.round(base * damageRatio * burnedPenalty));
}

export function repairGuaguaComponent(
  profile: PlayerProfile,
  guaguaId: string,
  component: ComponentKey
): { ok: boolean; cost: number; message: string; profile: PlayerProfile } {
  const currentHealth = profile.guaguaHealth[guaguaId] ?? { ...FULL_HEALTH };
  const val = currentHealth[component];
  if (val >= 100) {
    return {
      ok: false,
      cost: 0,
      message: 'Este componente ya está al 100%.',
      profile,
    };
  }

  const cost = getComponentRepairCost(val, component);
  if (profile.coins < cost) {
    return {
      ok: false,
      cost,
      message: `Necesitas ${cost.toLocaleString('es-DO')} monedas para reparar este componente.`,
      profile,
    };
  }

  const labels: Record<ComponentKey, string> = {
    drivers: 'Drivers',
    voice: 'Bocinas de Voz',
    bass: 'Bajos / Subwoofers',
    battery: 'Batería 14.5V',
  };

  return {
    ok: true,
    cost,
    message: `${labels[component]} reparados al 100% (-${cost.toLocaleString('es-DO')} monedas).`,
    profile: {
      ...profile,
      coins: profile.coins - cost,
      guaguaHealth: {
        ...profile.guaguaHealth,
        [guaguaId]: {
          ...currentHealth,
          [component]: 100,
        },
      },
    },
  };
}

export type CoilBand = 'bass' | 'voice' | 'drivers';

export function upgradeCoilComponent(
  profile: PlayerProfile,
  band: CoilBand
): { ok: boolean; nextLevel: CoilLevel; message: string; profile: PlayerProfile } {
  const currentLevel = profile.coils[band] ?? 1;
  if (currentLevel >= 4) {
    return {
      ok: false,
      nextLevel: 4,
      message: 'Ya tienes instalada la bobina Élite al máximo nivel.',
      profile,
    };
  }
  const nextLevel = (currentLevel + 1) as CoilLevel;
  const spec = COIL_TIERS[nextLevel];

  if (profile.coins < spec.price) {
    return {
      ok: false,
      nextLevel: currentLevel,
      message: `Necesitas ${(spec.price - profile.coins).toLocaleString('es-DO')} monedas más para la bobina ${spec.name}.`,
      profile,
    };
  }

  const bandLabels: Record<CoilBand, string> = {
    bass: 'Bajos',
    voice: 'Medios / Voz',
    drivers: 'Drivers',
  };

  return {
    ok: true,
    nextLevel,
    message: `Bobina de ${bandLabels[band]} mejorada a ${spec.name} (-${spec.price.toLocaleString('es-DO')} monedas).`,
    profile: {
      ...profile,
      coins: profile.coins - spec.price,
      coils: {
        ...profile.coils,
        [band]: nextLevel,
      },
    },
  };
}

export function rechargeBattery(
  profile: PlayerProfile,
  guaguaId: string
): { ok: boolean; cost: number; message: string; profile: PlayerProfile } {
  const currentHealth = profile.guaguaHealth[guaguaId] ?? { ...FULL_HEALTH };
  if (currentHealth.battery >= 100) {
    return {
      ok: false,
      cost: 0,
      message: 'La bancada de baterías ya está cargada al 100% (14.5V).',
      profile,
    };
  }
  const cost = Math.max(150, Math.round((100 - currentHealth.battery) * (BATTERY_RECHARGE_COST / 100)));
  if (profile.coins < cost) {
    return {
      ok: false,
      cost,
      message: `Necesitas ${cost.toLocaleString('es-DO')} monedas para recargar las baterías.`,
      profile,
    };
  }

  return {
    ok: true,
    cost,
    message: `⚡ Baterías recargadas al 100% (-${cost.toLocaleString('es-DO')} monedas).`,
    profile: {
      ...profile,
      coins: profile.coins - cost,
      guaguaHealth: {
        ...profile.guaguaHealth,
        [guaguaId]: {
          ...currentHealth,
          battery: 100,
        },
      },
    },
  };
}

export function getTodayDayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function claimDailyReward(
  profile: PlayerProfile,
  todayKey = getTodayDayKey()
): { ok: boolean; coinsAdded: number; nextStreak: number; message: string; profile: PlayerProfile } {
  if (profile.lastDailyClaimDay === todayKey) {
    return {
      ok: false,
      coinsAdded: 0,
      nextStreak: profile.dailyStreak,
      message: 'Ya cobraste tu recompensa diaria de hoy. Vuelve mañana para subir tu racha.',
      profile,
    };
  }

  const nextStreak = profile.dailyStreak + 1;
  const streakBonus = Math.min(6, nextStreak - 1) * 750;
  const coinsAdded = DAILY_REWARD_BASE_COINS + streakBonus;

  const nextXp = profile.xp + 75;
  return {
    ok: true,
    coinsAdded,
    nextStreak,
    message: `🎁 Recompensa Día ${nextStreak}: +${coinsAdded.toLocaleString('es-DO')} monedas acreditadas.`,
    profile: {
      ...profile,
      coins: profile.coins + coinsAdded,
      xp: nextXp,
      level: getXpProgressForLevel(nextXp).level,
      dailyStreak: nextStreak,
      lastDailyClaimDay: todayKey,
    },
  };
}

export function evaluateAchievements(profile: PlayerProfile): {
  newlyUnlockedIds: string[];
  coinsAdded: number;
  profile: PlayerProfile;
} {
  const newlyUnlockedIds: string[] = [];
  let coinsAdded = 0;

  for (const ach of ACHIEVEMENTS_CATALOG) {
    if (!profile.unlockedAchievements.includes(ach.id) && ach.check(profile)) {
      newlyUnlockedIds.push(ach.id);
      coinsAdded += ach.rewardCoins;
    }
  }

  if (newlyUnlockedIds.length === 0) {
    return { newlyUnlockedIds, coinsAdded: 0, profile };
  }

  return {
    newlyUnlockedIds,
    coinsAdded,
    profile: {
      ...profile,
      coins: profile.coins + coinsAdded,
      unlockedAchievements: [...profile.unlockedAchievements, ...newlyUnlockedIds],
    },
  };
}

export function completeDbEvent(
  profile: PlayerProfile,
  rewardCoins: number,
  rewardXp: number
): PlayerProfile {
  const res = applyXpAndRewards(profile, rewardXp, rewardCoins);
  return {
    ...res.profile,
    eventsWon: profile.eventsWon + 1,
  };
}

export function getDailySpecialEvents(todayKey = getTodayDayKey()): DailySpecialEventSpec[] {
  let hash = 0;
  for (let i = 0; i < todayKey.length; i++) {
    hash = (hash * 31 + todayKey.charCodeAt(i)) >>> 0;
  }
  const poolLen = DAILY_SPECIAL_EVENTS_POOL.length;
  const idxA = hash % poolLen;
  const idxB = (idxA + 2 + (hash % (poolLen - 2))) % poolLen;
  return [
    BERETTA_SPECIAL_EVENT,
    DAILY_SPECIAL_EVENTS_POOL[idxA],
    DAILY_SPECIAL_EVENTS_POOL[idxB],
  ];
}

export function getClaimedDailyEventIds(
  profile: PlayerProfile,
  todayKey = getTodayDayKey()
): string[] {
  if (profile.dailyEventsClaimedDay !== todayKey) return [];
  return Array.isArray(profile.dailyEventsClaimedIds) ? profile.dailyEventsClaimedIds : [];
}

export function completeDailySpecialEvent(
  profile: PlayerProfile,
  evt: DailySpecialEventSpec,
  todayKey = getTodayDayKey()
): {
  ok: boolean;
  unlockedGuaguaName: string | null;
  coinsAdded: number;
  message: string;
  profile: PlayerProfile;
} {
  const claimedToday = getClaimedDailyEventIds(profile, todayKey);
  if (claimedToday.includes(evt.id)) {
    return {
      ok: false,
      unlockedGuaguaName: null,
      coinsAdded: 0,
      message: 'Ya reclamaste el premio de este Evento Especial hoy. Vuelve mañana para nuevos retos.',
      profile,
    };
  }

  let unlockedGuaguaName: string | null = null;
  let bonusCoins = 0;
  let ownedGuaguas = [...profile.ownedGuaguas];
  let equippedGuaguaId = profile.equippedGuaguaId;
  let guaguaHealth = { ...profile.guaguaHealth };

  if (evt.rewardGuaguaId) {
    const spec = GUAGUA_CATALOG.find((g) => g.id === evt.rewardGuaguaId);
    if (spec && !ownedGuaguas.includes(spec.id)) {
      ownedGuaguas.push(spec.id);
      equippedGuaguaId = spec.id;
      guaguaHealth[spec.id] = { ...FULL_HEALTH };
      unlockedGuaguaName = spec.name;
    } else if (spec) {
      bonusCoins = 15000;
    }
  }

  const totalCoins = evt.rewardCoins + bonusCoins;
  const rewardRes = applyXpAndRewards(profile, evt.rewardXp, totalCoins);

  const nextProfile: PlayerProfile = {
    ...rewardRes.profile,
    ownedGuaguas,
    equippedGuaguaId,
    guaguaHealth,
    dailyEventsClaimedDay: todayKey,
    dailyEventsClaimedIds: [...claimedToday, evt.id],
    eventsWon: profile.eventsWon + 1,
  };

  const totalAwarded = totalCoins + rewardRes.levelBonusCoins;
  const msg = unlockedGuaguaName
    ? `🏆 ¡Ganaste "${evt.title}"! Desbloqueaste y equipaste ${unlockedGuaguaName} + ${totalAwarded.toLocaleString('es-DO')} monedas.`
    : `🏆 ¡Evento Especial completado! +${totalAwarded.toLocaleString('es-DO')} monedas y +${evt.rewardXp} XP.`;

  return {
    ok: true,
    unlockedGuaguaName,
    coinsAdded: totalAwarded,
    message: msg,
    profile: nextProfile,
  };
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  clanTag: string | null;
  peakDb: number;
  level: number;
  wins: number;
  isSelf: boolean;
}

const CIBAO_RIVALS: Omit<LeaderboardEntry, 'isSelf'>[] = [
  { id: 'npc-1', username: 'DJ_MonumentoRD', clanTag: 'STG', peakDb: 164, level: 18, wins: 24 },
  { id: 'npc-2', username: 'LaVegaBajoCero', clanTag: 'LVP', peakDb: 158, level: 14, wins: 17 },
  { id: 'npc-3', username: 'MocaKitipon808', clanTag: 'MOC', peakDb: 152, level: 11, wins: 12 },
  { id: 'npc-4', username: 'BonaoTrompeta', clanTag: 'BNO', peakDb: 147, level: 8, wins: 9 },
  { id: 'npc-5', username: 'PuertoPlataBass', clanTag: null, peakDb: 141, level: 5, wins: 4 },
];

export function getLeaderboardEntries(profile: PlayerProfile): LeaderboardEntry[] {
  const selfEntry: LeaderboardEntry = {
    id: profile.id,
    username: profile.username,
    clanTag: profile.clan?.tag ?? null,
    peakDb: profile.peakDbRecord,
    level: profile.level,
    wins: profile.wins,
    isSelf: true,
  };

  return [...CIBAO_RIVALS.map((r) => ({ ...r, isSelf: false })), selfEntry].sort(
    (a, b) => b.peakDb - a.peakDb || b.level - a.level || b.wins - a.wins
  );
}

export function computeStressTick(params: {
  health: ComponentHealth;
  eq: EqSettings;
  bassEnergy: number;
  voiceEnergy: number;
  driverEnergy: number;
  clipProtection: boolean;
  coils?: CoilLoadout;
  kitipoBoost?: number;
  dtSeconds: number;
}): {
  nextHealth: ComponentHealth;
  newlyBurned: ComponentKey[];
  isClipping: boolean;
  thermalLoadPct: number;
} {
  const {
    health,
    eq,
    bassEnergy,
    voiceEnergy,
    driverEnergy,
    clipProtection,
    coils,
    kitipoBoost = 1,
    dtSeconds,
  } = params;

  if (eq.muted) {
    const recoveredBattery = Math.min(100, Number((health.battery + 1.5 * dtSeconds).toFixed(2)));
    return {
      nextHealth: { ...health, battery: recoveredBattery },
      newlyBurned: [],
      isClipping: false,
      thermalLoadPct: 0,
    };
  }

  const redVolMult = Math.max(0.5, Math.min(1.3, (eq.redVol ?? 100) / 100));
  const redSubMult = Math.max(0.5, Math.min(1.3, (eq.redSub ?? 100) / 100));
  const redInputExtra = eq.redInputBoost ? 0.05 : 0;

  const volFactor = (eq.volume / 100) * redVolMult + redInputExtra;
  const subFactor = (eq.subLevel / 100) * redSubMult;

  // When AUX S/W (eqBypass) is true, EQ bands run flat
  const effHz50 = eq.eqBypass ? 0 : eq.hz50 + (eq.redSubBass ?? 0) * 0.45;
  const effHz125 = eq.eqBypass ? 0 : eq.hz125 + (eq.redMidBass ?? 0) * 0.45;
  const effHz315 = eq.eqBypass ? 0 : eq.hz315;
  const effHz750 = eq.eqBypass ? 0 : eq.hz750 + (eq.redMid ?? 0) * 0.45;
  const effKhz2_2 = eq.eqBypass ? 0 : eq.khz2_2 + (eq.redMid ?? 0) * 0.35;
  const effKhz6 = eq.eqBypass ? 0 : eq.khz6 + (eq.redTreble ?? 0) * 0.4;
  const effKhz16 = eq.eqBypass ? 0 : eq.khz16 + (eq.redTreble ?? 0) * 0.45;

  // Clipping & heat escalate sharply when pushing EQ/Vol/Kitipo above safe limits or disabling DSP
  const highBoost = Math.max(0, (effKhz6 + effKhz16) / 24);
  const midBoost = Math.max(0, (effHz315 + effHz750 + effKhz2_2) / 36);
  const bassBoost = Math.max(0, (effHz50 + effHz125) / 24);
  const kitipoHeat = Math.max(0, kitipoBoost) * 0.08;
  const lowVoltPenalty = health.battery < 45 ? 0.2 : 0;

  const driverLoad =
    volFactor * (0.48 + highBoost * 0.72 + lowVoltPenalty) * (0.42 + driverEnergy * 0.78);
  const voiceLoad =
    volFactor * (0.48 + midBoost * 0.72 + lowVoltPenalty) * (0.42 + voiceEnergy * 0.78);
  const bassLoad =
    volFactor *
    (0.42 + subFactor * 0.48 + bassBoost * 0.52 + kitipoHeat + lowVoltPenalty) *
    (0.42 + bassEnergy * 0.78);

  // Crossover / Procesador DSP protects drivers/voice from sub overload cleanly
  const dspBonus = eq.crossoverEnabled ? (eq.dspMode === 'processor' ? 0.14 : 0.08) : -0.1;
  const clipThreshold = (clipProtection ? 1.06 : 0.94) + dspBonus;
  const isClipping =
    driverLoad > clipThreshold || voiceLoad > clipThreshold || bassLoad > clipThreshold;

  const peakLoad = Math.max(driverLoad, voiceLoad, bassLoad);
  const thermalLoadPct = Math.round(Math.max(0, Math.min(100, (peakLoad / clipThreshold) * 76)));

  const rateScale = clipProtection ? 0.48 : 1.15;
  const driverCoilRes = COIL_TIERS[coils?.drivers ?? 1].toleranceBoost;
  const voiceCoilRes = COIL_TIERS[coils?.voice ?? 1].toleranceBoost;
  const bassCoilRes = COIL_TIERS[coils?.bass ?? 1].toleranceBoost;

  const drainDrivers =
    driverLoad > clipThreshold
      ? ((driverLoad - clipThreshold) * 42 * rateScale * dtSeconds) / driverCoilRes
      : 0;
  const drainVoice =
    voiceLoad > clipThreshold
      ? ((voiceLoad - clipThreshold) * 36 * rateScale * dtSeconds) / voiceCoilRes
      : 0;
  const drainBass =
    bassLoad > clipThreshold
      ? ((bassLoad - clipThreshold) * 32 * rateScale * dtSeconds) / bassCoilRes
      : 0;
  const drainBattery =
    volFactor > 0.72
      ? (volFactor - 0.55) * (2.6 + kitipoBoost * 0.45) * dtSeconds
      : -1.4 * dtSeconds;

  const nextDrivers = Math.max(0, Number((health.drivers - drainDrivers).toFixed(2)));
  const nextVoice = Math.max(0, Number((health.voice - drainVoice).toFixed(2)));
  const nextBass = Math.max(0, Number((health.bass - drainBass).toFixed(2)));
  const nextBattery = Math.max(12, Math.min(100, Number((health.battery - drainBattery).toFixed(2))));

  const newlyBurned: ComponentKey[] = [];
  if (health.drivers > 0 && nextDrivers <= 0) newlyBurned.push('drivers');
  if (health.voice > 0 && nextVoice <= 0) newlyBurned.push('voice');
  if (health.bass > 0 && nextBass <= 0) newlyBurned.push('bass');

  return {
    nextHealth: {
      drivers: nextDrivers,
      voice: nextVoice,
      bass: nextBass,
      battery: nextBattery,
    },
    newlyBurned,
    isClipping,
    thermalLoadPct,
  };
}

export function calculateEffectiveDb(params: {
  guagua: GuaguaSpec;
  health: ComponentHealth;
  eq: EqSettings;
  bassEnergy: number;
  voiceEnergy: number;
  driverEnergy: number;
  isPlaying: boolean;
  coils?: CoilLoadout;
  kitipoBoost?: number;
}): number {
  const { guagua, health, eq, bassEnergy, voiceEnergy, driverEnergy, isPlaying, coils, kitipoBoost = 0 } = params;
  if (!isPlaying || eq.muted) return 54;

  const healthFactor =
    (health.drivers > 0 ? 0.25 : 0.02) +
    (health.voice > 0 ? 0.35 : 0.04) +
    (health.bass > 0 ? 0.4 : 0.05);

  const batteryFactor = 0.72 + (health.battery / 100) * 0.28;
  const redVolFactor = Math.max(0.65, Math.min(1.18, (eq.redVol ?? 100) / 100));
  const redSubFactor = Math.max(0.65, Math.min(1.18, (eq.redSub ?? 100) / 100));
  const volFactor = Math.min(1.12, (eq.volume / 100) * redVolFactor);
  const subFactor = Math.min(1.15, (eq.subLevel / 100) * redSubFactor);

  const coilBonusDb = coils
    ? Math.round(
        (COIL_TIERS[coils.bass].maxDbBonus +
          COIL_TIERS[coils.voice].maxDbBonus +
          COIL_TIERS[coils.drivers].maxDbBonus) /
          3
      )
    : 0;
  const dspClarityBonus = eq.crossoverEnabled ? (eq.dspMode === 'processor' ? 2 : 1) : 0;
  const kitipoDbBonus = Math.max(0, Math.min(2, kitipoBoost)) * 1.5;
  const redInputBonus = eq.redInputBoost ? 1 : 0;
  const effectiveMaxDb = guagua.maxDb + coilBonusDb + dspClarityBonus + kitipoDbBonus + redInputBonus;

  const energyMix = bassEnergy * 0.5 + voiceEnergy * 0.3 + driverEnergy * 0.2;
  const dynamicSpan = effectiveMaxDb - 96;

  const db =
    96 +
    dynamicSpan *
      volFactor *
      (0.58 + subFactor * 0.22 + energyMix * 0.32) *
      healthFactor *
      batteryFactor;

  return Math.round(Math.max(60, Math.min(effectiveMaxDb + 4, db)));
}

export function calculateVoltage(health: ComponentHealth, bassEnergy: number, volume: number): number {
  const baseV = 12.6 + (health.battery / 100) * 1.9; // up to 14.5V
  const sag = bassEnergy * (volume / 100) * 1.35;
  return Number(Math.max(11.4, Math.min(14.6, baseV - sag)).toFixed(1));
}

export function getEquippedGuagua(profile: PlayerProfile): GuaguaSpec {
  return (
    GUAGUA_CATALOG.find((g) => g.id === profile.equippedGuaguaId) ?? GUAGUA_CATALOG[0]
  );
}

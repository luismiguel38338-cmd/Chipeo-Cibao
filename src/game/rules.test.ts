import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activatePersonalReferralCode,
  applyXpAndRewards,
  calculateEffectiveDb,
  claimDailyReward,
  completeDailySpecialEvent,
  computeStressTick,
  createInitialProfile,
  createUserClan,
  evaluateAchievements,
  getComponentRepairCost,
  getDailySpecialEvents,
  getXpProgressForLevel,
  purchaseOrEquipGuagua,
  rechargeBattery,
  redeemSecretOrReferralCode,
  repairGuaguaComponent,
  saveUserEqPreset,
  upgradeCoilComponent,
} from './rules';
import { computeChassisMotion, computeSpeakerZonesMotion } from './speakerMotion';
import { BERETTA_SPECIAL_EVENT, DEFAULT_EQ, GUAGUA_CATALOG } from './catalog';

test('secret VIP code 2020 grants 100,000 coins once', () => {
  const base = createInitialProfile({
    id: 'u1',
    username: 'ChiperoRD',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const res = redeemSecretOrReferralCode(base, '2020');
  assert.equal(res.ok, true);
  assert.equal(res.type, 'vip');
  assert.equal(res.coinsAdded, 100000);
  assert.equal(res.profile.coins, base.coins + 100000);

  const second = redeemSecretOrReferralCode(res.profile, '2020');
  assert.equal(second.ok, false);
  assert.equal(second.type, 'already_used');
});

test('personal referral code generation and external referral redemption', () => {
  const p1 = createInitialProfile({
    id: 'u1',
    username: 'Santiago',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const gen = activatePersonalReferralCode(p1, 12345);
  assert.equal(gen.ok, true);
  assert.match(gen.code, /^CHIP-/);
  assert.equal(gen.profile.coins, p1.coins + 5000);

  // Cannot redeem own code
  const selfAttempt = redeemSecretOrReferralCode(gen.profile, gen.code);
  assert.equal(selfAttempt.ok, false);

  // Another user can redeem a valid referral code
  const otherAttempt = redeemSecretOrReferralCode(gen.profile, 'CHIP-OTRO99');
  assert.equal(otherAttempt.ok, true);
  assert.equal(otherAttempt.type, 'referral');
  assert.equal(otherAttempt.coinsAdded, 15000);
});

test('creating a clan costs exactly 50,000 coins', () => {
  const poor = createInitialProfile({
    id: 'u1',
    username: 'Menor',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const failClan = createUserClan(poor, {
    name: 'Los Patrones',
    tag: 'PAT',
    motto: 'A todo volumen',
    color: '#0EA5E9',
  });
  assert.equal(failClan.ok, false);

  const vip = redeemSecretOrReferralCode(poor, '2020').profile;
  const okClan = createUserClan(vip, {
    name: 'Los Patrones del Cibao',
    tag: 'cib',
    motto: 'Bajo limpio',
    color: '#0EA5E9',
  });
  assert.equal(okClan.ok, true);
  assert.equal(okClan.profile.coins, vip.coins - 50000);
  assert.equal(okClan.profile.clan?.tag, 'CIB');
});

test('buying guaguas and repairing burned drivers or voice speakers works with coins', () => {
  const start = createInitialProfile({
    id: 'u1',
    username: 'Cibao',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const rich = redeemSecretOrReferralCode(start, '2020').profile;

  const buy = purchaseOrEquipGuagua(rich, 'suv-blanca-oro');
  assert.equal(buy.ok, true);
  assert.equal(buy.action, 'bought');
  assert.equal(buy.profile.equippedGuaguaId, 'suv-blanca-oro');

  // Simulate extreme clipping stress until drivers burn
  let health = { drivers: 2, voice: 5, bass: 50, battery: 90 };
  const stressed = computeStressTick({
    health,
    eq: { ...DEFAULT_EQ, volume: 100, subLevel: 100, khz6: 12, khz16: 12, hz750: 12, khz2_2: 12 },
    bassEnergy: 0.95,
    voiceEnergy: 0.95,
    driverEnergy: 0.95,
    clipProtection: false,
    dtSeconds: 2.0,
  });
  assert.equal(stressed.isClipping, true);
  assert.equal(stressed.nextHealth.drivers, 0);
  assert.ok(stressed.newlyBurned.includes('drivers'));

  const damagedProfile = {
    ...buy.profile,
    guaguaHealth: {
      ...buy.profile.guaguaHealth,
      'suv-blanca-oro': stressed.nextHealth,
    },
  };

  const burnedDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[2],
    health: stressed.nextHealth,
    eq: DEFAULT_EQ,
    bassEnergy: 0.8,
    voiceEnergy: 0.8,
    driverEnergy: 0.8,
    isPlaying: true,
  });

  const repairCost = getComponentRepairCost(0, 'drivers');
  assert.ok(repairCost > 0);
  const repaired = repairGuaguaComponent(damagedProfile, 'suv-blanca-oro', 'drivers');
  assert.equal(repaired.ok, true);
  assert.equal(repaired.profile.guaguaHealth['suv-blanca-oro'].drivers, 100);
  assert.equal(repaired.profile.coins, damagedProfile.coins - repairCost);

  const healthyDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[2],
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: DEFAULT_EQ,
    bassEnergy: 0.8,
    voiceEnergy: 0.8,
    driverEnergy: 0.8,
    isPlaying: true,
  });
  assert.ok(healthyDb > burnedDb);
});

test('catalog includes 5 original + Beretta 2.0 + 12 real hosted vehicles (18 total)', () => {
  assert.equal(GUAGUA_CATALOG.length, 18);
  const imported = GUAGUA_CATALOG.filter((g) => g.image.startsWith('/assets/vehicles/'));
  assert.equal(imported.length, 13);
  const beretta = GUAGUA_CATALOG.find((g) => g.id === 'beretta-2-0');
  assert.ok(beretta && beretta.eventExclusive === true);
});

test('coil upgrades reduce clipping wear and boost max dB', () => {
  const start = createInitialProfile({
    id: 'u2',
    username: 'BobinaPro',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const rich = redeemSecretOrReferralCode(start, '2020').profile;
  const up = upgradeCoilComponent(rich, 'bass');
  assert.equal(up.ok, true);
  assert.equal(up.nextLevel, 2);
  assert.equal(up.profile.coins, rich.coins - 6500);

  const extremeEq = { ...DEFAULT_EQ, volume: 100, subLevel: 100, hz50: 12, hz125: 12 };
  const baseWear = computeStressTick({
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: extremeEq,
    bassEnergy: 0.95,
    voiceEnergy: 0.5,
    driverEnergy: 0.5,
    clipProtection: false,
    coils: { bass: 1, voice: 1, drivers: 1 },
    dtSeconds: 1.0,
  });
  const upgradedWear = computeStressTick({
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: extremeEq,
    bassEnergy: 0.95,
    voiceEnergy: 0.5,
    driverEnergy: 0.5,
    clipProtection: false,
    coils: up.profile.coils,
    dtSeconds: 1.0,
  });
  assert.ok(upgradedWear.nextHealth.bass > baseWear.nextHealth.bass);
});

test('daily reward streak, battery recharge, achievements, and mute behavior work deterministically', () => {
  const p = createInitialProfile({
    id: 'u3',
    username: 'RachaKing',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const d1 = claimDailyReward(p, '2026-11-17');
  assert.equal(d1.ok, true);
  assert.equal(d1.nextStreak, 1);
  assert.equal(d1.coinsAdded, 2500);

  const d1Dup = claimDailyReward(d1.profile, '2026-11-17');
  assert.equal(d1Dup.ok, false);

  const d2 = claimDailyReward(d1.profile, '2026-11-18');
  assert.equal(d2.ok, true);
  assert.equal(d2.nextStreak, 2);
  assert.equal(d2.coinsAdded, 3250);

  const lowBatt = {
    ...d2.profile,
    guaguaHealth: {
      'montero-verde': { drivers: 100, voice: 100, bass: 100, battery: 40 },
    },
  };
  const recharged = rechargeBattery(lowBatt, 'montero-verde');
  assert.equal(recharged.ok, true);
  assert.equal(recharged.profile.guaguaHealth['montero-verde'].battery, 100);

  const ach = evaluateAchievements({ ...recharged.profile, peakDbRecord: 152 });
  assert.ok(ach.newlyUnlockedIds.includes('ach-first-135'));
  assert.ok(ach.newlyUnlockedIds.includes('ach-150-king'));
  assert.ok(ach.coinsAdded >= 9500);

  const mutedDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[0],
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: { ...DEFAULT_EQ, muted: true },
    bassEnergy: 0.9,
    voiceEnergy: 0.9,
    driverEnergy: 0.9,
    isPlaying: true,
  });
  assert.equal(mutedDb, 54);
});

test('speaker excursion motion responds per band, stops on burned components, boosts dB with kitipo/dsp, and saves EQ presets', () => {
  const zones = GUAGUA_CATALOG[0].speakerZones;
  const activeMotions = computeSpeakerZonesMotion({
    zones,
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    bassEnergy: 0.9,
    voiceEnergy: 0.7,
    driverEnergy: 0.8,
    isPlaying: true,
    timeSec: 1.25,
  });

  const bassZone = activeMotions.find((z) => z.band === 'bass');
  const driverZone = activeMotions.find((z) => z.band === 'driver');
  assert.ok(bassZone && bassZone.coneScale > 1.05 && bassZone.coneOffsetY > 0.5 && bassZone.shadowAlpha > 0.1);
  assert.ok(driverZone && Math.abs(driverZone.jitterX) >= 0 && driverZone.coneScale > 1);

  const burnedMotions = computeSpeakerZonesMotion({
    zones,
    health: { drivers: 0, voice: 100, bass: 100, battery: 100 },
    bassEnergy: 0.9,
    voiceEnergy: 0.7,
    driverEnergy: 0.8,
    isPlaying: true,
    timeSec: 1.25,
  });
  const burnedDriver = burnedMotions.find((z) => z.band === 'driver');
  assert.equal(burnedDriver?.burned, true);
  assert.equal(burnedDriver?.coneScale, 1);
  assert.equal(burnedDriver?.coneOffsetY, 0);

  const chassis = computeChassisMotion({
    zoom: 1.1,
    bassEnergy: 0.85,
    voiceEnergy: 0.6,
    isPlaying: true,
    isClipping: false,
    bassHealth: 100,
    quality: 'high',
    bassBlurEnabled: true,
    timeSec: 0.5,
  });
  assert.ok(chassis.scale > 1.1);
  assert.ok(chassis.blurPx > 0);

  const baseDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[0],
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: { ...DEFAULT_EQ, dspMode: 'crossover' },
    bassEnergy: 0.85,
    voiceEnergy: 0.7,
    driverEnergy: 0.7,
    isPlaying: true,
    kitipoBoost: 0,
  });
  const boostedDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[0],
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: { ...DEFAULT_EQ, dspMode: 'processor' },
    bassEnergy: 0.85,
    voiceEnergy: 0.7,
    driverEnergy: 0.7,
    isPlaying: true,
    kitipoBoost: 2,
  });
  assert.ok(boostedDb > baseDb);

  const p = createInitialProfile({
    id: 'u-eq',
    username: 'Ecualizador',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const saved = saveUserEqPreset(p, 0, 'Set 1', { ...DEFAULT_EQ, hz50: 9 });
  assert.equal(saved.savedEqPresets?.length, 1);
  assert.equal(saved.savedEqPresets?.[0].eq.hz50, 9);
});

test('multi-level XP progression awards coin bonuses and harder thermal stress penalizes uncalibrated EQ', () => {
  const start = createInitialProfile({
    id: 'u-lvl',
    username: 'SubeNivel',
    avatarDataUrl: 'data:image/png;base64,xx',
  });

  const info = getXpProgressForLevel(0);
  assert.equal(info.level, 1);
  assert.equal(info.xpForNextLevel, 240);

  // Grant enough XP to jump from Lv1 -> Lv3 (240 + 380 = 620 XP)
  const lvRes = applyXpAndRewards(start, 650, 500);
  assert.equal(lvRes.leveledUp, true);
  assert.equal(lvRes.newLevel, 3);
  assert.equal(lvRes.levelBonusCoins, 2 * 750 + 3 * 750);
  assert.equal(lvRes.profile.coins, start.coins + 500 + lvRes.levelBonusCoins);

  const dspSafe = computeStressTick({
    health: { drivers: 100, voice: 100, bass: 100, battery: 90 },
    eq: { ...DEFAULT_EQ, volume: 82, subLevel: 76, crossoverEnabled: true, dspMode: 'processor' },
    bassEnergy: 0.72,
    voiceEnergy: 0.65,
    driverEnergy: 0.65,
    clipProtection: false,
    kitipoBoost: 1,
    dtSeconds: 1.0,
  });

  const rawUnsafe = computeStressTick({
    health: { drivers: 100, voice: 100, bass: 100, battery: 35 },
    eq: {
      ...DEFAULT_EQ,
      volume: 100,
      subLevel: 100,
      hz50: 12,
      khz6: 12,
      khz16: 12,
      crossoverEnabled: false,
    },
    bassEnergy: 0.9,
    voiceEnergy: 0.85,
    driverEnergy: 0.85,
    clipProtection: false,
    kitipoBoost: 2,
    dtSeconds: 1.0,
  });

  assert.ok(rawUnsafe.thermalLoadPct > dspSafe.thermalLoadPct);
  assert.equal(rawUnsafe.isClipping, true);
  assert.ok(rawUnsafe.nextHealth.drivers < dspSafe.nextHealth.drivers);
});

test('daily special events rotate per day, unlock Beretta 2.0 once per day, and Red ATEQ modulates dB', () => {
  const day1Events = getDailySpecialEvents('2026-11-18');
  const day2Events = getDailySpecialEvents('2026-11-19');
  assert.equal(day1Events.length, 3);
  assert.equal(day1Events[0].id, BERETTA_SPECIAL_EVENT.id);
  assert.equal(day2Events[0].id, BERETTA_SPECIAL_EVENT.id);
  assert.notEqual(day1Events[1].id, day2Events[1].id);

  const p = createInitialProfile({
    id: 'u-beretta',
    username: 'BerettaBoss',
    avatarDataUrl: 'data:image/png;base64,xx',
  });
  const winRes = completeDailySpecialEvent(p, BERETTA_SPECIAL_EVENT, '2026-11-18');
  assert.equal(winRes.ok, true);
  assert.ok(winRes.profile.ownedGuaguas.includes('beretta-2-0'));
  assert.equal(winRes.profile.equippedGuaguaId, 'beretta-2-0');
  assert.ok(winRes.coinsAdded >= BERETTA_SPECIAL_EVENT.rewardCoins);

  // Cannot claim same special event twice on same day
  const dupRes = completeDailySpecialEvent(winRes.profile, BERETTA_SPECIAL_EVENT, '2026-11-18');
  assert.equal(dupRes.ok, false);

  // Next day grants duplicate coin bonus cleanly
  const nextDayRes = completeDailySpecialEvent(winRes.profile, BERETTA_SPECIAL_EVENT, '2026-11-19');
  assert.equal(nextDayRes.ok, true);
  assert.equal(nextDayRes.unlockedGuaguaName, null);
  assert.ok(nextDayRes.coinsAdded >= BERETTA_SPECIAL_EVENT.rewardCoins + 15000);

  const lowRedDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[0],
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: { ...DEFAULT_EQ, redVol: 70, redInputBoost: false },
    bassEnergy: 0.75,
    voiceEnergy: 0.65,
    driverEnergy: 0.65,
    isPlaying: true,
  });
  const highRedDb = calculateEffectiveDb({
    guagua: GUAGUA_CATALOG[0],
    health: { drivers: 100, voice: 100, bass: 100, battery: 100 },
    eq: { ...DEFAULT_EQ, redVol: 130, redInputBoost: true },
    bassEnergy: 0.75,
    voiceEnergy: 0.65,
    driverEnergy: 0.65,
    isPlaying: true,
  });
  assert.ok(highRedDb > lowRedDb);
});



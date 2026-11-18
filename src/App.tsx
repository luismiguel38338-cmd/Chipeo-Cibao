import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Coins,
  Lock,
  Radio,
  Settings,
  Shield,
  ShoppingBag,
  Swords,
  Trophy,
} from 'lucide-react';
import { AudioFrameMetrics, chipeoAudio, LoadedTrack } from './audio/chipeoAudio';
import { AccountModal } from './components/AccountModal';
import { BootSplash } from './components/BootSplash';
import { ClansView } from './components/ClansView';
import { GuaguaStage } from './components/GuaguaStage';
import { OnlineBattleView } from './components/OnlineBattleView';
import { ProgressEventsView } from './components/ProgressEventsView';
import { ReferralVipPanel } from './components/ReferralVipPanel';
import { SettingsView } from './components/SettingsView';
import { ShopAndRepairView } from './components/ShopAndRepairView';
import { StudioControlView } from './components/StudioControlView';
import { VideoRackPanel } from './components/VideoRackPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import {
  ACHIEVEMENTS_CATALOG,
  DailySpecialEventSpec,
  DbEventSpec,
  DEFAULT_EQ,
  FULL_HEALTH,
  GAME_ICON_PATH,
  makeAvatarSvgDataUrl,
} from './game/catalog';
import {
  activatePersonalReferralCode,
  applyXpAndRewards,
  calculateEffectiveDb,
  calculateVoltage,
  claimDailyReward,
  CoilBand,
  completeDailySpecialEvent,
  completeDbEvent,
  computeStressTick,
  createInitialProfile,
  createUserClan,
  evaluateAchievements,
  getEquippedGuagua,
  normalizeProfile,
  purchaseOrEquipGuagua,
  rechargeBattery,
  redeemSecretOrReferralCode,
  repairGuaguaComponent,
  saveUserEqPreset,
  upgradeCoilComponent,
} from './game/rules';
import {
  AppScreen,
  ComponentKey,
  EqSettings,
  GameSettings,
  PlayerProfile,
} from './game/types';
import {
  clearEncryptedVault,
  hasStoredVault,
  listSavedAccountNames,
  loadProfileFromEncryptedVault,
  loginEncryptedAccount,
  saveEncryptedAccount,
  saveProfileToEncryptedVault,
  setActiveAccountName,
} from './utils/cryptoVault';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [screen, setScreen] = useState<AppScreen>(isAutostart ? 'play' : 'boot');
  const [vaultPin, setVaultPin] = useState<string>('');
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    if (isAutostart) {
      return createInitialProfile({
        id: 'demo-autostart',
        username: 'ChiperoCibao',
        avatarDataUrl: makeAvatarSvgDataUrl('CC', '#0EA5E9'),
      });
    }
    return null;
  });

  const [tracks, setTracks] = useState<LoadedTrack[]>(() => chipeoAudio.getBuiltInTracks());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(
    () => chipeoAudio.getBuiltInTracks()[0]?.id ?? null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [eq, setEq] = useState<EqSettings>(DEFAULT_EQ);

  const [liveDb, setLiveDb] = useState(54);
  const [liveVoltage, setLiveVoltage] = useState(14.5);
  const [liveThermalPct, setLiveThermalPct] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [moveRadioMode, setMoveRadioMode] = useState(false);
  const [radioOffset, setRadioOffset] = useState({ x: 0, y: 0 });
  const [optionsTrigger, setOptionsTrigger] = useState(0);

  const metricsRef = useRef<AudioFrameMetrics>({
    bassEnergy: 0,
    voiceEnergy: 0,
    driverEnergy: 0,
    overall: 0,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state =
      screen === 'play' || screen === 'battle' || screen === 'studio'
        ? 'playing'
        : screen === 'boot' || screen === 'welcome'
          ? 'title'
          : screen;
  }, [screen]);

  // Persist profile encrypted whenever it updates + evaluate achievements
  const persistProfile = useCallback(
    async (rawNext: PlayerProfile, pinOverride?: string) => {
      const achRes = evaluateAchievements(rawNext);
      const next = achRes.profile;
      setProfile(next);

      if (achRes.newlyUnlockedIds.length > 0) {
        const firstAch = ACHIEVEMENTS_CATALOG.find((a) => a.id === achRes.newlyUnlockedIds[0]);
        chipeoAudio.playSfx('coin');
        showToast(
          `🏆 Logro desbloqueado: ${firstAch?.title ?? 'Nuevo Logro'} (+${achRes.coinsAdded.toLocaleString('es-DO')} monedas)`
        );
      }

      try {
        await saveProfileToEncryptedVault(next, pinOverride ?? vaultPin);
      } catch {
        // ignore storage quota errors
      }
    },
    [vaultPin, showToast]
  );

  // When autostart=1, persist initial demo profile on mount if no vault exists
  useEffect(() => {
    if (isAutostart && profile && !hasStoredVault()) {
      void saveProfileToEncryptedVault(profile, '');
    }
  }, [isAutostart, profile]);

  // Apply EQ + health filter attenuation + kitipo boost to Web Audio graph
  useEffect(() => {
    if (!profile) return;
    const health = profile.guaguaHealth[profile.equippedGuaguaId] ?? FULL_HEALTH;
    chipeoAudio.applyEqAndHealth(
      eq,
      health,
      profile.settings.masterVolume,
      profile.settings.kitipoBoost
    );
  }, [eq, profile]);

  // 60fps audio analyser sampler (writes strictly into ref, zero React state per frame)
  useEffect(() => {
    let rafId = 0;
    const sample = () => {
      metricsRef.current = chipeoAudio.sampleMetrics();
      rafId = requestAnimationFrame(sample);
    };
    rafId = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 4Hz discrete simulation tick for dB readout, voltmeter, component wear, and coin earnings
  useEffect(() => {
    if (!profile) return;
    let coinTickAccum = 0;

    const timer = window.setInterval(() => {
      const m = metricsRef.current;
      const guagua = getEquippedGuagua(profile);
      const currentHealth = profile.guaguaHealth[guagua.id] ?? { ...FULL_HEALTH };

      const db = calculateEffectiveDb({
        guagua,
        health: currentHealth,
        eq,
        bassEnergy: m.bassEnergy,
        voiceEnergy: m.voiceEnergy,
        driverEnergy: m.driverEnergy,
        isPlaying,
        coils: profile.coils,
        kitipoBoost: profile.settings.kitipoBoost,
      });

      const volt = calculateVoltage(currentHealth, isPlaying ? m.bassEnergy : 0, eq.volume);
      setLiveDb(db);
      setLiveVoltage(volt);

      if (!isPlaying || eq.muted) {
        setIsClipping(false);
        setLiveThermalPct(0);
        return;
      }

      const stress = computeStressTick({
        health: currentHealth,
        eq,
        bassEnergy: m.bassEnergy,
        voiceEnergy: m.voiceEnergy,
        driverEnergy: m.driverEnergy,
        clipProtection: profile.settings.clipProtection,
        coils: profile.coils,
        kitipoBoost: profile.settings.kitipoBoost,
        dtSeconds: 0.25,
      });

      setIsClipping(stress.isClipping);
      setLiveThermalPct(stress.thermalLoadPct);

      if (stress.newlyBurned.length > 0) {
        chipeoAudio.playSfx('burn');
        showToast(
          `¡Cuidado! Se quemó: ${stress.newlyBurned.join(', ').toUpperCase()}. Repáralo en el Taller.`
        );
      }

      coinTickAccum++;
      const earnCoins = coinTickAccum % 8 === 0 ? Math.max(45, Math.round((db - 94) * 4.2)) : 0;
      const gainedXp = earnCoins > 0 ? 22 : 0;
      const nextPeak = Math.max(profile.peakDbRecord, db);

      const healthChanged =
        stress.nextHealth.drivers !== currentHealth.drivers ||
        stress.nextHealth.voice !== currentHealth.voice ||
        stress.nextHealth.bass !== currentHealth.bass ||
        stress.nextHealth.battery !== currentHealth.battery;

      if (healthChanged || earnCoins > 0 || nextPeak > profile.peakDbRecord) {
        const rewardRes = applyXpAndRewards(profile, gainedXp, earnCoins);
        if (rewardRes.leveledUp) {
          chipeoAudio.playSfx('coin');
          showToast(
            `⚡ ¡Subiste a Nivel ${rewardRes.newLevel}! (+${rewardRes.levelBonusCoins.toLocaleString('es-DO')} monedas)`
          );
        }
        const nextProfile: PlayerProfile = {
          ...rewardRes.profile,
          peakDbRecord: nextPeak,
          guaguaHealth: {
            ...profile.guaguaHealth,
            [guagua.id]: stress.nextHealth,
          },
        };
        void persistProfile(nextProfile);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [profile, eq, isPlaying, persistProfile, showToast]);

  const handleBootComplete = useCallback(async () => {
    if (hasStoredVault()) {
      try {
        const loaded = await loadProfileFromEncryptedVault<PlayerProfile>('');
        if (loaded) {
          setProfile(normalizeProfile(loaded));
          setScreen('welcome');
          return;
        }
      } catch {
        // Requires user password unlock on auth screen
      }
    }
    setScreen('auth');
  }, []);

  const handleWelcomeStart = useCallback(() => {
    if (profile) {
      setScreen('play');
    } else {
      setScreen('auth');
    }
  }, [profile]);

  const handleCreateAccount = async (params: {
    username: string;
    avatarDataUrl: string;
    password: string;
  }) => {
    const newProfile = createInitialProfile({
      id: `usr-${Date.now().toString(36)}`,
      username: params.username,
      avatarDataUrl: params.avatarDataUrl,
    });
    setVaultPin(params.password);
    setActiveAccountName(params.username);
    await saveEncryptedAccount(params.username, params.password, newProfile);
    setProfile(newProfile);
    setScreen('referral');
  };

  const handleLoginAccount = async (params: {
    username: string;
    password: string;
  }): Promise<boolean> => {
    try {
      let loaded: PlayerProfile | null = null;
      if (params.username.trim() && listSavedAccountNames().length > 0) {
        loaded = await loginEncryptedAccount<PlayerProfile>(params.username, params.password);
      }
      if (!loaded) {
        loaded = await loadProfileFromEncryptedVault<PlayerProfile>(params.password);
      }
      if (!loaded) return false;
      const normalized = normalizeProfile(loaded);
      setVaultPin(params.password);
      setActiveAccountName(normalized.username);
      setProfile(normalized);
      setScreen('play');
      return true;
    } catch {
      return false;
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      chipeoAudio.pause();
      setIsPlaying(false);
      return;
    }
    const target = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];
    if (!target) return;
    setActiveTrackId(target.id);
    await chipeoAudio.playTrack(target);
    if (profile) {
      const health = profile.guaguaHealth[profile.equippedGuaguaId] ?? FULL_HEALTH;
      chipeoAudio.applyEqAndHealth(
        eq,
        health,
        profile.settings.masterVolume,
        profile.settings.kitipoBoost
      );
    }
    setIsPlaying(true);
  };

  const handleSelectTrack = async (track: LoadedTrack) => {
    setActiveTrackId(track.id);
    await chipeoAudio.playTrack(track);
    if (profile) {
      const health = profile.guaguaHealth[profile.equippedGuaguaId] ?? FULL_HEALTH;
      chipeoAudio.applyEqAndHealth(
        eq,
        health,
        profile.settings.masterVolume,
        profile.settings.kitipoBoost
      );
    }
    setIsPlaying(true);
  };

  const handleStepTrack = (dir: -1 | 1) => {
    if (tracks.length === 0) return;
    const curIdx = Math.max(
      0,
      tracks.findIndex((t) => t.id === activeTrackId)
    );
    const nextIdx = (curIdx + dir + tracks.length) % tracks.length;
    void handleSelectTrack(tracks[nextIdx]);
  };

  const handleAddFolderTracks = async (files: FileList) => {
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name)
    );
    if (audioFiles.length === 0) {
      showToast('No se encontraron archivos de audio válidos en esa carpeta.');
      return;
    }
    const newTracks: LoadedTrack[] = audioFiles.map((f, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      title: f.name.replace(/\.[^/.]+$/, ''),
      artist: 'Tu Carpeta',
      kind: 'file',
      objectUrl: URL.createObjectURL(f),
    }));
    setTracks((prev) => [...newTracks, ...prev]);
    await handleSelectTrack(newTracks[0]);
    showToast(`${newTracks.length} canción(es) cargada(s) en el radio Pioneer.`);
  };

  const handleBattleFinished = useCallback(
    (didWin: boolean, rewardCoins: number) => {
      if (!profile) return;
      const rewardRes = applyXpAndRewards(profile, didWin ? 120 : 45, rewardCoins);
      const next: PlayerProfile = {
        ...rewardRes.profile,
        wins: profile.wins + (didWin ? 1 : 0),
        losses: profile.losses + (didWin ? 0 : 1),
      };
      void persistProfile(next);
      chipeoAudio.playSfx('coin');
      showToast(
        rewardRes.leveledUp
          ? `⚡ ¡Nivel ${rewardRes.newLevel}! Victoria (+${(rewardCoins + rewardRes.levelBonusCoins).toLocaleString('es-DO')} monedas).`
          : didWin
            ? `¡Victoria en Batalla! +${rewardCoins.toLocaleString('es-DO')} monedas.`
            : `Batalla terminada (+${rewardCoins.toLocaleString('es-DO')} monedas de participación).`
      );
    },
    [profile, persistProfile, showToast]
  );

  if (screen === 'boot') {
    return <BootSplash onComplete={handleBootComplete} />;
  }

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        hasExistingAccount={Boolean(profile) || hasStoredVault()}
        savedUsername={profile?.username}
        savedAvatarUrl={profile?.avatarDataUrl}
        onStart={handleWelcomeStart}
        onOpenAuth={() => setScreen('auth')}
      />
    );
  }

  if (screen === 'auth') {
    const savedNames = listSavedAccountNames();
    return (
      <AccountModal
        initialMode={hasStoredVault() ? 'login' : 'create'}
        savedUsernames={savedNames}
        hasLegacyVault={hasStoredVault() && savedNames.length === 0}
        onCreateAccount={handleCreateAccount}
        onLoginAccount={handleLoginAccount}
        onResetVault={() => {
          clearEncryptedVault();
          setProfile(null);
          setScreen('auth');
        }}
      />
    );
  }

  if (screen === 'referral' && profile) {
    return (
      <ReferralVipPanel
        profile={profile}
        onRedeemCode={(code) => {
          const res = redeemSecretOrReferralCode(profile, code);
          if (res.ok) {
            chipeoAudio.playSfx('coin');
            void persistProfile(res.profile);
          }
          return { ok: res.ok, message: res.message };
        }}
        onGenerateOwnCode={() => {
          const res = activatePersonalReferralCode(profile);
          if (res.ok) {
            chipeoAudio.playSfx('coin');
            void persistProfile(res.profile);
          }
          return { ok: res.ok, code: res.code };
        }}
        onContinue={() => setScreen('play')}
      />
    );
  }

  if (!profile) {
    const savedNames = listSavedAccountNames();
    return (
      <AccountModal
        initialMode="create"
        savedUsernames={savedNames}
        hasLegacyVault={hasStoredVault() && savedNames.length === 0}
        onCreateAccount={handleCreateAccount}
        onLoginAccount={handleLoginAccount}
        onResetVault={() => clearEncryptedVault()}
      />
    );
  }

  const equippedGuagua = getEquippedGuagua(profile);
  const equippedHealth = profile.guaguaHealth[equippedGuagua.id] ?? FULL_HEALTH;
  const activeTrackTitle =
    tracks.find((t) => t.id === activeTrackId)?.title ?? 'Sin pista seleccionada';

  const navItems: { id: AppScreen; label: string; icon: typeof Radio }[] = [
    { id: 'play', label: 'Escenario', icon: Radio },
    { id: 'studio', label: 'Control Fijo', icon: Lock },
    { id: 'shop', label: 'Tienda', icon: ShoppingBag },
    { id: 'progress', label: 'Progreso', icon: Trophy },
    { id: 'clans', label: 'Clanes', icon: Shield },
    { id: 'battle', label: 'Batalla Online', icon: Swords },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="min-h-screen w-full bg-[#080B12] text-slate-100 flex flex-col">
      {/* Compact Game Shell Header on secondary screens (Play stage uses full-bleed corner HUD) */}
      {screen !== 'play' && (
        <header className="md:sticky md:top-0 z-30 border-b border-slate-800/90 bg-[#0A0E17] px-4 sm:px-6 py-2.5">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <img
                src={GAME_ICON_PATH}
                alt="Chipeo Cibaeño"
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover border border-sky-500/50"
              />
              <div className="flex items-center gap-2.5">
                <img
                  src={profile.avatarDataUrl}
                  alt={profile.username}
                  className="h-8 w-8 rounded-full object-cover border border-slate-600"
                />
                <div>
                  <p className="text-sm font-bold text-white leading-none">
                    {profile.clan ? `[${profile.clan.tag}] ` : ''}
                    {profile.username}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Nv {profile.level} · Récord {profile.peakDbRecord} dB
                  </p>
                </div>
              </div>
            </div>

            <nav
              aria-label="Navegación principal del juego"
              className="flex items-center gap-1 overflow-x-auto"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScreen(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center gap-1.5 rounded-lg bg-[#101624] border border-amber-500/30 px-3 py-1.5"
                data-testid="coins-balance"
              >
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-mono-num text-sm font-bold text-amber-400">
                  {profile.coins.toLocaleString('es-DO')}
                </span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-16 right-4 z-50 rounded-xl bg-[#101624] border border-sky-500/60 px-4 py-3 text-xs font-semibold text-white shadow-2xl max-w-sm"
        >
          {toast}
        </div>
      )}

      {/* Main Content */}
      <main
        className={
          screen === 'play'
            ? 'flex-1 w-full'
            : 'flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-5'
        }
      >
        {screen === 'play' && (
          <GuaguaStage
            guagua={equippedGuagua}
            health={equippedHealth}
            coils={profile.coils}
            level={profile.level}
            xp={profile.xp}
            coins={profile.coins}
            username={profile.username}
            avatarDataUrl={profile.avatarDataUrl}
            clanTag={profile.clan?.tag ?? null}
            currentDb={liveDb}
            voltage={liveVoltage}
            thermalLoadPct={liveThermalPct}
            isPlaying={isPlaying}
            isClipping={isClipping}
            trackTitle={activeTrackTitle}
            eq={eq}
            settings={profile.settings}
            metricsRef={metricsRef}
            moveRadioMode={moveRadioMode}
            radioOffset={radioOffset}
            onToggleMoveRadio={() => setMoveRadioMode((prev) => !prev)}
            onChangeRadioOffset={setRadioOffset}
            onUpdateSettings={(nextSettings) => {
              void persistProfile({ ...profile, settings: nextSettings });
            }}
            onChangeEq={setEq}
            onNavigateScreen={setScreen}
            onToggleAudio={handleTogglePlay}
            onStepTrack={handleStepTrack}
            onAddFolderTracks={handleAddFolderTracks}
            onQuickRechargeBattery={() => {
              const res = rechargeBattery(profile, equippedGuagua.id);
              showToast(res.message);
              if (res.ok) {
                chipeoAudio.playSfx('repair');
                void persistProfile(res.profile);
              }
            }}
            onOpenReferral={() => setScreen('referral')}
            optionsTrigger={optionsTrigger}
            radioSlot={
              <VideoRackPanel
                eq={eq}
                voltage={liveVoltage}
                currentDb={liveDb}
                sensitivity={profile.settings.sensitivity}
                streamingMode={profile.settings.streamingMode}
                isPlaying={isPlaying}
                isClipping={isClipping}
                accentColor={profile.settings.radioAccentColor}
                rackFinish={profile.settings.rackFinish}
                rackShape={profile.settings.rackShape}
                stationary={true}
                compact={true}
                tracks={tracks}
                activeTrackId={activeTrackId}
                savedPresets={profile.savedEqPresets ?? []}
                metricsRef={metricsRef}
                onChangeEq={setEq}
                onTogglePlay={handleTogglePlay}
                onSelectTrack={handleSelectTrack}
                onAddFolderTracks={handleAddFolderTracks}
                onSaveEqSlot={(slotIndex, name, eqToSave) => {
                  const updated = saveUserEqPreset(profile, slotIndex, name, eqToSave);
                  void persistProfile(updated);
                  showToast(`${name} guardado en tu bóveda cifrada.`);
                }}
                onQuickRechargeBattery={() => {
                  const res = rechargeBattery(profile, equippedGuagua.id);
                  showToast(res.message);
                  if (res.ok) {
                    chipeoAudio.playSfx('repair');
                    void persistProfile(res.profile);
                  }
                }}
                onNavigateScreen={setScreen}
                onOpenOptions={() => setOptionsTrigger((n) => n + 1)}
                onOpenReferral={() => setScreen('referral')}
              />
            }
          />
        )}

        {screen === 'studio' && (
          <StudioControlView
            profile={profile}
            eq={eq}
            liveDb={liveDb}
            liveVoltage={liveVoltage}
            thermalLoadPct={liveThermalPct}
            isPlaying={isPlaying}
            isClipping={isClipping}
            tracks={tracks}
            activeTrackId={activeTrackId}
            metricsRef={metricsRef}
            onChangeEq={setEq}
            onUpdateSettings={(nextSettings) => {
              void persistProfile({ ...profile, settings: nextSettings });
            }}
            onTogglePlay={handleTogglePlay}
            onSelectTrack={handleSelectTrack}
            onAddFolderTracks={handleAddFolderTracks}
            onSaveEqSlot={(slotIndex, name, eqToSave) => {
              const updated = saveUserEqPreset(profile, slotIndex, name, eqToSave);
              void persistProfile(updated);
              showToast(`${name} guardado en tu bóveda cifrada.`);
            }}
            onQuickRechargeBattery={() => {
              const res = rechargeBattery(profile, equippedGuagua.id);
              showToast(res.message);
              if (res.ok) {
                chipeoAudio.playSfx('repair');
                void persistProfile(res.profile);
              }
            }}
            onBackToStage={() => setScreen('play')}
            onOpenShop={() => setScreen('shop')}
          />
        )}

        {screen === 'shop' && (
          <ShopAndRepairView
            profile={profile}
            onBuyOrEquipGuagua={(guaguaId) => {
              const res = purchaseOrEquipGuagua(profile, guaguaId);
              if (res.ok) {
                chipeoAudio.playSfx('coin');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
            onRepairComponent={(guaguaId, comp: ComponentKey) => {
              const res = repairGuaguaComponent(profile, guaguaId, comp);
              if (res.ok) {
                chipeoAudio.playSfx('repair');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
            onRechargeBattery={(guaguaId) => {
              const res = rechargeBattery(profile, guaguaId);
              if (res.ok) {
                chipeoAudio.playSfx('repair');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
            onUpgradeCoil={(band: CoilBand) => {
              const res = upgradeCoilComponent(profile, band);
              if (res.ok) {
                chipeoAudio.playSfx('coin');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
            onGoToEvents={() => setScreen('progress')}
          />
        )}

        {screen === 'progress' && (
          <ProgressEventsView
            profile={profile}
            liveDb={liveDb}
            isAudioPlaying={isPlaying}
            onStartAudioIfPaused={async () => {
              if (!isPlaying) await handleTogglePlay();
            }}
            onClaimDaily={() => {
              const res = claimDailyReward(profile);
              if (res.ok) {
                chipeoAudio.playSfx('coin');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
            onCompleteEvent={(evt: DbEventSpec) => {
              const updated = completeDbEvent(profile, evt.rewardCoins, evt.rewardXp);
              chipeoAudio.playSfx('coin');
              void persistProfile(updated);
            }}
            onCompleteDailyEvent={(evt: DailySpecialEventSpec) => {
              const res = completeDailySpecialEvent(profile, evt);
              if (res.ok) {
                chipeoAudio.playSfx('coin');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
            onOpenShop={() => setScreen('shop')}
          />
        )}

        {screen === 'clans' && (
          <ClansView
            profile={profile}
            onCreateClan={(input) => {
              const res = createUserClan(profile, input);
              if (res.ok) {
                chipeoAudio.playSfx('coin');
                void persistProfile(res.profile);
              }
              return { ok: res.ok, message: res.message };
            }}
          />
        )}

        {screen === 'battle' && (
          <OnlineBattleView
            profile={profile}
            localDb={liveDb}
            localBassEnergy={metricsRef.current.bassEnergy}
            localVoiceEnergy={metricsRef.current.voiceEnergy}
            localDriverEnergy={metricsRef.current.driverEnergy}
            isAudioPlaying={isPlaying}
            onToggleAudio={handleTogglePlay}
            onBattleFinished={handleBattleFinished}
          />
        )}

        {screen === 'settings' && (
          <SettingsView
            profile={profile}
            onUpdateSettings={(nextSettings: GameSettings) => {
              void persistProfile({ ...profile, settings: nextSettings });
            }}
            onOpenReferralModal={() => setScreen('referral')}
            onResetAccount={() => {
              chipeoAudio.stop();
              setIsPlaying(false);
              clearEncryptedVault();
              setProfile(null);
              setScreen('auth');
            }}
          />
        )}
      </main>
    </div>
  );
}

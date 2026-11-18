import React, { useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BatteryCharging,
  Cpu,
  Flame,
  FolderOpen,
  Lock,
  Music2,
  Pause,
  Play,
  Thermometer,
  Wrench,
  Zap,
} from 'lucide-react';
import { AudioFrameMetrics, LoadedTrack } from '../audio/chipeoAudio';
import { COIL_TIERS, FULL_HEALTH } from '../game/catalog';
import { getEquippedGuagua, getXpProgressForLevel } from '../game/rules';
import { EqSettings, GameSettings, PlayerProfile } from '../game/types';
import { VideoRackPanel } from './VideoRackPanel';

interface StudioControlViewProps {
  profile: PlayerProfile;
  eq: EqSettings;
  liveDb: number;
  liveVoltage: number;
  thermalLoadPct: number;
  isPlaying: boolean;
  isClipping: boolean;
  tracks: LoadedTrack[];
  activeTrackId: string | null;
  metricsRef: React.MutableRefObject<AudioFrameMetrics>;
  onChangeEq: (next: EqSettings) => void;
  onUpdateSettings: (next: GameSettings) => void;
  onTogglePlay: () => void;
  onSelectTrack: (track: LoadedTrack) => void;
  onAddFolderTracks: (files: FileList) => void;
  onSaveEqSlot: (slotIndex: number, name: string, eq: EqSettings) => void;
  onQuickRechargeBattery: () => void;
  onBackToStage: () => void;
  onOpenShop: () => void;
}

export function StudioControlView({
  profile,
  eq,
  liveDb,
  liveVoltage,
  thermalLoadPct,
  isPlaying,
  isClipping,
  tracks,
  activeTrackId,
  metricsRef,
  onChangeEq,
  onUpdateSettings,
  onTogglePlay,
  onSelectTrack,
  onAddFolderTracks,
  onSaveEqSlot,
  onQuickRechargeBattery,
  onBackToStage,
  onOpenShop,
}: StudioControlViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const guagua = getEquippedGuagua(profile);
  const health = profile.guaguaHealth[guagua.id] ?? FULL_HEALTH;
  const xpInfo = getXpProgressForLevel(profile.xp);

  const burnedList: string[] = [];
  if (health.drivers <= 0) burnedList.push('Drivers');
  if (health.voice <= 0) burnedList.push('Bocinas de Voz');
  if (health.bass <= 0) burnedList.push('Bajos');

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFolderTracks(e.target.files);
    }
    e.target.value = '';
  };

  const thermalBarColor =
    thermalLoadPct >= 82 ? 'bg-red-500' : thermalLoadPct >= 60 ? 'bg-amber-500' : 'bg-sky-400';

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5" data-testid="studio-control-view">
      {/* Studio Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0B101D] border border-white/12 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStage}
            data-testid="studio-back-to-stage"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Escenario</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-none">
                CABINA DE CONTROL FIJO
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                <Lock className="h-3 w-3" />
                <span>0% Vibración</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Controla música, carpetas, EQ y procesador sin que el radio se mueva
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Level Progress */}
          <div className="rounded-xl bg-[#070B14] border border-white/10 px-3 py-1.5 min-w-[165px]">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-sky-400">
                <Zap className="h-3.5 w-3.5" />
                <span>Nivel {xpInfo.level}</span>
              </span>
              <span className="font-mono-num text-slate-300">
                {xpInfo.xpIntoLevel}/{xpInfo.xpForNextLevel} XP
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all"
                style={{ width: `${Math.max(4, xpInfo.progressPct)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenShop}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-white cursor-pointer"
          >
            <Wrench className="h-3.5 w-3.5 text-amber-400" />
            <span>Taller / Tienda</span>
          </button>
        </div>
      </div>

      {/* Main Split: Stationary Pioneer 3D Rack + Music/Telemetry Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 flex justify-center">
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
            tracks={tracks}
            activeTrackId={activeTrackId}
            savedPresets={profile.savedEqPresets ?? []}
            metricsRef={metricsRef}
            onChangeEq={onChangeEq}
            onTogglePlay={onTogglePlay}
            onSelectTrack={onSelectTrack}
            onAddFolderTracks={onAddFolderTracks}
            onSaveEqSlot={onSaveEqSlot}
            onQuickRechargeBattery={onQuickRechargeBattery}
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Telemetry + Thermal Stress */}
          <div className="rounded-2xl bg-[#0B101D] border border-white/12 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Equipo Activo
                </p>
                <p className="text-base font-extrabold text-white">{guagua.name}</p>
              </div>
              <button
                type="button"
                onClick={onTogglePlay}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                  isPlaying
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                }`}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? 'Pausar' : 'Sonar Música'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
              <div className="rounded-xl bg-[#070B14] border border-white/10 p-2.5">
                <p className="text-[10px] text-slate-400 uppercase">Presión</p>
                <p
                  data-testid="studio-db-readout"
                  className={`font-mono-num text-xl font-extrabold ${
                    isClipping ? 'text-red-400' : isPlaying ? 'text-sky-400' : 'text-slate-200'
                  }`}
                >
                  {liveDb} dB
                </p>
              </div>
              <div className="rounded-xl bg-[#070B14] border border-white/10 p-2.5">
                <p className="text-[10px] text-slate-400 uppercase">Voltaje</p>
                <p
                  className={`font-mono-num text-xl font-extrabold ${
                    liveVoltage < 12.2 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {liveVoltage.toFixed(1)}V
                </p>
              </div>
              <div className="rounded-xl bg-[#070B14] border border-white/10 p-2.5">
                <p className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-amber-400" />
                  <span>Calor</span>
                </p>
                <p
                  className={`font-mono-num text-xl font-extrabold ${
                    thermalLoadPct >= 82
                      ? 'text-red-400'
                      : thermalLoadPct >= 60
                        ? 'text-amber-400'
                        : 'text-sky-300'
                  }`}
                >
                  {thermalLoadPct}%
                </p>
              </div>
            </div>

            {/* Thermal meter */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Carga Térmica de Bobinas</span>
                <span className="font-mono-num font-bold text-slate-300">
                  {isClipping ? '¡SATURACIÓN / CLIP!' : thermalLoadPct >= 75 ? 'Caliente' : 'Estable'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${thermalBarColor}`}
                  style={{ width: `${Math.max(4, thermalLoadPct)}%` }}
                />
              </div>
            </div>

            {/* Health Bars */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
              {[
                { label: 'Drivers', val: health.drivers, tier: COIL_TIERS[profile.coils.drivers].level },
                { label: 'Voz', val: health.voice, tier: COIL_TIERS[profile.coils.voice].level },
                { label: 'Bajos', val: health.bass, tier: COIL_TIERS[profile.coils.bass].level },
                { label: 'Batería', val: health.battery, tier: null },
              ].map((item) => {
                const pct = Math.round(item.val);
                return (
                  <div key={item.label} className="rounded-lg bg-[#070B14] px-2.5 py-2 border border-white/5">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-semibold">
                        {item.label}
                        {item.tier && item.tier > 1 ? ` B${item.tier}` : ''}
                      </span>
                      <span
                        className={`font-mono-num font-bold ${
                          pct <= 0 ? 'text-red-400' : pct < 45 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${
                          pct <= 0 ? 'bg-red-500' : pct < 45 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {burnedList.length > 0 && (
              <div className="rounded-xl bg-red-950/80 border border-red-500/60 px-3 py-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-100">
                  <Flame className="h-4 w-4 text-red-400 shrink-0" />
                  <span>Quemado: {burnedList.join(', ')}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold cursor-pointer"
                >
                  Reparar
                </button>
              </div>
            )}

            {isClipping && isPlaying && burnedList.length === 0 && (
              <div className="rounded-xl bg-amber-950/80 border border-amber-500/50 px-3 py-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>¡Clipping alto! Activa Procesador DSP o baja un poco el gain para no quemar.</span>
              </div>
            )}

            {health.battery < 95 && (
              <button
                type="button"
                onClick={onQuickRechargeBattery}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 cursor-pointer"
              >
                <BatteryCharging className="h-4 w-4" />
                <span>Recargar Baterías 14.5V</span>
              </button>
            )}
          </div>

          {/* DSP & Kitipo Quick Tuning */}
          <div className="rounded-2xl bg-[#0B101D] border border-white/12 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-sky-400" />
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Procesador &amp; Kitipo
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeEq({ ...eq, crossoverEnabled: !eq.crossoverEnabled })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  eq.crossoverEnabled
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {eq.crossoverEnabled ? 'DSP ON' : 'DSP OFF'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'crossover', label: 'Crossover' },
                  { id: 'processor', label: 'Procesador DSP' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeEq({ ...eq, dspMode: m.id, crossoverEnabled: true })}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    eq.dspMode === m.id
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#070B14] border-slate-800 text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 0, label: 'Normal' },
                { value: 1, label: 'Kitipo +3 dB' },
                { value: 2, label: 'Extremo +6 dB' },
              ].map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => onUpdateSettings({ ...profile.settings, kitipoBoost: k.value })}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border cursor-pointer ${
                    profile.settings.kitipoBoost === k.value
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#070B14] border-slate-800 text-slate-300'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Folder & Playlist Panel */}
          <div className="rounded-2xl bg-[#0B101D] border border-white/12 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Biblioteca de Música ({tracks.length})
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer"
                >
                  <Music2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Cargar MP3</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                  <span>Carpeta</span>
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFilePick}
              className="sr-only"
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="audio/*"
              multiple
              // @ts-expect-error webkitdirectory lets Chromium users load a whole music folder
              webkitdirectory=""
              onChange={handleFilePick}
              className="sr-only"
            />

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {tracks.map((track) => {
                const active = track.id === activeTrackId;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onSelectTrack(track)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-[#070B14] border-slate-800 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="truncate font-semibold">
                      {active && isPlaying ? '▶ ' : ''}
                      {track.title}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {track.kind === 'file' ? 'Tu Carpeta' : track.artist}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Camera,
  ChevronDown,
  ChevronUp,
  Cpu,
  FolderOpen,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sliders,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { AudioFrameMetrics, chipeoAudio, LoadedTrack } from '../../audio/chipeoAudio';
import { PIONEER_PANEL_PATH } from '../../game/catalog';
import { EqSettings, RackFinish, RackShape, RadioCameraPreset, SavedEqPreset } from '../../game/types';
import {
  createRadio3DScene,
  Radio3DController,
  Radio3DStateSnapshot,
} from './radio3dScene';

interface PioneerRadio3DProps {
  eq: EqSettings;
  voltage: number;
  currentDb: number;
  sensitivity: number;
  streamingMode: boolean;
  isPlaying: boolean;
  isClipping: boolean;
  accentColor: string;
  rackFinish: RackFinish;
  rackShape: RackShape;
  stationary?: boolean;
  showStand?: boolean;
  compact?: boolean;
  tracks: LoadedTrack[];
  activeTrackId: string | null;
  savedPresets: SavedEqPreset[];
  metricsRef: React.MutableRefObject<AudioFrameMetrics>;
  onChangeEq: (next: EqSettings) => void;
  onTogglePlay: () => void;
  onSelectTrack: (track: LoadedTrack) => void;
  onAddFolderTracks: (files: FileList) => void;
  onSaveEqSlot: (slotIndex: number, name: string, eq: EqSettings) => void;
}

const EQ_BANDS: { key: keyof EqSettings; label: string }[] = [
  { key: 'hz50', label: '50Hz' },
  { key: 'hz125', label: '125Hz' },
  { key: 'hz315', label: '315Hz' },
  { key: 'hz750', label: '750Hz' },
  { key: 'khz2_2', label: '2.2K' },
  { key: 'khz6', label: '6KHz' },
  { key: 'khz16', label: '16KHz' },
];

const EQ_PRESETS: { name: string; values: Partial<EqSettings> }[] = [
  {
    name: 'Flow Cibao',
    values: { hz50: 5, hz125: 4, hz315: 1, hz750: 2, khz2_2: 3, khz6: 4, khz16: 3 },
  },
  {
    name: 'Bajo Extremo',
    values: { hz50: 10, hz125: 7, hz315: 2, hz750: 0, khz2_2: 2, khz6: 3, khz16: 2 },
  },
  {
    name: 'Voz & Drivers',
    values: { hz50: 2, hz125: 1, hz315: 4, hz750: 7, khz2_2: 7, khz6: 8, khz16: 7 },
  },
  {
    name: 'Plano (Flat)',
    values: { hz50: 0, hz125: 0, hz315: 0, hz750: 0, khz2_2: 0, khz6: 0, khz16: 0 },
  },
];

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PioneerRadio3D({
  eq,
  voltage,
  currentDb,
  sensitivity,
  streamingMode,
  isPlaying,
  isClipping,
  accentColor,
  rackFinish,
  rackShape,
  stationary = false,
  showStand = true,
  compact = false,
  tracks,
  activeTrackId,
  savedPresets,
  metricsRef,
  onChangeEq,
  onTogglePlay,
  onSelectTrack,
  onAddFolderTracks,
  onSaveEqSlot,
}: PioneerRadio3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Radio3DController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<RadioCameraPreset>('angle');
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'eq' | 'dsp' | 'tracks'>('eq');
  const [minimized, setMinimized] = useState(false);
  const [timing, setTiming] = useState({ currentTime: 0, duration: 0 });

  const activeTrack = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];
  const latestPropsRef = useRef({
    eq,
    sensitivity,
    onChangeEq,
    onTogglePlay,
    presetIdx,
    setPresetIdx,
  });
  useEffect(() => {
    latestPropsRef.current = {
      eq,
      sensitivity,
      onChangeEq,
      onTogglePlay,
      presetIdx,
      setPresetIdx,
    };
  }, [eq, sensitivity, onChangeEq, onTogglePlay, presetIdx]);

  // Mount Three.js 3D rack once inside isolated mountRef container
  useEffect(() => {
    const el = mountRef.current;
    if (!el || minimized) return;

    const initialSnapshot: Radio3DStateSnapshot = {
      eq,
      voltage,
      currentDb,
      isPlaying,
      isClipping,
      trackTitle: activeTrack?.title ?? 'ELEGIR CARPETA',
      accentColor,
      rackFinish,
      rackShape,
      showStand,
      streamingMode,
      sensitivity,
    };

    const ctrl = createRadio3DScene(el, initialSnapshot, metricsRef, {
      onVolumeDelta: (delta) => {
        const cur = latestPropsRef.current;
        const scaled = Math.round(delta * cur.sensitivity);
        const nextVol = Math.max(0, Math.min(100, cur.eq.volume + scaled));
        cur.onChangeEq({ ...cur.eq, volume: nextVol, muted: false });
      },
      onSubDelta: (delta) => {
        const cur = latestPropsRef.current;
        const scaled = Math.round(delta * cur.sensitivity);
        const nextSub = Math.max(0, Math.min(100, cur.eq.subLevel + scaled));
        cur.onChangeEq({ ...cur.eq, subLevel: nextSub });
      },
      onEqBandDelta: (bandKey, delta) => {
        const cur = latestPropsRef.current;
        const prev = cur.eq[bandKey] as number;
        const nextVal = Math.max(-12, Math.min(12, prev + delta));
        cur.onChangeEq({ ...cur.eq, [bandKey]: nextVal, eqBypass: false });
      },
      onTogglePlay: () => {
        latestPropsRef.current.onTogglePlay();
      },
      onCyclePreset: () => {
        const cur = latestPropsRef.current;
        const nextIdx = (cur.presetIdx + 1) % EQ_PRESETS.length;
        cur.setPresetIdx(nextIdx);
        cur.onChangeEq({ ...cur.eq, ...EQ_PRESETS[nextIdx].values, eqBypass: false });
      },
      onToggleAux: () => {
        const cur = latestPropsRef.current;
        cur.onChangeEq({ ...cur.eq, eqBypass: !cur.eq.eqBypass });
      },
      onOpenFolderChooser: () => {
        fileInputRef.current?.click();
      },
      onHoverControl: (lbl) => {
        setHoverLabel(lbl);
      },
    });

    if (!ctrl) {
      setWebglFailed(true);
      return;
    }

    controllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
    // Intentionally mounted once per visible 3D viewport instance; live state updates go through updateState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimized]);

  // Sync live state to 3D rack without recreating WebGLRenderer
  useEffect(() => {
    controllerRef.current?.updateState({
      eq,
      voltage,
      currentDb,
      isPlaying,
      isClipping,
      trackTitle: activeTrack?.title ?? 'ELEGIR CARPETA',
      accentColor,
      rackFinish,
      rackShape,
      showStand,
      streamingMode,
      sensitivity,
    });
  }, [
    eq,
    voltage,
    currentDb,
    isPlaying,
    isClipping,
    activeTrack,
    accentColor,
    rackFinish,
    rackShape,
    showStand,
    streamingMode,
    sensitivity,
  ]);

  // 4Hz playback scrubber timing update
  useEffect(() => {
    const id = window.setInterval(() => {
      setTiming(chipeoAudio.getPlaybackTiming());
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFolderTracks(e.target.files);
    }
    e.target.value = '';
  };

  const handleStepTrack = (dir: -1 | 1) => {
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === activeTrackId);
    const nextIdx = idx < 0 ? 0 : (idx + dir + tracks.length) % tracks.length;
    onSelectTrack(tracks[nextIdx]);
  };

  const handleCyclePreset = () => {
    const nextIdx = (presetIdx + 1) % EQ_PRESETS.length;
    setPresetIdx(nextIdx);
    onChangeEq({ ...eq, ...EQ_PRESETS[nextIdx].values, eqBypass: false });
  };

  const progressPct =
    timing.duration > 0 ? Math.min(100, Math.max(0, (timing.currentTime / timing.duration) * 100)) : 0;

  return (
    <section
      className="w-full rounded-2xl bg-[#070B14]/92 border border-white/15 shadow-2xl overflow-hidden flex flex-col"
      data-testid="pioneer-panel"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10 bg-[#0A101E]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-extrabold text-white leading-none truncate">
              PIONEER &amp; ATEQ 3D
            </h2>
            {stationary && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 shrink-0">
                FIJO
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {hoverLabel ?? (stationary ? 'Control fijo sin vibración — ajusta con precisión' : 'Gira el radio 3D o toca la pantalla OLED')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              isPlaying
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pausar' : 'Sonar Música'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? 'Expandir radio 3D' : 'Minimizar radio 3D'}
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className={compact ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'}>
          {/* 3D Camera Preset Bar */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-1">
                <Camera className="h-3.5 w-3.5 text-sky-400" />
                <span>Cámara:</span>
              </span>
              {(
                [
                  { id: 'front', label: 'Frente' },
                  { id: 'angle', label: 'Ángulo 3D' },
                  { id: 'knobs', label: 'Perillas' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCameraPreset(preset.id);
                    controllerRef.current?.setCameraPreset(preset.id);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                    cameraPreset === preset.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Alejar cámara del radio 3D"
                onClick={() => controllerRef.current?.zoomStep('out')}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Acercar cámara del radio 3D"
                onClick={() => controllerRef.current?.zoomStep('in')}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Dedicated 3D WebGL Canvas Mount (no backdrop-blur over WebGL) */}
          <div
            className={`relative w-full ${
              compact ? 'h-[245px] sm:h-[268px]' : 'h-[305px] sm:h-[345px]'
            } rounded-xl overflow-hidden border border-white/10 bg-[#050810]`}
          >
            {webglFailed ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={PIONEER_PANEL_PATH}
                  alt="Panel Pioneer & ATEQ"
                  referrerPolicy="no-referrer"
                  className="h-full w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  ELEGIR CARPETA
                </button>
              </div>
            ) : (
              <div
                ref={mountRef}
                data-testid="pioneer-3d-canvas"
                className="w-full h-full"
                aria-label="Rack 3D interactivo Pioneer y ecualizador ATEQ"
              />
            )}
          </div>

          {/* Real File & Folder Input Pickers */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFilePick}
            className="sr-only"
            aria-label="Seleccionar archivos de audio"
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="audio/*"
            multiple
            // @ts-expect-error webkitdirectory lets Chromium users load an entire music folder
            webkitdirectory=""
            onChange={handleFilePick}
            className="sr-only"
            aria-label="Seleccionar carpeta de música completa"
          />

          {/* Transport + Scrubber Bar */}
          <div className="rounded-xl bg-[#0B1120] border border-white/10 px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Canción anterior"
                  onClick={() => handleStepTrack(-1)}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pausar reproducción' : 'Reproducir pista'}
                  onClick={onTogglePlay}
                  className="p-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Siguiente canción"
                  onClick={() => handleStepTrack(1)}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="text-xs font-semibold text-white truncate flex-1 text-center">
                {activeTrack?.title ?? 'Sin pista'}
              </span>

              <span className="font-mono-num text-[11px] text-slate-400 shrink-0">
                {formatClock(timing.currentTime)} / {formatClock(timing.duration)}
              </span>
            </div>

            <input
              type="range"
              aria-label="Progreso de canción"
              min={0}
              max={100}
              value={Math.round(progressPct)}
              onChange={(e) => chipeoAudio.seekFraction(Number(e.target.value) / 100)}
              className="w-full h-1.5 accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Quick Actions + Mode Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                data-testid="pioneer-elegir-carpeta"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer whitespace-nowrap"
              >
                <Music2 className="h-3.5 w-3.5 text-sky-400" />
                <span>Cargar MP3</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                <span>Carpeta</span>
              </button>
              <button
                type="button"
                data-testid="aux-sw-toggle"
                aria-pressed={!eq.eqBypass}
                onClick={() => onChangeEq({ ...eq, eqBypass: !eq.eqBypass })}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap border ${
                  eq.eqBypass
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                }`}
              >
                AUX {eq.eqBypass ? 'OFF' : 'ON'}
              </button>
              <button
                type="button"
                data-testid="mute-toggle"
                aria-pressed={eq.muted}
                onClick={() => onChangeEq({ ...eq, muted: !eq.muted })}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap border ${
                  eq.muted
                    ? 'bg-red-500/25 border-red-500/60 text-red-200'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {eq.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{eq.muted ? 'MUTE' : 'Audio'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'eq', label: 'EQ' },
                  { id: 'dsp', label: 'DSP' },
                  { id: 'tracks', label: `Lista (${tracks.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Panel: EQ / DSP / Playlist */}
          {activeTab === 'eq' && (
            <div className="rounded-xl bg-[#0A0F1B] border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCyclePreset}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>{EQ_PRESETS[presetIdx].name}</span>
                </button>

                {/* Save / Load Set 1 & Set 2 */}
                <div className="flex items-center gap-1">
                  {[0, 1].map((slot) => {
                    const saved = savedPresets[slot];
                    return (
                      <div key={slot} className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (saved) onChangeEq({ ...saved.eq });
                            else onSaveEqSlot(slot, `Set ${slot + 1}`, eq);
                          }}
                          className="px-2 py-1 rounded-l-md bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-300 cursor-pointer"
                          title={saved ? `Cargar Set ${slot + 1}` : `Guardar en Set ${slot + 1}`}
                        >
                          {saved ? `Set ${slot + 1}` : `+Set ${slot + 1}`}
                        </button>
                        <button
                          type="button"
                          aria-label={`Guardar EQ actual en Set ${slot + 1}`}
                          onClick={() => onSaveEqSlot(slot, `Set ${slot + 1}`, eq)}
                          className="p-1 rounded-r-md bg-slate-800/80 hover:bg-sky-500/30 text-slate-300 cursor-pointer"
                          title={`Guardar Set ${slot + 1}`}
                        >
                          <Bookmark className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label htmlFor="eq-volume-3d" className="text-slate-300 font-semibold">
                      Volumen
                    </label>
                    <span className="font-mono-num font-bold text-sky-400">
                      {streamingMode ? '•••' : `${eq.volume}%`}
                    </span>
                  </div>
                  <input
                    id="eq-volume-3d"
                    type="range"
                    min={0}
                    max={100}
                    step={Math.max(1, Math.round(1 * sensitivity))}
                    value={eq.volume}
                    onChange={(e) =>
                      onChangeEq({ ...eq, volume: Number(e.target.value), muted: false })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label htmlFor="eq-sublevel-3d" className="text-slate-300 font-semibold">
                      Sub Level (Bajo)
                    </label>
                    <span className="font-mono-num font-bold text-amber-400">
                      {streamingMode ? '•••' : `${eq.subLevel}%`}
                    </span>
                  </div>
                  <input
                    id="eq-sublevel-3d"
                    type="range"
                    min={0}
                    max={100}
                    step={Math.max(1, Math.round(1 * sensitivity))}
                    value={eq.subLevel}
                    onChange={(e) => onChangeEq({ ...eq, subLevel: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div
                className={`grid grid-cols-7 gap-1 pt-2 border-t border-white/10 ${
                  eq.eqBypass ? 'opacity-45' : 'opacity-100'
                }`}
              >
                {EQ_BANDS.map((band) => {
                  const val = eq[band.key] as number;
                  return (
                    <div key={band.key} className="flex flex-col items-center">
                      <span className="font-mono-num text-[10px] text-sky-300 font-bold mb-1">
                        {streamingMode ? '••' : val > 0 ? `+${val}` : val}
                      </span>
                      <input
                        type="range"
                        aria-label={`Ecualizador ${band.label}`}
                        min={-12}
                        max={12}
                        step={1}
                        disabled={eq.eqBypass}
                        value={val}
                        onChange={(e) =>
                          onChangeEq({ ...eq, [band.key]: Number(e.target.value) })
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 mt-1">{band.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'dsp' && (
            <div
              className="rounded-xl bg-[#0A0F1B] border border-sky-500/30 p-3 space-y-2.5"
              data-testid="dsp-crossover-panel"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-sky-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Crossover y Procesador DSP</p>
                    <p className="text-[11px] text-slate-400">
                      Corta subgraves y protege drivers de saturación
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeEq({ ...eq, crossoverEnabled: !eq.crossoverEnabled })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    eq.crossoverEnabled
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {eq.crossoverEnabled ? 'DSP Activo' : 'DSP Apagado'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'crossover', label: 'Modo Crossover' },
                    { id: 'processor', label: 'Procesador DSP' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onChangeEq({ ...eq, dspMode: mode.id, crossoverEnabled: true })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      eq.dspMode === mode.id
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-[#070B14] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <label htmlFor="dsp-lpf-sub-3d" className="text-slate-300 font-semibold">
                      Sub LPF
                    </label>
                    <span className="font-mono-num text-amber-400 font-bold">
                      {streamingMode ? '••• Hz' : `${eq.lpfSubHz} Hz`}
                    </span>
                  </div>
                  <input
                    id="dsp-lpf-sub-3d"
                    type="range"
                    min={60}
                    max={180}
                    step={5}
                    value={eq.lpfSubHz}
                    onChange={(e) => onChangeEq({ ...eq, lpfSubHz: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <label htmlFor="dsp-hpf-voice-3d" className="text-slate-300 font-semibold">
                      Voz HPF
                    </label>
                    <span className="font-mono-num text-emerald-400 font-bold">
                      {streamingMode ? '••• Hz' : `${eq.hpfVoiceHz} Hz`}
                    </span>
                  </div>
                  <input
                    id="dsp-hpf-voice-3d"
                    type="range"
                    min={120}
                    max={400}
                    step={10}
                    value={eq.hpfVoiceHz}
                    onChange={(e) => onChangeEq({ ...eq, hpfVoiceHz: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tracks' && (
            <div className="rounded-xl bg-[#0A0F1B] border border-white/10 p-2.5 max-h-40 overflow-y-auto space-y-1">
              {tracks.map((track) => {
                const active = track.id === activeTrackId;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onSelectTrack(track)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border border-sky-500/50 text-white'
                        : 'bg-[#070B14] hover:bg-slate-800/80 border border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate font-medium">
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
          )}
        </div>
      )}
    </section>
  );
}

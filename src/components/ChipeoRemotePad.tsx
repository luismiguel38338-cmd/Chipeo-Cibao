import React, { useRef, useState } from 'react';
import {
  Cpu,
  FolderOpen,
  ListMusic,
  Move,
  Pause,
  Play,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { DEFAULT_EQ } from '../game/catalog';
import { EqSettings } from '../game/types';

interface ChipeoRemotePadProps {
  eq: EqSettings;
  isPlaying: boolean;
  currentDb: number;
  trackTitle: string;
  kitipoBoost: number;
  accentColor: string;
  onChangeEq: (next: EqSettings) => void;
  onChangeKitipo: (next: number) => void;
  onTogglePlay: () => void;
  onStepTrack: (dir: -1 | 1) => void;
  onOpenFolder: () => void;
  onOpenStudio: () => void;
  onClose: () => void;
}

const CHIPEO_PRESETS: { id: string; label: string; patch: Partial<EqSettings> }[] = [
  {
    id: 'flat',
    label: 'Flat',
    patch: { hz50: 0, hz125: 0, hz315: 0, hz750: 0, khz2_2: 0, khz6: 0, khz16: 0, eqBypass: false },
  },
  {
    id: 'cibao',
    label: 'Cibao Hard',
    patch: { hz50: 8, hz125: 5, hz315: 2, hz750: 3, khz2_2: 4, khz6: 5, khz16: 6, eqBypass: false },
  },
  {
    id: 'sublow',
    label: 'Bajo Piso',
    patch: { hz50: 10, hz125: 7, hz315: 1, hz750: 0, khz2_2: 2, khz6: 3, khz16: 4, eqBypass: false },
  },
  {
    id: 'voces',
    label: 'Voz & Driver',
    patch: { hz50: 3, hz125: 2, hz315: 4, hz750: 6, khz2_2: 7, khz6: 8, khz16: 7, eqBypass: false },
  },
];

export function ChipeoRemotePad({
  eq,
  isPlaying,
  currentDb,
  trackTitle,
  kitipoBoost,
  accentColor,
  onChangeEq,
  onChangeKitipo,
  onTogglePlay,
  onStepTrack,
  onOpenFolder,
  onOpenStudio,
  onClose,
}: ChipeoRemotePadProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [showDspTab, setShowDspTab] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const stepVolume = (delta: number) => {
    const nextVol = Math.max(0, Math.min(100, eq.volume + delta));
    onChangeEq({ ...eq, volume: nextVol });
  };

  const stepSub = (delta: number) => {
    const nextSub = Math.max(0, Math.min(100, eq.subLevel + delta));
    onChangeEq({ ...eq, subLevel: nextSub });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPos({
      x: Math.max(-520, Math.min(280, dragRef.current.ox + (e.clientX - dragRef.current.sx))),
      y: Math.max(-260, Math.min(160, dragRef.current.oy + (e.clientY - dragRef.current.sy))),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      data-testid="chipeo-remote-pad"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className="w-[218px] rounded-[26px] bg-gradient-to-b from-[#1D222F] via-[#10141E] to-[#080B11] border-2 border-slate-600/75 shadow-[0_24px_60px_rgba(0,0,0,0.92)] p-3 text-slate-100 select-none"
    >
      {/* Drag Header ("✥ mover") */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-white/10 cursor-move"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-slate-300 uppercase">
          <Move className="h-3 w-3 text-sky-400" />
          <span>Control Chipeo</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar control remoto de chipeo"
          className="p-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Mini Live Telemetry Pill */}
      <div className="rounded-xl bg-[#050A14] border border-sky-500/35 px-2.5 py-1.5 mb-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono-num font-black text-sky-300">{currentDb} dB</span>
          <span className="font-mono-num font-bold text-slate-300">
            VOL {Math.round((eq.volume / 100) * 30)}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 truncate mt-0.5">
          {isPlaying ? `▶ ${trackTitle}` : `PAUSA · ${trackTitle}`}
        </p>
      </div>

      {/* Volume Rocker: −  VOLUME  + */}
      <div className="rounded-xl bg-[#0C1019] border border-white/15 p-1 flex items-center justify-between gap-1 mb-2">
        <button
          type="button"
          data-testid="remote-vol-down"
          onClick={() => stepVolume(-6)}
          aria-label="Bajar volumen rápido"
          className="h-8 w-10 rounded-lg bg-[#1A202E] hover:bg-slate-700 active:scale-95 text-sm font-black text-white cursor-pointer"
        >
          −
        </button>
        <span className="text-[9px] font-extrabold tracking-widest text-slate-300">VOLUME</span>
        <button
          type="button"
          data-testid="remote-vol-up"
          onClick={() => stepVolume(6)}
          aria-label="Subir volumen rápido"
          className="h-8 w-10 rounded-lg bg-[#1A202E] hover:bg-slate-700 active:scale-95 text-sm font-black text-white cursor-pointer"
        >
          +
        </button>
      </div>

      {/* Sub Level Quick Rocker: SUB − / + */}
      <div className="rounded-xl bg-[#0C1019] border border-white/15 p-1 flex items-center justify-between gap-1 mb-2.5">
        <button
          type="button"
          onClick={() => stepSub(-8)}
          aria-label="Bajar sub nivel"
          className="h-6 w-9 rounded-lg bg-[#181E2B] hover:bg-slate-700 active:scale-95 text-xs font-black text-sky-300 cursor-pointer"
        >
          −
        </button>
        <span className="text-[9px] font-bold tracking-wider text-sky-300">
          SUB {eq.subLevel}%
        </span>
        <button
          type="button"
          onClick={() => stepSub(8)}
          aria-label="Subir sub nivel"
          className="h-6 w-9 rounded-lg bg-[#181E2B] hover:bg-slate-700 active:scale-95 text-xs font-black text-sky-300 cursor-pointer"
        >
          +
        </button>
      </div>

      {/* Pioneer Remote Upper Utility Row: BAND/ESC · PLAY · MUTE */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        <button
          type="button"
          onClick={() => setShowDspTab((s) => !s)}
          className={`py-1.5 rounded-lg border text-[9px] font-extrabold cursor-pointer ${
            showDspTab
              ? 'bg-sky-500 text-slate-950 border-sky-400'
              : 'bg-[#171C28] hover:bg-slate-700 border-white/15 text-slate-200'
          }`}
        >
          BAND/DSP
        </button>

        <button
          type="button"
          data-testid="remote-play-toggle"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pausar música' : 'Sonar música'}
          className={`py-1.5 rounded-lg border flex items-center justify-center cursor-pointer ${
            isPlaying
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : 'bg-sky-500 text-slate-950 border-sky-400'
          }`}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          data-testid="remote-mute-toggle"
          onClick={() => onChangeEq({ ...eq, muted: !eq.muted })}
          aria-pressed={eq.muted}
          aria-label={eq.muted ? 'Quitar silencio' : 'Silenciar corte'}
          className={`py-1.5 rounded-lg border flex items-center justify-center gap-0.5 text-[9px] font-extrabold cursor-pointer ${
            eq.muted
              ? 'bg-red-500 text-white border-red-400'
              : 'bg-[#171C28] hover:bg-slate-700 border-white/15 text-slate-200'
          }`}
        >
          {eq.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          <span>MUTE</span>
        </button>
      </div>

      {/* Circular Pioneer CXE D-Pad (▲ ◀ OK ▶ ▼) */}
      <div className="relative mx-auto w-[140px] h-[140px] rounded-full bg-gradient-to-b from-[#171C28] to-[#0B0E16] border-2 border-slate-600/80 shadow-inner flex items-center justify-center mb-2.5">
        <div
          className="pointer-events-none absolute inset-2 rounded-full border opacity-45"
          style={{ borderColor: accentColor }}
        />
        <button
          type="button"
          onClick={() => stepVolume(4)}
          aria-label="Subir volumen D-Pad"
          className="absolute top-1.5 left-1/2 -translate-x-1/2 h-7 w-9 rounded-t-xl hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => stepVolume(-4)}
          aria-label="Bajar volumen D-Pad"
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-7 w-9 rounded-b-xl hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          ▼
        </button>
        <button
          type="button"
          onClick={() => onStepTrack(-1)}
          aria-label="Pista anterior"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 h-9 w-7 rounded-l-xl hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => onStepTrack(1)}
          aria-label="Siguiente pista"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-7 rounded-r-xl hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          ▶
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label="Centro Play / Pausa"
          className="h-12 w-12 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-500 shadow-lg flex items-center justify-center text-[9px] font-black text-white hover:brightness-110 active:scale-95 cursor-pointer"
        >
          CHIPEAR
        </button>
      </div>

      {/* Bottom Action Row: MIX (Kitipo) · LIST · CARP */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onChangeKitipo((kitipoBoost + 1) % 3)}
          className={`py-1.5 rounded-lg border text-[9px] font-extrabold flex items-center justify-center gap-0.5 cursor-pointer ${
            kitipoBoost > 0
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
              : 'bg-[#171C28] border-white/15 text-slate-300'
          }`}
        >
          <Sparkles className="h-2.5 w-2.5" />
          <span>KIT {kitipoBoost === 0 ? 'OFF' : kitipoBoost === 1 ? '+3' : '+6'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenStudio}
          className="py-1.5 rounded-lg bg-[#171C28] hover:bg-slate-700 border border-white/15 text-[9px] font-extrabold text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer"
        >
          <ListMusic className="h-2.5 w-2.5 text-sky-400" />
          <span>LIST</span>
        </button>

        <button
          type="button"
          onClick={onOpenFolder}
          className="py-1.5 rounded-lg bg-[#171C28] hover:bg-slate-700 border border-white/15 text-[9px] font-extrabold text-amber-300 flex items-center justify-center gap-0.5 cursor-pointer"
        >
          <FolderOpen className="h-2.5 w-2.5" />
          <span>CARP</span>
        </button>
      </div>

      {/* Expandable Crossover / DSP Quick Tuner */}
      {showDspTab && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-sky-300 uppercase">
              <Cpu className="h-3 w-3" />
              <span>Crossover &amp; DSP</span>
            </span>
            <button
              type="button"
              onClick={() => onChangeEq({ ...eq, crossoverEnabled: !eq.crossoverEnabled })}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                eq.crossoverEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {eq.crossoverEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {CHIPEO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeEq({ ...eq, ...preset.patch })}
                className="px-1.5 py-1 rounded bg-[#0A0E18] hover:bg-slate-800 border border-white/10 text-[9px] font-bold text-slate-200 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onChangeEq(DEFAULT_EQ)}
            className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Sliders className="h-2.5 w-2.5" />
            <span>Reset EQ Base</span>
          </button>
        </div>
      )}
    </div>
  );
}

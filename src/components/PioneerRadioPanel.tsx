import React, { useRef, useState } from 'react';
import {
  Cpu,
  FolderOpen,
  Music2,
  Pause,
  Play,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LoadedTrack } from '../audio/chipeoAudio';
import { PIONEER_PANEL_PATH } from '../game/catalog';
import { EqSettings } from '../game/types';

interface PioneerRadioPanelProps {
  eq: EqSettings;
  voltage: number;
  sensitivity: number;
  streamingMode: boolean;
  isPlaying: boolean;
  tracks: LoadedTrack[];
  activeTrackId: string | null;
  onChangeEq: (next: EqSettings) => void;
  onTogglePlay: () => void;
  onSelectTrack: (track: LoadedTrack) => void;
  onAddFolderTracks: (files: FileList) => void;
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

export function PioneerRadioPanel({
  eq,
  voltage,
  sensitivity,
  streamingMode,
  isPlaying,
  tracks,
  activeTrackId,
  onChangeEq,
  onTogglePlay,
  onSelectTrack,
  onAddFolderTracks,
}: PioneerRadioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const [dialSpinPulse, setDialSpinPulse] = useState(false);
  const [showDsp, setShowDsp] = useState(false);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];

  const handleOpenFolderChooser = () => {
    fileInputRef.current?.click();
  };

  const handleDialStep = (delta: number) => {
    const scaled = Math.round(delta * sensitivity);
    const nextVol = Math.max(0, Math.min(100, eq.volume + scaled));
    onChangeEq({ ...eq, volume: nextVol, muted: false });
    setDialSpinPulse(true);
    window.setTimeout(() => setDialSpinPulse(false), 180);
  };

  const handleCyclePreset = () => {
    const nextIdx = (presetIdx + 1) % EQ_PRESETS.length;
    setPresetIdx(nextIdx);
    onChangeEq({ ...eq, ...EQ_PRESETS[nextIdx].values, eqBypass: false });
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFolderTracks(e.target.files);
    }
    e.target.value = '';
  };

  const dialRotationDeg = (eq.volume / 100) * 270 - 135;

  return (
    <section
      className="rounded-2xl bg-[#0C111D] border border-slate-800 p-4 flex flex-col gap-3.5"
      data-testid="pioneer-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-white leading-none">
            RACK PIONEER &amp; ATEQ
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Toca &ldquo;ELEGIR CARPETA&rdquo; en el radio para cargar tus canciones reales
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePlay}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            isPlaying
              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
          }`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{isPlaying ? 'Pausar' : 'Sonar Música'}</span>
        </button>
      </div>

      {/* Real Pioneer Panel Image with Live Interactive Hotspots */}
      <div className="relative w-full max-w-[360px] mx-auto rounded-xl overflow-hidden border border-slate-700/80 shadow-xl select-none bg-black">
        <img
          src={PIONEER_PANEL_PATH}
          alt="Panel real de radio Pioneer y ecualizadores ATEQ"
          referrerPolicy="no-referrer"
          className="w-full h-auto block"
        />

        {/* Live 14.5V Voltmeter overlay aligned to top-left digital display */}
        <div
          className="pointer-events-none absolute left-[4.8%] top-[1.8%] w-[22.5%] h-[10.5%] rounded bg-[#070B12]/95 flex items-center justify-center border border-sky-500/30"
          aria-hidden="true"
        >
          <span
            className={`font-mono-num text-lg sm:text-xl font-bold tracking-wider ${
              voltage < 12.2 ? 'text-amber-400' : 'text-sky-400'
            }`}
          >
            {voltage.toFixed(1)}
          </span>
        </div>

        {/* Pioneer Rotary Volume Dial Hotspot */}
        <button
          type="button"
          onClick={() => handleDialStep(8)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleDialStep(-8);
          }}
          aria-label="Perilla principal de volumen Pioneer (clic para subir volumen)"
          title="Clic para subir volumen · Clic derecho para bajar"
          className={`absolute left-[11%] top-[32.5%] w-[17.5%] h-[15%] rounded-full cursor-pointer transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-sky-400 ${
            dialSpinPulse ? 'scale-105 ring-2 ring-sky-400' : 'hover:ring-2 hover:ring-sky-400/70'
          }`}
          style={{ transform: `rotate(${dialRotationDeg}deg)` }}
        >
          <span className="sr-only">Subir volumen Pioneer</span>
        </button>

        {/* Pioneer "SRC / PLAY" Hotspot */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label="Botón SRC del radio Pioneer para reproducir o pausar música"
          title="SRC: Reproducir / Pausar"
          className="absolute left-[29%] top-[44.5%] w-[10%] h-[6.5%] rounded cursor-pointer hover:bg-sky-400/25 focus-visible:outline-2 focus-visible:outline-sky-400"
        />

        {/* Pioneer "BAND / EQ" Hotspot */}
        <button
          type="button"
          onClick={handleCyclePreset}
          aria-label="Botón BAND/EQ del radio Pioneer para cambiar ecualización"
          title="EQ: Cambiar preset de sonido"
          className="absolute left-[37%] top-[36.5%] w-[8.5%] h-[6.5%] rounded cursor-pointer hover:bg-amber-400/25 focus-visible:outline-2 focus-visible:outline-sky-400"
        />

        {/* ATEQ "AUX S/W" Hotspot */}
        <button
          type="button"
          onClick={() => onChangeEq({ ...eq, eqBypass: !eq.eqBypass })}
          aria-label="Botón AUX S/W del ecualizador ATEQ"
          title="AUX S/W: Activar o hacer bypass del EQ"
          className="absolute left-[27.5%] top-[69%] w-[8%] h-[7%] rounded cursor-pointer hover:bg-emerald-400/25 focus-visible:outline-2 focus-visible:outline-sky-400"
        />

        {/* Pioneer "ELEGIR CARPETA" Real Radio Button Hotspot */}
        <button
          type="button"
          onClick={handleOpenFolderChooser}
          data-testid="pioneer-elegir-carpeta"
          aria-label="Botón Elegir Carpeta del radio Pioneer para cargar tus canciones"
          title="Toca aquí para cargar canciones desde tu dispositivo"
          className="group absolute left-[48%] top-[28.5%] w-[43%] h-[11.5%] rounded bg-[#0A1322]/75 hover:bg-sky-500/25 border border-sky-400/50 hover:border-sky-300 flex flex-col items-center justify-center px-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <span className="font-mono-num text-[10px] font-bold text-sky-200 tracking-wide truncate w-full text-center leading-tight">
            {isPlaying && activeTrack ? `▶ ${activeTrack.title}` : 'ELEGIR CARPETA'}
          </span>
          <span className="text-[9px] text-sky-400/90 group-hover:text-white leading-tight">
            {eq.muted
              ? 'SILENCIADO (MUTE)'
              : streamingMode
                ? 'Modo Stream · Vol •••'
                : `Tocar radio · Vol ${eq.volume}%`}
          </span>
        </button>
      </div>

      {/* Hidden real file & directory pickers */}
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
        // @ts-expect-error webkitdirectory is supported in Chromium/WebKit for picking an entire music folder
        webkitdirectory=""
        onChange={handleFilePick}
        className="sr-only"
        aria-label="Seleccionar carpeta de música completa"
      />

      {/* Quick Folder + Preset + AUX S/W + Mute + Crossover Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenFolderChooser}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Music2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Cargar MP3</span>
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>Carpeta</span>
          </button>
          <button
            type="button"
            onClick={handleCyclePreset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{EQ_PRESETS[presetIdx].name}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="aux-sw-toggle"
            aria-pressed={!eq.eqBypass}
            onClick={() => onChangeEq({ ...eq, eqBypass: !eq.eqBypass })}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0 border ${
              eq.eqBypass
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            }`}
          >
            AUX S/W: {eq.eqBypass ? 'OFF' : 'ON'}
          </button>

          <button
            type="button"
            data-testid="mute-toggle"
            aria-pressed={eq.muted}
            onClick={() => onChangeEq({ ...eq, muted: !eq.muted })}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0 border ${
              eq.muted
                ? 'bg-red-500/25 border-red-500/60 text-red-200'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {eq.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{eq.muted ? 'MUTE' : 'Audio'}</span>
          </button>

          <button
            type="button"
            aria-expanded={showDsp}
            onClick={() => setShowDsp((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0 border ${
              showDsp || eq.crossoverEnabled
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>DSP</span>
          </button>
        </div>
      </div>

      {/* Expandable Crossover / DSP Processor Panel */}
      {showDsp && (
        <div
          className="rounded-xl bg-[#070B12] border border-sky-500/30 p-3 space-y-2.5"
          data-testid="dsp-crossover-panel"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-white">Crossover y Procesador DSP</p>
              <p className="text-[11px] text-slate-400">
                Protege medios/drivers y limpia el corte de subgraves
              </p>
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

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <label htmlFor="dsp-lpf-sub" className="text-slate-300 font-semibold">
                  Sub LPF
                </label>
                <span className="font-mono-num text-amber-400 font-bold">
                  {streamingMode ? '••• Hz' : `${eq.lpfSubHz} Hz`}
                </span>
              </div>
              <input
                id="dsp-lpf-sub"
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
                <label htmlFor="dsp-hpf-voice" className="text-slate-300 font-semibold">
                  Voz HPF
                </label>
                <span className="font-mono-num text-emerald-400 font-bold">
                  {streamingMode ? '••• Hz' : `${eq.hpfVoiceHz} Hz`}
                </span>
              </div>
              <input
                id="dsp-hpf-voice"
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

      {/* Tactile Volume + Sub Level + 7-Band ATEQ Equalizer */}
      <div className="rounded-xl bg-[#080C14] border border-slate-800/90 p-3.5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="eq-volume" className="text-slate-300 font-semibold flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5 text-sky-400" />
                <span>Volumen</span>
              </label>
              <span className="font-mono-num font-bold text-sky-400">
                {streamingMode ? '•••' : `${eq.volume}%`}
              </span>
            </div>
            <input
              id="eq-volume"
              type="range"
              min={0}
              max={100}
              step={Math.max(1, Math.round(1 * sensitivity))}
              value={eq.volume}
              onChange={(e) => onChangeEq({ ...eq, volume: Number(e.target.value), muted: false })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="eq-sublevel" className="text-slate-300 font-semibold">
                Sub Level (Bajo)
              </label>
              <span className="font-mono-num font-bold text-amber-400">
                {streamingMode ? '•••' : `${eq.subLevel}%`}
              </span>
            </div>
            <input
              id="eq-sublevel"
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

        {/* 7-band EQ */}
        <div
          className={`grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-800/70 transition-opacity ${
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

      {/* Playlist selector */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Lista de Reproducción ({tracks.length})
        </p>
        <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
          {tracks.map((track) => {
            const active = track.id === activeTrackId;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onSelectTrack(track)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-500/20 border border-sky-500/50 text-white'
                    : 'bg-[#080C14] hover:bg-slate-800/80 border border-slate-800 text-slate-300'
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
      </div>
    </section>
  );
}

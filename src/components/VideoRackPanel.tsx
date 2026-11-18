import React, { useEffect, useRef, useState } from 'react';
import {
  BatteryCharging,
  Cpu,
  FolderOpen,
  KeyRound,
  Lock,
  Menu,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Search,
  Settings,
  Settings2,
  Shield,
  ShoppingBag,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioFrameMetrics, chipeoAudio, LoadedTrack } from '../audio/chipeoAudio';
import { DEFAULT_EQ } from '../game/catalog';
import { AppScreen, EqSettings, RackFinish, RackShape, SavedEqPreset } from '../game/types';

interface VideoRackPanelProps {
  eq: EqSettings;
  voltage: number;
  currentDb: number;
  sensitivity: number;
  streamingMode: boolean;
  isPlaying: boolean;
  isClipping: boolean;
  accentColor: string;
  rackFinish?: RackFinish;
  rackShape?: RackShape;
  stationary?: boolean;
  compact?: boolean;
  tracks: LoadedTrack[];
  activeTrackId: string | null;
  savedPresets?: SavedEqPreset[];
  metricsRef?: React.MutableRefObject<AudioFrameMetrics>;
  onChangeEq: (next: EqSettings) => void;
  onTogglePlay: () => void;
  onSelectTrack: (track: LoadedTrack) => void;
  onAddFolderTracks: (files: FileList) => void;
  onSaveEqSlot?: (slotIndex: number, name: string, eqToSave: EqSettings) => void;
  onQuickRechargeBattery?: () => void;
  onNavigateScreen?: (screen: AppScreen) => void;
  onOpenOptions?: () => void;
  onOpenReferral?: () => void;
}

interface RackRotaryKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  ringColor: string;
  size?: 'sm' | 'md' | 'lg';
  sensitivity: number;
  tooltipTitle: string;
  formatValue?: (v: number) => string;
  onChange: (next: number) => void;
  onHoverInfo?: (text: string | null) => void;
}

function RackRotaryKnob({
  label,
  value,
  min,
  max,
  step = 1,
  ringColor,
  size = 'sm',
  sensitivity,
  tooltipTitle,
  onChange,
  onHoverInfo,
}: RackRotaryKnobProps) {
  const dragStartRef = useRef<{ y: number; startVal: number; moved: boolean } | null>(null);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const angle = -135 + ratio * 270;

  const clampVal = (next: number) => {
    const stepped = Math.round(next / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const sizeClass =
    size === 'lg'
      ? 'h-9 w-9 sm:h-10 sm:w-10'
      : size === 'md'
        ? 'h-6 w-6 sm:h-9 sm:w-9'
        : 'h-5 w-5 sm:h-7 sm:w-7';

  const capClass =
    size === 'lg'
      ? 'h-7 w-7 sm:h-7.5 sm:w-7.5'
      : size === 'md'
        ? 'h-4.5 w-4.5 sm:h-6.5 sm:w-6.5'
        : 'h-3.5 w-3.5 sm:h-5 sm:w-5';

  return (
    <div className="flex flex-col items-center min-w-0 select-none group">
      <span className="text-[5.5px] sm:text-[7.5px] font-bold tracking-tighter text-slate-200 uppercase leading-none mb-0.5 whitespace-nowrap">
        {label}
      </span>
      <button
        type="button"
        aria-label={`${tooltipTitle}: clic izquierdo sube, clic derecho baja o rueda`}
        title={`${tooltipTitle}: clic izq/der o rueda`}
        onMouseEnter={() => onHoverInfo?.(`${tooltipTitle}: clic izq/der o rueda`)}
        onMouseLeave={() => onHoverInfo?.(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          onChange(clampVal(value - step));
        }}
        onWheel={(e) => {
          e.preventDefault();
          const dir = e.deltaY < 0 ? 1 : -1;
          onChange(clampVal(value + dir * step));
        }}
        onPointerDown={(e) => {
          if (e.button === 2) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragStartRef.current = { y: e.clientY, startVal: value, moved: false };
        }}
        onPointerMove={(e) => {
          if (!dragStartRef.current) return;
          const dy = dragStartRef.current.y - e.clientY;
          if (Math.abs(dy) > 3) {
            dragStartRef.current.moved = true;
            const span = max - min;
            const delta = (dy / 90) * span * Math.max(0.4, sensitivity);
            onChange(clampVal(dragStartRef.current.startVal + delta));
          }
        }}
        onPointerUp={(e) => {
          const ds = dragStartRef.current;
          dragStartRef.current = null;
          if (ds && !ds.moved && e.button === 0) {
            onChange(clampVal(value + step));
          }
        }}
        className={`relative ${sizeClass} rounded-full flex items-center justify-center cursor-ns-resize focus:outline-none focus:ring-1 focus:ring-white/60 transition-transform active:scale-95`}
        style={{
          background: `radial-gradient(circle at 50% 50%, #10141C 62%, ${ringColor} 66%, #090C12 100%)`,
          boxShadow: `0 0 8px ${ringColor}55, inset 0 1px 2px rgba(255,255,255,0.2)`,
        }}
      >
        {/* Subtle tick ring */}
        <span
          className="pointer-events-none absolute inset-0.5 rounded-full border border-dashed border-white/20"
          aria-hidden="true"
        />
        {/* Inner brushed cap */}
        <span
          className={`relative ${capClass} rounded-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600/80 shadow-inner flex items-center justify-center`}
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 h-2 w-[2px] rounded-full bg-white shadow-[0_0_3px_#fff]" />
        </span>
      </button>
    </div>
  );
}

const BAND_CONFIG: {
  key: keyof Pick<EqSettings, 'hz50' | 'hz125' | 'hz315' | 'hz750' | 'khz2_2' | 'khz6' | 'khz16'>;
  label: string;
}[] = [
  { key: 'hz50', label: '50Hz' },
  { key: 'hz125', label: '125Hz' },
  { key: 'hz315', label: '315Hz' },
  { key: 'hz750', label: '750Hz' },
  { key: 'khz2_2', label: '2.2KHz' },
  { key: 'khz6', label: '6KHz' },
  { key: 'khz16', label: '16KHz' },
];

export function VideoRackPanel({
  eq,
  voltage,
  currentDb,
  sensitivity,
  streamingMode,
  isPlaying,
  isClipping,
  accentColor,
  rackFinish = 'wood',
  rackShape = 'rounded',
  stationary = true,
  tracks,
  activeTrackId,
  savedPresets = [],
  metricsRef,
  onChangeEq,
  onTogglePlay,
  onSelectTrack,
  onAddFolderTracks,
  onSaveEqSlot,
  onQuickRechargeBattery,
  onNavigateScreen,
  onOpenOptions,
  onOpenReferral,
}: VideoRackPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const rackShellRef = useRef<HTMLDivElement | null>(null);

  const [rackScale, setRackScale] = useState(1.0);
  const [showNavPopover, setShowNavPopover] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'none' | 'playlist' | 'dsp'>('none');
  const [oledNotice, setOledNotice] = useState<string | null>(null);
  const [hoverTip, setHoverTip] = useState<string | null>(null);
  const [rechargeFlash, setRechargeFlash] = useState(false);
  const [playbackFrac, setPlaybackFrac] = useState(0);
  const [timeText, setTimeText] = useState('0:00 / 0:00');

  const oledTimeoutRef = useRef<number | null>(null);

  const triggerOledNotice = (text: string) => {
    setOledNotice(text);
    if (oledTimeoutRef.current) window.clearTimeout(oledTimeoutRef.current);
    oledTimeoutRef.current = window.setTimeout(() => setOledNotice(null), 1850);
  };

  useEffect(() => {
    return () => {
      if (oledTimeoutRef.current) window.clearTimeout(oledTimeoutRef.current);
    };
  }, []);

  // Poll playback timer cleanly at 4Hz
  useEffect(() => {
    const fmt = (sec: number) => {
      const s = Math.max(0, Math.floor(sec));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    const timer = window.setInterval(() => {
      const t = chipeoAudio.getPlaybackTiming();
      if (t.duration > 0) {
        setPlaybackFrac(Math.max(0, Math.min(1, t.currentTime / t.duration)));
        setTimeText(`${fmt(t.currentTime)} / ${fmt(t.duration)}`);
      } else {
        setPlaybackFrac(0);
        setTimeText('0:00 / 0:00');
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  // Subtle bass vibration ONLY when stationary is false
  useEffect(() => {
    if (stationary || !metricsRef) {
      if (rackShellRef.current) {
        rackShellRef.current.style.transform = `scale(${rackScale})`;
      }
      return;
    }
    let raf = 0;
    const tick = () => {
      const bass = isPlaying ? metricsRef.current.bassEnergy : 0;
      const sx = bass > 0.25 ? (Math.random() - 0.5) * bass * 3 : 0;
      const sy = bass > 0.25 ? (Math.random() - 0.5) * bass * 2.5 : 0;
      if (rackShellRef.current) {
        rackShellRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${rackScale})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stationary, isPlaying, metricsRef, rackScale]);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFolderTracks(e.target.files);
    }
    e.target.value = '';
  };

  const stepTrack = (dir: -1 | 1) => {
    if (tracks.length === 0) return;
    const curIdx = Math.max(
      0,
      tracks.findIndex((t) => t.id === activeTrack?.id)
    );
    const nextIdx = (curIdx + dir + tracks.length) % tracks.length;
    onSelectTrack(tracks[nextIdx]);
    triggerOledNotice(tracks[nextIdx].title.toUpperCase());
  };

  const updateEqWithAlert = (patch: Partial<EqSettings>, alertText: string) => {
    onChangeEq({ ...eq, ...patch });
    triggerOledNotice(alertText);
  };

  const handleVoltmeterRecharge = () => {
    onQuickRechargeBattery?.();
    setRechargeFlash(true);
    triggerOledNotice('BATERIA 14.5V OK');
    window.setTimeout(() => setRechargeFlash(false), 2000);
  };

  const shapeRadius =
    rackShape === 'square' ? 'rounded-sm' : rackShape === 'bevel' ? 'rounded-xl' : 'rounded-2xl';

  const frameBorderStyle: React.CSSProperties =
    rackFinish === 'carbon'
      ? {
          background: 'linear-gradient(180deg, #1E2430 0%, #11151E 100%)',
          borderColor: '#475569',
        }
      : rackFinish === 'neon'
        ? {
            background: 'linear-gradient(180deg, #101522 0%, #090C14 100%)',
            borderColor: accentColor,
            boxShadow: `0 0 28px ${accentColor}35`,
          }
        : rackFinish === 'brushed'
          ? {
              background: 'linear-gradient(180deg, #222733 0%, #141821 100%)',
              borderColor: '#64748B',
            }
          : {
              // Warm Dominican studio wood trim matching reference video
              background: 'linear-gradient(180deg, #9C7644 0%, #7C5B31 55%, #654723 100%)',
              borderColor: '#C59A62',
            };

  const pioneerVolDisplay = Math.round((eq.volume / 100) * 30);

  const navItems: {
    id: string;
    label: string;
    icon: typeof Trophy;
    color: string;
    action: () => void;
  }[] = [
    {
      id: 'studio',
      label: 'Control Fijo',
      icon: Lock,
      color: 'text-emerald-400',
      action: () => onNavigateScreen?.('studio'),
    },
    {
      id: 'progress',
      label: 'Eventos Especiales',
      icon: Trophy,
      color: 'text-amber-400',
      action: () => onNavigateScreen?.('progress'),
    },
    {
      id: 'shop',
      label: 'Tienda y Taller',
      icon: ShoppingBag,
      color: 'text-sky-400',
      action: () => onNavigateScreen?.('shop'),
    },
    {
      id: 'battle',
      label: 'Batalla Online',
      icon: Swords,
      color: 'text-red-400',
      action: () => onNavigateScreen?.('battle'),
    },
    {
      id: 'clans',
      label: 'Clanes (50k)',
      icon: Shield,
      color: 'text-sky-300',
      action: () => onNavigateScreen?.('clans'),
    },
    {
      id: 'options',
      label: 'Opciones Rack 3D',
      icon: Settings2,
      color: 'text-amber-300',
      action: () => onOpenOptions?.(),
    },
    {
      id: 'referral',
      label: 'Referido / VIP',
      icon: KeyRound,
      color: 'text-emerald-300',
      action: () => onOpenReferral?.(),
    },
    {
      id: 'settings',
      label: 'Ajustes y E2E',
      icon: Settings,
      color: 'text-slate-300',
      action: () => onNavigateScreen?.('settings'),
    },
  ];

  return (
    <div
      className="w-full flex flex-col items-center select-none"
      data-testid="pioneer-panel"
    >
      {/* Hidden audio file & folder inputs */}
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

      <div
        ref={rackShellRef}
        style={{
          transform: `scale(${rackScale})`,
          transformOrigin: 'top center',
          ...frameBorderStyle,
        }}
        className={`relative w-full max-w-[530px] border-2 p-2 sm:p-2.5 shadow-[0_24px_55px_rgba(0,0,0,0.88)] transition-transform duration-150 ${shapeRadius}`}
      >
        {/* Hover Tooltip Banner cleanly anchored at top edge of rack */}
        {hoverTip && (
          <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 z-50 rounded-md bg-[#090D16]/95 border border-white/25 px-2.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap shadow-xl">
            {hoverTip}
          </div>
        )}
        {/* Inner matte-black studio rack cavity */}
        <div className="rounded-xl bg-[#0B0D12] border border-black/80 p-2 sm:p-2.5 space-y-2 shadow-inner">
          {/* 1. TOP BEZEL: Digital Blue Voltmeter + ≡ Menú + Quick Audio Controls */}
          <div className="relative flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            {/* Blue LED Voltmeter (clickable for 14.5V recharge) */}
            <button
              type="button"
              onClick={handleVoltmeterRecharge}
              aria-label={`Voltímetro ${voltage.toFixed(1)}V, clic para recargar batería`}
              title="Clic para recargar baterías 14.5V"
              className="rounded-lg bg-[#050810] border border-slate-700/90 px-3 py-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.95)] cursor-pointer hover:border-sky-400/70 transition-colors"
            >
              <span
                className={`font-mono-num text-xl sm:text-2xl font-black tracking-wider leading-none ${
                  voltage < 12.2
                    ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                    : 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.85)]'
                }`}
              >
                {voltage.toFixed(1)}
              </span>
            </button>

            {/* Center: ≡ Menú button or "Recarga completa." pill */}
            <div className="relative flex items-center gap-2">
              {rechargeFlash ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C1D18] border border-emerald-500/60 text-xs font-bold text-emerald-300 shadow-lg">
                  <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Recarga completa.</span>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="rack-menu-toggle"
                  onClick={() => setShowNavPopover((p) => !p)}
                  aria-expanded={showNavPopover}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161B26] hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer shadow"
                >
                  <Menu className="h-3.5 w-3.5 text-slate-300" />
                  <span>Menú</span>
                </button>
              )}

              {showNavPopover && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-10 z-50 w-64 rounded-xl bg-[#0D1322] border border-white/15 p-2.5 shadow-2xl grid grid-cols-2 gap-1.5"
                  role="menu"
                  aria-label="Menú del rack"
                >
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShowNavPopover(false);
                          item.action();
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#080C15] hover:bg-slate-800 border border-white/10 text-left text-[11px] font-bold text-white cursor-pointer"
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Play/Pause + Mute */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pausar audio' : 'Sonar música'}
                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                  isPlaying
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                }`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                data-testid="mute-toggle"
                onClick={() => updateEqWithAlert({ muted: !eq.muted }, eq.muted ? 'SONIDO ON' : 'MUTE')}
                aria-label={eq.muted ? 'Activar sonido' : 'Silenciar'}
                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                  eq.muted
                    ? 'bg-red-500/25 border-red-500/60 text-red-300'
                    : 'bg-[#161B26] border-white/15 text-slate-300 hover:text-white'
                }`}
              >
                {eq.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 2. THREE STACKED BLUE-RING ATEQ 7-BAND EQUALIZER ROWS (Video Match) */}
          <div className="space-y-1.5">
            {[1, 2, 3].map((rowNum) => (
              <div
                key={rowNum}
                className="rounded-md bg-gradient-to-b from-[#131722] to-[#0A0D13] border border-white/10 px-1.5 py-1.5 shadow-inner"
              >
                <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                  {/* SUB LEVEL */}
                  <RackRotaryKnob
                    label="SUB LEVEL"
                    value={eq.subLevel}
                    min={0}
                    max={100}
                    step={2}
                    ringColor={accentColor}
                    size="md"
                    sensitivity={sensitivity}
                    tooltipTitle="Sub Level"
                    onHoverInfo={setHoverTip}
                    onChange={(v) =>
                      updateEqWithAlert({ subLevel: v }, `ATEQ${rowNum} SUB ${v}%`)
                    }
                  />

                  {/* VOLUME */}
                  <RackRotaryKnob
                    label="VOLUME"
                    value={eq.volume}
                    min={0}
                    max={100}
                    step={2}
                    ringColor={accentColor}
                    size="md"
                    sensitivity={sensitivity}
                    tooltipTitle="Volumen"
                    onHoverInfo={setHoverTip}
                    onChange={(v) =>
                      updateEqWithAlert({ volume: v }, `VOLUME ${Math.round((v / 100) * 30)}`)
                    }
                  />

                  {/* AUX S/W Push Button + LED */}
                  <div className="flex flex-col items-center min-w-0 px-0.5">
                    <span className="text-[5.5px] sm:text-[7px] font-bold tracking-tighter text-slate-200 uppercase leading-none mb-0.5 whitespace-nowrap">
                      AUX S/W
                    </span>
                    <button
                      type="button"
                      data-testid={rowNum === 1 ? 'aux-sw-toggle' : undefined}
                      onClick={() =>
                        updateEqWithAlert(
                          { eqBypass: !eq.eqBypass },
                          !eq.eqBypass ? 'EQ BYPASS (FLAT)' : 'EQ ACTIVO'
                        )
                      }
                      aria-pressed={eq.eqBypass}
                      aria-label={`AUX S/W fila ${rowNum}`}
                      title="Activar / desactivar bypass EQ"
                      className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-500 flex items-center justify-center cursor-pointer active:scale-95 shadow"
                    >
                      <span
                        className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${
                          eq.eqBypass
                            ? 'bg-amber-400 shadow-[0_0_6px_#F59E0B]'
                            : 'bg-sky-400 shadow-[0_0_6px_#38BDF8]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* AUX IN 3.5mm Jack (Click to load MP3s) */}
                  <div className="flex flex-col items-center min-w-0 px-0.5">
                    <span className="text-[5.5px] sm:text-[7px] font-bold tracking-tighter text-slate-200 uppercase leading-none mb-0.5 whitespace-nowrap">
                      AUX IN
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={`Entrada AUX fila ${rowNum}, cargar audio`}
                      title="Cargar canciones MP3 por AUX"
                      className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-600 flex items-center justify-center cursor-pointer hover:brightness-110"
                    >
                      <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-black border border-slate-700" />
                    </button>
                  </div>

                  {/* FADER */}
                  <RackRotaryKnob
                    label="FADER"
                    value={eq.fader}
                    min={-50}
                    max={50}
                    step={5}
                    ringColor={accentColor}
                    size="sm"
                    sensitivity={sensitivity}
                    tooltipTitle="Fader"
                    onHoverInfo={setHoverTip}
                    onChange={(v) =>
                      updateEqWithAlert({ fader: v }, `ATEQ${rowNum} FADER ${v >= 0 ? '+' : ''}${v}`)
                    }
                  />

                  {/* 7 Frequency Bands */}
                  {BAND_CONFIG.map((band) => (
                    <RackRotaryKnob
                      key={band.key}
                      label={band.label}
                      value={eq[band.key]}
                      min={-12}
                      max={12}
                      step={1}
                      ringColor={accentColor}
                      size="sm"
                      sensitivity={sensitivity}
                      tooltipTitle={band.label}
                      onHoverInfo={setHoverTip}
                      onChange={(v) =>
                        updateEqWithAlert(
                          { [band.key]: v },
                          `ATEQ${rowNum} ${band.label.toUpperCase()} ${v >= 0 ? '+' : ''}${v} dB`
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 3. PIONEER DEH HEADUNIT (Exact Video Faceplate & USB/DSP OLED) */}
          <div className="relative rounded-xl bg-gradient-to-b from-[#202633] via-[#121620] to-[#0D1018] border border-slate-600/70 p-2 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              {/* Left Rotary Volume + Directional Arrows + Function Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative flex items-center justify-center p-1">
                  {/* Directional Ring Buttons */}
                  <button
                    type="button"
                    onClick={() => stepTrack(-1)}
                    aria-label="Pista anterior"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-3.5 rounded-l bg-slate-700 hover:bg-slate-600 text-[8px] font-bold text-white flex items-center justify-center cursor-pointer z-10"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTrack(1)}
                    aria-label="Siguiente pista"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-3.5 rounded-r bg-slate-700 hover:bg-slate-600 text-[8px] font-bold text-white flex items-center justify-center cursor-pointer z-10"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nv = Math.min(100, eq.volume + 4);
                      updateEqWithAlert({ volume: nv }, `VOLUME ${Math.round((nv / 100) * 30)}`);
                    }}
                    aria-label="Subir volumen Pioneer"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-3.5 w-5 rounded-t bg-slate-700 hover:bg-slate-600 text-[8px] font-bold text-white flex items-center justify-center cursor-pointer z-10"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nv = Math.max(0, eq.volume - 4);
                      updateEqWithAlert({ volume: nv }, `VOLUME ${Math.round((nv / 100) * 30)}`);
                    }}
                    aria-label="Bajar volumen Pioneer"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-3.5 w-5 rounded-b bg-slate-700 hover:bg-slate-600 text-[8px] font-bold text-white flex items-center justify-center cursor-pointer z-10"
                  >
                    ▼
                  </button>

                  {/* Big Central Pioneer Rotary Dial */}
                  <div className="p-2">
                    <RackRotaryKnob
                      label=""
                      value={eq.volume}
                      min={0}
                      max={100}
                      step={2}
                      ringColor={accentColor}
                      size="lg"
                      sensitivity={sensitivity}
                      tooltipTitle="Volumen Pioneer"
                      onHoverInfo={setHoverTip}
                      onChange={(v) =>
                        updateEqWithAlert({ volume: v }, `VOLUME ${Math.round((v / 100) * 30)}`)
                      }
                    />
                  </div>
                </div>

                {/* ↩ 🔍 SRC BAND EQ Mini Keys */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeEq(DEFAULT_EQ);
                        triggerOledNotice('EQ RESET DEFAULT');
                      }}
                      title="Restablecer EQ"
                      aria-label="Restablecer ecualizador"
                      className="h-5 w-6 rounded bg-[#181D29] hover:bg-slate-700 border border-white/15 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      ↩
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDrawerTab((t) => (t === 'playlist' ? 'none' : 'playlist'))
                      }
                      title="Abrir lista de canciones y carpeta"
                      aria-label="Buscar canciones en lista"
                      className={`h-5 w-6 rounded border text-[10px] flex items-center justify-center cursor-pointer ${
                        drawerTab === 'playlist'
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-[#181D29] hover:bg-slate-700 border-white/15 text-slate-200'
                      }`}
                    >
                      <Search className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerTab((t) => (t === 'dsp' ? 'none' : 'dsp'));
                      triggerOledNotice(eq.dspMode === 'processor' ? 'PROCESADOR DSP' : 'CROSSOVER');
                    }}
                    className={`h-4 px-1.5 rounded border text-[8px] font-extrabold tracking-wide cursor-pointer ${
                      drawerTab === 'dsp'
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-[#181D29] hover:bg-slate-700 border-white/15 text-sky-300'
                    }`}
                  >
                    EQ / DSP
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onTogglePlay}
                      className="h-4.5 px-1.5 rounded bg-[#181D29] hover:bg-slate-700 border border-white/15 text-[8px] font-extrabold text-white cursor-pointer"
                    >
                      SRC
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateEqWithAlert(
                          { crossoverEnabled: !eq.crossoverEnabled },
                          !eq.crossoverEnabled ? 'DSP ON' : 'DSP OFF'
                        )
                      }
                      className={`h-4.5 px-1.5 rounded border text-[8px] font-extrabold cursor-pointer ${
                        eq.crossoverEnabled
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-[#181D29] border-white/15 text-slate-400'
                      }`}
                    >
                      BAND
                    </button>
                  </div>
                </div>
              </div>

              {/* Center Wide Animated USB/DSP OLED Display */}
              <div className="relative flex-1 min-w-0 rounded-lg bg-[#051226] border border-sky-400/40 px-2.5 py-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.95)] overflow-hidden">
                {/* Top OLED row */}
                <div className="flex items-center justify-between gap-1 text-[9px] leading-none">
                  <div className="flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 font-extrabold text-sky-300">
                      USB
                    </span>
                    <span
                      className={`px-1 py-0.5 rounded border font-extrabold ${
                        eq.crossoverEnabled
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                    >
                      DSP
                    </span>
                    {isClipping && isPlaying && (
                      <span className="px-1 py-0.5 rounded bg-red-500/30 border border-red-400 font-extrabold text-red-300">
                        CLIP
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid="pioneer-elegir-carpeta"
                    onClick={() => folderInputRef.current?.click()}
                    title="Tocar para cargar tu carpeta de música"
                    className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/40 text-[8px] font-extrabold tracking-wide text-sky-200 cursor-pointer truncate"
                  >
                    MEMORIA DE CARPETA
                  </button>
                </div>

                {/* Middle OLED Track / Knob Value Display */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono-num text-xs sm:text-sm font-black tracking-wide text-sky-100 truncate drop-shadow-[0_0_6px_rgba(56,189,248,0.65)]">
                    {oledNotice ??
                      (isPlaying
                        ? `▶ ${activeTrack?.title.toUpperCase() ?? 'LISTO'}`
                        : `PAUSA · ${activeTrack?.title.toUpperCase() ?? 'ELEGIR CARPETA'}`)}
                  </p>
                  <span className="font-mono-num text-[10px] font-extrabold text-sky-300 shrink-0">
                    {streamingMode ? 'LIVE' : `${currentDb} dB`}
                  </span>
                </div>

                {/* Bottom OLED Scrubber & Info */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-slate-800/90 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.max(4, Math.round(playbackFrac * 100))}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                  <span className="font-mono-num text-[8px] text-sky-300/80 shrink-0">
                    {oledNotice ? `VOL ${pioneerVolDisplay}` : timeText}
                  </span>
                </div>
              </div>

              {/* Right AUX + USB Slot Graphic */}
              <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 pl-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Cargar MP3 individuales"
                  aria-label="Cargar canciones MP3"
                  className="px-1.5 py-0.5 rounded bg-[#181D29] hover:bg-slate-700 border border-white/15 text-[8px] font-bold text-slate-200 cursor-pointer"
                >
                  AUX
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  title="Cargar carpeta USB completa"
                  aria-label="Cargar carpeta USB de canciones"
                  className="h-5 w-8 rounded bg-[#070A10] hover:border-sky-400 border border-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <span className="h-1.5 w-5 rounded-sm bg-sky-400/70" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. BOTTOM RED-RING ATEQ PRE-AMP UNIT (Video Match) */}
          <div className="rounded-md bg-gradient-to-b from-[#151821] to-[#0A0C12] border border-red-500/30 px-1.5 py-1.5 shadow-inner">
            <div className="flex items-center justify-between gap-0.5 sm:gap-1">
              <RackRotaryKnob
                label="VOL"
                value={eq.redVol ?? 105}
                min={40}
                max={140}
                step={5}
                ringColor="#EF4444"
                size="md"
                sensitivity={sensitivity}
                tooltipTitle="ATEQ Red VOL"
                onHoverInfo={setHoverTip}
                onChange={(v) => updateEqWithAlert({ redVol: v }, `ATEQ1 VOL ${v}%`)}
              />

              <RackRotaryKnob
                label="SUB"
                value={eq.redSub ?? 100}
                min={40}
                max={140}
                step={5}
                ringColor="#EF4444"
                size="sm"
                sensitivity={sensitivity}
                tooltipTitle="ATEQ Red SUB"
                onHoverInfo={setHoverTip}
                onChange={(v) => updateEqWithAlert({ redSub: v }, `ATEQ1 SUB ${v}%`)}
              />

              <RackRotaryKnob
                label="FADER"
                value={eq.fader}
                min={-50}
                max={50}
                step={5}
                ringColor="#EF4444"
                size="sm"
                sensitivity={sensitivity}
                tooltipTitle="Pre-Amp Fader"
                onHoverInfo={setHoverTip}
                onChange={(v) =>
                  updateEqWithAlert({ fader: v }, `FADER ${v >= 0 ? '+' : ''}${v}`)
                }
              />

              {/* INPUT Push Button + LED */}
              <div className="flex flex-col items-center min-w-0 px-0.5">
                <span className="text-[5.5px] sm:text-[7px] font-bold tracking-tighter text-slate-200 uppercase leading-none mb-0.5 whitespace-nowrap">
                  INPUT
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateEqWithAlert(
                      { redInputBoost: !eq.redInputBoost },
                      !eq.redInputBoost ? 'INPUT BOOST ON' : 'INPUT NORMAL'
                    )
                  }
                  aria-pressed={Boolean(eq.redInputBoost)}
                  aria-label="Activar Input Boost ATEQ"
                  className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-500 flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-slate-800" />
                </button>
              </div>

              <div className="flex flex-col items-center min-w-0 px-0.5">
                <span className="text-[5.5px] sm:text-[7px] font-bold tracking-tighter text-slate-200 uppercase leading-none mb-0.5 whitespace-nowrap">
                  LED
                </span>
                <span
                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 mt-1 rounded-full border border-black ${
                    eq.redInputBoost
                      ? 'bg-red-500 shadow-[0_0_8px_#EF4444]'
                      : 'bg-red-950'
                  }`}
                />
              </div>

              <RackRotaryKnob
                label="SUB BASS"
                value={eq.redSubBass ?? 2}
                min={-12}
                max={12}
                step={1}
                ringColor="#EF4444"
                size="sm"
                sensitivity={sensitivity}
                tooltipTitle="Sub Bass"
                onHoverInfo={setHoverTip}
                onChange={(v) =>
                  updateEqWithAlert({ redSubBass: v }, `SUB BASS ${v >= 0 ? '+' : ''}${v} dB`)
                }
              />

              <RackRotaryKnob
                label="MID BASS"
                value={eq.redMidBass ?? 1}
                min={-12}
                max={12}
                step={1}
                ringColor="#EF4444"
                size="sm"
                sensitivity={sensitivity}
                tooltipTitle="Mid Bass"
                onHoverInfo={setHoverTip}
                onChange={(v) =>
                  updateEqWithAlert({ redMidBass: v }, `MID BASS ${v >= 0 ? '+' : ''}${v} dB`)
                }
              />

              <RackRotaryKnob
                label="MID"
                value={eq.redMid ?? 1}
                min={-12}
                max={12}
                step={1}
                ringColor="#EF4444"
                size="sm"
                sensitivity={sensitivity}
                tooltipTitle="Mid"
                onHoverInfo={setHoverTip}
                onChange={(v) =>
                  updateEqWithAlert({ redMid: v }, `MID ${v >= 0 ? '+' : ''}${v} dB`)
                }
              />

              <RackRotaryKnob
                label="TREBLE"
                value={eq.redTreble ?? 2}
                min={-12}
                max={12}
                step={1}
                ringColor="#EF4444"
                size="sm"
                sensitivity={sensitivity}
                tooltipTitle="Treble"
                onHoverInfo={setHoverTip}
                onChange={(v) =>
                  updateEqWithAlert({ redTreble: v }, `TREBLE ${v >= 0 ? '+' : ''}${v} dB`)
                }
              />

              <span className="hidden sm:inline text-[10px] font-black tracking-widest text-red-500 pl-1">
                ATEQ
              </span>
            </div>
          </div>

          {/* Expandable Playlist / Folder / DSP Drawer */}
          {drawerTab !== 'none' && (
            <div className="rounded-xl bg-[#070B12] border border-white/15 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('playlist')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      drawerTab === 'playlist'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Música ({tracks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('dsp')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      drawerTab === 'dsp'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    DSP &amp; Sets
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-white cursor-pointer"
                  >
                    <Music2 className="h-3 w-3 text-sky-400" />
                    <span>MP3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-white cursor-pointer"
                  >
                    <FolderOpen className="h-3 w-3 text-amber-400" />
                    <span>Carpeta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('none')}
                    aria-label="Cerrar panel de música"
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {drawerTab === 'playlist' ? (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {tracks.map((t) => {
                    const active = t.id === activeTrack?.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectTrack(t)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] border cursor-pointer ${
                          active
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-[#0B101D] border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate font-semibold">
                          {active && isPlaying ? '▶ ' : ''}
                          {t.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{t.artist}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 text-[11px]">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'crossover', label: 'Crossover Clásico' },
                        { id: 'processor', label: 'Procesador DSP' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          updateEqWithAlert(
                            { dspMode: m.id, crossoverEnabled: true },
                            m.label.toUpperCase()
                          )
                        }
                        className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-bold border cursor-pointer ${
                          eq.dspMode === m.id
                            ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                            : 'bg-[#0B101D] border-slate-800 text-slate-300'
                        }`}
                      >
                        <Cpu className="h-3 w-3" />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[0, 1].map((slot) => {
                      const saved = savedPresets[slot];
                      return (
                        <div
                          key={slot}
                          className="flex items-center gap-1 bg-[#0B101D] border border-slate-800 rounded-lg p-1"
                        >
                          <button
                            type="button"
                            disabled={!saved}
                            onClick={() => {
                              if (saved) {
                                onChangeEq(saved.eq);
                                triggerOledNotice(`CARGADO ${saved.name.toUpperCase()}`);
                              }
                            }}
                            className="flex-1 text-left px-1.5 py-0.5 font-bold text-slate-200 disabled:text-slate-600 truncate cursor-pointer"
                          >
                            {saved ? saved.name : `Set ${slot + 1} vacío`}
                          </button>
                          {onSaveEqSlot && (
                            <button
                              type="button"
                              onClick={() => onSaveEqSlot(slot, `Set ${slot + 1}`, eq)}
                              title={`Guardar en Set ${slot + 1}`}
                              className="p-1 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 cursor-pointer"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. BOTTOM BEZEL SCALE PILL (Exact Video Match: − 100% + ⌖) + Quick Playlist Toggle */}
        <div className="mt-1.5 flex items-center justify-between px-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#090D16]/95 border border-white/15 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            <button
              type="button"
              onClick={() => setRackScale((s) => Math.max(0.7, Number((s - 0.05).toFixed(2))))}
              aria-label="Reducir tamaño del rack"
              className="px-1.5 py-0.5 hover:text-sky-400 cursor-pointer"
            >
              −
            </button>
            <span className="font-mono-num min-w-[36px] text-center">
              {Math.round(rackScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setRackScale((s) => Math.min(1.12, Number((s + 0.05).toFixed(2))))}
              aria-label="Aumentar tamaño del rack"
              className="px-1.5 py-0.5 hover:text-sky-400 cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setRackScale(1.0)}
              aria-label="Restablecer escala del rack"
              title="Restablecer 100%"
              className="px-1 py-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDrawerTab((t) => (t === 'playlist' ? 'none' : 'playlist'))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#090D16]/90 hover:bg-slate-800 border border-white/15 text-[10px] font-bold text-white cursor-pointer"
            >
              <Music2 className="h-3 w-3 text-sky-400" />
              <span>Pistas ({tracks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#090D16]/90 hover:bg-slate-800 border border-white/15 text-[10px] font-bold text-amber-300 cursor-pointer"
            >
              <FolderOpen className="h-3 w-3" />
              <span>Carpeta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

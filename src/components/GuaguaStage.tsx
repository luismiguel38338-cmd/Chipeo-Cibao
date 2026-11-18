import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crosshair,
  Flame,
  KeyRound,
  Lock,
  MapPin,
  Move,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Settings2,
  Shield,
  ShoppingBag,
  Sliders,
  Star,
  Swords,
  Thermometer,
  Trophy,
  Wrench,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ChipeoRemotePad } from './ChipeoRemotePad';
import { AudioFrameMetrics } from '../audio/chipeoAudio';
import {
  COIL_TIERS,
  RACK_FINISHES,
  RACK_SHAPES,
  RADIO_ACCENT_COLORS,
  STAGE_LOCATIONS,
} from '../game/catalog';
import { getXpProgressForLevel } from '../game/rules';
import { computeChassisMotion, computeSpeakerZonesMotion } from '../game/speakerMotion';
import {
  AppScreen,
  CoilLoadout,
  ComponentHealth,
  EqSettings,
  GameSettings,
  GuaguaSpec,
  StageLocation,
} from '../game/types';

interface GuaguaStageProps {
  guagua: GuaguaSpec;
  health: ComponentHealth;
  coils: CoilLoadout;
  level: number;
  xp: number;
  coins: number;
  username: string;
  avatarDataUrl: string;
  clanTag: string | null;
  currentDb: number;
  voltage: number;
  thermalLoadPct: number;
  isPlaying: boolean;
  isClipping: boolean;
  trackTitle: string;
  eq: EqSettings;
  settings: GameSettings;
  metricsRef: React.MutableRefObject<AudioFrameMetrics>;
  moveRadioMode: boolean;
  radioOffset: { x: number; y: number };
  onToggleMoveRadio: () => void;
  onChangeRadioOffset: (next: { x: number; y: number }) => void;
  onUpdateSettings: (next: GameSettings) => void;
  onChangeEq: (next: EqSettings) => void;
  onNavigateScreen: (screen: AppScreen) => void;
  onToggleAudio: () => void;
  onStepTrack: (dir: -1 | 1) => void;
  onAddFolderTracks: (files: FileList) => void;
  onQuickRechargeBattery: () => void;
  onOpenReferral: () => void;
  optionsTrigger?: number;
  radioSlot: React.ReactNode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 'smoke' | 'spark';
  size: number;
}

export function GuaguaStage({
  guagua,
  health,
  coils,
  xp,
  coins,
  username,
  avatarDataUrl,
  clanTag,
  currentDb,
  voltage,
  thermalLoadPct,
  isPlaying,
  isClipping,
  trackTitle,
  eq,
  settings,
  metricsRef,
  moveRadioMode,
  radioOffset,
  onToggleMoveRadio,
  onChangeRadioOffset,
  onUpdateSettings,
  onChangeEq,
  onNavigateScreen,
  onToggleAudio,
  onStepTrack,
  onAddFolderTracks,
  onQuickRechargeBattery,
  onOpenReferral,
  optionsTrigger = 0,
  radioSlot,
}: GuaguaStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const guaguaWrapRef = useRef<HTMLDivElement | null>(null);
  const guaguaImgRef = useRef<HTMLImageElement | null>(null);
  const stageFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [bgFailed, setBgFailed] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [edgeCollapsed, setEdgeCollapsed] = useState(false);
  const [showRemotePad, setShowRemotePad] = useState(false);

  useEffect(() => {
    if (optionsTrigger > 0) {
      setShowOptionsModal(true);
    }
  }, [optionsTrigger]);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  const propsRef = useRef({
    guagua,
    health,
    isPlaying,
    isClipping,
    settings,
    zoom,
  });

  useEffect(() => {
    propsRef.current = { guagua, health, isPlaying, isClipping, settings, zoom };
  }, [guagua, health, isPlaying, isClipping, settings, zoom]);

  useEffect(() => {
    setBgFailed(false);
  }, [settings.stageLocation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    let shockwaveRadius = 0;
    let shockwaveAlpha = 0;
    let rafId = 0;
    let frameCount = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr =
        propsRef.current.settings.graphicsQuality === 'low'
          ? 1
          : Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(320, Math.floor(parent.clientWidth * dpr));
      canvas.height = Math.max(240, Math.floor(parent.clientHeight * dpr));
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const render = () => {
      frameCount++;
      const nowSec = performance.now() / 1000;
      const {
        guagua: g,
        health: h,
        isPlaying: playing,
        isClipping: clipping,
        settings: curSettings,
        zoom: currentZoom,
      } = propsRef.current;
      const m = metricsRef.current;
      const quality = curSettings.graphicsQuality;

      const w = canvas.width;
      const hPx = canvas.height;

      const chassis = computeChassisMotion({
        zoom: currentZoom,
        bassEnergy: m.bassEnergy,
        voiceEnergy: m.voiceEnergy,
        isPlaying: playing,
        isClipping: clipping,
        bassHealth: h.bass,
        quality,
        bassBlurEnabled: curSettings.bassBlurEnabled,
        timeSec: nowSec,
      });

      if (guaguaWrapRef.current) {
        const nextTransform = `translate3d(${chassis.translateX}px, ${chassis.translateY}px, 0) scale(${chassis.scale}) rotate(${chassis.tiltDeg}deg)`;
        if (guaguaWrapRef.current.style.transform !== nextTransform) {
          guaguaWrapRef.current.style.transform = nextTransform;
        }
      }

      if (bgImgRef.current && (!playing || frameCount % 4 === 0)) {
        const qBlur = Math.min(3, Math.round(chassis.blurPx * 2) / 2);
        const nextFilter = qBlur > 0 ? `blur(${qBlur}px) brightness(0.84)` : 'brightness(0.84)';
        if (bgImgRef.current.style.filter !== nextFilter) {
          bgImgRef.current.style.filter = nextFilter;
        }
      }

      const hasBurned = h.drivers <= 0 || h.voice <= 0 || h.bass <= 0;
      if (!playing && particles.length === 0 && shockwaveAlpha <= 0.01 && !hasBurned) {
        if (frameCount % 15 === 0) {
          ctx.clearRect(0, 0, w, hPx);
        }
        rafId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, w, hPx);

      const imgEl = guaguaImgRef.current;
      const guaguaRect = (imgEl ?? guaguaWrapRef.current)?.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const dprX = canvasRect.width > 0 ? w / canvasRect.width : 1;
      const dprY = canvasRect.height > 0 ? hPx / canvasRect.height : 1;
      const glowCenterX =
        guaguaRect && guaguaRect.width > 0
          ? (guaguaRect.left - canvasRect.left + guaguaRect.width * 0.5) * dprX
          : w * 0.66;
      const glowCenterY =
        guaguaRect && guaguaRect.height > 0
          ? (guaguaRect.top - canvasRect.top + guaguaRect.height * 0.54) * dprY
          : hPx * 0.54;

      // Radial floor glow & shockwave centered on the active guagua
      if (playing && m.bassEnergy > 0.14 && h.bass > 0) {
        if (m.bassEnergy > 0.62 && shockwaveAlpha < 0.25) {
          shockwaveRadius = w * 0.12;
          shockwaveAlpha = 0.62;
        }
        if (quality !== 'low') {
          const grad = ctx.createRadialGradient(
            glowCenterX,
            glowCenterY,
            10,
            glowCenterX,
            glowCenterY,
            w * 0.42
          );
          grad.addColorStop(
            0,
            `${g.accentColor}${Math.round(m.bassEnergy * 52)
              .toString(16)
              .padStart(2, '0')}`
          );
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, hPx);
        }
      }

      if (shockwaveAlpha > 0.01) {
        shockwaveRadius += w * 0.014;
        shockwaveAlpha *= 0.92;
        ctx.beginPath();
        ctx.arc(glowCenterX, glowCenterY * 0.92, shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = g.accentColor;
        ctx.globalAlpha = shockwaveAlpha;
        ctx.lineWidth = quality === 'high' ? 3.5 : 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Localized physical cone-patch excursion aligned directly to guagua image pixels (zero target circles)
      const zoneMotions = computeSpeakerZonesMotion({
        zones: g.speakerZones,
        health: h,
        bassEnergy: m.bassEnergy,
        voiceEnergy: m.voiceEnergy,
        driverEnergy: m.driverEnergy,
        isPlaying: playing,
        timeSec: nowSec,
      });

      const canPumpPatches =
        Boolean(imgEl && imgEl.complete && imgEl.naturalWidth > 0 && guaguaRect && guaguaRect.width > 0);

      for (const zm of zoneMotions) {
        const zx = guaguaRect
          ? (guaguaRect.left - canvasRect.left + (zm.xPct / 100) * guaguaRect.width) * dprX
          : (zm.xPct / 100) * w;
        const zy = guaguaRect
          ? (guaguaRect.top - canvasRect.top + (zm.yPct / 100) * guaguaRect.height) * dprY
          : (zm.yPct / 100) * hPx;
        const baseR = guaguaRect
          ? (zm.radiusPct / 100) * Math.min(guaguaRect.width, guaguaRect.height) * dprX
          : (zm.radiusPct / 100) * Math.min(w, hPx);

        if (zm.burned && frameCount % 3 === 0 && particles.length < 60) {
          particles.push({
            x: zx + (Math.random() - 0.5) * 16,
            y: zy,
            vx: (Math.random() - 0.5) * 1.3,
            vy: -1.3 - Math.random() * 1.5,
            life: 0,
            maxLife: 40 + Math.random() * 20,
            kind: Math.random() < 0.34 ? 'spark' : 'smoke',
            size: 5 + Math.random() * 8,
          });
          continue;
        }

        if (
          playing &&
          !zm.burned &&
          zm.energy > 0.04 &&
          curSettings.showSpeakerZones &&
          canPumpPatches &&
          imgEl &&
          guaguaRect
        ) {
          const natW = imgEl.naturalWidth;
          const natH = imgEl.naturalHeight;
          const srcBaseR = (zm.radiusPct / 100) * Math.min(natW, natH);
          const sx = Math.max(0, (zm.xPct / 100) * natW - srcBaseR);
          const sy = Math.max(0, (zm.yPct / 100) * natH - srcBaseR);
          const sw = Math.min(natW - sx, srcBaseR * 2);
          const sh = Math.min(natH - sy, srcBaseR * 2);

          if (sw > 4 && sh > 4) {
            const dstR = baseR * zm.coneScale;
            const px = zx + zm.jitterX * dprX;
            const py = zy + (zm.coneOffsetY + zm.jitterY) * dprY;

            ctx.beginPath();
            ctx.arc(zx, zy, baseR * 0.96, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.45, zm.shadowAlpha * 0.6)})`;
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, dstR, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(imgEl, sx, sy, sw, sh, px - dstR, py - dstR, dstR * 2, dstR * 2);
            ctx.restore();
          }
        }
      }

      // Subtle bottom audio spectrum bars
      if (playing && quality !== 'low') {
        const bars = 26;
        const barW = (w * 0.42) / bars;
        const startX = w * 0.29;
        for (let i = 0; i < bars; i++) {
          const ratio = i / bars;
          const bandVal =
            ratio < 0.35 ? m.bassEnergy : ratio < 0.7 ? m.voiceEnergy : m.driverEnergy;
          const wave = Math.abs(Math.sin(frameCount * 0.14 + i * 0.55));
          const barH = Math.max(4, bandVal * (0.45 + wave * 0.65) * (hPx * 0.075));
          ctx.fillStyle = ratio < 0.35 ? '#0EA5E9' : ratio < 0.7 ? '#22C55E' : '#F59E0B';
          ctx.globalAlpha = 0.55;
          ctx.fillRect(startX + i * barW + 2, hPx - barH - 8, Math.max(3, barW - 4), barH);
        }
        ctx.globalAlpha = 1;
      }

      // Smoke & sparks on burned components
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.kind === 'smoke') {
          ctx.fillStyle = `rgba(148, 163, 184, ${alpha * 0.48})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + p.life * 0.02), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`;
          ctx.fillRect(p.x, p.y, 3.5, 3.5);
        }
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [metricsRef]);

  const burnedList: string[] = [];
  if (health.drivers <= 0) burnedList.push('Drivers');
  if (health.voice <= 0) burnedList.push('Voz');
  if (health.bass <= 0) burnedList.push('Bajos');

  const activeLocation =
    STAGE_LOCATIONS.find((l) => l.id === settings.stageLocation) ?? STAGE_LOCATIONS[0];
  const xpInfo = getXpProgressForLevel(xp);

  const handleRadioPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!moveRadioMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: radioOffset.x,
      origY: radioOffset.y,
    };
  };

  const handleRadioPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!moveRadioMode || !dragRef.current) return;
    onChangeRadioOffset({
      x: Math.max(-420, Math.min(80, dragRef.current.origX + (e.clientX - dragRef.current.startX))),
      y: Math.max(-180, Math.min(180, dragRef.current.origY + (e.clientY - dragRef.current.startY))),
    });
  };

  const handleRadioPointerUp = () => {
    dragRef.current = null;
  };

  const moreMenuItems: {
    id: string;
    label: string;
    icon: typeof ShoppingBag;
    color: string;
    onClick: () => void;
  }[] = [
    {
      id: 'studio',
      label: 'Control Fijo',
      icon: Lock,
      color: 'text-emerald-400',
      onClick: () => onNavigateScreen('studio'),
    },
    {
      id: 'shop',
      label: 'Tienda y Taller',
      icon: ShoppingBag,
      color: 'text-sky-400',
      onClick: () => onNavigateScreen('shop'),
    },
    {
      id: 'progress',
      label: 'Eventos y Diaria',
      icon: Trophy,
      color: 'text-amber-400',
      onClick: () => onNavigateScreen('progress'),
    },
    {
      id: 'battle',
      label: 'Batalla Online',
      icon: Swords,
      color: 'text-red-400',
      onClick: () => onNavigateScreen('battle'),
    },
    {
      id: 'clans',
      label: 'Clanes (50k)',
      icon: Shield,
      color: 'text-sky-300',
      onClick: () => onNavigateScreen('clans'),
    },
    {
      id: 'referral',
      label: 'Referido / VIP',
      icon: KeyRound,
      color: 'text-amber-300',
      onClick: onOpenReferral,
    },
    {
      id: 'settings',
      label: 'Ajustes y E2E',
      icon: Settings,
      color: 'text-slate-300',
      onClick: () => onNavigateScreen('settings'),
    },
  ];

  return (
    <section
      className="relative w-full min-h-screen overflow-hidden flex flex-col justify-between select-none"
      style={{ background: activeLocation.bgStyle }}
      data-testid="guagua-stage"
    >
      {/* Full-Bleed Dominican Stage Backdrop */}
      {!bgFailed && (
        <img
          ref={bgImgRef}
          src={activeLocation.bgImage}
          alt={activeLocation.name}
          referrerPolicy="no-referrer"
          onError={() => setBgFailed(true)}
          className="pointer-events-none absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#04060D]/90 via-black/22 to-[#04060D]/72"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-8 h-24 opacity-25"
        style={{
          background: `radial-gradient(ellipse at center, ${activeLocation.floorColor}, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Acoustic Cone-Excursion & Smoke Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="bass-canvas"
        className="pointer-events-none absolute inset-0 w-full h-full z-20"
      />

      {/* TOP CORNER SHELL (matching reference URL clean corner layout) */}
      <div className="relative z-40 w-full px-3 sm:px-5 pt-3 flex flex-wrap items-start justify-between gap-2.5">
        {/* Top-Left: ⭐ Más ▾ + XP Level + Coins */}
        <div className="flex flex-wrap items-center gap-2 relative">
          <button
            type="button"
            data-testid="more-menu-toggle"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            aria-expanded={showMoreMenu}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B14]/92 hover:bg-slate-800 border border-white/15 text-xs font-extrabold text-white cursor-pointer shadow-lg"
          >
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>Más</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Compact Level + XP Progress Pill */}
          <div className="rounded-xl bg-[#070B14]/90 border border-white/15 px-3 py-1.5 min-w-[140px]">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-sky-400">
                <Zap className="h-3 w-3" />
                <span>Nv {xpInfo.level}</span>
              </span>
              <span className="font-mono-num text-[10px] text-slate-300">
                {xpInfo.xpIntoLevel}/{xpInfo.xpForNextLevel} XP
              </span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all"
                style={{ width: `${Math.max(4, xpInfo.progressPct)}%` }}
              />
            </div>
          </div>

          {/* Coins + Battery Pill */}
          <div
            data-testid="coins-balance"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#070B14]/90 border border-amber-500/35 text-xs font-extrabold text-amber-400"
          >
            <Coins className="h-3.5 w-3.5" />
            <span className="font-mono-num">{coins.toLocaleString('es-DO')}</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono-num text-emerald-400">
              {Math.round(health.battery)}% Bat
            </span>
          </div>

          {health.battery < 95 && (
            <button
              type="button"
              onClick={onQuickRechargeBattery}
              title="Recargar baterías 14.5V"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 cursor-pointer"
            >
              <BatteryCharging className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">14.5V</span>
            </button>
          )}

          {/* Dropdown Drawer from ⭐ Más ▾ */}
          {showMoreMenu && (
            <div
              className="absolute left-0 top-12 z-50 w-72 sm:w-80 rounded-2xl bg-[#0B101D] border border-white/15 p-3 shadow-2xl grid grid-cols-2 gap-2"
              role="menu"
              aria-label="Menú rápido"
            >
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      item.onClick();
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#070B14] hover:bg-slate-800 border border-white/10 text-left text-xs font-bold text-white cursor-pointer"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Top-Right: Evento Especial + Control Fijo + Sonar Música + User Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateScreen('progress')}
            data-testid="open-special-event-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs font-extrabold text-amber-200 cursor-pointer"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Evento Beretta 2.0</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateScreen('studio')}
            data-testid="open-studio-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B14]/90 hover:bg-slate-800 border border-emerald-500/40 text-xs font-bold text-emerald-300 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Control Fijo</span>
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            data-testid="stage-play-toggle"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer shadow-lg ${
              isPlaying
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pausar' : 'Sonar Música'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateScreen('settings')}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#070B14]/90 hover:bg-slate-800 border border-white/15 cursor-pointer"
          >
            <img
              src={avatarDataUrl}
              alt={username}
              className="h-6 w-6 rounded-full object-cover border border-sky-400/50"
            />
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-xs font-bold text-white">
                {clanTag ? `[${clanTag}] ` : ''}
                {username}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{guagua.name}</p>
            </div>
          </button>
        </div>
      </div>

      {/* CENTER DUAL SHOWCASE (Video Layout): LEFT Control Rack + RIGHT Guagua Wall */}
      <div className="relative z-30 flex-1 w-full max-w-[1480px] mx-auto px-3 sm:px-6 py-2 flex flex-col lg:flex-row items-center justify-between gap-5">
        {/* Left: Video-Exact ATEQ + Pioneer Control Rack (stationary or movable) */}
        <div
          onPointerDown={handleRadioPointerDown}
          onPointerMove={handleRadioPointerMove}
          onPointerUp={handleRadioPointerUp}
          style={{
            transform: `translate3d(${radioOffset.x}px, ${radioOffset.y}px, 0)`,
          }}
          className={`w-full lg:w-[490px] xl:w-[535px] shrink-0 transition-shadow ${
            moveRadioMode ? 'cursor-move ring-2 ring-sky-400 rounded-2xl' : ''
          }`}
        >
          {moveRadioMode && (
            <div className="mb-1.5 rounded-lg bg-sky-500 text-slate-950 px-3 py-1 text-[11px] font-bold flex items-center justify-between">
              <span>Arrastra el rack a donde prefieras</span>
              <button
                type="button"
                onClick={() => onChangeRadioOffset({ x: 0, y: 0 })}
                className="underline cursor-pointer"
              >
                Centrar
              </button>
            </div>
          )}
          {radioSlot}
        </div>

        {/* Right: Guagua Showcase */}
        <div className="relative flex-1 w-full flex flex-col items-center justify-center min-h-[260px] sm:min-h-[380px] lg:min-h-[500px]">
          {/* Alerts floating cleanly above vehicle when active */}
          {burnedList.length > 0 && (
            <div className="mb-2 z-30 rounded-xl bg-red-950/92 border border-red-500/60 px-3.5 py-2 flex items-center gap-3 shadow-xl">
              <Flame className="h-4 w-4 text-red-400 shrink-0" />
              <span className="text-xs font-bold text-red-100">
                ¡Se quemó: {burnedList.join(', ')}!
              </span>
              <button
                type="button"
                onClick={() => onNavigateScreen('shop')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold cursor-pointer"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Reparar</span>
              </button>
            </div>
          )}

          {isClipping && isPlaying && burnedList.length === 0 && (
            <div className="mb-2 z-30 rounded-xl bg-amber-950/92 border border-amber-500/55 px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-200 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>¡Clipping alto ({thermalLoadPct}% calor)! Protege tus bobinas.</span>
            </div>
          )}

          <div
            ref={guaguaWrapRef}
            className="relative w-full max-w-[700px] flex items-center justify-center will-change-transform"
          >
            <img
              ref={guaguaImgRef}
              src={guagua.image}
              alt={guagua.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[310px] sm:max-h-[430px] lg:max-h-[530px] w-auto h-auto object-contain drop-shadow-[0_24px_45px_rgba(0,0,0,0.88)]"
            />
          </div>
        </div>
      </div>

      {/* BOTTOM CORNER SHELL (Reference Edge Stack + Center Zoom/Opciones + Right Telemetry) */}
      <div className="relative z-40 w-full px-3 sm:px-5 pb-3 flex flex-wrap items-end justify-between gap-2.5">
        {/* Bottom-Left: Collapsible Capsule Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEdgeCollapsed((c) => !c)}
            aria-label={edgeCollapsed ? 'Mostrar botones laterales' : 'Ocultar botones laterales'}
            className="inline-flex items-center px-2 py-2 rounded-xl bg-[#070B14]/92 hover:bg-slate-800 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
          >
            {edgeCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-sky-400" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 text-sky-400" />
            )}
          </button>

          {!edgeCollapsed && (
            <>
              <button
                type="button"
                onClick={() => onNavigateScreen('progress')}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#070B14]/90 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Eventos</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateScreen('battle')}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#070B14]/90 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
              >
                <Swords className="h-3.5 w-3.5 text-red-400" />
                <span>Batallas</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateScreen('shop')}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#070B14]/90 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-sky-400" />
                <span>Tienda</span>
              </button>

              <button
                type="button"
                aria-pressed={moveRadioMode}
                onClick={onToggleMoveRadio}
                className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer whitespace-nowrap ${
                  moveRadioMode
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-[#070B14]/90 hover:bg-slate-800 border-white/15 text-white'
                }`}
              >
                <Move className="h-3.5 w-3.5" />
                <span>{moveRadioMode ? 'Fijar radio' : 'Mover radio'}</span>
              </button>
            </>
          )}
        </div>

        {/* Bottom-Center: Zoom + Cambia tu lugar + Opciones */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-xl bg-[#070B14]/92 border border-white/15 p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
              aria-label="Alejar cámara de guagua"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.0)}
              aria-label="Restablecer zoom al 100%"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-mono-num font-bold text-white cursor-pointer"
            >
              <Crosshair className="h-3 w-3 text-sky-400" />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.45, Number((z + 0.1).toFixed(2))))}
              aria-label="Acercar cámara de guagua"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            data-testid="toggle-chipeo-remote"
            aria-pressed={showRemotePad}
            onClick={() => setShowRemotePad((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-extrabold cursor-pointer whitespace-nowrap ${
              showRemotePad
                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.45)]'
                : 'bg-[#070B14]/92 hover:bg-slate-800 border-sky-500/40 text-sky-300'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Control Chipeo</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPlaceModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B14]/92 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
          >
            <MapPin className="h-3.5 w-3.5 text-sky-400" />
            <span>Cambia tu lugar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOptionsModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B14]/92 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
          >
            <Settings2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Opciones</span>
          </button>
        </div>

        {/* Bottom-Right: Live dB / Voltage / Calor / Component Health Pill */}
        <div className="rounded-xl bg-[#070B14]/92 border border-white/15 px-3 py-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Presión</p>
              <p
                data-testid="live-db-readout"
                className={`font-mono-num text-base font-extrabold leading-none ${
                  isClipping ? 'text-red-400' : isPlaying ? 'text-sky-400' : 'text-slate-200'
                }`}
              >
                {currentDb} dB
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Volt</p>
              <p
                className={`font-mono-num text-base font-extrabold leading-none ${
                  voltage < 12.2 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {voltage.toFixed(1)}V
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-0.5">
                <Thermometer className="h-2.5 w-2.5 text-amber-400" />
                <span>Calor</span>
              </p>
              <p
                className={`font-mono-num text-base font-extrabold leading-none ${
                  thermalLoadPct >= 82
                    ? 'text-red-400'
                    : thermalLoadPct >= 60
                      ? 'text-amber-400'
                      : 'text-slate-200'
                }`}
              >
                {thermalLoadPct}%
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10 text-[10px]">
            {[
              { lbl: 'Drv', val: health.drivers, tier: COIL_TIERS[coils.drivers].level },
              { lbl: 'Voz', val: health.voice, tier: COIL_TIERS[coils.voice].level },
              { lbl: 'Baj', val: health.bass, tier: COIL_TIERS[coils.bass].level },
            ].map((c) => {
              const p = Math.round(c.val);
              return (
                <div key={c.lbl} className="text-center min-w-[34px]">
                  <p className="text-slate-400">
                    {c.lbl}
                    {c.tier > 1 ? `·${c.tier}` : ''}
                  </p>
                  <p
                    className={`font-mono-num font-bold ${
                      p <= 0 ? 'text-red-400' : p < 45 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {p}%
                  </p>
                </div>
              );
            })}
          </div>

          <span className="hidden xl:inline text-[11px] text-slate-400 truncate max-w-[140px]">
            {isPlaying ? `▶ ${trackTitle}` : 'Pausa'}
          </span>
        </div>
      </div>

      {/* Hidden stage folder picker for Chipeo Remote Pad */}
      <input
        ref={stageFolderInputRef}
        type="file"
        accept="audio/*"
        multiple
        // @ts-expect-error webkitdirectory allows selecting an entire local audio folder
        webkitdirectory=""
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFolderTracks(e.target.files);
          }
          e.target.value = '';
        }}
        className="sr-only"
      />

      {/* Floating Handheld Chipeo Remote Control (toggleable via Control Chipeo) */}
      {showRemotePad && (
        <div className="fixed right-3 sm:right-6 bottom-20 z-50">
          <ChipeoRemotePad
            eq={eq}
            isPlaying={isPlaying}
            currentDb={currentDb}
            trackTitle={trackTitle}
            kitipoBoost={settings.kitipoBoost}
            accentColor={settings.radioAccentColor}
            onChangeEq={onChangeEq}
            onChangeKitipo={(nextBoost) =>
              onUpdateSettings({ ...settings, kitipoBoost: nextBoost })
            }
            onTogglePlay={onToggleAudio}
            onStepTrack={onStepTrack}
            onOpenFolder={() => stageFolderInputRef.current?.click()}
            onOpenStudio={() => onNavigateScreen('studio')}
            onClose={() => setShowRemotePad(false)}
          />
        </div>
      )}

      {/* Modal: Cambia tu lugar (5 Photorealistic Dominican Environments) */}
      {showPlaceModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cambia tu lugar"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#0D1322] border border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  CAMBIA TU LUGAR DE CHIPEO
                </h2>
                <p className="text-xs text-slate-400">
                  Elige el escenario dominicano donde suena tu equipo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlaceModal(false)}
                aria-label="Cerrar selector de lugar"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
              {STAGE_LOCATIONS.map((loc) => {
                const active = loc.id === settings.stageLocation;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, stageLocation: loc.id as StageLocation });
                      setShowPlaceModal(false);
                    }}
                    className={`rounded-xl overflow-hidden text-left border transition-colors cursor-pointer ${
                      active
                        ? 'border-sky-400 bg-sky-500/15'
                        : 'border-slate-800 bg-[#080C15] hover:border-slate-600'
                    }`}
                  >
                    <div className="relative h-28 w-full bg-slate-900">
                      <img
                        src={loc.bgImage}
                        alt={loc.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {active && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500 text-slate-950 text-[10px] font-bold">
                          <Check className="h-3 w-3" />
                          <span>Activo</span>
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-white">{loc.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{loc.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Opciones de Chipeo 3D (matching reference URL model & options) */}
      {showOptionsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Opciones de Chipeo 3D"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1322] border border-white/15 p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  OPCIONES DE CHIPEO 3D
                </h2>
                <p className="text-xs text-slate-400">
                  Personaliza la forma del case, acabados 3D, bocinas y procesador
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                aria-label="Cerrar opciones"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Forma del Case 3D (Cuadrado / Redondeado / Biselado) */}
              <div className="rounded-xl bg-[#080C15] border border-slate-800 p-3 space-y-2">
                <p className="text-xs font-bold text-white">Forma del Case del Radio</p>
                <div className="grid grid-cols-3 gap-2">
                  {RACK_SHAPES.map((shape) => {
                    const active = settings.rackShape === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, rackShape: shape.id })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          active
                            ? 'border-sky-400 bg-sky-500/20 text-white'
                            : 'border-slate-700 bg-[#0D1322] text-slate-300'
                        }`}
                      >
                        {shape.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acabado del Rack 3D */}
              <div className="rounded-xl bg-[#080C15] border border-slate-800 p-3 space-y-2">
                <p className="text-xs font-bold text-white">Acabado del Rack 3D</p>
                <div className="grid grid-cols-2 gap-2">
                  {RACK_FINISHES.map((fin) => {
                    const active = settings.rackFinish === fin.id;
                    return (
                      <button
                        key={fin.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, rackFinish: fin.id })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer text-left ${
                          active
                            ? 'border-sky-400 bg-sky-500/20 text-white'
                            : 'border-slate-700 bg-[#0D1322] text-slate-300'
                        }`}
                      >
                        {fin.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color de Luces del Radio 3D + Restablecer colores */}
              <div className="rounded-xl bg-[#080C15] border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white">Color de Luces del Radio 3D</p>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        radioAccentColor: '#0EA5E9',
                        rackFinish: 'wood',
                        rackShape: 'rounded',
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restablecer colores</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RADIO_ACCENT_COLORS.map((c) => {
                    const active = settings.radioAccentColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ ...settings, radioAccentColor: c.hex })
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          active
                            ? 'border-white bg-slate-800 text-white'
                            : 'border-slate-700 bg-[#0D1322] text-slate-300'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modo DSP: Crossover vs Procesador */}
              <div className="rounded-xl bg-[#080C15] border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white">Sistema Crossover / Procesador</p>
                    <p className="text-[11px] text-slate-400">
                      Elige cómo filtra y protege tu audio
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Activar Crossover o Procesador DSP"
                    checked={eq.crossoverEnabled}
                    onChange={(e) => onChangeEq({ ...eq, crossoverEnabled: e.target.checked })}
                    className="h-4 w-4 accent-sky-500 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'crossover', label: 'Crossover' },
                      { id: 'processor', label: 'Procesador DSP' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        onChangeEq({ ...eq, dspMode: mode.id, crossoverEnabled: true })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        eq.dspMode === mode.id
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                          : 'bg-[#0D1322] border-slate-700 text-slate-300'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kitipo y Bajos Boost */}
              <div className="rounded-xl bg-[#080C15] border border-slate-800 p-3 space-y-2">
                <div>
                  <p className="text-xs font-bold text-white">Kitipo y Bajos Extra</p>
                  <p className="text-[11px] text-slate-400">
                    Empuje real de subgrave y presión en el cajón
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 0, label: 'Normal' },
                    { value: 1, label: 'Kitipo +3 dB' },
                    { value: 2, label: 'Extremo +6 dB' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, kitipoBoost: opt.value })
                      }
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        settings.kitipoBoost === opt.value
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-[#0D1322] border-slate-700 text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blur con Bajos */}
              <label className="flex items-center justify-between gap-3 rounded-xl bg-[#080C15] border border-slate-800 p-3 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-white">Blur con Bajos</p>
                  <p className="text-[11px] text-slate-400">
                    Desenfoque dinámico del fondo al golpear el subgrave
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bassBlurEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, bassBlurEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-sky-500 cursor-pointer"
                />
              </label>

              {/* Movimiento de Bocinas */}
              <label className="flex items-center justify-between gap-3 rounded-xl bg-[#080C15] border border-slate-800 p-3 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-white">Movimiento de Bocinas</p>
                  <p className="text-[11px] text-slate-400">
                    Excursión física de conos por banda (bajos, voz y drivers)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showSpeakerZones}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showSpeakerZones: e.target.checked })
                  }
                  className="h-4 w-4 accent-emerald-500 cursor-pointer"
                />
              </label>

              {/* Bajo Rendimiento */}
              <label className="flex items-center justify-between gap-3 rounded-xl bg-[#080C15] border border-slate-800 p-3 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-white">Bajo Rendimiento</p>
                  <p className="text-[11px] text-slate-400">
                    Reduce partículas y blur para dispositivos con menor GPU
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.graphicsQuality === 'low'}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      graphicsQuality: e.target.checked ? 'low' : 'high',
                    })
                  }
                  className="h-4 w-4 accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Modo Streaming */}
              <label className="flex items-center justify-between gap-3 rounded-xl bg-[#080C15] border border-slate-800 p-3 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-white">Modo Streaming</p>
                  <p className="text-[11px] text-slate-400">
                    Oculta tus valores exactos en dB del radio 3D durante directos
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.streamingMode}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, streamingMode: e.target.checked })
                  }
                  className="h-4 w-4 accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Sensibilidad & Volumen Maestro */}
              <div className="rounded-xl bg-[#080C15] border border-slate-800 p-3 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-white">Sensibilidad de Perillas</span>
                    <span className="font-mono-num text-sky-400 font-bold">
                      {settings.sensitivity.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={2.0}
                    step={0.05}
                    value={settings.sensitivity}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, sensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-white">Volumen Maestro</span>
                    <span className="font-mono-num text-emerald-400 font-bold">
                      {Math.round(settings.masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={settings.masterVolume}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, masterVolume: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

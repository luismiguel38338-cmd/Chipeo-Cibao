import { ComponentHealth, GraphicsQuality } from './types';

export interface SpeakerZoneInput {
  xPct: number;
  yPct: number;
  radiusPct: number;
  band: 'bass' | 'voice' | 'driver';
}

export interface SpeakerZoneMotion {
  xPct: number;
  yPct: number;
  radiusPct: number;
  band: 'bass' | 'voice' | 'driver';
  energy: number;
  coneScale: number;
  coneOffsetY: number;
  shadowAlpha: number;
  ringScale: number;
  ringAlpha: number;
  jitterX: number;
  jitterY: number;
  burned: boolean;
}

export interface ChassisMotion {
  scale: number;
  translateX: number;
  translateY: number;
  tiltDeg: number;
  blurPx: number;
}

/**
 * Pure per-band physical speaker cone & vehicle excursion math:
 * - Bass zones physically push the subwoofer cone patch outward and flex downwards
 * - Voice zones drive crisp mid-range cone excursion
 * - Driver zones apply rapid high-frequency compression-horn micro-vibration
 * - Zero colored target rings; authentic physical movement on the vehicle wall
 */
export function computeSpeakerZonesMotion(params: {
  zones: SpeakerZoneInput[];
  health: ComponentHealth;
  bassEnergy: number;
  voiceEnergy: number;
  driverEnergy: number;
  isPlaying: boolean;
  timeSec: number;
}): SpeakerZoneMotion[] {
  const { zones, health, bassEnergy, voiceEnergy, driverEnergy, isPlaying, timeSec } = params;

  return zones.map((zone, idx) => {
    const bandHealth =
      zone.band === 'bass'
        ? health.bass
        : zone.band === 'voice'
          ? health.voice
          : health.drivers;

    const burned = bandHealth <= 0;
    if (!isPlaying || burned) {
      return {
        ...zone,
        energy: 0,
        coneScale: 1,
        coneOffsetY: 0,
        shadowAlpha: 0,
        ringScale: 1,
        ringAlpha: 0,
        jitterX: 0,
        jitterY: 0,
        burned,
      };
    }

    const rawEnergy =
      zone.band === 'bass'
        ? bassEnergy
        : zone.band === 'voice'
          ? voiceEnergy
          : driverEnergy;

    const healthRatio = Math.max(0.25, Math.min(1, bandHealth / 100));
    const energy = Math.max(0, Math.min(1, rawEnergy * healthRatio));

    if (zone.band === 'bass') {
      const wave = 0.5 + 0.5 * Math.sin(timeSec * 18 + idx * 0.75);
      const coneScale = 1 + energy * (0.17 + wave * 0.09);
      const coneOffsetY = energy * (2.6 + wave * 1.4);
      const shadowAlpha = Math.min(0.45, energy * 0.38);
      return {
        ...zone,
        energy,
        coneScale: Number(coneScale.toFixed(4)),
        coneOffsetY: Number(coneOffsetY.toFixed(2)),
        shadowAlpha: Number(shadowAlpha.toFixed(3)),
        ringScale: Number((0.95 + energy * 0.28).toFixed(4)),
        ringAlpha: Number((energy * 0.2).toFixed(3)),
        jitterX: Number((Math.sin(timeSec * 24 + idx) * energy * 0.8).toFixed(2)),
        jitterY: Number((-energy * 1.6 * wave).toFixed(2)),
        burned: false,
      };
    }

    if (zone.band === 'voice') {
      const wave = Math.sin(timeSec * 30 + idx * 1.15);
      const coneScale = 1 + energy * (0.11 + Math.abs(wave) * 0.06);
      const coneOffsetY = wave * energy * 1.3;
      const shadowAlpha = Math.min(0.3, energy * 0.25);
      return {
        ...zone,
        energy,
        coneScale: Number(coneScale.toFixed(4)),
        coneOffsetY: Number(coneOffsetY.toFixed(2)),
        shadowAlpha: Number(shadowAlpha.toFixed(3)),
        ringScale: Number((0.92 + energy * 0.2).toFixed(4)),
        ringAlpha: Number((energy * 0.14).toFixed(3)),
        jitterX: Number((wave * energy * 1.4).toFixed(2)),
        jitterY: Number((Math.cos(timeSec * 26 + idx) * energy * 1.1).toFixed(2)),
        burned: false,
      };
    }

    // Drivers (high-frequency compression horns)
    const shimmer = Math.sin(timeSec * 56 + idx * 1.9);
    const coneScale = 1 + energy * 0.07;
    return {
      ...zone,
      energy,
      coneScale: Number(coneScale.toFixed(4)),
      coneOffsetY: Number((shimmer * energy * 0.9).toFixed(2)),
      shadowAlpha: Number((energy * 0.18).toFixed(3)),
      ringScale: Number((0.9 + energy * 0.16).toFixed(4)),
      ringAlpha: Number((energy * 0.12).toFixed(3)),
      jitterX: Number((shimmer * energy * 2.4).toFixed(2)),
      jitterY: Number((Math.cos(timeSec * 50 + idx) * energy * 1.8).toFixed(2)),
      burned: false,
    };
  });
}

export function computeChassisMotion(params: {
  zoom: number;
  bassEnergy: number;
  voiceEnergy: number;
  isPlaying: boolean;
  isClipping: boolean;
  bassHealth: number;
  quality: GraphicsQuality;
  bassBlurEnabled: boolean;
  timeSec: number;
}): ChassisMotion {
  const {
    zoom,
    bassEnergy,
    voiceEnergy,
    isPlaying,
    isClipping,
    bassHealth,
    quality,
    bassBlurEnabled,
    timeSec,
  } = params;

  if (!isPlaying) {
    return {
      scale: zoom,
      translateX: 0,
      translateY: 0,
      tiltDeg: 0,
      blurPx: 0,
    };
  }

  const effectiveBass = bassHealth > 0 ? bassEnergy : 0;
  const amp = quality === 'low' ? 0.45 : quality === 'medium' ? 0.8 : 1.05;
  const bounceWave = 0.5 + 0.5 * Math.sin(timeSec * 19);
  const scale = zoom * (1 + effectiveBass * (0.044 + bounceWave * 0.014) * amp);
  const translateY = -effectiveBass * (5.8 + bounceWave * 2.2) * amp;
  const clipJitter = isClipping ? Math.sin(timeSec * 58) * 2.6 * amp : 0;
  const translateX = clipJitter + Math.sin(timeSec * 21) * voiceEnergy * 1.1 * amp;
  const tiltDeg = Math.sin(timeSec * 14) * effectiveBass * 0.72 * amp;
  const blurPx =
    bassBlurEnabled && quality !== 'low' && effectiveBass > 0.32
      ? Number(((effectiveBass - 0.32) * 4.6 * amp).toFixed(2))
      : 0;

  return {
    scale: Number(scale.toFixed(4)),
    translateX: Number(translateX.toFixed(2)),
    translateY: Number(translateY.toFixed(2)),
    tiltDeg: Number(tiltDeg.toFixed(3)),
    blurPx,
  };
}

import {
  CoilLevel,
  ComponentHealth,
  EqSettings,
  GuaguaSpec,
  PlayerProfile,
  StageLocation,
} from './types';

export const GAME_ICON_PATH = '/assets/aistudio/file_00000000d7b4822f997f5b8c58bd33e6_19214c5d.png';
export const PIONEER_PANEL_PATH = '/assets/aistudio/file_000000003368822f88dfed62c2187034_1_9383b188.jpg';

export const CLAN_CREATION_COST = 50000;
export const VIP_REWARD_COINS = 100000;
export const REFERRAL_REWARD_COINS = 15000;
export const PERSONAL_CODE_BONUS_COINS = 5000;
export const BATTERY_RECHARGE_COST = 650;
export const DAILY_REWARD_BASE_COINS = 2500;

export const GUAGUA_CATALOG: GuaguaSpec[] = [
  // === 5 GUAGUAS ORIGINALES DEL PATIO ===
  {
    id: 'montero-verde',
    name: 'Montero Cibao Verde',
    nickname: 'La Clásica del Patio',
    category: 'original',
    image: '/assets/aistudio/IMG_9433_7efbfa0c.png',
    price: 0,
    maxDb: 138,
    bassPower: 76,
    driverCount: 16,
    voiceCount: 24,
    subCount: 6,
    accentColor: '#22C55E',
    description:
      'Mitsubishi Montero verde y plata con muro de 24 medios y trompetas limpias para arrancar en el movimiento.',
    speakerZones: [
      { xPct: 24, yPct: 36, radiusPct: 4.5, band: 'voice' },
      { xPct: 38, yPct: 36, radiusPct: 4.5, band: 'voice' },
      { xPct: 50, yPct: 36, radiusPct: 4.8, band: 'bass' },
      { xPct: 62, yPct: 36, radiusPct: 4.5, band: 'voice' },
      { xPct: 76, yPct: 36, radiusPct: 4.5, band: 'voice' },
      { xPct: 32, yPct: 22, radiusPct: 3.2, band: 'driver' },
      { xPct: 50, yPct: 22, radiusPct: 3.2, band: 'driver' },
      { xPct: 68, yPct: 22, radiusPct: 3.2, band: 'driver' },
    ],
  },
  {
    id: 'montero-campestre',
    name: 'Montero Campestre Kitipón',
    nickname: 'El Terror de la Loma',
    category: 'original',
    image: '/assets/aistudio/image_13489a2b.png',
    price: 25000,
    maxDb: 145,
    bassPower: 84,
    driverCount: 24,
    voiceCount: 36,
    subCount: 10,
    accentColor: '#84CC16',
    description:
      'Paredón verde neón y azul eléctrico montado sobre Montero crema campestre, calibrada para retumbar el barrio entero.',
    speakerZones: [
      { xPct: 20, yPct: 38, radiusPct: 5, band: 'voice' },
      { xPct: 34, yPct: 38, radiusPct: 5, band: 'voice' },
      { xPct: 46, yPct: 38, radiusPct: 5.5, band: 'bass' },
      { xPct: 54, yPct: 38, radiusPct: 5.5, band: 'bass' },
      { xPct: 66, yPct: 38, radiusPct: 5, band: 'voice' },
      { xPct: 80, yPct: 38, radiusPct: 5, band: 'voice' },
      { xPct: 25, yPct: 22, radiusPct: 3.4, band: 'driver' },
      { xPct: 50, yPct: 22, radiusPct: 3.4, band: 'driver' },
      { xPct: 75, yPct: 22, radiusPct: 3.4, band: 'driver' },
    ],
  },
  {
    id: 'suv-blanca-oro',
    name: 'SUV Blanca Oro 24K',
    nickname: 'La Patrona del Cibao',
    category: 'original',
    image: '/assets/aistudio/IMG_9761_5316ca72.png',
    price: 55000,
    maxDb: 151,
    bassPower: 91,
    driverCount: 32,
    voiceCount: 44,
    subCount: 14,
    accentColor: '#F59E0B',
    description:
      'Baúl abierto con túnel de bajos dorados y rack panorámico de alta presión sonora para duelos pesados.',
    speakerZones: [
      { xPct: 18, yPct: 36, radiusPct: 5, band: 'voice' },
      { xPct: 33, yPct: 35, radiusPct: 5.2, band: 'voice' },
      { xPct: 50, yPct: 35, radiusPct: 6, band: 'bass' },
      { xPct: 67, yPct: 35, radiusPct: 5.2, band: 'voice' },
      { xPct: 82, yPct: 36, radiusPct: 5, band: 'voice' },
      { xPct: 50, yPct: 68, radiusPct: 6.5, band: 'bass' },
      { xPct: 38, yPct: 23, radiusPct: 3.5, band: 'driver' },
      { xPct: 62, yPct: 23, radiusPct: 3.5, band: 'driver' },
    ],
  },
  {
    id: 'tahoe-azul-crema',
    name: 'Tahoe Azul & Crema Cibaeña',
    nickname: 'La Muralla Real',
    category: 'original',
    image: '/assets/aistudio/Screenshot_2026-10-21_182447_6dd289af.png',
    price: 85000,
    maxDb: 156,
    bassPower: 96,
    driverCount: 40,
    voiceCount: 54,
    subCount: 18,
    accentColor: '#0EA5E9',
    description:
      'Muro monumental azul cobalto y crema con 18 subwoofers en túnel y línea superior de drivers de titanio.',
    speakerZones: [
      { xPct: 16, yPct: 34, radiusPct: 5.4, band: 'voice' },
      { xPct: 31, yPct: 34, radiusPct: 5.4, band: 'voice' },
      { xPct: 45, yPct: 34, radiusPct: 5.8, band: 'bass' },
      { xPct: 55, yPct: 34, radiusPct: 5.8, band: 'bass' },
      { xPct: 69, yPct: 34, radiusPct: 5.4, band: 'voice' },
      { xPct: 84, yPct: 34, radiusPct: 5.4, band: 'voice' },
      { xPct: 50, yPct: 72, radiusPct: 6.8, band: 'bass' },
      { xPct: 26, yPct: 14, radiusPct: 3.5, band: 'driver' },
      { xPct: 50, yPct: 14, radiusPct: 3.5, band: 'driver' },
      { xPct: 74, yPct: 14, radiusPct: 3.5, band: 'driver' },
    ],
  },
  {
    id: 'la-2bble-aa',
    name: 'La 2bble AA Edición Especial',
    nickname: 'Furia Roja 2bble',
    category: 'original',
    image: '/assets/aistudio/image_599f72fd.webp',
    price: 120000,
    maxDb: 162,
    bassPower: 100,
    driverCount: 48,
    voiceCount: 60,
    subCount: 20,
    accentColor: '#EF4444',
    description:
      'Módulo de competencia extrema La 2bble AA con chipeo rojo escarlata, doble cajón de presión y drivers de acero.',
    speakerZones: [
      { xPct: 20, yPct: 32, radiusPct: 5.5, band: 'voice' },
      { xPct: 36, yPct: 32, radiusPct: 6, band: 'bass' },
      { xPct: 50, yPct: 32, radiusPct: 6.2, band: 'bass' },
      { xPct: 64, yPct: 32, radiusPct: 6, band: 'bass' },
      { xPct: 80, yPct: 32, radiusPct: 5.5, band: 'voice' },
      { xPct: 36, yPct: 76, radiusPct: 6.5, band: 'bass' },
      { xPct: 64, yPct: 76, radiusPct: 6.5, band: 'bass' },
      { xPct: 25, yPct: 13, radiusPct: 3.8, band: 'driver' },
      { xPct: 50, yPct: 13, radiusPct: 3.8, band: 'driver' },
      { xPct: 75, yPct: 13, radiusPct: 3.8, band: 'driver' },
    ],
  },
  {
    id: 'beretta-2-0',
    name: 'Beretta 2.0 (CR-V Azul)',
    nickname: 'Edición Especial Diaria',
    category: 'extremo',
    image: '/assets/vehicles/beretta-2-0.webp',
    price: 165000,
    maxDb: 165,
    bassPower: 100,
    driverCount: 16,
    voiceCount: 6,
    subCount: 4,
    accentColor: '#EC4899',
    eventExclusive: true,
    description:
      'Honda CR-V azul puertas abiertas con cajón exclusivo Beretta 2.0 rosa y negro, cuatro subwoofers de alta excursión y batería de trompetas Comando. Desbloquéala gratis ganando el Evento Especial del Día.',
    speakerZones: [
      { xPct: 45.5, yPct: 10, radiusPct: 4.6, band: 'bass' },
      { xPct: 54.5, yPct: 10, radiusPct: 4.6, band: 'bass' },
      { xPct: 45.5, yPct: 26, radiusPct: 4.6, band: 'bass' },
      { xPct: 54.5, yPct: 26, radiusPct: 4.6, band: 'bass' },
      { xPct: 31, yPct: 9.5, radiusPct: 3.0, band: 'voice' },
      { xPct: 31, yPct: 18, radiusPct: 3.0, band: 'voice' },
      { xPct: 31, yPct: 26.5, radiusPct: 3.0, band: 'voice' },
      { xPct: 69, yPct: 9.5, radiusPct: 3.0, band: 'voice' },
      { xPct: 69, yPct: 18, radiusPct: 3.0, band: 'voice' },
      { xPct: 69, yPct: 26.5, radiusPct: 3.0, band: 'voice' },
      { xPct: 38, yPct: 13, radiusPct: 2.3, band: 'driver' },
      { xPct: 38, yPct: 24.5, radiusPct: 2.3, band: 'driver' },
      { xPct: 62, yPct: 13, radiusPct: 2.3, band: 'driver' },
      { xPct: 62, yPct: 24.5, radiusPct: 2.3, band: 'driver' },
      { xPct: 50, yPct: 18, radiusPct: 2.2, band: 'driver' },
    ],
  },

  // === 12 VEHÍCULOS REALES IMPORTADOS ===
  {
    id: 'toyota-azul',
    name: 'Toyota Corolla Azul',
    nickname: 'Callejero Limpio',
    category: 'sedan',
    image: '/assets/vehicles/toyota-azul.webp',
    price: 6000,
    maxDb: 135,
    bassPower: 72,
    driverCount: 4,
    voiceCount: 8,
    subCount: 2,
    accentColor: '#38BDF8',
    description:
      'Sedán compacto clásico de barrio con cajón azul calibrado para sonar nítido sin forzar amperaje.',
    speakerZones: [
      { xPct: 32, yPct: 38, radiusPct: 4.5, band: 'voice' },
      { xPct: 50, yPct: 42, radiusPct: 5.2, band: 'bass' },
      { xPct: 68, yPct: 38, radiusPct: 4.5, band: 'voice' },
      { xPct: 50, yPct: 26, radiusPct: 3.2, band: 'driver' },
    ],
  },
  {
    id: 'accord-negro-amarillo',
    name: 'Accord Negro & Amarillo',
    nickname: 'Avispa Nocturna',
    category: 'sedan',
    image: '/assets/vehicles/accord-negro-amarillo.webp',
    price: 12000,
    maxDb: 141,
    bassPower: 79,
    driverCount: 8,
    voiceCount: 16,
    subCount: 4,
    accentColor: '#EAB308',
    description:
      'Honda Accord tuneado negro mate con rack amarillo fluorescente de 28 bocinas de pegada rápida.',
    speakerZones: [
      { xPct: 28, yPct: 36, radiusPct: 4.5, band: 'voice' },
      { xPct: 50, yPct: 38, radiusPct: 5.4, band: 'bass' },
      { xPct: 72, yPct: 36, radiusPct: 4.5, band: 'voice' },
      { xPct: 38, yPct: 24, radiusPct: 3.2, band: 'driver' },
      { xPct: 62, yPct: 24, radiusPct: 3.2, band: 'driver' },
    ],
  },
  {
    id: 'civic-crema',
    name: 'Civic Crema Clásico',
    nickname: 'El Terror de los Sedanes',
    category: 'sedan',
    image: '/assets/vehicles/civic-crema.webp',
    price: 18500,
    maxDb: 144,
    bassPower: 83,
    driverCount: 12,
    voiceCount: 25,
    subCount: 6,
    accentColor: '#FBBF24',
    description:
      'Honda Civic crema con paredón trasero de 43 componentes listo para sorprender guaguas grandes.',
    speakerZones: [
      { xPct: 24, yPct: 36, radiusPct: 4.6, band: 'voice' },
      { xPct: 45, yPct: 37, radiusPct: 5.3, band: 'bass' },
      { xPct: 55, yPct: 37, radiusPct: 5.3, band: 'bass' },
      { xPct: 76, yPct: 36, radiusPct: 4.6, band: 'voice' },
      { xPct: 50, yPct: 23, radiusPct: 3.4, band: 'driver' },
    ],
  },
  {
    id: 'la-super-rodeo-2',
    name: 'Super Rodeo 2.0',
    nickname: 'Voltaje Verde & Plata',
    category: 'suv',
    image: '/assets/vehicles/la-super-rodeo-2.webp',
    price: 38000,
    maxDb: 148,
    bassPower: 88,
    driverCount: 26,
    voiceCount: 68,
    subCount: 16,
    accentColor: '#10B981',
    description:
      'Jeepeta Rodeo con muro de 110 bocinas, 16 subwoofers de carrera larga y agudos cristalinos.',
    speakerZones: [
      { xPct: 20, yPct: 36, radiusPct: 5, band: 'voice' },
      { xPct: 38, yPct: 36, radiusPct: 5.5, band: 'bass' },
      { xPct: 62, yPct: 36, radiusPct: 5.5, band: 'bass' },
      { xPct: 80, yPct: 36, radiusPct: 5, band: 'voice' },
      { xPct: 32, yPct: 20, radiusPct: 3.4, band: 'driver' },
      { xPct: 68, yPct: 20, radiusPct: 3.4, band: 'driver' },
    ],
  },
  {
    id: 'el-presidente',
    name: 'El Presidente',
    nickname: 'Autoridad del Cibao',
    category: 'suv',
    image: '/assets/vehicles/el-presidente.webp',
    price: 46000,
    maxDb: 150,
    bassPower: 90,
    driverCount: 30,
    voiceCount: 72,
    subCount: 17,
    accentColor: '#6366F1',
    description:
      'SUV ejecutiva blindada con 119 bocinas balanceadas para mantener presión constante en duelos largos.',
    speakerZones: [
      { xPct: 22, yPct: 34, radiusPct: 5, band: 'voice' },
      { xPct: 45, yPct: 35, radiusPct: 5.8, band: 'bass' },
      { xPct: 55, yPct: 35, radiusPct: 5.8, band: 'bass' },
      { xPct: 78, yPct: 34, radiusPct: 5, band: 'voice' },
      { xPct: 50, yPct: 18, radiusPct: 3.5, band: 'driver' },
    ],
  },
  {
    id: 'la-super-crv',
    name: 'La Super CRV',
    nickname: 'Presión Honda',
    category: 'suv',
    image: '/assets/vehicles/la-super-crv.webp',
    price: 62000,
    maxDb: 153,
    bassPower: 93,
    driverCount: 36,
    voiceCount: 90,
    subCount: 20,
    accentColor: '#06B6D4',
    description:
      'CR-V modificada con kitipón de 146 bocinas y túnel reforzado que dispara bajos profundos a distancia.',
    speakerZones: [
      { xPct: 18, yPct: 34, radiusPct: 5.2, band: 'voice' },
      { xPct: 38, yPct: 35, radiusPct: 5.8, band: 'bass' },
      { xPct: 62, yPct: 35, radiusPct: 5.8, band: 'bass' },
      { xPct: 82, yPct: 34, radiusPct: 5.2, band: 'voice' },
      { xPct: 28, yPct: 16, radiusPct: 3.4, band: 'driver' },
      { xPct: 72, yPct: 16, radiusPct: 3.4, band: 'driver' },
    ],
  },
  {
    id: 'la-bestia-blanca',
    name: 'La Bestia Blanca',
    nickname: 'Muro Blanco Perla',
    category: 'suv',
    image: '/assets/vehicles/la-bestia-blanca.webp',
    price: 72000,
    maxDb: 155,
    bassPower: 95,
    driverCount: 38,
    voiceCount: 88,
    subCount: 22,
    accentColor: '#F8FAFC',
    description:
      'Chipeo blanco impecable con 148 bocinas y bancada de baterías ampliada para cero caída de voltaje.',
    speakerZones: [
      { xPct: 20, yPct: 33, radiusPct: 5.3, band: 'voice' },
      { xPct: 44, yPct: 34, radiusPct: 6, band: 'bass' },
      { xPct: 56, yPct: 34, radiusPct: 6, band: 'bass' },
      { xPct: 80, yPct: 33, radiusPct: 5.3, band: 'voice' },
      { xPct: 50, yPct: 15, radiusPct: 3.6, band: 'driver' },
    ],
  },
  {
    id: 'el-patron',
    name: 'El Patrón Rojo',
    nickname: 'Fuego en la Pista',
    category: 'extremo',
    image: '/assets/vehicles/el-patron.webp',
    price: 94000,
    maxDb: 158,
    bassPower: 97,
    driverCount: 34,
    voiceCount: 80,
    subCount: 20,
    accentColor: '#F43F5E',
    description:
      'Muro de competencia de 134 bocinas con acabado escarlata y trompetas de largo alcance para caravanas.',
    speakerZones: [
      { xPct: 18, yPct: 32, radiusPct: 5.4, band: 'voice' },
      { xPct: 40, yPct: 33, radiusPct: 6.2, band: 'bass' },
      { xPct: 60, yPct: 33, radiusPct: 6.2, band: 'bass' },
      { xPct: 82, yPct: 32, radiusPct: 5.4, band: 'voice' },
      { xPct: 30, yPct: 14, radiusPct: 3.6, band: 'driver' },
      { xPct: 70, yPct: 14, radiusPct: 3.6, band: 'driver' },
    ],
  },
  {
    id: 'la-galactica',
    name: 'La Galáctica',
    nickname: 'Estrella del Monumento',
    category: 'extremo',
    image: '/assets/vehicles/la-galactica.webp',
    price: 110000,
    maxDb: 160,
    bassPower: 98,
    driverCount: 44,
    voiceCount: 97,
    subCount: 24,
    accentColor: '#A855F7',
    description:
      'Estructura futurista de 165 bocinas con iluminación neón violeta y subgraves de competición.',
    speakerZones: [
      { xPct: 17, yPct: 32, radiusPct: 5.4, band: 'voice' },
      { xPct: 38, yPct: 32, radiusPct: 6.2, band: 'bass' },
      { xPct: 62, yPct: 32, radiusPct: 6.2, band: 'bass' },
      { xPct: 83, yPct: 32, radiusPct: 5.4, band: 'voice' },
      { xPct: 50, yPct: 14, radiusPct: 3.8, band: 'driver' },
    ],
  },
  {
    id: 'la-patrol',
    name: 'La Patrol Cibao',
    nickname: 'Gigante 229',
    category: 'extremo',
    image: '/assets/vehicles/la-patrol.webp',
    price: 138000,
    maxDb: 164,
    bassPower: 99,
    driverCount: 62,
    voiceCount: 135,
    subCount: 32,
    accentColor: '#3B82F6',
    description:
      'Nissan Patrol monumental armada con 229 bocinas reales, 32 bajos y batería industrial para retumbar cuadras.',
    speakerZones: [
      { xPct: 15, yPct: 30, radiusPct: 5.5, band: 'voice' },
      { xPct: 35, yPct: 31, radiusPct: 6.4, band: 'bass' },
      { xPct: 50, yPct: 31, radiusPct: 6.4, band: 'bass' },
      { xPct: 65, yPct: 31, radiusPct: 6.4, band: 'bass' },
      { xPct: 85, yPct: 30, radiusPct: 5.5, band: 'voice' },
      { xPct: 26, yPct: 13, radiusPct: 3.8, band: 'driver' },
      { xPct: 74, yPct: 13, radiusPct: 3.8, band: 'driver' },
    ],
  },
  {
    id: 'la-vitrina',
    name: 'La Vitrina',
    nickname: 'Exhibición 292',
    category: 'extremo',
    image: '/assets/vehicles/la-vitrina.webp',
    price: 160000,
    maxDb: 166,
    bassPower: 100,
    driverCount: 78,
    voiceCount: 174,
    subCount: 40,
    accentColor: '#EC4899',
    description:
      'Escaparate rodante de 292 bocinas diseñadas para exhibiciones oficiales y duelos de máxima potencia.',
    speakerZones: [
      { xPct: 15, yPct: 30, radiusPct: 5.6, band: 'voice' },
      { xPct: 36, yPct: 32, radiusPct: 6.5, band: 'bass' },
      { xPct: 64, yPct: 32, radiusPct: 6.5, band: 'bass' },
      { xPct: 85, yPct: 30, radiusPct: 5.6, band: 'voice' },
      { xPct: 50, yPct: 72, radiusPct: 6.6, band: 'bass' },
      { xPct: 50, yPct: 12, radiusPct: 3.9, band: 'driver' },
    ],
  },
  {
    id: 'la-super-camaro',
    name: 'La Super Camaro',
    nickname: 'Leyenda 293 dB',
    category: 'extremo',
    image: '/assets/vehicles/la-super-camaro.webp',
    price: 185000,
    maxDb: 168,
    bassPower: 100,
    driverCount: 80,
    voiceCount: 171,
    subCount: 42,
    accentColor: '#F97316',
    description:
      'La máquina definitiva: Chevrolet Camaro con 293 bocinas y 42 subwoofers extremos para coronarte rey del patio.',
    speakerZones: [
      { xPct: 16, yPct: 30, radiusPct: 5.8, band: 'voice' },
      { xPct: 35, yPct: 31, radiusPct: 6.6, band: 'bass' },
      { xPct: 50, yPct: 31, radiusPct: 6.8, band: 'bass' },
      { xPct: 65, yPct: 31, radiusPct: 6.6, band: 'bass' },
      { xPct: 84, yPct: 30, radiusPct: 5.8, band: 'voice' },
      { xPct: 28, yPct: 12, radiusPct: 4, band: 'driver' },
      { xPct: 50, yPct: 12, radiusPct: 4, band: 'driver' },
      { xPct: 72, yPct: 12, radiusPct: 4, band: 'driver' },
    ],
  },
];

export interface CoilTierSpec {
  level: CoilLevel;
  name: string;
  price: number;
  toleranceBoost: number; // multiplier reducing clip wear
  maxDbBonus: number;
  badgeColor: string;
}

export const COIL_TIERS: Record<CoilLevel, CoilTierSpec> = {
  1: {
    level: 1,
    name: 'Básica (Fábrica)',
    price: 0,
    toleranceBoost: 1.0,
    maxDbBonus: 0,
    badgeColor: '#94A3B8',
  },
  2: {
    level: 2,
    name: 'Cobre Reforzado (Media)',
    price: 6500,
    toleranceBoost: 1.35,
    maxDbBonus: 2,
    badgeColor: '#38BDF8',
  },
  3: {
    level: 3,
    name: 'Aluminio Plano (Alta)',
    price: 16000,
    toleranceBoost: 1.75,
    maxDbBonus: 4,
    badgeColor: '#F59E0B',
  },
  4: {
    level: 4,
    name: 'Titanio Competición (Élite)',
    price: 34000,
    toleranceBoost: 2.35,
    maxDbBonus: 6,
    badgeColor: '#EF4444',
  },
};

export interface StageLocationSpec {
  id: StageLocation;
  name: string;
  subtitle: string;
  bgImage: string;
  bgStyle: string;
  floorColor: string;
}

export const STAGE_LOCATIONS: StageLocationSpec[] = [
  {
    id: 'campo',
    name: 'Campo / Rancho Cibao',
    subtitle: 'Patio de tierra, palma y atardecer abierto',
    bgImage: '/src/assets/images/stage_campo_cibao_1794933252470.jpg',
    bgStyle: 'radial-gradient(circle at 50% 35%, #1A2F1D 0%, #0A150E 68%, #040906 100%)',
    floorColor: '#22C55E',
  },
  {
    id: 'patio',
    name: 'Monumento Santiago',
    subtitle: 'Plaza nocturna frente al corazón del Cibao',
    bgImage: '/src/assets/images/stage_monumento_santiago_1794933253267.jpg',
    bgStyle: 'radial-gradient(circle at 50% 35%, #12233E 0%, #090D16 70%, #05070C 100%)',
    floorColor: '#0EA5E9',
  },
  {
    id: 'colmado',
    name: 'Colmado Nocturno',
    subtitle: 'Esquina caliente con luces de barrio y coro',
    bgImage: '/src/assets/images/stage_colmado_nocturno_1794933253991.jpg',
    bgStyle: 'radial-gradient(circle at 50% 35%, #2D1810 0%, #140B0C 68%, #070508 100%)',
    floorColor: '#F59E0B',
  },
  {
    id: 'discoteca',
    name: 'Discoteca Arena LED',
    subtitle: 'Pista cubierta con estrobos azul y oro',
    bgImage: '/src/assets/images/stage_discoteca_arena_1794933254094.jpg',
    bgStyle: 'radial-gradient(circle at 50% 35%, #24103B 0%, #0E091A 68%, #06040C 100%)',
    floorColor: '#A855F7',
  },
  {
    id: 'carwash',
    name: 'Car Wash El Cibao',
    subtitle: 'Concreto mojado bajo luces LED nocturnas',
    bgImage: '/src/assets/images/stage_carwash_cibao_1794933253978.jpg',
    bgStyle: 'radial-gradient(circle at 50% 35%, #112B35 0%, #09141C 68%, #04090E 100%)',
    floorColor: '#38BDF8',
  },
];

export const RADIO_ACCENT_COLORS = [
  { id: 'sky', label: 'Azul Cibao', hex: '#0EA5E9' },
  { id: 'emerald', label: 'Verde Montero', hex: '#22C55E' },
  { id: 'amber', label: 'Oro 24K', hex: '#F59E0B' },
  { id: 'red', label: 'Rojo Dembow', hex: '#EF4444' },
  { id: 'purple', label: 'Violeta LED', hex: '#A855F7' },
  { id: 'ice', label: 'Blanco Hielo', hex: '#E2E8F0' },
];

export const RACK_FINISHES = [
  { id: 'brushed' as const, label: 'Metal Cepillado' },
  { id: 'carbon' as const, label: 'Fibra Carbono' },
  { id: 'wood' as const, label: 'Madera Cibaeña' },
  { id: 'neon' as const, label: 'Neón Oscuro' },
];

export const RACK_SHAPES = [
  { id: 'square' as const, label: 'Cuadrado' },
  { id: 'rounded' as const, label: 'Redondeado' },
  { id: 'bevel' as const, label: 'Biselado' },
];

export interface AchievementSpec {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  check: (p: PlayerProfile) => boolean;
}

export const ACHIEVEMENTS_CATALOG: AchievementSpec[] = [
  {
    id: 'ach-first-135',
    title: 'Calentando el Patio',
    description: 'Alcanza al menos 135 dB reales en tu medidor.',
    rewardCoins: 2000,
    check: (p) => p.peakDbRecord >= 135,
  },
  {
    id: 'ach-150-king',
    title: 'Muralla 150+ dB',
    description: 'Rompe la barrera de los 150 dB de presión sonora.',
    rewardCoins: 7500,
    check: (p) => p.peakDbRecord >= 150,
  },
  {
    id: 'ach-collector-3',
    title: 'Coleccionista del Cibao',
    description: 'Ten al menos 3 vehículos en tu garaje.',
    rewardCoins: 5000,
    check: (p) => p.ownedGuaguas.length >= 3,
  },
  {
    id: 'ach-clan-boss',
    title: 'Patrón de Clan',
    description: 'Funda tu propio clan de chipeo.',
    rewardCoins: 6000,
    check: (p) => Boolean(p.clan),
  },
  {
    id: 'ach-coil-elite',
    title: 'Bobinado Profesional',
    description: 'Mejora cualquiera de tus bobinas a nivel Alto o Élite.',
    rewardCoins: 4500,
    check: (p) => p.coils.bass >= 3 || p.coils.voice >= 3 || p.coils.drivers >= 3,
  },
  {
    id: 'ach-event-champ',
    title: 'Campeón de Evento dB',
    description: 'Supera al menos 1 reto cronometrado de Eventos dB.',
    rewardCoins: 4000,
    check: (p) => p.eventsWon >= 1,
  },
];

export interface DbEventSpec {
  id: string;
  title: string;
  subtitle: string;
  targetDb: number;
  durationSeconds: number;
  rewardCoins: number;
  rewardXp: number;
}

export const DB_EVENTS_CATALOG: DbEventSpec[] = [
  {
    id: 'evt-colmado-132',
    title: 'Copa Colmado Santiago',
    subtitle: 'Mantén una media mínima de 132 dB durante 12 segundos sin pausar.',
    targetDb: 132,
    durationSeconds: 12,
    rewardCoins: 3500,
    rewardXp: 140,
  },
  {
    id: 'evt-caravana-144',
    title: 'Reto Caravana Monumental',
    subtitle: 'Sube tu rack a 144 dB promedio durante 12 segundos.',
    targetDb: 144,
    durationSeconds: 12,
    rewardCoins: 8000,
    rewardXp: 280,
  },
  {
    id: 'evt-nacional-154',
    title: 'Gran Torneo Nacional dB',
    subtitle: 'Exige bobinas y muro grande: 154 dB promedio durante 12 segundos.',
    targetDb: 154,
    durationSeconds: 12,
    rewardCoins: 16000,
    rewardXp: 520,
  },
];

export interface DailySpecialEventSpec {
  id: string;
  title: string;
  subtitle: string;
  targetDb: number;
  durationSeconds: number;
  rewardCoins: number;
  rewardXp: number;
  rewardGuaguaId?: string;
  badge: string;
}

export const BERETTA_SPECIAL_EVENT: DailySpecialEventSpec = {
  id: 'daily-beretta-2-0',
  title: 'Evento Especial: Copa Beretta 2.0',
  subtitle: 'Mantén 134 dB promedio por 10s para desbloquear gratis la Beretta 2.0 (CR-V Azul) o ganar bono de monedas.',
  targetDb: 134,
  durationSeconds: 10,
  rewardCoins: 12500,
  rewardXp: 360,
  rewardGuaguaId: 'beretta-2-0',
  badge: 'PREMIO GUAGUA',
};

export const DAILY_SPECIAL_EVENTS_POOL: DailySpecialEventSpec[] = [
  {
    id: 'daily-cibao-santiago',
    title: 'Especial del Día: Caravana Monumental',
    subtitle: 'Sostén 130 dB promedio durante 10 segundos con tu equipo.',
    targetDb: 130,
    durationSeconds: 10,
    rewardCoins: 6500,
    rewardXp: 190,
    badge: 'DIARIO +6,500',
  },
  {
    id: 'daily-kitipon-808',
    title: 'Especial del Día: Desafío Kitipón 808',
    subtitle: 'Activa tu subgrave y mantén 136 dB por 10 segundos.',
    targetDb: 136,
    durationSeconds: 10,
    rewardCoins: 9500,
    rewardXp: 260,
    badge: 'DIARIO +9,500',
  },
  {
    id: 'daily-colmado-noche',
    title: 'Especial del Día: Colmadón Caliente',
    subtitle: 'Mantén 128 dB promedio por 10 segundos sin apagar la música.',
    targetDb: 128,
    durationSeconds: 10,
    rewardCoins: 5200,
    rewardXp: 150,
    badge: 'DIARIO +5,200',
  },
  {
    id: 'daily-titanio-pro',
    title: 'Especial del Día: Torneo Titanio dB',
    subtitle: 'Prueba tus bobinas: sostén 142 dB por 10 segundos.',
    targetDb: 142,
    durationSeconds: 10,
    rewardCoins: 14000,
    rewardXp: 390,
    badge: 'DIARIO +14,000',
  },
  {
    id: 'daily-moca-bajo',
    title: 'Especial del Día: Batalla de Moca',
    subtitle: 'Sube tu ATEQ y mantén 133 dB promedio durante 10 segundos.',
    targetDb: 133,
    durationSeconds: 10,
    rewardCoins: 7800,
    rewardXp: 220,
    badge: 'DIARIO +7,800',
  },
  {
    id: 'daily-patron-supremo',
    title: 'Especial del Día: Rey del Bajo',
    subtitle: 'Alcanza una media de 146 dB por 10 segundos para premio mayor.',
    targetDb: 146,
    durationSeconds: 10,
    rewardCoins: 18500,
    rewardXp: 480,
    badge: 'DIARIO +18,500',
  },
];

export const DEFAULT_EQ: EqSettings = {
  volume: 68,
  subLevel: 72,
  fader: 0,
  hz50: 4,
  hz125: 3,
  hz315: 1,
  hz750: 2,
  khz2_2: 3,
  khz6: 4,
  khz16: 3,
  eqBypass: false,
  muted: false,
  crossoverEnabled: true,
  dspMode: 'crossover',
  lpfSubHz: 110,
  hpfVoiceHz: 180,
  redVol: 105,
  redSub: 100,
  redSubBass: 2,
  redMidBass: 1,
  redMid: 1,
  redTreble: 2,
  redInputBoost: true,
};

export const FULL_HEALTH: ComponentHealth = {
  drivers: 100,
  voice: 100,
  bass: 100,
  battery: 100,
};

export const REPAIR_BASE_COSTS = {
  drivers: 1800,
  voice: 2200,
  bass: 3000,
  battery: 1200,
};

export interface BuiltInTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  bassHz: number;
  pattern: 'dembow' | 'chipeo-cibao' | 'perreo-bajo';
}

export const BUILTIN_TRACKS: BuiltInTrack[] = [
  {
    id: 'builtin-santiago-808',
    title: 'Santiago Bajo Cero (808)',
    artist: 'DJ Cibao Flow',
    bpm: 118,
    bassHz: 46,
    pattern: 'chipeo-cibao',
  },
  {
    id: 'builtin-dembow-calle',
    title: 'Dembow del Monumento',
    artist: 'El Patio Records',
    bpm: 124,
    bassHz: 52,
    pattern: 'dembow',
  },
  {
    id: 'builtin-kitipon-ultra',
    title: 'Kitipón 14.5V Test',
    artist: 'Chipeo Lab RD',
    bpm: 112,
    bassHz: 41,
    pattern: 'perreo-bajo',
  },
];

export const PRESET_AVATARS = [
  { id: 'cibao-crown', label: 'Rey del Cibao', bg: '#0EA5E9', initials: 'RC' },
  { id: 'dembow-king', label: 'Flow Santiago', bg: '#DC2626', initials: 'FS' },
  { id: 'oro-24k', label: 'Oro 24K', bg: '#D97706', initials: '24' },
  { id: 'verde-montero', label: 'Montero RD', bg: '#16A34A', initials: 'MR' },
];

export function makeAvatarSvgDataUrl(initials: string, bg: string): string {
  const safe = initials.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${bg}"/><text x="64" y="76" font-family="Arial,sans-serif" font-weight="800" font-size="44" fill="#ffffff" text-anchor="middle">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

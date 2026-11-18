import { useMemo, useState } from 'react';
import {
  BatteryCharging,
  Check,
  Coins,
  Cpu,
  Search,
  ShoppingBag,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-react';
import { COIL_TIERS, FULL_HEALTH, GUAGUA_CATALOG } from '../game/catalog';
import { CoilBand, getComponentRepairCost } from '../game/rules';
import { CoilLevel, ComponentKey, GuaguaCategory, PlayerProfile } from '../game/types';

interface ShopAndRepairViewProps {
  profile: PlayerProfile;
  onBuyOrEquipGuagua: (guaguaId: string) => { ok: boolean; message: string };
  onRepairComponent: (guaguaId: string, component: ComponentKey) => { ok: boolean; message: string };
  onRechargeBattery: (guaguaId: string) => { ok: boolean; message: string };
  onUpgradeCoil: (band: CoilBand) => { ok: boolean; message: string };
  onGoToEvents?: () => void;
}

const COMPONENT_META: { key: ComponentKey; title: string; subtitle: string }[] = [
  { key: 'drivers', title: 'Drivers y Trompetas', subtitle: 'Frecuencias altas (6KHz – 16KHz)' },
  { key: 'voice', title: 'Bocinas de Voz / Medios', subtitle: 'Claridad de voces y dembow (315Hz – 2.2KHz)' },
  { key: 'bass', title: 'Bajos / Subwoofers', subtitle: 'Golpe de sub-bajo (50Hz – 125Hz)' },
  { key: 'battery', title: 'Bancada de Baterías 14.5V', subtitle: 'Estabilidad de amperaje en el rack' },
];

const COIL_META: { band: CoilBand; title: string; desc: string }[] = [
  {
    band: 'bass',
    title: 'Bobina de Bajos (Subwoofers)',
    desc: 'Aumenta resistencia térmica en subgraves y suma presión máxima.',
  },
  {
    band: 'voice',
    title: 'Bobina de Medios / Voz',
    desc: 'Soporta más potencia en frecuencias medias sin quemarse.',
  },
  {
    band: 'drivers',
    title: 'Bobina de Drivers (Titanio)',
    desc: 'Evita que el clipping queme las trompetas en agudos altos.',
  },
];

const CATEGORY_TABS: { id: 'all' | GuaguaCategory; label: string }[] = [
  { id: 'all', label: `Todas (${GUAGUA_CATALOG.length})` },
  { id: 'original', label: 'Patio Original' },
  { id: 'sedan', label: 'Sedanes' },
  { id: 'suv', label: 'SUVs' },
  { id: 'extremo', label: 'Muros Extremos' },
];

export function ShopAndRepairView({
  profile,
  onBuyOrEquipGuagua,
  onRepairComponent,
  onRechargeBattery,
  onUpgradeCoil,
  onGoToEvents,
}: ShopAndRepairViewProps) {
  const [tab, setTab] = useState<'shop' | 'repair'>('shop');
  const [category, setCategory] = useState<'all' | GuaguaCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const equippedHealth = profile.guaguaHealth[profile.equippedGuaguaId] ?? FULL_HEALTH;
  const equippedSpec =
    GUAGUA_CATALOG.find((g) => g.id === profile.equippedGuaguaId) ?? GUAGUA_CATALOG[0];

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GUAGUA_CATALOG.filter((g) => {
      const catOk = category === 'all' || g.category === category;
      const qOk =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.nickname.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [category, searchQuery]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6" data-testid="shop-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-white leading-none">
            CONCESIONARIO ({GUAGUA_CATALOG.length}) Y TALLER
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Compra cualquiera de los {GUAGUA_CATALOG.length} vehículos reales, mejora tus bobinas o recarga y repara tu equipo.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#101624] border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('shop')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'shop' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Tienda ({GUAGUA_CATALOG.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('repair')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'repair' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>Taller &amp; Bobinas</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-semibold border ${
            feedback.ok
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {tab === 'shop' ? (
        <div className="space-y-4">
          {/* Filter + Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-[#101624] border border-slate-800 p-3.5">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {CATEGORY_TABS.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setCategory(ct.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                    category === ct.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-[#0B101B] text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar guagua o modelo..."
                aria-label="Buscar guagua en tienda"
                className="w-full rounded-xl bg-[#0B101B] border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            data-testid="vehicle-catalog-grid"
          >
            {filteredVehicles.map((g) => {
              const owned = profile.ownedGuaguas.includes(g.id);
              const equipped = profile.equippedGuaguaId === g.id;
              const canAfford = profile.coins >= g.price;

              return (
                <article
                  key={g.id}
                  data-testid={`vehicle-card-${g.id}`}
                  className={`rounded-2xl bg-[#101624] border p-5 flex flex-col justify-between transition-colors ${
                    equipped ? 'border-sky-500' : 'border-slate-800'
                  }`}
                >
                  <div>
                      <div className="relative h-48 w-full rounded-xl bg-[#070A10] flex items-center justify-center p-3 overflow-hidden mb-4">
                        {g.eventExclusive && (
                          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-pink-500/25 border border-pink-400/50 text-[10px] font-extrabold text-pink-200">
                            🏆 Evento Especial Hoy
                          </span>
                        )}
                        <img
                          src={g.image}
                          alt={g.name}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="font-display text-2xl font-extrabold text-white leading-tight">
                            {g.name}
                          </h2>
                          <p className="text-xs text-slate-400">{g.nickname}</p>
                        </div>
                        <span className="font-mono-num text-sm font-bold text-sky-400 shrink-0">
                          {g.maxDb} dB
                        </span>
                      </div>

                      <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">{g.description}</p>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div>
                          <span className="block text-[10px] uppercase">Bajos</span>
                          <span className="font-mono-num font-bold text-slate-200">{g.subCount} Subs</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase">Voces</span>
                          <span className="font-mono-num font-bold text-slate-200">{g.voiceCount} Med</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase">Drivers</span>
                          <span className="font-mono-num font-bold text-slate-200">{g.driverCount} Drv</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <span className="font-mono-num text-sm font-bold text-amber-400">
                          {g.price === 0 ? 'Incluida' : g.price.toLocaleString('es-DO')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {g.eventExclusive && !owned && onGoToEvents && (
                          <button
                            type="button"
                            onClick={onGoToEvents}
                            className="px-2.5 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 text-[11px] font-bold text-pink-200 cursor-pointer whitespace-nowrap"
                          >
                            Ganar Gratis
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const res = onBuyOrEquipGuagua(g.id);
                            setFeedback({ ok: res.ok, text: res.message });
                          }}
                          disabled={equipped || (!owned && !canAfford)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            equipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : owned
                                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                                : canAfford
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            <span className="inline-flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Equipada
                            </span>
                          ) : owned ? (
                            'Equipar'
                          ) : (
                            'Comprar'
                          )}
                        </button>
                      </div>
                    </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Repair & Quick Recharge Panel */}
          <div className="rounded-2xl bg-[#101624] border border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img
                  src={equippedSpec.image}
                  alt={equippedSpec.name}
                  referrerPolicy="no-referrer"
                  className="h-16 w-24 object-contain rounded-lg bg-[#070A10] p-1"
                />
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-white">
                    Diagnóstico: {equippedSpec.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Si sobrecargas el radio en zona de clipping, tus drivers y bocinas se queman y
                    pierdes presión sonora.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const res = onRechargeBattery(profile.equippedGuaguaId);
                    setFeedback({ ok: res.ok, text: res.message });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-300 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Recarga Rápida 14.5V</span>
                </button>
                <div className="flex items-center gap-1.5 text-sm font-bold text-amber-400 font-mono-num">
                  <Volume2 className="h-4 w-4 text-sky-400" />
                  <span>Máx: {equippedSpec.maxDb} dB</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPONENT_META.map((comp) => {
                const pct = Math.round(equippedHealth[comp.key]);
                const cost = getComponentRepairCost(pct, comp.key);
                const isBurned = pct <= 0;
                const isFull = pct >= 100;

                return (
                  <div
                    key={comp.key}
                    className="rounded-xl bg-[#0B101B] border border-slate-800 p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {comp.key === 'battery' && (
                            <BatteryCharging className="h-4 w-4 text-emerald-400" />
                          )}
                          <span>{comp.title}</span>
                        </h3>
                        <span
                          className={`font-mono-num text-xs font-bold ${
                            isBurned
                              ? 'text-red-400'
                              : pct < 45
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {isBurned ? 'QUEMADO (0%)' : `${pct}%`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{comp.subtitle}</p>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            isBurned ? 'bg-red-500' : pct < 45 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono-num text-xs text-amber-400 font-semibold">
                        {isFull ? 'Óptimo estado' : `Costo: ${cost.toLocaleString('es-DO')} monedas`}
                      </span>
                      <button
                        type="button"
                        disabled={isFull || profile.coins < cost}
                        onClick={() => {
                          const res = onRepairComponent(profile.equippedGuaguaId, comp.key);
                          setFeedback({ ok: res.ok, text: res.message });
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                          isFull
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : profile.coins >= cost
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isFull ? 'Al 100%' : isBurned ? 'Reemplazar' : 'Reparar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coil Upgrades Section */}
          <div
            className="rounded-2xl bg-[#101624] border border-slate-800 p-6"
            data-testid="coil-upgrades-section"
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Cpu className="h-5 w-5 text-sky-400" />
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white leading-none">
                  MEJORA DE BOBINAS (RESISTENCIA &amp; PRESIÓN)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sube tus bobinas de Básica hasta Titanio Élite para aguantar más volumen sin quemarte y ganar decibeles extra.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {COIL_META.map((item) => {
                const currentLevel = (profile.coils[item.band] ?? 1) as CoilLevel;
                const currentSpec = COIL_TIERS[currentLevel];
                const isMax = currentLevel >= 4;
                const nextSpec = !isMax ? COIL_TIERS[(currentLevel + 1) as CoilLevel] : null;
                const canAfford = nextSpec ? profile.coins >= nextSpec.price : false;

                return (
                  <div
                    key={item.band}
                    className="rounded-xl bg-[#0B101B] border border-slate-800 p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <span
                          className="font-mono-num text-xs font-bold"
                          style={{ color: currentSpec.badgeColor }}
                        >
                          Nv {currentLevel}/4
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-sky-300 mt-1">{currentSpec.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-[#070A10] rounded-lg p-2.5 border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block">Resistencia</span>
                          <span className="font-mono-num font-bold text-emerald-400">
                            {currentSpec.toleranceBoost}x
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Bono Presión</span>
                          <span className="font-mono-num font-bold text-amber-400">
                            +{currentSpec.maxDbBonus} dB
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isMax || !canAfford}
                      onClick={() => {
                        const res = onUpgradeCoil(item.band);
                        setFeedback({ ok: res.ok, text: res.message });
                      }}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                        isMax
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : canAfford
                            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax
                        ? 'Nivel Máximo (Élite)'
                        : `Subir a Nv ${nextSpec!.level} (${nextSpec!.price.toLocaleString('es-DO')} monedas)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

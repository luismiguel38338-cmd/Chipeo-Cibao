import React, { useState } from 'react';
import { Coins, Crown, Shield, Users } from 'lucide-react';
import { CLAN_CREATION_COST } from '../game/catalog';
import { PlayerProfile } from '../game/types';

interface ClansViewProps {
  profile: PlayerProfile;
  onCreateClan: (input: { name: string; tag: string; motto: string; color: string }) => {
    ok: boolean;
    message: string;
  };
}

const CLAN_COLORS = [
  { label: 'Azul Cibao', value: '#0EA5E9' },
  { label: 'Oro 24K', value: '#F59E0B' },
  { label: 'Rojo Furia', value: '#EF4444' },
  { label: 'Verde Kitipón', value: '#22C55E' },
];

const FEATURED_CLANS = [
  { name: 'Los Patrones de Santiago', tag: 'STG', members: 18, db: 159 },
  { name: 'La Vega Baja Cero', tag: 'LVG', members: 14, db: 154 },
  { name: 'San Francisco Sound Car', tag: 'SFM', members: 12, db: 151 },
];

export function ClansView({ profile, onCreateClan }: ClansViewProps) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [motto, setMotto] = useState('');
  const [color, setColor] = useState(CLAN_COLORS[0].value);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onCreateClan({ name, tag, motto, color });
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setName('');
      setTag('');
      setMotto('');
    }
  };

  const canAfford = profile.coins >= CLAN_CREATION_COST;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6" data-testid="clans-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-white leading-none">
            CLANES DE CHIPEO CIBAEÑO
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Funda tu propio clan por 50,000 monedas y representa tu zona en los duelos online.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-mono-num font-bold text-amber-400">
          <Coins className="h-4 w-4" />
          <span>Tu saldo: {profile.coins.toLocaleString('es-DO')}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          {profile.clan ? (
            <div className="rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center font-display text-2xl font-extrabold text-white border border-white/20"
                  style={{ backgroundColor: profile.clan.color }}
                >
                  {profile.clan.tag}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Tu Clan Fundado
                    </span>
                  </div>
                  <h2 className="font-display text-3xl font-extrabold text-white leading-none mt-1">
                    [{profile.clan.tag}] {profile.clan.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{profile.clan.motto}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Fundador</span>
                  <span className="font-bold text-white">{profile.clan.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Miembros</span>
                  <span className="font-mono-num font-bold text-sky-400">
                    {profile.clan.membersCount}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Récord del Clan</span>
                  <span className="font-mono-num font-bold text-emerald-400">
                    {Math.max(profile.clan.totalDbScore, profile.peakDbRecord)} dB
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-sky-400" />
                  <span>Crear Tu Propio Clan</span>
                </h2>
                <span className="font-mono-num text-sm font-bold text-amber-400">
                  Costo: {CLAN_CREATION_COST.toLocaleString('es-DO')} monedas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="clan-name-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Nombre del Clan
                  </label>
                  <input
                    id="clan-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Reyes del Chipeo"
                    maxLength={24}
                    required
                    className="w-full rounded-xl bg-[#0B101B] border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="clan-tag-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Etiqueta (TAG)
                  </label>
                  <input
                    id="clan-tag-input"
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value.toUpperCase())}
                    placeholder="CIB"
                    maxLength={5}
                    required
                    className="w-full rounded-xl bg-[#0B101B] border border-slate-700 px-3.5 py-2.5 text-sm text-white uppercase font-mono-num placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="clan-motto-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Lema del Clan
                </label>
                <input
                  id="clan-motto-input"
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="Ej. Sonando limpio desde Santiago"
                  maxLength={50}
                  className="w-full rounded-xl bg-[#0B101B] border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Color del Emblema
                </span>
                <div className="flex flex-wrap gap-2">
                  {CLAN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        color === c.value
                          ? 'border-white bg-slate-800 text-white'
                          : 'border-slate-700 bg-[#0B101B] text-slate-300'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.value }}
                      />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canAfford}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                  canAfford
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {canAfford
                  ? 'Fundar Clan (50,000 monedas)'
                  : `Faltan ${(CLAN_CREATION_COST - profile.coins).toLocaleString('es-DO')} monedas`}
              </button>
            </form>
          )}
        </div>

        {/* Regional Clans Leaderboard */}
        <div className="lg:col-span-5 rounded-2xl bg-[#101624] border border-slate-800 p-6">
          <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-amber-400" />
            <span>Clanes del Cibao</span>
          </h2>
          <div className="space-y-3">
            {FEATURED_CLANS.map((c, idx) => (
              <div
                key={c.tag}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#0B101B] border border-slate-800/90 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-num text-xs font-bold text-slate-500">
                    0{idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      [{c.tag}] {c.name}
                    </p>
                    <p className="text-xs text-slate-400">{c.members} miembros activos</p>
                  </div>
                </div>
                <span className="font-mono-num text-sm font-bold text-sky-400">{c.db} dB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

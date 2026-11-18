import { useEffect, useRef, useState } from 'react';
import {
  Award,
  CalendarClock,
  Check,
  CheckCircle2,
  Coins,
  Flame,
  Gift,
  Play,
  Radio,
  Sparkles,
  Trophy,
  Volume2,
} from 'lucide-react';
import {
  ACHIEVEMENTS_CATALOG,
  DAILY_REWARD_BASE_COINS,
  DailySpecialEventSpec,
  DB_EVENTS_CATALOG,
  DbEventSpec,
  GUAGUA_CATALOG,
} from '../game/catalog';
import {
  getClaimedDailyEventIds,
  getDailySpecialEvents,
  getLeaderboardEntries,
  getTodayDayKey,
} from '../game/rules';
import { PlayerProfile } from '../game/types';

interface ProgressEventsViewProps {
  profile: PlayerProfile;
  liveDb: number;
  isAudioPlaying: boolean;
  onStartAudioIfPaused: () => Promise<void>;
  onClaimDaily: () => { ok: boolean; message: string };
  onCompleteEvent: (evt: DbEventSpec, avgDb: number) => void;
  onCompleteDailyEvent: (evt: DailySpecialEventSpec) => { ok: boolean; message: string };
  onOpenShop?: () => void;
}

type ActiveChallenge =
  | { kind: 'classic'; event: DbEventSpec }
  | { kind: 'daily'; event: DailySpecialEventSpec };

export function ProgressEventsView({
  profile,
  liveDb,
  isAudioPlaying,
  onStartAudioIfPaused,
  onClaimDaily,
  onCompleteEvent,
  onCompleteDailyEvent,
  onOpenShop,
}: ProgressEventsViewProps) {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [avgDb, setAvgDb] = useState(0);

  const liveDbRef = useRef(liveDb);
  const samplesRef = useRef<number[]>([]);
  useEffect(() => {
    liveDbRef.current = liveDb;
  }, [liveDb]);

  useEffect(() => {
    if (!activeChallenge) return;

    const targetEvt = activeChallenge.event;
    samplesRef.current = [liveDbRef.current];
    setAvgDb(liveDbRef.current);

    let elapsedTicks = 0;
    const totalTicks = targetEvt.durationSeconds * 4; // 250ms ticks

    const timer = window.setInterval(() => {
      elapsedTicks++;
      samplesRef.current.push(liveDbRef.current);
      const sum = samplesRef.current.reduce((acc, v) => acc + v, 0);
      const currentAvg = Math.round(sum / samplesRef.current.length);
      setAvgDb(currentAvg);

      const remaining = Math.max(0, Math.ceil((totalTicks - elapsedTicks) / 4));
      setSecondsLeft(remaining);

      if (elapsedTicks >= totalTicks) {
        window.clearInterval(timer);
        const passed = currentAvg >= targetEvt.targetDb;
        const finished = activeChallenge;
        setActiveChallenge(null);

        if (passed) {
          if (finished.kind === 'daily') {
            const res = onCompleteDailyEvent(finished.event);
            setFeedback({ ok: res.ok, text: res.message });
          } else {
            onCompleteEvent(finished.event, currentAvg);
            setFeedback({
              ok: true,
              text: `🏆 ¡Superaste "${finished.event.title}" con ${currentAvg} dB promedio! +${finished.event.rewardCoins.toLocaleString('es-DO')} monedas.`,
            });
          }
        } else {
          setFeedback({
            ok: false,
            text: `Promedio final ${currentAvg} dB (meta: ${targetEvt.targetDb} dB). Sube el volumen o activa tu Red ATEQ y vuelve a intentar.`,
          });
        }
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [activeChallenge, onCompleteEvent, onCompleteDailyEvent]);

  const todayKey = getTodayDayKey();
  const claimedToday = profile.lastDailyClaimDay === todayKey;
  const nextDailyReward =
    DAILY_REWARD_BASE_COINS + Math.min(6, profile.dailyStreak) * 750;
  const leaderboard = getLeaderboardEntries(profile);
  const dailySpecialEvents = getDailySpecialEvents(todayKey);
  const claimedDailyEventIds = getClaimedDailyEventIds(profile, todayKey);

  const handleStartClassic = async (evt: DbEventSpec) => {
    setFeedback(null);
    if (!isAudioPlaying) {
      await onStartAudioIfPaused();
    }
    setSecondsLeft(evt.durationSeconds);
    setActiveChallenge({ kind: 'classic', event: evt });
  };

  const handleStartDailySpecial = async (evt: DailySpecialEventSpec) => {
    setFeedback(null);
    if (!isAudioPlaying) {
      await onStartAudioIfPaused();
    }
    setSecondsLeft(evt.durationSeconds);
    setActiveChallenge({ kind: 'daily', event: evt });
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6" data-testid="progress-view">
      <div>
        <h1 className="font-display text-4xl font-extrabold text-white leading-none">
          EVENTOS ESPECIALES, PROGRESO Y RANKING
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Cada día hay nuevos Eventos Especiales con monedas y la guagua exclusiva Beretta 2.0 en juego.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-semibold border ${
            feedback.ok
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Active Challenge Runner Banner */}
      {activeChallenge && (
        <div
          className="rounded-2xl bg-[#070B12] border-2 border-sky-400/70 p-5 space-y-4 shadow-2xl"
          data-testid="active-db-event-banner"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-sky-400">
                {activeChallenge.kind === 'daily'
                  ? 'Evento Especial en Curso'
                  : 'Reto dB en Progreso'}
              </p>
              <h3 className="text-xl font-extrabold text-white">
                {activeChallenge.event.title}
              </h3>
            </div>
            <span className="font-mono-num text-4xl font-extrabold text-amber-400">
              {secondsLeft}s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-[#0C121E] p-3 border border-slate-800">
              <p className="text-[11px] text-slate-400">Promedio Actual</p>
              <p
                className={`font-mono-num text-2xl font-bold ${
                  avgDb >= activeChallenge.event.targetDb ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {avgDb} dB
              </p>
            </div>
            <div className="rounded-xl bg-[#0C121E] p-3 border border-slate-800">
              <p className="text-[11px] text-slate-400">Meta Requerida</p>
              <p className="font-mono-num text-2xl font-bold text-white">
                {activeChallenge.event.targetDb} dB
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Mantén tu equipo sonando fuerte hasta que el contador llegue a 0s.
          </p>
        </div>
      )}

      {/* FEATURED: DAILY ROTATING SPECIAL EVENTS (with Beretta 2.0 CR-V Azul) */}
      <article
        className="rounded-2xl bg-[#101624] border border-pink-500/40 p-6 space-y-4"
        data-testid="daily-special-events-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-none">
                EVENTOS ESPECIALES DE HOY
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Rotan cada día ({todayKey}). Completa la Copa Beretta 2.0 para desbloquear gratis la nueva CR-V Azul.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B101B] border border-slate-700 text-xs font-bold text-sky-300">
            <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
            <span>3 Eventos Activos Hoy</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dailySpecialEvents.map((evt) => {
            const isClaimedToday = claimedDailyEventIds.includes(evt.id);
            const rewardGuagua = evt.rewardGuaguaId
              ? GUAGUA_CATALOG.find((g) => g.id === evt.rewardGuaguaId)
              : undefined;
            const alreadyOwnsGuagua = rewardGuagua
              ? profile.ownedGuaguas.includes(rewardGuagua.id)
              : false;

            return (
              <div
                key={evt.id}
                data-testid={`daily-event-card-${evt.id}`}
                className={`rounded-xl p-4 border flex flex-col justify-between gap-4 ${
                  rewardGuagua
                    ? 'bg-gradient-to-b from-[#1A1025] to-[#0B101B] border-pink-500/50'
                    : 'bg-[#0B101B] border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                        rewardGuagua
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {evt.badge}
                    </span>
                    <span className="font-mono-num text-xs font-bold text-sky-400">
                      Meta {evt.targetDb} dB · {evt.durationSeconds}s
                    </span>
                  </div>

                  {rewardGuagua && (
                    <div className="rounded-lg bg-[#060910] border border-white/10 p-2 flex items-center gap-3">
                      <img
                        src={rewardGuagua.image}
                        alt={rewardGuagua.name}
                        className="h-16 w-20 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">
                          {rewardGuagua.name}
                        </p>
                        <p className="text-[11px] text-pink-300">
                          {alreadyOwnsGuagua
                            ? 'Ya en tu garaje (+15k bono)'
                            : `Gratis (${rewardGuagua.maxDb} dB)`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-extrabold text-white leading-snug">
                      {evt.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{evt.subtitle}</p>
                  </div>

                  <p className="text-xs font-mono-num font-bold text-amber-400">
                    +{evt.rewardCoins.toLocaleString('es-DO')} monedas · +{evt.rewardXp} XP
                  </p>
                </div>

                {isClaimedToday ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Check className="h-4 w-4" />
                      <span>Completado Hoy</span>
                    </span>
                    {rewardGuagua && onOpenShop && (
                      <button
                        type="button"
                        onClick={onOpenShop}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer"
                      >
                        Ver en Garaje
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(activeChallenge)}
                    onClick={() => void handleStartDailySpecial(evt)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50 ${
                      rewardGuagua
                        ? 'bg-pink-500 hover:bg-pink-400 text-white'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Iniciar Evento Especial</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </article>

      {/* Middle Grid: Daily Streak + Classic Timed dB Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Reward & Streak */}
        <article className="lg:col-span-5 rounded-2xl bg-[#101624] border border-slate-800 p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-400" />
                <span>RECOMPENSA DIARIA</span>
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 font-mono-num">
                <Flame className="h-4 w-4" />
                Racha: {profile.dailyStreak} día(s)
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Entra todos los días para acumular bonos crecientes de monedas y XP en tu cuenta cifrada.
            </p>
            <div className="mt-4 rounded-xl bg-[#0B101B] border border-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Premio de Hoy</p>
                <p className="font-mono-num text-2xl font-bold text-amber-400">
                  +{nextDailyReward.toLocaleString('es-DO')}
                </p>
              </div>
              <span className="font-mono-num text-xs font-semibold text-sky-400">+75 XP</span>
            </div>
          </div>

          <button
            type="button"
            data-testid="claim-daily-btn"
            disabled={claimedToday}
            onClick={() => {
              const res = onClaimDaily();
              setFeedback({ ok: res.ok, text: res.message });
            }}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              claimedToday
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {claimedToday ? '✓ Recompensa de Hoy Reclamada' : 'Cobrar Recompensa Diaria'}
          </button>
        </article>

        {/* Classic Timed dB Events */}
        <article className="lg:col-span-7 rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
                <Radio className="h-5 w-5 text-sky-400" />
                <span>EVENTOS dB CLÁSICOS</span>
              </h2>
              <p className="text-xs text-slate-400">
                Retos cronometrados de 12 segundos usando la lectura real de tu panel Pioneer.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Lectura Actual</span>
              <span className="font-mono-num text-lg font-bold text-sky-400">{liveDb} dB</span>
            </div>
          </div>

          <div className="space-y-3">
            {DB_EVENTS_CATALOG.map((evt) => (
              <div
                key={evt.id}
                className="rounded-xl bg-[#0B101B] border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">{evt.title}</h3>
                    <span className="font-mono-num text-xs font-bold text-sky-400">
                      Meta {evt.targetDb} dB
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{evt.subtitle}</p>
                  <p className="mt-1.5 text-xs font-mono-num text-amber-400 font-semibold">
                    Premio: +{evt.rewardCoins.toLocaleString('es-DO')} monedas · +{evt.rewardXp} XP
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(activeChallenge)}
                  onClick={() => void handleStartClassic(evt)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Iniciar Reto</span>
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Bottom Grid: Achievements + Cibao Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Achievements */}
        <article className="lg:col-span-6 rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              <span>LOGROS DEL CHIPEO</span>
            </h2>
            <span className="font-mono-num text-xs font-bold text-slate-400">
              {profile.unlockedAchievements.length}/{ACHIEVEMENTS_CATALOG.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {ACHIEVEMENTS_CATALOG.map((ach) => {
              const unlocked = profile.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 ${
                    unlocked
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-[#0B101B] border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        unlocked ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{ach.title}</p>
                      <p className="text-xs text-slate-400">{ach.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-amber-400">
                      <Coins className="h-3.5 w-3.5" />
                      +{ach.rewardCoins.toLocaleString('es-DO')}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {unlocked ? 'Completado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Cibao Leaderboard */}
        <article className="lg:col-span-6 rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <span>RANKING DEL CIBAO</span>
            </h2>
            <span className="text-xs text-slate-400">Por Récord dB y Nivel</span>
          </div>

          <div className="space-y-2">
            {leaderboard.map((row, idx) => (
              <div
                key={row.id}
                className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 ${
                  row.isSelf
                    ? 'bg-sky-500/15 border-sky-500/50'
                    : 'bg-[#0B101B] border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`font-mono-num text-sm font-extrabold w-6 text-center ${
                      idx === 0
                        ? 'text-amber-400'
                        : idx === 1
                          ? 'text-slate-200'
                          : idx === 2
                            ? 'text-orange-400'
                            : 'text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="text-sm font-bold text-white truncate">
                      {row.clanTag ? `[${row.clanTag}] ` : ''}
                      {row.username} {row.isSelf ? '(Tú)' : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Nv {row.level} · {row.wins} victorias online
                    </p>
                  </div>
                </div>

                <span className="font-mono-num text-sm font-bold text-sky-400 shrink-0">
                  {row.peakDb} dB
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

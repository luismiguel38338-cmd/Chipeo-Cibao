import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Coins,
  Copy,
  Play,
  RefreshCw,
  Swords,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { chipeoAudio } from '../audio/chipeoAudio';
import { FULL_HEALTH, GUAGUA_CATALOG } from '../game/catalog';
import { BattleRoomSnapshot, PlayerProfile } from '../game/types';

interface OnlineBattleViewProps {
  profile: PlayerProfile;
  localDb: number;
  localBassEnergy: number;
  localVoiceEnergy: number;
  localDriverEnergy: number;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  onBattleFinished: (didWin: boolean, rewardCoins: number) => void;
}

interface OpenRoomSummary {
  roomCode: string;
  hostName: string;
  hostGuaguaId: string;
  potCoins: number;
}

export function OnlineBattleView({
  profile,
  localDb,
  localBassEnergy,
  localVoiceEnergy,
  localDriverEnergy,
  isAudioPlaying,
  onToggleAudio,
  onBattleFinished,
}: OnlineBattleViewProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>('');
  const rewardedRoomRef = useRef<string>('');

  const [wsConnected, setWsConnected] = useState(false);
  const [room, setRoom] = useState<BattleRoomSnapshot | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [statusError, setStatusError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [burstFlash, setBurstFlash] = useState<string | null>(null);

  const equippedHealth = profile.guaguaHealth[profile.equippedGuaguaId] ?? FULL_HEALTH;

  const fetchOpenRooms = async () => {
    try {
      const res = await fetch('/api/battle/rooms');
      if (res.ok) {
        const data = (await res.json()) as { rooms: OpenRoomSummary[] };
        setOpenRooms(data.rooms);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchOpenRooms();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/battle`;

    let closedByUser = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setStatusError('');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type: string;
            clientId?: string;
            room?: BattleRoomSnapshot;
            message?: string;
            burstBy?: string;
          };
          if (msg.type === 'CONNECTED' && msg.clientId) {
            clientIdRef.current = msg.clientId;
          } else if (msg.type === 'ROOM_STATE' && msg.room) {
            setRoom(msg.room);
            if (msg.burstBy) {
              setBurstFlash(msg.burstBy);
              chipeoAudio.playSfx('burst');
              window.setTimeout(() => setBurstFlash(null), 500);
            }
          } else if (msg.type === 'ERROR' && msg.message) {
            setStatusError(msg.message);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUser) {
          reconnectTimer = window.setTimeout(connect, 1800);
        }
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
      }
      wsRef.current?.close();
    };
  }, []);

  // Sync local audio telemetry to WebSocket room every 250ms
  useEffect(() => {
    if (!room || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const interval = window.setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'SYNC_PLAYER_STATE',
            clientId: clientIdRef.current,
            telemetry: {
              currentDb: localDb,
              bassEnergy: localBassEnergy,
              voiceEnergy: localVoiceEnergy,
              driverEnergy: localDriverEnergy,
              health: equippedHealth,
              isPlaying: isAudioPlaying,
            },
          })
        );
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [
    room,
    localDb,
    localBassEnergy,
    localVoiceEnergy,
    localDriverEnergy,
    equippedHealth,
    isAudioPlaying,
  ]);

  // Reward once when battle finishes
  useEffect(() => {
    if (!room || room.status !== 'finished') {
      if (room?.status === 'active') {
        rewardedRoomRef.current = '';
      }
      return;
    }
    const key = `${room.roomCode}-${room.players.map((p) => p.score).join('-')}`;
    if (rewardedRoomRef.current === key) return;
    rewardedRoomRef.current = key;

    const myId = clientIdRef.current;
    if (room.winnerClientId === myId) {
      onBattleFinished(true, room.potCoins);
    } else if (room.winnerClientId !== null) {
      onBattleFinished(false, 500);
    }
  }, [room, onBattleFinished]);

  const sendAction = (type: string, extra?: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setStatusError('Conectando al servidor de batallas...');
      return;
    }
    setStatusError('');
    wsRef.current.send(
      JSON.stringify({
        type,
        clientId: clientIdRef.current,
        player: {
          username: profile.username,
          avatarDataUrl: profile.avatarDataUrl,
          clanTag: profile.clan?.tag ?? null,
          guaguaId: profile.equippedGuaguaId,
          health: equippedHealth,
        },
        ...(extra || {}),
      })
    );
  };

  const myPlayer = room?.players.find((p) => p.clientId === clientIdRef.current) ?? room?.players[0];
  const opponent = room?.players.find((p) => p.clientId !== clientIdRef.current);

  const myGuagua =
    GUAGUA_CATALOG.find((g) => g.id === (myPlayer?.guaguaId ?? profile.equippedGuaguaId)) ??
    GUAGUA_CATALOG[0];
  const rivalGuagua = opponent
    ? GUAGUA_CATALOG.find((g) => g.id === opponent.guaguaId) ?? GUAGUA_CATALOG[0]
    : null;

  const totalScore = (myPlayer?.score ?? 0) + (opponent?.score ?? 0);
  const mySharePct =
    totalScore > 0 ? Math.round(((myPlayer?.score ?? 0) / totalScore) * 100) : 50;

  const now = Date.now();
  const burstReady = myPlayer ? now >= myPlayer.burstCooldownUntil : true;

  const handleCopyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5" data-testid="battle-view">
      {/* Header & Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-white leading-none">
            BATALLA ONLINE · PANTALLA DIVIDIDA
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Conéctate en tiempo real por WebSocket y mide tu guagua frente a frente con otro chipero.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span
            className={`font-semibold ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {wsConnected ? 'Servidor Online Conectado' : 'Reconectando al servidor...'}
          </span>
          {room && (
            <button
              type="button"
              onClick={() => {
                sendAction('LEAVE_ROOM');
                setRoom(null);
                void fetchOpenRooms();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
            >
              Salir de Sala
            </button>
          )}
        </div>
      </div>

      {statusError && (
        <div className="rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-2.5 text-xs text-red-300 font-medium">
          {statusError}
        </div>
      )}

      {/* Lobby Controls when not in a room */}
      {!room ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-5">
            <h2 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-sky-400" />
              <span>Entrar a Duelo Online</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => sendAction('QUICK_MATCH')}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm cursor-pointer transition-colors"
              >
                <Zap className="h-4 w-4" />
                <span>Emparejamiento Rápido</span>
              </button>

              <button
                type="button"
                onClick={() => sendAction('CREATE_ROOM')}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Crear Sala Privada</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!joinCodeInput.trim()) return;
                sendAction('JOIN_ROOM', { roomCode: joinCodeInput.trim() });
              }}
              className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Código de sala (Ej. CB42A)"
                maxLength={8}
                className="flex-1 rounded-xl bg-[#0B101B] border border-slate-700 px-4 py-3 text-sm text-white uppercase font-mono-num placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer whitespace-nowrap"
              >
                Unirse por Código
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-[#101624] border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-extrabold text-white">
                Salas Abiertas
              </h2>
              <button
                type="button"
                onClick={fetchOpenRooms}
                aria-label="Actualizar lista de salas abiertas"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {openRooms.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No hay salas esperando ahora mismo. Crea una sala privada o usa Emparejamiento
                Rápido y abre otra pestaña/dispositivo para retarte.
              </p>
            ) : (
              <div className="space-y-2.5">
                {openRooms.map((r) => (
                  <div
                    key={r.roomCode}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#0B101B] border border-slate-800 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{r.hostName}</p>
                      <p className="text-xs text-slate-400 font-mono-num">
                        Sala {r.roomCode} · Premio {r.potCoins.toLocaleString('es-DO')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => sendAction('JOIN_ROOM', { roomCode: r.roomCode })}
                      className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Retar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Split-Screen Battle Arena */
        <div className="space-y-4" data-testid="split-screen-arena">
          {/* Top Match Bar */}
          <div className="rounded-2xl bg-[#101624] border border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono-num text-sm font-bold text-sky-400">
                  SALA: {room.roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  aria-label="Copiar código de sala"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-center">
                {room.status === 'waiting' && (
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {room.players.length < 2
                      ? 'Esperando Rival Online...'
                      : 'Ambos Listos — Inicia la Batalla'}
                  </span>
                )}
                {room.status === 'countdown' && (
                  <span className="font-display text-3xl font-extrabold text-amber-400">
                    ARRANCA EN {room.countdownSeconds}...
                  </span>
                )}
                {room.status === 'active' && (
                  <span className="font-mono-num text-2xl font-bold text-white">
                    {room.remainingSeconds}s
                  </span>
                )}
                {room.status === 'finished' && (
                  <span className="font-display text-2xl font-extrabold text-emerald-400">
                    {room.winnerClientId === clientIdRef.current
                      ? `¡GANASTE +${room.potCoins.toLocaleString('es-DO')} MONEDAS!`
                      : room.winnerClientId === null
                        ? 'EMPATE EN EL PATIO'
                        : 'DERROTA EN ESTA RONDA'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono-num font-bold text-amber-400">
                <Coins className="h-4 w-4" />
                <span>Premio: {room.potCoins.toLocaleString('es-DO')}</span>
              </div>
            </div>

            {/* Live Tug-of-War Bar */}
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-sky-500 transition-all duration-200"
                style={{ width: `${mySharePct}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-200"
                style={{ width: `${100 - mySharePct}%` }}
              />
            </div>

            {room.status === 'waiting' && room.players.length >= 2 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => sendAction('START_BATTLE')}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  Iniciar Batalla Ahora
                </button>
              </div>
            )}

            {room.status === 'finished' && room.players.length >= 2 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => sendAction('REMATCH')}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  Revancha Inmediata
                </button>
              </div>
            )}
          </div>

          {/* SPLIT SCREEN: Left = Player, Right = Online Opponent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
            {/* LEFT PANEL: PLAYER */}
            <article
              className={`rounded-2xl bg-[#0C121F] border-2 p-5 flex flex-col justify-between transition-transform ${
                burstFlash === clientIdRef.current
                  ? 'border-sky-400 scale-[1.01]'
                  : 'border-sky-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <img
                    src={profile.avatarDataUrl}
                    alt={profile.username}
                    className="h-11 w-11 rounded-full object-cover border border-sky-400"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase text-sky-400">
                      Tú {profile.clan ? `[${profile.clan.tag}]` : ''}
                    </p>
                    <h3 className="text-base font-bold text-white">{profile.username}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase text-slate-400">Puntaje</p>
                  <p className="font-mono-num text-2xl font-bold text-sky-400">
                    {(myPlayer?.score ?? 0).toLocaleString('es-DO')}
                  </p>
                </div>
              </div>

              <div className="my-4 relative h-56 rounded-xl bg-[#070A10] flex items-center justify-center p-3 overflow-hidden">
                <img
                  src={myGuagua.image}
                  alt={myGuagua.name}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain transition-transform duration-75"
                  style={{
                    transform: isAudioPlaying
                      ? `scale(${1 + localBassEnergy * 0.05}) translateY(${-localBassEnergy * 4}px)`
                      : 'scale(1)',
                  }}
                />
                <span className="absolute top-3 right-3 font-mono-num text-lg font-bold text-white bg-black/70 px-2.5 py-1 rounded-lg">
                  {localDb} dB
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                    isAudioPlaying
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-sky-500 text-slate-950'
                  }`}
                >
                  {isAudioPlaying ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isAudioPlaying ? 'Sonando' : 'Prender Música'}</span>
                </button>

                <button
                  type="button"
                  disabled={room.status !== 'active' || !burstReady}
                  onClick={() => sendAction('TRIGGER_BASS_BURST')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                    room.status === 'active' && burstReady
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span>{burstReady ? 'Golpe de Bajo (+180)' : 'Recargando...'}</span>
                </button>
              </div>
            </article>

            {/* RIGHT PANEL: ONLINE RIVAL */}
            <article
              className={`rounded-2xl bg-[#0C121F] border-2 p-5 flex flex-col justify-between transition-transform ${
                opponent && burstFlash === opponent.clientId
                  ? 'border-red-400 scale-[1.01]'
                  : 'border-red-500/40'
              }`}
            >
              {opponent && rivalGuagua ? (
                <>
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <img
                        src={opponent.avatarDataUrl}
                        alt={opponent.username}
                        className="h-11 w-11 rounded-full object-cover border border-red-400"
                      />
                      <div>
                        <p className="text-xs font-bold uppercase text-red-400">
                          Rival {opponent.clanTag ? `[${opponent.clanTag}]` : ''}
                        </p>
                        <h3 className="text-base font-bold text-white">{opponent.username}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase text-slate-400">Puntaje</p>
                      <p className="font-mono-num text-2xl font-bold text-red-400">
                        {opponent.score.toLocaleString('es-DO')}
                      </p>
                    </div>
                  </div>

                  <div className="my-4 relative h-56 rounded-xl bg-[#070A10] flex items-center justify-center p-3 overflow-hidden">
                    <img
                      src={rivalGuagua.image}
                      alt={rivalGuagua.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain transition-transform duration-75"
                      style={{
                        transform: opponent.isPlaying
                          ? `scale(${1 + opponent.bassEnergy * 0.05}) translateY(${-opponent.bassEnergy * 4}px)`
                          : 'scale(1)',
                      }}
                    />
                    <span className="absolute top-3 right-3 font-mono-num text-lg font-bold text-white bg-black/70 px-2.5 py-1 rounded-lg">
                      {opponent.currentDb} dB
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Guagua: {rivalGuagua.name}</span>
                    <span>
                      {opponent.isPlaying ? 'Radio Pioneer activo' : 'En espera'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                  <Users className="h-10 w-10 text-slate-500 mb-3" />
                  <h3 className="font-display text-2xl font-extrabold text-white">
                    ESPERANDO OPONENTE ONLINE
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 max-w-xs">
                    Comparte el código de sala{' '}
                    <span className="font-mono-num font-bold text-sky-400">{room.roomCode}</span>{' '}
                    con otro jugador o abre otra ventana de Chipeo Cibaeño y únete para batallar en
                    pantalla dividida en vivo.
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { BattlePlayerSnapshot, BattleRoomSnapshot, ComponentHealth } from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const BATTLE_DURATION_SECONDS = 45;
const COUNTDOWN_SECONDS = 3;
const BATTLE_POT_COINS = 8000;

interface ServerPlayer extends BattlePlayerSnapshot {
  ws: WebSocket;
}

interface ServerBattleRoom {
  roomCode: string;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  countdownSeconds: number;
  remainingSeconds: number;
  potCoins: number;
  winnerClientId: string | null;
  players: Map<string, ServerPlayer>;
  timer: NodeJS.Timeout | null;
}

const rooms = new Map<string, ServerBattleRoom>();
const clientRoomMap = new Map<string, string>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CB';
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoom(room: ServerBattleRoom): BattleRoomSnapshot {
  return {
    roomCode: room.roomCode,
    status: room.status,
    countdownSeconds: room.countdownSeconds,
    remainingSeconds: room.remainingSeconds,
    potCoins: room.potCoins,
    winnerClientId: room.winnerClientId,
    players: Array.from(room.players.values()).map(({ ws: _ws, ...snap }) => snap),
  };
}

function broadcastRoom(room: ServerBattleRoom, extraEvent?: Record<string, unknown>): void {
  const payload = JSON.stringify({
    type: 'ROOM_STATE',
    room: serializeRoom(room),
    ...(extraEvent || {}),
  });
  for (const player of room.players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  }
}

function stopRoomTimer(room: ServerBattleRoom): void {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function startBattleLoop(room: ServerBattleRoom): void {
  stopRoomTimer(room);
  room.status = 'countdown';
  room.countdownSeconds = COUNTDOWN_SECONDS;
  room.remainingSeconds = BATTLE_DURATION_SECONDS;
  room.winnerClientId = null;

  for (const p of room.players.values()) {
    p.score = 0;
    p.burstCooldownUntil = 0;
  }

  broadcastRoom(room);

  let ticks = 0;
  room.timer = setInterval(() => {
    ticks++;
    if (room.players.size === 0) {
      stopRoomTimer(room);
      rooms.delete(room.roomCode);
      return;
    }

    if (room.status === 'countdown') {
      if (ticks % 4 === 0) {
        room.countdownSeconds -= 1;
        if (room.countdownSeconds <= 0) {
          room.status = 'active';
          room.countdownSeconds = 0;
        }
        broadcastRoom(room);
      }
      return;
    }

    if (room.status === 'active') {
      // Score accrual every 250ms based on real dB & bass output
      for (const p of room.players.values()) {
        if (p.isPlaying) {
          const dbAboveFloor = Math.max(0, p.currentDb - 90);
          const healthAvg =
            (p.health.drivers + p.health.voice + p.health.bass) / 300;
          const delta = Math.round(dbAboveFloor * (0.45 + p.bassEnergy * 0.85) * healthAvg);
          p.score += Math.max(5, delta);
        }
      }

      if (ticks % 4 === 0) {
        room.remainingSeconds -= 1;
        if (room.remainingSeconds <= 0) {
          room.remainingSeconds = 0;
          room.status = 'finished';
          stopRoomTimer(room);

          const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
          if (sorted.length >= 2 && sorted[0].score === sorted[1].score) {
            room.winnerClientId = null; // Draw
          } else {
            room.winnerClientId = sorted[0]?.clientId ?? null;
          }
        }
      }
      broadcastRoom(room);
    }
  }, 250);
}

function removeClientFromCurrentRoom(clientId: string): void {
  const existingCode = clientRoomMap.get(clientId);
  if (!existingCode) return;
  clientRoomMap.delete(clientId);

  const room = rooms.get(existingCode);
  if (!room) return;
  room.players.delete(clientId);

  if (room.players.size === 0) {
    stopRoomTimer(room);
    rooms.delete(existingCode);
  } else {
    if (room.status === 'active' || room.status === 'countdown') {
      stopRoomTimer(room);
      room.status = 'waiting';
      room.remainingSeconds = BATTLE_DURATION_SECONDS;
    }
    broadcastRoom(room);
  }
}

async function bootstrap() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.get('/api/battle/rooms', (_req, res) => {
    const openRooms = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting' && r.players.size < 2)
      .map((r) => ({
        roomCode: r.roomCode,
        hostName: Array.from(r.players.values())[0]?.username ?? 'Chipero',
        hostGuaguaId: Array.from(r.players.values())[0]?.guaguaId ?? 'montero-verde',
        potCoins: r.potCoins,
      }));
    res.json({ rooms: openRooms });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/battle' });

  wss.on('connection', (ws) => {
    let clientId = `plr-${Math.random().toString(36).slice(2, 10)}`;

    ws.send(JSON.stringify({ type: 'CONNECTED', clientId }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          clientId?: string;
          roomCode?: string;
          player?: {
            username: string;
            avatarDataUrl: string;
            clanTag: string | null;
            guaguaId: string;
            health: ComponentHealth;
          };
          telemetry?: {
            currentDb: number;
            bassEnergy: number;
            voiceEnergy: number;
            driverEnergy: number;
            health: ComponentHealth;
            isPlaying: boolean;
          };
        };

        if (msg.clientId) {
          clientId = msg.clientId;
        }

        if (msg.type === 'CREATE_ROOM' && msg.player) {
          removeClientFromCurrentRoom(clientId);
          const roomCode = generateRoomCode();
          const room: ServerBattleRoom = {
            roomCode,
            status: 'waiting',
            countdownSeconds: COUNTDOWN_SECONDS,
            remainingSeconds: BATTLE_DURATION_SECONDS,
            potCoins: BATTLE_POT_COINS,
            winnerClientId: null,
            players: new Map(),
            timer: null,
          };
          room.players.set(clientId, {
            ws,
            clientId,
            username: msg.player.username,
            avatarDataUrl: msg.player.avatarDataUrl,
            clanTag: msg.player.clanTag,
            guaguaId: msg.player.guaguaId,
            currentDb: 112,
            bassEnergy: 0,
            voiceEnergy: 0,
            driverEnergy: 0,
            score: 0,
            health: msg.player.health,
            isPlaying: false,
            burstCooldownUntil: 0,
            lastBurstAt: 0,
          });
          rooms.set(roomCode, room);
          clientRoomMap.set(clientId, roomCode);
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'JOIN_ROOM' && msg.roomCode && msg.player) {
          const targetCode = msg.roomCode.trim().toUpperCase();
          const room = rooms.get(targetCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Sala ${targetCode} no encontrada.` }));
            return;
          }
          if (room.players.size >= 2 && !room.players.has(clientId)) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `La sala ${targetCode} ya está llena.` }));
            return;
          }
          removeClientFromCurrentRoom(clientId);
          room.players.set(clientId, {
            ws,
            clientId,
            username: msg.player.username,
            avatarDataUrl: msg.player.avatarDataUrl,
            clanTag: msg.player.clanTag,
            guaguaId: msg.player.guaguaId,
            currentDb: 112,
            bassEnergy: 0,
            voiceEnergy: 0,
            driverEnergy: 0,
            score: 0,
            health: msg.player.health,
            isPlaying: false,
            burstCooldownUntil: 0,
            lastBurstAt: 0,
          });
          clientRoomMap.set(clientId, targetCode);
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'QUICK_MATCH' && msg.player) {
          removeClientFromCurrentRoom(clientId);
          const openRoom = Array.from(rooms.values()).find(
            (r) => r.status === 'waiting' && r.players.size === 1
          );
          if (openRoom) {
            openRoom.players.set(clientId, {
              ws,
              clientId,
              username: msg.player.username,
              avatarDataUrl: msg.player.avatarDataUrl,
              clanTag: msg.player.clanTag,
              guaguaId: msg.player.guaguaId,
              currentDb: 112,
              bassEnergy: 0,
              voiceEnergy: 0,
              driverEnergy: 0,
              score: 0,
              health: msg.player.health,
              isPlaying: false,
              burstCooldownUntil: 0,
              lastBurstAt: 0,
            });
            clientRoomMap.set(clientId, openRoom.roomCode);
            startBattleLoop(openRoom);
          } else {
            const roomCode = generateRoomCode();
            const room: ServerBattleRoom = {
              roomCode,
              status: 'waiting',
              countdownSeconds: COUNTDOWN_SECONDS,
              remainingSeconds: BATTLE_DURATION_SECONDS,
              potCoins: BATTLE_POT_COINS,
              winnerClientId: null,
              players: new Map(),
              timer: null,
            };
            room.players.set(clientId, {
              ws,
              clientId,
              username: msg.player.username,
              avatarDataUrl: msg.player.avatarDataUrl,
              clanTag: msg.player.clanTag,
              guaguaId: msg.player.guaguaId,
              currentDb: 112,
              bassEnergy: 0,
              voiceEnergy: 0,
              driverEnergy: 0,
              score: 0,
              health: msg.player.health,
              isPlaying: false,
              burstCooldownUntil: 0,
              lastBurstAt: 0,
            });
            rooms.set(roomCode, room);
            clientRoomMap.set(clientId, roomCode);
            broadcastRoom(room);
          }
          return;
        }

        if (msg.type === 'START_BATTLE') {
          const code = clientRoomMap.get(clientId);
          const room = code ? rooms.get(code) : undefined;
          if (room && room.players.size >= 2 && room.status === 'waiting') {
            startBattleLoop(room);
          }
          return;
        }

        if (msg.type === 'REMATCH') {
          const code = clientRoomMap.get(clientId);
          const room = code ? rooms.get(code) : undefined;
          if (room && room.players.size >= 2) {
            startBattleLoop(room);
          }
          return;
        }

        if (msg.type === 'SYNC_PLAYER_STATE' && msg.telemetry) {
          const code = clientRoomMap.get(clientId);
          const room = code ? rooms.get(code) : undefined;
          const player = room?.players.get(clientId);
          if (room && player) {
            player.currentDb = msg.telemetry.currentDb;
            player.bassEnergy = msg.telemetry.bassEnergy;
            player.voiceEnergy = msg.telemetry.voiceEnergy;
            player.driverEnergy = msg.telemetry.driverEnergy;
            player.health = msg.telemetry.health;
            player.isPlaying = msg.telemetry.isPlaying;
            if (room.status !== 'active') {
              broadcastRoom(room);
            }
          }
          return;
        }

        if (msg.type === 'TRIGGER_BASS_BURST') {
          const code = clientRoomMap.get(clientId);
          const room = code ? rooms.get(code) : undefined;
          const player = room?.players.get(clientId);
          const now = Date.now();
          if (room && player && room.status === 'active' && now >= player.burstCooldownUntil) {
            player.score += 180;
            player.lastBurstAt = now;
            player.burstCooldownUntil = now + 6000;
            broadcastRoom(room, { burstBy: clientId });
          }
          return;
        }

        if (msg.type === 'LEAVE_ROOM') {
          removeClientFromCurrentRoom(clientId);
        }
      } catch {
        // ignore malformed packets
      }
    });

    ws.on('close', () => {
      removeClientFromCurrentRoom(clientId);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chipeo Cibaeno server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

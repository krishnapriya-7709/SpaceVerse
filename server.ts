import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DB_DIR, 'galaxyx-db.json');

const REQUIRED_LEVEL_1_SAT_PARTS = [
  'bus',
  'solar',
  'battery',
  'antenna',
  'camera',
  'propulsion',
  'computer',
  'adcs',
  'thermal',
] as const;

const REQUIRED_LEVEL_1_ROCKET_PARTS = [
  'first_stage_structure',
  'first_stage_tanks',
  'first_stage_engines',
  'interstage',
  'second_stage_body',
  'second_stage_engine',
  'avionics',
  'grid_fins',
  'landing_legs',
  'payload_fairing',
] as const;

export type StoredLaunchSequenceStatus =
  | 'not_started'
  | 'countdown'
  | 'ignition'
  | 'ascent'
  | 'completed';

export interface StoredLevel1Progress {
  stage: 1 | 2 | 3 | 4 | 5;
  satParts: string[];
  rocketParts: string[];
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  stage4Done: boolean;
  stage5Done: boolean;
  launchStatus: StoredLaunchSequenceStatus;
}

const DEFAULT_LEVEL1_PROGRESS: StoredLevel1Progress = {
  stage: 1,
  satParts: [],
  rocketParts: [],
  stage1Done: false,
  stage2Done: false,
  stage3Done: false,
  stage4Done: false,
  stage5Done: false,
  launchStatus: 'not_started',
};

export interface RewardTransaction {
  id: string;
  key: string;
  type: 'NEW_RECRUIT' | 'LEVEL_1_COMPLETION' | 'MISSION_REWARD' | 'PURCHASE' | 'REFUND';
  amountStarCredits: number;
  amountGrantCredits: number;
  badge?: string;
  note: string;
  timestamp: string;
}

export interface StoredPlayerRecord {
  userId: string;
  callsign: string;
  joined: boolean;
  trainingCompleted: boolean;
  currentCampaignLevel: number;
  completedLevels: number[];
  levelScores: Record<number, number>;
  grantCredits: number;
  starCredits: number;
  badges: string[];
  transactions: RewardTransaction[];
  level1Progress: StoredLevel1Progress;
  updatedAt: string;
}

interface DatabaseSchema {
  users: Record<string, StoredPlayerRecord>;
}

function ensureDb(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = { users: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.users || typeof parsed.users !== 'object') {
      return { users: {} };
    }
    return parsed;
  } catch {
    return { users: {} };
  }
}

function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function normalizeUserId(raw?: string): string {
  const cleaned = (raw || 'explorer-default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_@.-]/g, '')
    .slice(0, 64);
  return cleaned || 'explorer-default';
}

function getOrCreatePlayer(db: DatabaseSchema, userId: string, callsign?: string): StoredPlayerRecord {
  const id = normalizeUserId(userId);
  if (!db.users[id]) {
    db.users[id] = {
      userId: id,
      callsign: callsign?.trim() || 'Explorer-01',
      joined: false,
      trainingCompleted: false,
      currentCampaignLevel: 1,
      completedLevels: [],
      levelScores: {},
      grantCredits: 10000,
      starCredits: 0,
      badges: [],
      transactions: [],
      level1Progress: { ...DEFAULT_LEVEL1_PROGRESS },
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
  }
  if (!db.users[id].level1Progress) {
    db.users[id].level1Progress = { ...DEFAULT_LEVEL1_PROGRESS };
  } else {
    db.users[id].level1Progress = {
      ...DEFAULT_LEVEL1_PROGRESS,
      ...db.users[id].level1Progress,
    };
  }
  return db.users[id];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'spaceverse-galaxy-x' });
  });

  // Get or initialize player account from database
  app.get('/api/player/session', (req, res) => {
    const userId = normalizeUserId(String(req.query.userId || req.headers['x-galaxyx-user'] || 'explorer-default'));
    const callsign = req.query.callsign ? String(req.query.callsign) : undefined;
    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId, callsign);
    res.json({ player });
  });

  // Switch / Login explorer profile (preserves existing database rewards & badges)
  app.post('/api/player/login', (req, res) => {
    const rawUser = String(req.body?.callsign || req.body?.userId || 'explorer-default');
    const userId = normalizeUserId(rawUser);
    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId, rawUser.trim() || 'Explorer-01');
    res.json({ player });
  });

  // Idempotent New Recruit commission (awards 500 SC + NEW_RECRUIT badge once per user)
  app.post('/api/player/recruit', (req, res) => {
    const userId = normalizeUserId(String(req.body?.userId || 'explorer-default'));
    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId, req.body?.callsign);

    const txKey = `${userId}:NEW_RECRUIT`;
    const alreadyRecruited = player.transactions.some((tx) => tx.key === txKey) || player.joined;

    if (!alreadyRecruited) {
      player.joined = true;
      player.grantCredits = Math.max(player.grantCredits, 10000);
      player.starCredits += 500;
      if (!player.badges.includes('NEW_RECRUIT')) {
        player.badges.push('NEW_RECRUIT');
      }
      player.transactions.push({
        id: `tx_${Date.now()}_recruit`,
        key: txKey,
        type: 'NEW_RECRUIT',
        amountStarCredits: 500,
        amountGrantCredits: 10000,
        badge: 'NEW_RECRUIT',
        note: 'GALAXY-X New Recruit Commission',
        timestamp: new Date().toISOString(),
      });
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player, alreadyAwarded: alreadyRecruited });
  });

  // Mark Cadet Orientation Training completed
  app.post('/api/player/training', (req, res) => {
    const userId = normalizeUserId(String(req.body?.userId || 'explorer-default'));
    const trainingCompleted = Boolean(req.body?.trainingCompleted);
    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId);

    player.trainingCompleted = trainingCompleted;
    if (trainingCompleted && !player.badges.includes('MISSION_ARCHITECT')) {
      player.badges.push('MISSION_ARCHITECT');
    }
    player.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ player });
  });

  // Persist mid-level stage progress for Level 1 (5-stage mission) or reset on replay
  app.post('/api/levels/1/progress', (req, res) => {
    const userId = normalizeUserId(String(req.body?.userId || 'explorer-default'));
    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId);

    if (req.body?.reset === true) {
      player.level1Progress = { ...DEFAULT_LEVEL1_PROGRESS };
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: 1 | 2 | 3 | 4 | 5 =
        stageRaw === 5 ? 5 : stageRaw === 4 ? 4 : stageRaw === 3 ? 3 : stageRaw === 2 ? 2 : 1;

      const satParts = Array.isArray(incoming.satParts)
        ? Array.from(new Set<string>(incoming.satParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_SAT_PARTS as readonly string[]).includes(p)
          )
        : player.level1Progress.satParts;

      const rocketParts = Array.isArray(incoming.rocketParts)
        ? Array.from(new Set<string>(incoming.rocketParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_ROCKET_PARTS as readonly string[]).includes(p)
          )
        : player.level1Progress.rocketParts;

      const rawLaunchStatus = String(incoming.launchStatus || 'not_started');
      const launchStatus: StoredLaunchSequenceStatus =
        rawLaunchStatus === 'countdown' ||
        rawLaunchStatus === 'ignition' ||
        rawLaunchStatus === 'ascent' ||
        rawLaunchStatus === 'completed'
          ? rawLaunchStatus
          : 'not_started';

      player.level1Progress = {
        stage,
        satParts,
        rocketParts,
        stage1Done: Boolean(incoming.stage1Done) && satParts.length === REQUIRED_LEVEL_1_SAT_PARTS.length,
        stage2Done: Boolean(incoming.stage2Done) && rocketParts.length === REQUIRED_LEVEL_1_ROCKET_PARTS.length,
        stage3Done: Boolean(incoming.stage3Done),
        stage4Done: Boolean(incoming.stage4Done),
        stage5Done: Boolean(incoming.stage5Done) && launchStatus === 'completed',
        launchStatus,
      };
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 1 (5-Stage) completion (+1000 SC & SATELLITE_BUILDER once per user)
  app.post('/api/levels/1/complete', (req, res) => {
    const userId = normalizeUserId(String(req.body?.userId || 'explorer-default'));
    const satRaw = Array.isArray(req.body?.installedSatParts)
      ? req.body.installedSatParts
      : Array.isArray(req.body?.installedParts)
      ? req.body.installedParts
      : [];
    const rocketRaw = Array.isArray(req.body?.installedRocketParts) ? req.body.installedRocketParts : [];

    const uniqueSat = new Set(satRaw.map((p: unknown) => String(p)));
    const uniqueRocket = new Set(rocketRaw.map((p: unknown) => String(p)));

    const hasAllNineSat = REQUIRED_LEVEL_1_SAT_PARTS.every((reqPart) => uniqueSat.has(reqPart));
    const hasAllTenRocket = REQUIRED_LEVEL_1_ROCKET_PARTS.every((reqPart) => uniqueRocket.has(reqPart));
    const launchpadDone = Boolean(req.body?.stage3LaunchpadDone);
    const payloadDone = Boolean(req.body?.stage4PayloadDone);
    const launchDone =
      Boolean(req.body?.stage5LaunchDone) || req.body?.launchStatus === 'completed';

    if (!hasAllNineSat || !hasAllTenRocket || !launchpadDone || !payloadDone || !launchDone) {
      res.status(400).json({
        error:
          'Incomplete Level 1 mission. All 5 stages (9 satellite parts, 10 rocket parts, launchpad positioning, payload fairing integration, and successful rocket launch) must be completed before claiming rewards.',
      });
      return;
    }

    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId);

    player.level1Progress = {
      stage: 5,
      satParts: [...REQUIRED_LEVEL_1_SAT_PARTS],
      rocketParts: [...REQUIRED_LEVEL_1_ROCKET_PARTS],
      stage1Done: true,
      stage2Done: true,
      stage3Done: true,
      stage4Done: true,
      stage5Done: true,
      launchStatus: 'completed',
    };

    const txKey = `${userId}:LEVEL_1_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) || player.completedLevels.includes(1);

    let rewardAwarded = 0;

    if (!alreadyRewarded) {
      rewardAwarded = 1000;
      player.starCredits += 1000;
      if (!player.completedLevels.includes(1)) {
        player.completedLevels.push(1);
      }
      if (!player.badges.includes('SATELLITE_BUILDER')) {
        player.badges.push('SATELLITE_BUILDER');
      }
      player.levelScores[1] = Math.max(player.levelScores[1] || 0, 1000);
      player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 2);

      player.transactions.push({
        id: `tx_${Date.now()}_lvl1`,
        key: txKey,
        type: 'LEVEL_1_COMPLETION',
        amountStarCredits: 1000,
        amountGrantCredits: 0,
        badge: 'SATELLITE_BUILDER',
        note: 'Level 1: Satellite, Rocket & Payload Integration Reward',
        timestamp: new Date().toISOString(),
      });
    }

    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      badgeAwarded: 'SATELLITE_BUILDER',
    });
  });

  // Update Grant/Star credits & campaign progress for Levels 2-10
  app.post('/api/player/sync', (req, res) => {
    const userId = normalizeUserId(String(req.body?.userId || 'explorer-default'));
    const db = ensureDb();
    const player = getOrCreatePlayer(db, userId);

    if (typeof req.body?.grantCredits === 'number' && req.body.grantCredits >= 0) {
      player.grantCredits = Math.floor(req.body.grantCredits);
    }
    if (typeof req.body?.currentCampaignLevel === 'number') {
      player.currentCampaignLevel = Math.max(1, Math.min(10, Math.floor(req.body.currentCampaignLevel)));
    }
    if (typeof req.body?.completedLevel === 'number' && req.body.completedLevel >= 2) {
      const lvl = Math.floor(req.body.completedLevel);
      if (!player.completedLevels.includes(lvl)) {
        player.completedLevels.push(lvl);
      }
    }
    if (typeof req.body?.flightRewardStar === 'number' && req.body.flightRewardStar > 0) {
      const flightTxKey = req.body?.flightTxKey ? String(req.body.flightTxKey) : null;
      const dup = flightTxKey ? player.transactions.some((t) => t.key === flightTxKey) : false;
      if (!dup) {
        const starAmt = Math.floor(req.body.flightRewardStar);
        player.starCredits += starAmt;
        if (flightTxKey) {
          player.transactions.push({
            id: `tx_${Date.now()}_flight`,
            key: flightTxKey,
            type: 'MISSION_REWARD',
            amountStarCredits: starAmt,
            amountGrantCredits: Math.floor(req.body?.flightRewardGrant || 0),
            note: String(req.body?.note || 'Flight Mission Reward'),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
    if (req.body?.levelScores && typeof req.body.levelScores === 'object') {
      for (const [k, v] of Object.entries(req.body.levelScores)) {
        const numK = Number(k);
        const numV = Number(v);
        if (!Number.isNaN(numK) && !Number.isNaN(numV)) {
          player.levelScores[numK] = Math.max(player.levelScores[numK] || 0, numV);
        }
      }
    }

    player.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ player });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPACEVERSE // GALAXY-X server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SPACEVERSE server:', err);
  process.exit(1);
});

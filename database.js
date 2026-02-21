const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'game.db'));

db.exec(`
  -- A run = one full playthrough attempt
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    character_id TEXT NOT NULL DEFAULT 'arturo',
    act INTEGER NOT NULL DEFAULT 1,
    floor INTEGER NOT NULL DEFAULT 0,
    hp INTEGER NOT NULL,
    hp_max INTEGER NOT NULL,
    energy_base INTEGER NOT NULL DEFAULT 3,
    gold INTEGER NOT NULL DEFAULT 99,
    deck TEXT NOT NULL DEFAULT '[]',       -- JSON array of card ids
    relics TEXT NOT NULL DEFAULT '[]',     -- JSON array of relic ids
    map TEXT NOT NULL DEFAULT '[]',        -- JSON: current act map nodes
    status TEXT NOT NULL DEFAULT 'active', -- active | dead | won
    score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Active combat state (one per run at a time)
  CREATE TABLE IF NOT EXISTS combat_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL UNIQUE,
    enemy_id TEXT NOT NULL,
    enemy_hp INTEGER NOT NULL,
    enemy_hp_max INTEGER NOT NULL,
    enemy_block INTEGER NOT NULL DEFAULT 0,
    enemy_intent TEXT NOT NULL DEFAULT 'attack', -- attack | buff | debuff
    enemy_intent_value INTEGER NOT NULL DEFAULT 0,
    enemy_statuses TEXT NOT NULL DEFAULT '{}',   -- JSON: { poison: 2, weak: 1 }
    player_hand TEXT NOT NULL DEFAULT '[]',      -- JSON: card ids in hand
    player_draw TEXT NOT NULL DEFAULT '[]',      -- JSON: draw pile
    player_discard TEXT NOT NULL DEFAULT '[]',   -- JSON: discard pile
    player_block INTEGER NOT NULL DEFAULT 0,
    player_energy INTEGER NOT NULL DEFAULT 3,
    player_statuses TEXT NOT NULL DEFAULT '{}',  -- JSON: { weak: 1, vulnerable: 2 }
    turn INTEGER NOT NULL DEFAULT 1,
    combat_log TEXT NOT NULL DEFAULT '[]',       -- JSON: array of log entries
    FOREIGN KEY (run_id) REFERENCES runs(id)
  );

  -- Run history / leaderboard
  CREATE TABLE IF NOT EXISTS run_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    character_id TEXT NOT NULL,
    floors_reached INTEGER NOT NULL DEFAULT 0,
    act_reached INTEGER NOT NULL DEFAULT 1,
    score INTEGER NOT NULL DEFAULT 0,
    cause_of_death TEXT,
    killed_by TEXT,
    cards_collected INTEGER NOT NULL DEFAULT 0,
    ended_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Run CRUD ───────────────────────────────────────────────────────────────

const createRun = (playerName, characterId = 'arturo', startingDeck, hp = 80) => {
  const result = db.prepare(`
    INSERT INTO runs (player_name, character_id, hp, hp_max, deck)
    VALUES (?, ?, ?, ?, ?)
  `).run(playerName, characterId, hp, hp, JSON.stringify(startingDeck));
  return db.prepare('SELECT * FROM runs WHERE id = ?').get(result.lastInsertRowid);
};

const getRun = (id) => db.prepare('SELECT * FROM runs WHERE id = ?').get(id);

const getActiveRun = (playerName) =>
  db.prepare("SELECT * FROM runs WHERE player_name = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(playerName);

const updateRun = (id, data) => {
  const ALLOWED = new Set(['hp', 'hp_max', 'gold', 'deck', 'relics', 'map', 'act', 'floor', 'status', 'score']);
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    if (!ALLOWED.has(key)) continue;
    fields.push(`${key} = ?`);
    values.push(typeof val === 'object' ? JSON.stringify(val) : val);
  }
  if (!fields.length) return;
  values.push(id);
  db.prepare(`UPDATE runs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getRun(id);
};

const getLeaderboard = (limit = 10) =>
  db.prepare(`SELECT * FROM run_history ORDER BY score DESC, floors_reached DESC LIMIT ?`).all(limit);

// ─── Combat State ────────────────────────────────────────────────────────────

const getCombat = (runId) =>
  db.prepare('SELECT * FROM combat_state WHERE run_id = ?').get(runId);

const createCombat = (runId, enemyId, enemyHp, hand, draw, energyBase = 3) => {
  db.prepare('DELETE FROM combat_state WHERE run_id = ?').run(runId);
  return db.prepare(`
    INSERT INTO combat_state
      (run_id, enemy_id, enemy_hp, enemy_hp_max, player_hand, player_draw, player_energy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(runId, enemyId, enemyHp, enemyHp, JSON.stringify(hand), JSON.stringify(draw), energyBase);
};

const updateCombat = (runId, data) => {
  const ALLOWED = new Set([
    'enemy_hp', 'enemy_block', 'enemy_intent', 'enemy_intent_value', 'enemy_statuses',
    'player_hand', 'player_draw', 'player_discard', 'player_block', 'player_energy',
    'player_statuses', 'turn', 'combat_log'
  ]);
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    if (!ALLOWED.has(key)) continue;
    fields.push(`${key} = ?`);
    values.push(typeof val === 'object' ? JSON.stringify(val) : val);
  }
  if (!fields.length) return;
  values.push(runId);
  db.prepare(`UPDATE combat_state SET ${fields.join(', ')} WHERE run_id = ?`).run(...values);
  return getCombat(runId);
};

const deleteCombat = (runId) =>
  db.prepare('DELETE FROM combat_state WHERE run_id = ?').run(runId);

// ─── Run history ─────────────────────────────────────────────────────────────

const recordRunEnd = (run, causeOfDeath = null, killedBy = null) => {
  const deck = JSON.parse(run.deck || '[]');
  db.prepare(`
    INSERT INTO run_history (player_name, character_id, floors_reached, act_reached, score, cause_of_death, killed_by, cards_collected)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(run.player_name, run.character_id, run.floor, run.act, run.score, causeOfDeath, killedBy, deck.length);
};

module.exports = {
  createRun, getRun, getActiveRun, updateRun,
  getCombat, createCombat, updateCombat, deleteCombat,
  getLeaderboard, recordRunEnd
};

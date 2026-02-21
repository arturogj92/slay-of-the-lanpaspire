-- Slay of the Lanpaspire - Database Schema (SQLite)
-- Author: Coig 🧠

-- Players
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Runs (each playthrough)
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  character_id TEXT NOT NULL,
  seed INTEGER,
  current_hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  gold INTEGER DEFAULT 99,
  current_act INTEGER DEFAULT 1,
  current_floor INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, victory, defeat, abandoned
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Characters (template definitions)
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,           -- e.g. 'hacker', 'explorador'
  name TEXT NOT NULL,
  description TEXT,
  base_hp INTEGER DEFAULT 80,
  starting_gold INTEGER DEFAULT 99,
  sprite_url TEXT
);

-- Card definitions (master card list)
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,           -- e.g. 'strike', 'defend', 'hack'
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,            -- attack, skill, power
  character_id TEXT,             -- NULL = colorless/neutral
  rarity TEXT DEFAULT 'common',  -- common, uncommon, rare
  energy_cost INTEGER DEFAULT 1,
  base_damage INTEGER DEFAULT 0,
  base_block INTEGER DEFAULT 0,
  effects_json TEXT,             -- JSON for special effects
  sprite_url TEXT,
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- Deck (cards in a specific run)
CREATE TABLE IF NOT EXISTS deck (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  upgraded INTEGER DEFAULT 0,
  pile TEXT DEFAULT 'deck',      -- deck, hand, discard, exhaust
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Relics
CREATE TABLE IF NOT EXISTS relics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT DEFAULT 'common',  -- common, uncommon, rare, boss, starter
  effects_json TEXT,
  sprite_url TEXT
);

-- Run relics (relics obtained in a run)
CREATE TABLE IF NOT EXISTS run_relics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  relic_id TEXT NOT NULL,
  obtained_floor INTEGER DEFAULT 0,
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (relic_id) REFERENCES relics(id)
);

-- Potions
CREATE TABLE IF NOT EXISTS potions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT DEFAULT 'common',
  effects_json TEXT,
  sprite_url TEXT
);

-- Run potions (max 3 slots)
CREATE TABLE IF NOT EXISTS run_potions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  potion_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 2),
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (potion_id) REFERENCES potions(id)
);

-- Enemy definitions
CREATE TABLE IF NOT EXISTS enemies (
  id TEXT PRIMARY KEY,           -- e.g. 'slime_s', 'skeleton', 'goblin'
  name TEXT NOT NULL,
  description TEXT,
  base_hp_min INTEGER NOT NULL,
  base_hp_max INTEGER NOT NULL,
  type TEXT DEFAULT 'normal',    -- normal, elite, boss
  act INTEGER DEFAULT 1,
  ai_pattern_json TEXT,          -- JSON defining attack patterns/intents
  sprite_url TEXT
);

-- Map nodes (procedural map per run)
CREATE TABLE IF NOT EXISTS map_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  act INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  x_pos INTEGER NOT NULL,        -- horizontal position for branching
  node_type TEXT NOT NULL,        -- combat, elite, boss, rest, shop, chest, event
  enemy_ids_json TEXT,            -- JSON array of enemy ids for combat nodes
  visited INTEGER DEFAULT 0,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Map edges (connections between nodes)
CREATE TABLE IF NOT EXISTS map_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  from_node_id INTEGER NOT NULL,
  to_node_id INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (from_node_id) REFERENCES map_nodes(id),
  FOREIGN KEY (to_node_id) REFERENCES map_nodes(id)
);

-- Combat state (current combat snapshot)
CREATE TABLE IF NOT EXISTS combat_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  turn INTEGER DEFAULT 1,
  energy INTEGER DEFAULT 3,
  max_energy INTEGER DEFAULT 3,
  player_block INTEGER DEFAULT 0,
  enemies_json TEXT,              -- JSON: [{id, hp, maxHp, block, intent, buffs}]
  player_buffs_json TEXT,         -- JSON: {strength: 0, dexterity: 0, vulnerable: 0, weak: 0, ...}
  status TEXT DEFAULT 'active',   -- active, won, lost
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

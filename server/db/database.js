// Database manager - SQLite via better-sqlite3
// Author: Coig 🧠

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/lanpaspire.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Initialize schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    
    // Seed if empty
    const count = db.prepare('SELECT COUNT(*) as c FROM characters').get();
    if (count.c === 0) {
      const seed = fs.readFileSync(SEED_PATH, 'utf8');
      db.exec(seed);
      console.log('[DB] Seeded database with initial data');
    }
  }
  return db;
}

// Player operations
const players = {
  create(username) {
    const db = getDb();
    return db.prepare('INSERT INTO players (username) VALUES (?)').run(username);
  },
  getByUsername(username) {
    return getDb().prepare('SELECT * FROM players WHERE username = ?').get(username);
  },
  getOrCreate(username) {
    let player = this.getByUsername(username);
    if (!player) {
      this.create(username);
      player = this.getByUsername(username);
    }
    return player;
  }
};

// Run operations
const runs = {
  create(playerId, characterId) {
    const db = getDb();
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    if (!char) throw new Error('Character not found: ' + characterId);
    
    const result = db.prepare(`
      INSERT INTO runs (player_id, character_id, seed, current_hp, max_hp, gold)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(playerId, characterId, Math.floor(Math.random() * 999999), char.base_hp, char.base_hp, char.starting_gold);
    
    const runId = result.lastInsertRowid;
    
    // Add starter deck (5 strikes + 4 defends)
    const addCard = db.prepare('INSERT INTO deck (run_id, card_id) VALUES (?, ?)');
    for (let i = 0; i < 5; i++) addCard.run(runId, 'strike');
    for (let i = 0; i < 4; i++) addCard.run(runId, 'defend');
    
    // Add starter relic
    db.prepare('INSERT INTO run_relics (run_id, relic_id) VALUES (?, ?)').run(runId, 'burning_blood');
    
    return runId;
  },
  
  get(runId) {
    return getDb().prepare('SELECT * FROM runs WHERE id = ?').get(runId);
  },
  
  getActive(playerId) {
    return getDb().prepare('SELECT * FROM runs WHERE player_id = ? AND status = ?').get(playerId, 'active');
  },
  
  update(runId, fields) {
    const db = getDb();
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(fields);
    db.prepare(`UPDATE runs SET ${sets} WHERE id = ?`).run(...values, runId);
  }
};

// Deck operations
const deck = {
  getAll(runId) {
    return getDb().prepare('SELECT d.*, c.* FROM deck d JOIN cards c ON d.card_id = c.id WHERE d.run_id = ?').all(runId);
  },
  
  getByPile(runId, pile) {
    return getDb().prepare('SELECT d.*, c.* FROM deck d JOIN cards c ON d.card_id = c.id WHERE d.run_id = ? AND d.pile = ?').all(runId, pile);
  },
  
  addCard(runId, cardId) {
    return getDb().prepare('INSERT INTO deck (run_id, card_id) VALUES (?, ?)').run(runId, cardId);
  },
  
  removeCard(deckEntryId) {
    return getDb().prepare('DELETE FROM deck WHERE id = ?').run(deckEntryId);
  },
  
  moveToPile(deckEntryId, pile) {
    return getDb().prepare('UPDATE deck SET pile = ? WHERE id = ?').run(pile, deckEntryId);
  },
  
  resetAllToDeck(runId) {
    return getDb().prepare('UPDATE deck SET pile = ? WHERE run_id = ? AND pile != ?').run('deck', runId, 'exhaust');
  }
};

// Card lookup
const cards = {
  get(cardId) {
    return getDb().prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  },
  getByCharacter(characterId) {
    return getDb().prepare('SELECT * FROM cards WHERE character_id = ? OR character_id IS NULL').all(characterId);
  },
  getRewards(characterId, count = 3) {
    const all = getDb().prepare(
      'SELECT * FROM cards WHERE (character_id = ? OR character_id IS NULL) AND rarity != ?'
    ).all(characterId, 'starter');
    // Shuffle and pick
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
  }
};

// Enemy lookup
const enemies = {
  get(enemyId) {
    return getDb().prepare('SELECT * FROM enemies WHERE id = ?').get(enemyId);
  },
  getByActAndType(act, type) {
    return getDb().prepare('SELECT * FROM enemies WHERE act = ? AND type = ?').all(act, type);
  },
  getRandomEncounter(act) {
    const normals = this.getByActAndType(act, 'normal');
    const count = Math.random() < 0.3 ? 1 : (Math.random() < 0.6 ? 2 : 3);
    const picked = [];
    for (let i = 0; i < count; i++) {
      picked.push(normals[Math.floor(Math.random() * normals.length)]);
    }
    return picked;
  }
};

module.exports = { getDb, players, runs, deck, cards, enemies };

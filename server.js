const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const db = require('./database');
const { CARDS, STARTING_DECK, getCardRewards } = require('./cards');
const { randomEnemy, getEnemyDef } = require('./enemies');
const { startCombat, playCard, endPlayerTurn, checkCombatResult } = require('./combat-engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3488;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCombat(row) {
  if (!row) return null;
  return {
    ...row,
    player_hand: JSON.parse(row.player_hand || '[]'),
    player_draw: JSON.parse(row.player_draw || '[]'),
    player_discard: JSON.parse(row.player_discard || '[]'),
    player_statuses: JSON.parse(row.player_statuses || '{}'),
    enemy_statuses: JSON.parse(row.enemy_statuses || '{}'),
    combat_log: JSON.parse(row.combat_log || '[]')
  };
}

function formatRunForClient(run, combat = null) {
  return {
    id: run.id,
    player_name: run.player_name,
    character_id: run.character_id,
    act: run.act,
    floor: run.floor,
    hp: run.hp,
    hp_max: run.hp_max,
    gold: run.gold,
    deck: JSON.parse(run.deck || '[]'),
    relics: JSON.parse(run.relics || '[]'),
    status: run.status,
    score: run.score,
    combat: combat ? {
      enemy_id: combat.enemy_id,
      enemy_hp: combat.enemy_hp,
      enemy_hp_max: combat.enemy_hp_max,
      enemy_block: combat.enemy_block,
      enemy_intent: combat.enemy_intent,
      enemy_intent_value: combat.enemy_intent_value,
      enemy_statuses: combat.enemy_statuses,
      hand: combat.player_hand,
      draw_count: combat.player_draw.length,
      discard: combat.player_discard,
      block: combat.player_block,
      energy: combat.player_energy,
      energy_max: run.energy_base || 3,
      statuses: combat.player_statuses,
      turn: combat.turn,
      log: combat.combat_log.slice(-20)
    } : null
  };
}

// ─── REST API ─────────────────────────────────────────────────────────────────

// New run
app.post('/api/run/new', (req, res) => {
  const { player_name, character_id = 'arturo' } = req.body;
  if (!player_name) return res.status(400).json({ error: 'player_name required' });

  // Delete old active run if exists
  const existing = db.getActiveRun(player_name);
  if (existing) {
    db.updateRun(existing.id, { status: 'abandoned' });
  }

  const startHp = { arturo: 80, victor: 70, nacho: 75, juan: 90, rober: 65, pollo: 72 }[character_id] || 80;
  const run = db.createRun(player_name, character_id, STARTING_DECK, startHp);

  res.json({ run: formatRunForClient(run) });
});

// Get run state
app.get('/api/run/:id', (req, res) => {
  const run = db.getRun(parseInt(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const combat = run.status === 'active' ? parseCombat(db.getCombat(run.id)) : null;
  res.json({ run: formatRunForClient(run, combat) });
});

// Start combat encounter
app.post('/api/run/:id/combat/start', (req, res) => {
  const run = db.getRun(parseInt(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (run.status !== 'active') return res.status(400).json({ error: 'Run not active' });

  const existingCombat = db.getCombat(run.id);
  if (existingCombat) return res.status(400).json({ error: 'Combat already in progress' });

  const { enemy_type = 'normal' } = req.body;
  const enemy = randomEnemy(run.act, enemy_type);

  const initialState = startCombat(run, enemy);

  db.createCombat(
    run.id,
    enemy.id,
    enemy.hp,
    initialState.hand,
    initialState.draw,
    run.energy_base || 3
  );

  db.updateCombat(run.id, {
    player_discard: initialState.discard,
    player_block: initialState.player_block,
    player_statuses: initialState.player_statuses,
    enemy_statuses: initialState.enemy_statuses,
    combat_log: initialState.log
  });

  // Update floor
  db.updateRun(run.id, { floor: run.floor + 1, score: run.score + 10 });

  const updatedRun = db.getRun(run.id);
  const combat = parseCombat(db.getCombat(run.id));

  const result = formatRunForClient(updatedRun, { ...combat, combat_log: initialState.log });
  io.to(`run-${run.id}`).emit('combat-start', result);
  res.json(result);
});

// Play a card
app.post('/api/run/:id/combat/play', (req, res) => {
  const run = db.getRun(parseInt(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const combatRow = db.getCombat(run.id);
  if (!combatRow) return res.status(400).json({ error: 'No combat in progress' });

  const { card_id } = req.body;
  if (!card_id) return res.status(400).json({ error: 'card_id required' });

  const combat = parseCombat(combatRow);
  const enemy = getEnemyDef(combat.enemy_id);

  // Build state object for combat engine
  const state = {
    hand: combat.player_hand,
    draw: combat.player_draw,
    discard: combat.player_discard,
    player_block: combat.player_block,
    player_energy: combat.player_energy,
    player_statuses: combat.player_statuses,
    enemy_hp: combat.enemy_hp,
    enemy_block: combat.enemy_block,
    enemy_statuses: combat.enemy_statuses,
    enemy_phase: combat.enemy_phase || 0,
    pattern_index: combat.pattern_index || 0,
    log: combat.combat_log
  };

  let newState;
  try {
    newState = playCard(state, card_id, run, { ...enemy, hp_max: combat.enemy_hp_max });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Update player HP if changed
  let updatedRun = run;
  if (newState._newPlayerHp !== undefined && newState._newPlayerHp !== run.hp) {
    updatedRun = db.updateRun(run.id, { hp: newState._newPlayerHp });
  }

  // Check result
  const result = checkCombatResult(newState, updatedRun.hp);

  if (result === 'defeat') {
    db.updateRun(run.id, { status: 'dead', score: run.score });
    db.recordRunEnd(updatedRun, 'Combat death', enemy.name);
    db.deleteCombat(run.id);
    const finalRun = db.getRun(run.id);
    const response = { ...formatRunForClient(finalRun), result: 'defeat', log: newState.log.slice(-10) };
    io.to(`run-${run.id}`).emit('combat-end', response);
    return res.json(response);
  }

  if (result === 'victory') {
    db.deleteCombat(run.id);
    const rewards = getCardRewards();
    const gold = 10 + Math.floor(Math.random() * 15) + run.floor * 2;
    db.updateRun(run.id, { gold: run.gold + gold, score: run.score + enemy.hp_max });
    const finalRun = db.getRun(run.id);
    const response = {
      ...formatRunForClient(finalRun),
      result: 'victory',
      card_rewards: rewards,
      gold_earned: gold,
      log: newState.log.slice(-10)
    };
    io.to(`run-${run.id}`).emit('combat-end', response);
    return res.json(response);
  }

  // Save updated combat state
  db.updateCombat(run.id, {
    enemy_hp: newState.enemy_hp,
    enemy_block: newState.enemy_block,
    enemy_statuses: newState.enemy_statuses,
    player_hand: newState.hand,
    player_draw: newState.draw,
    player_discard: newState.discard,
    player_block: newState.player_block,
    player_energy: newState.player_energy,
    player_statuses: newState.player_statuses,
    combat_log: newState.log
  });

  const updatedCombat = parseCombat(db.getCombat(run.id));
  const response = formatRunForClient(updatedRun, updatedCombat);
  io.to(`run-${run.id}`).emit('combat-update', response);
  res.json(response);
});

// End player turn
app.post('/api/run/:id/combat/end-turn', (req, res) => {
  const run = db.getRun(parseInt(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const combatRow = db.getCombat(run.id);
  if (!combatRow) return res.status(400).json({ error: 'No combat in progress' });

  const combat = parseCombat(combatRow);
  const enemy = getEnemyDef(combat.enemy_id);

  const state = {
    hand: combat.player_hand,
    draw: combat.player_draw,
    discard: combat.player_discard,
    player_block: combat.player_block,
    player_energy: combat.player_energy,
    player_statuses: combat.player_statuses,
    enemy_hp: combat.enemy_hp,
    enemy_block: combat.enemy_block,
    enemy_statuses: combat.enemy_statuses,
    enemy_phase: combat.enemy_phase || 0,
    pattern_index: combat.pattern_index || 0,
    turn: combat.turn,
    log: combat.combat_log
  };

  const newState = endPlayerTurn(state, run, { ...enemy, hp_max: combat.enemy_hp_max });

  let updatedRun = run;
  if (newState._newPlayerHp !== undefined && newState._newPlayerHp !== run.hp) {
    updatedRun = db.updateRun(run.id, { hp: newState._newPlayerHp });
  }

  const result = checkCombatResult(newState, updatedRun.hp);

  if (result === 'defeat') {
    db.updateRun(run.id, { status: 'dead' });
    db.recordRunEnd(updatedRun, 'Combat death', enemy.name);
    db.deleteCombat(run.id);
    const finalRun = db.getRun(run.id);
    const response = { ...formatRunForClient(finalRun), result: 'defeat', log: newState.log.slice(-15) };
    io.to(`run-${run.id}`).emit('combat-end', response);
    return res.json(response);
  }

  db.updateCombat(run.id, {
    enemy_hp: newState.enemy_hp,
    enemy_block: newState.enemy_block,
    enemy_statuses: newState.enemy_statuses,
    player_hand: newState.hand,
    player_draw: newState.draw,
    player_discard: newState.discard,
    player_block: 0,
    player_energy: run.energy_base || 3,
    player_statuses: newState.player_statuses,
    turn: newState.turn,
    pattern_index: newState.pattern_index,
    combat_log: newState.log
  });

  const updatedCombat = parseCombat(db.getCombat(run.id));
  const response = formatRunForClient(updatedRun, updatedCombat);
  io.to(`run-${run.id}`).emit('combat-update', response);
  res.json(response);
});

// Choose reward card after combat
app.post('/api/run/:id/combat/reward', (req, res) => {
  const run = db.getRun(parseInt(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (run.status !== 'active') return res.status(400).json({ error: 'Run not active' });

  const { card_id } = req.body;
  if (!card_id) return res.status(400).json({ error: 'card_id required (or "skip")' });

  if (card_id !== 'skip') {
    if (!CARDS[card_id]) return res.status(400).json({ error: 'Invalid card' });
    const deck = JSON.parse(run.deck || '[]');
    deck.push(card_id);
    db.updateRun(run.id, { deck });
  }

  const updatedRun = db.getRun(run.id);
  res.json({ run: formatRunForClient(updatedRun), message: card_id === 'skip' ? 'Skipped reward' : `Added ${card_id} to deck` });
});

// Get all card definitions
app.get('/api/cards', (req, res) => res.json(CARDS));

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  res.json(db.getLeaderboard(20));
});

// ─── Socket.io ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  socket.on('join-run', (runId) => {
    socket.join(`run-${runId}`);
  });
  socket.on('leave-run', (runId) => {
    socket.leave(`run-${runId}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`⚔️  Slay of the Lanpaspire running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});

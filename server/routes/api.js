// API Routes
const express = require('express');
const router = express.Router();
const { players, runs, deck, cards, enemies } = require('../db/database');

// Get available characters
router.get('/characters', (req, res) => {
  const { getDb } = require('../db/database');
  const chars = getDb().prepare('SELECT * FROM characters').all();
  res.json(chars);
});

// Start a new run
router.post('/runs', (req, res) => {
  const { username, characterId } = req.body;
  if (!username || !characterId) return res.status(400).json({ error: 'username and characterId required' });
  
  try {
    const player = players.getOrCreate(username);
    
    // Check for active run
    const active = runs.getActive(player.id);
    if (active) return res.status(409).json({ error: 'Already have an active run', runId: active.id });
    
    const runId = runs.create(player.id, characterId);
    const run = runs.get(runId);
    const playerDeck = deck.getAll(runId);
    
    res.json({ run, deck: playerDeck });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current run state
router.get('/runs/:id', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  
  const playerDeck = deck.getAll(run.id);
  res.json({ run, deck: playerDeck });
});

// Get card rewards (after combat)
router.get('/runs/:id/rewards', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  
  const rewards = cards.getRewards(run.character_id);
  res.json({ rewards });
});

// Get random encounter for current floor
router.get('/runs/:id/encounter', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  
  const encounter = enemies.getRandomEncounter(run.current_act);
  res.json({ enemies: encounter });
});

module.exports = router;

// ─── Combat Engine ────────────────────────────────────────────────────────────
// Pure functions — no DB. State in/out only.

const { CARDS } = require('./cards');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Apply status effects (poison ticks, etc.) at start of entity turn
function tickStatuses(statuses) {
  const result = { ...statuses };
  const damage = result.poison || 0; // poison deals its value in dmg
  if (result.poison > 0) result.poison--;
  if (result.poison === 0) delete result.poison;
  if (result.weak > 0) result.weak--;
  if (result.weak === 0) delete result.weak;
  if (result.vulnerable > 0) result.vulnerable--;
  if (result.vulnerable === 0) delete result.vulnerable;
  return { updated: result, poisonDamage: damage };
}

function applyStatuses(current, incoming) {
  const result = { ...current };
  for (const [k, v] of Object.entries(incoming)) {
    result[k] = (result[k] || 0) + v;
  }
  return result;
}

function calcDamage(base, attackerStatuses, defenderStatuses, strengthBonus = 0) {
  let dmg = base + strengthBonus;
  if (attackerStatuses.weak) dmg = Math.floor(dmg * 0.75);
  if (defenderStatuses.vulnerable) dmg = Math.floor(dmg * 1.5);
  return Math.max(0, dmg);
}

function applyDamage(hp, block, damage) {
  let remainingBlock = block;
  let remainingHp = hp;
  if (damage > remainingBlock) {
    remainingHp -= (damage - remainingBlock);
    remainingBlock = 0;
  } else {
    remainingBlock -= damage;
  }
  return { hp: Math.max(0, remainingHp), block: remainingBlock };
}

// ─── Combat Init ──────────────────────────────────────────────────────────────

function startCombat(run, enemy) {
  // Shuffle the run deck, draw 5 cards
  const deckIds = JSON.parse(run.deck || '[]');
  const shuffled = shuffle(deckIds);
  const hand = shuffled.slice(0, 5);
  const draw = shuffled.slice(5);

  return {
    hand,
    draw,
    discard: [],
    player_block: 0,
    player_energy: run.energy_base || 3,
    player_statuses: {},
    enemy_hp: enemy.hp,
    enemy_hp_max: enemy.hp_max,
    enemy_block: 0,
    enemy_statuses: {},
    turn: 1,
    log: [{ type: 'start', text: `⚔️ ¡Combate contra ${enemy.name} ${enemy.emoji}!` }]
  };
}

// ─── Play a Card ──────────────────────────────────────────────────────────────

function playCard(state, cardId, run, enemy) {
  const card = CARDS[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const handIdx = state.hand.indexOf(cardId);
  if (handIdx === -1) throw new Error('Card not in hand');

  // Check cost override (from sprint_planning, etc.)
  const costOverride = state.cost_overrides?.[cardId];
  const cost = costOverride !== undefined ? costOverride : card.cost;

  if (state.player_energy < cost) throw new Error('Not enough energy');

  // Check conditions
  if (card.effect.condition?.hp_below && run.hp > card.effect.condition.hp_below) {
    throw new Error(`Condition not met: need ≤${card.effect.condition.hp_below} HP`);
  }

  // Remove card from hand
  const newHand = [...state.hand];
  newHand.splice(handIdx, 1);

  let newEnergy = state.player_energy - cost;
  let newPlayerHp = run.hp;
  let newPlayerBlock = state.player_block;
  let newEnemyHp = state.enemy_hp;
  let newEnemyBlock = state.enemy_block;
  let newPlayerStatuses = { ...state.player_statuses };
  let newEnemyStatuses = { ...state.enemy_statuses };
  let newDraw = [...state.draw];
  let newDiscard = [...state.discard];
  let newCostOverrides = { ...(state.cost_overrides || {}) };
  const logEntries = [{ type: 'card', card: cardId, text: `🃏 Jugaste: ${card.emoji} ${card.name}` }];

  const ef = card.effect;

  // ── Damage ──
  if (ef.damage) {
    const times = ef.hits || 1;
    for (let i = 0; i < times; i++) {
      let dmg = calcDamage(ef.damage, newPlayerStatuses, newEnemyStatuses);
      if (ef.penetrate) {
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        logEntries.push({ type: 'damage', text: `💥 ${dmg} de daño (penetra escudo)` });
      } else {
        const res = applyDamage(newEnemyHp, newEnemyBlock, dmg);
        newEnemyHp = res.hp;
        newEnemyBlock = res.block;
        logEntries.push({ type: 'damage', text: `💥 ${dmg} de daño` });
      }
    }
  }

  // ── Damage per discard ──
  if (ef.damage_per_discard) {
    const dmgTotal = clamp(newDiscard.length * ef.damage_per_discard, 0, ef.damage_cap || 999);
    const res = applyDamage(newEnemyHp, newEnemyBlock, dmgTotal);
    newEnemyHp = res.hp;
    newEnemyBlock = res.block;
    logEntries.push({ type: 'damage', text: `💥 ${dmgTotal} de daño (${newDiscard.length} cartas en descarte)` });
  }

  // ── Block ──
  if (ef.block) {
    newPlayerBlock += ef.block;
    logEntries.push({ type: 'block', text: `🛡️ Ganaste ${ef.block} de escudo` });
  }

  // ── Draw ──
  if (ef.draw) {
    for (let i = 0; i < ef.draw; i++) {
      if (newDraw.length === 0) {
        if (newDiscard.length === 0) break;
        newDraw = shuffle(newDiscard);
        newDiscard = [];
        logEntries.push({ type: 'shuffle', text: '🔀 Mazo barajado' });
      }
      newHand.push(newDraw.shift());
    }
    logEntries.push({ type: 'draw', text: `✋ Robaste ${ef.draw} carta(s)` });
  }

  // ── Gain energy ──
  if (ef.gain_energy) {
    newEnergy += ef.gain_energy;
    logEntries.push({ type: 'energy', text: `⚡ +${ef.gain_energy} energía` });
  }

  // ── Apply statuses to enemy ──
  if (ef.apply) {
    newEnemyStatuses = applyStatuses(newEnemyStatuses, ef.apply);
    const desc = Object.entries(ef.apply).map(([k, v]) => `${k} ${v}`).join(', ');
    logEntries.push({ type: 'debuff', text: `🔴 Enemigo: ${desc}` });
  }

  // ── Heal ──
  if (ef.heal) {
    newPlayerHp = Math.min(run.hp_max, newPlayerHp + ef.heal);
    logEntries.push({ type: 'heal', text: `💚 +${ef.heal} HP` });
  }

  // ── Self damage ──
  if (ef.self_damage) {
    const res = applyDamage(newPlayerHp, newPlayerBlock, ef.self_damage);
    newPlayerHp = res.hp;
    newPlayerBlock = res.block;
    logEntries.push({ type: 'self_damage', text: `💔 Te hiciste ${ef.self_damage} de daño` });
  }

  // ── Discard hand + draw same ──
  if (ef.discard_hand) {
    newDiscard = [...newDiscard, ...newHand];
    const toDraw = ef.draw_same ? newHand.length : 0;
    newHand.length = 0;
    for (let i = 0; i < toDraw; i++) {
      if (newDraw.length === 0) { newDraw = shuffle(newDiscard); newDiscard = []; }
      newHand.push(newDraw.shift());
    }
    logEntries.push({ type: 'refactor', text: `♻️ Descartaste y robaste ${toDraw} cartas` });
  }

  // ── Add to discard ──
  if (ef.add_to_discard) {
    newDiscard = [...newDiscard, ...ef.add_to_discard];
    logEntries.push({ type: 'add_card', text: `➕ Añadidas ${ef.add_to_discard.length} cartas al descarte` });
  }

  // ── Reduce hand cost ──
  if (ef.reduce_hand_cost) {
    for (const handCard of newHand) {
      const curr = newCostOverrides[handCard] ?? CARDS[handCard]?.cost ?? 0;
      newCostOverrides[handCard] = Math.max(0, curr - ef.reduce_hand_cost);
    }
    logEntries.push({ type: 'reduce_cost', text: `🔽 Coste de cartas en mano reducido en ${ef.reduce_hand_cost}` });
  }

  // ── Exhaust / remove ──
  if (!ef.exhaust && !ef.remove_from_deck) {
    newDiscard.push(cardId);
  }
  // If remove_from_deck: card is gone permanently (don't push to discard)

  return {
    ...state,
    hand: newHand,
    draw: newDraw,
    discard: newDiscard,
    player_energy: newEnergy,
    player_block: newPlayerBlock,
    player_statuses: newPlayerStatuses,
    enemy_hp: newEnemyHp,
    enemy_block: newEnemyBlock,
    enemy_statuses: newEnemyStatuses,
    cost_overrides: newCostOverrides,
    log: [...(state.log || []), ...logEntries],
    _playerHpDelta: newPlayerHp - run.hp, // return hp change separately
    _newPlayerHp: newPlayerHp
  };
}

// ─── End Player Turn → Enemy Attacks ─────────────────────────────────────────

function endPlayerTurn(state, run, enemy) {
  const logEntries = [{ type: 'turn_end', text: '⏭️ Fin de tu turno' }];

  let newEnemyHp = state.enemy_hp;
  let newEnemyBlock = state.enemy_block;
  let newEnemyStatuses = { ...state.enemy_statuses };
  let newPlayerHp = run.hp;
  let newPlayerBlock = state.player_block;
  let newPlayerStatuses = { ...state.player_statuses };

  // ── Player poison tick ──
  if (newPlayerStatuses.poison) {
    const { updated, poisonDamage } = tickStatuses(newPlayerStatuses);
    newPlayerStatuses = updated;
    const res = applyDamage(newPlayerHp, newPlayerBlock, poisonDamage);
    newPlayerHp = res.hp;
    newPlayerBlock = res.block;
    if (poisonDamage > 0) logEntries.push({ type: 'poison', text: `☠️ Veneno: ${poisonDamage} daño` });
  }

  // ── Enemy status ticks ──
  const { updated: updatedEnemyStatuses, poisonDamage: enemyPoison } = tickStatuses(newEnemyStatuses);
  newEnemyStatuses = updatedEnemyStatuses;
  if (enemyPoison > 0) {
    newEnemyHp = Math.max(0, newEnemyHp - enemyPoison);
    logEntries.push({ type: 'poison', text: `☠️ Enemigo recibe ${enemyPoison} de veneno` });
  }

  // ── Enemy intent ──
  const enemyDef = enemy;
  const patterns = enemyDef.phases
    ? enemyDef.phases[state.enemy_phase || 0]?.pattern
    : enemyDef.pattern;
  const patternIdx = (state.pattern_index || 0) % (patterns?.length || 1);
  const intent = patterns?.[patternIdx] || { intent: 'attack', value: 10, desc: 'Ataca' };

  if (intent.intent === 'attack') {
    const strengthBonus = newEnemyStatuses.strength || 0;
    const dmg = calcDamage(intent.value, newEnemyStatuses, newPlayerStatuses, strengthBonus);
    const res = applyDamage(newPlayerHp, newPlayerBlock, dmg);
    newPlayerHp = res.hp;
    newPlayerBlock = res.block;
    logEntries.push({ type: 'enemy_attack', text: `👾 ${enemyDef.name}: ${intent.desc} (${dmg} dmg)` });
  } else if (intent.intent === 'defend') {
    newEnemyBlock += intent.block || 0;
    logEntries.push({ type: 'enemy_defend', text: `🛡️ ${enemyDef.name}: ${intent.desc}` });
  } else if (intent.intent === 'buff' && intent.apply) {
    newEnemyStatuses = applyStatuses(newEnemyStatuses, intent.apply);
    logEntries.push({ type: 'enemy_buff', text: `💪 ${enemyDef.name}: ${intent.desc}` });
  } else if (intent.intent === 'debuff' && intent.apply) {
    newPlayerStatuses = applyStatuses(newPlayerStatuses, intent.apply);
    logEntries.push({ type: 'enemy_debuff', text: `🔴 ${enemyDef.name}: ${intent.desc}` });
  } else if (intent.intent === 'heal') {
    newEnemyHp = Math.min(enemyDef.hp_max, newEnemyHp + (intent.value || 0));
    logEntries.push({ type: 'enemy_heal', text: `💚 ${enemyDef.name}: ${intent.desc}` });
  } else {
    logEntries.push({ type: 'enemy_skip', text: `💤 ${enemyDef.name}: ${intent.desc}` });
  }

  // ── Start next player turn: discard hand, draw 5, reset block/energy ──
  const newDiscard = [...state.discard, ...state.hand];
  let newDraw = [...state.draw];
  const newHand = [];
  for (let i = 0; i < 5; i++) {
    if (newDraw.length === 0) {
      if (newDiscard.length === 0) break;
      newDraw = shuffle(newDiscard.splice(0));
      logEntries.push({ type: 'shuffle', text: '🔀 Mazo barajado' });
    }
    newHand.push(newDraw.shift());
  }

  // ── Check phase transition (boss) ──
  let newPhase = state.enemy_phase || 0;
  if (enemyDef.phases && newPhase < enemyDef.phases.length - 1) {
    const hpPct = newEnemyHp / enemyDef.hp_max;
    if (newPhase === 0 && hpPct < 0.66) {
      newPhase = 1;
      logEntries.push({ type: 'phase', text: `⚠️ ${enemyDef.name} entra en Fase 2: ${enemyDef.phases[1].name}` });
    } else if (newPhase === 1 && hpPct < 0.33) {
      newPhase = 2;
      logEntries.push({ type: 'phase', text: `🚨 ${enemyDef.name} entra en Fase 3: ${enemyDef.phases[2].name}` });
    }
  }

  return {
    ...state,
    hand: newHand,
    draw: newDraw,
    discard: newDiscard,
    player_block: 0, // block resets each turn
    player_energy: run.energy_base || 3,
    player_statuses: newPlayerStatuses,
    enemy_hp: Math.max(0, newEnemyHp),
    enemy_block: newEnemyBlock,
    enemy_statuses: newEnemyStatuses,
    turn: state.turn + 1,
    pattern_index: (patternIdx + 1),
    enemy_phase: newPhase,
    cost_overrides: {}, // cost overrides reset each turn
    log: [...(state.log || []), ...logEntries],
    _newPlayerHp: newPlayerHp,
    _playerHpDelta: newPlayerHp - run.hp
  };
}

// ─── Check combat result ──────────────────────────────────────────────────────

function checkCombatResult(state, playerHp) {
  if (playerHp <= 0) return 'defeat';
  if (state.enemy_hp <= 0) return 'victory';
  return 'ongoing';
}

module.exports = { startCombat, playCard, endPlayerTurn, checkCombatResult, shuffle };

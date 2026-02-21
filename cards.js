// ─── Card Definitions ─────────────────────────────────────────────────────────
// type: attack | defense | skill
// effect: function-like descriptor applied by combat engine

const CARDS = {
  // ═══ STARTER CARDS ═══════════════════════════════════════════════════════
  golpe: {
    id: 'golpe', name: 'Golpe', emoji: '👊',
    type: 'attack', cost: 1, rarity: 'starter',
    desc: 'Haz 6 de daño.',
    effect: { damage: 6 }
  },
  bloqueo: {
    id: 'bloqueo', name: 'Bloqueo', emoji: '🛡️',
    type: 'defense', cost: 1, rarity: 'starter',
    desc: 'Gana 5 de escudo.',
    effect: { block: 5 }
  },
  cafeinazo: {
    id: 'cafeinazo', name: 'Cafeinazo', emoji: '☕',
    type: 'skill', cost: 0, rarity: 'starter',
    desc: 'Roba 2 cartas.',
    effect: { draw: 2 }
  },

  // ═══ ATAQUE ══════════════════════════════════════════════════════════════
  commit_force: {
    id: 'commit_force', name: 'Commit Force', emoji: '💥',
    type: 'attack', cost: 2, rarity: 'common',
    desc: 'Haz 18 de daño.',
    effect: { damage: 18 }
  },
  rubber_duck: {
    id: 'rubber_duck', name: 'Rubber Duck Debug', emoji: '🦆',
    type: 'attack', cost: 1, rarity: 'common',
    desc: 'Haz 8 de daño. Aplica 2 de veneno.',
    effect: { damage: 8, apply: { poison: 2 } }
  },
  stack_overflow: {
    id: 'stack_overflow', name: 'Stack Overflow', emoji: '📚',
    type: 'attack', cost: 2, rarity: 'uncommon',
    desc: 'Haz 5 de daño por cada carta en tu descarte (máx 25).',
    effect: { damage_per_discard: 5, damage_cap: 25 }
  },
  segfault: {
    id: 'segfault', name: 'Segfault', emoji: '💣',
    type: 'attack', cost: 3, rarity: 'uncommon',
    desc: 'Haz 30 de daño. Aplica Vulnerable 2.',
    effect: { damage: 30, apply: { vulnerable: 2 } }
  },
  null_pointer: {
    id: 'null_pointer', name: 'Null Pointer', emoji: '🚫',
    type: 'attack', cost: 1, rarity: 'uncommon',
    desc: 'Haz 12 de daño. Si el enemigo tiene escudo, ignóralo.',
    effect: { damage: 12, penetrate: true }
  },
  sudo: {
    id: 'sudo', name: 'sudo rm -rf', emoji: '☠️',
    type: 'attack', cost: 3, rarity: 'rare',
    desc: 'Haz 40 de daño. Elimina esta carta del mazo permanentemente.',
    effect: { damage: 40, exhaust: true, remove_from_deck: true }
  },
  merge_conflict: {
    id: 'merge_conflict', name: 'Merge Conflict', emoji: '⚔️',
    type: 'attack', cost: 2, rarity: 'common',
    desc: 'Haz 10 de daño dos veces.',
    effect: { damage: 10, hits: 2 }
  },

  // ═══ DEFENSA ═════════════════════════════════════════════════════════════
  firewall: {
    id: 'firewall', name: 'Firewall', emoji: '🔥',
    type: 'defense', cost: 1, rarity: 'common',
    desc: 'Gana 8 de escudo.',
    effect: { block: 8 }
  },
  vpn: {
    id: 'vpn', name: 'VPN', emoji: '🔒',
    type: 'defense', cost: 2, rarity: 'uncommon',
    desc: 'Gana 15 de escudo. Aplica Weak 1 al enemigo.',
    effect: { block: 15, apply: { weak: 1 } }
  },
  code_review: {
    id: 'code_review', name: 'Code Review', emoji: '🔍',
    type: 'defense', cost: 1, rarity: 'common',
    desc: 'Gana 6 de escudo. Roba 1 carta.',
    effect: { block: 6, draw: 1 }
  },
  backup: {
    id: 'backup', name: 'Backup', emoji: '💾',
    type: 'defense', cost: 2, rarity: 'uncommon',
    desc: 'Gana 20 de escudo. Solo se puede usar si tienes ≤10 HP.',
    effect: { block: 20, condition: { hp_below: 10 } }
  },

  // ═══ HABILIDAD ═══════════════════════════════════════════════════════════
  refactor: {
    id: 'refactor', name: 'Refactor', emoji: '♻️',
    type: 'skill', cost: 1, rarity: 'common',
    desc: 'Descarta tu mano y roba el mismo número de cartas.',
    effect: { discard_hand: true, draw_same: true }
  },
  hotfix: {
    id: 'hotfix', name: 'Hotfix', emoji: '🔧',
    type: 'skill', cost: 0, rarity: 'uncommon',
    desc: 'Recupera 4 HP. Agota esta carta.',
    effect: { heal: 4, exhaust: true }
  },
  standup: {
    id: 'standup', name: 'Daily Standup', emoji: '📋',
    type: 'skill', cost: 1, rarity: 'common',
    desc: 'Gana 2 de energía este turno.',
    effect: { gain_energy: 2 }
  },
  pair_programming: {
    id: 'pair_programming', name: 'Pair Programming', emoji: '👥',
    type: 'skill', cost: 2, rarity: 'uncommon',
    desc: 'La próxima carta que juegues se juega dos veces.',
    effect: { next_card_double: true }
  },
  deploy_viernes: {
    id: 'deploy_viernes', name: 'Deploy en Viernes', emoji: '😱',
    type: 'skill', cost: 0, rarity: 'rare',
    desc: 'Haz 20 de daño. Pero te haces 10 de daño a ti mismo.',
    effect: { damage: 20, self_damage: 10 }
  },
  technical_debt: {
    id: 'technical_debt', name: 'Deuda Técnica', emoji: '📉',
    type: 'skill', cost: 0, rarity: 'uncommon',
    desc: 'Gana 3 de energía. Añade 2 cartas "Parche Temporal" a tu descarte.',
    effect: { gain_energy: 3, add_to_discard: ['parche_temporal', 'parche_temporal'] }
  },
  parche_temporal: {
    id: 'parche_temporal', name: 'Parche Temporal', emoji: '🩹',
    type: 'skill', cost: 0, rarity: 'curse',
    desc: 'Sin efecto. Solo ocupa espacio en tu mano.',
    effect: {}
  },
  sprint_planning: {
    id: 'sprint_planning', name: 'Sprint Planning', emoji: '🗓️',
    type: 'skill', cost: 2, rarity: 'rare',
    desc: 'Roba 4 cartas. Reduce el coste de todas las cartas en mano en 1 este turno.',
    effect: { draw: 4, reduce_hand_cost: 1 }
  }
};

// Starting deck (10 cards)
const STARTING_DECK = [
  'golpe', 'golpe', 'golpe', 'golpe', 'golpe',
  'bloqueo', 'bloqueo', 'bloqueo', 'bloqueo',
  'cafeinazo'
];

// Cards available as rewards (by rarity)
const REWARD_POOL = {
  common: ['commit_force', 'rubber_duck', 'merge_conflict', 'firewall', 'code_review', 'refactor', 'standup'],
  uncommon: ['stack_overflow', 'segfault', 'null_pointer', 'vpn', 'backup', 'hotfix', 'pair_programming', 'technical_debt'],
  rare: ['sudo', 'deploy_viernes', 'sprint_planning']
};

// Pick 3 random reward cards (weighted: 60% common, 30% uncommon, 10% rare)
function getCardRewards() {
  const rewards = [];
  const seen = new Set();
  while (rewards.length < 3) {
    const roll = Math.random();
    let pool;
    if (roll < 0.6) pool = REWARD_POOL.common;
    else if (roll < 0.9) pool = REWARD_POOL.uncommon;
    else pool = REWARD_POOL.rare;
    const card = pool[Math.floor(Math.random() * pool.length)];
    if (!seen.has(card)) { seen.add(card); rewards.push(CARDS[card]); }
  }
  return rewards;
}

module.exports = { CARDS, STARTING_DECK, REWARD_POOL, getCardRewards };

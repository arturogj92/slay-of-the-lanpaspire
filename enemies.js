// ─── Enemy Definitions ────────────────────────────────────────────────────────
// intent: attack | buff | defend | debuff | unknown
// AI patterns: sequence of intents (cycles)

const ENEMIES = {
  // ═══ ACT 1 - BÁSICOS ═════════════════════════════════════════════════════

  bug_rastrero: {
    id: 'bug_rastrero', name: 'Bug Rastrero', emoji: '🐛',
    act: 1, type: 'normal',
    hp: [40, 50], // [min, max] for random
    pattern: [
      { intent: 'attack', value: 8, desc: 'Muerde' },
      { intent: 'attack', value: 8, desc: 'Muerde' },
      { intent: 'debuff', apply: { poison: 3 }, desc: 'Infecta (veneno 3)' }
    ]
  },

  el_lunes: {
    id: 'el_lunes', name: 'El Lunes', emoji: '💤',
    act: 1, type: 'normal',
    hp: [55, 65],
    pattern: [
      { intent: 'unknown', desc: 'No hace nada (es lunes)' },
      { intent: 'buff', apply: { strength: 2 }, desc: 'Se motiva (+2 fuerza)' },
      { intent: 'attack', value: 14, desc: 'Ataque tardío' },
      { intent: 'defend', block: 8, desc: 'Se tapa con el edredón' }
    ]
  },

  el_ticket: {
    id: 'el_ticket', name: 'El Ticket', emoji: '📋',
    act: 1, type: 'normal',
    hp: [30, 40],
    pattern: [
      { intent: 'buff', summon: 'bug_rastrero', desc: 'Abre un ticket (invoca Bug Rastrero)' },
      { intent: 'attack', value: 6, desc: 'Gestiona (6 dmg)' },
      { intent: 'attack', value: 6, desc: 'Escala (6 dmg)' }
    ],
    special: 'summon_on_turn_1'
  },

  hotfix_enemy: {
    id: 'hotfix_enemy', name: 'Hotfix Urgente', emoji: '🔥',
    act: 1, type: 'normal',
    hp: [35, 45],
    pattern: [
      { intent: 'attack', value: 10, desc: 'Parche de emergencia' },
      { intent: 'heal', value: 8, desc: 'Se aplica el hotfix' },
      { intent: 'attack', value: 10, desc: 'Parche de emergencia' }
    ]
  },

  // ═══ ACT 1 - ÉLITES ══════════════════════════════════════════════════════

  langostino_salvaje: {
    id: 'langostino_salvaje', name: 'Langostino Salvaje', emoji: '🦞',
    act: 1, type: 'elite',
    hp: [80, 95],
    pattern: [
      { intent: 'attack', value: 12, desc: 'Pinzazo' },
      { intent: 'attack', value: 12, desc: 'Pinzazo' },
      { intent: 'attack', value: 18, desc: 'Pinzazo DOBLE' },
      { intent: 'buff', apply: { strength: 3 }, desc: 'Se enfurece (+3 fuerza)' }
    ],
    relic_drop: 'pinza_de_langostino'
  },

  la_resaca: {
    id: 'la_resaca', name: 'La Resaca', emoji: '🤢',
    act: 1, type: 'elite',
    hp: [90, 110],
    pattern: [
      { intent: 'debuff', apply: { weak: 2 }, desc: 'Mareo (Weak 2)' },
      { intent: 'attack', value: 15, desc: 'Headache' },
      { intent: 'debuff', apply: { vulnerable: 2 }, desc: 'Náuseas (Vulnerable 2)' },
      { intent: 'attack', value: 20, desc: 'Bajón total' }
    ],
    relic_drop: 'agua_con_gas'
  },

  // ═══ ACT 1 - BOSS ════════════════════════════════════════════════════════

  deploy_del_viernes: {
    id: 'deploy_del_viernes', name: 'El Deploy del Viernes', emoji: '💀',
    act: 1, type: 'boss',
    hp: [150, 150],
    phases: [
      {
        name: 'Fase 1: Preparación (>66% HP)',
        pattern: [
          { intent: 'buff', apply: { strength: 2 }, desc: 'Prepara el deploy (buff)' },
          { intent: 'attack', value: 12, desc: 'Test en prod (12 dmg)' },
          { intent: 'defend', block: 10, desc: 'Cierra los ojos' }
        ]
      },
      {
        name: 'Fase 2: Rollback (33-66% HP)',
        pattern: [
          { intent: 'attack', value: 18, desc: 'Rollback fallido (18 dmg)' },
          { intent: 'debuff', apply: { vulnerable: 2, weak: 1 }, desc: 'Pánico del equipo' },
          { intent: 'attack', value: 22, desc: 'Hotfix desesperado (22 dmg)' }
        ]
      },
      {
        name: 'Fase 3: El Apocalipsis (<33% HP)',
        pattern: [
          { intent: 'attack', value: 30, desc: 'La BD se rompe (30 dmg)' },
          { intent: 'attack', value: 30, desc: 'La web cae (30 dmg)' },
          { intent: 'buff', apply: { strength: 5 }, desc: 'El CEO llama (+5 fuerza)' }
        ]
      }
    ]
  },

  // ═══ ACT 2 - BÁSICOS ═════════════════════════════════════════════════════

  el_fin_de_mes: {
    id: 'el_fin_de_mes', name: 'El Fin de Mes', emoji: '💸',
    act: 2, type: 'normal',
    hp: [65, 80],
    pattern: [
      { intent: 'attack', value: 14, desc: 'Factura (14 dmg)' },
      { intent: 'debuff', apply: { strength: -1 }, desc: 'Estrés financiero (Weak)' },
      { intent: 'attack', value: 14, desc: 'Otro cargo (14 dmg)' },
      { intent: 'buff', apply: { strength: 3 }, desc: 'Intereses (+3 fuerza)' }
    ]
  },

  // ═══ ACT 3 - BOSS FINAL ══════════════════════════════════════════════════

  la_suegra: {
    id: 'la_suegra', name: 'La Suegra', emoji: '👁️',
    act: 3, type: 'boss',
    hp: [220, 220],
    phases: [
      {
        name: 'Fase 1: Críticas pasivo-agresivas',
        pattern: [
          { intent: 'debuff', apply: { weak: 2 }, desc: '"¿Seguro que esto funciona?" (Weak 2)' },
          { intent: 'attack', value: 20, desc: 'Comentario hiriente (20 dmg)' },
          { intent: 'buff', apply: { strength: 2 }, desc: 'Se crece (+2 fuerza)' }
        ]
      },
      {
        name: 'Fase 2: Modo control total',
        pattern: [
          { intent: 'attack', value: 25, desc: 'Inspección (25 dmg)' },
          { intent: 'defend', block: 15, desc: 'Se hace la víctima (15 block)' },
          { intent: 'debuff', apply: { vulnerable: 3 }, desc: 'Culpa (Vulnerable 3)' },
          { intent: 'attack', value: 30, desc: 'Ataque maestro (30 dmg)' }
        ]
      },
      {
        name: 'Fase 3: Forma final',
        pattern: [
          { intent: 'attack', value: 40, desc: '"Lo que yo te diga" (40 dmg)' },
          { intent: 'buff', apply: { strength: 8 }, desc: 'Poder absoluto (+8 fuerza)' }
        ]
      }
    ]
  }
};

// Enemy pools per act/floor type
const ENCOUNTER_TABLE = {
  1: {
    normal: ['bug_rastrero', 'el_lunes', 'el_ticket', 'hotfix_enemy'],
    elite: ['langostino_salvaje', 'la_resaca'],
    boss: ['deploy_del_viernes']
  },
  2: {
    normal: ['el_fin_de_mes', 'bug_rastrero', 'hotfix_enemy'],
    elite: ['langostino_salvaje', 'la_resaca'],
    boss: ['deploy_del_viernes'] // placeholder
  },
  3: {
    normal: ['el_fin_de_mes'],
    elite: ['langostino_salvaje'],
    boss: ['la_suegra']
  }
};

function randomEnemy(act, type = 'normal') {
  const pool = ENCOUNTER_TABLE[act]?.[type] || ENCOUNTER_TABLE[1][type];
  const id = pool[Math.floor(Math.random() * pool.length)];
  const def = ENEMIES[id];
  const hp = Array.isArray(def.hp)
    ? Math.floor(def.hp[0] + Math.random() * (def.hp[1] - def.hp[0]))
    : def.hp;
  return { ...def, hp, hp_max: hp, currentPhase: 0, patternIndex: 0 };
}

function getEnemyDef(id) {
  return ENEMIES[id];
}

module.exports = { ENEMIES, ENCOUNTER_TABLE, randomEnemy, getEnemyDef };

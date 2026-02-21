-- Slay of the Lanpaspire - Seed Data
-- Author: Coig 🧠

-- ==========================================
-- CHARACTERS (Los Yikos)
-- ==========================================
INSERT INTO characters (id, name, description, base_hp) VALUES
  ('hacker', 'Hacker', 'Arturo - Especialista en ataques digitales y exploits. Fuerte en combos de cartas.', 80),
  ('explorador', 'Explorador', 'Nacho - Maestro de la supervivencia. Genera bloqueo y se adapta.', 85),
  ('inventor', 'Inventor', 'Víctor - Crea artefactos durante el combate. Builds potentes.', 75),
  ('constructor', 'Constructor', 'Juan - Tanque. Construye defensas y fortalece aliados.', 90),
  ('ranger', 'Ranger', 'Rober - Ataques a distancia y veneno. Daño sostenido.', 72),
  ('chef', 'Chef', 'Pollo - Cocina pociones en combate. Curación y buffs.', 78);

-- ==========================================
-- STARTER CARDS (shared)
-- ==========================================
INSERT INTO cards (id, name, description, type, character_id, rarity, energy_cost, base_damage, base_block) VALUES
  ('strike', 'Golpe', 'Inflige 6 de daño.', 'attack', NULL, 'starter', 1, 6, 0),
  ('defend', 'Defensa', 'Obtén 5 de bloqueo.', 'skill', NULL, 'starter', 1, 0, 5);

-- ==========================================
-- HACKER CARDS
-- ==========================================
INSERT INTO cards (id, name, description, type, character_id, rarity, energy_cost, base_damage, base_block, effects_json) VALUES
  ('hack_strike', 'Hack Strike', 'Inflige 8 de daño. Roba 1 carta.', 'attack', 'hacker', 'common', 1, 8, 0, '{"draw": 1}'),
  ('firewall', 'Firewall', 'Obtén 8 de bloqueo.', 'skill', 'hacker', 'common', 1, 0, 8, NULL),
  ('exploit', 'Exploit', 'Inflige 5 de daño 2 veces.', 'attack', 'hacker', 'common', 1, 5, 0, '{"hits": 2}'),
  ('ddos', 'DDoS', 'Inflige 4 de daño a TODOS los enemigos.', 'attack', 'hacker', 'uncommon', 1, 4, 0, '{"aoe": true}'),
  ('buffer_overflow', 'Buffer Overflow', 'Inflige 14 de daño. Descarta 1 carta al azar.', 'attack', 'hacker', 'uncommon', 2, 14, 0, '{"discard_random": 1}'),
  ('rootkit', 'Rootkit', 'Gana 2 de Fuerza.', 'power', 'hacker', 'uncommon', 1, 0, 0, '{"strength": 2}'),
  ('zero_day', 'Zero Day', 'Inflige 25 de daño. Agota.', 'attack', 'hacker', 'rare', 2, 25, 0, '{"exhaust": true}'),
  ('backdoor', 'Backdoor', 'Roba 3 cartas. Gana 1 energía.', 'skill', 'hacker', 'rare', 1, 0, 0, '{"draw": 3, "energy": 1}'),
  ('botnet', 'Botnet', 'Al inicio de cada turno, inflige 3 de daño a todos.', 'power', 'hacker', 'rare', 2, 0, 0, '{"start_turn_aoe": 3}');

-- ==========================================
-- ENEMIES - Act 1
-- ==========================================
INSERT INTO enemies (id, name, base_hp_min, base_hp_max, type, act, ai_pattern_json) VALUES
  ('slime_s', 'Slime Pequeño', 10, 14, 'normal', 1, '[{"intent":"attack","damage":5},{"intent":"attack","damage":5}]'),
  ('slime_m', 'Slime Mediano', 28, 32, 'normal', 1, '[{"intent":"attack","damage":8},{"intent":"defend","block":5},{"intent":"attack","damage":12}]'),
  ('goblin', 'Goblin', 12, 16, 'normal', 1, '[{"intent":"attack","damage":6},{"intent":"buff","effect":"strength","value":1},{"intent":"attack","damage":6}]'),
  ('esqueleto', 'Esqueleto', 22, 28, 'normal', 1, '[{"intent":"attack","damage":10},{"intent":"attack","damage":6},{"intent":"defend","block":8}]'),
  ('rata', 'Rata Mutante', 8, 12, 'normal', 1, '[{"intent":"attack","damage":4},{"intent":"attack","damage":4},{"intent":"buff","effect":"strength","value":2}]'),
  ('hongo', 'Hongo Venenoso', 18, 22, 'normal', 1, '[{"intent":"attack","damage":7,"effect":"poison","value":2},{"intent":"defend","block":6}]'),
  -- Elites
  ('guardian', 'Guardián Lanpa', 45, 55, 'elite', 1, '[{"intent":"attack","damage":12},{"intent":"defend","block":10},{"intent":"attack","damage":18},{"intent":"buff","effect":"strength","value":3}]'),
  ('brujo', 'Brujo Oscuro', 38, 48, 'elite', 1, '[{"intent":"buff","effect":"strength","value":2},{"intent":"attack","damage":15},{"intent":"attack","damage":10,"effect":"weak","value":2}]'),
  -- Boss
  ('rey_slime', 'Rey Slime', 120, 140, 'boss', 1, '[{"intent":"attack","damage":15},{"intent":"summon","enemy":"slime_s"},{"intent":"attack","damage":20},{"intent":"defend","block":12},{"intent":"attack","damage":25}]');

-- ==========================================
-- RELICS
-- ==========================================
INSERT INTO relics (id, name, description, rarity, effects_json) VALUES
  ('burning_blood', 'Sangre Ardiente', 'Al final de cada combate, cura 6 HP.', 'starter', '{"heal_after_combat": 6}'),
  ('vajra', 'Vajra', 'Al inicio del combate, gana 1 de Fuerza.', 'common', '{"start_combat_strength": 1}'),
  ('bag_of_marbles', 'Bolsa de Canicas', 'Al inicio del combate, aplica 1 Vulnerable a todos los enemigos.', 'common', '{"start_combat_vulnerable_all": 1}'),
  ('lantern', 'Linterna', 'Gana 1 energía extra en el primer turno.', 'uncommon', '{"first_turn_energy": 1}'),
  ('meat_on_bone', 'Carne en Hueso', 'Si acabas un combate con ≤50% HP, cura 12 HP.', 'uncommon', '{"heal_if_low": 12}'),
  ('golden_idol', 'Ídolo Dorado', 'Gana 25% más de oro.', 'rare', '{"gold_multiplier": 1.25}');

-- ==========================================
-- POTIONS
-- ==========================================
INSERT INTO potions (id, name, description, rarity, effects_json) VALUES
  ('health_potion', 'Poción de Vida', 'Cura 30 HP.', 'common', '{"heal": 30}'),
  ('fire_potion', 'Poción de Fuego', 'Inflige 20 de daño a un enemigo.', 'common', '{"damage": 20}'),
  ('block_potion', 'Poción de Bloqueo', 'Obtén 12 de bloqueo.', 'common', '{"block": 12}'),
  ('strength_potion', 'Poción de Fuerza', 'Gana 2 de Fuerza este combate.', 'uncommon', '{"strength": 2}'),
  ('energy_potion', 'Poción de Energía', 'Gana 2 de energía.', 'uncommon', '{"energy": 2}'),
  ('fairy_potion', 'Poción de Hada', 'Si mueres, revive con 30% HP. Se consume automáticamente.', 'rare', '{"revive_percent": 30}');

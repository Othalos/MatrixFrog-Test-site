import { Character, Weapon } from '../types/GameTypes';

export const CONFIG = {
  MAP: 10000,
  VIEW: 750,
  PLAYER_SIZE: 32,
  ENEMY_SIZE: 32,
  ENEMY_SPEED: 100,
  ENEMY_SPEED_INC: 0.01,
  ENEMY_HP: 25,
  ENEMY_DMG: 10,
  ENEMY_COOLDOWN: 1000,
  BOSS_SIZE: 2,
  BOSS_HP: 2,
  BOSS_DMG: 2,
  PROJ_SIZE: 6,
  XP_ENEMY: 10,
  XP_BOSS: 50,
  XP_LEVEL: 100,
  HEALTH_BONUS: 0.07,
  ATTACK_BONUS: 0.08,
  SPEED_BONUS: 0.02,
  ENEMIES_FOR_BOSS: 15,
  BASE_SPAWN_RATE: 1500,
  MIN_SPAWN_RATE: 300,
};

export const CHARS: Record<string, Character> = {
  pax: { id: 'pax', name: 'Pax', hp: 100, spd: 200, atk: 10, wpn: 'pistol', unlock: 0 },
  lilly: { id: 'lilly', name: 'Lilly', hp: 75, spd: 250, atk: 8, wpn: 'shotgun', unlock: 5 },
  theOne: { id: 'theOne', name: 'The One', hp: 150, spd: 200, atk: 6, wpn: 'arc', unlock: 7 },
};

export const WPNS: Record<string, Weapon> = {
  pistol: { rate: 500, dmg: 1.0, spd: 400, cnt: 1, spread: 0, pierce: false },
  shotgun: { rate: 800, dmg: 0.5, spd: 350, cnt: 5, spread: 0.3, pierce: false },
  arc: { rate: 600, dmg: 0.75, spd: 400, cnt: 1, spread: 0, pierce: true, isArc: true },
  assault: { rate: 100, dmg: 0.4, spd: 450, cnt: 1, spread: 0, pierce: false, burst: 3, burstDelay: 50 },
  rocket: { rate: 1500, dmg: 2.0, spd: 300, cnt: 1, spread: 0, pierce: false, aoe: 80 },
  shockwave: { rate: 5000, dmg: 1.5, spd: 0, cnt: 1, spread: 0, pierce: false, radius: 150 },
};

export const COL = {
  BG: '#000',
  GREEN: '#00FF00',
  PLAYER: '#4ade80',
  ENEMY: '#228B22',
  BOSS: '#8B0000',
  PROJ: '#FFD700',
  VIOLET: '#8b5cf6',
  HP_BG: '#333',
  HP: '#00FF00',
  XP_BG: '#333',
  XP: '#FFD700',
  GRID: '#003300',
};

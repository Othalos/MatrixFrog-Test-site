export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Enemy {
  id: number;
  position: Position;
  health: number;
  maxHealth: number;
  lastAttack: number;
  isBoss: boolean;
  damage: number;
}

export interface Projectile {
  id: number;
  position: Position;
  velocity: Velocity;
  damage: number;
  piercing: boolean;
  hitEnemies: Set<number>;
  color: string;
  aoe?: number;
  isRocket?: boolean;
  isArc?: boolean;
}

export interface Chest {
  id: number;
  position: Position;
}

export interface Character {
  id: string;
  name: string;
  hp: number;
  spd: number;
  atk: number;
  wpn: string;
  unlock: number;
}

export interface Weapon {
  rate: number;
  dmg: number;
  spd: number;
  cnt: number;
  spread: number;
  pierce: boolean;
  isArc?: boolean;
  burst?: number;
  burstDelay?: number;
  aoe?: number;
  radius?: number;
}

export interface GameState {
  pos: Position;
  vel: Velocity;
  hp: number;
  maxHp: number;
  xp: number;
  lvl: number;
  atk: number;
  spd: number;
  wpn: string;
  hpBonus: number;
  atkBonus: number;
  spdBonus: number;
  wave: number;
  totalKilled: number;
  bossKilled: number;
  nextBossAt: number;
  cam: Position;
  enemies: Enemy[];
  projs: Projectile[];
  chests: Chest[];
  nextEId: number;
  nextPId: number;
  nextCId: number;
  lastFire: number;
  lastSpawn: number;
  additionalWeapons: string[];
  lastWeaponFires: Record<string, number>;
  keys: Set<string>;
  joyActive: boolean;
  joyStart: Position;
  joyCur: Position;
  joyDir: Velocity;
  lastTime: number;
  frame: number;
}

export type GamePhase = 'menu' | 'charselect' | 'playing' | 'levelup' | 'weaponselect' | 'gameover';

import React, { useEffect, useRef, useState } from 'react';

const GAME_CONFIG = {
  MAP_WIDTH: 10000,
  MAP_HEIGHT: 10000,
  VIEWPORT_WIDTH: 750,
  VIEWPORT_HEIGHT: 750,
  PLAYER_SIZE: 32,
  PLAYER_BASE_SPEED: 200,
  PLAYER_BASE_HEALTH: 100,
  PLAYER_BASE_ATTACK: 10,
  ENEMY_SIZE: 32,
  ENEMY_SPEED: 100,
  ENEMY_SPEED_INCREASE_PER_WAVE: 0.01, // 1% per wave
  ENEMY_HEALTH: 30,
  ENEMY_DAMAGE: 10,
  ENEMY_ATTACK_COOLDOWN: 1000,
  BOSS_SIZE_MULTIPLIER: 2,
  BOSS_HEALTH_MULTIPLIER: 2,
  BOSS_DAMAGE_MULTIPLIER: 2,
  PISTOL_FIRE_RATE: 500,
  PISTOL_DAMAGE: 10,
  PISTOL_SPEED: 400,
  PROJECTILE_SIZE: 6,
  XP_PER_ENEMY: 10,
  XP_PER_BOSS: 50,
  XP_TO_LEVEL: 100,
  STAT_BONUS: 0.02,
  INITIAL_ENEMIES_PER_WAVE: 5,
  WAVE_MULTIPLIER: 2,
};

const COLORS = {
  BACKGROUND: '#000000',
  MATRIX_GREEN: '#00FF00',
  PLAYER: '#4ade80',
  ENEMY: '#228B22',
  BOSS: '#8B0000',
  PROJECTILE: '#FFD700',
  HEALTH_BAR_BG: '#333333',
  HEALTH_BAR_FILL: '#00FF00',
  XP_BAR_BG: '#333333',
  XP_BAR_FILL: '#FFD700',
  GRID: '#003300',
  UI_BG: 'rgba(0, 0, 0, 0.9)',
  UI_BORDER: '#22c55e',
};

interface Vector2D {
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  position: Vector2D;
  health: number;
  maxHealth: number;
  lastAttack: number;
  isBoss: boolean;
  damage: number;
}

interface Projectile {
  id: number;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
}

type GamePhase = 'menu' | 'playing' | 'levelup' | 'gameover';

const MatrixSurvivor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [isMobile, setIsMobile] = useState(false);
  
  const playerPos = useRef<Vector2D>({ x: 5000, y: 5000 });
  const playerVel = useRef<Vector2D>({ x: 0, y: 0 });
  const playerHealth = useRef(GAME_CONFIG.PLAYER_BASE_HEALTH);
  const playerMaxHealth = useRef(GAME_CONFIG.PLAYER_BASE_HEALTH);
  const playerXP = useRef(0);
  const playerLevel = useRef(1);
  const playerAttack = useRef(GAME_CONFIG.PLAYER_BASE_ATTACK);
  const playerSpeed = useRef(GAME_CONFIG.PLAYER_BASE_SPEED);
  
  const healthBonus = useRef(0);
  const attackBonus = useRef(0);
  const speedBonus = useRef(0);
  
  const currentWave = useRef(1);
  const enemiesThisWave = useRef(0);
  const enemiesKilledThisWave = useRef(0);
  const bossDefeated = useRef(false);
  
  const camera = useRef<Vector2D>({ x: 0, y: 0 });
  const enemies = useRef<Enemy[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const nextEnemyId = useRef(0);
  const nextProjectileId = useRef(0);
  const lastWeaponFire = useRef(0);
  
  const keys = useRef<Set<string>>(new Set());
  const joystickActive = useRef(false);
  const joystickStart = useRef<Vector2D>({ x: 0, y: 0 });
  const joystickCurrent = useRef<Vector2D>({ x: 0, y: 0 });
  const joystickDirection = useRef<Vector2D>({ x: 0, y: 0 });
  
  const lastTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const normalizePosition = (pos: Vector2D): Vector2D => {
    let x = pos.x;
    let y = pos.y;
    if (x < 0) x += GAME_CONFIG.MAP_WIDTH;
    if (x > GAME_CONFIG.MAP_WIDTH) x -= GAME_CONFIG.MAP_WIDTH;
    if (y < 0) y += GAME_CONFIG.MAP_HEIGHT;
    if (y > GAME_CONFIG.MAP_HEIGHT) y -= GAME_CONFIG.MAP_HEIGHT;
    return { x, y };
  };

  const updateCamera = () => {
    camera.current = {
      x: playerPos.current.x - GAME_CONFIG.VIEWPORT_WIDTH / 2,
      y: playerPos.current.y - GAME_CONFIG.VIEWPORT_HEIGHT / 2,
    };
  };

  const distance = (a: Vector2D, b: Vector2D): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const spawnWave = (waveNumber: number) => {
    const enemyCount = GAME_CONFIG.INITIAL_ENEMIES_PER_WAVE * Math.pow(GAME_CONFIG.WAVE_MULTIPLIER, waveNumber - 1);
    enemiesThisWave.current = enemyCount;
    enemiesKilledThisWave.current = 0;
    bossDefeated.current = false;
    
    for (let i = 0; i < enemyCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 400 + Math.random() * 200;
      
      const enemy: Enemy = {
        id: nextEnemyId.current++,
        position: normalizePosition({
          x: playerPos.current.x + Math.cos(angle) * dist,
          y: playerPos.current.y + Math.sin(angle) * dist,
        }),
        health: GAME_CONFIG.ENEMY_HEALTH,
        maxHealth: GAME_CONFIG.ENEMY_HEALTH,
        lastAttack: 0,
        isBoss: false,
        damage: GAME_CONFIG.ENEMY_DAMAGE,
      };
      
      enemies.current.push(enemy);
    }
  };

  const spawnBoss = (waveNumber: number) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 500;
    
    const bossHealth = GAME_CONFIG.ENEMY_HEALTH * GAME_CONFIG.BOSS_HEALTH_MULTIPLIER * waveNumber;
    const bossDamage = GAME_CONFIG.ENEMY_DAMAGE * GAME_CONFIG.BOSS_DAMAGE_MULTIPLIER * waveNumber;
    
    const boss: Enemy = {
      id: nextEnemyId.current++,
      position: normalizePosition({
        x: playerPos.current.x + Math.cos(angle) * dist,
        y: playerPos.current.y + Math.sin(angle) * dist,
      }),
      health: bossHealth,
      maxHealth: bossHealth,
      lastAttack: 0,
      isBoss: true,
      damage: bossDamage,
    };
    
    enemies.current.push(boss);
  };

  const findNearestEnemy = (): Enemy | null => {
    if (enemies.current.length === 0) return null;
    let nearest = enemies.current[0];
    let minDist = distance(playerPos.current, nearest.position);
    for (const enemy of enemies.current) {
      const dist = distance(playerPos.current, enemy.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  };

  const fireWeapon = (timestamp: number) => {
    if (timestamp - lastWeaponFire.current < GAME_CONFIG.PISTOL_FIRE_RATE) return;
    const target = findNearestEnemy();
    if (!target) return;
    
    lastWeaponFire.current = timestamp;
    const dx = target.position.x - playerPos.current.x;
    const dy = target.position.y - playerPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    projectiles.current.push({
      id: nextProjectileId.current++,
      position: { ...playerPos.current },
      velocity: {
        x: (dx / dist) * GAME_CONFIG.PISTOL_SPEED,
        y: (dy / dist) * GAME_CONFIG.PISTOL_SPEED,
      },
      damage: playerAttack.current,
    });
  };

  const applyStat = (stat: 'health' | 'attack' | 'speed') => {
    if (stat === 'health') {
      healthBonus.current += GAME_CONFIG.STAT_BONUS;
      const newMaxHealth = GAME_CONFIG.PLAYER_BASE_HEALTH * (1 + healthBonus.current);
      const healthIncrease = newMaxHealth - playerMaxHealth.current;
      playerMaxHealth.current = newMaxHealth;
      playerHealth.current += healthIncrease;
    } else if (stat === 'attack') {
      attackBonus.current += GAME_CONFIG.STAT_BONUS;
      playerAttack.current = GAME_CONFIG.PLAYER_BASE_ATTACK * (1 + attackBonus.current);
    } else if (stat === 'speed') {
      speedBonus.current += GAME_CONFIG.STAT_BONUS;
      playerSpeed.current = GAME_CONFIG.PLAYER_BASE_SPEED * (1 + speedBonus.current);
    }
    // Reset lastTime to prevent time jump
    lastTime.current = 0;
    setGamePhase('playing');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      joystickActive.current = true;
      joystickStart.current = { x: touch.clientX, y: touch.clientY };
      joystickCurrent.current = { x: touch.clientX, y: touch.clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!joystickActive.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      joystickCurrent.current = { x: touch.clientX, y: touch.clientY };
      const dx = joystickCurrent.current.x - joystickStart.current.x;
      const dy = joystickCurrent.current.y - joystickStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      joystickDirection.current = dist > 5 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
    };
    const handleTouchEnd = () => {
      joystickActive.current = false;
      joystickDirection.current = { x: 0, y: 0 };
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTime.current ? (timestamp - lastTime.current) / 1000 : 0;
      lastTime.current = timestamp;

      let vx = 0;
      let vy = 0;
      if (keys.current.has('w') || keys.current.has('arrowup')) vy -= 1;
      if (keys.current.has('s') || keys.current.has('arrowdown')) vy += 1;
      if (keys.current.has('a') || keys.current.has('arrowleft')) vx -= 1;
      if (keys.current.has('d') || keys.current.has('arrowright')) vx += 1;

      if (joystickActive.current) {
        vx = joystickDirection.current.x;
        vy = joystickDirection.current.y;
      } else if (vx !== 0 && vy !== 0) {
        const len = Math.sqrt(vx * vx + vy * vy);
        vx /= len;
        vy /= len;
      }

      playerVel.current = { x: vx * playerSpeed.current, y: vy * playerSpeed.current };
      playerPos.current = {
        x: playerPos.current.x + playerVel.current.x * deltaTime,
        y: playerPos.current.y + playerVel.current.y * deltaTime,
      };
      playerPos.current = normalizePosition(playerPos.current);

      fireWeapon(timestamp);

      projectiles.current = projectiles.current.filter(proj => {
        proj.position.x += proj.velocity.x * deltaTime;
        proj.position.y += proj.velocity.y * deltaTime;
        return distance(proj.position, playerPos.current) < 1000;
      });

      for (const enemy of enemies.current) {
        const dx = playerPos.current.x - enemy.position.x;
        const dy = playerPos.current.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const enemySize = enemy.isBoss ? GAME_CONFIG.ENEMY_SIZE * GAME_CONFIG.BOSS_SIZE_MULTIPLIER : GAME_CONFIG.ENEMY_SIZE;
        
        // Enemy speed scales with wave number
        const enemySpeed = GAME_CONFIG.ENEMY_SPEED * (1 + (currentWave.current - 1) * GAME_CONFIG.ENEMY_SPEED_INCREASE_PER_WAVE);
        
        if (dist > enemySize) {
          // Move toward player
          const moveX = (dx / dist) * enemySpeed * deltaTime;
          const moveY = (dy / dist) * enemySpeed * deltaTime;
          
          enemy.position.x += moveX;
          enemy.position.y += moveY;
          enemy.position = normalizePosition(enemy.position);
          
          // Enemy collision avoidance
          for (const otherEnemy of enemies.current) {
            if (enemy.id === otherEnemy.id) continue;
            
            const otherSize = otherEnemy.isBoss ? GAME_CONFIG.ENEMY_SIZE * GAME_CONFIG.BOSS_SIZE_MULTIPLIER : GAME_CONFIG.ENEMY_SIZE;
            const edx = enemy.position.x - otherEnemy.position.x;
            const edy = enemy.position.y - otherEnemy.position.y;
            const edist = Math.sqrt(edx * edx + edy * edy);
            const minDist = (enemySize + otherSize) / 2;
            
            if (edist < minDist && edist > 0) {
              const pushForce = (minDist - edist) / 2;
              enemy.position.x += (edx / edist) * pushForce;
              enemy.position.y += (edy / edist) * pushForce;
              enemy.position = normalizePosition(enemy.position);
            }
          }
        } else {
          if (timestamp - enemy.lastAttack > GAME_CONFIG.ENEMY_ATTACK_COOLDOWN) {
            playerHealth.current -= enemy.damage;
            enemy.lastAttack = timestamp;
            if (playerHealth.current <= 0) {
              setGamePhase('gameover');
            }
          }
        }
      }

      for (let i = projectiles.current.length - 1; i >= 0; i--) {
        const proj = projectiles.current[i];
        for (let j = enemies.current.length - 1; j >= 0; j--) {
          const enemy = enemies.current[j];
          const enemySize = enemy.isBoss ? GAME_CONFIG.ENEMY_SIZE * GAME_CONFIG.BOSS_SIZE_MULTIPLIER : GAME_CONFIG.ENEMY_SIZE;
          
          if (distance(proj.position, enemy.position) < enemySize / 2) {
            enemy.health -= proj.damage;
            projectiles.current.splice(i, 1);
            
            if (enemy.health <= 0) {
              const xpGained = enemy.isBoss ? GAME_CONFIG.XP_PER_BOSS : GAME_CONFIG.XP_PER_ENEMY;
              playerXP.current += xpGained;
              
              if (enemy.isBoss) {
                bossDefeated.current = true;
              } else {
                enemiesKilledThisWave.current++;
              }
              
              enemies.current.splice(j, 1);
              
              if (playerXP.current >= GAME_CONFIG.XP_TO_LEVEL) {
                playerXP.current -= GAME_CONFIG.XP_TO_LEVEL;
                playerLevel.current++;
                setGamePhase('levelup');
              }
            }
            break;
          }
        }
      }

      if (enemiesKilledThisWave.current >= enemiesThisWave.current && !bossDefeated.current && enemies.current.length === 0) {
        spawnBoss(currentWave.current);
      } else if (bossDefeated.current && enemies.current.length === 0) {
        currentWave.current++;
        spawnWave(currentWave.current);
      }

      updateCamera();
      render(ctx);
      animationFrame.current = requestAnimationFrame(gameLoop);
    };

    animationFrame.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [gamePhase]);

  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, GAME_CONFIG.VIEWPORT_WIDTH, GAME_CONFIG.VIEWPORT_HEIGHT);

    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    const gridSize = 100;
    const startX = Math.floor(camera.current.x / gridSize) * gridSize;
    const startY = Math.floor(camera.current.y / gridSize) * gridSize;
    for (let x = startX; x < camera.current.x + GAME_CONFIG.VIEWPORT_WIDTH + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x - camera.current.x, 0);
      ctx.lineTo(x - camera.current.x, GAME_CONFIG.VIEWPORT_HEIGHT);
      ctx.stroke();
    }
    for (let y = startY; y < camera.current.y + GAME_CONFIG.VIEWPORT_HEIGHT + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y - camera.current.y);
      ctx.lineTo(GAME_CONFIG.VIEWPORT_WIDTH, y - camera.current.y);
      ctx.stroke();
    }

    for (const enemy of enemies.current) {
      const size = enemy.isBoss ? GAME_CONFIG.ENEMY_SIZE * GAME_CONFIG.BOSS_SIZE_MULTIPLIER : GAME_CONFIG.ENEMY_SIZE;
      const screenX = enemy.position.x - camera.current.x - size / 2;
      const screenY = enemy.position.y - camera.current.y - size / 2;
      
      ctx.fillStyle = enemy.isBoss ? COLORS.BOSS : COLORS.ENEMY;
      ctx.fillRect(screenX, screenY, size, size);
      
      const barWidth = size;
      const barHeight = 4;
      ctx.fillStyle = COLORS.HEALTH_BAR_BG;
      ctx.fillRect(screenX, screenY - 8, barWidth, barHeight);
      ctx.fillStyle = COLORS.HEALTH_BAR_FILL;
      ctx.fillRect(screenX, screenY - 8, barWidth * (enemy.health / enemy.maxHealth), barHeight);
    }

    for (const proj of projectiles.current) {
      ctx.fillStyle = COLORS.PROJECTILE;
      ctx.beginPath();
      ctx.arc(proj.position.x - camera.current.x, proj.position.y - camera.current.y, GAME_CONFIG.PROJECTILE_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const playerScreenX = GAME_CONFIG.VIEWPORT_WIDTH / 2 - GAME_CONFIG.PLAYER_SIZE / 2;
    const playerScreenY = GAME_CONFIG.VIEWPORT_HEIGHT / 2 - GAME_CONFIG.PLAYER_SIZE / 2;
    ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(playerScreenX, playerScreenY, GAME_CONFIG.PLAYER_SIZE, GAME_CONFIG.PLAYER_SIZE);

    const padding = 10;
    const barWidth = 200;
    const barHeight = 20;

    ctx.fillStyle = COLORS.HEALTH_BAR_BG;
    ctx.fillRect(padding, padding, barWidth, barHeight);
    ctx.fillStyle = COLORS.HEALTH_BAR_FILL;
    ctx.fillRect(padding, padding, barWidth * Math.max(0, playerHealth.current / playerMaxHealth.current), barHeight);
    ctx.strokeStyle = COLORS.MATRIX_GREEN;
    ctx.strokeRect(padding, padding, barWidth, barHeight);
    ctx.fillStyle = COLORS.MATRIX_GREEN;
    ctx.font = '12px monospace';
    ctx.fillText(`HP: ${Math.max(0, Math.floor(playerHealth.current))}/${Math.floor(playerMaxHealth.current)}`, padding + 5, padding + 15);

    ctx.fillStyle = COLORS.XP_BAR_BG;
    ctx.fillRect(padding, padding + 30, barWidth, barHeight);
    ctx.fillStyle = COLORS.XP_BAR_FILL;
    ctx.fillRect(padding, padding + 30, barWidth * (playerXP.current / GAME_CONFIG.XP_TO_LEVEL), barHeight);
    ctx.strokeStyle = COLORS.MATRIX_GREEN;
    ctx.strokeRect(padding, padding + 30, barWidth, barHeight);
    ctx.fillText(`XP: ${playerXP.current}/${GAME_CONFIG.XP_TO_LEVEL}`, padding + 5, padding + 45);
    
    ctx.fillText(`Level: ${playerLevel.current}`, padding, padding + 70);
    ctx.fillText(`Wave: ${currentWave.current}`, padding, padding + 90);
    ctx.fillText(`Enemies: ${enemies.current.length}`, padding, padding + 110);

    if (isMobile && joystickActive.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const jx = joystickStart.current.x - rect.left;
        const jy = joystickStart.current.y - rect.top;
        const cx = joystickCurrent.current.x - rect.left;
        const cy = joystickCurrent.current.y - rect.top;
        ctx.strokeStyle = COLORS.MATRIX_GREEN;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(jx, jy, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const startGame = () => {
    playerPos.current = { x: 5000, y: 5000 };
    playerHealth.current = GAME_CONFIG.PLAYER_BASE_HEALTH;
    playerMaxHealth.current = GAME_CONFIG.PLAYER_BASE_HEALTH;
    playerXP.current = 0;
    playerLevel.current = 1;
    playerAttack.current = GAME_CONFIG.PLAYER_BASE_ATTACK;
    playerSpeed.current = GAME_CONFIG.PLAYER_BASE_SPEED;
    healthBonus.current = 0;
    attackBonus.current = 0;
    speedBonus.current = 0;
    currentWave.current = 1;
    enemies.current = [];
    projectiles.current = [];
    lastTime.current = 0;
    spawnWave(1);
    setGamePhase('playing');
  };

  if (gamePhase === 'menu') {
    return (
      <div style={{
        width: `${GAME_CONFIG.VIEWPORT_WIDTH}px`,
        height: `${GAME_CONFIG.VIEWPORT_HEIGHT}px`,
        backgroundColor: COLORS.BACKGROUND,
        border: `2px solid ${COLORS.MATRIX_GREEN}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: COLORS.MATRIX_GREEN,
      }}>
        <h1 style={{ marginBottom: '20px', textShadow: '0 0 10px #00FF00' }}>MATRIX SURVIVOR</h1>
        <p style={{ marginBottom: '30px', textAlign: 'center', maxWidth: '400px' }}>
          {isMobile ? 'Touch and drag to move' : 'Use WASD or Arrow Keys to move'}. 
          Survive waves, defeat bosses, and level up!
        </p>
        <button onClick={startGame} style={{
          padding: '15px 40px',
          fontSize: '18px',
          backgroundColor: 'transparent',
          border: `2px solid ${COLORS.MATRIX_GREEN}`,
          color: COLORS.MATRIX_GREEN,
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}>START GAME</button>
      </div>
    );
  }

  if (gamePhase === 'levelup') {
    return (
      <div style={{
        width: `${GAME_CONFIG.VIEWPORT_WIDTH}px`,
        height: `${GAME_CONFIG.VIEWPORT_HEIGHT}px`,
        backgroundColor: COLORS.UI_BG,
        border: `2px solid ${COLORS.UI_BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: COLORS.MATRIX_GREEN,
      }}>
        <h2 style={{ marginBottom: '30px', textShadow: '0 0 10px #00FF00' }}>LEVEL UP!</h2>
        <p style={{ marginBottom: '40px' }}>Choose a stat to improve by 2%:</p>
        <div style={{ display: 'flex', gap: '20px', flexDirection: isMobile ? 'column' : 'row' }}>
          <button onClick={() => applyStat('health')} style={{
            padding: '20px 30px',
            fontSize: '16px',
            backgroundColor: 'transparent',
            border: `2px solid ${COLORS.MATRIX_GREEN}`,
            color: COLORS.MATRIX_GREEN,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>HEALTH</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Max HP +2%</div>
          </button>
          <button onClick={() => applyStat('attack')} style={{
            padding: '20px 30px',
            fontSize: '16px',
            backgroundColor: 'transparent',
            border: `2px solid ${COLORS.MATRIX_GREEN}`,
            color: COLORS.MATRIX_GREEN,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>ATTACK</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Damage +2%</div>
          </button>
          <button onClick={() => applyStat('speed')} style={{
            padding: '20px 30px',
            fontSize: '16px',
            backgroundColor: 'transparent',
            border: `2px solid ${COLORS.MATRIX_GREEN}`,
            color: COLORS.MATRIX_GREEN,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>SPEED</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Move Speed +2%</div>
          </button>
        </div>
      </div>
    );
  }

  if (gamePhase === 'gameover') {
    return (
      <div style={{
        width: `${GAME_CONFIG.VIEWPORT_WIDTH}px`,
        height: `${GAME_CONFIG.VIEWPORT_HEIGHT}px`,
        backgroundColor: COLORS.UI_BG,
        border: '2px solid #DC143C',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#DC143C',
      }}>
        <h1 style={{ marginBottom: '20px', textShadow: '0 0 10px #DC143C' }}>GAME OVER</h1>
        <div style={{ marginBottom: '40px', textAlign: 'center', color: COLORS.MATRIX_GREEN }}>
          <p>Wave Reached: {currentWave.current}</p>
          <p>Final Level: {playerLevel.current}</p>
        </div>
        <button onClick={startGame} style={{
          padding: '15px 40px',
          fontSize: '18px',
          backgroundColor: 'transparent',
          border: `2px solid ${COLORS.MATRIX_GREEN}`,
          color: COLORS.MATRIX_GREEN,
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}>RESTART</button>
      </div>
    );
  }

  return (
    <div style={{
      width: `${GAME_CONFIG.VIEWPORT_WIDTH}px`,
      height: `${GAME_CONFIG.VIEWPORT_HEIGHT}px`,
      border: `2px solid ${COLORS.MATRIX_GREEN}`,
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.VIEWPORT_WIDTH}
        height={GAME_CONFIG.VIEWPORT_HEIGHT}
        style={{ display: 'block', touchAction: 'none' }}
      />
    </div>
  );
};

export default MatrixSurvivor;

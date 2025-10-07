import React, { useEffect, useRef, useState } from 'react';

const CONFIG = {
  MAP: 10000, VIEW: 750, PLAYER_SIZE: 32, ENEMY_SIZE: 32, ENEMY_SPEED: 100, ENEMY_SPEED_INC: 0.01,
  ENEMY_HP: 25, ENEMY_DMG: 10, ENEMY_COOLDOWN: 1000, BOSS_SIZE: 2, BOSS_HP: 2, BOSS_DMG: 2,
  PROJ_SIZE: 6, XP_ENEMY: 10, XP_BOSS: 50, XP_LEVEL: 100, 
  HEALTH_BONUS: 0.07, ATTACK_BONUS: 0.08, SPEED_BONUS: 0.02,
  ENEMIES_FOR_BOSS: 15, BASE_SPAWN_RATE: 1500, MIN_SPAWN_RATE: 300,
};

const CHARS = {
  pax: { id: 'pax', name: 'Pax', hp: 100, spd: 200, atk: 10, wpn: 'pistol', unlock: 0 },
  lilly: { id: 'lilly', name: 'Lilly', hp: 75, spd: 250, atk: 8, wpn: 'shotgun', unlock: 5 },
  theOne: { id: 'theOne', name: 'The One', hp: 150, spd: 200, atk: 6, wpn: 'arc', unlock: 7 },
};

const WPNS = {
  pistol: { rate: 500, dmg: 1.0, spd: 400, cnt: 1, spread: 0, pierce: false },
  shotgun: { rate: 800, dmg: 0.5, spd: 350, cnt: 5, spread: 0.3, pierce: false },
  arc: { rate: 600, dmg: 0.75, spd: 400, cnt: 1, spread: 0, pierce: true, isArc: true },
  assault: { rate: 100, dmg: 0.4, spd: 450, cnt: 1, spread: 0, pierce: false, burst: 3, burstDelay: 50 },
  rocket: { rate: 1500, dmg: 2.0, spd: 300, cnt: 1, spread: 0, pierce: false, aoe: 80 },
  shockwave: { rate: 5000, dmg: 1.5, spd: 0, cnt: 1, spread: 0, pierce: false, radius: 150 },
};

const COL = {
  BG: '#000', GREEN: '#00FF00', PLAYER: '#4ade80', ENEMY: '#228B22', BOSS: '#8B0000',
  PROJ: '#FFD700', VIOLET: '#8b5cf6', HP_BG: '#333', HP: '#00FF00', XP_BG: '#333', XP: '#FFD700', GRID: '#003300',
};

export default function MatrixSurvivor() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [mobile, setMobile] = useState(false);
  const [char, setChar] = useState('pax');
  const [highWave, setHighWave] = useState(0);
  const [unlockedChars, setUnlockedChars] = useState(['pax']);
  
  const gameState = useRef({
    pos: { x: 5000, y: 5000 }, vel: { x: 0, y: 0 }, hp: 100, maxHp: 100,
    xp: 0, lvl: 1, atk: 10, spd: 200, wpn: 'pistol',
    hpBonus: 0, atkBonus: 0, spdBonus: 0,
    wave: 1, totalKilled: 0, bossKilled: 0, nextBossAt: CONFIG.ENEMIES_FOR_BOSS,
    cam: { x: 0, y: 0 }, enemies: [], projs: [], chests: [],
    nextEId: 0, nextPId: 0, nextCId: 0, lastFire: 0, lastSpawn: 0,
    additionalWeapons: [], lastWeaponFires: {},
    keys: new Set(), joyActive: false, joyStart: { x: 0, y: 0 },
    joyCur: { x: 0, y: 0 }, joyDir: { x: 0, y: 0 },
    lastTime: 0, frame: 0
  });

  useEffect(() => { setMobile('ontouchstart' in window || navigator.maxTouchPoints > 0); }, []);

  const norm = (p) => {
    let x = p.x, y = p.y;
    if (x < 0) x += CONFIG.MAP; if (x > CONFIG.MAP) x -= CONFIG.MAP;
    if (y < 0) y += CONFIG.MAP; if (y > CONFIG.MAP) y -= CONFIG.MAP;
    return { x, y };
  };

  const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const spawnEnemy = (gs) => {
    const ang = Math.random() * Math.PI * 2, d = 400 + Math.random() * 200;
    gs.enemies.push({
      id: gs.nextEId++, 
      position: norm({ x: gs.pos.x + Math.cos(ang) * d, y: gs.pos.y + Math.sin(ang) * d }),
      health: CONFIG.ENEMY_HP, maxHealth: CONFIG.ENEMY_HP, lastAttack: 0, isBoss: false, damage: CONFIG.ENEMY_DMG,
    });
  };

  const spawnBoss = (gs) => {
    const ang = Math.random() * Math.PI * 2;
    const bossNum = gs.bossKilled + 1;
    gs.enemies.push({
      id: gs.nextEId++, 
      position: norm({ x: gs.pos.x + Math.cos(ang) * 500, y: gs.pos.y + Math.sin(ang) * 500 }),
      health: CONFIG.ENEMY_HP * CONFIG.BOSS_HP * bossNum, 
      maxHealth: CONFIG.ENEMY_HP * CONFIG.BOSS_HP * bossNum,
      lastAttack: 0, isBoss: true, damage: CONFIG.ENEMY_DMG * CONFIG.BOSS_DMG * bossNum,
    });
  };

  const nearest = (gs) => {
    if (!gs.enemies.length) return null;
    let n = gs.enemies[0], min = dist(gs.pos, n.position);
    for (const e of gs.enemies) {
      const d = dist(gs.pos, e.position);
      if (d < min) { min = d; n = e; }
    }
    return n;
  };

  const fire = (gs, t) => {
    const w = WPNS[gs.wpn];
    if (t - gs.lastFire < w.rate) return;
    const tgt = nearest(gs);
    if (!tgt) return;
    gs.lastFire = t;
    const base = Math.atan2(tgt.position.y - gs.pos.y, tgt.position.x - gs.pos.x);
    
    if (w.burst) {
      for (let i = 0; i < w.burst; i++) {
        setTimeout(() => {
          gs.projs.push({
            id: gs.nextPId++, position: { ...gs.pos }, velocity: { x: Math.cos(base) * w.spd, y: Math.sin(base) * w.spd },
            damage: gs.atk * w.dmg, piercing: w.pierce, hitEnemies: new Set(), color: COL.PROJ,
            aoe: w.aoe, isRocket: false, isArc: w.isArc || false,
          });
        }, i * w.burstDelay);
      }
    } else {
      for (let i = 0; i < w.cnt; i++) {
        let ang = base;
        if (w.cnt > 1) ang += (i - (w.cnt - 1) / 2) * w.spread;
        gs.projs.push({
          id: gs.nextPId++, position: { ...gs.pos }, velocity: { x: Math.cos(ang) * w.spd, y: Math.sin(ang) * w.spd },
          damage: gs.atk * w.dmg, piercing: w.pierce, hitEnemies: new Set(), color: gs.wpn === 'arc' ? COL.VIOLET : COL.PROJ,
          aoe: w.aoe, isRocket: gs.wpn === 'rocket', isArc: w.isArc || false,
        });
      }
    }
    
    for (const addWpn of gs.additionalWeapons) {
      const aw = WPNS[addWpn];
      if (!gs.lastWeaponFires[addWpn]) gs.lastWeaponFires[addWpn] = 0;
      if (t - gs.lastWeaponFires[addWpn] < aw.rate) continue;
      
      if (addWpn === 'shockwave') {
        for (const e of gs.enemies) {
          if (dist(gs.pos, e.position) < aw.radius) e.health -= gs.atk * aw.dmg;
        }
        gs.lastWeaponFires[addWpn] = t;
      } else {
        gs.lastWeaponFires[addWpn] = t;
        const tgt2 = nearest(gs);
        if (!tgt2) continue;
        const base2 = Math.atan2(tgt2.position.y - gs.pos.y, tgt2.position.x - gs.pos.x);
        
        if (aw.burst) {
          for (let i = 0; i < aw.burst; i++) {
            setTimeout(() => {
              gs.projs.push({
                id: gs.nextPId++, position: { ...gs.pos }, velocity: { x: Math.cos(base2) * aw.spd, y: Math.sin(base2) * aw.spd },
                damage: gs.atk * aw.dmg, piercing: aw.pierce, hitEnemies: new Set(), 
                color: '#FF6B6B', aoe: aw.aoe, isRocket: false, isArc: false,
              });
            }, i * aw.burstDelay);
          }
        } else {
          for (let i = 0; i < aw.cnt; i++) {
            let ang = base2;
            if (aw.cnt > 1) ang += (i - (aw.cnt - 1) / 2) * aw.spread;
            gs.projs.push({
              id: gs.nextPId++, position: { ...gs.pos }, velocity: { x: Math.cos(ang) * aw.spd, y: Math.sin(ang) * aw.spd },
              damage: gs.atk * aw.dmg, piercing: aw.pierce, hitEnemies: new Set(), 
              color: addWpn === 'rocket' ? '#FFA500' : COL.PROJ,
              aoe: aw.aoe, isRocket: addWpn === 'rocket', isArc: false,
            });
          }
        }
      }
    }
  };

  const applyS = (s) => {
    const gs = gameState.current;
    const c = CHARS[char];
    if (s === 'health') {
      gs.hpBonus += CONFIG.HEALTH_BONUS;
      const newMax = c.hp * (1 + gs.hpBonus), inc = newMax - gs.maxHp;
      gs.maxHp = newMax; gs.hp += inc;
    } else if (s === 'attack') { 
      gs.atkBonus += CONFIG.ATTACK_BONUS; 
      gs.atk = c.atk * (1 + gs.atkBonus); 
    } else { 
      gs.spdBonus += CONFIG.SPEED_BONUS; 
      gs.spd = c.spd * (1 + gs.spdBonus); 
    }
    gs.lastTime = 0; setPhase('playing');
  };

  useEffect(() => {
    const gs = gameState.current;
    const kd = (e) => gs.keys.add(e.key.toLowerCase()), ku = (e) => gs.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const gs = gameState.current;
    const ts = (e) => { const t = e.touches[0]; gs.joyActive = true; gs.joyStart = { x: t.clientX, y: t.clientY }; gs.joyCur = { x: t.clientX, y: t.clientY }; };
    const tm = (e) => {
      if (!gs.joyActive) return; e.preventDefault();
      const t = e.touches[0]; gs.joyCur = { x: t.clientX, y: t.clientY };
      const dx = gs.joyCur.x - gs.joyStart.x, dy = gs.joyCur.y - gs.joyStart.y, d = Math.sqrt(dx * dx + dy * dy);
      gs.joyDir = d > 5 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
    };
    const te = () => { gs.joyActive = false; gs.joyDir = { x: 0, y: 0 }; };
    window.addEventListener('touchstart', ts); window.addEventListener('touchmove', tm, { passive: false }); window.addEventListener('touchend', te);
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); };
  }, [mobile]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (t) => {
      const gs = gameState.current;
      const dt = gs.lastTime ? (t - gs.lastTime) / 1000 : 0;
      gs.lastTime = t;

      let vx = 0, vy = 0;
      if (gs.keys.has('w') || gs.keys.has('arrowup')) vy -= 1;
      if (gs.keys.has('s') || gs.keys.has('arrowdown')) vy += 1;
      if (gs.keys.has('a') || gs.keys.has('arrowleft')) vx -= 1;
      if (gs.keys.has('d') || gs.keys.has('arrowright')) vx += 1;
      if (gs.joyActive) { vx = gs.joyDir.x; vy = gs.joyDir.y; }
      else if (vx && vy) { const l = Math.sqrt(vx * vx + vy * vy); vx /= l; vy /= l; }

      gs.vel = { x: vx * gs.spd, y: vy * gs.spd };
      gs.pos = { x: gs.pos.x + gs.vel.x * dt, y: gs.pos.y + gs.vel.y * dt };
      gs.pos = norm(gs.pos);
      fire(gs, t);

      const spawnRate = Math.max(CONFIG.MIN_SPAWN_RATE, CONFIG.BASE_SPAWN_RATE - (gs.wave - 1) * 100);
      if (t - gs.lastSpawn > spawnRate && gs.enemies.length < 40) {
        spawnEnemy(gs);
        gs.lastSpawn = t;
      }

      gs.projs = gs.projs.filter(p => { p.position.x += p.velocity.x * dt; p.position.y += p.velocity.y * dt; return dist(p.position, gs.pos) < 1000; });

      const espd = CONFIG.ENEMY_SPEED * (1 + (gs.wave - 1) * CONFIG.ENEMY_SPEED_INC);
      for (const e of gs.enemies) {
        const dx = gs.pos.x - e.position.x, dy = gs.pos.y - e.position.y, d = Math.sqrt(dx * dx + dy * dy);
        const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
        if (d > sz) {
          e.position.x += (dx / d) * espd * dt; e.position.y += (dy / d) * espd * dt; e.position = norm(e.position);
          for (const o of gs.enemies) {
            if (e.id === o.id) continue;
            const osz = o.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
            const edx = e.position.x - o.position.x, edy = e.position.y - o.position.y, ed = Math.sqrt(edx * edx + edy * edy);
            const min = (sz + osz) / 2;
            if (ed < min && ed > 0) { const push = (min - ed) / 2; e.position.x += (edx / ed) * push; e.position.y += (edy / ed) * push; e.position = norm(e.position); }
          }
        } else if (t - e.lastAttack > CONFIG.ENEMY_COOLDOWN) { gs.hp -= e.damage; e.lastAttack = t; if (gs.hp <= 0) setPhase('gameover'); }
      }

      for (let i = gs.projs.length - 1; i >= 0; i--) {
        const p = gs.projs[i]; let hitThisFrame = false;
        for (let j = gs.enemies.length - 1; j >= 0; j--) {
          const e = gs.enemies[j];
          if (p.piercing && p.hitEnemies.has(e.id)) continue;
          const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
          if (dist(p.position, e.position) < sz / 2 + (p.aoe || 0)) {
            e.health -= p.damage;
            if (p.isRocket && p.aoe) {
              for (const other of gs.enemies) {
                if (other.id !== e.id && dist(p.position, other.position) < p.aoe) {
                  other.health -= p.damage * 0.5;
                }
              }
            }
            if (p.piercing) p.hitEnemies.add(e.id); else hitThisFrame = true;
            if (e.health <= 0) {
              gs.xp += e.isBoss ? CONFIG.XP_BOSS : CONFIG.XP_ENEMY;
              gs.totalKilled++;
              if (e.isBoss) {
                gs.bossKilled++;
                gs.nextBossAt = gs.totalKilled + CONFIG.ENEMIES_FOR_BOSS;
                gs.chests.push({ id: gs.nextCId++, position: { ...e.position } });
                gs.wave++;
                if (gs.wave > highWave) {
                  const newHigh = gs.wave;
                  setHighWave(newHigh);
                  const newUnlocked = [...unlockedChars];
                  if (newHigh >= 5 && !newUnlocked.includes('lilly')) newUnlocked.push('lilly');
                  if (newHigh >= 7 && !newUnlocked.includes('theOne')) newUnlocked.push('theOne');
                  if (newUnlocked.length > unlockedChars.length) {
                    setUnlockedChars(newUnlocked);
                  }
                }
              }
              gs.enemies.splice(j, 1);
              if (gs.totalKilled >= gs.nextBossAt && !gs.enemies.some(e => e.isBoss)) spawnBoss(gs);
              if (gs.xp >= CONFIG.XP_LEVEL) { gs.xp -= CONFIG.XP_LEVEL; gs.lvl++; setPhase('levelup'); }
            }
            if (!p.piercing) break;
          }
        }
        if (hitThisFrame) gs.projs.splice(i, 1);
      }

      for (let i = gs.chests.length - 1; i >= 0; i--) {
        const chest = gs.chests[i];
        if (dist(gs.pos, chest.position) < 50) {
          gs.chests.splice(i, 1);
          setPhase('weaponselect');
        }
      }

      gs.cam = { x: gs.pos.x - CONFIG.VIEW / 2, y: gs.pos.y - CONFIG.VIEW / 2 };

      ctx.fillStyle = COL.BG; ctx.fillRect(0, 0, CONFIG.VIEW, CONFIG.VIEW);
      ctx.strokeStyle = COL.GRID; ctx.lineWidth = 1;
      const g = 100, sx = Math.floor(gs.cam.x / g) * g, sy = Math.floor(gs.cam.y / g) * g;
      for (let x = sx; x < gs.cam.x + CONFIG.VIEW + g; x += g) { ctx.beginPath(); ctx.moveTo(x - gs.cam.x, 0); ctx.lineTo(x - gs.cam.x, CONFIG.VIEW); ctx.stroke(); }
      for (let y = sy; y < gs.cam.y + CONFIG.VIEW + g; y += g) { ctx.beginPath(); ctx.moveTo(0, y - gs.cam.y); ctx.lineTo(CONFIG.VIEW, y - gs.cam.y); ctx.stroke(); }

      for (const e of gs.enemies) {
        const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
        const ex = e.position.x - gs.cam.x - sz / 2, ey = e.position.y - gs.cam.y - sz / 2;
        ctx.fillStyle = e.isBoss ? COL.BOSS : COL.ENEMY; ctx.fillRect(ex, ey, sz, sz);
        ctx.fillStyle = COL.HP_BG; ctx.fillRect(ex, ey - 8, sz, 4);
        ctx.fillStyle = COL.HP; ctx.fillRect(ex, ey - 8, sz * (e.health / e.maxHealth), 4);
      }

      for (const p of gs.projs) { 
        if (p.isArc) {
          const angle = Math.atan2(p.velocity.y, p.velocity.x);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          const startX = p.position.x - gs.cam.x - Math.cos(angle) * 15;
          const startY = p.position.y - gs.cam.y - Math.sin(angle) * 15;
          const endX = p.position.x - gs.cam.x + Math.cos(angle) * 15;
          const endY = p.position.y - gs.cam.y + Math.sin(angle) * 15;
          const cpX = p.position.x - gs.cam.x + Math.sin(angle) * 10;
          const cpY = p.position.y - gs.cam.y - Math.cos(angle) * 10;
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color; 
          ctx.beginPath(); 
          ctx.arc(p.position.x - gs.cam.x, p.position.y - gs.cam.y, CONFIG.PROJ_SIZE / 2, 0, Math.PI * 2); 
          ctx.fill(); 
        }
      }

      for (const chest of gs.chests) {
        const cx = chest.position.x - gs.cam.x - 20, cy = chest.position.y - gs.cam.y - 20;
        ctx.fillStyle = '#FFD700'; ctx.fillRect(cx, cy, 40, 40);
        ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, 40, 40);
      }

      ctx.fillStyle = COL.PLAYER; ctx.fillRect(CONFIG.VIEW / 2 - CONFIG.PLAYER_SIZE / 2, CONFIG.VIEW / 2 - CONFIG.PLAYER_SIZE / 2, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);

      const pad = 10, bw = 200, bh = 20;
      ctx.fillStyle = COL.HP_BG; ctx.fillRect(pad, pad, bw, bh); ctx.fillStyle = COL.HP; ctx.fillRect(pad, pad, bw * Math.max(0, gs.hp / gs.maxHp), bh);
      ctx.strokeStyle = COL.GREEN; ctx.strokeRect(pad, pad, bw, bh); ctx.fillStyle = COL.GREEN; ctx.font = '12px monospace';
      ctx.fillText(`HP: ${Math.max(0, Math.floor(gs.hp))}/${Math.floor(gs.maxHp)}`, pad + 5, pad + 15);
      ctx.fillStyle = COL.XP_BG; ctx.fillRect(pad, pad + 30, bw, bh); ctx.fillStyle = COL.XP; ctx.fillRect(pad, pad + 30, bw * (gs.xp / CONFIG.XP_LEVEL), bh);
      ctx.strokeStyle = COL.GREEN; ctx.strokeRect(pad, pad + 30, bw, bh);
      ctx.fillText(`XP: ${gs.xp}/${CONFIG.XP_LEVEL}`, pad + 5, pad + 45);
      ctx.fillText(`Level: ${gs.lvl}`, pad, pad + 70); ctx.fillText(`Wave: ${gs.wave}`, pad, pad + 90); ctx.fillText(`Enemies: ${gs.enemies.length}`, pad, pad + 110);

      if (mobile && gs.joyActive) {
        const rect = canvas.getBoundingClientRect();
        const jx = gs.joyStart.x - rect.left, jy = gs.joyStart.y - rect.top;
        const cx = gs.joyCur.x - rect.left, cy = gs.joyCur.y - rect.top;
        ctx.strokeStyle = COL.GREEN; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx, jy, 50, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
      }

      gs.frame = requestAnimationFrame(loop);
    };

    gameState.current.frame = requestAnimationFrame(loop);
    return () => { if (gameState.current.frame) cancelAnimationFrame(gameState.current.frame); };
  }, [phase, highWave, char, mobile, unlockedChars]);

  const start = (cid) => {
    const gs = gameState.current;
    const c = CHARS[cid]; setChar(cid); gs.pos = { x: 5000, y: 5000 };
    gs.hp = c.hp; gs.maxHp = c.hp; gs.xp = 0; gs.lvl = 1;
    gs.atk = c.atk; gs.spd = c.spd; gs.wpn = c.wpn;
    gs.hpBonus = 0; gs.atkBonus = 0; gs.spdBonus = 0;
    gs.wave = 1; gs.totalKilled = 0; gs.bossKilled = 0; gs.nextBossAt = CONFIG.ENEMIES_FOR_BOSS;
    gs.enemies = []; gs.projs = []; gs.chests = []; gs.additionalWeapons = []; gs.lastWeaponFires = {};
    gs.lastTime = 0; gs.lastSpawn = 0;
    for (let i = 0; i < 5; i++) spawnEnemy(gs);
    setPhase('playing');
  };

  const selectWeapon = (wpnId) => {
    gameState.current.additionalWeapons.push(wpnId);
    gameState.current.lastTime = 0;
    setPhase('playing');
  };

  if (phase === 'menu') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: COL.BG, border: `2px solid ${COL.GREEN}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: COL.GREEN }}>
      <h1 style={{ marginBottom: 20, textShadow: '0 0 10px #00FF00' }}>MATRIX SURVIVOR</h1>
      <p style={{ marginBottom: 30, textAlign: 'center', maxWidth: 400 }}>{mobile ? 'Touch and drag to move' : 'Use WASD or Arrow Keys to move'}. Survive waves!</p>
      <button onClick={() => setPhase('charselect')} style={{ padding: '15px 40px', fontSize: 18, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>START</button>
    </div>
  );

  if (phase === 'charselect') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: COL.BG, border: `2px solid ${COL.GREEN}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: COL.GREEN, padding: 20, overflow: 'auto' }}>
      <h2 style={{

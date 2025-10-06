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
  arc: { rate: 600, dmg: 0.75, spd: 400, cnt: 1, spread: 0, pierce: true },
  assault: { rate: 200, dmg: 0.4, spd: 450, cnt: 3, spread: 0.1, pierce: false },
  rocket: { rate: 1500, dmg: 2.0, spd: 300, cnt: 1, spread: 0, pierce: false, aoe: 80 },
  shockwave: { rate: 5000, dmg: 1.5, spd: 0, cnt: 1, spread: 0, pierce: false, radius: 150 },
};

const COL = {
  BG: '#000', GREEN: '#00FF00', PLAYER: '#4ade80', ENEMY: '#228B22', BOSS: '#8B0000',
  PROJ: '#FFD700', VIOLET: '#8b5cf6', HP_BG: '#333', HP: '#00FF00', XP_BG: '#333', XP: '#FFD700', GRID: '#003300',
};

const MatrixSurvivor = () => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [mobile, setMobile] = useState(false);
  const [char, setChar] = useState('pax');
  const [highWave, setHighWave] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('matrixSurvivorHighWave');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [unlockedChars, setUnlockedChars] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('matrixSurvivorUnlocked');
      const unlocked = saved ? JSON.parse(saved) : ['pax'];
      if (!unlocked.includes('pax')) unlocked.push('pax');
      return unlocked;
    }
    return ['pax'];
  });
  
  const pos = useRef({ x: 5000, y: 5000 }), vel = useRef({ x: 0, y: 0 }), hp = useRef(100), maxHp = useRef(100);
  const xp = useRef(0), lvl = useRef(1), atk = useRef(10), spd = useRef(200), wpn = useRef('pistol');
  const hpBonus = useRef(0), atkBonus = useRef(0), spdBonus = useRef(0);
  const wave = useRef(1), totalKilled = useRef(0), bossKilled = useRef(0), nextBossAt = useRef(CONFIG.ENEMIES_FOR_BOSS);
  const cam = useRef({ x: 0, y: 0 }), enemies = useRef([]), projs = useRef([]), chests = useRef([]);
  const nextEId = useRef(0), nextPId = useRef(0), nextCId = useRef(0), lastFire = useRef(0), lastSpawn = useRef(0);
  const additionalWeapons = useRef([]);
  const lastWeaponFires = useRef({});
  const keys = useRef(new Set()), joyActive = useRef(false), joyStart = useRef({ x: 0, y: 0 });
  const joyCur = useRef({ x: 0, y: 0 }), joyDir = useRef({ x: 0, y: 0 });
  const lastTime = useRef(0), frame = useRef(0);

  useEffect(() => { setMobile('ontouchstart' in window || navigator.maxTouchPoints > 0); }, []);

  const norm = (p) => {
    let x = p.x, y = p.y;
    if (x < 0) x += CONFIG.MAP; if (x > CONFIG.MAP) x -= CONFIG.MAP;
    if (y < 0) y += CONFIG.MAP; if (y > CONFIG.MAP) y -= CONFIG.MAP;
    return { x, y };
  };

  const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const spawnEnemy = () => {
    const ang = Math.random() * Math.PI * 2, d = 400 + Math.random() * 200;
    enemies.current.push({
      id: nextEId.current++, 
      position: norm({ x: pos.current.x + Math.cos(ang) * d, y: pos.current.y + Math.sin(ang) * d }),
      health: CONFIG.ENEMY_HP, maxHealth: CONFIG.ENEMY_HP, lastAttack: 0, isBoss: false, damage: CONFIG.ENEMY_DMG,
    });
  };

  const spawnBoss = () => {
    const ang = Math.random() * Math.PI * 2;
    const bossNum = bossKilled.current + 1;
    enemies.current.push({
      id: nextEId.current++, 
      position: norm({ x: pos.current.x + Math.cos(ang) * 500, y: pos.current.y + Math.sin(ang) * 500 }),
      health: CONFIG.ENEMY_HP * CONFIG.BOSS_HP * bossNum, 
      maxHealth: CONFIG.ENEMY_HP * CONFIG.BOSS_HP * bossNum,
      lastAttack: 0, isBoss: true, damage: CONFIG.ENEMY_DMG * CONFIG.BOSS_DMG * bossNum,
    });
  };

  const nearest = () => {
    if (!enemies.current.length) return null;
    let n = enemies.current[0], min = dist(pos.current, n.position);
    for (const e of enemies.current) {
      const d = dist(pos.current, e.position);
      if (d < min) { min = d; n = e; }
    }
    return n;
  };

  const fire = (t) => {
    const w = WPNS[wpn.current];
    if (t - lastFire.current < w.rate) return;
    const tgt = nearest();
    if (!tgt) return;
    lastFire.current = t;
    const base = Math.atan2(tgt.position.y - pos.current.y, tgt.position.x - pos.current.x);
    for (let i = 0; i < w.cnt; i++) {
      let ang = base;
      if (w.cnt > 1) ang += (i - (w.cnt - 1) / 2) * w.spread;
      projs.current.push({
        id: nextPId.current++, position: { ...pos.current }, velocity: { x: Math.cos(ang) * w.spd, y: Math.sin(ang) * w.spd },
        damage: atk.current * w.dmg, piercing: w.pierce, hitEnemies: new Set(), color: wpn.current === 'arc' ? COL.VIOLET : COL.PROJ,
        aoe: w.aoe, isRocket: wpn.current === 'rocket',
      });
    }
    
    // Fire additional weapons
    for (const addWpn of additionalWeapons.current) {
      const aw = WPNS[addWpn];
      if (!lastWeaponFires.current[addWpn]) lastWeaponFires.current[addWpn] = 0;
      if (t - lastWeaponFires.current[addWpn] < aw.rate) continue;
      
      if (addWpn === 'shockwave') {
        // Shockwave damages all nearby enemies
        for (const e of enemies.current) {
          if (dist(pos.current, e.position) < aw.radius) {
            e.health -= atk.current * aw.dmg;
          }
        }
        lastWeaponFires.current[addWpn] = t;
      } else {
        lastWeaponFires.current[addWpn] = t;
        const tgt2 = nearest();
        if (!tgt2) continue;
        const base2 = Math.atan2(tgt2.position.y - pos.current.y, tgt2.position.x - pos.current.x);
        for (let i = 0; i < aw.cnt; i++) {
          let ang = base2;
          if (aw.cnt > 1) ang += (i - (aw.cnt - 1) / 2) * aw.spread;
          projs.current.push({
            id: nextPId.current++, position: { ...pos.current }, velocity: { x: Math.cos(ang) * aw.spd, y: Math.sin(ang) * aw.spd },
            damage: atk.current * aw.dmg, piercing: aw.pierce, hitEnemies: new Set(), 
            color: addWpn === 'assault' ? '#FF6B6B' : addWpn === 'rocket' ? '#FFA500' : COL.PROJ,
            aoe: aw.aoe, isRocket: addWpn === 'rocket',
          });
        }
      }
    }
  };

  const applyS = (s) => {
    const c = CHARS[char];
    if (s === 'health') {
      hpBonus.current += CONFIG.HEALTH_BONUS;
      const newMax = c.hp * (1 + hpBonus.current), inc = newMax - maxHp.current;
      maxHp.current = newMax; hp.current += inc;
    } else if (s === 'attack') { 
      atkBonus.current += CONFIG.ATTACK_BONUS; 
      atk.current = c.atk * (1 + atkBonus.current); 
    } else { 
      spdBonus.current += CONFIG.SPEED_BONUS; 
      spd.current = c.spd * (1 + spdBonus.current); 
    }
    lastTime.current = 0; setPhase('playing');
  };

  useEffect(() => {
    const kd = (e) => keys.current.add(e.key.toLowerCase()), ku = (e) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const ts = (e) => { const t = e.touches[0]; joyActive.current = true; joyStart.current = { x: t.clientX, y: t.clientY }; joyCur.current = { x: t.clientX, y: t.clientY }; };
    const tm = (e) => {
      if (!joyActive.current) return; e.preventDefault();
      const t = e.touches[0]; joyCur.current = { x: t.clientX, y: t.clientY };
      const dx = joyCur.current.x - joyStart.current.x, dy = joyCur.current.y - joyStart.current.y, d = Math.sqrt(dx * dx + dy * dy);
      joyDir.current = d > 5 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
    };
    const te = () => { joyActive.current = false; joyDir.current = { x: 0, y: 0 }; };
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
      const dt = lastTime.current ? (t - lastTime.current) / 1000 : 0;
      lastTime.current = t;

      let vx = 0, vy = 0;
      if (keys.current.has('w') || keys.current.has('arrowup')) vy -= 1;
      if (keys.current.has('s') || keys.current.has('arrowdown')) vy += 1;
      if (keys.current.has('a') || keys.current.has('arrowleft')) vx -= 1;
      if (keys.current.has('d') || keys.current.has('arrowright')) vx += 1;
      if (joyActive.current) { vx = joyDir.current.x; vy = joyDir.current.y; }
      else if (vx && vy) { const l = Math.sqrt(vx * vx + vy * vy); vx /= l; vy /= l; }

      vel.current = { x: vx * spd.current, y: vy * spd.current };
      pos.current = { x: pos.current.x + vel.current.x * dt, y: pos.current.y + vel.current.y * dt };
      pos.current = norm(pos.current);
      fire(t);

      const spawnRate = Math.max(CONFIG.MIN_SPAWN_RATE, CONFIG.BASE_SPAWN_RATE - (wave.current - 1) * 100);
      if (t - lastSpawn.current > spawnRate && enemies.current.length < 40) {
        spawnEnemy();
        lastSpawn.current = t;
      }

      projs.current = projs.current.filter(p => { p.position.x += p.velocity.x * dt; p.position.y += p.velocity.y * dt; return dist(p.position, pos.current) < 1000; });

      const espd = CONFIG.ENEMY_SPEED * (1 + (wave.current - 1) * CONFIG.ENEMY_SPEED_INC);
      for (const e of enemies.current) {
        const dx = pos.current.x - e.position.x, dy = pos.current.y - e.position.y, d = Math.sqrt(dx * dx + dy * dy);
        const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
        if (d > sz) {
          e.position.x += (dx / d) * espd * dt; e.position.y += (dy / d) * espd * dt; e.position = norm(e.position);
          for (const o of enemies.current) {
            if (e.id === o.id) continue;
            const osz = o.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
            const edx = e.position.x - o.position.x, edy = e.position.y - o.position.y, ed = Math.sqrt(edx * edx + edy * edy);
            const min = (sz + osz) / 2;
            if (ed < min && ed > 0) { const push = (min - ed) / 2; e.position.x += (edx / ed) * push; e.position.y += (edy / ed) * push; e.position = norm(e.position); }
          }
        } else if (t - e.lastAttack > CONFIG.ENEMY_COOLDOWN) { hp.current -= e.damage; e.lastAttack = t; if (hp.current <= 0) setPhase('gameover'); }
      }

      for (let i = projs.current.length - 1; i >= 0; i--) {
        const p = projs.current[i]; let hitThisFrame = false;
        for (let j = enemies.current.length - 1; j >= 0; j--) {
          const e = enemies.current[j];
          if (p.piercing && p.hitEnemies.has(e.id)) continue;
          const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
          if (dist(p.position, e.position) < sz / 2 + (p.aoe || 0)) {
            e.health -= p.damage;
            if (p.isRocket && p.aoe) {
              // Rocket AOE damage to nearby enemies
              for (const other of enemies.current) {
                if (other.id !== e.id && dist(p.position, other.position) < p.aoe) {
                  other.health -= p.damage * 0.5;
                }
              }
            }
            if (p.piercing) p.hitEnemies.add(e.id); else hitThisFrame = true;
            if (e.health <= 0) {
              xp.current += e.isBoss ? CONFIG.XP_BOSS : CONFIG.XP_ENEMY;
              totalKilled.current++;
              if (e.isBoss) {
                bossKilled.current++;
                nextBossAt.current = totalKilled.current + CONFIG.ENEMIES_FOR_BOSS;
                // Spawn chest at boss location
                chests.current.push({ id: nextCId.current++, position: { ...e.position } });
                wave.current++;
                if (wave.current > highWave) {
                  const newHigh = wave.current;
                  setHighWave(newHigh);
                  if (typeof window !== 'undefined') localStorage.setItem('matrixSurvivorHighWave', newHigh.toString());
                  const newUnlocked = [...unlockedChars];
                  if (newHigh >= 5 && !newUnlocked.includes('lilly')) newUnlocked.push('lilly');
                  if (newHigh >= 7 && !newUnlocked.includes('theOne')) newUnlocked.push('theOne');
                  if (newUnlocked.length > unlockedChars.length) {
                    setUnlockedChars(newUnlocked);
                    if (typeof window !== 'undefined') localStorage.setItem('matrixSurvivorUnlocked', JSON.stringify(newUnlocked));
                  }
                }
              }
              enemies.current.splice(j, 1);
              if (totalKilled.current >= nextBossAt.current && !enemies.current.some(e => e.isBoss)) spawnBoss();
              if (xp.current >= CONFIG.XP_LEVEL) { xp.current -= CONFIG.XP_LEVEL; lvl.current++; setPhase('levelup'); }
            }
            if (!p.piercing) break;
          }
        }
        if (hitThisFrame) projs.current.splice(i, 1);
      }

      // Check chest pickup
      for (let i = chests.current.length - 1; i >= 0; i--) {
        const chest = chests.current[i];
        if (dist(pos.current, chest.position) < 50) {
          chests.current.splice(i, 1);
          setPhase('weaponselect');
        }
      }

      cam.current = { x: pos.current.x - CONFIG.VIEW / 2, y: pos.current.y - CONFIG.VIEW / 2 };

      ctx.fillStyle = COL.BG; ctx.fillRect(0, 0, CONFIG.VIEW, CONFIG.VIEW);
      ctx.strokeStyle = COL.GRID; ctx.lineWidth = 1;
      const g = 100, sx = Math.floor(cam.current.x / g) * g, sy = Math.floor(cam.current.y / g) * g;
      for (let x = sx; x < cam.current.x + CONFIG.VIEW + g; x += g) { ctx.beginPath(); ctx.moveTo(x - cam.current.x, 0); ctx.lineTo(x - cam.current.x, CONFIG.VIEW); ctx.stroke(); }
      for (let y = sy; y < cam.current.y + CONFIG.VIEW + g; y += g) { ctx.beginPath(); ctx.moveTo(0, y - cam.current.y); ctx.lineTo(CONFIG.VIEW, y - cam.current.y); ctx.stroke(); }

      for (const e of enemies.current) {
        const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
        const ex = e.position.x - cam.current.x - sz / 2, ey = e.position.y - cam.current.y - sz / 2;
        ctx.fillStyle = e.isBoss ? COL.BOSS : COL.ENEMY; ctx.fillRect(ex, ey, sz, sz);
        ctx.fillStyle = COL.HP_BG; ctx.fillRect(ex, ey - 8, sz, 4);
        ctx.fillStyle = COL.HP; ctx.fillRect(ex, ey - 8, sz * (e.health / e.maxHealth), 4);
      }

      for (const p of projs.current) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.position.x - cam.current.x, p.position.y - cam.current.y, CONFIG.PROJ_SIZE / 2, 0, Math.PI * 2); ctx.fill(); }

      // Draw chests
      for (const chest of chests.current) {
        const cx = chest.position.x - cam.current.x - 20, cy = chest.position.y - cam.current.y - 20;
        ctx.fillStyle = '#FFD700'; ctx.fillRect(cx, cy, 40, 40);
        ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, 40, 40);
      }

      ctx.fillStyle = COL.PLAYER; ctx.fillRect(CONFIG.VIEW / 2 - CONFIG.PLAYER_SIZE / 2, CONFIG.VIEW / 2 - CONFIG.PLAYER_SIZE / 2, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);

      const pad = 10, bw = 200, bh = 20;
      ctx.fillStyle = COL.HP_BG; ctx.fillRect(pad, pad, bw, bh); ctx.fillStyle = COL.HP; ctx.fillRect(pad, pad, bw * Math.max(0, hp.current / maxHp.current), bh);
      ctx.strokeStyle = COL.GREEN; ctx.strokeRect(pad, pad, bw, bh); ctx.fillStyle = COL.GREEN; ctx.font = '12px monospace';
      ctx.fillText(`HP: ${Math.max(0, Math.floor(hp.current))}/${Math.floor(maxHp.current)}`, pad + 5, pad + 15);
      ctx.fillStyle = COL.XP_BG; ctx.fillRect(pad, pad + 30, bw, bh); ctx.fillStyle = COL.XP; ctx.fillRect(pad, pad + 30, bw * (xp.current / CONFIG.XP_LEVEL), bh);
      ctx.strokeStyle = COL.GREEN; ctx.strokeRect(pad, pad + 30, bw, bh);
      ctx.fillText(`XP: ${xp.current}/${CONFIG.XP_LEVEL}`, pad + 5, pad + 45);
      ctx.fillText(`Level: ${lvl.current}`, pad, pad + 70); ctx.fillText(`Wave: ${wave.current}`, pad, pad + 90); ctx.fillText(`Enemies: ${enemies.current.length}`, pad, pad + 110);

      if (mobile && joyActive.current) {
        const rect = canvas.getBoundingClientRect();
        const jx = joyStart.current.x - rect.left, jy = joyStart.current.y - rect.top;
        const cx = joyCur.current.x - rect.left, cy = joyCur.current.y - rect.top;
        ctx.strokeStyle = COL.GREEN; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx, jy, 50, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
      }

      frame.current = requestAnimationFrame(loop);
    };

    frame.current = requestAnimationFrame(loop);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [phase, highWave, char, mobile, unlockedChars]);

  const start = (cid) => {
    const c = CHARS[cid]; setChar(cid); pos.current = { x: 5000, y: 5000 };
    hp.current = c.hp; maxHp.current = c.hp; xp.current = 0; lvl.current = 1;
    atk.current = c.atk; spd.current = c.spd; wpn.current = c.wpn;
    hpBonus.current = 0; atkBonus.current = 0; spdBonus.current = 0;
    wave.current = 1; totalKilled.current = 0; bossKilled.current = 0; nextBossAt.current = CONFIG.ENEMIES_FOR_BOSS;
    enemies.current = []; projs.current = []; chests.current = []; additionalWeapons.current = []; lastWeaponFires.current = {};
    lastTime.current = 0; lastSpawn.current = 0;
    for (let i = 0; i < 5; i++) spawnEnemy();
    setPhase('playing');
  };

  const selectWeapon = (wpnId) => {
    additionalWeapons.current.push(wpnId);
    lastTime.current = 0;
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
      <h2 style={{ marginBottom: 30, textShadow: '0 0 10px #00FF00' }}>SELECT CHARACTER</h2>
      <div style={{ display: 'flex', gap: 20, flexDirection: mobile ? 'column' : 'row', width: '100%', justifyContent: 'center' }}>
        {Object.values(CHARS).map(c => {
          const lock = !unlockedChars.includes(c.id);
          return (
            <div key={c.id} onClick={() => !lock && start(c.id)} style={{ padding: 20, border: `2px solid ${lock ? '#666' : COL.GREEN}`, backgroundColor: lock ? 'rgba(100,100,100,0.1)' : 'rgba(34,197,94,0.1)', cursor: lock ? 'not-allowed' : 'pointer', opacity: lock ? 0.5 : 1, flex: 1, maxWidth: 200 }}>
              <h3 style={{ marginBottom: 15, color: lock ? '#666' : COL.GREEN }}>{c.name}</h3>
              {lock && <div style={{ marginBottom: 10, fontSize: 12, color: '#999' }}>Unlock at Wave {c.unlock}</div>}
              <div style={{ fontSize: 14, marginBottom: 5 }}>HP: {c.hp}</div>
              <div style={{ fontSize: 14, marginBottom: 5 }}>Speed: {c.spd}</div>
              <div style={{ fontSize: 14, marginBottom: 5 }}>Attack: {c.atk}</div>
              <div style={{ fontSize: 14, marginTop: 10, color: '#86efac' }}>Weapon: {c.wpn.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setPhase('menu')} style={{ marginTop: 30, padding: '10px 30px', backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>BACK</button>
    </div>
  );

  if (phase === 'levelup') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: 'rgba(0,0,0,0.9)', border: `2px solid ${COL.GREEN}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: COL.GREEN }}>
      <h2 style={{ marginBottom: 30, textShadow: '0 0 10px #00FF00' }}>LEVEL UP!</h2>
      <p style={{ marginBottom: 40 }}>Choose a stat to improve:</p>
      <div style={{ display: 'flex', gap: 20, flexDirection: mobile ? 'column' : 'row' }}>
        {[
          { s: 'health', label: 'HEALTH', desc: 'Max HP +7%' },
          { s: 'attack', label: 'ATTACK', desc: 'Damage +8%' },
          { s: 'speed', label: 'SPEED', desc: 'Speed +2%' },
        ].map(({ s, label, desc }) => (
          <button key={s} onClick={() => applyS(s)} style={{ padding: '20px 30px', fontSize: 16, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (phase === 'weaponselect') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: 'rgba(0,0,0,0.9)', border: `2px solid ${COL.GREEN}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: COL.GREEN }}>
      <h2 style={{ marginBottom: 30, textShadow: '0 0 10px #00FF00' }}>WEAPON CHEST!</h2>
      <p style={{ marginBottom: 40 }}>Choose a weapon to add:</p>
      <div style={{ display: 'flex', gap: 20, flexDirection: mobile ? 'column' : 'row' }}>
        {[
          { id: 'assault', name: 'ASSAULT RIFLE', desc: '3-round burst, fast fire' },
          { id: 'rocket', name: 'ROCKET LAUNCHER', desc: 'AOE explosion damage' },
          { id: 'shockwave', name: 'SHOCKWAVE', desc: 'Electric pulse every 5s' },
        ].map(({ id, name, desc }) => (
          <button key={id} onClick={() => selectWeapon(id)} style={{ padding: '20px 30px', fontSize: 16, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace', minWidth: 200 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (phase === 'gameover') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: 'rgba(0,0,0,0.9)', border: '2px solid #DC143C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#DC143C' }}>
      <h1 style={{ marginBottom: 20, textShadow: '0 0 10px #DC143C' }}>GAME OVER</h1>
      <div style={{ marginBottom: 40, textAlign: 'center', color: COL.GREEN }}>
        <p>Wave Reached: {wave.current}</p><p>Final Level: {lvl.current}</p>
        {wave.current >= 5 && highWave >= 5 && <p style={{ color: '#FFD700', marginTop: 10 }}>Lilly Unlocked!</p>}
        {wave.current >= 7 && highWave >= 7 && <p style={{ color: '#8b5cf6', marginTop: 10 }}>The One Unlocked!</p>}
      </div>
      <div style={{ display: 'flex', gap: 15, flexDirection: mobile ? 'column' : 'row' }}>
        <button onClick={() => start(char)} style={{ padding: '15px 40px', fontSize: 18, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>RESTART</button>
        <button onClick={() => setPhase('charselect')} style={{ padding: '15px 40px', fontSize: 18, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>CHANGE CHARACTER</button>
      </div>
    </div>
  );

  return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, border: `2px solid ${COL.GREEN}`, position: 'relative' }}>
      <canvas ref={canvasRef} width={CONFIG.VIEW} height={CONFIG.VIEW} style={{ display: 'block', touchAction: 'none' }} />
    </div>
  );
};

export default MatrixSurvivor;    let x = p.x, y = p.y;
    if (x < 0) x += CONFIG.MAP; if (x > CONFIG.MAP) x -= CONFIG.MAP;
    if (y < 0) y += CONFIG.MAP; if (y > CONFIG.MAP) y -= CONFIG.MAP;
    return { x, y };
  };

  const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const spawnEnemy = () => {
    const ang = Math.random() * Math.PI * 2, d = 400 + Math.random() * 200;
    enemies.current.push({
      id: nextEId.current++, 
      position: norm({ x: pos.current.x + Math.cos(ang) * d, y: pos.current.y + Math.sin(ang) * d }),
      health: CONFIG.ENEMY_HP, maxHealth: CONFIG.ENEMY_HP, lastAttack: 0, isBoss: false, damage: CONFIG.ENEMY_DMG,
    });
  };

  const spawnBoss = () => {
    const ang = Math.random() * Math.PI * 2;
    const bossNum = bossKilled.current + 1;
    enemies.current.push({
      id: nextEId.current++, 
      position: norm({ x: pos.current.x + Math.cos(ang) * 500, y: pos.current.y + Math.sin(ang) * 500 }),
      health: CONFIG.ENEMY_HP * CONFIG.BOSS_HP * bossNum, 
      maxHealth: CONFIG.ENEMY_HP * CONFIG.BOSS_HP * bossNum,
      lastAttack: 0, isBoss: true, damage: CONFIG.ENEMY_DMG * CONFIG.BOSS_DMG * bossNum,
    });
  };

  const nearest = () => {
    if (!enemies.current.length) return null;
    let n = enemies.current[0], min = dist(pos.current, n.position);
    for (const e of enemies.current) {
      const d = dist(pos.current, e.position);
      if (d < min) { min = d; n = e; }
    }
    return n;
  };

  const fire = (t) => {
    const w = WPNS[wpn.current];
    if (t - lastFire.current < w.rate) return;
    const tgt = nearest();
    if (!tgt) return;
    lastFire.current = t;
    const base = Math.atan2(tgt.position.y - pos.current.y, tgt.position.x - pos.current.x);
    for (let i = 0; i < w.cnt; i++) {
      let ang = base;
      if (w.cnt > 1) ang += (i - (w.cnt - 1) / 2) * w.spread;
      projs.current.push({
        id: nextPId.current++, position: { ...pos.current }, velocity: { x: Math.cos(ang) * w.spd, y: Math.sin(ang) * w.spd },
        damage: atk.current * w.dmg, piercing: w.pierce, hitEnemies: new Set(), color: wpn.current === 'arc' ? COL.VIOLET : COL.PROJ,
      });
    }
  };

  const applyS = (s) => {
    const c = CHARS[char];
    if (s === 'health') {
      hpBonus.current += CONFIG.HEALTH_BONUS;
      const newMax = c.hp * (1 + hpBonus.current), inc = newMax - maxHp.current;
      maxHp.current = newMax; hp.current += inc;
    } else if (s === 'attack') { 
      atkBonus.current += CONFIG.ATTACK_BONUS; 
      atk.current = c.atk * (1 + atkBonus.current); 
    } else { 
      spdBonus.current += CONFIG.SPEED_BONUS; 
      spd.current = c.spd * (1 + spdBonus.current); 
    }
    lastTime.current = 0; setPhase('playing');
  };

  useEffect(() => {
    const kd = (e) => keys.current.add(e.key.toLowerCase()), ku = (e) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const ts = (e) => { const t = e.touches[0]; joyActive.current = true; joyStart.current = { x: t.clientX, y: t.clientY }; joyCur.current = { x: t.clientX, y: t.clientY }; };
    const tm = (e) => {
      if (!joyActive.current) return; e.preventDefault();
      const t = e.touches[0]; joyCur.current = { x: t.clientX, y: t.clientY };
      const dx = joyCur.current.x - joyStart.current.x, dy = joyCur.current.y - joyStart.current.y, d = Math.sqrt(dx * dx + dy * dy);
      joyDir.current = d > 5 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
    };
    const te = () => { joyActive.current = false; joyDir.current = { x: 0, y: 0 }; };
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
      const dt = lastTime.current ? (t - lastTime.current) / 1000 : 0;
      lastTime.current = t;

      let vx = 0, vy = 0;
      if (keys.current.has('w') || keys.current.has('arrowup')) vy -= 1;
      if (keys.current.has('s') || keys.current.has('arrowdown')) vy += 1;
      if (keys.current.has('a') || keys.current.has('arrowleft')) vx -= 1;
      if (keys.current.has('d') || keys.current.has('arrowright')) vx += 1;
      if (joyActive.current) { vx = joyDir.current.x; vy = joyDir.current.y; }
      else if (vx && vy) { const l = Math.sqrt(vx * vx + vy * vy); vx /= l; vy /= l; }

      vel.current = { x: vx * spd.current, y: vy * spd.current };
      pos.current = { x: pos.current.x + vel.current.x * dt, y: pos.current.y + vel.current.y * dt };
      pos.current = norm(pos.current);
      fire(t);

      const spawnRate = Math.max(CONFIG.MIN_SPAWN_RATE, CONFIG.BASE_SPAWN_RATE - (wave.current - 1) * 100);
      if (t - lastSpawn.current > spawnRate && enemies.current.length < 40) {
        spawnEnemy();
        lastSpawn.current = t;
      }

      projs.current = projs.current.filter(p => { p.position.x += p.velocity.x * dt; p.position.y += p.velocity.y * dt; return dist(p.position, pos.current) < 1000; });

      const espd = CONFIG.ENEMY_SPEED * (1 + (wave.current - 1) * CONFIG.ENEMY_SPEED_INC);
      for (const e of enemies.current) {
        const dx = pos.current.x - e.position.x, dy = pos.current.y - e.position.y, d = Math.sqrt(dx * dx + dy * dy);
        const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
        if (d > sz) {
          e.position.x += (dx / d) * espd * dt; e.position.y += (dy / d) * espd * dt; e.position = norm(e.position);
          for (const o of enemies.current) {
            if (e.id === o.id) continue;
            const osz = o.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
            const edx = e.position.x - o.position.x, edy = e.position.y - o.position.y, ed = Math.sqrt(edx * edx + edy * edy);
            const min = (sz + osz) / 2;
            if (ed < min && ed > 0) { const push = (min - ed) / 2; e.position.x += (edx / ed) * push; e.position.y += (edy / ed) * push; e.position = norm(e.position); }
          }
        } else if (t - e.lastAttack > CONFIG.ENEMY_COOLDOWN) { hp.current -= e.damage; e.lastAttack = t; if (hp.current <= 0) setPhase('gameover'); }
      }

      for (let i = projs.current.length - 1; i >= 0; i--) {
        const p = projs.current[i]; let hitThisFrame = false;
        for (let j = enemies.current.length - 1; j >= 0; j--) {
          const e = enemies.current[j];
          if (p.piercing && p.hitEnemies.has(e.id)) continue;
          const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
          if (dist(p.position, e.position) < sz / 2) {
            e.health -= p.damage;
            if (p.piercing) p.hitEnemies.add(e.id); else hitThisFrame = true;
            if (e.health <= 0) {
              xp.current += e.isBoss ? CONFIG.XP_BOSS : CONFIG.XP_ENEMY;
              totalKilled.current++;
              if (e.isBoss) {
                bossKilled.current++;
                nextBossAt.current = totalKilled.current + CONFIG.ENEMIES_FOR_BOSS;
                wave.current++;
                if (wave.current > highWave) {
                  const newHigh = wave.current;
                  setHighWave(newHigh);
                  if (typeof window !== 'undefined') localStorage.setItem('matrixSurvivorHighWave', newHigh.toString());
                  const newUnlocked = [...unlockedChars];
                  if (newHigh >= 5 && !newUnlocked.includes('lilly')) newUnlocked.push('lilly');
                  if (newHigh >= 7 && !newUnlocked.includes('theOne')) newUnlocked.push('theOne');
                  if (newUnlocked.length > unlockedChars.length) {
                    setUnlockedChars(newUnlocked);
                    if (typeof window !== 'undefined') localStorage.setItem('matrixSurvivorUnlocked', JSON.stringify(newUnlocked));
                  }
                }
              }
              enemies.current.splice(j, 1);
              if (totalKilled.current >= nextBossAt.current && !enemies.current.some(e => e.isBoss)) spawnBoss();
              if (xp.current >= CONFIG.XP_LEVEL) { xp.current -= CONFIG.XP_LEVEL; lvl.current++; setPhase('levelup'); }
            }
            if (!p.piercing) break;
          }
        }
        if (hitThisFrame) projs.current.splice(i, 1);
      }

      cam.current = { x: pos.current.x - CONFIG.VIEW / 2, y: pos.current.y - CONFIG.VIEW / 2 };

      ctx.fillStyle = COL.BG; ctx.fillRect(0, 0, CONFIG.VIEW, CONFIG.VIEW);
      ctx.strokeStyle = COL.GRID; ctx.lineWidth = 1;
      const g = 100, sx = Math.floor(cam.current.x / g) * g, sy = Math.floor(cam.current.y / g) * g;
      for (let x = sx; x < cam.current.x + CONFIG.VIEW + g; x += g) { ctx.beginPath(); ctx.moveTo(x - cam.current.x, 0); ctx.lineTo(x - cam.current.x, CONFIG.VIEW); ctx.stroke(); }
      for (let y = sy; y < cam.current.y + CONFIG.VIEW + g; y += g) { ctx.beginPath(); ctx.moveTo(0, y - cam.current.y); ctx.lineTo(CONFIG.VIEW, y - cam.current.y); ctx.stroke(); }

      for (const e of enemies.current) {
        const sz = e.isBoss ? CONFIG.ENEMY_SIZE * CONFIG.BOSS_SIZE : CONFIG.ENEMY_SIZE;
        const ex = e.position.x - cam.current.x - sz / 2, ey = e.position.y - cam.current.y - sz / 2;
        ctx.fillStyle = e.isBoss ? COL.BOSS : COL.ENEMY; ctx.fillRect(ex, ey, sz, sz);
        ctx.fillStyle = COL.HP_BG; ctx.fillRect(ex, ey - 8, sz, 4);
        ctx.fillStyle = COL.HP; ctx.fillRect(ex, ey - 8, sz * (e.health / e.maxHealth), 4);
      }

      for (const p of projs.current) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.position.x - cam.current.x, p.position.y - cam.current.y, CONFIG.PROJ_SIZE / 2, 0, Math.PI * 2); ctx.fill(); }

      ctx.fillStyle = COL.PLAYER; ctx.fillRect(CONFIG.VIEW / 2 - CONFIG.PLAYER_SIZE / 2, CONFIG.VIEW / 2 - CONFIG.PLAYER_SIZE / 2, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);

      const pad = 10, bw = 200, bh = 20;
      ctx.fillStyle = COL.HP_BG; ctx.fillRect(pad, pad, bw, bh); ctx.fillStyle = COL.HP; ctx.fillRect(pad, pad, bw * Math.max(0, hp.current / maxHp.current), bh);
      ctx.strokeStyle = COL.GREEN; ctx.strokeRect(pad, pad, bw, bh); ctx.fillStyle = COL.GREEN; ctx.font = '12px monospace';
      ctx.fillText(`HP: ${Math.max(0, Math.floor(hp.current))}/${Math.floor(maxHp.current)}`, pad + 5, pad + 15);
      ctx.fillStyle = COL.XP_BG; ctx.fillRect(pad, pad + 30, bw, bh); ctx.fillStyle = COL.XP; ctx.fillRect(pad, pad + 30, bw * (xp.current / CONFIG.XP_LEVEL), bh);
      ctx.strokeStyle = COL.GREEN; ctx.strokeRect(pad, pad + 30, bw, bh);
      ctx.fillText(`XP: ${xp.current}/${CONFIG.XP_LEVEL}`, pad + 5, pad + 45);
      ctx.fillText(`Level: ${lvl.current}`, pad, pad + 70); ctx.fillText(`Wave: ${wave.current}`, pad, pad + 90); ctx.fillText(`Enemies: ${enemies.current.length}`, pad, pad + 110);

      if (mobile && joyActive.current) {
        const rect = canvas.getBoundingClientRect();
        const jx = joyStart.current.x - rect.left, jy = joyStart.current.y - rect.top;
        const cx = joyCur.current.x - rect.left, cy = joyCur.current.y - rect.top;
        ctx.strokeStyle = COL.GREEN; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx, jy, 50, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
      }

      frame.current = requestAnimationFrame(loop);
    };

    frame.current = requestAnimationFrame(loop);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [phase, highWave, char, mobile, unlockedChars]);

  const start = (cid) => {
    const c = CHARS[cid]; setChar(cid); pos.current = { x: 5000, y: 5000 };
    hp.current = c.hp; maxHp.current = c.hp; xp.current = 0; lvl.current = 1;
    atk.current = c.atk; spd.current = c.spd; wpn.current = c.wpn;
    hpBonus.current = 0; atkBonus.current = 0; spdBonus.current = 0;
    wave.current = 1; totalKilled.current = 0; bossKilled.current = 0; nextBossAt.current = CONFIG.ENEMIES_FOR_BOSS;
    enemies.current = []; projs.current = []; lastTime.current = 0; lastSpawn.current = 0;
    for (let i = 0; i < 5; i++) spawnEnemy();
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
      <h2 style={{ marginBottom: 30, textShadow: '0 0 10px #00FF00' }}>SELECT CHARACTER</h2>
      <div style={{ display: 'flex', gap: 20, flexDirection: mobile ? 'column' : 'row', width: '100%', justifyContent: 'center' }}>
        {Object.values(CHARS).map(c => {
          const lock = !unlockedChars.includes(c.id);
          return (
            <div key={c.id} onClick={() => !lock && start(c.id)} style={{ padding: 20, border: `2px solid ${lock ? '#666' : COL.GREEN}`, backgroundColor: lock ? 'rgba(100,100,100,0.1)' : 'rgba(34,197,94,0.1)', cursor: lock ? 'not-allowed' : 'pointer', opacity: lock ? 0.5 : 1, flex: 1, maxWidth: 200 }}>
              <h3 style={{ marginBottom: 15, color: lock ? '#666' : COL.GREEN }}>{c.name}</h3>
              {lock && <div style={{ marginBottom: 10, fontSize: 12, color: '#999' }}>Unlock at Wave {c.unlock}</div>}
              <div style={{ fontSize: 14, marginBottom: 5 }}>HP: {c.hp}</div>
              <div style={{ fontSize: 14, marginBottom: 5 }}>Speed: {c.spd}</div>
              <div style={{ fontSize: 14, marginBottom: 5 }}>Attack: {c.atk}</div>
              <div style={{ fontSize: 14, marginTop: 10, color: '#86efac' }}>Weapon: {c.wpn.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setPhase('menu')} style={{ marginTop: 30, padding: '10px 30px', backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>BACK</button>
    </div>
  );

  if (phase === 'levelup') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: 'rgba(0,0,0,0.9)', border: `2px solid ${COL.GREEN}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: COL.GREEN }}>
      <h2 style={{ marginBottom: 30, textShadow: '0 0 10px #00FF00' }}>LEVEL UP!</h2>
      <p style={{ marginBottom: 40 }}>Choose a stat to improve:</p>
      <div style={{ display: 'flex', gap: 20, flexDirection: mobile ? 'column' : 'row' }}>
        {[
          { s: 'health', label: 'HEALTH', desc: 'Max HP +7%' },
          { s: 'attack', label: 'ATTACK', desc: 'Damage +8%' },
          { s: 'speed', label: 'SPEED', desc: 'Speed +2%' },
        ].map(({ s, label, desc }) => (
          <button key={s} onClick={() => applyS(s)} style={{ padding: '20px 30px', fontSize: 16, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (phase === 'gameover') return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, backgroundColor: 'rgba(0,0,0,0.9)', border: '2px solid #DC143C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#DC143C' }}>
      <h1 style={{ marginBottom: 20, textShadow: '0 0 10px #DC143C' }}>GAME OVER</h1>
      <div style={{ marginBottom: 40, textAlign: 'center', color: COL.GREEN }}>
        <p>Wave Reached: {wave.current}</p><p>Final Level: {lvl.current}</p>
        {wave.current >= 5 && highWave >= 5 && <p style={{ color: '#FFD700', marginTop: 10 }}>Lilly Unlocked!</p>}
        {wave.current >= 7 && highWave >= 7 && <p style={{ color: '#8b5cf6', marginTop: 10 }}>The One Unlocked!</p>}
      </div>
      <div style={{ display: 'flex', gap: 15, flexDirection: mobile ? 'column' : 'row' }}>
        <button onClick={() => start(char)} style={{ padding: '15px 40px', fontSize: 18, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>RESTART</button>
        <button onClick={() => setPhase('charselect')} style={{ padding: '15px 40px', fontSize: 18, backgroundColor: 'transparent', border: `2px solid ${COL.GREEN}`, color: COL.GREEN, cursor: 'pointer', fontFamily: 'monospace' }}>CHANGE CHARACTER</button>
      </div>
    </div>
  );

  return (
    <div style={{ width: CONFIG.VIEW, height: CONFIG.VIEW, border: `2px solid ${COL.GREEN}`, position: 'relative' }}>
      <canvas ref={canvasRef} width={CONFIG.VIEW} height={CONFIG.VIEW} style={{ display: 'block', touchAction: 'none' }} />
    </div>
  );
};

export default MatrixSurvivor;

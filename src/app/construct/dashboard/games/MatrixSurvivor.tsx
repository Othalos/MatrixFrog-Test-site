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
        <p>Wave Reached: {gameState.current.wave}</p>
        <p>Final Level: {gameState.current.lvl}</p>
        {gameState.current.wave >= 5 && highWave >= 5 && <p style={{ color: '#FFD700', marginTop: 10 }}>Lilly Unlocked!</p>}
        {gameState.current.wave >= 7 && highWave >= 7 && <p style={{ color: '#8b5cf6', marginTop: 10 }}>The One Unlocked!</p>}
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
}

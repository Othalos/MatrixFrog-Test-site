import React, { useEffect, useRef, useState } from 'react';

// Constants
const GAME_CONFIG = {
  MAP_WIDTH: 10000,
  MAP_HEIGHT: 10000,
  VIEWPORT_WIDTH: 750,
  VIEWPORT_HEIGHT: 750,
  PLAYER_SIZE: 32,
  PLAYER_BASE_SPEED: 200,
};

const COLORS = {
  BACKGROUND: '#000000',
  MATRIX_GREEN: '#00FF00',
  PLAYER: '#4ade80',
  GRID: '#003300',
};

interface Vector2D {
  x: number;
  y: number;
}

const MatrixSurvivor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Game state
  const playerPos = useRef<Vector2D>({ x: 5000, y: 5000 });
  const playerVel = useRef<Vector2D>({ x: 0, y: 0 });
  const camera = useRef<Vector2D>({ x: 0, y: 0 });
  const keys = useRef<Set<string>>(new Set());
  const lastTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  
  // Mobile joystick state
  const joystickActive = useRef(false);
  const joystickStart = useRef<Vector2D>({ x: 0, y: 0 });
  const joystickCurrent = useRef<Vector2D>({ x: 0, y: 0 });
  const joystickDirection = useRef<Vector2D>({ x: 0, y: 0 });

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
  }, []);

  // Normalize position with wrapping
  const normalizePosition = (pos: Vector2D): Vector2D => {
    let x = pos.x;
    let y = pos.y;
    
    if (x < 0) x += GAME_CONFIG.MAP_WIDTH;
    if (x > GAME_CONFIG.MAP_WIDTH) x -= GAME_CONFIG.MAP_WIDTH;
    if (y < 0) y += GAME_CONFIG.MAP_HEIGHT;
    if (y > GAME_CONFIG.MAP_HEIGHT) y -= GAME_CONFIG.MAP_HEIGHT;
    
    return { x, y };
  };

  // Update camera to follow player
  const updateCamera = () => {
    camera.current = {
      x: playerPos.current.x - GAME_CONFIG.VIEWPORT_WIDTH / 2,
      y: playerPos.current.y - GAME_CONFIG.VIEWPORT_HEIGHT / 2,
    };
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle touch controls (joystick)
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
      
      // Calculate direction vector
      const dx = joystickCurrent.current.x - joystickStart.current.x;
      const dy = joystickCurrent.current.y - joystickStart.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) { // Dead zone
        joystickDirection.current = {
          x: dx / distance,
          y: dy / distance,
        };
      } else {
        joystickDirection.current = { x: 0, y: 0 };
      }
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

  // Game loop
  useEffect(() => {
    if (!gameStarted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTime.current ? (timestamp - lastTime.current) / 1000 : 0;
      lastTime.current = timestamp;

      let vx = 0;
      let vy = 0;

      // Keyboard controls
      if (keys.current.has('w') || keys.current.has('arrowup')) vy -= 1;
      if (keys.current.has('s') || keys.current.has('arrowdown')) vy += 1;
      if (keys.current.has('a') || keys.current.has('arrowleft')) vx -= 1;
      if (keys.current.has('d') || keys.current.has('arrowright')) vx += 1;

      // Mobile joystick overrides keyboard if active
      if (joystickActive.current) {
        vx = joystickDirection.current.x;
        vy = joystickDirection.current.y;
      } else {
        // Normalize diagonal movement for keyboard
        if (vx !== 0 && vy !== 0) {
          const len = Math.sqrt(vx * vx + vy * vy);
          vx /= len;
          vy /= len;
        }
      }

      playerVel.current = {
        x: vx * GAME_CONFIG.PLAYER_BASE_SPEED,
        y: vy * GAME_CONFIG.PLAYER_BASE_SPEED,
      };

      // Update player position
      playerPos.current = {
        x: playerPos.current.x + playerVel.current.x * deltaTime,
        y: playerPos.current.y + playerVel.current.y * deltaTime,
      };

      playerPos.current = normalizePosition(playerPos.current);
      updateCamera();
      render(ctx);

      animationFrame.current = requestAnimationFrame(gameLoop);
    };

    animationFrame.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [gameStarted]);

  // Render function
  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, GAME_CONFIG.VIEWPORT_WIDTH, GAME_CONFIG.VIEWPORT_HEIGHT);

    // Draw grid
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const startX = Math.floor(camera.current.x / gridSize) * gridSize;
    const startY = Math.floor(camera.current.y / gridSize) * gridSize;

    for (let x = startX; x < camera.current.x + GAME_CONFIG.VIEWPORT_WIDTH + gridSize; x += gridSize) {
      const screenX = x - camera.current.x;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, GAME_CONFIG.VIEWPORT_HEIGHT);
      ctx.stroke();
    }

    for (let y = startY; y < camera.current.y + GAME_CONFIG.VIEWPORT_HEIGHT + gridSize; y += gridSize) {
      const screenY = y - camera.current.y;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(GAME_CONFIG.VIEWPORT_WIDTH, screenY);
      ctx.stroke();
    }

    // Draw player
    const playerScreenX = GAME_CONFIG.VIEWPORT_WIDTH / 2 - GAME_CONFIG.PLAYER_SIZE / 2;
    const playerScreenY = GAME_CONFIG.VIEWPORT_HEIGHT / 2 - GAME_CONFIG.PLAYER_SIZE / 2;

    ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(playerScreenX, playerScreenY, GAME_CONFIG.PLAYER_SIZE, GAME_CONFIG.PLAYER_SIZE);

    // Draw mobile joystick if active
    if (isMobile && joystickActive.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const joystickX = joystickStart.current.x - rect.left;
        const joystickY = joystickStart.current.y - rect.top;
        const currentX = joystickCurrent.current.x - rect.left;
        const currentY = joystickCurrent.current.y - rect.top;

        // Draw outer circle
        ctx.strokeStyle = COLORS.MATRIX_GREEN;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joystickX, joystickY, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner circle (current position)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Debug info
    ctx.fillStyle = COLORS.MATRIX_GREEN;
    ctx.font = '12px monospace';
    ctx.fillText(
      `Position: ${Math.floor(playerPos.current.x)}, ${Math.floor(playerPos.current.y)}`,
      10,
      20
    );
    ctx.fillText(
      `Controls: ${isMobile ? 'Touch' : 'Keyboard'}`,
      10,
      40
    );
  };

  const startGame = () => {
    setGameStarted(true);
    playerPos.current = { x: 5000, y: 5000 };
    lastTime.current = 0;
  };

  if (!gameStarted) {
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
        <h1 style={{ marginBottom: '20px', textShadow: '0 0 10px #00FF00' }}>
          MATRIX SURVIVOR
        </h1>
        <p style={{ marginBottom: '30px', textAlign: 'center', maxWidth: '400px' }}>
          {isMobile ? 'Touch and drag to move' : 'Use WASD or Arrow Keys to move'}. 
          Survive waves of enemies and level up your character!
        </p>
        <button
          onClick={startGame}
          style={{
            padding: '15px 40px',
            fontSize: '18px',
            backgroundColor: 'transparent',
            border: `2px solid ${COLORS.MATRIX_GREEN}`,
            color: COLORS.MATRIX_GREEN,
            cursor: 'pointer',
            fontFamily: 'monospace',
            transition: 'all 0.3s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          START GAME
        </button>
        <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
          Phase 1: Movement Test ({isMobile ? 'Mobile' : 'Desktop'})
        </p>
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

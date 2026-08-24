"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions
interface MatrixDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  opacity: number;
}

interface Obstacle {
  x: number;
  gapY: number;
  width: number;
  height: number;
  passed: boolean;
  isRed: boolean;
  id: number;
}

interface Player {
  x: number;
  y: number;
  velocity: number;
  width: number;
  height: number;
  isJumping: boolean;
  jumpFrame: number;
}

// Draw 3D cylindrical candle function
const draw3DCandle = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isRed: boolean) => {
  const radius = width / 2;
  const centerX = x + radius;
  
  // Main cylinder body
  const mainGradient = ctx.createLinearGradient(x, y, x + width, y);
  if (isRed) {
    mainGradient.addColorStop(0, '#ff6666');
    mainGradient.addColorStop(0.3, '#ff0000');
    mainGradient.addColorStop(0.7, '#cc0000');
    mainGradient.addColorStop(1, '#990000');
  } else {
    mainGradient.addColorStop(0, '#66ff66');
    mainGradient.addColorStop(0.3, '#00ff00');
    mainGradient.addColorStop(0.7, '#00cc00');
    mainGradient.addColorStop(1, '#009900');
  }
  
  ctx.fillStyle = mainGradient;
  ctx.fillRect(x, y, width, height);
  
  // Top ellipse (3D effect)
  ctx.fillStyle = isRed ? '#ff8888' : '#88ff88';
  ctx.beginPath();
  ctx.ellipse(centerX, y, radius, radius * 0.3, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // Bottom ellipse (3D effect)
  ctx.fillStyle = isRed ? '#cc4444' : '#44cc44';
  ctx.beginPath();
  ctx.ellipse(centerX, y + height, radius, radius * 0.3, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // Highlight for 3D effect
  const highlightGradient = ctx.createLinearGradient(x, y, x + width * 0.3, y);
  highlightGradient.addColorStop(0, isRed ? '#ffaaaa' : '#aaffaa');
  highlightGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = highlightGradient;
  ctx.fillRect(x, y, width * 0.3, height);
};

// Draw 3D frog character function
const draw3DFrogCharacter = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isJumping: boolean) => {
  ctx.save();
  
  if (isJumping) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(-0.2);
    ctx.translate(-width / 2, -height / 2);
    x = 0;
    y = 0;
  }

  // Shadow/depth base
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x + 2, y + 2, width - 4, height - 4);

  // Combat boots (3D effect)
  const bootGradient = ctx.createLinearGradient(x, y + height - 15, x + width, y + height - 15);
  bootGradient.addColorStop(0, '#333333');
  bootGradient.addColorStop(0.3, '#111111');
  bootGradient.addColorStop(0.7, '#000000');
  bootGradient.addColorStop(1, '#222222');
  ctx.fillStyle = bootGradient;
  ctx.fillRect(x + 8, y + height - 15, 15, 12);
  ctx.fillRect(x + width - 23, y + height - 15, 15, 12);
  
  // Boot highlights
  ctx.fillStyle = '#444444';
  ctx.fillRect(x + 8, y + height - 15, 3, 12);
  ctx.fillRect(x + width - 23, y + height - 15, 3, 12);

  // Black pants with 3D shading
  const pantsGradient = ctx.createLinearGradient(x, y + height/2, x + width, y + height/2);
  pantsGradient.addColorStop(0, '#333333');
  pantsGradient.addColorStop(0.3, '#111111');
  pantsGradient.addColorStop(0.7, '#000000');
  pantsGradient.addColorStop(1, '#222222');
  ctx.fillStyle = pantsGradient;
  ctx.fillRect(x + 8, y + height/2, width - 16, height/2 - 15); // Made thinner

  // Black shirt
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 6, y + height/3, width - 12, height/3); // Made thinner

  // Trench coat with detailed 3D effect
  const coatGradient = ctx.createLinearGradient(x, y + 20, x + width, y + 20);
  coatGradient.addColorStop(0, '#4a4a4a');
  coatGradient.addColorStop(0.2, '#2a2a2a');
  coatGradient.addColorStop(0.5, '#111111');
  coatGradient.addColorStop(0.8, '#000000');
  coatGradient.addColorStop(1, '#333333');
  ctx.fillStyle = coatGradient;
  
  // Coat body - made thinner
  ctx.fillRect(x + 4, y + 25, width - 8, height - 40);
  
  // Coat lapels - adjusted for thinner character
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 25);
  ctx.lineTo(x + 12, y + 35);
  ctx.lineTo(x + 6, y + 45);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(x + width - 6, y + 25);
  ctx.lineTo(x + width - 12, y + 35);
  ctx.lineTo(x + width - 6, y + 45);
  ctx.closePath();
  ctx.fill();

  // Coat highlights - adjusted for thinner character
  ctx.fillStyle = '#666666';
  ctx.fillRect(x + 4, y + 25, 2, height - 40);

  // Arms/sleeves - adjusted for thinner character
  if (isJumping) {
    // Extended arms when jumping
    ctx.fillStyle = '#222222';
    ctx.fillRect(x - 6, y + 30, 10, 18);
    ctx.fillRect(x + width - 4, y + 30, 10, 18);
  } else {
    ctx.fillStyle = '#333333';
    ctx.fillRect(x - 2, y + 35, 6, 15);
    ctx.fillRect(x + width - 4, y + 35, 6, 15);
  }

  // Green frog head with 3D shading
  const headGradient = ctx.createRadialGradient(
    x + width/2 - 5, y + 10, 0,
    x + width/2, y + 15, 20
  );
  headGradient.addColorStop(0, '#66ff66');
  headGradient.addColorStop(0.3, '#4ade80');
  headGradient.addColorStop(0.7, '#22c55e');
  headGradient.addColorStop(1, '#16a34a');
  
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.ellipse(x + width/2, y + 15, 18, 15, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Head highlights
  ctx.fillStyle = '#88ff88';
  ctx.beginPath();
  ctx.ellipse(x + width/2 - 6, y + 10, 6, 5, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Violet eyes with 3D effect
  const eyeGradient = ctx.createRadialGradient(x + width/2 - 8, y + 12, 0, x + width/2 - 8, y + 12, 5);
  eyeGradient.addColorStop(0, '#c084fc');
  eyeGradient.addColorStop(0.5, '#8b5cf6');
  eyeGradient.addColorStop(1, '#7c3aed');
  
  ctx.fillStyle = eyeGradient;
  ctx.beginPath();
  ctx.ellipse(x + width/2 - 8, y + 12, 5, 5, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.beginPath();
  ctx.ellipse(x + width/2 + 8, y + 12, 5, 5, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Eye pupils
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(x + width/2 - 8, y + 12, 2, 2, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width/2 + 8, y + 12, 2, 2, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x + width/2 - 7, y + 11, 1, 1, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width/2 + 9, y + 11, 1, 1, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + width/2, y + 18, 4, 0, Math.PI);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.ellipse(x + width/2 - 2, y + 16, 1, 1, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width/2 + 2, y + 16, 1, 1, 0, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
};

const FlapMatrix = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Game state
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Initialize high score on client side only
  useEffect(() => {
    setIsClient(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('flapMatrixHighScore');
        if (saved) {
          setHighScore(parseInt(saved, 10) || 0);
        }
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }, []);

  // Game objects
  const [player, setPlayer] = useState<Player>({
    x: 100,
    y: 250,
    velocity: 0,
    width: 40, // Reduced from 50 to make character thinner
    height: 60,
    isJumping: false,
    jumpFrame: 0
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [matrixRain, setMatrixRain] = useState<MatrixDrop[]>([]);

  // Game constants
  const GRAVITY = 0.4;
  const JUMP_FORCE = -7; // Reduced from -10 to make jumps lower
  const OBSTACLE_SPEED = 2.5;
  const OBSTACLE_GAP = 160;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Matrix rain effect
  const initMatrixRain = useCallback(() => {
    const drops: MatrixDrop[] = [];
    const matrixChars = ['0', '1', 'ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ', 'ガ', 'ザ', 'ダ', 'バ', 'パ'];
    
    for (let i = 0; i < 150; i++) {
      drops.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT * 2,
        speed: Math.random() * 3 + 1,
        char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
        opacity: Math.random() * 0.8 + 0.2
      });
    }
    setMatrixRain(drops);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Initialize obstacles
  const createObstacle = useCallback((x: number): Obstacle => {
    const gapY = Math.random() * 300 + 150;
    const isRed = Math.random() < 0.15;
    return {
      x,
      gapY,
      width: 50,
      height: CANVAS_HEIGHT,
      passed: false,
      isRed,
      id: Math.random()
    };
  }, [CANVAS_HEIGHT]);

  // Input handlers
  const handleJump = useCallback(() => {
    if (gameState === 'playing') {
      setPlayer(prev => ({
        ...prev,
        velocity: JUMP_FORCE,
        isJumping: true,
        jumpFrame: 0
      }));
    } else if (gameState === 'menu' || gameState === 'gameOver') {
      setGameState('playing');
      setScore(0);
      setPlayer({
        x: 100,
        y: 250,
        velocity: 0,
        width: 40, // Updated to match thinner character
        height: 60,
        isJumping: false,
        jumpFrame: 0
      });
      setObstacles([
        createObstacle(CANVAS_WIDTH + 200),
        createObstacle(CANVAS_WIDTH + 500),
        createObstacle(CANVAS_WIDTH + 800)
      ]);
    }
  }, [gameState, JUMP_FORCE, createObstacle, CANVAS_WIDTH]);

  // Event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleJump]);

  // Initialize matrix rain
  useEffect(() => {
    initMatrixRain();
  }, [initMatrixRain]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      setPlayer(prev => {
        let newVelocity = prev.velocity + GRAVITY;
        let newY = prev.y + newVelocity;
        const newJumpFrame = prev.jumpFrame + 1;

        if (newY <= 0) {
          newY = 0;
          newVelocity = 0;
        }
        if (newY >= CANVAS_HEIGHT - prev.height) {
          setGameState('gameOver');
          return prev;
        }

        return {
          ...prev,
          y: newY,
          velocity: newVelocity,
          isJumping: prev.isJumping && newJumpFrame < 10,
          jumpFrame: newJumpFrame
        };
      });

      setObstacles(prev => {
        const newObstacles = prev.map(obstacle => ({
          ...obstacle,
          x: obstacle.x - OBSTACLE_SPEED
        })).filter(obstacle => obstacle.x > -obstacle.width);

        const lastObstacle = newObstacles[newObstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < CANVAS_WIDTH - 400) {
          newObstacles.push(createObstacle(CANVAS_WIDTH + 200));
        }

        return newObstacles;
      });

      setMatrixRain(prev => prev.map(drop => ({
        ...drop,
        y: drop.y + drop.speed,
        ...(drop.y > CANVAS_HEIGHT + 50 ? {
          y: -Math.random() * 100,
          x: Math.random() * CANVAS_WIDTH,
          opacity: Math.random() * 0.8 + 0.2
        } : {})
      })));

    }, 1000 / 60);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, GRAVITY, CANVAS_HEIGHT, OBSTACLE_SPEED, CANVAS_WIDTH, createObstacle]);

  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;

    obstacles.forEach(obstacle => {
      if (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        (player.y < obstacle.gapY - OBSTACLE_GAP / 2 ||
         player.y + player.height > obstacle.gapY + OBSTACLE_GAP / 2)
      ) {
        setGameState('gameOver');
        return;
      }

      if (!obstacle.passed && player.x > obstacle.x + obstacle.width) {
        obstacle.passed = true;
        const points = obstacle.isRed ? 2 : 1;
        setScore(prev => {
          const newScore = prev + points;
          if (newScore > highScore) {
            setHighScore(newScore);
            // Only save to localStorage on client side
            if (isClient) {
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  localStorage.setItem('flapMatrixHighScore', newScore.toString());
                }
              } catch (e) {
                console.warn('Could not save high score:', e);
              }
            }
          }
          return newScore;
        });
      }
    });
  }, [player, obstacles, gameState, highScore, OBSTACLE_GAP, isClient]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw matrix rain
    ctx.font = '14px monospace';
    matrixRain.forEach((drop, index) => {
      const intensity = Math.sin(Date.now() * 0.002 + index * 0.1) * 0.3 + 0.7;
      
      ctx.fillStyle = `rgba(0, 255, 0, ${drop.opacity * intensity * 0.8})`;
      ctx.fillText(drop.char, drop.x, drop.y);
      
      if (drop.y > 20) {
        ctx.fillStyle = `rgba(0, 255, 0, ${drop.opacity * intensity * 0.5})`;
        ctx.fillText(drop.char, drop.x, drop.y - 15);
      }
      if (drop.y > 35) {
        ctx.fillStyle = `rgba(0, 255, 0, ${drop.opacity * intensity * 0.3})`;
        ctx.fillText(drop.char, drop.x, drop.y - 30);
      }
    });

    if (gameState === 'playing') {
      // Draw obstacles
      obstacles.forEach(obstacle => {
        draw3DCandle(
          ctx,
          obstacle.x,
          0,
          obstacle.width,
          obstacle.gapY - OBSTACLE_GAP / 2,
          obstacle.isRed
        );

        draw3DCandle(
          ctx,
          obstacle.x,
          obstacle.gapY + OBSTACLE_GAP / 2,
          obstacle.width,
          CANVAS_HEIGHT - (obstacle.gapY + OBSTACLE_GAP / 2),
          obstacle.isRed
        );

        // Flame effect
        const flameHeight = 25;
        const flameY = obstacle.gapY - OBSTACLE_GAP / 2 - flameHeight;
        const centerX = obstacle.x + obstacle.width / 2;
        
        const flameGradient = ctx.createRadialGradient(
          centerX, flameY + flameHeight/2, 0,
          centerX, flameY + flameHeight/2, obstacle.width/2 + 10
        );
        flameGradient.addColorStop(0, obstacle.isRed ? '#ffaa00' : '#ffff00');
        flameGradient.addColorStop(0.5, obstacle.isRed ? '#ff6600aa' : '#ffff00aa');
        flameGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, flameY + flameHeight/2, obstacle.width/2 + 10, flameHeight/2 + 5, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = obstacle.isRed ? '#ffaa00' : '#ffff00';
        ctx.beginPath();
        ctx.ellipse(centerX, flameY + flameHeight/2, obstacle.width/3, flameHeight/2, 0, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw character
      draw3DFrogCharacter(ctx, player.x, player.y, player.width, player.height, player.isJumping);

      // Draw score
      ctx.font = '28px monospace';
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(`Score: ${score}`, 25, 45);
      ctx.fillText(`Score: ${score}`, 25, 45);
      
      ctx.font = '20px monospace';
      ctx.strokeText(`High: ${highScore}`, 25, 75);
      ctx.fillText(`High: ${highScore}`, 25, 75);
    }

    // Menu screen
    if (gameState === 'menu') {
      ctx.fillStyle = '#4ade80';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FLAP MATRIX', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      ctx.font = '24px monospace';
      ctx.fillText('Press SPACE or TAP to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.fillText('Navigate through the candles!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      ctx.fillText('Red candles = 2 points, Green = 1 point', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
    }

    // Game over screen
    if (gameState === 'gameOver') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#ff4444';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      ctx.fillStyle = '#4ade80';
      ctx.font = '24px monospace';
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      ctx.fillText('Press SPACE or TAP to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }

    ctx.textAlign = 'left';
  }, [gameState, player, obstacles, matrixRain, score, highScore, CANVAS_WIDTH, CANVAS_HEIGHT, OBSTACLE_GAP]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      backgroundColor: '#000000',
      padding: '20px',
      borderRadius: '8px'
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '2px solid #4ade80',
          borderRadius: '8px',
          backgroundColor: '#000000',
          cursor: 'pointer'
        }}
        onClick={handleJump}
      />
      <div style={{ 
        marginTop: '15px', 
        color: '#4ade80', 
        fontFamily: 'monospace',
        textAlign: 'center'
      }}>
        <p>Use SPACE or TAP to make the character jump</p>
        <p>Avoid the candles and score points by passing through them!</p>
        <p style={{ color: '#ff4444' }}>Red candles = 2 points</p>
        <p style={{ color: '#4ade80' }}>Green candles = 1 point</p>
      </div>
    </div>
  );
};

export default FlapMatrix;

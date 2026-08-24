"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions
interface Position {
  x: number;
  y: number;
}

interface MatrixDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  opacity: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Draw frog head function (reused from FlapMatrix)
const drawFrogHead = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  
  // Green frog head with 3D shading
  const headGradient = ctx.createRadialGradient(
    centerX - 2, centerY - 2, 0,
    centerX, centerY, size / 2
  );
  headGradient.addColorStop(0, '#66ff66');
  headGradient.addColorStop(0.3, '#4ade80');
  headGradient.addColorStop(0.7, '#22c55e');
  headGradient.addColorStop(1, '#16a34a');
  
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, size / 2 - 2, size / 2 - 2, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Head highlights
  ctx.fillStyle = '#88ff88';
  ctx.beginPath();
  ctx.ellipse(centerX - 3, centerY - 3, size / 6, size / 8, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Violet eyes
  const eyeSize = size / 8;
  const eyeGradient = ctx.createRadialGradient(centerX - eyeSize, centerY - 2, 0, centerX - eyeSize, centerY - 2, eyeSize);
  eyeGradient.addColorStop(0, '#c084fc');
  eyeGradient.addColorStop(0.5, '#8b5cf6');
  eyeGradient.addColorStop(1, '#7c3aed');
  
  ctx.fillStyle = eyeGradient;
  ctx.beginPath();
  ctx.ellipse(centerX - eyeSize, centerY - 2, eyeSize, eyeSize, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.beginPath();
  ctx.ellipse(centerX + eyeSize, centerY - 2, eyeSize, eyeSize, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Eye pupils
  ctx.fillStyle = '#000000';
  const pupilSize = eyeSize / 2;
  ctx.beginPath();
  ctx.ellipse(centerX - eyeSize, centerY - 2, pupilSize, pupilSize, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX + eyeSize, centerY - 2, pupilSize, pupilSize, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#ffffff';
  const highlightSize = pupilSize / 2;
  ctx.beginPath();
  ctx.ellipse(centerX - eyeSize + 1, centerY - 3, highlightSize, highlightSize, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX + eyeSize + 1, centerY - 3, highlightSize, highlightSize, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = '#333333';
  const nostrilSize = size / 16;
  ctx.beginPath();
  ctx.ellipse(centerX - 2, centerY + 2, nostrilSize, nostrilSize, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(centerX + 2, centerY + 2, nostrilSize, nostrilSize, 0, 0, 2 * Math.PI);
  ctx.fill();
};

// Draw connected snake body with rounded segments
const drawSnakeBody = (ctx: CanvasRenderingContext2D, snake: Position[], gridSize: number) => {
  // First, draw all the connecting lines between segments
  for (let i = 0; i < snake.length - 1; i++) {
    const current = snake[i];
    const next = snake[i + 1];
    
    const currentX = current.x * gridSize + gridSize/2;
    const currentY = current.y * gridSize + gridSize/2;
    const nextX = next.x * gridSize + gridSize/2;
    const nextY = next.y * gridSize + gridSize/2;
    
    // Check for edge wrapping - don't draw connection lines across the screen
    const deltaX = Math.abs(current.x - next.x);
    const deltaY = Math.abs(current.y - next.y);
    
    // Only draw connection if segments are adjacent (not wrapping around edges)
    if (deltaX <= 1 && deltaY <= 1) {
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = gridSize - 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(nextX, nextY);
      ctx.stroke();
    }
  }
  
  // Then draw all the body segments on top
  snake.forEach((segment, index) => {
    const x = segment.x * gridSize;
    const y = segment.y * gridSize;
    
    if (index === 0) {
      // Draw frog head
      drawFrogHead(ctx, x, y, gridSize);
    } else if (index === snake.length - 1) {
      // Draw tail with pointed end
      const prevSegment = snake[index - 1];
      const dx = segment.x - prevSegment.x;
      const dy = segment.y - prevSegment.y;
      
      // Handle edge wrapping for tail direction
      let actualDx = dx;
      let actualDy = dy;
      
      // Check for wrapping and adjust direction
      if (Math.abs(dx) > 1) {
        actualDx = dx > 0 ? -1 : 1; // Reverse direction for wrapping
      }
      if (Math.abs(dy) > 1) {
        actualDy = dy > 0 ? -1 : 1; // Reverse direction for wrapping
      }
      
      // Body circle
      const bodyGradient = ctx.createRadialGradient(
        x + gridSize/2, y + gridSize/2, 0,
        x + gridSize/2, y + gridSize/2, gridSize/2
      );
      bodyGradient.addColorStop(0, '#22c55e');
      bodyGradient.addColorStop(0.7, '#16a34a');
      bodyGradient.addColorStop(1, '#15803d');
      
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.ellipse(x + gridSize/2, y + gridSize/2, gridSize/2 - 3, gridSize/2 - 3, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Tail point (only if not wrapping)
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        const tailLength = gridSize * 0.3;
        const tailX = x + gridSize/2 - actualDx * tailLength;
        const tailY = y + gridSize/2 - actualDy * tailLength;
        
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.moveTo(x + gridSize/2, y + gridSize/2);
        if (actualDx !== 0) {
          ctx.lineTo(tailX, tailY - tailLength/4);
          ctx.lineTo(tailX, tailY + tailLength/4);
        } else {
          ctx.lineTo(tailX - tailLength/4, tailY);
          ctx.lineTo(tailX + tailLength/4, tailY);
        }
        ctx.closePath();
        ctx.fill();
      }
      
      // Body highlight
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(x + gridSize/2 - 3, y + gridSize/2 - 3, gridSize/5, gridSize/5, 0, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Draw body segments as seamless circles
      const bodyGradient = ctx.createRadialGradient(
        x + gridSize/2, y + gridSize/2, 0,
        x + gridSize/2, y + gridSize/2, gridSize/2
      );
      bodyGradient.addColorStop(0, '#22c55e');
      bodyGradient.addColorStop(0.7, '#16a34a');
      bodyGradient.addColorStop(1, '#15803d');
      
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.ellipse(x + gridSize/2, y + gridSize/2, gridSize/2 - 3, gridSize/2 - 3, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Body highlight
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(x + gridSize/2 - 3, y + gridSize/2 - 3, gridSize/5, gridSize/5, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
};

const MatrixSnake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Game constants
  const GRID_SIZE = 25;
  const CANVAS_WIDTH = 750;
  const CANVAS_HEIGHT = 750;
  const GRID_WIDTH = CANVAS_WIDTH / GRID_SIZE;
  const GRID_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;

  // Responsive canvas sizing
  const getCanvasSize = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const maxWidth = Math.min(window.innerWidth - 40, 500); // Leave 40px margin
        return {
          width: maxWidth,
          height: maxWidth,
          scale: maxWidth / CANVAS_WIDTH
        };
      }
    }
    return {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      scale: 1
    };
  };

  const [canvasSize, setCanvasSize] = useState(getCanvasSize());

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize(getCanvasSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  
  // Game objects
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 15 },
    { x: 9, y: 15 },
    { x: 8, y: 15 }
  ]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [matrixRain, setMatrixRain] = useState<MatrixDrop[]>([]);

  // Initialize client-side state and high score
  useEffect(() => {
    setIsClient(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('matrixSnakeHighScore');
        if (saved) {
          setHighScore(parseInt(saved, 10) || 0);
        }
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }, []);

  // Matrix rain effect
  const initMatrixRain = useCallback(() => {
    const drops: MatrixDrop[] = [];
    const matrixChars = ['0', '1', 'ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'];
    
    for (let i = 0; i < 80; i++) {
      drops.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT * 2,
        speed: Math.random() * 2 + 0.5,
        char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
        opacity: Math.random() * 0.6 + 0.2
      });
    }
    setMatrixRain(drops);
  }, []);

  // Generate random food position
  const generateFood = useCallback((currentSnake: Position[]) => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    return newFood;
  }, [GRID_WIDTH, GRID_HEIGHT]);

  // Handle input
  const handleKeyPress = useCallback((key: string) => {
    if (gameState !== 'playing') return;
    
    switch (key.toLowerCase()) {
      case 'arrowup':
        if (direction !== 'DOWN') setNextDirection('UP');
        break;
      case 'arrowdown':
        if (direction !== 'UP') setNextDirection('DOWN');
        break;
      case 'arrowleft':
        if (direction !== 'RIGHT') setNextDirection('LEFT');
        break;
      case 'arrowright':
        if (direction !== 'LEFT') setNextDirection('RIGHT');
        break;
    }
  }, [gameState, direction]);

  // Mobile direction controls
  const handleDirectionClick = useCallback((newDirection: Direction) => {
    if (gameState !== 'playing') return;
    
    switch (newDirection) {
      case 'UP':
        if (direction !== 'DOWN') setNextDirection('UP');
        break;
      case 'DOWN':
        if (direction !== 'UP') setNextDirection('DOWN');
        break;
      case 'LEFT':
        if (direction !== 'RIGHT') setNextDirection('LEFT');
        break;
      case 'RIGHT':
        if (direction !== 'LEFT') setNextDirection('RIGHT');
        break;
    }
  }, [gameState, direction]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setSnake([
      { x: 10, y: 15 },
      { x: 9, y: 15 },
      { x: 8, y: 15 }
    ]);
    setFood(generateFood([
      { x: 10, y: 15 },
      { x: 9, y: 15 },
      { x: 8, y: 15 }
    ]));
  }, [generateFood]);

  // Event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (gameState === 'menu' || gameState === 'gameOver') {
        if (e.code === 'Space' || e.code === 'Enter') {
          startGame();
        }
      } else {
        handleKeyPress(e.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleKeyPress, startGame]);

  // Initialize matrix rain
  useEffect(() => {
    initMatrixRain();
  }, [initMatrixRain]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      setDirection(nextDirection);
      
      setSnake(currentSnake => {
        const newSnake = [...currentSnake];
        const head = { ...newSnake[0] };

        // Move head based on direction
        switch (nextDirection) {
          case 'UP':
            head.y = head.y === 0 ? GRID_HEIGHT - 1 : head.y - 1;
            break;
          case 'DOWN':
            head.y = head.y === GRID_HEIGHT - 1 ? 0 : head.y + 1;
            break;
          case 'LEFT':
            head.x = head.x === 0 ? GRID_WIDTH - 1 : head.x - 1;
            break;
          case 'RIGHT':
            head.x = head.x === GRID_WIDTH - 1 ? 0 : head.x + 1;
            break;
        }

        // Check self collision
        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameState('gameOver');
          return currentSnake;
        }

        newSnake.unshift(head);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore(prev => {
            const newScore = prev + 10;
            if (newScore > highScore) {
              setHighScore(newScore);
              if (isClient) {
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem('matrixSnakeHighScore', newScore.toString());
                  }
                } catch (e) {
                  console.warn('Could not save high score:', e);
                }
              }
            }
            return newScore;
          });
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });

      // Update matrix rain
      setMatrixRain(prev => prev.map(drop => ({
        ...drop,
        y: drop.y + drop.speed,
        ...(drop.y > CANVAS_HEIGHT + 50 ? {
          y: -Math.random() * 100,
          x: Math.random() * CANVAS_WIDTH,
          opacity: Math.random() * 0.6 + 0.2
        } : {})
      })));

    }, 150); // Snake moves every 150ms

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, nextDirection, food, generateFood, highScore, isClient, GRID_WIDTH, GRID_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw matrix rain
    ctx.font = '12px monospace';
    matrixRain.forEach((drop, index) => {
      const intensity = Math.sin(Date.now() * 0.002 + index * 0.1) * 0.3 + 0.7;
      
      ctx.fillStyle = `rgba(0, 255, 0, ${drop.opacity * intensity * 0.6})`;
      ctx.fillText(drop.char, drop.x, drop.y);
      
      if (drop.y > 15) {
        ctx.fillStyle = `rgba(0, 255, 0, ${drop.opacity * intensity * 0.3})`;
        ctx.fillText(drop.char, drop.x, drop.y - 12);
      }
    });

    if (gameState === 'playing') {
      // Draw grid (subtle)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let i = 0; i <= GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, i * GRID_SIZE);
        ctx.stroke();
      }

      // Draw food (green dot with glow)
      const foodX = food.x * GRID_SIZE;
      const foodY = food.y * GRID_SIZE;
      
      // Food glow
      const foodGradient = ctx.createRadialGradient(
        foodX + GRID_SIZE/2, foodY + GRID_SIZE/2, 0,
        foodX + GRID_SIZE/2, foodY + GRID_SIZE/2, GRID_SIZE
      );
      foodGradient.addColorStop(0, '#00ff00');
      foodGradient.addColorStop(0.5, '#00ff0080');
      foodGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = foodGradient;
      ctx.fillRect(foodX - 5, foodY - 5, GRID_SIZE + 10, GRID_SIZE + 10);
      
      // Food dot
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.ellipse(foodX + GRID_SIZE/2, foodY + GRID_SIZE/2, GRID_SIZE/3, GRID_SIZE/3, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Draw snake with new connected body design
      drawSnakeBody(ctx, snake, GRID_SIZE);

      // Draw score
      ctx.font = '24px monospace';
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(`Score: ${score}`, 20, 35);
      ctx.fillText(`Score: ${score}`, 20, 35);
      
      ctx.font = '18px monospace';
      ctx.strokeText(`High: ${highScore}`, 20, 60);
      ctx.fillText(`High: ${highScore}`, 20, 60);
      
      ctx.strokeText(`Length: ${snake.length}`, 20, 85);
      ctx.fillText(`Length: ${snake.length}`, 20, 85);
    }

    // Menu screen
    if (gameState === 'menu') {
      ctx.fillStyle = '#4ade80';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MATRIX SNAKE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      ctx.font = '24px monospace';
      ctx.fillText('Press SPACE or ENTER to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.fillText('Use Arrow Keys to move', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      ctx.fillText('Eat green dots, avoid your tail!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
    }

    // Game over screen
    if (gameState === 'gameOver') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#ff4444';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      ctx.fillStyle = '#4ade80';
      ctx.font = '24px monospace';
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      ctx.fillText(`Snake Length: ${snake.length}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
      ctx.fillText('Press SPACE or ENTER to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
    }

    ctx.textAlign = 'left';
  }, [gameState, snake, food, matrixRain, score, highScore, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_SIZE, GRID_WIDTH, GRID_HEIGHT]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      backgroundColor: '#000000',
      padding: '20px',
      borderRadius: '8px',
      width: '100%',
      maxWidth: '100vw',
      boxSizing: 'border-box'
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '2px solid #4ade80',
          borderRadius: '8px',
          backgroundColor: '#000000',
          marginBottom: '20px',
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '70vh'
        }}
        onClick={gameState !== 'playing' ? startGame : undefined}
      />
      
      {/* Mobile Controls - Responsive sizing */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(50px, 60px))',
        gridTemplateRows: 'repeat(3, minmax(50px, 60px))',
        gap: '5px',
        marginBottom: '15px',
        maxWidth: '200px'
      }}>
        <div></div>
        <button
          onClick={() => handleDirectionClick('UP')}
          style={{
            backgroundColor: 'rgba(34,197,94,0.2)',
            border: '2px solid #4ade80',
            color: '#4ade80',
            fontFamily: 'monospace',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '4px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ↑
        </button>
        <div></div>
        
        <button
          onClick={() => handleDirectionClick('LEFT')}
          style={{
            backgroundColor: 'rgba(34,197,94,0.2)',
            border: '2px solid #4ade80',
            color: '#4ade80',
            fontFamily: 'monospace',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '4px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>
        <div></div>
        <button
          onClick={() => handleDirectionClick('RIGHT')}
          style={{
            backgroundColor: 'rgba(34,197,94,0.2)',
            border: '2px solid #4ade80',
            color: '#4ade80',
            fontFamily: 'monospace',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '4px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          →
        </button>
        
        <div></div>
        <button
          onClick={() => handleDirectionClick('DOWN')}
          style={{
            backgroundColor: 'rgba(34,197,94,0.2)',
            border: '2px solid #4ade80',
            color: '#4ade80',
            fontFamily: 'monospace',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '4px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ↓
        </button>
        <div></div>
      </div>

      <div style={{ 
        color: '#4ade80', 
        fontFamily: 'monospace',
        textAlign: 'center',
        fontSize: '14px',
        maxWidth: '90%'
      }}>
        <p>Desktop: Use Arrow Keys to move</p>
        <p>Mobile: Use directional buttons above</p>
        <p>Eat green dots to grow longer!</p>
        <p>Avoid hitting your own tail</p>
      </div>
    </div>
  );
};

export default MatrixSnake;

import React from 'react';

// Pepu MemeWars Game Component
export const PepuMemeWars = () => {
  return (
    <div style={{ 
      width: "100%", 
      height: "800px",
      border: "2px solid #22c55e",
      borderRadius: "8px",
      overflow: "auto", // Changed from hidden to auto to allow scrolling
      position: "relative",
      backgroundColor: "black"
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .jonny-game-container {
              height: 1400px !important; /* Much taller on mobile to accommodate stacked layout */
            }
          }
        `}
      </style>
      <iframe
        src="https://remix.gg/g/0fb3283e-d137-49d7-a547-98c95bede599"
        className="jonny-game-container"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          minHeight: "800px"
        }}
        title="Pepu MemeWars By Jonny"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

// Pepu Jump Game Component
export const PepuJump = () => {
  return (
    <div style={{ 
      width: "100%", 
      height: "800px",
      border: "2px solid #22c55e",
      borderRadius: "8px",
      overflow: "auto", // Changed from hidden to auto to allow scrolling
      position: "relative",
      backgroundColor: "black"
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .jonny-game-container {
              height: 1400px !important; /* Much taller on mobile to accommodate stacked layout */
            }
          }
        `}
      </style>
      <iframe
        src="https://remix.gg/g/adc36a0c-a1d0-4d06-96bc-b5dd584e267f"
        className="jonny-game-container"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          minHeight: "800px"
        }}
        title="Pepu Jump By Jonny"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

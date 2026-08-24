'use client';
import { useEffect, useState } from 'react';

export function ClientOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback || (
      <div style={{ 
        minHeight: "200px", 
        backgroundColor: "black", 
        color: "#4ade80", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontFamily: "monospace",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: "8px",
        margin: "16px"
      }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}

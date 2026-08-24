// app/treasury/components/MatrixInfoTabs.tsx
'use client';
import { useState, useRef, useEffect } from 'react';

export default function MatrixInfoTabs() {
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [, setShowScrollHint] = useState(false);

  // Animation for page load
  const [pageLoaded, setPageLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Check if tabs are scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current;
        setShowScrollHint(scrollWidth > clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);

    return () => {
      window.removeEventListener('resize', checkScrollable);
    };
  }, []);

  return (
    <div className={`matrix-container ${pageLoaded ? 'visible' : ''}`}>
      {/* Introduction */}
      <div className="matrix-intro">
        <p>
          This MatrixFrog Treasury dashboard provides real-time insights into our community&apos;s financial ecosystem. Here you can monitor:
        </p>
        <p>
          <strong>Live Trading Data:</strong> Track MatrixFrog&apos;s market performance and trading activity in real-time.
        </p>
        <p>
          <strong>Community Pool Status:</strong> Monitor our locked liquidity pool and community reserves.
        </p>
        <p>
          <strong>Treasury Health:</strong> Transparent view of project funds and resource allocation.
        </p>
        <p>
          <strong>Growth Metrics:</strong> Analytics showing our ecosystem&apos;s expansion and development.
        </p>
        <p>
          The data below updates automatically to ensure you always have access to the most current information about MatrixFrog&apos;s financial status and community resources.
        </p>
      </div>
    </div>
  );
}

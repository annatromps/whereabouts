import React, { useRef, useState, useEffect } from 'react';
import '../styles/Lightbox.css';

function Lightbox({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastDist = useRef(null);
  const lastPan = useRef(null);
  const lastTap = useRef(0);

  // Escape key closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const resetZoom = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
      lastPan.current = null;
    } else {
      lastDist.current = null;
      lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      // Double-tap to toggle 2.5× zoom
      const now = Date.now();
      if (now - lastTap.current < 280) {
        setScale(prev => {
          if (prev > 1) { setOffset({ x: 0, y: 0 }); return 1; }
          return 2.5;
        });
      }
      lastTap.current = now;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / lastDist.current;
      lastDist.current = dist;
      setScale(prev => {
        const next = Math.min(Math.max(prev * ratio, 1), 5);
        if (next <= 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    } else if (e.touches.length === 1 && lastPan.current) {
      // Pan (only when zoomed in)
      setScale(prev => {
        if (prev > 1) {
          const dx = e.touches[0].clientX - lastPan.current.x;
          const dy = e.touches[0].clientY - lastPan.current.y;
          setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
        }
        return prev;
      });
      lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = null;
    lastPan.current = null;
    // Snap back if scale drifted below 1
    setScale(prev => {
      if (prev < 1.05) { setOffset({ x: 0, y: 0 }); return 1; }
      return prev;
    });
  };

  return (
    <div className="lb-backdrop" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Close lightbox">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <line x1="2" y1="2" x2="16" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="16" y1="2" x2="2" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      {scale <= 1 && (
        <div className="lb-hint">Double-tap or pinch to zoom</div>
      )}

      <div
        className="lb-stage"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="lb-img"
          style={{ transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)` }}
          draggable={false}
        />
      </div>
    </div>
  );
}

export default Lightbox;

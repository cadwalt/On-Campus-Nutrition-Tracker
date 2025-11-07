import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  example?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, example }) => {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShow(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShow(false);
      timeoutRef.current = null;
    }, 100);
  };

  return (
    <span className="profile-info-tooltip">
      <button
        className="profile-info-icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label="Section info"
        type="button"
      >
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M12 8v2m0 4h.01M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {show && (
        <div 
          role="tooltip"
          className="profile-tooltip-popup"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div><strong>What is this?</strong></div>
          <div>{content}</div>
          {example && (
            <div style={{ marginTop: 6, fontStyle: 'italic', color: '#bae6fd' }}>
              Example: {example}
            </div>
          )}
        </div>
      )}
    </span>
  );
};

export default Tooltip;

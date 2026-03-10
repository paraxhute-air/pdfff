import React from 'react';
import './ThumbnailProgressOverlay.css';

export default function ThumbnailProgressOverlay({ progress }) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="thumbnail-progress-overlay animate-fade-in">
      <div className="thumbnail-progress__glass-box">
        <svg
          height={size}
          width={size}
          className="thumbnail-progress__svg"
        >
          {/* Background Ring */}
          <circle
            stroke="var(--color-bg-primary)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress Ring */}
          <circle
            stroke="var(--color-accent-primary)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            className="thumbnail-progress__ring"
          />
        </svg>
        <span className="thumbnail-progress__text">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

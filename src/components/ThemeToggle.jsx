import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import './ThemeToggle.css';

/**
 * ThemeToggle 컴포넌트
 * 사각형 디자인 (그리드/프리뷰 모드 토글과 동일 스타일)
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('pdf-manager-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('pdf-manager-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="theme-toggle" data-tooltip-bottom={isDark ? '라이트 모드' : '다크 모드'}>
      <button
        className={`theme-toggle__btn ${!isDark ? 'theme-toggle__btn--active' : ''}`}
        onClick={() => setIsDark(false)}
        aria-label="라이트 모드"
      >
        <Sun size={16} />
      </button>
      <button
        className={`theme-toggle__btn ${isDark ? 'theme-toggle__btn--active' : ''}`}
        onClick={() => setIsDark(true)}
        aria-label="다크 모드"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}

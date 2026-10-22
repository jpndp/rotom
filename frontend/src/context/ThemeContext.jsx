import { useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContextValue';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('rotom_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rotom_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

import React, { createContext, useContext, useMemo } from 'react';
import { createTheme, defaultTheme, type Theme } from '@/design/theme';

const ThemeContext = createContext<Theme>(defaultTheme);

export interface ThemeProviderProps {
  children: React.ReactNode;
  scale?: number;
  reduceAnimations?: boolean;
}

export function ThemeProvider({ children, scale = 1, reduceAnimations = false }: ThemeProviderProps) {
  const theme = useMemo(() => createTheme({ scale, reduceAnimations }), [scale, reduceAnimations]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

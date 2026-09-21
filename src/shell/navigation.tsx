import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ScreenName =
  | 'splash' | 'mainMenu' | 'newGame' | 'characterCreation' | 'home' | 'character'
  | 'inventory' | 'equipment' | 'skills' | 'worldMap' | 'region' | 'city' | 'npcList'
  | 'dialogue' | 'questJournal' | 'combat' | 'dungeon' | 'loot' | 'bestiary'
  | 'chronicle' | 'settings' | 'saveLoad' | 'factions' | 'devPanel';

export interface Route {
  name: ScreenName;
  params?: Record<string, string | number | boolean | null>;
}

interface NavigationValue {
  route: Route;
  stack: Route[];
  push: (name: ScreenName, params?: Route['params']) => void;
  replace: (name: ScreenName, params?: Route['params']) => void;
  pop: () => void;
  reset: (name: ScreenName, params?: Route['params']) => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationValue | null>(null);

/**
 * A minimal stack router. Deliberately in-house: one screen is visible at a
 * time and the domain owns all state, so a full navigation library would add
 * dependencies without adding capability.
 */
export function NavigationProvider({ children, initial = 'splash' }: { children: ReactNode; initial?: ScreenName }) {
  const [stack, setStack] = useState<Route[]>([{ name: initial }]);

  const push = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack((current) => [...current, params ? { name, params } : { name }]);
  }, []);

  const replace = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack((current) => [...current.slice(0, -1), params ? { name, params } : { name }]);
  }, []);

  const pop = useCallback(() => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const reset = useCallback((name: ScreenName, params?: Route['params']) => {
    setStack([params ? { name, params } : { name }]);
  }, []);

  const value = useMemo<NavigationValue>(() => ({
    route: stack[stack.length - 1] ?? { name: initial },
    stack,
    push,
    replace,
    pop,
    reset,
    canGoBack: stack.length > 1,
  }), [stack, initial, push, replace, pop, reset]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation deve ser usado dentro de NavigationProvider');
  return context;
}

export function useParams<T extends Record<string, unknown>>(): Partial<T> {
  const { route } = useNavigation();
  return (route.params ?? {}) as Partial<T>;
}

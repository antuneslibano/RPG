import { colors, durations, iconSizes, layout, opacity, radius, rarityColors, shadows, spacing, typography } from '@/design/tokens';

export interface Theme {
  colors: typeof colors;
  rarityColors: typeof rarityColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  durations: typeof durations;
  iconSizes: typeof iconSizes;
  layout: typeof layout;
  opacity: typeof opacity;
  /** Multiplied into font sizes and paddings by the accessibility setting. */
  scale: number;
  reduceAnimations: boolean;
}

export function createTheme(options: { scale?: number; reduceAnimations?: boolean } = {}): Theme {
  return {
    colors,
    rarityColors,
    spacing,
    radius,
    typography,
    shadows,
    durations,
    iconSizes,
    layout,
    opacity,
    scale: options.scale ?? 1,
    reduceAnimations: options.reduceAnimations ?? false,
  };
}

export const defaultTheme = createTheme();

/** Animation duration honouring the "reduce animations" accessibility option. */
export function animated(theme: Theme, duration: number): number {
  return theme.reduceAnimations ? 0 : duration;
}

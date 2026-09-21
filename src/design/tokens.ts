import type { Rarity } from '@/domain/items/item';

/** Design tokens. No component may hardcode a colour, radius or duration. */
export const colors = {
  background: '#08080B',
  surface: '#111117',
  surfaceRaised: '#181820',
  surfaceSunken: '#0C0C11',
  border: '#24242E',
  borderStrong: '#353542',

  textPrimary: '#F2F2F5',
  textSecondary: '#A8A8B8',
  textMuted: '#6E6E80',
  textInverse: '#08080B',

  gold: '#C9A227',
  goldSoft: '#3A2F12',

  hp: '#D9443F',
  hpTrack: '#3A1614',
  mana: '#3F7FD9',
  manaTrack: '#122744',
  xp: '#8B5CF6',
  xpTrack: '#2A1B47',
  stamina: '#E0B23C',

  success: '#4FA96A',
  warning: '#D9922F',
  danger: '#D9443F',
  info: '#5A8FC9',

  overlay: 'rgba(4,4,7,0.82)',
} as const;

export const rarityColors: Record<Rarity, string> = {
  common: '#9AA0AC',
  uncommon: '#4FA96A',
  rare: '#4C82D9',
  epic: '#9B59D0',
  legendary: '#D98F2F',
  mythic: '#D94F7A',
};

export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.4 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: 0.3 },
  heading: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.2 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.2 },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2 },
  numeric: { fontSize: 15, fontWeight: '700' as const },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
} as const;

export const durations = {
  instant: 90,
  fast: 160,
  normal: 260,
  slow: 420,
  celebrate: 700,
} as const;

export const iconSizes = { sm: 14, md: 18, lg: 24, xl: 32 } as const;

/** Minimum touch target on mobile. */
export const layout = {
  touchTarget: 48,
  screenGutter: 16,
  cardGap: 12,
  maxContentWidth: 560,
} as const;

export const opacity = { disabled: 0.4, pressed: 0.72, subtle: 0.6 } as const;

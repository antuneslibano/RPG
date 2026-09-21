import React from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { colors, typography } from '@/design/tokens';

type Variant = keyof typeof typography;

export interface AppTextProps {
  children: React.ReactNode;
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  uppercase?: boolean;
  accessibilityLabel?: string;
}

/** The only text primitive: guarantees every string uses a typography token. */
export function AppText({
  children, variant = 'body', color = colors.textPrimary, align, numberOfLines, style, uppercase, accessibilityLabel,
}: AppTextProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      style={[
        typography[variant],
        { color },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase' as const } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

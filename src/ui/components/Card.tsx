import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '@/design/tokens';

export interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  raised?: boolean;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, padded = true, raised = false, borderColor, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: raised ? colors.surfaceRaised : colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: borderColor ?? colors.border,
          padding: padded ? spacing.lg : 0,
          overflow: 'hidden',
        },
        raised ? shadows.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

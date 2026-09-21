import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { resolveArt } from '@/assets/assetCatalog';
import { colors, radius, spacing } from '@/design/tokens';

export interface ArtFrameProps {
  artKey: string;
  height?: number;
  label?: string;
  sublabel?: string;
  borderColor?: string;
  rounded?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

/**
 * Renders the placeholder art for a logical key: layered blocks over a
 * deterministic gradient. Swapping in final images happens in the catalog.
 */
export function ArtFrame({ artKey, height = 180, label, sublabel, borderColor, rounded = 'lg', style, compact }: ArtFrameProps) {
  const art = resolveArt(artKey, label ?? '');
  const [deep, mid, accent] = art.colors;

  return (
    <View
      accessible
      accessibilityLabel={label ? `Ilustração de ${label}` : 'Ilustração'}
      style={[
        {
          height,
          borderRadius: radius[rounded],
          borderWidth: 1,
          borderColor: borderColor ?? colors.border,
          backgroundColor: deep,
          overflow: 'hidden',
          justifyContent: 'flex-end',
        },
        style,
      ]}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: '38%', backgroundColor: mid, opacity: 0.55 }} />
      {art.shapes.map((shape, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.w}%`,
            height: `${shape.h}%`,
            backgroundColor: index % 2 === 0 ? accent : mid,
            opacity: shape.opacity,
            borderRadius: radius.sm,
          }}
        />
      ))}
      <View style={{ position: 'absolute', top: spacing.sm, right: spacing.md }}>
        <AppText variant="title" color={accent} style={{ opacity: 0.75 }}>{art.glyph}</AppText>
      </View>
      {label && !compact ? (
        <View style={{ padding: spacing.md, backgroundColor: 'rgba(6,6,10,0.72)' }}>
          <AppText variant="heading">{label}</AppText>
          {sublabel ? <AppText variant="caption" color={colors.textSecondary}>{sublabel}</AppText> : null}
        </View>
      ) : null}
    </View>
  );
}

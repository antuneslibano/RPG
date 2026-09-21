import { Pressable, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { rarityColors } from '@/design/tokens';
import { RARITY_LABELS, type Item } from '@/domain/items/item';
import { formatStatValue, STAT_LABELS, type CombatStatKey } from '@/domain/items/affixes';
import { ATTRIBUTE_SHORT, type AttributeKey } from '@/domain/player/attributes';
import { resolveArt } from '@/assets/assetCatalog';

export function statLabel(key: string): string {
  return STAT_LABELS[key as CombatStatKey] ?? ATTRIBUTE_SHORT[key as AttributeKey] ?? key;
}

export interface ItemRowProps {
  item: Item;
  onPress?: () => void;
  right?: string;
  equipped?: boolean;
  /** Difference against the equipped item, when comparing. */
  delta?: number;
}

/** One inventory/shop line: icon, name, rarity (text + colour) and stats. */
export function ItemRow({ item, onPress, right, equipped, delta }: ItemRowProps) {
  const rarity = rarityColors[item.rarity];
  const art = resolveArt(item.artKey, item.name);
  const stats = Object.entries(item.stats).slice(0, 3);

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: equipped ? colors.gold : colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 44, height: 44, borderRadius: radius.sm,
          backgroundColor: art.colors[0], borderWidth: 1, borderColor: rarity,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <AppText variant="bodyStrong" color={rarity}>{art.glyph}</AppText>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>{item.name}</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <AppText variant="caption" color={rarity}>{RARITY_LABELS[item.rarity]}</AppText>
          {item.quantity > 1 ? <AppText variant="caption" color={colors.textMuted}>×{item.quantity}</AppText> : null}
          {equipped ? <AppText variant="caption" color={colors.gold}>equipado</AppText> : null}
        </View>
        {stats.length > 0 ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {stats.map(([key, value]) => `${statLabel(key)} ${formatStatValue(key as CombatStatKey, value ?? 0)}`).join(' · ')}
          </AppText>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {right ? <AppText variant="caption" color={colors.gold}>{right}</AppText> : null}
        {delta !== undefined && delta !== 0 ? (
          <AppText variant="caption" color={delta > 0 ? colors.success : colors.danger}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}
          </AppText>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={onPress}>
      {content}
    </Pressable>
  );
}

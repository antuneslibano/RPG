import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { colors, radius, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from '@/domain/player/attributes';
import { spendAttributePoint } from '@/domain/player/progression';
import { playerStats, refreshResources } from '@/game/playerService';
import { CLASS_BY_ID, ORIGIN_BY_ID } from '@/data/classes';
import { STAT_LABELS, type CombatStatKey } from '@/domain/items/affixes';
import { EQUIPMENT_SLOTS, SLOT_LABELS } from '@/domain/items/item';
import { rarityColors } from '@/design/tokens';

const SHOWN_STATS: CombatStatKey[] = [
  'maxHp', 'maxMana', 'physicalAttack', 'magicAttack', 'defense', 'magicResist',
  'critChance', 'dodgeChance', 'speed', 'hpRegen', 'manaRegen',
];

export function CharacterScreen() {
  const { pop, push } = useNavigation();
  const { state, mutate } = useGame();
  if (!state) return null;

  const stats = playerStats(state);
  const heroClass = CLASS_BY_ID[state.player.classId];
  const origin = ORIGIN_BY_ID[state.player.originId];

  return (
    <Screen title="Personagem" onBack={pop}>
      <ArtFrame
        artKey={state.player.portraitKey}
        height={200}
        label={state.player.name}
        sublabel={`${heroClass.name} · Nível ${state.player.level}${origin ? ` · ${origin.name}` : ''}`}
      />

      <Card>
        <AppText variant="heading">Atributos</AppText>
        {state.player.attributePoints > 0 ? (
          <AppText variant="caption" color={colors.gold} style={{ marginTop: spacing.xs }}>
            {state.player.attributePoints} ponto(s) para distribuir
          </AppText>
        ) : null}
        {ATTRIBUTE_KEYS.map((key) => (
          <View
            key={key}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.md,
              paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{ATTRIBUTE_LABELS[key]}</AppText>
              <AppText variant="caption" color={colors.textMuted}>{ATTRIBUTE_DESCRIPTIONS[key]}</AppText>
            </View>
            <AppText variant="numeric" color={colors.gold}>{state.player.attributes[key]}</AppText>
            {state.player.attributePoints > 0 ? (
              <Button
                label="+"
                compact
                variant="ghost"
                onPress={() => mutate((draft) => {
                  spendAttributePoint(draft.player, key);
                  refreshResources(draft);
                }, ['player'])}
              />
            ) : null}
          </View>
        ))}
      </Card>

      <Card>
        <AppText variant="heading">Atributos derivados</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {SHOWN_STATS.map((key) => (
            <View key={key} style={{ width: '50%', paddingVertical: spacing.sm }}>
              <AppText variant="caption" color={colors.textMuted}>{STAT_LABELS[key]}</AppText>
              <AppText variant="numeric">
                {stats[key]}
                {key === 'critChance' || key === 'dodgeChance' ? '%' : ''}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="heading">Equipamentos</AppText>
          <Button label="Gerenciar" compact variant="ghost" onPress={() => push('equipment')} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {EQUIPMENT_SLOTS.map((slot) => {
            const itemId = state.player.equipment[slot];
            const item = itemId ? state.items[itemId] : null;
            return (
              <View
                key={slot}
                accessible
                accessibilityLabel={`${SLOT_LABELS[slot]}: ${item ? item.name : 'vazio'}`}
                style={{
                  width: '31%', minHeight: 72, borderRadius: radius.md, borderWidth: 1,
                  borderColor: item ? rarityColors[item.rarity] : colors.border,
                  borderStyle: item ? 'solid' : 'dashed',
                  backgroundColor: colors.surfaceSunken, padding: spacing.sm, justifyContent: 'space-between',
                }}
              >
                <AppText variant="caption" color={colors.textMuted} uppercase>{SLOT_LABELS[slot]}</AppText>
                <AppText variant="caption" color={item ? colors.textPrimary : colors.textMuted} numberOfLines={2}>
                  {item ? item.name : '—'}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <AppText variant="heading">Reputação</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Global: {state.player.reputation.global}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          Reputação por cidade e facção aparece nas telas de Cidade e Facções — uma pessoa pode gostar de
          você enquanto a facção dela te odeia.
        </AppText>
      </Card>
    </Screen>
  );
}

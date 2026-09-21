import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { BOSS_BASES, CREATURE_BASES, VARIANT_BY_ID } from '@/data/creatures';
import { CREATURE_FAMILIES, FAMILY_LABELS, type CreatureFamily } from '@/domain/combat/creature';

export function BestiaryScreen() {
  const { pop } = useNavigation();
  const { state } = useGame();
  const [family, setFamily] = useState<CreatureFamily | 'all'>('all');
  if (!state) return null;

  const all = [...CREATURE_BASES, ...BOSS_BASES];
  const shown = family === 'all' ? all : all.filter((base) => base.family === family);
  const discovered = shown.filter((base) => state.bestiary[base.baseId]);

  return (
    <Screen title="Bestiário" onBack={pop}>
      <Card>
        <AppText variant="heading">{Object.keys(state.bestiary).length} de {all.length} descobertas</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Criaturas só aparecem aqui depois de enfrentadas. Variantes contam separadamente.
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          <Chip label="Tudo" selected={family === 'all'} onPress={() => setFamily('all')} />
          {CREATURE_FAMILIES.map((entry) => (
            <Chip key={entry} label={FAMILY_LABELS[entry]} selected={family === entry} onPress={() => setFamily(entry)} />
          ))}
        </View>
      </Card>

      {discovered.length === 0 ? (
        <EmptyState title="Nada registrado" description="Enfrente criaturas para preencher o bestiário." />
      ) : null}

      {shown.map((base) => {
        const entry = state.bestiary[base.baseId];
        if (!entry) {
          return (
            <Card key={base.baseId}>
              <AppText variant="bodyStrong" color={colors.textMuted}>???</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {FAMILY_LABELS[base.family]} · nível {base.levelRange[0]}–{base.levelRange[1]}
              </AppText>
            </Card>
          );
        }
        return (
          <Card key={base.baseId} borderColor={base.isBoss ? colors.danger : colors.border}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="bodyStrong">{base.isBoss ? '☠ ' : ''}{base.name}</AppText>
              <AppText variant="caption" color={colors.textMuted}>{entry.killCount} abatida(s)</AppText>
            </View>
            <AppText variant="caption" color={colors.textMuted}>
              {FAMILY_LABELS[base.family]} · nível máximo visto {entry.highestLevelSeen}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm, fontStyle: 'italic' }}>
              {base.lore}
            </AppText>
            {entry.variantsSeen.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
                {entry.variantsSeen.map((variantId) => (
                  <Chip key={variantId} label={VARIANT_BY_ID[variantId]?.name ?? variantId} selected tone={colors.info} />
                ))}
              </View>
            ) : null}
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Habilidades: {base.abilities.map((ability) => ability.name).join(' · ')}
            </AppText>
          </Card>
        );
      })}
    </Screen>
  );
}

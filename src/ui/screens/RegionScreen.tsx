import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { Chip } from '@/ui/components/Chip';
import { colors, spacing } from '@/design/tokens';
import { useNavigation, useParams } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { BIOME_LABELS, LOCATION_KIND_LABELS, regionLevelLabel } from '@/domain/world/world';
import { CREATURE_BASES } from '@/data/creatures';
import { FAMILY_LABELS, type CreatureFamily } from '@/domain/combat/creature';

export function RegionScreen() {
  const { pop } = useNavigation();
  const { regionId } = useParams<{ regionId: string }>();
  const { state } = useGame();
  if (!state || !regionId) return null;

  const region = state.regions[regionId];
  if (!region) return null;

  const encounters = CREATURE_BASES.filter((base) => base.biomes.includes(region.biome)).slice(0, 12);

  return (
    <Screen title="Região" onBack={pop}>
      <ArtFrame artKey={region.artKey} height={190} label={region.name} sublabel={`${BIOME_LABELS[region.biome]} · ${regionLevelLabel(region)}`} />

      <Card>
        <AppText variant="body" color={colors.textSecondary} style={{ fontStyle: 'italic' }}>{region.lore}</AppText>
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>
          Atmosfera: {region.atmosphere} · clima {region.weather} · perigo {region.dangerLevel}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {region.resources.map((resource) => <Chip key={resource} label={resource} />)}
        </View>
      </Card>

      <Card>
        <AppText variant="heading">Locais</AppText>
        {region.locationIds.map((locationId) => {
          const location = state.locations[locationId];
          const discovered = state.locationStates[locationId]?.discovered;
          if (!location) return null;
          return (
            <View key={locationId} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <AppText variant="bodyStrong" color={discovered ? colors.textPrimary : colors.textMuted}>
                {discovered ? location.name : '???'}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {LOCATION_KIND_LABELS[location.kind]} · nível {location.levelRange[0]}–{location.levelRange[1]}
              </AppText>
            </View>
          );
        })}
      </Card>

      <Card>
        <AppText variant="heading">Encontros</AppText>
        <AppText variant="caption" color={colors.textMuted}>Criaturas comuns neste bioma.</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {encounters.map((creature) => {
            const seen = !!state.bestiary[creature.baseId];
            return (
              <Chip
                key={creature.baseId}
                label={`${creature.name} N${creature.levelRange[0]}-${creature.levelRange[1]}`}
                selected={seen}
                tone={seen ? colors.success : undefined}
              />
            );
          })}
        </View>
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Famílias: {[...new Set(encounters.map((c) => FAMILY_LABELS[c.family as CreatureFamily]))].join(' · ')}
        </AppText>
      </Card>
    </Screen>
  );
}

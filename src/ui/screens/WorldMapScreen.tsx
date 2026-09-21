import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { colors, radius, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { BIOME_LABELS, LOCATION_KIND_LABELS, regionLevelLabel } from '@/domain/world/world';
import { reachableFrom, travelTo } from '@/game/travel';

export function WorldMapScreen() {
  const { pop, push } = useNavigation();
  const { state, mutate, bus } = useGame();
  if (!state) return null;

  const current = state.locations[state.player.currentLocationId]!;
  const kingdom = state.kingdoms[current.kingdomId];
  const neighbours = reachableFrom(state, current.id);

  return (
    <Screen title="Mapas" onBack={pop}>
      <Card>
        <AppText variant="overline" color={colors.textMuted} uppercase>◉ Você está aqui</AppText>
        <AppText variant="title" color={colors.gold}>{current.name}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {LOCATION_KIND_LABELS[current.kind]} · {kingdom?.name ?? ''}
        </AppText>
      </Card>

      <ArtFrame artKey={current.artKey} height={190} label={current.name} sublabel={current.description} />

      <Card>
        <AppText variant="heading">Regiões conhecidas</AppText>
        {Object.values(state.regions).map((region) => {
          const known = region.discovered;
          return (
            <View
              key={region.id}
              style={{
                paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="bodyStrong" color={known ? colors.textPrimary : colors.textMuted}>
                  {known ? region.name : '???'}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>{known ? regionLevelLabel(region) : 'não descoberta'}</AppText>
              </View>
              {known ? (
                <>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {BIOME_LABELS[region.biome]} · clima {region.weather} · perigo {region.dangerLevel}
                  </AppText>
                  <Button
                    label="Ver região"
                    compact
                    variant="ghost"
                    onPress={() => push('region', { regionId: region.id })}
                    style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                  />
                </>
              ) : (
                <AppText variant="caption" color={colors.textMuted}>Explore para revelar.</AppText>
              )}
            </View>
          );
        })}
      </Card>

      <Card>
        <AppText variant="heading">Viajar a partir daqui</AppText>
        <AppText variant="caption" color={colors.textMuted}>Cada viagem consome um dia — e o mundo avança.</AppText>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {neighbours.map((location) => {
            const discovered = state.locationStates[location.id]?.discovered;
            return (
              <Button
                key={location.id}
                label={`${discovered ? location.name : 'Local desconhecido'} · ${LOCATION_KIND_LABELS[location.kind]}`}
                variant="secondary"
                fullWidth
                style={{ borderRadius: radius.md }}
                onPress={() => {
                  mutate((draft) => {
                    travelTo(draft, location.id, bus);
                  }, ['player', 'world', 'memories', 'npcs', 'dungeons']);
                  pop();
                }}
              />
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

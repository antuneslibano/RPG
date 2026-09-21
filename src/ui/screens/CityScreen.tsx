import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { ItemRow } from '@/ui/components/ItemRow';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { ESTABLISHMENT_LABELS, type Establishment } from '@/domain/world/world';
import { buyItem, buyPrice, refreshStock, sellItem, sellPrice } from '@/game/economy';
import { inventoryEntries } from '@/domain/items/inventory';
import { formatGold } from '@/core/util/text';
import { npcFullName } from '@/domain/npc/npc';

export function CityScreen() {
  const { pop, push } = useNavigation();
  const { state, mutate } = useGame();
  const [shop, setShop] = useState<Establishment | null>(null);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  if (!state) return null;
  const location = state.locations[state.player.currentLocationId]!;
  const locationState = state.locationStates[location.id]!;

  const openShop = (establishment: Establishment) => {
    mutate((draft) => {
      const target = draft.locations[location.id]?.establishments.find((entry) => entry.id === establishment.id);
      if (target) refreshStock(draft, target, location.id);
    }, ['world', 'items']);
    setShop(establishment);
    setMode('buy');
  };

  const liveShop = shop ? location.establishments.find((entry) => entry.id === shop.id) ?? null : null;
  const stock = liveShop ? liveShop.stockItemIds.map((id) => state.items[id]).filter((item): item is NonNullable<typeof item> => !!item) : [];
  const sellable = inventoryEntries(state.player, state.items).filter((entry) => !entry.equipped && entry.item.category !== 'quest');

  return (
    <Screen title={location.name} onBack={pop}>
      <Card>
        <AppText variant="heading">{location.name}</AppText>
        <AppText variant="body" color={colors.textSecondary}>{location.description}</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' }}>
          <AppText variant="caption" color={colors.textMuted}>População {locationState.population}</AppText>
          <AppText variant="caption" color={colors.success}>Prosperidade {locationState.prosperity}</AppText>
          <AppText variant="caption" color={colors.warning}>Perigo {locationState.danger}</AppText>
          <AppText variant="caption" color={colors.gold}>
            Reputação {state.player.reputation.byLocation[location.id] ?? 0}
          </AppText>
        </View>
        {locationState.destroyed ? (
          <AppText variant="bodyStrong" color={colors.danger} style={{ marginTop: spacing.sm }}>
            Parte deste lugar foi destruída.
          </AppText>
        ) : null}
      </Card>

      <Button label="Falar com as pessoas" variant="primary" fullWidth onPress={() => push('npcList')} />

      {location.establishments.length === 0 ? (
        <EmptyState title="Sem estabelecimentos" description="Este lugar não tem comércio." />
      ) : (
        <Card>
          <AppText variant="heading">Estabelecimentos</AppText>
          {location.establishments.map((establishment) => {
            const owner = establishment.ownerNpcId ? state.npcs[establishment.ownerNpcId] : null;
            const trades = owner && ['blacksmith', 'alchemist', 'market', 'blackMarket', 'tavern', 'temple'].includes(establishment.kind);
            return (
              <View
                key={establishment.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{establishment.name}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {ESTABLISHMENT_LABELS[establishment.kind]}
                    {owner ? ` · ${npcFullName(owner)}` : ''}
                  </AppText>
                </View>
                {trades ? (
                  <Button label="Negociar" compact variant="ghost" onPress={() => openShop(establishment)} />
                ) : null}
                {owner ? (
                  <Button label="Falar" compact variant="ghost" onPress={() => push('dialogue', { npcId: owner.id })} />
                ) : null}
              </View>
            );
          })}
        </Card>
      )}

      <BottomSheet
        visible={!!liveShop}
        onClose={() => setShop(null)}
        title={liveShop?.name ?? ''}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Comprar" variant={mode === 'buy' ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setMode('buy')} />
            <Button label="Vender" variant={mode === 'sell' ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setMode('sell')} />
          </View>
        }
      >
        <AppText variant="caption" color={colors.gold} style={{ marginBottom: spacing.md }}>
          Suas moedas: {formatGold(state.player.gold)}
        </AppText>

        {mode === 'buy' ? (
          stock.length === 0 ? (
            <EmptyState title="Estoque vazio" description="Volte outro dia." />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {stock.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  right={`${buyPrice(state, item, liveShop!, location.id)}◉`}
                  onPress={() => mutate((draft) => {
                    const target = draft.locations[location.id]?.establishments.find((entry) => entry.id === liveShop!.id);
                    if (target) buyItem(draft, target, item.id, location.id);
                  }, ['player', 'items', 'world'])}
                />
              ))}
            </View>
          )
        ) : sellable.length === 0 ? (
          <EmptyState title="Nada para vender" />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {sellable.map((entry) => (
              <ItemRow
                key={entry.item.id}
                item={entry.item}
                right={`${sellPrice(state, entry.item, liveShop!, location.id)}◉`}
                onPress={() => mutate((draft) => {
                  const target = draft.locations[location.id]?.establishments.find((e) => e.id === liveShop!.id);
                  if (target) sellItem(draft, target, entry.item.id, location.id);
                }, ['player', 'items', 'world'])}
              />
            ))}
          </View>
        )}
      </BottomSheet>
    </Screen>
  );
}

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { EmptyState } from '@/ui/components/States';
import { ItemRow, statLabel } from '@/ui/components/ItemRow';
import { colors, rarityColors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import {
  comparePower, equipItem, filterByCategory, inventoryEntries, inventoryWeightSummary,
  removeItem, sortEntries, unequipItemById, type SortMode,
} from '@/domain/items/inventory';
import { CATEGORY_LABELS, ITEM_CATEGORIES, RARITY_LABELS, type Item, type ItemCategory, isEquippable } from '@/domain/items/item';
import { formatStatValue, type CombatStatKey } from '@/domain/items/affixes';
import { refreshResources } from '@/game/playerService';
import { formatGold } from '@/core/util/text';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'power', label: 'Poder' },
  { id: 'rarity', label: 'Raridade' },
  { id: 'name', label: 'Nome' },
  { id: 'value', label: 'Valor' },
];

export function InventoryScreen() {
  const { pop } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [sort, setSort] = useState<SortMode>('power');
  const [selected, setSelected] = useState<Item | null>(null);

  const entries = useMemo(
    () => (state ? sortEntries(filterByCategory(inventoryEntries(state.player, state.items), category), sort) : []),
    [state, category, sort],
  );

  if (!state) return null;
  const summary = inventoryWeightSummary(inventoryEntries(state.player, state.items));
  const equippedInSlot = selected?.slot ? state.items[state.player.equipment[selected.slot] ?? ''] ?? null : null;
  const isEquipped = selected ? Object.values(state.player.equipment).includes(selected.id) : false;

  return (
    <Screen title="Inventário" onBack={pop}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="heading">{summary.count} item(ns)</AppText>
          <AppText variant="caption" color={colors.gold}>◉ {formatGold(state.player.gold)}</AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          <Chip label="Tudo" selected={category === 'all'} onPress={() => setCategory('all')} />
          {ITEM_CATEGORIES.map((entry) => (
            <Chip key={entry} label={CATEGORY_LABELS[entry]} selected={category === entry} onPress={() => setCategory(entry)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {SORTS.map((entry) => (
            <Chip key={entry.id} label={entry.label} selected={sort === entry.id} onPress={() => setSort(entry.id)} />
          ))}
        </View>
      </Card>

      {entries.length === 0 ? (
        <EmptyState title="Nada aqui" description="Explore, derrote inimigos ou compre itens para preencher o inventário." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {entries.map((entry) => (
            <ItemRow
              key={entry.item.id}
              item={entry.item}
              equipped={entry.equipped}
              onPress={() => setSelected(entry.item)}
              right={`${entry.item.value}◉`}
            />
          ))}
        </View>
      )}

      <BottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        footer={
          selected ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {isEquippable(selected) ? (
                <Button
                  label={isEquipped ? 'Desequipar' : 'Equipar'}
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const id = selected.id;
                    mutate((draft) => {
                      if (Object.values(draft.player.equipment).includes(id)) unequipItemById(draft.player, id);
                      else {
                        const result = equipItem(draft.player, draft.items, id);
                        if (result.ok && selected.slot) bus.emit('ITEM_EQUIPPED', { itemId: id, slot: selected.slot });
                      }
                      refreshResources(draft);
                    }, ['player', 'items']);
                    setSelected(null);
                  }}
                />
              ) : null}
              {selected.consumableEffect ? (
                <Button
                  label="Usar"
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const id = selected.id;
                    const effect = selected.consumableEffect!;
                    mutate((draft) => {
                      const stats = refreshResources(draft);
                      if (effect.kind === 'heal') {
                        draft.player.resources.hp = Math.min(stats.maxHp, draft.player.resources.hp + effect.amount);
                      }
                      if (effect.kind === 'mana') {
                        draft.player.resources.mana = Math.min(stats.maxMana, draft.player.resources.mana + effect.amount);
                      }
                      removeItem(draft.player, draft.items, id, 1);
                    }, ['player', 'items']);
                    setSelected(null);
                  }}
                />
              ) : null}
              <Button
                label="Descartar"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => {
                  const id = selected.id;
                  mutate((draft) => {
                    removeItem(draft.player, draft.items, id, selected.quantity);
                    refreshResources(draft);
                  }, ['player', 'items']);
                  setSelected(null);
                }}
              />
            </View>
          ) : null
        }
      >
        {selected ? (
          <View style={{ gap: spacing.md }}>
            <AppText variant="caption" color={rarityColors[selected.rarity]}>
              {RARITY_LABELS[selected.rarity]} · nível de item {selected.itemLevel}
            </AppText>

            <View style={{ gap: spacing.xs }}>
              {Object.entries(selected.stats).map(([key, value]) => (
                <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="body" color={colors.textSecondary}>{statLabel(key)}</AppText>
                  <AppText variant="bodyStrong" color={colors.success}>
                    {formatStatValue(key as CombatStatKey, value ?? 0)}
                  </AppText>
                </View>
              ))}
            </View>

            {selected.special ? (
              <View>
                <AppText variant="bodyStrong" color={colors.gold}>{selected.special.label}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>{selected.special.description}</AppText>
              </View>
            ) : null}

            {selected.lore ? (
              <AppText variant="caption" color={colors.textMuted} style={{ fontStyle: 'italic' }}>{selected.lore}</AppText>
            ) : null}

            {equippedInSlot && equippedInSlot.id !== selected.id ? (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                <AppText variant="overline" color={colors.textMuted} uppercase>Comparando com o equipado</AppText>
                <AppText variant="body">{equippedInSlot.name}</AppText>
                <AppText
                  variant="bodyStrong"
                  color={comparePower(selected, equippedInSlot) >= 0 ? colors.success : colors.danger}
                >
                  {comparePower(selected, equippedInSlot) >= 0 ? '▲ Melhoria' : '▼ Perda'} de{' '}
                  {Math.abs(Math.round(comparePower(selected, equippedInSlot)))} de poder
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

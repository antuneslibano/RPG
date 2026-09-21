import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { EmptyState } from '@/ui/components/States';
import { ItemRow } from '@/ui/components/ItemRow';
import { colors, rarityColors, radius, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { EQUIPMENT_SLOTS, SLOT_LABELS, type EquipmentSlot } from '@/domain/items/item';
import { comparePower, equipItem, inventoryEntries, unequipSlot } from '@/domain/items/inventory';
import { refreshResources } from '@/game/playerService';

export function EquipmentScreen() {
  const { pop } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [slot, setSlot] = useState<EquipmentSlot | null>(null);
  if (!state) return null;

  const candidates = slot
    ? inventoryEntries(state.player, state.items).filter((entry) => entry.item.slot === slot && !entry.equipped)
    : [];
  const equipped = slot ? state.items[state.player.equipment[slot] ?? ''] ?? null : null;

  return (
    <Screen title="Equipamento" onBack={pop}>
      <Card>
        <AppText variant="heading">12 espaços</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Toque num espaço para comparar e trocar. Os atributos derivados são recalculados na hora.
        </AppText>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {EQUIPMENT_SLOTS.map((entry) => {
          const itemId = state.player.equipment[entry];
          const item = itemId ? state.items[itemId] : null;
          return (
            <Button
              key={entry}
              label={`${SLOT_LABELS[entry]}: ${item ? item.name : '—'}`}
              variant={item ? 'secondary' : 'ghost'}
              onPress={() => setSlot(entry)}
              style={{
                width: '48%',
                borderColor: item ? rarityColors[item.rarity] : colors.border,
                borderRadius: radius.md,
              }}
            />
          );
        })}
      </View>

      <BottomSheet
        visible={!!slot}
        onClose={() => setSlot(null)}
        title={slot ? SLOT_LABELS[slot] : ''}
        footer={
          equipped && slot ? (
            <Button
              label="Desequipar"
              variant="danger"
              fullWidth
              onPress={() => {
                const target = slot;
                mutate((draft) => {
                  unequipSlot(draft.player, target);
                  refreshResources(draft);
                }, ['player']);
                setSlot(null);
              }}
            />
          ) : null
        }
      >
        <View style={{ gap: spacing.md }}>
          {equipped ? (
            <View>
              <AppText variant="overline" color={colors.textMuted} uppercase>Equipado</AppText>
              <ItemRow item={equipped} equipped />
            </View>
          ) : null}

          <AppText variant="overline" color={colors.textMuted} uppercase>Alternativas</AppText>
          {candidates.length === 0 ? (
            <EmptyState title="Nenhuma alternativa" description="Você ainda não tem outro item para este espaço." />
          ) : (
            candidates.map((entry) => (
              <ItemRow
                key={entry.item.id}
                item={entry.item}
                delta={comparePower(entry.item, equipped)}
                onPress={() => {
                  const id = entry.item.id;
                  mutate((draft) => {
                    const result = equipItem(draft.player, draft.items, id);
                    if (result.ok && slot) bus.emit('ITEM_EQUIPPED', { itemId: id, slot });
                    refreshResources(draft);
                  }, ['player', 'items']);
                  setSlot(null);
                }}
              />
            ))
          )}
        </View>
      </BottomSheet>
    </Screen>
  );
}

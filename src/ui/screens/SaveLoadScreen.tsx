import { useEffect } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { CURRENT_SCHEMA_VERSION } from '@/persistence/saveService';

export function SaveLoadScreen() {
  const { pop, reset } = useNavigation();
  const { slots, loadGame, saveGame, deleteSlot, refreshSlots, state, busy, lastError } = useGame();

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  return (
    <Screen title="Saves" onBack={pop}>
      <Card>
        <AppText variant="heading">Persistência local</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Offline-first, sem servidor. O save é gravado por partições com checksum e backup —
          esquema versão {CURRENT_SCHEMA_VERSION}, com migrações automáticas.
        </AppText>
      </Card>

      {lastError ? <AppText variant="caption" color={colors.warning}>{lastError}</AppText> : null}

      {slots.length === 0 ? (
        <EmptyState title="Nenhum save" description="Comece um novo jogo para criar o primeiro." />
      ) : (
        slots.map((slot) => (
          <Card key={slot.slotId}>
            <AppText variant="bodyStrong">{slot.heroName} · Nv. {slot.level} {slot.className}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {slot.locationName} · Ano {slot.gameYear}, dia {slot.gameDay}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Semente {slot.seedLabel} · atualizado {new Date(slot.updatedAt).toLocaleString('pt-BR')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                label="Carregar"
                variant="primary"
                compact
                style={{ flex: 1 }}
                loading={busy}
                onPress={async () => {
                  const ok = await loadGame(slot.slotId);
                  if (ok) reset('home');
                }}
              />
              <Button label="Apagar" variant="danger" compact onPress={() => void deleteSlot(slot.slotId)} />
            </View>
          </Card>
        ))
      )}

      {state ? (
        <Button label="Salvar agora" variant="secondary" fullWidth onPress={() => void saveGame(['player', 'world', 'items', 'quests', 'memories', 'npcs', 'chronicle', 'dungeons', 'factions', 'economy', 'settings'])} />
      ) : null}
    </Screen>
  );
}

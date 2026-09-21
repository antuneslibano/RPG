import { Pressable, Switch, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { setHapticsEnabled } from '@/ui/components/haptics';

const SCALES = [0.9, 1, 1.15, 1.3];

/** In a release build the dev panel hides behind a long press on the version. */
const isDevBuild = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

function Row({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" color={colors.textMuted}>{description}</AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.goldSoft }}
        thumbColor={value ? colors.gold : colors.textMuted}
      />
    </View>
  );
}

export function SettingsScreen() {
  const { pop, push } = useNavigation();
  const { state, mutate } = useGame();

  if (!state) {
    return (
      <Screen title="Ajustes" onBack={pop}>
        <Card>
          <AppText variant="body" color={colors.textSecondary}>
            Os ajustes ficam disponíveis com um jogo carregado.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Ajustes" onBack={pop}>
      <Card>
        <AppText variant="heading">Acessibilidade</AppText>
        <Row
          label="Reduzir animações"
          description="Desativa transições e microinterações."
          value={state.settings.reduceAnimations}
          onChange={(next) => mutate((draft) => { draft.settings.reduceAnimations = next; }, ['settings'])}
        />
        <Row
          label="Feedback háptico"
          description="Vibração curta em ações e resultados."
          value={state.settings.hapticsEnabled}
          onChange={(next) => mutate((draft) => {
            draft.settings.hapticsEnabled = next;
            setHapticsEnabled(next);
          }, ['settings'])}
        />
        <Row
          label="Números de dano"
          description="Mostra valores numéricos no registro de combate."
          value={state.settings.showDamageNumbers}
          onChange={(next) => mutate((draft) => { draft.settings.showDamageNumbers = next; }, ['settings'])}
        />
        <AppText variant="bodyStrong" style={{ marginTop: spacing.md }}>Escala da interface</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {SCALES.map((scale) => (
            <Chip
              key={scale}
              label={`${Math.round(scale * 100)}%`}
              selected={state.settings.uiScale === scale}
              onPress={() => mutate((draft) => { draft.settings.uiScale = scale; }, ['settings'])}
            />
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="heading">Este mundo</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          Semente: {state.world.seedLabel} · Ano {state.world.gameYear}, dia {state.world.gameDay}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {Object.keys(state.npcs).length} NPCs · {state.events.length} acontecimentos · {state.rumors.length} rumores
        </AppText>
      </Card>

      <Button label="Saves" variant="ghost" fullWidth onPress={() => push('saveLoad')} />

      {/* Hidden panel: only reachable in development builds, never in a release. */}
      {isDevBuild ? (
        <Button label="Ferramentas de desenvolvimento" variant="ghost" fullWidth onPress={() => push('devPanel')} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Versão"
          onLongPress={() => push('devPanel')}
          delayLongPress={1500}
          style={{ paddingVertical: spacing.md, alignItems: 'center' }}
        >
          <AppText variant="caption" color={colors.textMuted}>RPG · versão 0.1.0</AppText>
        </Pressable>
      )}
    </Screen>
  );
}

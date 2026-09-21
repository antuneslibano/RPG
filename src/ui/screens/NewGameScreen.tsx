import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { colors, radius, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { randomSeedLabel } from '@/game/newGame';
import { normalizeSeedLabel } from '@/core/rng/random';

export function NewGameScreen() {
  const { push, pop } = useNavigation();
  const [seed, setSeed] = useState(randomSeedLabel());

  return (
    <Screen title="Novo jogo" onBack={pop}>
      <Card>
        <AppText variant="heading">Semente do mundo</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          A semente define geografia, cidades, NPCs iniciais, facções e os primeiros acontecimentos.
          A partir daí, o mundo diverge conforme as suas decisões.
        </AppText>
        <TextInput
          accessibilityLabel="Semente do mundo"
          value={seed}
          onChangeText={setSeed}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="ex.: verdalia-7f3a"
          placeholderTextColor={colors.textMuted}
          style={{
            marginTop: spacing.md,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            color: colors.textPrimary,
            backgroundColor: colors.surfaceSunken,
            fontSize: 16,
          }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button label="Sortear" variant="ghost" compact onPress={() => setSeed(randomSeedLabel())} />
          <AppText variant="caption" color={colors.textMuted} style={{ alignSelf: 'center' }}>
            será normalizada para “{normalizeSeedLabel(seed)}”
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="heading">O que é persistente</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          NPCs lembram do que você fez. Problemas ignorados pioram. Escolhas mudam preços, reputação
          e quem estará disposto a te ajudar depois.
        </AppText>
      </Card>

      <Button
        label="Criar herói"
        variant="primary"
        fullWidth
        onPress={() => push('characterCreation', { seed: normalizeSeedLabel(seed) })}
      />
    </Screen>
  );
}

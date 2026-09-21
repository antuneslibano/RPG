import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { ItemRow } from '@/ui/components/ItemRow';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation, useParams } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { useTheme } from '@/ui/components/ThemeProvider';

interface LootParams extends Record<string, unknown> {
  xp: number;
  gold: number;
  levels: number;
  itemIds: string;
  fromDungeon: boolean;
}

export function LootScreen() {
  const { replace } = useNavigation();
  const params = useParams<LootParams>();
  const { state } = useGame();
  const theme = useTheme();
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(reveal, {
      toValue: 1,
      useNativeDriver: true,
      speed: theme.reduceAnimations ? 40 : 12,
      bounciness: theme.reduceAnimations ? 0 : 8,
    }).start();
  }, [reveal, theme]);

  if (!state) return null;
  const itemIds = (params.itemIds ?? '').split(',').filter(Boolean);
  const items = itemIds.map((id) => state.items[id]).filter((item): item is NonNullable<typeof item> => !!item);
  const levels = Number(params.levels ?? 0);

  return (
    <Screen title="Espólios">
      <Animated.View style={{ transform: [{ scale: reveal }], opacity: reveal }}>
        <Card raised borderColor={colors.gold}>
          <AppText variant="display" color={colors.gold} align="center">Vitória</AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textMuted}>Experiência</AppText>
              <AppText variant="title" color={colors.xp}>+{params.xp ?? 0}</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textMuted}>Moedas</AppText>
              <AppText variant="title" color={colors.gold}>+{params.gold ?? 0}</AppText>
            </View>
          </View>
          {levels > 0 ? (
            <AppText variant="heading" color={colors.success} align="center" style={{ marginTop: spacing.md }}>
              ✦ Nível {state.player.level}! +{levels * 3} atributos, +{levels} habilidade
            </AppText>
          ) : null}
        </Card>
      </Animated.View>

      {items.length === 0 ? (
        <EmptyState title="Nenhum item desta vez" description="Nem toda vitória rende despojos." />
      ) : (
        <Card>
          <AppText variant="heading">Itens obtidos</AppText>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {items.map((item) => <ItemRow key={item.id} item={item} right={`${item.value}◉`} />)}
          </View>
        </Card>
      )}

      <Button
        label={params.fromDungeon ? 'Continuar na masmorra' : 'Voltar'}
        variant="primary"
        fullWidth
        onPress={() => replace(params.fromDungeon ? 'dungeon' : 'home')}
      />
    </Screen>
  );
}

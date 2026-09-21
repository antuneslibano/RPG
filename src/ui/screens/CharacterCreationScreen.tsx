import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Screen } from '@/ui/components/Screen';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { colors, radius, spacing } from '@/design/tokens';
import { useNavigation, useParams } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { HERO_CLASSES, ORIGINS, type ClassId } from '@/data/classes';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, ATTRIBUTE_SHORT, type AttributeKey, type Attributes } from '@/domain/player/attributes';
import { BALANCE } from '@/domain/player/balance';
import type { Presentation } from '@/domain/player/player';

const PRESENTATIONS: { id: Presentation; label: string }[] = [
  { id: 'masculine', label: 'Masculina' },
  { id: 'feminine', label: 'Feminina' },
  { id: 'androgynous', label: 'Andrógina' },
];

export function CharacterCreationScreen() {
  const { pop, reset } = useNavigation();
  const { seed } = useParams<{ seed: string }>();
  const { startNewGame, busy } = useGame();

  const [name, setName] = useState('');
  const [classId, setClassId] = useState<ClassId>('druid');
  const [originId, setOriginId] = useState(ORIGINS[0]!.id);
  const [presentation, setPresentation] = useState<Presentation>('androgynous');
  const [allocated, setAllocated] = useState<Partial<Attributes>>({});

  const heroClass = useMemo(() => HERO_CLASSES.find((entry) => entry.id === classId)!, [classId]);
  const spent = ATTRIBUTE_KEYS.reduce((sum, key) => sum + (allocated[key] ?? 0), 0);
  const remaining = BALANCE.startingAttributePoints - spent;

  const adjust = (key: AttributeKey, delta: number) => {
    setAllocated((current) => {
      const value = (current[key] ?? 0) + delta;
      if (value < 0 || (delta > 0 && remaining <= 0)) return current;
      return { ...current, [key]: value };
    });
  };

  return (
    <Screen title="Criação do herói" onBack={pop}>
      <ArtFrame artKey={heroClass.portraitKey} height={170} label={heroClass.name} sublabel={heroClass.tagline} />

      <Card>
        <AppText variant="overline" color={colors.textMuted} uppercase>Nome</AppText>
        <TextInput
          accessibilityLabel="Nome do herói"
          value={name}
          onChangeText={setName}
          placeholder="Como vão te chamar?"
          placeholderTextColor={colors.textMuted}
          maxLength={18}
          style={{
            marginTop: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md,
            paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary,
            backgroundColor: colors.surfaceSunken, fontSize: 16,
          }}
        />
        <AppText variant="overline" color={colors.textMuted} uppercase style={{ marginTop: spacing.lg }}>Apresentação</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {PRESENTATIONS.map((entry) => (
            <Chip key={entry.id} label={entry.label} selected={presentation === entry.id} onPress={() => setPresentation(entry.id)} />
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="heading">Classe</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {HERO_CLASSES.map((entry) => (
            <Chip
              key={entry.id}
              label={entry.playable ? entry.name : `${entry.name} (prévia)`}
              selected={classId === entry.id}
              onPress={() => setClassId(entry.id)}
            />
          ))}
        </View>
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>{heroClass.identity}</AppText>
        <AppText variant="caption" color={colors.success} style={{ marginTop: spacing.sm }}>
          Forças: {heroClass.strengths.join(' · ')}
        </AppText>
        <AppText variant="caption" color={colors.warning}>Fraquezas: {heroClass.weaknesses.join(' · ')}</AppText>
        {!heroClass.playable ? (
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            Esta classe está estruturada, mas a árvore completa ainda não foi balanceada. O Druida é a
            classe completa deste momento do desenvolvimento.
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">Origem</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {ORIGINS.map((origin) => (
            <Chip key={origin.id} label={origin.name} selected={originId === origin.id} onPress={() => setOriginId(origin.id)} />
          ))}
        </View>
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {ORIGINS.find((origin) => origin.id === originId)?.description}
        </AppText>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="heading">Atributos</AppText>
          <AppText variant="caption" color={remaining > 0 ? colors.gold : colors.textMuted}>
            {remaining} ponto(s) livres
          </AppText>
        </View>
        {ATTRIBUTE_KEYS.map((key) => {
          const total = heroClass.baseAttributes[key] + (allocated[key] ?? 0);
          return (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{ATTRIBUTE_LABELS[key]}</AppText>
                <AppText variant="caption" color={colors.textMuted}>{ATTRIBUTE_SHORT[key]}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reduzir ${ATTRIBUTE_LABELS[key]}`}
                hitSlop={10}
                onPress={() => adjust(key, -1)}
              >
                <AppText variant="title" color={colors.textSecondary}>−</AppText>
              </Pressable>
              <AppText variant="numeric" color={colors.gold} style={{ minWidth: 28, textAlign: 'center' }}>{total}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Aumentar ${ATTRIBUTE_LABELS[key]}`}
                hitSlop={10}
                onPress={() => adjust(key, 1)}
              >
                <AppText variant="title" color={remaining > 0 ? colors.gold : colors.textMuted}>+</AppText>
              </Pressable>
            </View>
          );
        })}
      </Card>

      <Button
        label="Começar a jornada"
        variant="primary"
        fullWidth
        loading={busy}
        onPress={async () => {
          await startNewGame({
            heroName: name,
            classId,
            originId,
            presentation,
            allocatedAttributes: allocated,
            ...(seed ? { seedLabel: seed } : {}),
          });
          reset('home');
        }}
      />
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/States';
import { colors, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { QUEST_TYPE_LABELS, isQuestComplete, questProgress, type QuestState } from '@/domain/quest/quest';
import { abandonQuest, chooseQuestBranch, completeQuest } from '@/game/questFlow';

const FILTERS: { id: QuestState | 'all'; label: string }[] = [
  { id: 'active', label: 'Ativas' },
  { id: 'offered', label: 'Ofertadas' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'failed', label: 'Fracassadas' },
  { id: 'all', label: 'Tudo' },
];

export function QuestJournalScreen() {
  const { pop } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [filter, setFilter] = useState<QuestState | 'all'>('active');
  const [reward, setReward] = useState<string | null>(null);
  if (!state) return null;

  const quests = Object.values(state.quests).filter((quest) => filter === 'all' || quest.state === filter);

  return (
    <Screen title="Missões" onBack={pop}>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {FILTERS.map((entry) => (
            <Chip key={entry.id} label={entry.label} selected={filter === entry.id} onPress={() => setFilter(entry.id)} />
          ))}
        </View>
      </Card>

      {reward ? <AppText variant="caption" color={colors.success}>{reward}</AppText> : null}

      {quests.length === 0 ? (
        <EmptyState
          title="Nenhuma missão aqui"
          description="Converse com as pessoas: missões nascem dos problemas reais do mundo."
        />
      ) : (
        quests.map((quest) => {
          const giver = quest.giverNpcId ? state.npcs[quest.giverNpcId] : null;
          const progress = questProgress(quest);
          const ready = quest.state === 'active' && isQuestComplete(quest);
          return (
            <Card key={quest.id} borderColor={ready ? colors.success : colors.border}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="overline" color={colors.textMuted} uppercase>
                  {QUEST_TYPE_LABELS[quest.type]} · nv {quest.level}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {progress.done}/{progress.total}
                </AppText>
              </View>
              <AppText variant="heading">{quest.title}</AppText>
              {giver ? <AppText variant="caption" color={colors.textMuted}>Pedido por {giver.name}</AppText> : null}
              <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>{quest.briefing}</AppText>

              <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                {quest.objectives.map((objective) => (
                  <AppText
                    key={objective.id}
                    variant="caption"
                    color={objective.done ? colors.success : colors.textSecondary}
                  >
                    {objective.done ? '✓' : '•'} {objective.description} ({objective.current}/{objective.required})
                    {objective.optional ? ' — opcional' : ''}
                  </AppText>
                ))}
              </View>

              {quest.causeRevealed ? (
                <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
                  <AppText variant="overline" color={colors.gold} uppercase>Causa descoberta</AppText>
                  <AppText variant="body" color={colors.textSecondary}>{quest.hiddenCause}</AppText>
                </View>
              ) : quest.state === 'active' ? (
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
                  Há uma razão por trás disso. Investigue para descobrir.
                </AppText>
              ) : null}

              {quest.choices.length > 0 && !quest.chosenChoiceId && quest.state === 'active' ? (
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <AppText variant="overline" color={colors.textMuted} uppercase>Decisão</AppText>
                  {quest.choices.map((choice) => (
                    <Button
                      key={choice.id}
                      label={choice.label}
                      variant="secondary"
                      fullWidth
                      onPress={() => mutate(
                        (draft) => chooseQuestBranch(draft, quest.id, choice.id, bus),
                        ['quests', 'memories', 'world', 'factions', 'player'],
                      )}
                    />
                  ))}
                </View>
              ) : null}

              {quest.chosenChoiceId ? (
                <AppText variant="caption" color={colors.info} style={{ marginTop: spacing.sm }}>
                  Você escolheu: {quest.choices.find((choice) => choice.id === quest.chosenChoiceId)?.label}
                </AppText>
              ) : null}

              {quest.state === 'active' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    label={ready ? 'Concluir' : 'Em andamento'}
                    variant={ready ? 'primary' : 'ghost'}
                    disabled={!ready}
                    style={{ flex: 1 }}
                    onPress={() => {
                      mutate((draft) => {
                        const result = completeQuest(draft, quest.id, bus);
                        if (result.ok) {
                          setReward(`+${result.xp} XP, +${result.gold}◉${result.levelsGained > 0 ? `, subiu ${result.levelsGained} nível(is)!` : ''}`);
                        }
                      }, ['quests', 'player', 'items', 'memories', 'world', 'chronicle']);
                    }}
                  />
                  <Button
                    label="Abandonar"
                    variant="danger"
                    compact
                    onPress={() => mutate((draft) => abandonQuest(draft, quest.id, bus), ['quests', 'memories', 'world'])}
                  />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

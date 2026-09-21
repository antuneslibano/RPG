import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { ArtFrame } from '@/ui/components/ArtFrame';
import { Chip } from '@/ui/components/Chip';
import { colors, spacing } from '@/design/tokens';
import { useNavigation, useParams } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { talkTo, type Conversation } from '@/game/npcFlow';
import { acceptQuest } from '@/game/questFlow';
import { npcFullName } from '@/domain/npc/npc';
import { OCCUPATION_BY_ID } from '@/data/npcContent';
import { MEMORY_TYPE_LABELS } from '@/domain/narrative/memory';
import { QUEST_TYPE_LABELS } from '@/domain/quest/quest';

const KIND_COLOR: Record<string, string> = {
  greeting: colors.textPrimary,
  memory: colors.gold,
  rumor: colors.info,
  quest: colors.textPrimary,
  secret: colors.warning,
  closing: colors.textSecondary,
};

export function DialogueScreen() {
  const { pop, push } = useNavigation();
  const { npcId } = useParams<{ npcId: string }>();
  const { state, mutate, narrative, bus } = useGame();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Talking is a world event, so it must fire exactly once per visit — never
  // again on a re-render caused by the state it just changed.
  const greetedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!npcId || greetedRef.current === npcId) return;
    greetedRef.current = npcId;
    mutate((draft) => {
      const result = talkTo(draft, npcId, narrative, bus);
      setConversation(result);
    }, ['npcs', 'memories', 'quests', 'world']);
  }, [npcId, mutate, narrative, bus]);

  if (!state || !conversation) return null;
  const { npc, lines, offeredQuest, remembered } = conversation;

  return (
    <Screen title="Diálogo" onBack={pop}>
      <ArtFrame
        artKey={npc.portraitKey}
        height={150}
        label={npcFullName(npc)}
        sublabel={`${OCCUPATION_BY_ID[npc.occupationId]?.name ?? 'morador'} · ${conversation.attitudeLabel}`}
      />

      <Card>
        {lines.map((line) => (
          <View key={line.id} style={{ paddingVertical: spacing.sm }}>
            <AppText variant="body" color={KIND_COLOR[line.kind] ?? colors.textPrimary}>
              {line.kind === 'memory' ? '❧ ' : line.kind === 'rumor' ? '☍ ' : line.kind === 'secret' ? '✦ ' : ''}
              {line.text}
            </AppText>
          </View>
        ))}
      </Card>

      {remembered.length > 0 ? (
        <Card>
          <AppText variant="overline" color={colors.textMuted} uppercase>O que {npc.name} lembra</AppText>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {remembered.map((memory) => (
              <View key={memory.id} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <Chip label={MEMORY_TYPE_LABELS[memory.memoryType]} />
                <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
                  {memory.summary} (dia {memory.createdDay}
                  {memory.permanent ? ', permanente' : memory.tier === 'summarized' ? ', resumida' : ''})
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {offeredQuest ? (
        <Card borderColor={colors.gold}>
          <AppText variant="overline" color={colors.gold} uppercase>
            {QUEST_TYPE_LABELS[offeredQuest.type]}
          </AppText>
          <AppText variant="heading">{offeredQuest.title}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {offeredQuest.briefing}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            Contexto: {offeredQuest.worldContextSummary}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {offeredQuest.relationshipContext}
          </AppText>
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            {offeredQuest.objectives.map((objective) => (
              <AppText key={objective.id} variant="caption" color={colors.textSecondary}>
                • {objective.description}{objective.required > 1 ? ` (0/${objective.required})` : ''}
                {objective.optional ? ' — opcional' : ''}
              </AppText>
            ))}
          </View>
          <AppText variant="caption" color={colors.gold} style={{ marginTop: spacing.md }}>
            Recompensa: {offeredQuest.rewards.gold}◉ · {offeredQuest.rewards.xp} XP
          </AppText>
          {offeredQuest.state === 'offered' && !accepted ? (
            <Button
              label="Aceitar missão"
              variant="primary"
              fullWidth
              style={{ marginTop: spacing.md }}
              onPress={() => {
                mutate((draft) => acceptQuest(draft, offeredQuest.id, bus), ['quests']);
                setAccepted(true);
              }}
            />
          ) : (
            <AppText variant="caption" color={colors.success} style={{ marginTop: spacing.md }}>
              Missão ativa. Consulte o diário.
            </AppText>
          )}
        </Card>
      ) : null}

      <Button label="Ver missões" variant="ghost" fullWidth onPress={() => push('questJournal')} />
    </Screen>
  );
}

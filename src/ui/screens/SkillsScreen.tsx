import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/States';
import { colors, radius, spacing } from '@/design/tokens';
import { useNavigation } from '@/shell/navigation';
import { useGame } from '@/shell/GameProvider';
import { SKILL_TREES, CLASS_BY_ID } from '@/data/classes';
import { canUnlock, skillManaCost, type SkillNode } from '@/domain/skills/skill';
import { spendSkillPoint } from '@/domain/player/progression';
import { refreshResources } from '@/game/playerService';

const KIND_LABELS: Record<SkillNode['kind'], string> = {
  active: 'Ativa', passive: 'Passiva', modifier: 'Modificador', ultimate: 'Suprema',
};

export function SkillsScreen() {
  const { pop } = useNavigation();
  const { state, mutate, bus } = useGame();
  const [branch, setBranch] = useState<string | null>(null);
  if (!state) return null;

  const tree = SKILL_TREES[state.player.classId];
  const heroClass = CLASS_BY_ID[state.player.classId];
  const nodes = branch ? tree.nodes.filter((node) => node.branch === branch) : tree.nodes;

  return (
    <Screen title="Habilidades" onBack={pop}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="heading">{heroClass.name}</AppText>
          <AppText variant="caption" color={state.player.skillPoints > 0 ? colors.gold : colors.textMuted}>
            {state.player.skillPoints} ponto(s)
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          <Chip label="Tudo" selected={branch === null} onPress={() => setBranch(null)} />
          {tree.branches.map((entry) => (
            <Chip key={entry.id} label={entry.name} selected={branch === entry.id} onPress={() => setBranch(entry.id)} />
          ))}
        </View>
        {branch ? (
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            {tree.branches.find((entry) => entry.id === branch)?.description}
          </AppText>
        ) : null}
      </Card>

      {nodes.length === 0 ? (
        <EmptyState
          title="Árvore em desenvolvimento"
          description={`A árvore completa de ${heroClass.name} ainda não foi balanceada. O Druida está completo.`}
        />
      ) : null}

      {nodes.map((node) => {
        const rank = state.player.skillRanks[node.id] ?? 0;
        const check = canUnlock(node, state.player.skillRanks, state.player.level, state.player.skillPoints);
        return (
          <Card key={node.id} borderColor={rank > 0 ? colors.gold : colors.border}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View
                style={{
                  width: 44, height: 44, borderRadius: radius.md, borderWidth: 1,
                  borderColor: rank > 0 ? colors.gold : colors.border,
                  alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSunken,
                }}
              >
                <AppText variant="heading" color={rank > 0 ? colors.gold : colors.textMuted}>✹</AppText>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="bodyStrong">{node.name}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>{rank}/{node.maxRank}</AppText>
                </View>
                <AppText variant="caption" color={colors.textMuted}>
                  {KIND_LABELS[node.kind]} · requer nível {node.requiredLevel}
                  {node.manaCost > 0 ? ` · ${skillManaCost(node, Math.max(1, rank))} mana` : ''}
                  {node.cooldown > 0 ? ` · recarga ${node.cooldown}` : ''}
                </AppText>
                <AppText variant="body" color={colors.textSecondary}>{node.description}</AppText>
                {node.requires.length > 0 ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    Requer: {node.requires.map((req) => `${tree.nodes.find((n) => n.id === req.skillId)?.name ?? req.skillId} ${req.rank}`).join(', ')}
                  </AppText>
                ) : null}
              </View>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={rank === 0 ? 'Desbloquear' : `Melhorar (rank ${rank + 1})`}
                variant={check.ok ? 'primary' : 'ghost'}
                disabled={!check.ok}
                compact
                onPress={() => mutate((draft) => {
                  const result = spendSkillPoint(draft.player, node);
                  if (result.ok) {
                    bus.emit('SKILL_UNLOCKED', { skillId: node.id, rank: result.rank });
                    refreshResources(draft);
                  }
                }, ['player'])}
              />
              {!check.ok && check.reason ? (
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs }}>{check.reason}</AppText>
              ) : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

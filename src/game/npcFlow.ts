import type { EventBus } from '@/core/events/eventBus';
import type { NpcId } from '@/core/ids/ids';
import type { GameState } from '@/domain/world/gameState';
import type { NPC } from '@/domain/npc/npc';
import type { Quest } from '@/domain/quest/quest';
import { recordWorldEvent } from '@/narrative/eventService';
import { recallMemories, relationshipWith } from '@/narrative/memoryService';
import { describeRelationship, ATTITUDE_LABELS, type NPCMemory } from '@/domain/narrative/memory';
import type { DialogueLine, NarrativeProvider } from '@/narrative/narrativeProvider';
import { offerQuestFrom, progressObjectives } from '@/game/questFlow';

export interface Conversation {
  npc: NPC;
  lines: DialogueLine[];
  offeredQuest: Quest | null;
  attitudeLabel: string;
  familiarity: number;
  /** What this NPC remembers about you, shown in the UI as proof of memory. */
  remembered: NPCMemory[];
}

/**
 * Talking is itself an event: the NPC remembers the visit, which is what makes
 * "he still remembered" possible hours later.
 */
export function talkTo(
  state: GameState,
  npcId: NpcId,
  provider: NarrativeProvider,
  bus?: EventBus,
): Conversation | null {
  const npc = state.npcs[npcId];
  if (!npc || !npc.alive) return null;

  const firstMeeting = npc.lastSpokeDay < 0;
  const offeredQuest = offerQuestFrom(state, npcId, bus);
  const lines = provider.buildDialogue({ state, npc, offeredQuest });
  const remembered = recallMemories(state, npcId, 3);

  if (firstMeeting) {
    bus?.emit('NPC_MET', { npcId, locationId: npc.currentLocationId });
    recordWorldEvent(state, {
      type: 'playerArrived',
      locationId: npc.currentLocationId,
      participantIds: [npcId],
      cause: 'primeiro encontro',
      consequences: [],
      importance: 18,
      summary: `Você conheceu ${npc.name}.`,
      tags: ['npc', 'meeting'],
      memory: { memoryType: 'metPlayer', emotionalWeight: 3, trustImpact: 2, fearImpact: 0, respectImpact: 1 },
    }, bus);
  }

  npc.lastSpokeDay = state.world.gameDay;
  npc.dialogueStage = Math.min(npc.dialogueStage + 1, 3);
  progressObjectives(state, { kind: 'talk', targetRef: npcId }, bus);

  const relationship = relationshipWith(state, npcId);
  const { attitude } = describeRelationship(relationship);

  return {
    npc,
    lines,
    offeredQuest,
    attitudeLabel: ATTITUDE_LABELS[attitude],
    familiarity: relationship.familiarity,
    remembered,
  };
}

/** A gift is the cheapest way to change how someone feels about you. */
export function giveGift(state: GameState, npcId: NpcId, itemValue: number, itemName: string, bus?: EventBus): boolean {
  const npc = state.npcs[npcId];
  if (!npc || !npc.alive) return false;
  const weight = Math.min(30, Math.max(4, Math.round(itemValue / 12)));

  recordWorldEvent(state, {
    type: 'giftGiven',
    locationId: npc.currentLocationId,
    participantIds: [npcId],
    cause: 'presente',
    consequences: [],
    importance: 22 + weight,
    summary: `Você deu ${itemName} a ${npc.name}.`,
    tags: ['npc', 'gift'],
    memory: { memoryType: 'gift', emotionalWeight: weight, trustImpact: weight * 0.6, fearImpact: 0, respectImpact: weight * 0.3 },
  }, bus);
  return true;
}

import type { LocationId, NpcId, QuestId } from '@/core/ids/ids';

export const QUEST_TYPES = [
  'exploration', 'investigation', 'hunt', 'rescue', 'escort', 'gather',
  'negotiation', 'assassination', 'defense', 'dungeon', 'mystery',
  'faction', 'personal', 'worldEvent',
] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  exploration: 'Exploração', investigation: 'Investigação', hunt: 'Caça', rescue: 'Resgate',
  escort: 'Escolta', gather: 'Coleta', negotiation: 'Negociação', assassination: 'Assassinato',
  defense: 'Defesa', dungeon: 'Masmorra', mystery: 'Mistério', faction: 'Facção',
  personal: 'Pessoal', worldEvent: 'Acontecimento',
};

export type QuestState = 'offered' | 'active' | 'completed' | 'failed' | 'expired';

export type ObjectiveKind = 'kill' | 'collect' | 'visit' | 'talk' | 'clearDungeon' | 'investigate' | 'choose';

export interface QuestObjective {
  id: string;
  kind: ObjectiveKind;
  description: string;
  targetRef: string;
  required: number;
  current: number;
  done: boolean;
  optional: boolean;
  /** Set when the objective reveals the cause behind the surface task. */
  revealsCause?: boolean;
}

export interface QuestReward {
  gold: number;
  xp: number;
  itemIds: string[];
  reputation: { scope: 'global' | 'location' | 'faction'; targetId: string | null; amount: number }[];
  relationship: { npcId: NpcId; trust: number; affinity: number } | null;
}

export interface QuestChoice {
  id: string;
  label: string;
  description: string;
  consequenceSummary: string;
  /** Applied to world state when the player picks this branch. */
  effects: {
    reputation?: { scope: 'global' | 'location' | 'faction'; targetId: string | null; amount: number }[];
    relationship?: { npcId: NpcId; trust: number; affinity: number; hostility?: number }[];
    problemResolvedId?: string;
    worldEventType?: string;
  };
}

export interface Quest {
  id: QuestId;
  title: string;
  /** The combinatorial slots that produced this quest. */
  template: string;
  type: QuestType;
  giverNpcId: NpcId | null;
  motivation: string;
  problem: string;
  locationId: LocationId;
  targetRef: string;
  complication: string;
  worldContextSummary: string;
  relationshipContext: string;
  consequence: string;
  /** The reason behind the surface task, discoverable by the player. */
  hiddenCause: string;
  causeRevealed: boolean;
  briefing: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  choices: QuestChoice[];
  chosenChoiceId: string | null;
  state: QuestState;
  fingerprint: string;
  createdDay: number;
  expiresDay: number | null;
  level: number;
}

export function questProgress(quest: Quest): { done: number; total: number; ratio: number } {
  const required = quest.objectives.filter((objective) => !objective.optional);
  const done = required.filter((objective) => objective.done).length;
  return { done, total: required.length, ratio: required.length === 0 ? 0 : done / required.length };
}

export function isQuestComplete(quest: Quest): boolean {
  return quest.objectives.every((objective) => objective.optional || objective.done);
}

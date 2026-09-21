import type { FactionId, ItemId, LocationId, NpcId } from '@/core/ids/ids';

export type NpcImportance = 'minor' | 'notable' | 'major';

export interface NpcSchedule {
  /** Establishment kind the NPC is usually found at, by day phase. */
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

export interface NpcSecret {
  id: string;
  text: string;
  /** Relationship threshold before the NPC will share it. */
  revealAtTrust: number;
  revealed: boolean;
}

export interface NPC {
  id: NpcId;
  seed: string;
  name: string;
  surname: string;
  age: number;
  presentation: 'masculine' | 'feminine' | 'androgynous';
  archetypeId: string;
  occupationId: string;
  homeLocationId: LocationId;
  currentLocationId: LocationId;
  factionId: FactionId | null;
  personalityTraits: string[];
  motivations: string[];
  fears: string[];
  wealth: number;
  inventoryItemIds: ItemId[];
  alive: boolean;
  deathDay: number | null;
  schedule: NpcSchedule;
  secrets: NpcSecret[];
  importance: NpcImportance;
  /** Family and social graph — makes revenge and gratitude possible. */
  relativeNpcIds: NpcId[];
  portraitKey: string;
  /** Advances as the player talks: greeting -> familiar -> confidant. */
  dialogueStage: number;
  lastSpokeDay: number;
  /** Offered-quest bookkeeping so an NPC never floods the player. */
  lastQuestDay: number;
}

export function npcFullName(npc: NPC): string {
  return npc.surname ? `${npc.name} ${npc.surname}` : npc.name;
}

export function isAvailable(npc: NPC, locationId: LocationId): boolean {
  return npc.alive && npc.currentLocationId === locationId;
}

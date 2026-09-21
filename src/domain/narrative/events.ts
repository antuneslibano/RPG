import type { EventId, KingdomId, LocationId, NpcId, RegionId } from '@/core/ids/ids';

export type WorldEventType =
  | 'playerArrived' | 'npcHelped' | 'npcWronged' | 'npcKilled' | 'npcDied'
  | 'questCompleted' | 'questFailed' | 'creatureSlain' | 'bossSlain'
  | 'settlementRaided' | 'settlementSaved' | 'famine' | 'plague'
  | 'factionShift' | 'dungeonAppeared' | 'dungeonCleared' | 'giftGiven'
  | 'promiseMade' | 'promiseBroken' | 'theft' | 'discovery' | 'necromancerRising'
  | 'caravanAttacked' | 'priceShock' | 'npcMoved' | 'levelUp';

export interface WorldEvent {
  id: EventId;
  timestamp: number;
  gameDay: number;
  gameYear: number;
  type: WorldEventType;
  locationId: LocationId | null;
  regionId: RegionId | null;
  kingdomId: KingdomId | null;
  participantIds: NpcId[];
  witnessIds: NpcId[];
  cause: string;
  consequences: string[];
  /** 0..100 — drives memory permanence, rumor spread and chronicle inclusion. */
  importance: number;
  tags: string[];
  summary: string;
  playerInvolved: boolean;
}

export const EVENT_TYPE_LABELS: Partial<Record<WorldEventType, string>> = {
  playerArrived: 'Chegada',
  npcHelped: 'Ajuda',
  npcWronged: 'Ofensa',
  npcKilled: 'Assassinato',
  npcDied: 'Morte',
  questCompleted: 'Missão concluída',
  questFailed: 'Missão fracassada',
  creatureSlain: 'Criatura abatida',
  bossSlain: 'Chefe derrotado',
  settlementRaided: 'Ataque',
  settlementSaved: 'Defesa',
  famine: 'Escassez',
  plague: 'Peste',
  factionShift: 'Mudança de poder',
  dungeonAppeared: 'Masmorra surgiu',
  dungeonCleared: 'Masmorra limpa',
  necromancerRising: 'Presságio sombrio',
  caravanAttacked: 'Caravana atacada',
  priceShock: 'Preços alterados',
  discovery: 'Descoberta',
};

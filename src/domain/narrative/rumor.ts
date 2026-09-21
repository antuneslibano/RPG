import type { EventId, NpcId, RegionId, RumorId } from '@/core/ids/ids';

export type RumorAccuracy = 'true' | 'partial' | 'exaggerated' | 'outdated';

export const RUMOR_ACCURACY_LABELS: Record<RumorAccuracy, string> = {
  true: 'Confiável', partial: 'Parcial', exaggerated: 'Exagerado', outdated: 'Desatualizado',
};

export interface Rumor {
  id: RumorId;
  sourceEventId: EventId | null;
  text: string;
  accuracy: RumorAccuracy;
  /** 0..1 — grows with each hop away from the source. */
  distortion: number;
  createdDay: number;
  regionId: RegionId | null;
  topic: string;
  knownByNpcIds: NpcId[];
  heardByPlayer: boolean;
  /** Rumors about still-open problems can be turned into quests. */
  actionable: boolean;
}

import type { ChronicleId, EventId } from '@/core/ids/ids';

export interface ChronicleEntry {
  id: ChronicleId;
  gameYear: number;
  gameDay: number;
  title: string;
  text: string;
  eventId: EventId | null;
  importance: number;
  tags: string[];
}

export function chronicleHeading(entry: ChronicleEntry): string {
  return `ANO ${entry.gameYear} — DIA ${entry.gameDay}`;
}

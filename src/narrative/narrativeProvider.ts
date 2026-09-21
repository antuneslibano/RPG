import { SeededRandom } from '@/core/rng/random';
import type { GameState } from '@/domain/world/gameState';
import type { NPC } from '@/domain/npc/npc';
import type { Quest } from '@/domain/quest/quest';
import { describeRelationship } from '@/domain/narrative/memory';
import { npcFullName } from '@/domain/npc/npc';
import { recallMemories, relationshipWith } from '@/narrative/memoryService';
import { rumorsKnownBy } from '@/narrative/rumorService';
import { OCCUPATION_BY_ID } from '@/data/npcContent';

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  kind: 'greeting' | 'memory' | 'rumor' | 'quest' | 'secret' | 'closing';
}

export interface DialogueRequest {
  state: GameState;
  npc: NPC;
  offeredQuest: Quest | null;
}

/**
 * Abstract narrative source. The game is fully playable with the local
 * implementation; a remote LLM can be plugged in later without touching callers.
 */
export interface NarrativeProvider {
  readonly id: string;
  buildDialogue(request: DialogueRequest): DialogueLine[];
  describeLocationMood(state: GameState, locationId: string): string;
}

const GREETINGS: Record<string, readonly string[]> = {
  hostile: ['Você de novo. Diga logo o que quer.', 'Não temos nada a conversar.'],
  wary: ['Sim? Estou ocupado.', 'Fale, mas seja breve.'],
  neutral: ['Bom dia. Precisa de alguma coisa?', 'Pois não.'],
  cordial: ['Ah, é você. Entre, entre.', 'Que bom te ver por aqui.'],
  loyal: ['Sempre bom ver você. O que precisa?', 'Você chegou na hora certa.'],
  devoted: ['Se você pedir, eu faço. É simples assim.', 'Você já fez mais por mim do que devia.'],
};

/** Deterministic, template-driven dialogue built from real world state. */
export class LocalNarrativeProvider implements NarrativeProvider {
  readonly id = 'local';

  buildDialogue({ state, npc, offeredQuest }: DialogueRequest): DialogueLine[] {
    const rng = new SeededRandom(`${state.world.seed}:dialogue:${npc.id}:${state.world.gameDay}:${npc.dialogueStage}`);
    const relationship = relationshipWith(state, npc.id);
    const { attitude } = describeRelationship(relationship);
    const occupation = OCCUPATION_BY_ID[npc.occupationId]?.name ?? 'morador';
    const lines: DialogueLine[] = [];
    const speaker = npcFullName(npc);

    lines.push({
      id: 'greet',
      speaker,
      text: rng.pick(GREETINGS[attitude] ?? GREETINGS.neutral!),
      kind: 'greeting',
    });

    // What this NPC personally remembers — never a generic line.
    const memories = recallMemories(state, npc.id, 2);
    for (const memory of memories) {
      if (memory.importance < 12) continue;
      const prefix = memory.secondHand ? 'Me contaram que ' : '';
      const tone =
        memory.emotionalWeight > 12 ? 'Não esqueci disso.'
        : memory.emotionalWeight < -12 ? 'Isso ainda me incomoda.'
        : '';
      lines.push({
        id: `mem_${memory.id}`,
        speaker,
        text: `${prefix}${memory.secondHand ? memory.summary.toLowerCase() : memory.summary} ${tone}`.trim(),
        kind: 'memory',
      });
    }

    // Limited knowledge: only rumors this NPC actually heard.
    const rumors = rumorsKnownBy(state, npc.id, 1);
    for (const rumor of rumors) {
      lines.push({
        id: `rumor_${rumor.id}`,
        speaker,
        text: rumor.accuracy === 'true' ? rumor.text : `${rumor.text}`,
        kind: 'rumor',
      });
    }

    // Secrets open up as trust grows.
    const secret = npc.secrets.find((entry) => !entry.revealed && relationship.trust >= entry.revealAtTrust);
    if (secret) {
      secret.revealed = true;
      lines.push({ id: `secret_${secret.id}`, speaker, text: `Escuta. ${secret.text} Não repita isso.`, kind: 'secret' });
    }

    if (offeredQuest) {
      lines.push({ id: `quest_${offeredQuest.id}`, speaker, text: offeredQuest.briefing, kind: 'quest' });
      lines.push({
        id: `quest_ctx_${offeredQuest.id}`,
        speaker,
        text: offeredQuest.worldContextSummary,
        kind: 'quest',
      });
    } else if (npc.dialogueStage === 0) {
      lines.push({
        id: 'occupation',
        speaker,
        text: `Sou ${occupation} aqui. ${rng.pick([
          'Faz anos que é assim.',
          'Não é fácil, mas dá para viver.',
          'O suficiente para não passar fome.',
        ])}`,
        kind: 'closing',
      });
    }

    return lines;
  }

  describeLocationMood(state: GameState, locationId: string): string {
    const locationState = state.locationStates[locationId];
    const location = state.locations[locationId];
    if (!locationState || !location) return '';
    const problems = locationState.activeProblems.filter((problem) => !problem.resolved);
    if (locationState.destroyed) return `${location.name} está em ruínas.`;
    if (problems.length > 0) return problems[0]!.summary;
    if (locationState.prosperity > 70) return `${location.name} prospera: o mercado está cheio.`;
    if (locationState.danger > 55) return `Há tensão em ${location.name}. Poucos saem depois do anoitecer.`;
    return `${location.name} segue sua rotina.`;
  }
}

/**
 * Placeholder for a future server-side LLM. It never ships API keys with the
 * app and always falls back to the local provider, so the core stays offline.
 */
export class RemoteLLMProvider implements NarrativeProvider {
  readonly id = 'remote';

  constructor(private readonly fallback: NarrativeProvider = new LocalNarrativeProvider()) {}

  buildDialogue(request: DialogueRequest): DialogueLine[] {
    return this.fallback.buildDialogue(request);
  }

  describeLocationMood(state: GameState, locationId: string): string {
    return this.fallback.describeLocationMood(state, locationId);
  }
}

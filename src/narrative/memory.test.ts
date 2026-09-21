import { createNewGame } from '@/game/newGame';
import type { GameState } from '@/domain/world/gameState';
import { npcsAt } from '@/domain/world/gameState';
import { recordWorldEvent } from '@/narrative/eventService';
import { consolidateMemories, recallMemories, recordMemory, relationshipWith } from '@/narrative/memoryService';
import { createRumorFromEvent, npcKnowsEvent, propagateRumors, rumorsKnownBy } from '@/narrative/rumorService';
import { chronicleByYear } from '@/narrative/chronicleService';
import { applyMemoryToRelationship, describeRelationship, emptyRelationship, memoryStrength } from '@/domain/narrative/memory';
import { advanceDay } from '@/sim/simulation';

function newState(seed = 'mem-0001'): GameState {
  return createNewGame({
    heroName: 'Teste', classId: 'druid', originId: 'origin_village',
    presentation: 'androgynous', allocatedAttributes: {}, seedLabel: seed,
  });
}

describe('memória de NPC', () => {
  it('testemunhas registram o evento e o relacionamento muda', () => {
    const state = newState();
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;

    recordWorldEvent(state, {
      type: 'npcHelped',
      participantIds: [npc.id],
      cause: 'ajuda prestada',
      consequences: [],
      importance: 55,
      summary: 'Você salvou a filha do ferreiro.',
      memory: { memoryType: 'favor', emotionalWeight: 30, trustImpact: 25, fearImpact: -5, respectImpact: 15 },
    });

    const memories = state.memories[npc.id] ?? [];
    expect(memories.length).toBeGreaterThan(0);
    const relationship = relationshipWith(state, npc.id);
    expect(relationship.trust).toBeGreaterThan(0);
    expect(relationship.gratitude).toBeGreaterThan(0);
    expect(describeRelationship(relationship).score).toBeGreaterThan(0);
  });

  it('testemunhas lembram menos que participantes', () => {
    const state = newState();
    const people = npcsAt(state, state.player.currentLocationId);
    const participant = people[0]!;
    const witness = people[1]!;

    recordWorldEvent(state, {
      type: 'npcHelped',
      participantIds: [participant.id],
      witnessIds: [witness.id],
      cause: 'favor público',
      consequences: [],
      importance: 60,
      summary: 'Você devolveu o que havia sido roubado.',
      memory: { memoryType: 'favor', emotionalWeight: 40, trustImpact: 30, fearImpact: 0, respectImpact: 20 },
    });

    const participantMemory = state.memories[participant.id]!.find((memory) => memory.memoryType === 'favor')!;
    const witnessMemory = state.memories[witness.id]!.find((memory) => memory.memoryType === 'witnessed')!;
    expect(witnessMemory.importance).toBeLessThan(participantMemory.importance);
    expect(witnessMemory.memoryType).toBe('witnessed');
  });

  it('eventos muito importantes viram memórias permanentes', () => {
    const state = newState();
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;
    recordWorldEvent(state, {
      type: 'npcKilled',
      participantIds: [npc.id],
      cause: 'assassinato',
      consequences: ['a família vai lembrar'],
      importance: 85,
      summary: 'Você matou alguém da família dele.',
      memory: { memoryType: 'crime', emotionalWeight: -60, trustImpact: -40, fearImpact: 35, respectImpact: -10 },
    });
    const memory = state.memories[npc.id]!.find((entry) => entry.memoryType === 'crime')!;
    expect(memory.permanent).toBe(true);
    expect(memoryStrength(memory, state.world.gameDay + 500)).toBe(memory.importance);
  });

  it('memórias fracas decaem com o tempo', () => {
    const state = newState();
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;
    const memory = recordMemory(state, {
      npcId: npc.id, eventId: null, memoryType: 'metPlayer', emotionalWeight: 2,
      trustImpact: 1, fearImpact: 0, respectImpact: 0, importance: 20, summary: 'Nos cruzamos uma vez.',
    });
    expect(memoryStrength(memory, state.world.gameDay)).toBe(20);
    expect(memoryStrength(memory, state.world.gameDay + 30)).toBe(0);
  });

  it('consolidação funde memórias parecidas e preserva as permanentes', () => {
    const state = newState();
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;

    recordMemory(state, {
      npcId: npc.id, eventId: null, memoryType: 'death', emotionalWeight: -70,
      trustImpact: -40, fearImpact: 40, respectImpact: 0, importance: 90, summary: 'Morte inesquecível.', permanent: true,
    });
    for (let i = 0; i < 8; i++) {
      recordMemory(state, {
        npcId: npc.id, eventId: null, memoryType: 'favor', emotionalWeight: 4,
        trustImpact: 2, fearImpact: 0, respectImpact: 1, importance: 12, summary: `Pequeno favor ${i}.`,
      });
    }
    state.world.gameDay += 20;

    const before = state.memories[npc.id]!.length;
    const report = consolidateMemories(state, npc.id);
    const after = state.memories[npc.id]!;

    expect(after.length).toBeLessThan(before);
    expect(after.some((memory) => memory.permanent)).toBe(true);
    const summarized = after.find((memory) => memory.tier === 'summarized');
    expect(summarized?.summary).toContain('ajudou');
    expect(report.merged).toBeGreaterThan(0);
  });

  it('recall marca as memórias como lembradas hoje', () => {
    const state = newState();
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;
    recordMemory(state, {
      npcId: npc.id, eventId: null, memoryType: 'quest', emotionalWeight: 10,
      trustImpact: 8, fearImpact: 0, respectImpact: 6, importance: 50, summary: 'Cumpriu um pedido.',
    });
    state.world.gameDay = 12;
    const recalled = recallMemories(state, npc.id, 3);
    expect(recalled[0]!.lastRecalledDay).toBe(12);
  });
});

describe('relacionamento', () => {
  it('memórias de segunda mão pesam menos', () => {
    const base = emptyRelationship('npc_a', 'player');
    const firsthand = applyMemoryToRelationship(base, {
      id: 'm1', npcId: 'npc_a', eventId: null, subjectId: 'player', memoryType: 'favor',
      emotionalWeight: 20, trustImpact: 20, fearImpact: 0, respectImpact: 10, importance: 50,
      createdDay: 1, lastRecalledDay: 1, decayRate: 1, permanent: false, tier: 'relevant',
      summary: '', secondHand: false, mergedCount: 1,
    });
    const secondhand = applyMemoryToRelationship(base, {
      id: 'm2', npcId: 'npc_a', eventId: null, subjectId: 'player', memoryType: 'favor',
      emotionalWeight: 20, trustImpact: 20, fearImpact: 0, respectImpact: 10, importance: 50,
      createdDay: 1, lastRecalledDay: 1, decayRate: 1, permanent: false, tier: 'relevant',
      summary: '', secondHand: true, mergedCount: 1,
    });
    expect(secondhand.trust).toBeLessThan(firsthand.trust);
    expect(secondhand.familiarity).toBe(0);
  });

  it('um NPC pode temer e ser grato ao mesmo tempo', () => {
    let relationship = emptyRelationship('npc_b', 'player');
    relationship = applyMemoryToRelationship(relationship, {
      id: 'm3', npcId: 'npc_b', eventId: null, subjectId: 'player', memoryType: 'favor',
      emotionalWeight: 30, trustImpact: 10, fearImpact: 40, respectImpact: 20, importance: 70,
      createdDay: 1, lastRecalledDay: 1, decayRate: 0, permanent: true, tier: 'permanent',
      summary: '', secondHand: false, mergedCount: 1,
    });
    expect(relationship.fear).toBeGreaterThan(0);
    expect(relationship.gratitude).toBeGreaterThan(0);
  });

  it('os eixos saturam em -100 e 100', () => {
    let relationship = emptyRelationship('npc_c', 'player');
    for (let i = 0; i < 40; i++) {
      relationship = applyMemoryToRelationship(relationship, {
        id: `m${i}`, npcId: 'npc_c', eventId: null, subjectId: 'player', memoryType: 'insult',
        emotionalWeight: -30, trustImpact: -30, fearImpact: -30, respectImpact: -30, importance: 40,
        createdDay: 1, lastRecalledDay: 1, decayRate: 1, permanent: false, tier: 'relevant',
        summary: '', secondHand: false, mergedCount: 1,
      });
    }
    expect(relationship.trust).toBe(-100);
    expect(relationship.hostility).toBe(100);
    expect(describeRelationship(relationship).attitude).toBe('hostile');
  });
});

describe('rumores', () => {
  it('eventos importantes viram rumores e se espalham com distorção', () => {
    const state = newState('rumor-0001');
    const event = recordWorldEvent(state, {
      type: 'settlementRaided',
      cause: 'ataque',
      consequences: ['parte da vila foi destruída'],
      importance: 70,
      summary: 'Saqueadores atacaram a vila.',
      playerInvolved: false,
    });

    const rumor = state.rumors.find((entry) => entry.sourceEventId === event.id);
    expect(rumor).toBeDefined();

    const before = rumor!.knownByNpcIds.length;
    const beforeDistortion = rumor!.distortion;
    state.world.gameDay += 1;
    propagateRumors(state);
    expect(rumor!.knownByNpcIds.length).toBeGreaterThanOrEqual(before);
    expect(rumor!.distortion).toBeGreaterThan(beforeDistortion);
  });

  it('eventos irrelevantes não viram rumor', () => {
    const state = newState('rumor-0002');
    const event = recordWorldEvent(state, {
      type: 'discovery', cause: 'trivial', consequences: [], importance: 10, summary: 'Nada demais.',
    });
    expect(createRumorFromEvent(state, event)).toBeNull();
  });

  it('conhecimento é limitado: quem não viu nem ouviu, não sabe', () => {
    const state = newState('rumor-0003');
    const people = npcsAt(state, state.player.currentLocationId);
    const witness = people[0]!;
    const outsider = Object.values(state.npcs).find(
      (npc) => npc.currentLocationId !== state.player.currentLocationId,
    );

    const event = recordWorldEvent(state, {
      type: 'bossSlain',
      witnessIds: [witness.id],
      cause: 'combate',
      consequences: ['a ameaça acabou'],
      importance: 80,
      summary: 'Você derrotou algo enorme.',
    });

    expect(npcKnowsEvent(state, witness.id, event.id)).toBe('firsthand');
    if (outsider) expect(npcKnowsEvent(state, outsider.id, event.id)).toBe('unknown');
    expect(npcKnowsEvent(state, witness.id, 'event_inexistente')).toBe('unknown');
    expect(rumorsKnownBy(state, witness.id).length).toBeGreaterThan(0);
  });
});

describe('crônica', () => {
  it('registra acontecimentos relevantes agrupados por ano', () => {
    const state = newState('chronicle-1');
    recordWorldEvent(state, {
      type: 'questCompleted', cause: 'missão', consequences: [], importance: 60,
      summary: 'Você salvou Edrin, filho do ferreiro.',
    });
    const years = chronicleByYear(state);
    expect(years.length).toBeGreaterThan(0);
    expect(years[0]!.entries.some((entry) => entry.text.includes('Edrin'))).toBe(true);
  });

  it('um dia avançado move o mundo sem intervenção do jogador', () => {
    const state = newState('director-1');
    const before = state.events.length;
    for (let i = 0; i < 12; i++) advanceDay(state);
    expect(state.world.gameDay).toBe(13);
    expect(state.events.length).toBeGreaterThan(before);
  });
});

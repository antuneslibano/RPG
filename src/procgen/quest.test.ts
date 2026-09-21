import { SeededRandom } from '@/core/rng/random';
import { createNewGame } from '@/game/newGame';
import { npcsAt } from '@/domain/world/gameState';
import { generateQuest, questFingerprint, type GenerationContext } from '@/procgen/quest';
import { QUEST_TYPES, isQuestComplete } from '@/domain/quest/quest';
import { acceptQuest, completeQuest, offerQuestFrom, progressObjectives } from '@/game/questFlow';

function contextFor(seed: string, overrides: Partial<GenerationContext> = {}) {
  const state = createNewGame({
    heroName: 'Teste', classId: 'druid', originId: 'origin_village',
    presentation: 'androgynous', allocatedAttributes: {}, seedLabel: seed,
  });
  const location = state.locations[state.player.currentLocationId]!;
  const context: GenerationContext = {
    gameDay: state.world.gameDay,
    playerLevel: 5,
    location,
    locationState: state.locationStates[location.id]!,
    region: state.regions[location.regionId]!,
    availableNpcs: npcsAt(state, location.id),
    recentEvents: state.events,
    recentFingerprints: [],
    npcsRecentlyInvolved: [],
    activeQuestTypes: [],
    relationships: state.relationships,
    neighbourLocations: location.connectedLocationIds
      .map((id) => state.locations[id])
      .filter((entry): entry is NonNullable<typeof entry> => !!entry),
    ...overrides,
  };
  return { state, context };
}

describe('geração de quests', () => {
  it('é determinística para a mesma seed e contexto', () => {
    const a = generateQuest(new SeededRandom('q-1'), contextFor('quest-0001').context)!;
    const b = generateQuest(new SeededRandom('q-1'), contextFor('quest-0001').context)!;
    expect(a.quest.title).toBe(b.quest.title);
    expect(a.quest.fingerprint).toBe(b.quest.fingerprint);
  });

  it('preenche todos os slots combinatórios', () => {
    const result = generateQuest(new SeededRandom('q-2'), contextFor('quest-0002').context)!;
    const quest = result.quest;
    expect(quest.giverNpcId).toBeTruthy();
    expect(quest.motivation.length).toBeGreaterThan(0);
    expect(quest.problem.length).toBeGreaterThan(0);
    expect(quest.locationId).toBeTruthy();
    expect(quest.targetRef.length).toBeGreaterThan(0);
    expect(quest.complication.length).toBeGreaterThan(0);
    expect(quest.worldContextSummary.length).toBeGreaterThan(0);
    expect(quest.relationshipContext.length).toBeGreaterThan(0);
    expect(quest.consequence.length).toBeGreaterThan(0);
    expect(QUEST_TYPES).toContain(quest.type);
    expect(quest.objectives.length).toBeGreaterThan(0);
    expect(quest.rewards.xp).toBeGreaterThan(0);
    expect(quest.rewards.gold).toBeGreaterThan(0);
  });

  it('toda quest carrega uma causa oculta — nunca "mate 10 lobos" sem motivo', () => {
    const rng = new SeededRandom('q-cause');
    const { context } = contextFor('quest-0003');
    for (let i = 0; i < 25; i++) {
      const result = generateQuest(rng, context)!;
      expect(result.quest.hiddenCause.length).toBeGreaterThan(10);
      expect(result.quest.causeRevealed).toBe(false);
    }
  });

  it('rejeita fingerprints já vistos recentemente', () => {
    const { context } = contextFor('quest-0004');
    const first = generateQuest(new SeededRandom('q-3'), context)!;

    const repeated = generateQuest(new SeededRandom('q-3'), {
      ...context,
      recentFingerprints: [first.quest.fingerprint],
    })!;
    expect(repeated.rejectedFingerprints).toContain(first.quest.fingerprint);
    expect(repeated.attempts).toBeGreaterThan(1);
  });

  it('gera variedade perceptível ao longo de muitas tentativas', () => {
    const rng = new SeededRandom('q-variety');
    const { context } = contextFor('quest-0005');
    const fingerprints = new Set<string>();
    const recent: string[] = [];
    for (let i = 0; i < 40; i++) {
      const result = generateQuest(rng, { ...context, recentFingerprints: recent })!;
      fingerprints.add(result.quest.fingerprint);
      recent.push(result.quest.fingerprint);
      if (recent.length > 20) recent.shift();
    }
    expect(fingerprints.size).toBeGreaterThan(20);
  });

  it('nunca trava: devolve algo mesmo com todos os fingerprints bloqueados', () => {
    const rng = new SeededRandom('q-stuck');
    const { context } = contextFor('quest-0006');
    const probe = generateQuest(new SeededRandom('q-stuck'), context)!;
    const blocked = Array.from({ length: 200 }, (_, i) => probe.quest.fingerprint + i.toString(16));
    const result = generateQuest(rng, { ...context, recentFingerprints: [...blocked, probe.quest.fingerprint] });
    expect(result).not.toBeNull();
    expect(result!.quest.title.length).toBeGreaterThan(0);
  });

  it('devolve null sem NPCs disponíveis', () => {
    const { context } = contextFor('quest-0007');
    expect(generateQuest(new SeededRandom('q-none'), { ...context, availableNpcs: [] })).toBeNull();
  });

  it('fingerprint distingue combinações diferentes', () => {
    const base = {
      blueprintId: 'bp_hunt_displaced', archetypeId: 'arch_guard', problem: 'p',
      targetRef: 'cre_wolf', locationKind: 'village', consequence: 'c',
    };
    expect(questFingerprint(base)).toBe(questFingerprint({ ...base }));
    expect(questFingerprint(base)).not.toBe(questFingerprint({ ...base, targetRef: 'cre_bear' }));
  });
});

describe('ciclo de vida da quest', () => {
  it('oferece, aceita, progride, conclui e recompensa', () => {
    const { state } = contextFor('quest-life');
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;

    const quest = offerQuestFrom(state, npc.id)!;
    expect(quest.state).toBe('offered');
    expect(state.world.recentFingerprints).toContain(quest.fingerprint);

    expect(acceptQuest(state, quest.id)).toBe(true);
    expect(state.quests[quest.id]!.state).toBe('active');

    for (const objective of quest.objectives) {
      progressObjectives(state, { kind: objective.kind, targetRef: objective.targetRef, amount: objective.required });
    }
    expect(isQuestComplete(state.quests[quest.id]!)).toBe(true);

    const goldBefore = state.player.gold;
    const result = completeQuest(state, quest.id);
    expect(result.ok).toBe(true);
    expect(state.player.gold).toBeGreaterThan(goldBefore);
    expect(state.quests[quest.id]!.state).toBe('completed');
    expect(state.player.stats.questsCompleted).toBe(1);
  });

  it('não oferece duas quests seguidas do mesmo NPC', () => {
    const { state } = contextFor('quest-cooldown');
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;
    const first = offerQuestFrom(state, npc.id)!;
    acceptQuest(state, first.id);
    expect(offerQuestFrom(state, npc.id)).toBeNull();
  });

  it('não conclui uma quest incompleta', () => {
    const { state } = contextFor('quest-incomplete');
    const npc = npcsAt(state, state.player.currentLocationId)[0]!;
    const quest = offerQuestFrom(state, npc.id)!;
    acceptQuest(state, quest.id);
    expect(completeQuest(state, quest.id).ok).toBe(false);
  });
});

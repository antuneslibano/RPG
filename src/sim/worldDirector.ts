import { SeededRandom } from '@/core/rng/random';
import type { LocationId } from '@/core/ids/ids';
import { clamp } from '@/core/util/math';
import type { EventBus } from '@/core/events/eventBus';
import type { GameState } from '@/domain/world/gameState';
import type { ActiveProblem, PendingConsequence } from '@/domain/world/world';
import { recordWorldEvent } from '@/narrative/eventService';
import { generateDungeon } from '@/procgen/dungeon';

/**
 * Chains, not single events. Each step creates the conditions for the next one,
 * so the world reads as cause and effect instead of random noise.
 */
interface ChainStep {
  problemKind: ActiveProblem['kind'];
  summary: string;
  eventType: Parameters<typeof recordWorldEvent>[1]['type'];
  importance: number;
  consequences: string[];
  /** When present, escalation spawns a dungeon with this narrative context. */
  spawnsDungeon?: string;
  economyShift?: { category: string; amount: number };
}

const CHAINS: Record<string, readonly ChainStep[]> = {
  famine: [
    { problemKind: 'famine', summary: 'A colheita veio curta e os celeiros estão baixos.', eventType: 'famine', importance: 35, consequences: ['preços sobem'], economyShift: { category: 'consumable', amount: 0.25 } },
    { problemKind: 'raiders', summary: 'Comerciantes buscam suprimentos longe e caravanas viram alvo.', eventType: 'caravanAttacked', importance: 45, consequences: ['a guarda oferece recompensa'] },
    { problemKind: 'raiders', summary: 'A guarda paga por cada saqueador afastado da estrada.', eventType: 'priceShock', importance: 40, consequences: ['a economia local muda conforme o desfecho'], economyShift: { category: 'weapon', amount: 0.12 } },
  ],
  necromancer: [
    { problemKind: 'missing', summary: 'Animais estão sumindo sem deixar rastro.', eventType: 'discovery', importance: 30, consequences: ['rumores começam'] },
    { problemKind: 'undead', summary: 'O cemitério foi profanado durante a noite.', eventType: 'necromancerRising', importance: 55, consequences: ['algo se abriu no subsolo'], spawnsDungeon: 'Alguém profanou o cemitério e o que estava selado começou a se mover.' },
    { problemKind: 'missing', summary: 'Um morador desapareceu depois de falar demais sobre o cemitério.', eventType: 'npcMoved', importance: 50, consequences: ['uma missão emerge'] },
  ],
  beast: [
    { problemKind: 'beast', summary: 'Feras desceram da mata e cercam os rebanhos.', eventType: 'creatureSlain', importance: 32, consequences: ['os caminhos ficam perigosos'] },
    { problemKind: 'beast', summary: 'Algo maior expulsou as feras do habitat original.', eventType: 'discovery', importance: 48, consequences: ['a causa pode ser descoberta'], spawnsDungeon: 'Algo se instalou no fundo da mata e empurrou tudo o mais para fora.' },
  ],
  plague: [
    { problemKind: 'plague', summary: 'Uma febre se espalha entre os mais velhos.', eventType: 'plague', importance: 38, consequences: ['a botica fica sem estoque'], economyShift: { category: 'consumable', amount: 0.4 } },
    { problemKind: 'plague', summary: 'A botica racionou remédios e o preço dobrou.', eventType: 'priceShock', importance: 42, consequences: ['alguém culpa a liga mercante'] },
  ],
  feud: [
    { problemKind: 'feud', summary: 'Duas facções disputam o controle da estrada principal.', eventType: 'factionShift', importance: 40, consequences: ['o comércio trava'] },
    { problemKind: 'feud', summary: 'A disputa virou violência aberta perto do mercado.', eventType: 'settlementRaided', importance: 52, consequences: ['a prosperidade cai'] },
  ],
};

export interface DirectorReport {
  eventsCreated: number;
  problemsOpened: number;
  problemsEscalated: number;
  dungeonsSpawned: number;
}

/** Runs once per in-game day. Keeps the world moving while the player is away. */
export function runWorldDirector(state: GameState, bus?: EventBus): DirectorReport {
  const rng = new SeededRandom(`${state.world.seed}:director:${state.world.gameDay}`);
  const report: DirectorReport = { eventsCreated: 0, problemsOpened: 0, problemsEscalated: 0, dungeonsSpawned: 0 };

  const settlements = Object.values(state.locations).filter((location) => location.kind !== 'wilderness');
  if (settlements.length === 0) return report;

  // 1. Escalate problems the player ignored.
  for (const locationId of Object.keys(state.locationStates)) {
    const locationState = state.locationStates[locationId]!;
    for (const problem of locationState.activeProblems) {
      if (problem.resolved || state.world.gameDay < problem.escalatesDay) continue;
      problem.severity = clamp(problem.severity + rng.int(8, 18), 0, 100);
      problem.escalatesDay = state.world.gameDay + rng.int(4, 7);
      report.problemsEscalated += 1;

      const location = state.locations[locationId];
      const consequence: PendingConsequence = {
        id: `cons_${rng.hex(6)}`,
        kind: problem.severity > 70 ? 'destroy' : 'prosperity',
        amount: problem.severity > 70 ? 1 : -rng.int(5, 14),
        summary: problem.severity > 70
          ? `Parte de ${location?.name ?? 'um assentamento'} foi destruída.`
          : `${location?.name ?? 'O lugar'} empobreceu enquanto o problema seguia sem solução.`,
        createdDay: state.world.gameDay,
      };
      locationState.pendingConsequences.push(consequence);

      recordWorldEvent(state, {
        type: problem.severity > 70 ? 'settlementRaided' : 'factionShift',
        locationId,
        cause: 'problema ignorado',
        consequences: [consequence.summary],
        importance: Math.min(90, 40 + problem.severity / 2),
        summary: `${problem.summary} A situação piorou.`,
        playerInvolved: false,
        tags: ['director', problem.kind],
      }, bus);
      report.eventsCreated += 1;
    }
  }

  // 2. Advance an existing chain or open a new one.
  const chainKeys = Object.keys(CHAINS);
  const location = rng.pick(settlements);
  const locationState = state.locationStates[location.id];
  if (!locationState) return report;

  const openProblems = locationState.activeProblems.filter((problem) => !problem.resolved);
  const shouldOpen = openProblems.length < 2 && rng.bool(0.45);
  if (!shouldOpen) return report;

  const chainKey = rng.pick(chainKeys);
  const chain = CHAINS[chainKey]!;
  const stepIndex = Math.min(openProblems.length, chain.length - 1);
  const step = chain[stepIndex]!;

  const problem: ActiveProblem = {
    id: `problem_${rng.hex(6)}`,
    kind: step.problemKind,
    severity: rng.int(20, 45),
    startedDay: state.world.gameDay,
    escalatesDay: state.world.gameDay + rng.int(4, 8),
    sourceEventId: null,
    summary: step.summary,
    resolved: false,
  };
  locationState.activeProblems.push(problem);
  locationState.danger = clamp(locationState.danger + rng.int(4, 12), 0, 100);
  report.problemsOpened += 1;

  const event = recordWorldEvent(state, {
    type: step.eventType,
    locationId: location.id,
    cause: `cadeia: ${chainKey}`,
    consequences: step.consequences,
    importance: step.importance,
    summary: `${location.name}: ${step.summary}`,
    playerInvolved: false,
    tags: ['director', chainKey],
  }, bus);
  problem.sourceEventId = event.id;
  report.eventsCreated += 1;

  if (step.economyShift) {
    const current = state.economy.scarcityByCategory[step.economyShift.category] ?? 1;
    state.economy.scarcityByCategory[step.economyShift.category] = clamp(current + step.economyShift.amount, 0.6, 1.9);
  }

  if (step.spawnsDungeon) {
    const region = state.regions[location.regionId];
    if (region) {
      const dungeon = generateDungeon(rng, {
        regionId: region.id,
        locationId: location.id,
        biome: region.biome,
        levelRange: region.levelRange,
        narrativeContext: step.spawnsDungeon,
        sourceEventId: event.id,
        discoveredDay: state.world.gameDay,
      });
      state.dungeons[dungeon.id] = dungeon;
      location.dungeonIds.push(dungeon.id);
      report.dungeonsSpawned += 1;

      recordWorldEvent(state, {
        type: 'dungeonAppeared',
        locationId: location.id,
        cause: step.spawnsDungeon,
        consequences: ['uma nova masmorra pode ser explorada'],
        importance: 58,
        summary: `${dungeon.name} se abriu perto de ${location.name}.`,
        playerInvolved: false,
        tags: ['director', 'dungeon'],
      }, bus);
      report.eventsCreated += 1;
    }
  }

  return report;
}

/** Marks a problem solved and pays the world back for it. */
export function resolveProblem(state: GameState, locationId: LocationId, problemId: string, bus?: EventBus): boolean {
  const locationState = state.locationStates[locationId];
  const problem = locationState?.activeProblems.find((entry) => entry.id === problemId);
  if (!locationState || !problem || problem.resolved) return false;

  problem.resolved = true;
  locationState.danger = clamp(locationState.danger - 12, 0, 100);
  locationState.prosperity = clamp(locationState.prosperity + 8, 0, 100);

  recordWorldEvent(state, {
    type: 'settlementSaved',
    locationId,
    cause: 'intervenção do jogador',
    consequences: ['o problema foi encerrado'],
    importance: 62,
    summary: `${problem.summary} Resolvido.`,
    memory: { memoryType: 'favor', emotionalWeight: 22, trustImpact: 16, fearImpact: -4, respectImpact: 14 },
    tags: ['player', problem.kind],
  }, bus);
  return true;
}

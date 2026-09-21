/**
 * Percorre os 25 critérios de aceitação do vertical slice numa única partida
 * headless: criar herói, explorar, conversar, lutar, subir de nível, equipar,
 * limpar uma masmorra, ver o mundo lembrar e recarregar o save.
 */
import { MemoryStorageAdapter } from '@/persistence/storage';
import { SaveService } from '@/persistence/saveService';
import { createNewGame } from '@/game/newGame';
import { npcsAt } from '@/domain/world/gameState';
import type { GameState } from '@/domain/world/gameState';
import { travelTo, reachableFrom } from '@/game/travel';
import { talkTo } from '@/game/npcFlow';
import { LocalNarrativeProvider } from '@/narrative/narrativeProvider';
import { acceptQuest } from '@/game/questFlow';
import { combatDeps, resolveCombat, startRandomEncounter } from '@/game/combatFlow';
import { performAction } from '@/domain/combat/combatEngine';
import { livingOf } from '@/domain/combat/combat';
import { grantXp, spendSkillPoint } from '@/domain/player/progression';
import { DRUID_TREE } from '@/data/classes';
import { equipItem, inventoryEntries } from '@/domain/items/inventory';
import { generateItem } from '@/procgen/loot';
import { addItem } from '@/domain/items/inventory';
import { SeededRandom } from '@/core/rng/random';
import { ensureDungeonAt, enterDungeon, enterRoom, markRoomCleared, availableExits } from '@/game/dungeonFlow';
import { recordWorldEvent } from '@/narrative/eventService';
import { relationshipWith } from '@/narrative/memoryService';
import { advanceDay } from '@/sim/simulation';
import { playerStats, refreshResources } from '@/game/playerService';
import { isEquippable } from '@/domain/items/item';

const SLOT = 'slot_acceptance';

function winCurrentCombat(game: GameState): void {
  const combat = game.combat!;
  for (const enemy of livingOf(combat, 'enemy')) enemy.hp = 0;
  combat.outcome = 'victory';
}

describe('critérios de aceitação do vertical slice', () => {
  it('cumpre o ciclo completo de 25 passos', async () => {
    const storage = new MemoryStorageAdapter();
    const saves = new SaveService(storage);
    const narrative = new LocalNarrativeProvider();

    // 1-3. Criar personagem e iniciar o mundo a partir de uma semente.
    const game = createNewGame({
      heroName: 'Jonny', classId: 'druid', originId: 'origin_grove',
      presentation: 'masculine', allocatedAttributes: { wisdom: 3, vitality: 2 }, seedLabel: 'aceite-0001',
    });
    expect(game.world.seedLabel).toBe('aceite-0001');
    expect(game.player.name).toBe('Jonny');

    // 4. Visualizar o personagem (stats derivados coerentes).
    const stats = playerStats(game);
    expect(stats.maxHp).toBeGreaterThan(0);
    expect(game.player.resources.hp).toBe(stats.maxHp);

    // 5-6. Abrir o mapa e explorar uma região.
    const neighbours = reachableFrom(game, game.player.currentLocationId);
    expect(neighbours.length).toBeGreaterThan(0);
    const startLocation = game.player.currentLocationId;
    const wild = neighbours.find((location) => location.kind === 'wilderness') ?? neighbours[0]!;
    const travel = travelTo(game, wild.id, undefined);
    expect(travel.ok).toBe(true);
    expect(game.player.discoveredLocationIds).toContain(wild.id);

    // 7-9. Voltar à cidade, encontrar NPCs, conversar e receber uma quest contextual.
    travelTo(game, startLocation, undefined);
    const people = npcsAt(game, game.player.currentLocationId);
    expect(people.length).toBeGreaterThan(0);

    let quest = null;
    let questGiver = people[0]!;
    for (const npc of people) {
      const conversation = talkTo(game, npc.id, narrative)!;
      expect(conversation.lines.length).toBeGreaterThan(0);
      if (conversation.offeredQuest) {
        quest = conversation.offeredQuest;
        questGiver = npc;
        break;
      }
    }
    expect(quest).not.toBeNull();
    expect(quest!.hiddenCause.length).toBeGreaterThan(0);
    expect(acceptQuest(game, quest!.id)).toBe(true);

    // 10-12. Entrar em combate, ganhar XP e subir de nível.
    game.player.currentLocationId = wild.id;
    const combat = startRandomEncounter(game);
    expect(combat).not.toBeNull();
    const target = livingOf(combat!, 'enemy')[0]!;
    performAction(combat!, { kind: 'attack', targetId: target.id }, combatDeps(game));
    winCurrentCombat(game);
    const resolution = resolveCombat(game)!;
    expect(resolution.xp).toBeGreaterThan(0);

    const levelBefore = game.player.level;
    grantXp(game.player, 5000);
    expect(game.player.level).toBeGreaterThan(levelBefore);

    // 13-14. Receber pontos de habilidade e desbloquear uma habilidade.
    expect(game.player.skillPoints).toBeGreaterThan(0);
    const skill = DRUID_TREE.nodes.find((node) => node.id === 'skill_thorn_lash')!;
    expect(spendSkillPoint(game.player, skill).ok).toBe(true);
    expect(game.player.skillRanks[skill.id]).toBe(1);

    // 15-16. Obter loot e equipar um item.
    const loot = generateItem(new SeededRandom('aceite-loot'), {
      itemLevel: game.player.level, luck: game.player.attributes.luck,
      categories: ['weapon'], minRarity: 'rare', classHint: 'druid',
    });
    const lootId = addItem(game.player, game.items, loot);
    expect(isEquippable(loot)).toBe(true);
    expect(equipItem(game.player, game.items, lootId).ok).toBe(true);
    expect(Object.values(game.player.equipment)).toContain(lootId);
    refreshResources(game);
    expect(inventoryEntries(game.player, game.items).some((entry) => entry.equipped)).toBe(true);

    // 17-18. Entrar numa masmorra solo e derrotar o chefe.
    const dungeon = ensureDungeonAt(game)!;
    expect(dungeon.narrativeContext.length).toBeGreaterThan(0);
    enterDungeon(game, dungeon.id);
    expect(game.activeDungeonId).toBe(dungeon.id);
    expect(availableExits(game).length).toBeGreaterThan(0);

    // Teleporta para a sala do chefe e vence a luta.
    dungeon.currentRoomId = dungeon.rooms[dungeon.bossRoomId]!.exits[0] ?? dungeon.entranceRoomId;
    const bossRoom = enterRoom(game, dungeon.bossRoomId)!;
    expect(bossRoom.combatStarted).toBe(true);
    expect(game.combat!.combatants[Object.keys(game.combat!.combatants)[1]!]!.isBoss).toBe(true);
    winCurrentCombat(game);
    const bossResolution = resolveCombat(game)!;
    expect(bossResolution.bossDefeated).not.toBeNull();
    expect(markRoomCleared(game).dungeonCleared).toBe(true);
    expect(game.dungeons[dungeon.id]!.cleared).toBe(true);

    // 19. Retornar à cidade.
    game.activeDungeonId = null;
    game.player.currentLocationId = startLocation;

    // 20. Um NPC lembra de acontecimentos anteriores.
    recordWorldEvent(game, {
      type: 'npcHelped',
      participantIds: [questGiver.id],
      cause: 'ajuda direta',
      consequences: [],
      importance: 65,
      summary: 'Você ajudou a filha do ferreiro.',
      memory: { memoryType: 'favor', emotionalWeight: 30, trustImpact: 28, fearImpact: 0, respectImpact: 18 },
    });
    const laterConversation = talkTo(game, questGiver.id, narrative)!;
    expect(laterConversation.remembered.length).toBeGreaterThan(0);
    expect(laterConversation.lines.some((line) => line.kind === 'memory')).toBe(true);
    expect(relationshipWith(game, questGiver.id).trust).toBeGreaterThan(0);

    // 21. Observar uma consequência no mundo.
    const eventsBefore = game.events.length;
    for (let i = 0; i < 10; i++) advanceDay(game);
    expect(game.events.length).toBeGreaterThan(eventsBefore);
    const problems = Object.values(game.locationStates).flatMap((entry) => entry.activeProblems);
    expect(problems.length).toBeGreaterThan(0);

    // 22. Consultar a Crônica.
    expect(game.chronicle.length).toBeGreaterThan(0);
    expect(game.chronicle.some((entry) => entry.text.includes('ferreiro'))).toBe(true);

    // 23. Fechar o aplicativo (salvar tudo).
    await saves.save(SLOT, game, { full: true });

    // 24-25. Abrir novamente e encontrar o estado restaurado.
    const reloaded = await new SaveService(storage).load(SLOT, createNewGame({
      heroName: 'temp', classId: 'druid', originId: 'origin_village',
      presentation: 'androgynous', allocatedAttributes: {}, seedLabel: 'template-0000',
    }));

    expect(reloaded.ok).toBe(true);
    const restored = reloaded.state!;
    expect(restored.player.name).toBe('Jonny');
    expect(restored.player.level).toBe(game.player.level);
    expect(restored.player.skillRanks[skill.id]).toBe(1);
    expect(Object.values(restored.player.equipment)).toContain(lootId);
    expect(restored.world.seedLabel).toBe('aceite-0001');
    expect(restored.world.gameDay).toBe(game.world.gameDay);
    expect(restored.dungeons[dungeon.id]!.cleared).toBe(true);
    expect(restored.chronicle.length).toBe(game.chronicle.length);
    expect(restored.memories[questGiver.id]!.length).toBeGreaterThan(0);
    expect(restored.quests[quest!.id]).toBeDefined();
    expect(Object.keys(restored.bestiary).length).toBeGreaterThan(0);
  });
});

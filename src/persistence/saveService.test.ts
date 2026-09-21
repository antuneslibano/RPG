import { MemoryStorageAdapter } from '@/persistence/storage';
import { SaveService } from '@/persistence/saveService';
import { SCHEMA_VERSION, checksumOf, inspectEnvelope, partitionKey, wrap } from '@/persistence/schema';
import { migratePartition } from '@/persistence/migrations';
import { validateAndRepair } from '@/persistence/validation';
import { createNewGame } from '@/game/newGame';
import type { GameState } from '@/domain/world/gameState';
import { grantXp } from '@/domain/player/progression';
import { recordWorldEvent } from '@/narrative/eventService';

const SLOT = 'slot_test';

function freshGame(seed = 'save-0001'): GameState {
  return createNewGame({
    heroName: 'Arquivista', classId: 'druid', originId: 'origin_scholar',
    presentation: 'feminine', allocatedAttributes: { wisdom: 2 }, seedLabel: seed,
  });
}

function template(): GameState {
  return createNewGame({
    heroName: 'temp', classId: 'druid', originId: 'origin_village',
    presentation: 'androgynous', allocatedAttributes: {}, seedLabel: 'template-0000',
  });
}

describe('envelope e checksum', () => {
  it('detecta adulteração', () => {
    const envelope = wrap({ value: 1 });
    expect(inspectEnvelope(JSON.stringify(envelope)).status).toBe('ok');
    const tampered = { ...envelope, data: { value: 2 } };
    expect(inspectEnvelope(JSON.stringify(tampered)).status).toBe('checksumMismatch');
  });

  it('rejeita JSON inválido, nulo e versões futuras', () => {
    expect(inspectEnvelope('{quebrado').status).toBe('malformed');
    expect(inspectEnvelope(null).status).toBe('malformed');
    expect(inspectEnvelope('"texto"').status).toBe('malformed');
    const future = { schemaVersion: SCHEMA_VERSION + 5, checksum: checksumOf({}), updatedAt: 0, data: {} };
    expect(inspectEnvelope(JSON.stringify(future)).status).toBe('futureVersion');
  });
});

describe('save e load', () => {
  it('restaura o estado fielmente após um ciclo completo', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new SaveService(storage);
    const game = freshGame();

    grantXp(game.player, 200);
    game.player.gold = 777;
    recordWorldEvent(game, {
      type: 'questCompleted', cause: 'teste', consequences: [], importance: 60,
      summary: 'Um acontecimento importante.',
    });

    await service.save(SLOT, game, { full: true });

    const loaded = await new SaveService(storage).load(SLOT, template());
    expect(loaded.ok).toBe(true);
    const restored = loaded.state!;
    expect(restored.player.name).toBe('Arquivista');
    expect(restored.player.gold).toBe(777);
    expect(restored.player.level).toBe(game.player.level);
    expect(restored.world.seedLabel).toBe('save-0001');
    expect(Object.keys(restored.npcs)).toHaveLength(Object.keys(game.npcs).length);
    expect(restored.chronicle.length).toBe(game.chronicle.length);
    expect(restored.events.length).toBe(game.events.length);
  });

  it('grava só as partições sujas', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new SaveService(storage);
    const game = freshGame('save-incremental');
    await service.save(SLOT, game, { full: true });
    expect(service.hasPendingWrites()).toBe(false);

    service.markDirty('player');
    const report = await service.save(SLOT, game);
    expect(report.partitionsWritten).toContain('player');
    expect(report.partitionsWritten).not.toContain('npcs');
    expect(report.partitionsWritten.length).toBeLessThan(4);
  });

  it('não escreve nada quando não há alterações', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new SaveService(storage);
    const game = freshGame('save-clean');
    await service.save(SLOT, game, { full: true });
    const report = await service.save(SLOT, game);
    expect(report.partitionsWritten).toHaveLength(0);
  });

  it('recupera do backup quando a partição atual corrompe', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new SaveService(storage);
    const game = freshGame('save-corrupt');

    game.player.gold = 100;
    await service.save(SLOT, game, { full: true });

    // Second write pushes the first version into the backup slot.
    game.player.gold = 4242;
    service.markDirty('player');
    await service.save(SLOT, game);

    storage.corrupt(partitionKey(SLOT, 'player'));

    const report = await new SaveService(storage).load(SLOT, template());
    expect(report.recoveredPartitions).toContain('player');
    expect(report.state!.player.name).toBe('Arquivista');
    // The backup holds the previous generation, so the last write is lost — but the save survives.
    expect(report.state!.player.gold).toBe(100);
  });

  it('reporta falha quando nem a partição nem o backup servem', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new SaveService(storage);
    await service.save(SLOT, freshGame('save-broken'), { full: true });

    storage.corrupt(partitionKey(SLOT, 'player'));
    storage.corrupt(`rpg:backup:${SLOT}:player`);

    const report = await new SaveService(storage).load(SLOT, template());
    expect(report.ok).toBe(false);
    expect(report.failedPartitions).toContain('player');
  });

  it('mantém o índice de slots e permite apagar', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new SaveService(storage);
    const game = freshGame('save-index');
    await service.save(SLOT, game, { full: true });

    const index = await service.readIndex();
    expect(index.activeSlotId).toBe(SLOT);
    expect(index.slots[0]!.heroName).toBe('Arquivista');
    expect(index.slots[0]!.seedLabel).toBe('save-index');

    expect(await service.hasSave(SLOT)).toBe(true);
    await service.deleteSlot(SLOT);
    expect(await service.hasSave(SLOT)).toBe(false);
    expect((await service.readIndex()).slots).toHaveLength(0);
  });

  it('load falha graciosamente para um slot inexistente', async () => {
    const service = new SaveService(new MemoryStorageAdapter());
    const report = await service.load('slot_vazio', template());
    expect(report.ok).toBe(true);
    expect(report.state).not.toBeNull();
  });
});

describe('migrações', () => {
  it('v1 adiciona contadores do jogador', () => {
    const result = migratePartition('player', 1, { name: 'Antigo', level: 3 });
    const data = result.data as Record<string, unknown>;
    expect(data.stats).toEqual({ enemiesDefeated: 0, questsCompleted: 0, dungeonsCleared: 0, daysLived: 0 });
    expect(data.playtimeSeconds).toBe(0);
    expect(result.applied.length).toBeGreaterThan(0);
  });

  it('v1 adiciona recentFingerprints ao mundo', () => {
    const result = migratePartition('world', 1, { world: { seed: 'x' }, locationStates: {} });
    const world = (result.data as Record<string, unknown>).world as Record<string, unknown>;
    expect(world.recentFingerprints).toEqual([]);
  });

  it('v2 adiciona pendingConsequences aos estados de local', () => {
    const result = migratePartition('world', 2, {
      world: { seed: 'x', recentFingerprints: [] },
      locationStates: { location_a: { locationId: 'location_a', prosperity: 50 } },
    });
    const states = (result.data as Record<string, unknown>).locationStates as Record<string, Record<string, unknown>>;
    expect(states.location_a!.pendingConsequences).toEqual([]);
  });

  it('dados já na versão atual passam intactos', () => {
    const payload = { name: 'Atual', stats: { enemiesDefeated: 4, questsCompleted: 1, dungeonsCleared: 0, daysLived: 9 } };
    const result = migratePartition('player', SCHEMA_VERSION, payload);
    expect(result.data).toEqual(payload);
    expect(result.applied).toHaveLength(0);
  });

  it('save antigo carrega e é migrado ponta a ponta', async () => {
    const storage = new MemoryStorageAdapter();
    const game = freshGame('save-migrate');
    const legacyPlayer: Record<string, unknown> = { ...game.player };
    delete legacyPlayer.stats;
    delete legacyPlayer.playtimeSeconds;

    await storage.setItem(partitionKey(SLOT, 'player'), JSON.stringify({
      schemaVersion: 1, checksum: checksumOf(legacyPlayer), updatedAt: Date.now(), data: legacyPlayer,
    }));

    const report = await new SaveService(storage).load(SLOT, template());
    expect(report.migrationsApplied.length).toBeGreaterThan(0);
    expect(report.state!.player.stats.daysLived).toBe(0);
  });
});

describe('validação de saves', () => {
  it('repara NaN, negativos impossíveis e referências órfãs', () => {
    const game = freshGame('save-validate');
    game.player.gold = Number.NaN;
    game.player.level = -4;
    game.player.attributes.wisdom = -10;
    game.player.inventoryItemIds.push('item_inexistente');
    game.player.equipment.helmet = 'item_fantasma';

    const issues = validateAndRepair(game);
    expect(game.player.gold).toBe(0);
    expect(game.player.level).toBe(1);
    expect(game.player.attributes.wisdom).toBe(0);
    expect(game.player.inventoryItemIds).not.toContain('item_inexistente');
    expect(game.player.equipment.helmet).toBeNull();
    expect(issues.length).toBeGreaterThan(0);
  });

  it('reposiciona o jogador quando o local some', () => {
    const game = freshGame('save-validate-2');
    game.player.currentLocationId = 'location_inexistente';
    validateAndRepair(game);
    expect(game.locations[game.player.currentLocationId]).toBeDefined();
  });

  it('marca como fracassada a quest cujo NPC não existe mais', () => {
    const game = freshGame('save-validate-3');
    game.quests.quest_x = {
      id: 'quest_x', title: 'Órfã', template: 'bp', type: 'hunt', giverNpcId: 'npc_fantasma',
      motivation: '', problem: '', locationId: game.player.currentLocationId, targetRef: 'cre_wolf',
      complication: '', worldContextSummary: '', relationshipContext: '', consequence: '',
      hiddenCause: '', causeRevealed: false, briefing: '', objectives: [], rewards: {
        gold: 0, xp: 0, itemIds: [], reputation: [], relationship: null,
      }, choices: [], chosenChoiceId: null, state: 'active', fingerprint: 'f',
      createdDay: 1, expiresDay: null, level: 1,
    };
    validateAndRepair(game);
    expect(game.quests.quest_x!.state).toBe('failed');
  });

  it('remove memórias de NPCs inexistentes', () => {
    const game = freshGame('save-validate-4');
    game.memories.npc_fantasma = [];
    game.relationships.npc_fantasma = {
      npcId: 'npc_fantasma', targetId: 'player', affinity: 0, trust: 0,
      fear: 0, respect: 0, gratitude: 0, hostility: 0, familiarity: 0,
    };
    validateAndRepair(game);
    expect(game.memories.npc_fantasma).toBeUndefined();
    expect(game.relationships.npc_fantasma).toBeUndefined();
  });
});

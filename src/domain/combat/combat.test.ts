import { createNewGame } from '@/game/newGame';
import type { GameState } from '@/domain/world/gameState';
import { combatDeps, resolveCombat, startBossEncounter, startRandomEncounter } from '@/game/combatFlow';
import { performAction } from '@/domain/combat/combatEngine';
import { currentActor, isPlayerTurn, livingOf } from '@/domain/combat/combat';
import { spendSkillPoint } from '@/domain/player/progression';
import { DRUID_TREE } from '@/data/classes';

function state(seed = 'combat-0001'): GameState {
  const game = createNewGame({
    heroName: 'Teste', classId: 'druid', originId: 'origin_grove',
    presentation: 'androgynous', allocatedAttributes: {}, seedLabel: seed,
  });
  // Wilderness has encounters; the capital is safe.
  const wild = Object.values(game.locations).find((location) => location.kind === 'wilderness')!;
  game.player.currentLocationId = wild.id;
  return game;
}

describe('combate por turnos', () => {
  it('inicia com ordem por velocidade e turno do herói', () => {
    const game = state();
    const combat = startRandomEncounter(game)!;
    expect(combat).not.toBeNull();
    expect(combat.order.length).toBeGreaterThan(1);
    expect(combat.log.length).toBeGreaterThan(0);
    expect(combat.outcome).toBe('ongoing');
    expect(currentActor(combat)).not.toBeNull();
  });

  it('atacar causa dano ao alvo', () => {
    const game = state('combat-attack');
    const combat = startRandomEncounter(game)!;
    if (!isPlayerTurn(combat)) return;
    const target = livingOf(combat, 'enemy')[0]!;
    const before = target.hp;
    performAction(combat, { kind: 'attack', targetId: target.id }, combatDeps(game));
    expect(combat.combatants[target.id]!.hp).toBeLessThanOrEqual(before);
  });

  it('é determinístico: mesma seed e mesmas ações, mesmo resultado', () => {
    const run = () => {
      const game = state('combat-determinism');
      const combat = startRandomEncounter(game)!;
      for (let i = 0; i < 12 && combat.outcome === 'ongoing'; i++) {
        if (!isPlayerTurn(combat)) break;
        const target = livingOf(combat, 'enemy')[0];
        if (!target) break;
        performAction(combat, { kind: 'attack', targetId: target.id }, combatDeps(game));
      }
      return { outcome: combat.outcome, log: combat.log.map((entry) => entry.text) };
    };
    expect(run()).toEqual(run());
  });

  it('habilidade consome mana e respeita recarga', () => {
    const game = state('combat-skill');
    const node = DRUID_TREE.nodes.find((entry) => entry.id === 'skill_thorn_lash')!;
    spendSkillPoint(game.player, node);

    const combat = startRandomEncounter(game)!;
    const hero = combat.combatants.hero!;
    hero.skillRanks[node.id] = 1;
    hero.mana = hero.maxMana;
    const manaBefore = hero.mana;
    const target = livingOf(combat, 'enemy')[0]!;

    const result = performAction(combat, { kind: 'skill', skillId: node.id, targetId: target.id }, combatDeps(game));
    expect(result.ok).toBe(true);
    expect(combat.combatants.hero!.mana).toBeLessThan(manaBefore);
  });

  it('recusa habilidade não desbloqueada ou sem mana', () => {
    const game = state('combat-noskill');
    const combat = startRandomEncounter(game)!;
    const target = livingOf(combat, 'enemy')[0]!;

    const locked = performAction(combat, { kind: 'skill', skillId: 'skill_elder_call', targetId: target.id }, combatDeps(game));
    expect(locked.ok).toBe(false);
    expect(locked.reason).toContain('desbloqueada');

    combat.combatants.hero!.skillRanks.skill_thorn_lash = 1;
    combat.combatants.hero!.mana = 0;
    const broke = performAction(combat, { kind: 'skill', skillId: 'skill_thorn_lash', targetId: target.id }, combatDeps(game));
    expect(broke.ok).toBe(false);
    expect(broke.reason).toContain('Mana');
  });

  it('defender aumenta a mitigação e recupera mana', () => {
    const game = state('combat-defend');
    const combat = startRandomEncounter(game)!;
    combat.combatants.hero!.mana = 0;
    performAction(combat, { kind: 'defend' }, combatDeps(game));
    expect(combat.combatants.hero!.mana).toBeGreaterThan(0);
  });

  it('não é possível fugir de um chefe', () => {
    const game = state('combat-boss-flee');
    const combat = startBossEncounter(game, 'boss_warden', 9, 'dungeon_x');
    performAction(combat, { kind: 'flee' }, combatDeps(game));
    expect(combat.outcome).not.toBe('fled');
    expect(combat.log.some((entry) => entry.text.includes('Não há para onde fugir'))).toBe(true);
  });

  it('chefes anunciam mudança de fase ao cruzar o limiar de vida', () => {
    const game = state('combat-boss-phase');
    const combat = startBossEncounter(game, 'boss_warden', 9, 'dungeon_x');
    const boss = livingOf(combat, 'enemy')[0]!;
    boss.hp = Math.round(boss.maxHp * 0.4);
    const attackBefore = boss.physicalAttack;

    const target = boss.id;
    performAction(combat, { kind: 'attack', targetId: target }, combatDeps(game));
    const after = combat.combatants[target]!;
    expect(after.phasesTriggered).toBeGreaterThan(0);
    expect(after.physicalAttack).toBeGreaterThan(attackBefore);
  });

  it('a vitória concede XP, ouro, loot e registra no bestiário', () => {
    const game = state('combat-victory');
    const combat = startRandomEncounter(game)!;
    for (const enemy of livingOf(combat, 'enemy')) enemy.hp = 0;
    combat.outcome = 'victory';

    const xpBefore = game.player.xp;
    const resolution = resolveCombat(game)!;
    expect(resolution.outcome).toBe('victory');
    expect(resolution.xp).toBeGreaterThan(0);
    expect(game.player.xp + resolution.levelsGained * 1000).toBeGreaterThan(xpBefore);
    expect(Object.keys(game.bestiary).length).toBeGreaterThan(0);
    expect(game.combat).toBeNull();
  });

  it('a derrota custa moedas mas não mata permanentemente', () => {
    const game = state('combat-defeat');
    game.player.gold = 1000;
    const combat = startRandomEncounter(game)!;
    combat.combatants.hero!.hp = 0;
    combat.outcome = 'defeat';

    const resolution = resolveCombat(game)!;
    expect(resolution.outcome).toBe('defeat');
    expect(game.player.gold).toBeLessThan(1000);
    expect(game.player.resources.hp).toBeGreaterThan(0);
  });

  it('o combate sempre termina: nunca laça indefinidamente', () => {
    const game = state('combat-termination');
    const combat = startRandomEncounter(game)!;
    let guard = 0;
    while (combat.outcome === 'ongoing' && guard < 300) {
      guard += 1;
      const target = livingOf(combat, 'enemy')[0];
      if (!target) break;
      performAction(combat, { kind: 'attack', targetId: target.id }, combatDeps(game));
    }
    expect(guard).toBeLessThan(300);
    expect(['victory', 'defeat', 'fled']).toContain(combat.outcome);
  });

  it('HP nunca fica negativo e mana nunca passa do máximo', () => {
    const game = state('combat-bounds');
    const combat = startRandomEncounter(game)!;
    let guard = 0;
    while (combat.outcome === 'ongoing' && guard < 200) {
      guard += 1;
      const target = livingOf(combat, 'enemy')[0];
      if (!target) break;
      performAction(combat, { kind: 'attack', targetId: target.id }, combatDeps(game));
      for (const combatant of Object.values(combat.combatants)) {
        expect(combatant.hp).toBeGreaterThanOrEqual(0);
        expect(combatant.mana).toBeLessThanOrEqual(combatant.maxMana);
      }
    }
  });
});

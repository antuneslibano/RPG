import { BALANCE, mitigate, totalXpToReach, xpForNextLevel } from '@/domain/player/balance';
import { grantXp, spendAttributePoint, spendSkillPoint, xpProgress } from '@/domain/player/progression';
import { computeDerivedStats } from '@/domain/player/stats';
import { createNewGame } from '@/game/newGame';
import { DRUID_TREE } from '@/data/classes';

function hero() {
  return createNewGame({
    heroName: 'Teste', classId: 'druid', originId: 'origin_grove',
    presentation: 'androgynous', allocatedAttributes: {}, seedLabel: 'prog-0001',
  }).player;
}

describe('curva de XP', () => {
  it('cresce monotonicamente e é finita até o nível máximo', () => {
    let previous = 0;
    for (let level = 1; level < BALANCE.maxLevel; level++) {
      const needed = xpForNextLevel(level);
      expect(Number.isFinite(needed)).toBe(true);
      expect(needed).toBeGreaterThan(previous);
      previous = needed;
    }
    expect(xpForNextLevel(BALANCE.maxLevel)).toBe(Number.POSITIVE_INFINITY);
  });

  it('totalXpToReach soma os degraus anteriores', () => {
    expect(totalXpToReach(1)).toBe(0);
    expect(totalXpToReach(4)).toBe(xpForNextLevel(1) + xpForNextLevel(2) + xpForNextLevel(3));
  });
});

describe('grantXp', () => {
  it('sobe um nível ao cruzar o limiar e concede pontos', () => {
    const player = hero();
    const result = grantXp(player, xpForNextLevel(1));
    expect(result.levelsGained).toBe(1);
    expect(player.level).toBe(2);
    expect(result.attributePointsGained).toBe(BALANCE.pointsPerLevel.attribute);
    expect(player.skillPoints).toBe(1 + BALANCE.pointsPerLevel.skill);
  });

  it('resolve múltiplos níveis numa única concessão', () => {
    const player = hero();
    const result = grantXp(player, 100000);
    expect(result.levelsGained).toBeGreaterThan(3);
    expect(player.level).toBeGreaterThan(4);
  });

  it('nunca ultrapassa o nível máximo e zera o XP residual', () => {
    const player = hero();
    grantXp(player, 10 ** 9);
    expect(player.level).toBe(BALANCE.maxLevel);
    expect(player.xp).toBe(0);
    expect(xpProgress(player).ratio).toBe(1);
  });

  it('ignora XP negativo ou inválido', () => {
    const player = hero();
    grantXp(player, -500);
    expect(player.xp).toBe(0);
    grantXp(player, Number.NaN);
    expect(player.xp).toBe(0);
  });
});

describe('pontos de atributo e habilidade', () => {
  it('só gasta atributo quando há pontos', () => {
    const player = hero();
    expect(spendAttributePoint(player, 'wisdom')).toBe(false);
    player.attributePoints = 1;
    const before = player.attributes.wisdom;
    expect(spendAttributePoint(player, 'wisdom')).toBe(true);
    expect(player.attributes.wisdom).toBe(before + 1);
    expect(player.attributePoints).toBe(0);
  });

  it('respeita nível mínimo e pré-requisitos das habilidades', () => {
    const player = hero();
    const ultimate = DRUID_TREE.nodes.find((node) => node.id === 'skill_primal_fury')!;
    const blocked = spendSkillPoint(player, ultimate);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain('nível');

    const basic = DRUID_TREE.nodes.find((node) => node.id === 'skill_thorn_lash')!;
    const unlocked = spendSkillPoint(player, basic);
    expect(unlocked.ok).toBe(true);
    expect(unlocked.rank).toBe(1);
    expect(player.skillPoints).toBe(0);
  });

  it('não passa do rank máximo', () => {
    const player = hero();
    const prerequisite = DRUID_TREE.nodes.find((entry) => entry.id === 'skill_thorn_lash')!;
    const node = DRUID_TREE.nodes.find((entry) => entry.id === 'skill_entangle')!;
    player.level = 30;
    player.skillPoints = 20;
    for (let i = 0; i < 3; i++) expect(spendSkillPoint(player, prerequisite).ok).toBe(true);
    for (let i = 0; i < node.maxRank; i++) expect(spendSkillPoint(player, node).ok).toBe(true);
    const extra = spendSkillPoint(player, node);
    expect(extra.ok).toBe(false);
    expect(player.skillRanks[node.id]).toBe(node.maxRank);
  });
});

describe('stats derivados', () => {
  it('escalam com nível e atributos', () => {
    const player = hero();
    const low = computeDerivedStats({ level: 1, attributes: player.attributes, equipment: [] });
    const high = computeDerivedStats({
      level: 10,
      attributes: { ...player.attributes, vitality: player.attributes.vitality + 10 },
      equipment: [],
    });
    expect(high.maxHp).toBeGreaterThan(low.maxHp);
    expect(high.defense).toBeGreaterThan(low.defense);
  });

  it('crítico e esquiva nunca chegam a 100%', () => {
    const stats = computeDerivedStats({
      level: 60,
      attributes: { strength: 999, vitality: 999, intelligence: 999, wisdom: 999, dexterity: 999, agility: 999, luck: 999 },
      equipment: [],
    });
    expect(stats.critChance).toBeLessThanOrEqual(BALANCE.crit.hardCap);
    expect(stats.dodgeChance).toBeLessThanOrEqual(BALANCE.dodge.hardCap);
  });

  it('nunca produz NaN nem valores negativos impossíveis', () => {
    const stats = computeDerivedStats({
      level: Number.NaN as unknown as number,
      attributes: { strength: -5, vitality: -5, intelligence: -5, wisdom: -5, dexterity: -5, agility: -5, luck: -5 },
      equipment: [],
    });
    for (const value of Object.values(stats)) expect(Number.isFinite(value)).toBe(true);
    expect(stats.maxHp).toBeGreaterThan(0);
    expect(stats.defense).toBeGreaterThanOrEqual(0);
  });
});

describe('mitigação', () => {
  it('reduz o dano mas nunca abaixo de 1', () => {
    expect(mitigate(100, 0)).toBe(100);
    expect(mitigate(100, 60)).toBeLessThan(100);
    expect(mitigate(1, 100000)).toBe(1);
  });
});

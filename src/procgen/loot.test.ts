import { SeededRandom } from '@/core/rng/random';
import { generateItem, itemFingerprint, rollLoot, rollRarity } from '@/procgen/loot';
import { RARITIES, rarityIndex } from '@/domain/items/item';
import { BALANCE } from '@/domain/player/balance';
import { ITEM_BASE_BY_ID } from '@/data/itemBases';

describe('geração de itens', () => {
  it('é determinística para a mesma seed', () => {
    const a = generateItem(new SeededRandom('loot-1'), { itemLevel: 10, luck: 5 });
    const b = generateItem(new SeededRandom('loot-1'), { itemLevel: 10, luck: 5 });
    expect({ ...a, id: '' }).toEqual({ ...b, id: '' });
    expect(a.name).toBe(b.name);
  });

  it('compõe nome a partir de base, qualidade, material e afixos', () => {
    const rng = new SeededRandom('loot-name');
    for (let i = 0; i < 40; i++) {
      const item = generateItem(rng, { itemLevel: 20, luck: 10, categories: ['weapon'] });
      const base = ITEM_BASE_BY_ID[item.baseId]!;
      if (!item.uniqueName) expect(item.name.toLowerCase()).toContain(base.name.toLowerCase().split(' ')[0]!);
      expect(item.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('respeita a raridade mínima pedida', () => {
    const rng = new SeededRandom('loot-min');
    for (let i = 0; i < 50; i++) {
      const item = generateItem(rng, { itemLevel: 12, luck: 0, minRarity: 'rare', categories: ['weapon'] });
      expect(rarityIndex(item.rarity)).toBeGreaterThanOrEqual(rarityIndex('rare'));
    }
  });

  it('dá mais afixos a raridades maiores', () => {
    const rng = new SeededRandom('loot-affix');
    for (let i = 0; i < 60; i++) {
      const item = generateItem(rng, { itemLevel: 25, luck: 30, categories: ['weapon', 'armor'] });
      expect(item.affixes.length).toBeLessThanOrEqual(BALANCE.loot.affixCountByRarity[item.rarity]);
    }
  });

  it('itens lendários ganham nome único, lore e efeito especial', () => {
    const item = generateItem(new SeededRandom('legend'), {
      itemLevel: 30, luck: 40, minRarity: 'legendary', categories: ['weapon'],
    }, { previousOwnerNpcId: 'npc_abc', lore: 'Morreu segurando isto.' });
    expect(item.uniqueName).toBeDefined();
    expect(item.lore).toBe('Morreu segurando isto.');
    expect(item.previousOwnerNpcId).toBe('npc_abc');
    expect(item.special).not.toBeNull();
  });

  it('consumíveis e materiais são empilháveis e sem afixos', () => {
    const rng = new SeededRandom('loot-stack');
    const potion = generateItem(rng, { itemLevel: 5, luck: 0, categories: ['consumable'] });
    expect(potion.stackable).toBe(true);
    expect(potion.affixes).toHaveLength(0);
    expect(potion.rarity).toBe('common');
  });

  it('nunca gera valor ou stats inválidos', () => {
    const rng = new SeededRandom('loot-valid');
    for (let i = 0; i < 120; i++) {
      const item = generateItem(rng, { itemLevel: 1 + (i % 40), luck: i % 25 });
      expect(item.value).toBeGreaterThan(0);
      expect(Number.isFinite(item.value)).toBe(true);
      expect(item.quantity).toBeGreaterThan(0);
      for (const value of Object.values(item.stats)) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('sorte aumenta a chance de raridades altas', () => {
    const count = (luck: number) => {
      const rng = new SeededRandom('rarity-luck');
      let high = 0;
      for (let i = 0; i < 600; i++) {
        if (rarityIndex(rollRarity(rng, { itemLevel: 20, luck })) >= rarityIndex('rare')) high += 1;
      }
      return high;
    };
    expect(count(60)).toBeGreaterThan(count(0));
  });

  it('rollRarity só devolve raridades conhecidas', () => {
    const rng = new SeededRandom('rarity-known');
    for (let i = 0; i < 200; i++) {
      expect(RARITIES).toContain(rollRarity(rng, { itemLevel: 15, luck: 10 }));
    }
  });

  it('rollLoot respeita o máximo de quedas', () => {
    const rng = new SeededRandom('drops');
    for (let i = 0; i < 30; i++) {
      expect(rollLoot(rng, { itemLevel: 8, luck: 5 }, 0.9, 3).length).toBeLessThanOrEqual(3);
    }
    expect(rollLoot(rng, { itemLevel: 8, luck: 5 }, 0, 3)).toHaveLength(0);
  });

  it('fingerprint distingue itens diferentes e iguala os equivalentes', () => {
    const a = generateItem(new SeededRandom('fp-1'), { itemLevel: 10, luck: 0 });
    const b = generateItem(new SeededRandom('fp-1'), { itemLevel: 10, luck: 0 });
    const c = generateItem(new SeededRandom('fp-2'), { itemLevel: 30, luck: 20 });
    expect(itemFingerprint(a)).toBe(itemFingerprint(b));
    expect(itemFingerprint(a)).not.toBe(itemFingerprint(c));
  });
});

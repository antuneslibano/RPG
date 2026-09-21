import { RngStreams, SeededRandom, fnv1a, generateSeedLabel, hashSeed, normalizeSeedLabel } from '@/core/rng/random';

describe('SeededRandom', () => {
  it('produz a mesma sequência para a mesma seed', () => {
    const a = new SeededRandom('verdalia-7f3a');
    const b = new SeededRandom('verdalia-7f3a');
    const left = Array.from({ length: 50 }, () => a.next());
    const right = Array.from({ length: 50 }, () => b.next());
    expect(left).toEqual(right);
  });

  it('produz sequências diferentes para seeds diferentes', () => {
    const a = new SeededRandom('seed-a');
    const b = new SeededRandom('seed-b');
    expect(a.next()).not.toBe(b.next());
  });

  it('mantém int dentro dos limites inclusivos', () => {
    const rng = new SeededRandom('bounds');
    for (let i = 0; i < 500; i++) {
      const value = rng.int(3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('int aceita limites invertidos', () => {
    const rng = new SeededRandom('inverted');
    const value = rng.int(9, 2);
    expect(value).toBeGreaterThanOrEqual(2);
    expect(value).toBeLessThanOrEqual(9);
  });

  it('shuffle não muta a entrada e preserva os elementos', () => {
    const rng = new SeededRandom('shuffle');
    const source = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle(source);
    expect(source).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual(source);
  });

  it('sample devolve no máximo o tamanho do pool', () => {
    const rng = new SeededRandom('sample');
    expect(rng.sample([1, 2], 10)).toHaveLength(2);
    expect(rng.sample([1, 2, 3], 0)).toHaveLength(0);
  });

  it('weighted respeita pesos zero ou negativos', () => {
    const rng = new SeededRandom('weighted');
    for (let i = 0; i < 100; i++) {
      const picked = rng.weighted([
        { value: 'nunca', weight: 0 },
        { value: 'negativo', weight: -5 },
        { value: 'sempre', weight: 3 },
      ]);
      expect(picked).toBe('sempre');
    }
  });

  it('weighted lança quando não há peso positivo', () => {
    const rng = new SeededRandom('weighted-empty');
    expect(() => rng.weighted([{ value: 'x', weight: 0 }])).toThrow();
  });

  it('pick lança em array vazio', () => {
    expect(() => new SeededRandom('empty').pick([])).toThrow();
  });

  it('salva e restaura estado exatamente', () => {
    const rng = new SeededRandom('state');
    rng.next();
    rng.next();
    const snapshot = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];

    rng.setState(snapshot);
    expect([rng.next(), rng.next(), rng.next()]).toEqual(expected);
  });

  it('derive é determinístico e independente do pai', () => {
    const a = new SeededRandom('parent');
    const b = new SeededRandom('parent');
    expect(a.derive('child').next()).toBe(b.derive('child').next());
  });
});

describe('RngStreams', () => {
  it('mantém streams independentes: consumir loot não altera o mundo', () => {
    const control = new RngStreams('mundo-1');
    const expected = Array.from({ length: 5 }, () => control.get('world').next());

    const streams = new RngStreams('mundo-1');
    for (let i = 0; i < 200; i++) streams.get('loot').next();
    const actual = Array.from({ length: 5 }, () => streams.get('world').next());

    expect(actual).toEqual(expected);
  });

  it('forKey é independente do quanto o stream já foi consumido', () => {
    const streams = new RngStreams('mundo-2');
    const first = streams.forKey('npc', 'npc_42').next();
    for (let i = 0; i < 500; i++) streams.get('npc').next();
    const second = streams.forKey('npc', 'npc_42').next();
    expect(second).toBe(first);
  });

  it('snapshot e restore reproduzem o estado', () => {
    const streams = new RngStreams('mundo-3');
    streams.get('quest').next();
    streams.get('quest').next();
    const snapshot = streams.snapshot();
    const expected = streams.get('quest').next();

    streams.restore(snapshot);
    expect(streams.get('quest').next()).toBe(expected);
  });

  it('restore ignora valores inválidos', () => {
    const streams = new RngStreams('mundo-4');
    const before = streams.get('world').getState();
    streams.restore({ world: Number.NaN, inexistente: 5 });
    expect(streams.get('world').getState()).toBe(before);
  });

  it('rejeita stream desconhecido', () => {
    const streams = new RngStreams('mundo-5');
    // @ts-expect-error validação em runtime de um nome inválido
    expect(() => streams.get('inexistente')).toThrow();
  });
});

describe('hashes e seeds', () => {
  it('hashSeed e fnv1a são estáveis e não negativos', () => {
    expect(hashSeed('verdalia')).toBe(hashSeed('verdalia'));
    expect(fnv1a('verdalia')).toBe(fnv1a('verdalia'));
    expect(hashSeed('a')).toBeGreaterThanOrEqual(0);
    expect(fnv1a('')).toBeGreaterThanOrEqual(0);
  });

  it('normalizeSeedLabel limpa entrada e nunca devolve vazio', () => {
    expect(normalizeSeedLabel('  Verdália 7F3A!! ')).toBe('verdlia7f3a');
    expect(normalizeSeedLabel('***')).toBe('verdalia-0000');
    expect(normalizeSeedLabel('x'.repeat(80))).toHaveLength(32);
  });

  it('generateSeedLabel é legível e determinístico', () => {
    const label = generateSeedLabel(new SeededRandom('gen'));
    expect(label).toMatch(/^[a-z]+-[0-9a-f]{4}$/);
    expect(generateSeedLabel(new SeededRandom('gen'))).toBe(label);
  });
});

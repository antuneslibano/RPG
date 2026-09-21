import type { QuestType } from '@/domain/quest/quest';

export interface QuestBlueprint {
  id: string;
  type: QuestType;
  /** "{actor}", "{target}", "{place}", "{problem}" are filled from context. */
  titles: readonly string[];
  problems: readonly string[];
  objectives: readonly { kind: string; template: string; required: [number, number] }[];
  complications: readonly string[];
  consequences: readonly string[];
  /** The real reason behind the surface task — discoverable, never stated upfront. */
  hiddenCauses: readonly string[];
  minLevel: number;
}

export const QUEST_BLUEPRINTS: readonly QuestBlueprint[] = [
  {
    id: 'bp_hunt_displaced', type: 'hunt', minLevel: 1,
    titles: ['O que desceu da {place}', 'Presas perto de {place}', 'A caçada de {actor}'],
    problems: ['criaturas atacando a estrada', 'rebanhos dizimados à noite', 'trilhas tomadas por feras'],
    objectives: [{ kind: 'kill', template: 'Abater {target}', required: [3, 6] }, { kind: 'investigate', template: 'Descobrir por que {target} desceu até aqui', required: [1, 1] }],
    complications: ['a criatura é protegida pelos druidas', 'outro caçador reivindica a recompensa', 'a guarda proibiu caçadas na área'],
    consequences: ['escolher um lado', 'a região fica mais segura', 'a facção envolvida reage'],
    hiddenCauses: [
      'Algo maior expulsou {target} do habitat original.',
      'A fonte de água da mata foi envenenada e a caça migrou.',
      'Um ritual no bosque rompeu o limite que mantinha {target} afastado.',
    ],
  },
  {
    id: 'bp_rescue_relative', type: 'rescue', minLevel: 2,
    titles: ['Alguém de {actor} não voltou', 'Resgate em {place}', 'O desaparecido de {place}'],
    problems: ['um parente desapareceu', 'um aprendiz não voltou da estrada', 'uma criança sumiu depois do anoitecer'],
    objectives: [{ kind: 'visit', template: 'Procurar em {place}', required: [1, 1] }, { kind: 'kill', template: 'Afastar {target}', required: [2, 4] }, { kind: 'talk', template: 'Levar notícias a {actor}', required: [1, 1] }],
    complications: ['o desaparecido não quer voltar', 'quem o levou tem motivos', 'a família esconde parte da história'],
    consequences: ['a relação com {actor} muda permanentemente', 'a vila passa a confiar em você', 'alguém culpa você pelo desfecho'],
    hiddenCauses: [
      'O desaparecido fugiu por vontade própria de uma dívida.',
      'Foi levado como pagamento de um acordo antigo da família.',
      'Descobriu algo que alguém em {place} precisa manter enterrado.',
    ],
  },
  {
    id: 'bp_gather_remedy', type: 'gather', minLevel: 1,
    titles: ['O remédio de {actor}', 'Colheita urgente em {place}', 'O que falta na botica'],
    problems: ['envenenamento sem antídoto', 'doença se espalhando', 'reservas de erva esgotadas'],
    objectives: [{ kind: 'collect', template: 'Reunir {target}', required: [4, 8] }, { kind: 'talk', template: 'Entregar a {actor}', required: [1, 1] }],
    complications: ['a planta só cresce em terreno perigoso', 'outro comprador paga mais', 'o material é considerado sagrado'],
    consequences: ['preços de consumíveis mudam', 'a doença recua ou avança', 'uma facção fica em dívida com você'],
    hiddenCauses: [
      'O veneno não foi acidente: alguém o administrou.',
      'A doença veio com uma caravana que ninguém quer citar.',
      'A escassez é artificial — há estoque guardado em {place}.',
    ],
  },
  {
    id: 'bp_investigate_omen', type: 'investigation', minLevel: 3,
    titles: ['Sinais em {place}', 'O que {actor} viu', 'Presságios'],
    problems: ['animais sumindo sem rastro', 'sons vindos do cemitério', 'marcas que ninguém reconhece'],
    objectives: [{ kind: 'visit', template: 'Examinar {place}', required: [1, 1] }, { kind: 'investigate', template: 'Encontrar a origem dos sinais', required: [1, 1] }, { kind: 'kill', template: 'Enfrentar {target}', required: [1, 3] }],
    complications: ['ninguém quer testemunhar', 'a autoridade local nega o problema', 'as pistas apontam para um aliado'],
    consequences: ['uma masmorra se abre', 'a cidade se prepara ou é pega desprevenida', 'rumores se espalham'],
    hiddenCauses: [
      'Um necromante se instalou perto de {place}.',
      'Um selo antigo rachou e algo está vazando.',
      'Alguém de {place} está alimentando aquilo de propósito.',
    ],
  },
  {
    id: 'bp_defense_raid', type: 'defense', minLevel: 4,
    titles: ['Defender {place}', 'Antes do próximo ataque', 'A guarda pede ajuda'],
    problems: ['saqueadores voltarão em dias', 'a paliçada não aguenta outro ataque', 'a guarda está em menor número'],
    objectives: [{ kind: 'kill', template: 'Repelir {target}', required: [4, 7] }, { kind: 'talk', template: 'Reportar a {actor}', required: [1, 1] }],
    complications: ['metade da guarda foi subornada', 'os atacantes já estiveram do lado de dentro', 'há reféns'],
    consequences: ['a vila sobrevive ou é parcialmente destruída', 'a prosperidade local muda', 'a facção atacante guarda rancor'],
    hiddenCauses: [
      'Os saqueadores foram expulsos de seu próprio território.',
      'Alguém de dentro informou as rotas de suprimento.',
      'A fome, não a ganância, move o ataque.',
    ],
  },
  {
    id: 'bp_dungeon_delve', type: 'dungeon', minLevel: 5,
    titles: ['O que dorme sob {place}', 'Descer até o fundo', 'A porta que reabriu'],
    problems: ['uma passagem se abriu no chão', 'a mina foi abandonada às pressas', 'o santuário foi profanado'],
    objectives: [{ kind: 'clearDungeon', template: 'Limpar {target}', required: [1, 1] }],
    complications: ['a entrada só abre à noite', 'alguém já desceu e não voltou', 'a facção local proíbe a entrada'],
    consequences: ['a ameaça some da região', 'o que estava lá se espalha', 'um item com história chega às suas mãos'],
    hiddenCauses: [
      'A masmorra surgiu como consequência de algo que aconteceu neste mundo.',
      'Um ritual falhou ali há gerações e nunca foi encerrado.',
      'O que dorme lá foi colocado lá de propósito.',
    ],
  },
  {
    id: 'bp_negotiation_feud', type: 'negotiation', minLevel: 3,
    titles: ['A disputa de {place}', 'Dois lados, uma estrada', 'O acordo que ninguém quer'],
    problems: ['duas facções disputam uma rota', 'uma dívida antiga travou o comércio', 'uma família se recusa a ceder terra'],
    objectives: [{ kind: 'talk', template: 'Ouvir {actor}', required: [1, 1] }, { kind: 'talk', template: 'Ouvir o outro lado', required: [1, 1] }, { kind: 'choose', template: 'Decidir o desfecho', required: [1, 1] }],
    complications: ['ambos os lados têm razão', 'você já deve favores a um deles', 'a decisão será lembrada'],
    consequences: ['reputação com duas facções muda em direções opostas', 'preços mudam na região', 'um NPC deixa a cidade'],
    hiddenCauses: [
      'A disputa começou com um erro de registro que ninguém admite.',
      'Um terceiro lucra enquanto os dois brigam.',
      'O motivo original morreu com quem o conhecia.',
    ],
  },
  {
    id: 'bp_escort_caravan', type: 'escort', minLevel: 2,
    titles: ['A caravana de {actor}', 'Estrada até {place}', 'Carga sensível'],
    problems: ['bandidos atacam caravanas', 'a rota mais curta virou perigosa', 'ninguém aceita o contrato'],
    objectives: [{ kind: 'visit', template: 'Chegar a {place}', required: [1, 1] }, { kind: 'kill', template: 'Afastar {target}', required: [2, 5] }],
    complications: ['a carga não é o que dizem', 'a guarda revista caravanas', 'o condutor tem inimigos'],
    consequences: ['a economia local muda', 'a liga mercante lembra disso', 'uma rota nova se abre'],
    hiddenCauses: [
      'A carga é contrabando e o contratante sabe.',
      'Os ataques são orquestrados por quem vende a proteção.',
      'A escassez encareceu a rota e criou os assaltos.',
    ],
  },
  {
    id: 'bp_personal_debt', type: 'personal', minLevel: 1,
    titles: ['Um favor de {actor}', 'O que ficou pendente', 'Entre você e {actor}'],
    problems: ['uma promessa não cumprida', 'uma dívida que constrange', 'um objeto que precisa voltar'],
    objectives: [{ kind: 'collect', template: 'Recuperar {target}', required: [1, 2] }, { kind: 'talk', template: 'Devolver a {actor}', required: [1, 1] }],
    complications: ['quem tem o objeto não vai devolver de graça', 'o objeto mudou de mãos várias vezes', 'devolvê-lo expõe um segredo'],
    consequences: ['{actor} passa a confiar em você de verdade', 'um segredo é revelado', 'alguém perde algo'],
    hiddenCauses: [
      'O objeto nunca pertenceu a {actor}.',
      'A dívida foi criada para manter {actor} por perto.',
      'Quem cobra a dívida já morreu; outro assumiu o nome.',
    ],
  },
  {
    id: 'bp_assassination_order', type: 'assassination', minLevel: 6,
    titles: ['Um nome numa lista', 'O contrato de {actor}', 'Silêncio em {place}'],
    problems: ['alguém precisa desaparecer', 'um traidor continua livre', 'uma ameaça cresce sem punição'],
    objectives: [{ kind: 'investigate', template: 'Confirmar a acusação', required: [1, 1] }, { kind: 'kill', template: 'Encerrar o caso de {target}', required: [1, 1] }],
    complications: ['o alvo tem família', 'a acusação pode ser falsa', 'a facção do alvo vai retaliar'],
    consequences: ['parentes e facção passam a te tratar de outro jeito', 'a guarda abre investigação', 'rumores se espalham rápido'],
    hiddenCauses: [
      'O alvo é inocente e {actor} sabe disso.',
      'O alvo é apenas o executor de alguém maior.',
      'A ordem veio de fora do reino.',
    ],
  },
];

export const QUEST_MOTIVATIONS: readonly string[] = [
  'salvar o irmão', 'proteger a filha', 'manter o negócio de pé', 'limpar o próprio nome',
  'honrar uma promessa', 'impedir outra perda', 'provar que estava certo',
  'pagar o que deve', 'não repetir o passado', 'garantir o inverno',
];

export const QUEST_REWARD_FLAVOUR: readonly string[] = [
  'moedas contadas na hora', 'algo que estava guardado há anos', 'um favor que vale mais que ouro',
  'acesso a um lugar fechado', 'a gratidão de quem raramente agradece',
];

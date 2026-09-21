/** Syllable pools — names are composed, never drawn from a fixed list. */
export const NAME_SYLLABLES = {
  personStart: ['Ed', 'Mar', 'Tal', 'Bre', 'Cor', 'Ael', 'Dor', 'Fen', 'Gir', 'Hal', 'Ior', 'Kel', 'Lun', 'Mor', 'Nei', 'Orv', 'Per', 'Rov', 'Sel', 'The', 'Ul', 'Val', 'Wyn', 'Yor'],
  personMid: ['a', 'e', 'i', 'o', 'ra', 'le', 'ri', 'do', 'va', 'mi', 'to', 'na', 'sa'],
  personEnd: ['rin', 'dal', 'wen', 'mar', 'ric', 'lith', 'ven', 'gar', 'sia', 'ndra', 'ос'.replace('ос', 'os'), 'ana', 'iel', 'orn', 'eth', 'ius'],
  surname: ['Pedravinha', 'Cordarbre', 'Valefundo', 'Ferroquente', 'Ramoalto', 'Sombraverde', 'Correnteza', 'Mãodura', 'Olhofundo', 'Cinzalta', 'Bravanoite', 'Sementelonga', 'Corvorubro', 'Pedraviva', 'Vaufrio', 'Trigobranco'],
  placePrefix: ['Vale', 'Pedra', 'Alta', 'Verde', 'Corvo', 'Ferro', 'Bruma', 'Runa', 'Caris', 'Lume', 'Raiz', 'Margem', 'Torre', 'Ponte'],
  placeSuffix: ['douro', 'monte', 'val', 'ria', 'gard', 'fonte', 'campo', 'nébria', 'burgo', 'mar', 'lândia', 'cerca', 'baixo', 'gueda'],
  kingdomSuffix: ['dália', 'gard', 'mundo', 'túria', 'vânia', 'márcia', 'nébria', 'lória'],
  dungeonPrefix: ['Cripta', 'Gruta', 'Mina', 'Ruína', 'Fortaleza', 'Templo', 'Esgoto', 'Bosque', 'Torre', 'Catacumba'],
  dungeonSuffix: ['dos Ossos', 'Profanada', 'Esquecida', 'do Silêncio', 'Submersa', 'de Ferro', 'dos Lamentos', 'Rachada', 'Sem Nome', 'do Guardião'],
} as const;

export const PERSONALITY_TRAITS = [
  'desconfiado', 'generoso', 'rancoroso', 'pragmático', 'supersticioso', 'orgulhoso',
  'calado', 'falastrão', 'covarde', 'obstinado', 'gentil', 'ganancioso', 'leal',
  'cínico', 'devoto', 'curioso', 'amargo', 'protetor',
];

export const MOTIVATIONS = [
  'proteger a família', 'juntar dinheiro para partir', 'limpar o próprio nome',
  'vingar um irmão', 'reconstruir a casa', 'provar seu valor à guilda',
  'encontrar alguém desaparecido', 'manter um segredo enterrado',
  'salvar a colheita', 'pagar uma dívida antiga', 'aprender o ofício direito',
  'impedir que a história se repita',
];

export const FEARS = [
  'perder a filha', 'voltar à pobreza', 'a floresta à noite', 'os mortos que não descansam',
  'ser descoberto', 'a chegada do inverno', 'a guarda do reino', 'ficar sozinho',
  'a doença que veio do pântano', 'o que assinou sem ler',
];

export const SECRETS = [
  'Deve dinheiro ao mercado negro.',
  'Sabe quem realmente ateou o incêndio.',
  'Esconde um parente do outro lado da fronteira.',
  'Vendeu informação para bandidos uma vez.',
  'Guarda uma relíquia que não lhe pertence.',
  'Mentiu sobre a própria origem.',
  'Viu o que saiu do cemitério e nunca contou.',
];

export const ATMOSPHERES = [
  'névoa baixa e cheiro de terra molhada',
  'sol pesado e cigarras insistentes',
  'vento constante que carrega poeira',
  'silêncio cortado por galhos estalando',
  'chuva fina que não passa',
  'frio seco e céu sem nuvem',
  'ar parado com gosto de ferro',
];

export const WEATHER = ['chuvoso', 'nublado', 'ensolarado', 'ventoso', 'enevoado', 'frio', 'abafado'];

# GAME_DESIGN — RPG

Aplicativo: **RPG**. RPG 2D de fantasia medieval, **mobile only**, **single player**,
portrait, offline-first.

## Fantasia central

Viver dentro de um mundo que **acumula história**. O jogador deve poder dizer:
"ajudei a filha do ferreiro; horas depois ele ainda lembrava" e "ignorei a criatura;
quando voltei, parte da vila estava destruída".

## Personagem

Criação: nome, apresentação visual, origem, classe, distribuição inicial de atributos.

Classes: **Guerreiro, Ladino, Mago, Druida, Caçador, Clérigo**.
O Druida é a classe completamente jogável do vertical slice (árvore completa em três
ramos: Natureza, Transformação, Espíritos). As demais são estruturadas — identidade,
equipamento inicial, progressão e árvore declarados em `src/data/classes.ts` — e
habilitáveis sem mudança de arquitetura.

Atributos: Força, Vitalidade, Inteligência, Sabedoria, Destreza, Agilidade, Sorte.

Stats derivados (fórmulas centralizadas em `src/domain/player/stats.ts`):
HP, Mana, dano físico, dano mágico, defesa física, resistência mágica, crítico,
esquiva, velocidade, regeneração.

Progressão: `XP → Level Up → Attribute Points (+3) → Skill Points (+1) → Skill Tree`.
Curva de XP e escala de stats vivem num único módulo de balanceamento — não há
número de balanceamento solto no código.

## Skill trees

Tipos de nó: `active`, `passive`, `modifier`, `ultimate`. Cada nó tem ranks,
pré-requisitos, custo em pontos, custo de mana, cooldown, efeitos e modificadores.

## Equipamento

12 slots: arma principal, secundária/escudo, capacete, peitoral, luvas, botas,
cinto, capa, colar, bracelete, anel, artefato.
Raridades: Common, Uncommon, Rare, Epic, Legendary, Mythic — com tratamento visual
consistente (cor + rótulo textual, nunca só cor).

## Inventário

Categorias: armas, armaduras, acessórios, consumíveis, materiais, itens de quest,
outros. Ações: equipar, desequipar, comparar, vender, comprar, usar, descartar,
ordenar, filtrar. Comparação lado a lado em bottom sheet — sem tooltip de hover.

## Combate

**Turnos táticos**, herói contra 1–3 inimigos. Ordem de turno por velocidade
(derivada de Agilidade), com fila de iniciativa visível. Ações: Atacar, Habilidade,
Item, Defender, Fugir. Mana, cooldowns, status effects, buffs/debuffs, crítico e
esquiva. Sessões curtas (2–4 minutos). **Não é idle**: nenhum turno avança sozinho.

## Dungeons — exclusivamente SOLO

Sem party, sem multiplayer, sem dependência de outros jogadores. A dungeon é um
grafo de salas percorrido nó a nó, com andares, armadilhas, tesouros, eventos,
segredos, miniboss e boss, e um contexto narrativo ligado ao mundo.

## Quests

Tipos: exploração, investigação, caça, resgate, escolta, coleta, negociação,
assassinato, defesa, dungeon, mistério, facção, pessoal, acontecimento mundial.
Geradas por combinação contextual (ver PROCEDURAL_GENERATION.md).

## Escolhas e consequências

Escolhas alteram o `WorldState`: reputação, relacionamento, economia, mortes,
estado da cidade, facções, preços, quests futuras, disponibilidade de NPCs,
acesso a lugares e rumores. Nem toda decisão é moralmente binária — várias são
escolhas entre lealdades.

## Reputação em camadas

`Global` · `Kingdom` · `City` · `Faction` · `NPC Relationship`.
Uma pessoa pode gostar do jogador enquanto a facção dela o odeia.

## Crônica

A história emergente do save, em linha do tempo por ano/dia.

## Economia

Preço = valor base × raridade × modificador de região × oferta/demanda ×
modificador de evento × reputação/relacionamento. Escassez encarece; um herói
querido paga menos.

## Arte e identidade visual

Fantasia medieval 2D, *painterly*, levemente retrô, alta legibilidade mobile,
atmosfera medieval, cores ricas nas ilustrações e interface escura e elegante
com acento dourado. As referências fornecidas indicam **direção de produto**;
nenhuma interface, personagem, mapa ou asset delas é copiado.

Enquanto não há assets finais, `AssetCatalog` resolve chaves lógicas
(`art.location.city.verdalia`) em placeholders próprios gerados
proceduralmente (gradiente + sigilo determinístico pela chave). Nenhum caminho
de asset é hardcoded fora do catálogo.

## UX mobile

Portrait; viewport-alvo ~390×844 com suporte a outras proporções; safe areas e
notch; navegação inferior; botões grandes (touch target ≥ 48dp); scroll natural;
cards; bottom sheets; feedback háptico quando disponível. Nunca UI de desktop
reduzida.

## Home

Hero Card (retrato, nome, level, classe, HP, Mana, XP, ataque, defesa,
resistência, crítico, agilidade, moedas, recursos) → card ilustrado grande da
localização atual → grid de ações: Aventura, Personagem, Mapa, Inventário,
Habilidades, Missões, Bestiário, Crônica, Cidade, Facções.

## Acessibilidade

Contraste adequado; texto mínimo legível; rótulos textuais sempre que houver cor
semântica; touch targets; opção de reduzir animações; escala de UI.

## Fora de escopo agora

Multiplayer, party, PvP, chat, guilda multiplayer, blockchain, NFT, login
obrigatório, anúncios, monetização e qualquer dependência permanente de internet.

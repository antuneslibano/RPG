# PROCEDURAL_GENERATION — RPG

> O objetivo não é "gerar conteúdo aleatório". É **gerar história através do
> estado do mundo**.

## World Seed

Uma seed (string legível, ex.: `verdalia-7f3a`) determina geografia, nomes,
cidades, vilas, NPCs iniciais, facções, recursos, dungeons, biomas e os
acontecimentos iniciais. A partir daí o mundo **diverge** conforme o jogador age.

```
Seed + decisões + acontecimentos = a história daquele save
```

Seeds são exibíveis e digitáveis na tela de Novo Jogo (compartilháveis).

## Streams de RNG

Um stream por subsistema, derivado da seed do mundo:

```
worldRng  npcRng  lootRng  questRng  dungeonRng  encounterRng  combatRng  directorRng  nameRng
```

Streams independentes garantem que abrir um baú não altere a geração do mundo,
que bugs sejam reproduzíveis e que os testes de determinismo sejam estáveis.

## Geração contextual

Todo gerador recebe um `GenerationContext`:

```ts
{ worldState, recentEvents, recentQuests, recentFingerprints,
  npcsRecentlyInvolved, regionsVisited, creaturesFaced, rewardsGiven,
  templatesUsed, gameDay }
```

Antes de emitir conteúdo, o gerador pergunta: *o que já aconteceu aqui? quem está
envolvido? quem sabe disso? que consequências continuam abertas? o que seria
coerente agora? isso é suficientemente diferente do conteúdo recente?*

## Quests combinatórias

```
ACTOR + MOTIVATION + PROBLEM + LOCATION + TARGET + COMPLICATION
      + WORLD STATE + RELATIONSHIP + CONSEQUENCE + REWARD
```

Exemplo real produzido pelo gerador:

| Slot | Valor |
| --- | --- |
| Actor | Alquimista (NPC persistente da cidade) |
| Motivation | salvar o irmão |
| Problem | envenenamento |
| Location | pântano da região vizinha |
| Target | criatura rara |
| Complication | a criatura é protegida pelos druidas |
| World State | tensão ativa entre a cidade e os druidas |
| Relationship | o jogador já ajudou os druidas |
| Consequence | escolher um lado |

Nunca "mate 10 lobos" sem causa: quando o objetivo é caça, o gerador anexa a
**razão** (os lobos foram expulsos do habitat por algo maior) e o jogador pode
descobri-la investigando.

## Anti-repetição por fingerprint

Cada conteúdo gerado produz um **hash semântico** dos seus slots relevantes:

```
fingerprint = fnv1a(template | actorArchetype | problem | targetFamily | locationKind | consequence)
```

Os últimos `N` fingerprints ficam no `WorldState`. Um candidato cujo fingerprint
já apareceu é rejeitado e o gerador re-rola (até `MAX_ATTEMPTS`), afrouxando os
critérios progressivamente para nunca travar. Não há promessa matemática de
"histórias infinitas" — o objetivo é impedir repetição **perceptível**.

## Mundo

```
WORLD → KINGDOM → REGION → CITY/VILLAGE/WILDERNESS → LOCATION → DUNGEON/ENCOUNTER/BUILDING
```

Biomas: floresta, floresta ancestral, planícies, montanhas, neve, deserto,
pântano, costa, ruínas, terras corrompidas, cavernas. Cada região carrega nível
recomendado, criaturas, recursos, pontos de interesse, perigos, facções, clima e
uma história procedural própria. A exploração revela o mapa gradualmente
(`discovered`), com locais não descobertos ocultos.

## Itens

```
Base + Material + Quality + Prefix + Suffix + Affixes + Special Effect + Rarity
```

→ *Espada Refinada de Aço Negro do Caçador* (crítico + dano contra feras).

Lendários/míticos recebem nome único, lore, origem, proprietário anterior
(um NPC real do save) e o evento associado.

## Criaturas

```
Base Creature + Level + Region + Variant + Affixes + Abilities
```

→ Lobo → Lobo Cinzento → Lobo Alfa → Lobo Corrompido → Lobo Espectral.
Famílias: beasts, undead, humanoids, demons, constructs, spirits, elementals,
aberrations. Bosses têm mecânicas próprias (fases, habilidades assinatura).

## Dungeons (SOLO)

Grafo de salas gerado por passeio com ramificações: entrada → corredores →
salas (combate, tesouro, armadilha, evento, descanso, segredo) → miniboss →
boss. O **tema** vem do contexto narrativo do mundo, não de um sorteio cego:
uma cripta só surge onde algo profanou o cemitério. Tipos: cavernas, criptas,
minas, ruínas, fortalezas, templos, esgotos, florestas amaldiçoadas, torres,
catacumbas.

## WorldDirector

Roda no avanço de dia e ao entrar numa região. Cria eventos, evolui conflitos,
gera rumores e oportunidades, modifica cidades, move facções, atualiza economia.

```
escassez de comida → preço sobe → comerciantes buscam suprimentos
→ bandidos atacam caravanas → a guarda oferece recompensa
→ o jogador pode interferir → o resultado altera a economia local

necromante aparece → animais somem → rumores → cemitério profanado
→ dungeon surge → NPC desaparece → quest emerge
```

Nada disso é apresentado direto: chega por rumores, tavernas, NPCs, exploração,
cartas e mudanças visíveis no lugar.

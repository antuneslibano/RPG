# MEMORY_SYSTEM — O mundo tem memória

## Princípio

NPCs, quests e lugares não são telas isoladas. Tudo que importa vira um
`WorldEvent`; o evento propaga-se para quem estava lá, e só para quem estava lá.

```
Ação do jogador
   └─> WorldEvent (registrado no WorldState)
         ├─> NPCMemory   para participantes e testemunhas
         ├─> NPCRelationship  (trust / fear / respect / gratitude / hostility)
         ├─> FactionState     (reputação, inimizades)
         ├─> LocationState    (prosperidade, perigo, problemas ativos)
         ├─> RumorSystem      (versão distorcida, propagada por proximidade)
         ├─> Chronicle        (a história pessoal daquele save)
         └─> WorldDirector    (consequências futuras)
```

## Hierarquia de memória (poda sem perda de história)

| Tier | Quando | Vida útil |
| --- | --- | --- |
| `immediate` | acabou de acontecer | decai rápido; as menos importantes somem |
| `relevant` | importância média, ou recordada recentemente | decai devagar |
| `permanent` | importância alta ou `permanent: true` (mortes, traições, salvamentos) | nunca some |
| `summarized` | várias memórias pequenas do mesmo tipo/sujeito condensadas | uma linha, peso agregado |

`consolidateMemories()` roda no avanço de dia:

1. memórias `permanent` são intocadas;
2. `strength = importance - decayRate * diasDesdeORecall` é recalculado;
3. memórias fracas do mesmo `(memoryType, subjectId)` são fundidas numa
   `summarized` ("você já o ajudou várias vezes") em vez de apagadas;
4. sobras abaixo do limiar são descartadas.

Resultado: o banco não cresce sem limite e o NPC continua "lembrando" —
com menos detalhe, como uma pessoa.

## Relacionamento

Um `NPCRelationship` tem seis eixos independentes: `affinity`, `trust`, `fear`,
`respect`, `gratitude`, `hostility`, mais `familiarity` (quantos encontros).
Aplicar uma memória move os eixos pelos `*Impact` dela, com saturação em
[-100, 100]. É por isso que um NPC pode **temer** o jogador e ao mesmo tempo
lhe ser **grato** — e o diálogo reflete a combinação, não um número único.

`describeRelationship()` traduz os eixos em uma atitude
(`hostil | desconfiado | neutro | cordial | leal | devoto`) usada pela UI e
pelo gerador de diálogo.

## Conhecimento limitado

NPCs não sabem tudo. Um NPC conhece um evento se:

- participou dele, ou
- o testemunhou (mesma `locationId` no momento), ou
- recebeu um **rumor** sobre ele.

`RumorSystem` propaga por região com `distortion` crescente a cada salto:
o rumor pode chegar **verdadeiro**, **parcialmente verdadeiro**, **exagerado**
ou **desatualizado**. Um NPC que só ouviu o rumor fala com hedge
("dizem que…"), quem testemunhou fala com certeza.

## Crônica

`ChronicleService` transforma eventos de alta importância em entradas legíveis:

```
ANO 1 — DIA 3    Você chegou a Valedouro.
ANO 1 — DIA 5    Você salvou Edrin, filho do ferreiro.
ANO 1 — DIA 11   Os saqueadores atacaram Valedouro.
ANO 1 — DIA 14   Edrin tornou-se aprendiz do ferreiro.
```

## Simulation LOD

| Distância | Simulação |
| --- | --- |
| Mesma `location` do jogador | detalhada: schedule, diálogo, reação a eventos |
| Mesma `region` | simplificada: relacionamentos e memórias decaem, schedule abstrato |
| Fora da região | abstrata: apenas eventos do WorldDirector; consequências ficam pendentes |

Ao voltar à região, `materializePending()` aplica de uma vez as consequências
acumuladas (vila danificada, NPC mudou de cidade, preço subiu) — o jogador
**vê** o que aconteceu na ausência dele.

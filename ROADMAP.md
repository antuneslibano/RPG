# ROADMAP — RPG

## Fase 0 — Auditoria e stack ✅
Ambiente auditado, stack escolhida e justificada (ver ARCHITECTURE.md §1–2),
documentos de projeto criados.

## Fase 1 — Núcleo determinístico ✅
`SeededRandom` com streams, IDs estáveis, EventBus tipado, utilidades puras.

## Fase 2 — Domínio ✅
Atributos, stats derivados, curva de XP/level, itens, afixos, equipamento,
inventário, skills, facções, reputação.

## Fase 3 — Design system ✅
Tokens (cores, espaçamento, raio, tipografia, sombras, durações, tamanhos de
ícone) e componentes: botão, card, barras, navegação inferior, bottom sheet,
diálogo, chips, estados vazio/carregando/erro.

## Fase 4 — Mundo ✅
Geração de reino, 3 regiões, cidade principal, 2 vilas, áreas selvagens,
20+ NPCs persistentes, facções, economia, estabelecimentos.

## Fase 5 — Memória ✅
WorldEvent, NPCMemory hierárquica com consolidação, NPCRelationship de seis
eixos, conhecimento limitado, RumorSystem com distorção, Crônica.

## Fase 6 — Exploração ✅
Mapa do mundo com fog of war, regiões, viagem, descoberta, cidades com
estabelecimentos, encontros.

## Fase 7 — Combate ✅
Bestiário com famílias e variantes, combate por turnos, habilidades, status
effects, recompensas, loot procedural.

## Fase 8 — Dungeons ✅
Geração de dungeon solo (3 tipos no slice, 10 suportados), salas, armadilhas,
tesouros, eventos, segredos, miniboss, 3 bosses com mecânica própria.

## Fase 9 — Quests ✅
Geração contextual combinatória + anti-repetição por fingerprint, objetivos,
progresso dirigido por eventos, consequências.

## Fase 10 — Persistência ✅
Save particionado incremental, schema versionado, migrations, autosave,
validação, backup e recuperação de save corrompido, save slots.

## Fase 11 — Polish ✅
Animações de barra/level up/loot reveal/equip/dano/crítico, estados vazio,
carregando e erro, acessibilidade, redução de animações.

## Fase 12 — QA ✅
`npm run qa`: typecheck + lint + testes (RNG, XP, loot, save/load, migrations,
world/quest/dungeon generation, memória, relacionamentos, combate, determinismo).

---

## Próximas fases (pós-slice)

| # | Item | Notas |
| --- | --- | --- |
| 13 | Demais classes jogáveis | Dados já declarados; falta conteúdo de skill e balanceamento |
| 14 | Reinos 2 e 3 | Generator já é multi-kingdom; expandir biomas e facções |
| 15 | Assets finais | Trocar placeholders no `AssetCatalog`; pipeline pronto |
| 16 | `RemoteLLMProvider` | Diálogo/rumor/resumo via LLM atrás do `NarrativeProvider`, opcional e com fallback local |
| 17 | Crafting e encantamento | Materiais e afixos já modelados |
| 18 | Áudio | Trilha e SFX por contexto |
| 19 | Build de loja | EAS Build, ícone e splash finais, assinatura |

# ARCHITECTURE — RPG

## 1. Auditoria do ambiente (FASE 1)

| Item | Resultado |
| --- | --- |
| Diretório do projeto | `/home/user/RPG`, vazio, repositório git sem commits |
| Runtime | Node.js v22, npm 10 |
| Flutter / Dart SDK | **ausente** |
| Android SDK / `ANDROID_HOME` | **ausente** |
| JDK | OpenJDK 21 (presente, mas sem SDK Android) |
| Rede | registry npm acessível através do proxy do ambiente |

Nenhuma restrição externa de stack foi imposta pelo repositório (não havia arquivos).

## 2. Decisão de stack

**Expo (React Native) + TypeScript strict.**

Justificativa segundo os critérios do item 48 do prompt mestre:

1. **Funciona melhor em mobile** — gera aplicativos Android e iOS nativos reais
   (`expo run:android`, `expo prebuild`, EAS Build), com `orientation: portrait`,
   safe areas, gesture navigation e feedback háptico de primeira classe.
2. **Facilita manutenção** — TypeScript com `strict` + `noUncheckedIndexedAccess`
   dá tipagem forte ao domínio inteiro; a árvore de arquivos é pequena e modular.
3. **Preserva determinismo** — todo o domínio é TypeScript puro, sem dependência
   de engine. O RNG é nosso (`SeededRandom`), não o do host.
4. **Reduz dependência externa** — o núcleo (`src/core`, `src/domain`, `src/procgen`,
   `src/sim`, `src/narrative`) não importa nada de React Native. Roda headless em
   Node, o que permite testar geração de mundo, combate, loot e save sem emulador.
5. **Permite expansão futura** — a camada de apresentação pode ser trocada
   (por exemplo, por um renderer de canvas/Skia para combate) sem tocar no domínio.

Flutter seria igualmente defensável, mas o SDK não existe neste ambiente: não seria
possível compilar, testar nem validar nada — o prompt exige execução, não promessas.

### Dependências e pinos

Mínimas e justificadas: `expo`, `react-native`, `react-native-safe-area-context`
(notch/safe areas), `expo-haptics` (feedback tátil), `expo-modules-core`,
`@react-native-async-storage/async-storage` (persistência local).

Navegação é própria (`src/shell/navigation.tsx`) — um stack leve de ~120 linhas
evita o peso e a rotatividade de versões do react-navigation para um app que
mostra uma tela por vez.

**React Native está pinado em 0.86.3, não no mais recente (0.87).** O
`@expo/metro-config` do SDK 57 ainda exige `react-native/rn-get-polyfills`, que
a 0.87 removeu; com a 0.87 o bundle falha ao resolver os polyfills. O pino foi
verificado com `npx expo export --platform android` (699 módulos, 1.9 MB de
bytecode Hermes). A API de compatibilidade da Expo (`api.expo.dev`) está
bloqueada pelo proxy deste ambiente, então `expo install` não pôde resolver as
versões automaticamente — o par foi determinado e validado manualmente.

A pasta do shell chama-se `src/shell/`, **não** `src/app/`: o Expo Router trata
`src/app/` como raiz de rotas por convenção e passava a disputar o controle da
navegação com o roteador próprio.

## 3. Camadas

```
src/
├── core/          infra sem regra de jogo: RNG semeado, EventBus, IDs, utilidades
├── domain/        modelos + regras puras (stats, itens, NPC, quest, combate, facção)
├── data/          tabelas de conteúdo (bases de itens, afixos, arquétipos, biomas…)
├── procgen/       geradores determinísticos (mundo, NPC, loot, quest, dungeon, nomes)
├── sim/           WorldDirector, tempo de jogo, simulation LOD
├── narrative/     memória de NPC, relacionamentos, rumores, crônica, NarrativeProvider
├── persistence/   repositórios particionados, schema versionado, migrations, autosave
├── assets/        AssetCatalog + providers (retratos, locais, ícones, criaturas)
├── design/        design tokens e tema
├── ui/            components/ e screens/ — apresentação apenas
├── game/          serviços que costuram os sistemas (novo jogo, viagem, quests…)
└── shell/         App, navegação, GameProvider, telemetria de debug
```

**Regra de dependência:** as setas apontam sempre para dentro.
`ui` → `shell` → `game` → `sim`/`narrative`/`procgen` → `domain` → `core`.
`core` e `domain` não importam React nem React Native. Nenhuma regra de jogo vive
dentro de um componente de UI.

## 4. Determinismo

`SeededRandom` (mulberry32 sobre hash xmur3 da string-seed) com **streams
independentes** derivados da World Seed: `world`, `npc`, `loot`, `quest`,
`dungeon`, `encounter`, `combat`, `director`, `name`. Consumir loot nunca desloca
a sequência do mundo. A mesma seed + as mesmas ações produzem o mesmo resultado —
verificado por testes (`src/core/rng/random.test.ts`, `src/procgen/world.test.ts`).

## 5. Persistência

Offline-first, sem servidor. `StorageAdapter` abstrai o meio:
`MemoryStorageAdapter` (testes) e `AsyncStorageAdapter` (app).
O save é **particionado** em partes (`meta`, `player`, `world`, `npcs`, `memories`,
`quests`, `chronicle`, `factions`, `economy`, `dungeons`) e somente as partes
marcadas como sujas são escritas — persistência incremental dirigida por eventos,
não serialização do universo inteiro. Cada parte carrega `schemaVersion` e
checksum; o carregamento valida, migra e, em caso de corrupção, restaura o backup.

## 6. Event Bus

`EventBus` tipado (`GameEventMap`). Sistemas reagem a eventos em vez de se
chamarem diretamente: `NPC_DIED` alimenta relacionamentos, facções, rumores,
crônica e WorldDirector sem que nenhum deles conheça o outro.

## 7. IA generativa

`NarrativeProvider` é uma interface. `LocalNarrativeProvider` (template-based,
determinístico) é a implementação padrão e o jogo funciona 100% com ela.
`RemoteLLMProvider` é um ponto de extensão documentado — sem chaves de API no app.

## 8. Qualidade

`npm run qa` = `typecheck` + `lint` + `test`.

Os testes rodam em **dois projetos Jest**:

| Projeto | Ambiente | O que cobre |
| --- | --- | --- |
| `domain` | Node puro, sem módulos nativos | RNG e determinismo, XP/level/skills, loot, geração de mundo/quest/dungeon/encontro, memória e consolidação, relacionamentos, rumores, combate, economia, save/load, migrations e validação |
| `ui` | `jest-expo` + React Test Renderer | Componentes renderizam de fato, e dois fluxos ponta a ponta que sobem o `App` real: splash → menu → novo jogo → criação → home, e a navegação entre Home, Personagem, Inventário e Mapa |

O teste `src/game/acceptance.test.ts` percorre os 25 critérios de aceitação do
prompt numa única partida headless, incluindo o ciclo fechar/reabrir o save.

Compilar não é o mesmo que rodar: além dos testes, o bundle Android é verificado
com `npx expo export --platform android`.

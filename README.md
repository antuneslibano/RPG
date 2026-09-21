# RPG

RPG 2D de fantasia medieval, **mobile only**, **single player**, com mundo
procedural persistente, NPCs que lembram e narrativa emergente.

```
Semente + decisões + acontecimentos = a história daquele save
```

## Rodar

```bash
npm install
npm start            # Expo dev server (abra no Expo Go ou num dev build)
npm run android      # build/instala num emulador ou aparelho Android
npm run ios          # idem no iOS (requer macOS)
```

## Qualidade

```bash
npm run qa           # typecheck + lint + testes
npm test             # 136 testes, 12 suítes, 2 projetos Jest
npm run typecheck
npm run lint
```

Os testes de domínio rodam headless em Node; os de UI sobem o aplicativo real e
navegam por ele. O bundle nativo é verificado com
`npx expo export --platform android`.

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Auditoria do ambiente, escolha de stack, camadas, determinismo, persistência |
| [GAME_DESIGN.md](GAME_DESIGN.md) | Classes, progressão, combate, dungeons, economia, UX mobile, arte |
| [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) | Seed, streams de RNG, quests combinatórias, anti-repetição, WorldDirector |
| [MEMORY_SYSTEM.md](MEMORY_SYSTEM.md) | WorldEvent, memória hierárquica, relacionamentos, rumores, crônica, LOD |
| [DATA_MODEL.md](DATA_MODEL.md) | Entidades persistentes e IDs estáveis |
| [ROADMAP.md](ROADMAP.md) | O que está pronto e o que vem depois |

## Estado atual

Vertical slice jogável: criar herói a partir de uma semente, explorar, conversar
com NPCs que lembram do que você fez, receber quests contextuais, combater por
turnos, progredir, equipar, limpar masmorras solo, ver o mundo reagir e
recarregar tudo ao reabrir o app.

Fora de escopo por decisão de produto: multiplayer, party, PvP, chat, login
obrigatório, anúncios, monetização e dependência permanente de internet.

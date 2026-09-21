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

## Gerar o APK

O `android/` não é versionado: o Expo o regenera a partir do `app.json`.

**Baixar direto no celular** (link fixo, sempre a build mais recente):

<https://github.com/antuneslibano/RPG/releases/download/apk-latest/RPG.apk>

Permita "instalar apps de fontes desconhecidas" quando o Android pedir e abra
o arquivo baixado.

**Gerar uma build nova:** Actions → **APK Android** → *Run workflow*. Cada push
também dispara o build, que atualiza o link acima e anexa o APK ao run em
*Artifacts → RPG-apk*.

Por padrão cada build usa uma chave de assinatura efêmera — o APK instala
normalmente, mas atualizar por cima exige desinstalar a versão anterior. Para
uma chave estável, gere uma e cadastre como secrets do repositório:

```bash
keytool -genkeypair -v -keystore rpg.keystore -alias rpg \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 rpg.keystore     # valor de ANDROID_KEYSTORE_BASE64
```

Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

**Localmente** (requer Android SDK e `ANDROID_HOME` configurados):

```bash
npx expo prebuild --platform android --no-install
cd android && ./gradlew :app:assembleRelease
# APK em android/app/build/outputs/apk/release/
```

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

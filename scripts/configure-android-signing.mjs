/**
 * Injeta a configuração de assinatura de release no projeto Android.
 *
 * O diretório `android/` não é versionado — o Expo o regenera a cada build a
 * partir do app.json — então esta edição precisa acontecer depois do prebuild,
 * e não num arquivo commitado.
 *
 * Sem as variáveis de ambiente abaixo o script não faz nada, e o Gradle mantém
 * o padrão do template (release assinado com a chave de debug), que ainda
 * instala num aparelho por sideload.
 *
 *   RPG_UPLOAD_STORE_FILE      caminho do .keystore
 *   RPG_UPLOAD_STORE_PASSWORD  senha do keystore
 *   RPG_UPLOAD_KEY_ALIAS       alias da chave
 *   RPG_UPLOAD_KEY_PASSWORD    senha da chave
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const GRADLE_PATH = resolve('android/app/build.gradle');

const env = {
  storeFile: process.env.RPG_UPLOAD_STORE_FILE,
  storePassword: process.env.RPG_UPLOAD_STORE_PASSWORD,
  keyAlias: process.env.RPG_UPLOAD_KEY_ALIAS,
  keyPassword: process.env.RPG_UPLOAD_KEY_PASSWORD,
};

const missing = Object.entries(env)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.log(`[signing] sem ${missing.join(', ')}: mantendo a assinatura padrão do template.`);
  process.exit(0);
}

if (!existsSync(GRADLE_PATH)) {
  console.error(`[signing] ${GRADLE_PATH} não existe. Rode "npx expo prebuild --platform android" antes.`);
  process.exit(1);
}

let gradle = readFileSync(GRADLE_PATH, 'utf8');

if (gradle.includes('signingConfigs.release')) {
  console.log('[signing] configuração de release já presente; nada a fazer.');
  process.exit(0);
}

// 1. Declara o signingConfig de release ao lado do de debug.
const signingBlock = /(signingConfigs\s*\{)/;
if (!signingBlock.test(gradle)) {
  console.error('[signing] bloco signingConfigs não encontrado — o template mudou.');
  process.exit(1);
}
const escape = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
gradle = gradle.replace(
  signingBlock,
  `$1
        release {
            storeFile file('${escape(env.storeFile)}')
            storePassword '${escape(env.storePassword)}'
            keyAlias '${escape(env.keyAlias)}'
            keyPassword '${escape(env.keyPassword)}'
        }`,
);

// 2. Aponta o buildType de release para ele. O template traz
//    "signingConfig signingConfigs.debug" tanto em debug quanto em release,
//    então a troca é feita só na ocorrência dentro do bloco release.
const releaseBlockIndex = gradle.indexOf('buildTypes {');
const releaseTypeIndex = gradle.indexOf('release {', releaseBlockIndex);
if (releaseBlockIndex === -1 || releaseTypeIndex === -1) {
  console.error('[signing] bloco buildTypes.release não encontrado — o template mudou.');
  process.exit(1);
}

const head = gradle.slice(0, releaseTypeIndex);
const tail = gradle.slice(releaseTypeIndex);
const patchedTail = tail.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release');

if (patchedTail === tail) {
  console.error('[signing] não achei "signingConfig signingConfigs.debug" no bloco release.');
  process.exit(1);
}

writeFileSync(GRADLE_PATH, head + patchedTail);
console.log('[signing] release assinado com a chave informada.');

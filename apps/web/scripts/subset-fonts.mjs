// Génère un sous-ensemble de Dela Gothic One (OFL) limité aux katakana et à la ponctuation
// japonaise utilisés pour les onomatopées. Usage : pnpm --filter @jojo/web fonts
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);
const source =
  require.resolve('@fontsource/dela-gothic-one/files/dela-gothic-one-japanese-400-normal.woff2');

const katakana = Array.from({ length: 0x30ff - 0x30a0 + 1 }, (_, i) =>
  String.fromCodePoint(0x30a0 + i),
).join('');
const punctuation = '「」『』！？…・〜　';
const text = katakana + punctuation;

const input = await readFile(source);
const output = await subsetFont(input, text, { targetFormat: 'woff2' });
const target = new URL('../src/assets/fonts/dela-gothic-one-katakana.woff2', import.meta.url);
await writeFile(target, output);
console.log(`Sous-ensemble écrit : ${target.pathname} (${output.length} octets)`);

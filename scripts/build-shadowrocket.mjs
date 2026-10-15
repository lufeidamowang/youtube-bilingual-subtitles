import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

export const version = '0.3.0';
export const repository = 'https://github.com/lufeidamowang/youtube-bilingual-subtitles';
export const releaseBase = `${repository}/releases/download/v${version}/`;

export function buildResponseModule(base = releaseBase) {
  const script = new URL('caption-response.js', base);
  if (!['http:', 'https:'].includes(script.protocol)) throw new Error('HTTP(S) script URL required');
  return [
    '#!name = YouTube 双语字幕',
    '#!desc = 测试版：打开原语言 CC 后添加简体中文。仅处理已有字幕，停用模块恢复原字幕。',
    '#!author = youtube-bilingual-subtitles contributors; DualSubs',
    `#!homepage = ${repository}`,
    `#!version = ${version}`, '', '[Script]',
    String.raw`YTB.Caption.response = type=http-response, pattern=^https?:\/\/(www|m)\.youtube\.com\/api\/timedtext(?:\?.*)?$, requires-body=1, max-size=2097152, timeout=20, script-path=${script.href}, argument=TargetLanguage=zh-Hans`,
    '', '[MITM]', 'hostname = %APPEND% www.youtube.com, m.youtube.com', 'tcp-connection = true', '',
  ].join('\n');
}

async function main() {
  await mkdir('dist/licenses', { recursive: true });
  await build({ entryPoints: ['scripts/caption-response.js'], bundle: true, platform: 'browser',
    target: 'es2020', format: 'iife', minify: true, outfile: 'dist/caption-response.js',
    banner: { js: '/* Apache-2.0; includes DualSubs, core-js, text-encoding, fast-xml-parser. See THIRD-PARTY.md and licenses/. */' },
    plugins: [{ name: 'dualsubs-console', setup(plugin) {
      plugin.onResolve({ filter: /^@nsnanocat\/util$/ }, () => ({ path: 'console', namespace: 'ytb' }));
      plugin.onLoad({ filter: /.*/, namespace: 'ytb' }, () => ({ contents: 'export const Console = {log(){},info(){},debug(){},warn(){},error(){}};', loader: 'js' }));
    } }],
  });
  await writeFile('dist/YouTube.Bilingual.srmodule', buildResponseModule());
  for (const [source, name] of [
    ['LICENSE','PROJECT.txt'], ['vendor/nodable-LICENSE','nodable-entities.txt'], ['vendor/dualsubs/LICENSE','DualSubs.txt'],
    ['node_modules/core-js/LICENSE','core-js.txt'], ['node_modules/text-encoding/LICENSE.md','text-encoding.txt'],
    ['node_modules/fast-xml-parser/LICENSE','fast-xml-parser.txt'], ['node_modules/strnum/LICENSE','strnum.txt'],
    ...['anynum','is-unsafe','xml-naming','fast-xml-builder','path-expression-matcher'].map(name => [`node_modules/${name}/LICENSE`, `${name}.txt`]),
  ]) await copyFile(source, `dist/licenses/${name}`);
  await copyFile('THIRD-PARTY.md', 'dist/THIRD-PARTY.md');
  const names = ['caption-response.js', 'YouTube.Bilingual.srmodule'];
  const sums = await Promise.all(names.map(async name => `${createHash('sha256').update(await readFile(`dist/${name}`)).digest('hex')}  ${name}`));
  await writeFile('dist/SHA256SUMS', sums.join('\n')+'\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = new URL('../dist/', import.meta.url);
const files = [];
function collect(path) { for (const name of readdirSync(path)) { const item = join(path, name); if (statSync(item).isDirectory()) collect(item); else files.push(item); } }
collect(root.pathname.replace(/^\/([A-Za-z]:)/, '$1').replaceAll('%20', ' '));
const problems = [];
for (const file of files) {
  if (!/\.(?:html|css|js)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (/\b(?:src|href)=["']https?:\/\//i.test(text) && file.endsWith('.html')) problems.push(`HTML外部资源: ${file}`);
  if (/url\(\s*["']?https?:\/\//i.test(text)) problems.push(`CSS外部资源: ${file}`);
  if (/@import\s+["']https?:\/\//i.test(text)) problems.push(`外部样式: ${file}`);
}
const report = { status: problems.length ? 'failed' : 'passed', files: files.map(path => ({ name: path.split(/[/\\]/).slice(-2).join('/'), bytes: statSync(path).size, gzipBytes: gzipSync(readFileSync(path)).length })), problems, note: '静态检查不替代浏览器网络检查；参考资料链接允许用户主动打开。' };
writeFileSync(new URL('../artifacts/static-validation.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (problems.length) process.exitCode = 1;

/* Playwright 校验：node tools/verify.mjs（依赖 tools/ 下的 playwright；channel:'chrome' 复用系统 Chrome）
   任一断言失败 exit 1；截图输出到 shots/ */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = 8899;
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};
const server = http.createServer(async function (req, res) {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { res.writeHead(404); res.end(); }
}).listen(port);

const base = `http://localhost:${port}`;
const fails = [];
const errors = [];
function ok(name, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + name); if (!cond) fails.push(name); }

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1680, height: 950 } });
page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
async function shot(name) { await page.screenshot({ path: join(root, 'shots', name + '.png') }); }

try {
  // 1. 总览
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  ok('总览无 console/page 错误', errors.length === 0);
  ok('基线锚点 26.90', (await page.textContent('#blPsnr')) === '26.90');
  ok('eta 三臂滚动数字就位', (await page.locator('.ae-digits[data-arm="L1"] .strip').count()) >= 6);
  ok('悬浮助理默认仅球（面板隐藏）', !(await page.locator('.aidock-panel').isVisible()));

  // 2. 总览选臂详情
  await page.click('.arm[data-arm="L1"]');
  await page.waitForTimeout(300);
  ok('总览 L1 详情展开（ETA 块）', await page.locator('.arm-detail .ad-eta').isVisible());
  ok('详情含 loss 曲线 svg', (await page.locator('.arm-detail svg').count()) === 1);
  ok('ETA 块右对齐（与详情区右缘对齐）', await page.locator('.arm-detail .ad-eta').evaluate(function (el) {
    var top = el.parentElement.getBoundingClientRect();
    return Math.abs(el.getBoundingClientRect().right - top.right) < 6;
  }));
  await shot('overview-arm-L1');
  await page.click('.arm-detail .ad-close');

  // 3. 消融台账
  await page.click('.nav-it[data-view="ablations"]');
  ok('台账 13 行', (await page.locator('#abList .ab-row').count()) === 13);
  await page.click('#abFilters .f-chip[data-f="neg"]');
  ok('负结果筛选 3 行', (await page.locator('#abList .ab-row:visible').count()) === 3);
  await shot('ablations');

  // 4. 监控页选臂 + YAML
  await page.click('.nav-it[data-view="monitor"]');
  await page.click('#monArms .at-row[data-arm="L2"]');
  await page.waitForTimeout(300);
  ok('监控 L2 黑底详情可见（曲线 svg）', await page.locator('#mDetail .ad-chart svg').isVisible());
  await page.click('#mDetail .md-tab[data-t="yaml"]');
  ok('YAML 为 L2 派生（iccb_level: 2）', (await page.textContent('#mDetail .yaml-view')).includes('iccb_level: 2'));
  await shot('monitor-arm-L2-yaml');

  // 5. 知识库阅读器
  await page.click('.nav-it[data-view="wiki"]');
  await page.waitForTimeout(200);
  ok('默认打开 iccb-placement-level-ablation', (await page.textContent('#kbMeta')).includes('iccb-placement-level-ablation'));
  ok('目录子级嵌在文档条目下方（3 个）', (await page.locator('.kb-tree .kb-sub').count()) === 3);
  ok('正文黑底渲染含 h1', (await page.locator('#kbArticle h1').count()) === 1);
  await page.click('.kb-tree .kb-sub');
  await shot('wiki-reader');

  // 6. 助理：球 → 对话框 → 收回
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  ok('悬浮球可见', await page.locator('.aidock-tab').isVisible());
  await page.click('.aidock-tab');
  ok('点击球展开对话框', await page.locator('.aidock.open .aidock-panel').isVisible());
  ok('面板含 spinner 头像', (await page.locator('.aidock-head .spinner').count()) === 1);
  await shot('assistant-open');
  await page.click('#aiClose');
  ok('× 收回成悬浮球', !(await page.locator('.aidock.open .aidock-panel').isVisible()));

  ok('全程无 console/page 错误', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
} finally {
  await browser.close();
  await new Promise(function (r) { server.close(r); });
}
console.log(fails.length ? '\nFAIL (' + fails.length + '): ' + fails.join(' | ') : '\nALL PASS');
process.exit(fails.length ? 1 : 0);

# BasicLLIE 工作台（生产版 v1）

本地 localhost 可用的科研工作台：总览（锚点/待做/监控/笔记 feed）· Idea 溯源 · 消融台账 · 实验监控（选臂详情 + 真实 YAML）· 知识库阅读器 · 可接 API 的助理。样式与交互基线 = `../design-demos/v5-todo-agents-armdetail.html`（已确认稿），细节见 [`SPEC.md`](SPEC.md)。

## 启动

三选一：

```
:: ① 双击 workbench\app\start.cmd（自动开浏览器）
```
```powershell
# ② PowerShell（注意：Windows 自带 PS 5.x 不支持 &&，用分号）
cd workbench\app; node tools\server.mjs
```
```bash
# ③ Git Bash / cmd
cd workbench/app && node tools/server.mjs
```

→ http://localhost:8765 （Ctrl-C 停止）

必须走 http（数据由 fetch 加载），`file://` 双击会被浏览器拦。刷新浏览器 = 读取最新 data.json。

## 更新实验数据（两条路）

1. **脚本解析（推荐）**：把 710 上的训练日志拿到本地（或直接在 710 上跑），然后
   ```
   python tools/parse_trio_log.py --log tmp_trio/lvl1.log --arm L1 --data data/data.json
   ```
   自动更新该臂的 iter/epoch/eta/loss 序列与末 5 行表格，`real` 置 true。L2/L3 同理。
2. **手工编辑**：改 `data/data.json` 对应字段（契约见 SPEC §3），保存刷新即可。

## 校验（回归门）

```
node tools/verify.mjs
```

起本地服务 + Playwright（`channel:'chrome'` 复用系统 Chrome）跑 19 项断言：锚点数值、eta 滚动、选臂详情曲线/ETA 右对齐、台账行数与筛选、监控 YAML、知识库阅读器目录嵌套、助理球→框→收回、console 零错误。截图落在 `shots/`。

## 边界（v1）

- 实验数据为快照，不做实时 SSH 拉取（二期：710 端跑 parse_trio_log.py → scp 回 data.json）；
- `agents[].count` 为示意字段；知识库 3 篇真实原文 + 50 页桩页（补 `assets/wiki-data.js` 的 `md` 字段即扩）；
- 桌面 1440+ 优先，无移动端适配。

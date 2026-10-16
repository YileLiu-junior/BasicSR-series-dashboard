# BasicLLIE 工作台 · 生产版 Spec（v1）

> 依据设计稿 `../design-demos/v5-todo-agents-armdetail.html`（用户已确认样式）落地为 localhost 可用的本地网页应用。
> 定位：**单人本地快照型工作台**——不做多用户、不做后端数据库；数据以 `data/data.json` 快照供给，由脚本从训练产物更新。

## 1. 目录约定（与实验严格隔离）

```
workbench/app/            # 网页应用本体（唯一入口）
├── index.html            # 页面结构（视图骨架，不含实验数据）
├── assets/
│   ├── style.css         # 全部样式（来自 v5 设计稿）
│   ├── app.js            # 应用逻辑：视图路由 / 渲染器 / 详情 / ETA / 助理
│   ├── wiki-data.js      # kb/wiki 结构索引（53 页）+ 3 篇内嵌真实 md
│   └── docs-data.js      # Agent/Skill 使用文档（markdown 源）
├── data/
│   └── data.json         # 实验快照（唯一实验数据源，见 §3）
├── tools/
│   ├── server.mjs        # 零依赖静态服务器（node tools/server.mjs → http://localhost:8765）
│   ├── parse_trio_log.py # 训练 log → data.json 解析器（eta/loss/进度）
│   └── verify.mjs        # Playwright 校验（CI 可跑，exit code 0/1）
├── shots/                # verify.mjs 产出的截图（gitignore 可选）
└── README.md             # 启动 / 更新数据 / 校验
```

规则：**实验配置（`options/`）、训练产物（`experiments/`）、日志（`tmp_trio/`）一律不进本目录**；本目录只读地引用它们的路径字符串。设计稿留在 `../design-demos/` 作为样式基线，不再演进。

## 2. 运行方式

- 启动：`node tools/server.mjs`（默认 8765，`PORT=xxx` 可改）→ 浏览器开 `http://localhost:8765`。
- 为什么必须走 localhost：`data.json` 由 `fetch` 加载，`file://` 下会被浏览器拦。除 fetch 外零依赖、零构建。
- 停止：Ctrl-C。数据更新后**刷新浏览器**即可，无需重启服务。

## 3. 数据流（单一事实源）

```
710 服务器 tmp_trio/lvl{1,2,3}.log ──(scp/手动拷贝)──▶ 本地任意位置
        │
        └─ python tools/parse_trio_log.py --log <log文件> --arm L1 --data data/data.json
                   │  解析最新一条 INFO 行：iter/epoch/lr/eta/time/l_pix/l_freq
                   │  并把全部 l_pix 采样降采样进 series（≤40 点）
                   ▼
            data/data.json  ◀── 也可手工编辑（任何文本编辑器）
                   │
                   ▼  浏览器 fetch + 渲染（刷新即生效）
              工作台 UI（总览 / Idea 溯源 / 消融台账 / 实验监控 / 知识库）
```

### data.json 契约（v1，字段缺失时对应区块隐藏/显示 `--`）

| 键 | 类型 | 消费方 |
|---|---|---|
| `snapshot.date/source` | str | 页脚快照口径 |
| `frontier` | html str | 总览·当前前沿条 |
| `baseline` | psnr/ssim/lpips/iter | 总览·基线锚点卡 |
| `slots` | [键,实现][] | 侧栏 SLOT MAP |
| `feed` | page/txt/date[] | 总览·实验笔记新增行（点按跳知识库） |
| `agents` | name/cls/desc/count/doc[] | 总览·Agent/Skill 指南卡（次数=数据字段） |
| `trio.launched/verified_iter/s_per_iter` | str | 监控页 meta 行、总览进度条 |
| `trio.arms[]` | id/group/crop/gpu/prior/row_note/tags/note/folder/log/eta_label/eta_sec/iter_label/epoch/real/series/table | 总览三臂卡、eta 滚动倒计时、选臂详情（曲线+loss 表）、监控页表格与详情 |
| `ablations[]` | s/forced/st_label/st_cls/name/res | 消融台账（筛选计数自动统计） |

provenance 纪律：**数据里是什么就显示什么**；`real:false` 的臂在详情标注「示意数据」。`parse_trio_log.py` 只更新 `trio.arms[*]` 的运行时字段，不碰其他键。

## 4. 视图与交互契约

1. **总览**：frontline（数据）→ WIKI 新增行 feed（横向滚动、点按跳知识库）→ 便当盒：监控大屏（三臂 + eta 滚动倒计时 + 紫色 speeder）· 待做清单（NEXT + 按 idea 表格）· Agent/Skill 指南（点条目→markdown 文档页）· 主线 150k · Idea 谱系 · 基线锚点。
2. **选臂详情**：总览三臂卡点击 → L 列收窄 + 右侧展开（目录/ETA/黑底曲线/loss 表）；监控页表格行点击 → 表格下方展开黑底详情，双 tab「运行详情 / 实验配置 YAML」。两处共享同一渲染函数 `armLossHTML`；YAML 内嵌真实配置（L2/L3 由 L1 文本替换派生）。再点/收起按钮关闭。
3. **Idea 溯源**：进行中 idea 卡带流光描边 + 白色闪光光标（数据字段 `running:true` 驱动，v1 静态 I-01）。
4. **知识库**：面包屑 7 分类 + 左 hierarchy 目录（当前文档下挂 h2/h3 子级，点击滚动）+ 中黑底 markdown 正文（迷你渲染器）+ 右侧助理分栏（66vh）。3 篇真实原文内嵌，其余 50 页为桩页；正式接入全文时在 `wiki-data.js` 补 `md` 字段即可，渲染器不变。
5. **助理**：非知识库页右下角**仅悬浮 spinner 球**（用户指定特效，1.7s/圈旋转）；点击展开对话框；× 收回；状态记 localStorage。设置表单：API 地址（OpenAI 兼容）/ Key / 模型 + 连接检测（GET /models）；对话直连 /chat/completions；Key 仅存本地 localStorage；内置项目口径 system prompt。
6. **深链**：`#view=wiki` / `#arm=L1` / `#doc=<key>` / `#mon=L1[:yaml]`。

## 5. 校验（Playwright，tools/verify.mjs）

自建静态服务 → `chromium.launch({channel:'chrome'})`（复用系统 Chrome，免下浏览器）→ 断言：

1. `/` 打开无 console error；基线锚点显示 26.90；eta 三臂数字非空；
2. 总览点 L1 → 详情展开、svg 曲线存在、ETA 右对齐块存在；
3. 消融台账 13 行、筛选「负结果」后 3 行；
4. 监控页点 L2 行 → 黑底详情可见且含曲线 svg；切 YAML tab → `iccb_level` 出现；
5. 知识库默认页为 iccb-placement-level-ablation，左目录含其子级标题（动机等在文档条目下方）；
6. 悬浮助理默认仅球（`.aidock:not(.open) .aidock-tab` 可见），点击后面板出现；
7. 逐视图截图到 `shots/`。

任一断言失败 → exit 1 并打印失败项。改完数据或代码后跑一次作为回归门。

## 6. v1 边界（明确不做）

- 不做实时 SSH 拉取（二期：`tools/fetch_710.sh` 远端跑 parse_trio_log.py 后 scp 回 data.json）；
- 不做 wiki 全文自动接入（补 `wiki-data.js` 的 md 字段即扩）；
- agent 使用次数为示意字段（数据键 `agents[].count`，标注示意）；
- 不做移动端适配（桌面 1440+ 优先）。

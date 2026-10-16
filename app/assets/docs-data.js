/* Agent/Skill 使用文档（markdown 源，与 AGENTS.md / .agents/skills 同源） */
window.WB_DOCS = {
  index: { t: 'Agent / Skill 使用指南 · 总目录', path: '来源：AGENTS.md · .agents/skills/', md:
`# Agent / Skill 使用指南

三个项目 Agent 负责判断与交接，固定流程交给 skills/scripts；不为文献、写作、命名、错误检查或远程运维重建常驻 Agent。

| 名称 | 类型 | 一句话职责 |
|---|---|---|
| @llie-sisyphus | agent | 跨 idea→code→exp→paper 多阶段编排：读状态、定门禁、给唯一下一步 |
| @llie-oracle | agent | 模块选择与 DS/US/L/H/M/F/S/LOSS 槽位映射，输出 slot_decision |
| @llie-explore | agent | 仓库只读定位：入口 / 注册链 / 调用链 / 张量形状，带 path:line 证据 |
| $academic-research-suite | skill | 文献检索、综述、写作、引用核验、同行评审（通用学术，不接管项目状态） |
| $llie-exp-train | skill | 远端训练启动：tmux + auto_resume 默认形状 |
| $llie-exp-status | skill | tmux / GPU / 日志巡检 |
| $llie-memory | skill | 离线 Wiki packet 预检（wiki_context.py） |

- 使用次数见总览卡（当前为**示意数据**，正式版从会话日志统计）。
- 点按总览卡条目查看各自说明。` },
  sisyphus: { t: '@llie-sisyphus · 跨阶段编排', path: '.agents/llie-sisyphus', md:
`# @llie-sisyphus

**何时使用**：跨 idea→code→exp→paper 的多阶段任务；需要判断当前状态、门禁和下一步时默认调用。

## 必须产出

- 当前阶段
- 证据 / 产物路径
- 门禁结果
- 未解决风险
- 唯一下一步

## 禁止事项

- 不复制下游 skill 的实现
- 不与 \`llie-pipeline\` 维护两套状态

## 与其他角色的关系

- 涉及模块/架构选择时交 \`@llie-oracle\`；插入点证据不足再交 \`@llie-explore\`
- 结论确定后回到 sisyphus，由其路由到 \`llie-idea-*\` / \`llie-exp-*\` / \`llie-paper-*\` skills 执行` },
  oracle: { t: '@llie-oracle · 槽位决策', path: '.agents/llie-oracle', md:
`# @llie-oracle

**何时使用**：UHD-LLIE 模块选择、\`DS/US/L/H/M/F/S/LOSS\` 槽位映射、Baseline、接口兼容和消融设计。

## 必须产出（slot_decision）

- 主槽位 / Baseline / 插入点 / I/O / UHD 成本 / 消融 / 证据 / 结论

## 禁止事项

- 不猜代码位置
- 未实验的收益不得写成事实

## 分歧记录示例

iccb_level 消融未采纳 oracle「砍 L2、以 A3 作对照」的建议——A3 是跨批对照（σ 0.36–1.09 dB，比同批 0.10 dB 差 3–10×），会淹没 placement 差异；trio 里的 L2 是批次效应锚点，不是 replication。` },
  explore: { t: '@llie-explore · 仓库定位', path: '.agents/llie-explore', md:
`# @llie-explore

**何时使用**：需要定位仓库入口、Registry、调用链、张量形状、依赖或真实集成点时。

## 必须产出

- 带 \`path:line\` 的入口、注册链、调用链、张量、依赖和未决项

## 禁止事项

- 只读
- 不选择候选、不修改代码、不替代 Oracle 决策` },
  expstatus: { t: '$llie-exp-status · 实验巡检', path: '.agents/skills/llie-exp-status/', md:
`# $llie-exp-status

巡检远端实验状态：tmux 会话、GPU 占用、训练日志尾部与异常（OOM、停顿、host 自动升级打断长训练）。

## 环境口径

- 远端实验统一用 office-gateway 的 \`/home/jcjy/lyl/envs/BasicSR_710/bin/python\`
- 710 项目根：\`/workspace/Code/BasicLLIE\`（注意与 office-gateway 路径不同）
- 连接方式见 \`task/ssh-connect-guide.md\`

## 当前在跑

- \`lvl{1,2,3}_trio\`（iccb_level 三臂）· 日志 \`tmp_trio/lvl{1,2,3}.log\`` },
  exptrain: { t: '$llie-exp-train · 训练启动', path: '.agents/skills/llie-exp-train/', md:
`# $llie-exp-train

## 默认启动形状

\`\`\`
tmux new-session -d -s <exp_name> "<env setup> && cd <project> && \\
  CUDA_VISIBLE_DEVICES=<gpu> python train.py -opt <config> --auto_resume"
\`\`\`

## 硬规则

- 所有训练默认支持 resume：配置保持 \`path.resume_state: ~\`，命令带 \`--auto_resume\`
- 训练一律在 tmux 里跑；前台直跑只限短冒烟
- 新 YAML 必须 \`experiment_layout: family-v1\`

## 最小冒烟（10 iterations）

\`\`\`
conda run -n llie python train.py -opt <your_option_yml> --debug \\
  --force_yml train:total_iter=10
\`\`\`

冒烟只用于本地 debug 路径检查；正式实验入口是 710 的 BasicSR_710 环境。` }
};

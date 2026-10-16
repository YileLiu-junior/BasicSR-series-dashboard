/* kb/wiki 结构索引 + 内嵌真实原文（数据源：kb/wiki/index.md 与对应 md 原文）
   正式接入全文：在对应条目加 md 字段即可，渲染器不变。 */
window.WB_WIKI = (function () {
  var WIKI = [
    { lane: 'SLOTS · 槽位决策', items: [
      ['DS_downsample', 'Haar DWT 下采样', 'ok'], ['US_upsample', 'Haar IWT 上采样', 'ok'],
      ['L_lowfreq', 'SS2D+GFFN（MambaIR）', 'ok'], ['H_highfreq', 'CMTAttention+FFN', 'ok'],
      ['M_matching', 'LL→HF l2-NN 匹配', 'ok'], ['F_fusion', 'SKFF 三高频子带聚合', 'ok'],
      ['S_sync', 'WaveletFRG 原型同步支路', 'prop'], ['LOSS_loss', 'L1+FFT+SSIM 组合损失', 'ok']
    ] },
    { lane: 'ARCHITECTURE · 框架设计', items: [
      ['WaveletFRG', '单阶段可选组件原型', 'ok'], ['CascadingWaveletFRG', '三阶段级联增强框架', 'prop'],
      ['integration_rules', 'WaveMamba 真实锚点与接入规则', 'ok'],
      ['illumination_conditioned_state_dynamics', '照度/噪声条件化状态动态', 'prop'],
      ['cross_wavelet_band_communication', 'LL↔LH/HL/HH 受控交互', 'prop'],
      ['boundary-calibrated-wavelet-shrinkage', 'ICRWS 边界修正（已撤回）', 'wd']
    ] },
    { lane: 'FIELD · 领域知识', items: [
      ['UHD_LLIE_timeline', '领域发展时间线与里程碑', 'ref'], ['UHD_challenges', '分辨率墙/显存/细节瓶颈', 'ref'],
      ['LLIE_classic', '经典脉络+伪创新识别', 'ref'], ['spatially_nonuniform_illumination', '照明场≠亮度≠反射率', 'ref'],
      ['signal_dependent_noise', '信号相关噪声与小波高频', 'ref']
    ] },
    { lane: 'PAPERS · 论文方法', items: [
      ['wave-mamba', '小波多尺度 SSM 基线', 'ref'], ['from-darkness-to-detail（ExpoMamba）', 'Fourier 幅相双分支 SSM', 'ref'],
      ['scnp-c2ssm', '稀疏语义中心 S6 扫描', 'ref'], ['two-shots-in-the-dark', '极少 RAW 暗帧频谱噪声合成', 'ref'],
      ['gt-mean-loss', '亮度失配监督损失', 'ref'], ['mixnet', 'GFML/LFML 全局局部混合', 'ref']
    ] },
    { lane: 'EXPERIMENTS · 实验记录', items: [
      ['wavemamba-baseline-scratch', 'office+710 101K 从零归档', 'ok'], ['iccb-a3', 'K=4 曝光状态校准', 'ok'],
      ['iccb-a7', 'A3+不确定性门控 bundle', 'ok'], ['iccb-a1a5-condition-ablation', '通道 vs 全局/局部/标量', 'ok'],
      ['iccb-b0b3-norm-ablation', '归一化 2×2（共线撤回）', 'ok'], ['iccb-attrib-710', '四臂×8 ckpt 配对拆分', 'ok'],
      ['iccb-attrib-uhdll-150k-full', '全量 150k 首评·欠曝尾部', 'prov'], ['iccb-placement-level-ablation', '注入层三臂在跑', 'act'],
      ['iccb-tile-gate-710', 'tile 三路门禁·门不关', 'prov'], ['icrws-b2', '两线独立负结论', 'neg'],
      ['iagtm', '照度头/损失分离', 'neg'], ['wavemamba-feb-cab', '+0.025 dB 未过门禁', 'neg'],
      ['uhdllie-cross-dataset-generalization', '跨域泛化矩阵（旧协议）', 'prov'], ['c2ssm-710-rerun', 'LR 修复复跑·过拟合区制', 'act'],
      ['remote-experiment-audit-2026-09', '指标来源与备份对账', 'act'], ['reproducibility-audit-2026-09', '非确定性与 runtime 对齐', 'act']
    ] },
    { lane: 'NOTES · 科研笔记', items: [
      ['qualitative_vs_quantitative_experiments', '两类实验组合用法', 'ref'],
      ['deep_only_asymmetric_crossfreq', '非对称跨频最小实验', 'prop'],
      ['region_scale_band_adaptive_restoration', '照度·噪声·状态·跨频辨析', 'prop'],
      ['wavemamba-evidence-rules-and-execution-plan', '证据规则与分阶段计划', 'ok'],
      ['cross-domain-innovation-exclusion-map', '机制黑名单+否决记录', 'ok'],
      ['novelty-check-crop-vs-fullframe-conditioning', 'crop/整帧查重判死', 'neg'],
      ['semantic-centroids-and-sparse-prototype-representations', '语义质心与原型边界', 'ref'],
      ['experiment-design-laws-for-agents', '单变量纪律与抖动结构', 'ok'],
      ['续训注意护栏检查事项', '原子恢复检查', 'ok'],
      ['checkpoint-selection-and-val-split', '用测试集挑 best 的缺陷', 'ok'],
      ['paper-reviewer-defense', '审稿必问点清单', 'ok']
    ] },
    { lane: 'SYNTHESIS · 综合', items: [['synthesis', '当前最优组合+待验证方向', 'ok']] }
  ];

  var MD = {
    'L_lowfreq':
`# Slot L: 低频处理

## 接口签名
- 语义输入/输出: 当前 stage 的 LL 特征图，保持 \`(B, C, h, w)\`。
- 当前 WaveMamba 宿主: \`LFSSBlock.self_attention\`；原型组件使用 \`MambaIR\`。
- 实现适配器: \`LFSSBlock\` 会在内部使用 \`NCHW ↔ NLC\`，该转换不是候选模块必须遵守的研究契约。

## 候选池
| 方法 | 来源论文 | 关键差异 | 状态 |
|---|---|---|---|
| MambaIR | - | SS2D + GFFN，状态空间模型 | current |

## 接口契约
- 上游依赖: DS 提供当前 stage 的 LL 子带。
- 下游消费: H 将 LL 作为 \`perception\`；US 使用恢复后的 LL；S 可选地同步 LL/HF。
- 约束条件: 保持同一 stage 的通道与空间尺度。第一层的 \`HW/4\` 不适用于所有 U-Net stage。

## 迁移检查清单
- 输入/输出维度是否匹配接口签名？
- 是否需要额外的预处理/后处理？
- 是否依赖特殊初始化（如预训练权重）？
- 是否引入新的超参数？
- 与上游/下游模块是否兼容？
- 是否增加了该 slot 的计算瓶颈？`,
    'synthesis':
`# Synthesis

当前参考组合与整体假设。活跃训练基线是三层 \`WaveMamba\`；单阶段 \`WaveletFRG\` 仅作为可选组件原型。

## 当前参考框架
- **活跃基线**: WaveMamba（三层 DownFRG/upFRG；每层 DWT→L、F→H、IWT）。
- **可选原型**: WaveletFRG（单阶段组件，不等同于活跃训练图）。
- **增强原型**: CascadingWaveletFRG（三阶段级联）。

## 槽位当前实现
| 槽位 | 实现 | 状态 |
|---|---|---|
| DS | Haar DWT | baseline |
| US | Haar IWT | baseline |
| L | MambaIR (SS2D+GFFN) | baseline |
| H | CMTAttention+FFN | baseline |
| M | HFEBlock 内部的 L2 Matching 条件化 | baseline sub-mechanism |
| F | HL/LH/HH 的 SKFF 聚合 | baseline |
| S | LL_HF_SyncLayer + 独立 consistency loss | proposed / 默认关闭 |
| LOSS | L1+FFT+SSIM | baseline |

## 核心假设
1. 频域分解（DWT/IWT）为 UHD-LLIE 提供有效的多尺度表示
2. 低频处理（MambaIR 状态空间模型）比 Transformer 更适合长序列依赖
3. 高低频分离处理优于单分支处理

## 待验证方向
- L 槽位: MambaIRv2（双向扫描）等候选方案
- H 槽位: Gated/Dilated Attention 等候选方案
- M/H 锚点: 在 HFEBlock 内评估自适应跨频条件化，而非新增串联 M 节点
- UHD 特性: 4K 分辨率下的计算效率优化`,
    'iccb-placement-level-ablation':
`# ICCB 注入层（\`iccb_level\`）消融 · 预登记（UHDLL 全量 30k 三臂）

> 状态：**2026-10-11 已起飞**（三臂同窗口、一臂一卡）。原定的「auxloss 10k 闸门二值门控」**已被用户 2026-10-11 取消**——闸门测出的是 auxloss 臂**自身**的病理（\`scan_proj\` 随机初始化把增益推到负饱和），与注入层无关。证据等级：层映射、分派路径、冒烟结果均为 **[远端已核验]**；「三臂差异可判读」是 **[推断]**，本页不主张任何收益。

## 动机
\`iccb_level\` 是 \`WaveMambaICCB_A1A5\` 上一个**现成的、干净的**单变量旋钮，但 **\`options/\` 下没有任何配置设置过它**——历史上所有 arm（含 A1–A5、attrib 四臂、framefull 150k）都跑在默认的 level 2。用户 2026-10-10 明确要求补这个消融。

## 变量与层映射
\`iccb_level\` 决定哪一个编码器下采样层挂 \`ICCBDownFRG\`（= 原 \`DownFRG\` + post-LFSS / pre-HFE 的 ICCB 注入点）。**它不改 DS/US 槽位**：Haar DWT 下采样与 IWT 上采样原封不动，变的是 L 路径上承接曝光调制的宿主层。

| level | 宿主层 | LL 分辨率 | 历史覆盖 |
|---|---|---|---|
| 1 | \`down_group1\` | H/2（最细） | **从未执行** |
| 2（默认） | \`down_group2\` | H/4 | 全部历史 arm |
| 3 | \`down_group3\` | H/8（最粗） | **从未执行** |

代码依据（\`basicllie/archs/wavemamba_a1a5_arch.py\`，本地与 710 行号已比对一致）：\`:1486\` 形参默认值 2；\`:1494\` 按 level 取宿主层；\`:1502-1507\` 权重灌入并断言缺失键全部以 \`iccb.\` 开头——**这条断言是层替换能保持权重等价的关键**。

## 三臂配置
\`options/train/wavemamba-attrib/wavemamba_attrib_framefull_lvl{1,2,3}_s20260901_uhdll_30k_20261011.yml\`

- 从 150k 控制臂分叉，**唯一架构变量是 \`network_g.iccb_level\`**（rest 逐字不变：seed / 数据 / 损失 / 优化器 / \`gain_bound\` / 三个正则全 0）。
- 全量 UHDLL（2000 train / 150 test）、\`num_gpu: 1\`、\`batch_size_per_gpu: 8\`（全局 batch 仍为 8，与 150k 控制臂同口径）。
- 实测前 650 iter @ **3.43 s/iter** ⇒ 单臂 30k ≈ 28.6h，推算 ETA **2026-10-12 ~14:00 UTC**。

> 以上为**节选**——应用内由本地 \`kb/wiki/experiments/iccb-placement-level-ablation.md\` 全文渲染。`
  };

  return { lanes: WIKI, md: MD };
})();

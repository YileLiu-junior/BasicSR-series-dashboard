/* trio 三臂实验配置（真实原文，来源 options/train/wavemamba-attrib/*_20261011.yml，L2/L3 由 L1 派生） */
window.WB_YAML = `# 注入层消融 L1：ICCB 挂在 down_group1（H/2，最细尺度）。
# 相对同族 150k 配置的唯一架构变量是 network_g.iccb_level；其余全部逐字照抄
# wavemamba_attrib_framefull_s20260901_uhdll_150k_20260929.yml，含 seed / 数据 / 损失 / 优化器。
# 三臂（lvl1/lvl2/lvl3）必须同批训练才可比 —— framefull@150k 是不同 batch、不同 iter 数，不能当对照。
# 依据：basicllie/archs/wavemamba_a1a5_arch.py:1491-1508（iccb_level 校验与替换）、
#       :1535-1554（三条分派路径）。level 1/3 此前从未被任何配置执行过，起飞前必须先 10-iter 冒烟。
experiment_layout: family-v1
name: wavemamba_attrib_framefull_lvl1_s20260901_uhdll_30k_20261011
model_type: FeMaSRModel
scale: &upscale 1
num_gpu: 1
manual_seed: 20260901

datasets:
  train:
    name: UHDLL_Train
    type: PairedImageDataset
    dataroot_gt: /workspace/Code/BasicLLIE/datasets/UHDLL/training_set/gt
    dataroot_lq: /workspace/Code/BasicLLIE/datasets/UHDLL/training_set/input
    io_backend:
      type: disk
    gt_size: 768
    use_resize_crop: true
    use_flip: true
    use_rot: true
    use_shuffle: true
    geometric_augs: true
    batch_size_per_gpu: 8
    num_worker_per_gpu: 8
    dataset_enlarge_ratio: 1
    prefetch_mode: cpu
    num_prefetch_queue: 8
    return_full_lq_thumbnail: true
    full_lq_thumbnail_size: 256

  val:
    name: UHDLL_Test
    type: PairedImageDataset
    dataroot_gt: /workspace/Code/BasicLLIE/datasets/UHDLL/testing_set/gt
    dataroot_lq: /workspace/Code/BasicLLIE/datasets/UHDLL/testing_set/input
    io_backend:
      type: disk
    gt_size: 768
    use_resize_crop: true
    use_flip: true
    use_rot: true
    geometric_augs: true
    return_full_lq_thumbnail: true
    full_lq_thumbnail_size: 256

network_g:
  type: WaveMambaICCB_A1A5
  in_chn: 3
  wf: 32
  n_l_blocks: [1, 2, 4]
  n_h_blocks: [1, 1, 2]
  ffn_scale: 2.0
  iccb_level: 1
  num_exposure_states: 4
  state_source: full
  gain_mode: scalar_gn
  norm_scope: global
  norm_window_size: 15
  use_state_scan: false
  use_uncertainty_gate: false
  use_full_crop_consistency: false
  thumbnail_size: 256
  state_grid_size: 64
  assignment_temperature: 0.15
  gain_bound: 0.25
  mono_loss_weight: 0.0
  fc_loss_weight: 0.0
  fc_gain_weight: 0.0

network_d:
  type: UNetDiscriminatorSN
  num_in_ch: 3

path:
  experiments_root: /workspace/Code/BasicLLIE/experiments/WaveMamba-Attrib
  pretrain_network_hq: ~
  pretrain_network_g: ~
  pretrain_network_d: ~
  strict_load: false
  resume_state: ~

train:
  optim_g:
    type: AdamW
    lr: !!float 5e-4
    weight_decay: !!float 1e-3
    betas: [0.9, 0.99]
  optim_d:
    type: Adam
    lr: !!float 4e-4
    weight_decay: 0
    betas: [0.9, 0.99]
  scheduler:
    type: CosineAnnealingRestartCyclicLR
    periods: [100, 29900]
    restart_weights: [1, 1]
    eta_mins: [0.0005, 0.0000001]
  total_iter: 30000
  warmup_iter: -1
  pixel_opt:
    type: L1Loss
    loss_weight: 1.0
    reduction: mean
  fft_opt:
    type: FFTLoss
    loss_weight: !!float 0.1
  perceptual_opt:
    type: LPIPSLoss
    loss_weight: !!float 0
  gan_opt:
    type: GANLoss
    gan_type: hinge
    real_label_val: 0.0
    fake_label_val: 0.0
    loss_weight: 0
  codebook_opt:
    loss_weight: 0
  semantic_opt:
    loss_weight: 0
  net_d_iters: 0
  net_d_init_iters: !!float 0

val:
  enabled: false
  save_img: false
  val_freq: 100000

logger:
  print_freq: 50
  save_checkpoint_freq: 2000
  save_latest_freq: !!float 1e4
  show_tf_imgs_freq: !!float 1e4
  use_tb_logger: true

runtime:
  allow_tf32: false
  deterministic: true

dist_params:
  backend: nccl
  port: 29531
find_unused_parameters: true`;

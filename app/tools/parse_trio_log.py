#!/usr/bin/env python3
"""解析 BasicsR 训练 log，把最新运行状态合并进 data.json 的 trio.arms。

用法（本机或 710 上均可；只读 log，只写 data.json）：
  python tools/parse_trio_log.py --log tmp_trio/lvl1.log --arm L1 --data data/data.json

规则（与工作台口径一致，不伪造数据）：
- 取 log 中最后一条匹配 INFO 行，更新 iter_label/epoch/eta_label/eta_sec 与 table 末 5 行；
- series 取全部 l_pix 采样，均匀降采样到 --series-points 点（必含首尾，末点=最新实测）；
- real 置 true（来自真实 log）；只动 trio.arms[arm] 的运行时字段，不碰其他键。
"""
import argparse
import json
import re
import sys
from pathlib import Path

PAT = re.compile(
    r"INFO: \[.*?\]\[epoch: (\d+), iter:\s*([\d,]+), lr:\(([\d.eE+-]+),?\)\]"
    r"\[eta: ([^,]+), time \(data\): ([\d.]+) \(([\d.]+)\)\] "
    r"l_pix: ([\d.eE+-]+) l_freq: ([\d.eE+-]+)"
)


def eta_seconds(s: str) -> int:
    s = s.strip()
    days = 0
    if 'day' in s:
        days, s = s.split('day', 1)
        days = int(days.strip().rstrip(','))
        s = s.strip()
    parts = [int(x) for x in s.split(':')]
    while len(parts) < 3:
        parts.insert(0, 0)
    h, m, sec = parts[-3:]
    return days * 86400 + h * 3600 + m * 60 + sec


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--log', required=True, help='训练日志文件（如 tmp_trio/lvl1.log）')
    ap.add_argument('--arm', required=True, choices=['L1', 'L2', 'L3'])
    ap.add_argument('--data', default='data/data.json', help='工作台数据文件')
    ap.add_argument('--series-points', type=int, default=40)
    a = ap.parse_args()

    lines = Path(a.log).read_text(encoding='utf-8', errors='replace').splitlines()
    rows = [m for m in (PAT.search(ln) for ln in lines) if m]
    if not rows:
        print('no matching INFO lines; 检查 log 是否为本项目 BasicsR 训练日志')
        sys.exit(1)
    last = rows[-1]

    series = [[int(m.group(2).replace(',', '')), float(m.group(7))] for m in rows]
    if len(series) > a.series_points:
        step = len(series) / a.series_points
        idx = [min(int(i * step), len(series) - 1) for i in range(a.series_points)]
        idx[-1] = len(series) - 1
        series = [series[i] for i in idx]

    data = json.loads(Path(a.data).read_text(encoding='utf-8'))
    arm = next(x for x in data['trio']['arms'] if x['id'] == a.arm)
    iter_num = int(last.group(2).replace(',', ''))
    arm.update({
        'real': True,
        'iter_label': f'{iter_num:,}',
        'epoch': int(last.group(1)),
        'eta_label': ' '.join(last.group(4).strip().rstrip(',').split()),
        'series': series,
        'table': [
            [f'{int(r.group(2).replace(",", "")):,}', r.group(7), r.group(8),
             r.group(3).rstrip(','), f'{r.group(5)} ({r.group(6)})']
            for r in rows[-5:]
        ],
    })
    arm['eta_sec'] = eta_seconds(last.group(4))

    Path(a.data).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"{a.arm}: iter {arm['iter_label']} · eta {arm['eta_label']} · l_pix {last.group(7)} → {a.data}")


if __name__ == '__main__':
    main()

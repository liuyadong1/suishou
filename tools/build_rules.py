#!/usr/bin/env python3
"""生成 App 使用的规则库 rules.json。

来源：
  knowledge/photo_rules.json  —— 摄影书蒸馏的主库（信号 + 条件 + 叠加图形 + 出处）
  rules_ext.json              —— 随手大师场景补充规则（SS-）和场景技巧（tips）

用法：
  python3 tools/build_rules.py          重新生成 rules.json
  python3 tools/build_rules.py --check  只检查 rules.json 是否已是最新（发布前自动运行）
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build():
    main = json.loads((ROOT / 'knowledge' / 'photo_rules.json').read_text(encoding='utf-8'))
    ext = json.loads((ROOT / 'rules_ext.json').read_text(encoding='utf-8'))
    main_ids = {r['id'] for r in main['rules']}
    clash = [r['id'] for r in ext['rules'] if r['id'] in main_ids]
    if clash:
        sys.exit(f'补充规则 id 与主库重复：{clash}')
    out = dict(main)
    out['app_extensions_version'] = ext['version']
    out['merged_note'] = ('主库来自 knowledge/photo_rules.json（id 不带 SS 前缀）；'
                          'SS- 开头的是随手大师针对 10 类细分场景的补充规则；tips 为画面无问题时轮播的技巧。'
                          '本文件由 tools/build_rules.py 生成，请勿直接修改。')
    out['rules'] = main['rules'] + ext['rules']
    out['tips'] = ext['tips']
    return json.dumps(out, ensure_ascii=False, indent=1) + '\n'


if __name__ == '__main__':
    text = build()
    target = ROOT / 'rules.json'
    if '--check' in sys.argv:
        if not target.exists() or target.read_text(encoding='utf-8') != text:
            sys.exit('rules.json 不是最新的：请运行 python3 tools/build_rules.py')
        print('rules.json 已是最新')
    else:
        target.write_text(text, encoding='utf-8')
        print(f'已生成 rules.json：{len(json.loads(text)["rules"])} 条规则，{len(json.loads(text)["tips"])} 条技巧')

# 随手大师

AI 拍照教练：实时取景时给出构图、光线、姿势提示。网址：https://liuyadong1.github.io/suishou/

- `index.html`：App（网页版，照片只在手机本地分析）
- `engine.js`：规则引擎
- `knowledge/photo_rules.json`：摄影书蒸馏的主规则库（B1《10天学会手机摄影》、B2《美国纽约摄影学院摄影教材》）
- `rules_ext.json`：10 类细分场景的补充规则和场景技巧
- `rules.json`：由 `python3 tools/build_rules.py` 合并生成，App 读取这个文件
- `rules.html`：规则库浏览与反馈统计
- `tests/run.mjs`：规则库自动测试（发布前自动运行）

# 摄影知识库（规则来源）

这里存放从摄影书蒸馏出的**原理级规则库**，是 App 规则库 `../rules.json` 的上游。

- `photo_rules.json`：知识库 v0.2.0，96 条取景规则 + 8 条拍后建议，来源：
  - B1：10天学会手机摄影（手机摄影技巧全书）（杨精坤（玩转轻摄影））
  - B2：美国纽约摄影学院摄影教材（上、下册）（美国纽约摄影学院（NYIP）著，中国摄影出版社译）
- `SKILL.md`：蒸馏新书时使用的方法（筛选标准、规则格式、文案规范）

## 和 App 规则库的关系

App 直接使用这份知识库作为主规则库，不再手工改写成另一种格式：

```
knowledge/photo_rules.json  ─┐
                             ├─ tools/build_rules.py ─→ rules.json（App 读取）
rules_ext.json              ─┘
```

- `photo_rules.json`：主库（本目录），用“信号 + 条件 + 叠加图形 + 出处”描述规则，App 的规则引擎 `engine.js` 原样执行。
- `../rules_ext.json`：随手大师针对 10 类细分场景的补充规则（SS- 开头，如自拍椭圆框、显腿长、打卡人物比例）和场景技巧。
- `../rules.json`：由 `python3 tools/build_rules.py` 合并生成，请勿直接修改；发布前会自动检查它是否最新。

**更新知识库的步骤**：替换本目录的 `photo_rules.json` → 运行 `python3 tools/build_rules.py` → 运行 `node tests/run.mjs`（自动为每条规则构造用例验证）→ 发布。

信号缺失时，依赖它的规则自动跳过，不会误报。网页版已经能计算的信号列在 `engine.js` 的 `APP_SIGNALS` 中。

### 暂未生效的主库规则（需要新增识别能力或开放场景）

当前主库 96 条中，60 条在网页版可实时运行。下表是其余规则及原因（由脚本根据 `APP_SIGNALS` 自动统计）。

| 规则 | 提示文案 | 暂缺的信号 | 未开放的场景 |
|---|---|---|---|
| FOC-001 | 先点一下主体，清楚了再拍 | focus_point_on_subject | — |
| FOC-002 | 对焦点放在眼睛上 | eyes_in_focus_region | — |
| FOC-003 | 退后一点，再两指稍微放大 | focus_distance_m | — |
| FOC-004 | 先对同样远的物体，锁定后再构图 | focus_failed_plain | — |
| FOC-005 | 靠近到半米内，背景会自然虚掉 | focus_distance_m | — |
| FOC-006 | 对焦在近处，远处会虚化 | depth_range、focus_point_is_far | — |
| EXP-004 | 明暗差太大，打开HDR | hdr_on | — |
| EXP-005 | 有东西在动，先关掉HDR | hdr_on | — |
| LGT-003 | 绕到对面逆光拍，叶脉会透亮 | translucent_subject | — |
| LGT-004 | 用手挡住镜头上方的阳光 | flare_score | — |
| LGT-007 | 把主体放在明暗交界处 | shadow_boundary_score | — |
| COMP-007 | 东西太多，只留最想拍的 | element_count | — |
| COMP-011 | 放低手机贴近，线条会汇向远方 | leading_lines_score | — |
| COMP-014 | 让弯道从画面角落延伸进来 | s_curve_score | — |
| COMP-015 | 侧过来拍，更有立体感 | subject_frontal_rect | — |
| COMP-018 | 前景太多，镜头往上抬一点 | foreground_ratio | — |
| POR-007 | 人小景大很有意境，放在三分线 | person_back_view | — |
| BW-002 | 这个光影适合拍黑白 | shadow_boundary_score、texture_pattern_score | — |
| CRE-001 | 手机够稳，试试拍光轨或丝滑流水 | moving_light_or_water | — |
| FOC-007 | 长按主体，锁定对焦 | focus_jump | — |
| NGT-002 | 点月亮，再把亮度调低 | moon_detected、moon_clipped | — |
| NGT-003 | 放稳手机，避开前景路灯 | fireworks_detected | — |
| POR-010 | 眼镜反光：微低下巴或侧转一点 | glasses_glare | — |
| GRP-001 | 高低错落，站成三角形 | face_heights_spread | group |
| GRP-002 | 让大家看同一个地方 | gaze_agreement | group |
| GRP-003 | 靠近点，肩挨着肩 | group_gap_ratio | group |
| GRP-004 | 孩子看镜头，大人看孩子 | child_adult_pair、child_looks_camera、adult_looks_child | group、child |
| KID-001 | 蹲下来，和TA眼睛一样高 | — | child、pet |
| KID-002 | 在镜头旁摇玩具或叫名字 | subject_attention | child、pet |
| PET-001 | 黑毛别拍成灰，调暗一点 | — | pet |
| PET-002 | 白毛先点它，看清毛的纹理 | — | pet |
| SPT-001 | 到他前方，拍迎面而来 | subject_motion_dir | — |
| SPT-002 | 跟着转身拍，背景会流动 | subject_motion_dir | — |
| COMP-024 | 放低手机，带点花草石头做前景 | near_foreground_present、depth_range | — |
| ARC-002 | 往一侧挪，让一面为主 | corner_centered | — |
| ARC-003 | 离太近楼角变形，后退几步 | corner_centered | — |
| ARC-004 | 横向挪几步，避开杆子和车 | foreground_obstacle | — |
| INT-001 | 收走杂物再拍，越少越好 | element_count | — |
| FOOD-001 | 让光从侧后方来，更有质感 | — | food_still |
| FOOD-002 | 喷点清水，蔬果更新鲜 | — | food_still |
| FLW-001 | 有风在晃，等风停再按 | focus_distance_m | — |

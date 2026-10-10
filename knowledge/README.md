# 摄影知识库（规则来源）

这里存放从摄影书蒸馏出的**原理级规则库**，是 App 规则库 `../rules.json` 的上游。

- `photo_rules.json`：知识库 v0.2.0，96 条取景规则 + 8 条拍后建议，来源：
  - B1：10天学会手机摄影（手机摄影技巧全书）（杨精坤（玩转轻摄影））
  - B2：美国纽约摄影学院摄影教材（上、下册）（美国纽约摄影学院（NYIP）著，中国摄影出版社译）
- `SKILL.md`：蒸馏新书时使用的方法（筛选标准、规则格式、文案规范）

## 和 App 规则库的关系

知识库里的规则用“理想信号”描述（比如人脸朝向、多人视线、遮挡物识别），App 只能用手机上已经算得出来的画面特征。
所以每次更新知识库后，把**现有特征能判断的**落到 `rules.json`，其余留在下面的待实现清单，等加了对应识别能力再接入。

### 已接入 App（24 条）

| 知识库规则 | App 规则 |
|---|---|
| COMP-001 | C-tilt |
| COMP-002 | V-horizon |
| COMP-021 | V-plainsky |
| COMP-024 | V-fore |
| ARC-001 | B-keystone |
| COMP-009 | B-sym |
| LGT-009 | S-silhouette |
| STAB-001 | N-shake |
| NGT-001 | N-lights |
| EXP-006 | N-dark |
| COMP-006 | M-clutter |
| COMP-003 | M-pos / P-pos |
| COMP-005 | M-closer |
| EXP-001 | P-backlight |
| POR-015 | H-eyes |
| POR-013 | H-turn |
| POR-016 | H-elbow / H-knee / F-feet |
| COMP-026 | C-finger |
| POR-012 | H-lowangle |
| POR-014 | H-close / Y-far |
| POR-017 | P-pole |
| POR-008 | P-dapple |
| POR-004 | P-pose |
| POR-005 | tip-selfie-1 |

另外，知识库中能讲但测不出来的内容已写成各场景的「小技巧」（rules.json 中 kind=tip，带 refs 出处）。

### 待实现（需要新增识别能力，71 条）

| 规则 | 提示文案 | 检测方式 | 需要的信号 |
|---|---|---|---|
| STAB-002 | 太暗了动的东西会糊，开连拍 | realtime | mean_luma, subject_motion |
| STAB-003 | 按住连拍，事后挑最好的一张 | realtime | mean_luma, subject_motion |
| FOC-001 | 先点一下主体，清楚了再拍 | realtime | focus_point_on_subject, subject_detected |
| FOC-002 | 对焦点放在眼睛上 | realtime | eyes_in_focus_region, face_count |
| FOC-003 | 退后一点，再两指稍微放大 | realtime | focus_distance_m |
| FOC-004 | 先对同样远的物体，锁定后再构图 | realtime | focus_failed_plain |
| FOC-005 | 靠近到半米内，背景会自然虚掉 | realtime | background_clutter, focus_distance_m, subject_area_ratio |
| FOC-006 | 对焦在近处，远处会虚化 | needs_depth | depth_range, focus_point_is_far, subject_detected |
| EXP-003 | 黑色多的画面，把亮度调低一点 | realtime | dark_area_ratio, mean_luma, shadow_clip_ratio |
| EXP-004 | 明暗差太大，打开HDR | realtime | hdr_on, highlight_clip_ratio, shadow_clip_ratio, subject_motion |
| EXP-005 | 有东西在动，先关掉HDR | realtime | hdr_on, subject_motion |
| LGT-001 | 阳光太硬，挪到阴影里拍 | realtime | highlight_clip_ratio, time_phase, weather_overcast |
| LGT-002 | 顺光太平，绕到侧面试试 | realtime | light_direction, time_phase |
| LGT-003 | 绕到对面逆光拍，叶脉会透亮 | realtime | light_direction, translucent_subject, weather_overcast |
| LGT-004 | 用手挡住镜头上方的阳光 | realtime | flare_score, sun_in_frame |
| LGT-005 | 黄金时刻，光线最好，多拍几张 | metadata | time_phase |
| LGT-006 | 灯光偏色，靠近窗边自然光 | realtime | color_cast_score |
| LGT-007 | 把主体放在明暗交界处 | realtime | shadow_boundary_score, subject_detected |
| LGT-008 | 阴天拍花，颜色最正 | realtime | weather_overcast |
| COMP-004 | None | realtime | background_clutter, subject_area_ratio, subject_dist_to_center |
| COMP-007 | 东西太多，只留最想拍的 | realtime | element_count, subject_area_ratio |
| COMP-008 | 先找一个主角 | realtime | subject_detected |
| COMP-010 | 等只鸟或一条船进画面 | realtime | subject_motion, symmetry_score |
| COMP-011 | 放低手机贴近，线条会汇向远方 | realtime | device_pitch_deg, leading_lines_score |
| COMP-012 | 斜着拍试试，更有活力 | realtime | diagonal_line_score, dominant_line_angle_deg, subject_detected |
| COMP-013 | 主角放进这个“窗口”里 | realtime | frame_border_score |
| COMP-014 | 让弯道从画面角落延伸进来 | needs_model | s_curve_score |
| COMP-015 | 侧过来拍，更有立体感 | needs_model | subject_detected, subject_frontal_rect, symmetry_score |
| COMP-016 | 留白很好，主角放到三分线上 | realtime | plain_bg_ratio, subject_area_ratio, subject_dist_to_center |
| COMP-017 | 蹲低一点，平视或仰拍 | realtime | device_pitch_deg, subject_area_ratio |
| COMP-018 | 前景太多，镜头往上抬一点 | realtime | foreground_ratio, subject_bottom_y |
| COMP-019 | 放大太多会糊，能走近就走近 | realtime | digital_zoom_x |
| POR-001 | 去树荫下，或背对太阳拍 | realtime | face_hard_shadow, face_highlight_clip |
| POR-002 | 让TA侧身背光，发丝会发亮 | realtime | face_count, light_direction, time_phase |
| POR-003 | 换面干净的墙或天空做背景 | realtime | background_clutter, face_area_ratio, face_count |
| POR-006 | 试试侧脸，或遮住半张脸 | realtime | face_count, subject_idle_s |
| POR-007 | 人小景大很有意境，放在三分线 | needs_model | face_count, person_back_view, plain_bg_ratio, subject_area_ratio |
| BW-001 | 颜色太杂，试试黑白 | realtime | colorfulness_chaos |
| BW-002 | 这个光影适合拍黑白 | realtime | shadow_boundary_score, texture_pattern_score |
| CRE-001 | 手机够稳，试试拍光轨或丝滑流水 | realtime | device_stable_s, moving_light_or_water |
| CRE-002 | 云在动，试试延时摄影 | realtime | device_stable_s, sky_texture |
| FOC-007 | 长按主体，锁定对焦 | realtime | focus_jump |
| NGT-002 | 点月亮，再把亮度调低 | realtime | moon_clipped, moon_detected |
| NGT-003 | 放稳手机，避开前景路灯 | realtime | fireworks_detected |
| NGT-004 | 点亮的那一侧，保留暗部氛围 | realtime | mean_luma, single_side_light |
| POR-009 | 让TA侧对亮处，脸更立体 | realtime | face_count, face_modeling, weather_overcast |
| POR-010 | 眼镜反光：微低下巴或侧转一点 | realtime | glasses_glare |
| POR-011 | 肤色发青，换个背景或调暖 | realtime | skin_cast |
| POR-018 | 头发和背景太像，换深或浅背景 | realtime | face_count, hair_bg_contrast |
| GRP-001 | 高低错落，站成三角形 | realtime | face_count, face_heights_spread |
| GRP-002 | 让大家看同一个地方 | realtime | face_count, gaze_agreement |
| GRP-003 | 靠近点，肩挨着肩 | realtime | face_count, group_gap_ratio |
| GRP-004 | 孩子看镜头，大人看孩子 | realtime | adult_looks_child, child_adult_pair, child_looks_camera |
| KID-001 | 蹲下来，和TA眼睛一样高 | realtime | camera_above_subject_deg |
| KID-002 | 在镜头旁摇玩具或叫名字 | realtime | subject_attention, subject_idle_s |
| PET-001 | 黑毛别拍成灰，调暗一点 | realtime | subject_class, subject_mean_luma |
| PET-002 | 白毛先点它，看清毛的纹理 | realtime | subject_class, subject_mean_luma |
| SPT-001 | 到他前方，拍迎面而来 | realtime | subject_motion, subject_motion_dir |
| SPT-002 | 跟着转身拍，背景会流动 | realtime | subject_motion, subject_motion_dir |
| COMP-020 | 朝向的那边多留点空 | realtime | facing_space_ratio |
| COMP-022 | 四周留点空，别塞太满 | realtime | face_area_ratio, subject_touches_edges |
| COMP-023 | 背景亮斑抢眼，换个角度 | realtime | bg_bright_distractor |
| COMP-025 | 人多：等空档或用前景挡住 | realtime | person_count, persons_are_subject |
| ARC-002 | 往一侧挪，让一面为主 | realtime | corner_centered, subject_area_ratio |
| ARC-003 | 离太近楼角变形，后退几步 | realtime | corner_centered, focal_equiv_mm, subject_area_ratio |
| ARC-004 | 横向挪几步，避开杆子和车 | realtime | foreground_obstacle |
| INT-001 | 收走杂物再拍，越少越好 | realtime | element_count |
| FOOD-001 | 让光从侧后方来，更有质感 | realtime | light_direction, weather_overcast |
| FOOD-002 | 喷点清水，蔬果更新鲜 | realtime | subject_class |
| FLW-001 | 有风在晃，等风停再按 | realtime | focus_distance_m, subject_motion |
| FLW-002 | 背景和主体太像，换个角度 | realtime | subject_bg_color_similarity |

建议的接入顺序：多人检测（合影站位/视线，GRP-*）→ 人脸朝向（四分之三侧脸、视线留白）→ 场景分类（宠物/儿童/食物/室内）→ 月亮/烟花识别。

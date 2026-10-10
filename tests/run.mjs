// 规则库自动验证：每条检测规则都要有测试用例触发，文案和画面标注都能正常生成。
// 运行：node tests/run.mjs（发布网站前会自动运行，失败则不发布）
import {readFileSync} from 'node:fs';
import {compileRules, runRules} from '../engine.js';

const lib = compileRules(JSON.parse(readFileSync(new URL('../rules.json', import.meta.url), 'utf8')));

// 一张“没有任何问题”的画面特征，用例只改需要的字段
const BASE = {
  has_human: true, front: false, mean: 120, hi: 0.01, warm: 0.02, sun_mean: 180, sun_x: 0.8, sun_y: 0.2, sun_tx: 2/3, sun_ty: 1/3,
  vdens: 0.01, keystone: 0, sym_score: 0.3, sym_shift: 0, sym_c: 0.5, top_edge: 0.02, low_edge: 0.1, low_sd: 30,
  center_sharp: 10, border_sharp: 4, sharp_x: 0.33, sharp_y: 0.33, sharp_tx: 1/3, sharp_ty: 1/3, spread: 0.25,
  has_shake: false, shake: -1, has_tilt: true, tilt: 0.3, tilt_abs: 0.3, tilt_src: 'sensor',
  has_hz: true, hz_y: 0.66, hz_conf: 1, sky_sd: 20, hz_t: 2/3,
  has_person: false, p_cx: 0.5, p_cy: 0.5, pos_t: 0.5, pos_d: 0, head_top: -1, full: false, ankle_y: -1, knee_y: -1, eye_y: -1, elbow_y: -1,
  square: false, height_ratio: -1, neck_y: -1, sitting: false, thigh_short: false, face_w: -1, face_x: 0.5, face_y: 0.5, face_rect: null, face_dark: false,
  pose_on: false, pose_score: -1, pose_hint: '', pose_short: '', pose_pt: null,
};
const PERSON = {has_person: true, p_cx: 0.34, p_cy: 0.3, pos_t: 1/3, pos_d: -0.007, head_top: 0.08, full: true, ankle_y: 0.94, knee_y: 0.72, eye_y: 0.2, elbow_y: 0.5, height_ratio: 0.86, neck_y: 0.24, face_w: 0.12, face_x: 0.34, face_y: 0.2, face_rect: [100, 100, 60, 66]};
const SELFIE = {has_person: true, p_cx: 0.5, p_cy: 0.6, pos_t: 2/3, pos_d: 0.16, head_top: 0.1, eye_y: 0.36, face_w: 0.4, face_x: 0.5, face_y: 0.38, face_rect: [300, 300, 200, 220], height_ratio: 0.9};

const CASES = [
  {name: '风景：一切正常', sub: 'vista', f: {}, expect: [], absentAll: true},
  {name: '风景：手机歪 4°', sub: 'vista', f: {tilt: 4, tilt_abs: 4}, expect: ['C-tilt']},
  {name: '风景：地平线居中', sub: 'vista', f: {hz_y: 0.5}, expect: ['V-horizon']},
  {name: '风景：天空无云', sub: 'vista', f: {sky_sd: 3, hz_y: 0.62, hz_t: 1/3}, expect: ['V-plainsky']},
  {name: '风景：前景空', sub: 'vista', f: {low_edge: 0.01, low_sd: 5}, expect: ['V-fore']},
  {name: '风景：偏暗', sub: 'vista', f: {mean: 40}, expect: ['C-dark']},
  {name: '风景：过曝', sub: 'vista', f: {hi: 0.2}, expect: ['C-bright']},
  {name: '建筑：仰拍竖线内倒', sub: 'city', f: {keystone: 4, vdens: 0.08}, expect: ['B-keystone']},
  {name: '建筑：对称没对正', sub: 'city', f: {sym_score: 0.7, sym_shift: 0.06, sym_c: 0.56}, expect: ['B-sym']},
  {name: '建筑：楼顶被切', sub: 'city', f: {top_edge: 0.3, vdens: 0.08}, expect: ['B-top']},
  {name: '日落：天空过曝', sub: 'sunset', f: {hi: 0.08}, expect: ['S-exposure']},
  {name: '日落：天空太少', sub: 'sunset', f: {hz_y: 0.45}, expect: ['S-horizon']},
  {name: '日落：太阳居中', sub: 'sunset', f: {sun_mean: 250, sun_x: 0.5, sun_y: 0.45, sun_tx: 1/3, sun_ty: 1/3}, expect: ['S-sunpos']},
  {name: '日落：逆光人物', sub: 'sunset', f: {...PERSON, face_dark: true}, expect: ['S-silhouette']},
  {name: '夜景：手抖', sub: 'night', f: {has_shake: true, shake: 12, mean: 50}, expect: ['N-shake']},
  {name: '夜景：灯光过曝', sub: 'night', f: {hi: 0.1, mean: 50}, expect: ['N-lights']},
  {name: '夜景：很暗', sub: 'night', f: {mean: 25}, expect: ['N-dark']},
  {name: '特写：背景乱', sub: 'macro', f: {border_sharp: 12, center_sharp: 10}, expect: ['M-clutter']},
  {name: '特写：主体居中', sub: 'macro', f: {spread: 0.15, sharp_x: 0.5, sharp_y: 0.52}, expect: ['M-pos']},
  {name: '特写：主体太小', sub: 'macro', f: {spread: 0.4}, expect: ['M-closer']},
  {name: '人像：没有人', sub: 'full', f: {}, expect: ['P-noperson']},
  {name: '全身：人在正中偏左', sub: 'full', f: {...PERSON, p_cx: 0.44, pos_t: 1/3, pos_d: -0.107}, expect: ['P-pos']},
  {name: '全身：头顶切到', sub: 'full', f: {...PERSON, head_top: 0.01}, expect: ['P-headcut']},
  {name: '全身：头顶空太多', sub: 'full', f: {...PERSON, head_top: 0.25, ankle_y: 0.85}, expect: ['P-headroom-full']},
  {name: '全身：没拍到脚', sub: 'full', f: {...PERSON, full: false, ankle_y: -1, knee_y: 0.9}, expect: ['F-nofeet']},
  {name: '全身：脚贴底边', sub: 'full', f: {...PERSON, ankle_y: 0.99}, expect: ['F-feet']},
  {name: '全身：脚离底边远', sub: 'full', f: {...PERSON, ankle_y: 0.8}, expect: ['F-legs']},
  {name: '半身：头顶空太多', sub: 'half', f: {...PERSON, full: false, head_top: 0.3, eye_y: 0.33}, expect: ['P-headroom-half']},
  {name: '半身：眼睛太低', sub: 'half', f: {...PERSON, full: false, eye_y: 0.5}, expect: ['H-eyes']},
  {name: '半身：切在手肘', sub: 'half', f: {...PERSON, full: false, eye_y: 0.33, elbow_y: 0.95}, expect: ['H-elbow']},
  {name: '半身：正对镜头', sub: 'half', f: {...PERSON, full: false, eye_y: 0.33, square: true}, expect: ['H-turn']},
  {name: '打卡：人太大', sub: 'travel', f: {...PERSON, height_ratio: 0.8}, expect: ['T-toobig']},
  {name: '打卡：地平线穿脖子', sub: 'travel', f: {...PERSON, height_ratio: 0.3, hz_y: 0.25, neck_y: 0.24}, expect: ['T-neck']},
  {name: '坐姿：俯拍', sub: 'sit', f: {...PERSON, eye_y: 0.6}, expect: ['I-level']},
  {name: '坐姿：膝盖对镜头', sub: 'sit', f: {...PERSON, thigh_short: true}, expect: ['I-knees']},
  {name: '自拍：太近', sub: 'selfie', f: {...SELFIE, face_w: 0.7}, expect: ['Y-far']},
  {name: '自拍：太远', sub: 'selfie', f: {...SELFIE, face_w: 0.15}, expect: ['Y-near']},
  {name: '自拍：脸偏右', sub: 'selfie', f: {...SELFIE, face_x: 0.65}, expect: ['Y-pos']},
  {name: '人像：逆光', sub: 'half', f: {...PERSON, full: false, eye_y: 0.33, face_dark: true}, expect: ['P-backlight']},
  {name: '人像：姿势差', sub: 'full', f: {...PERSON, pose_on: true, pose_score: 55, pose_hint: '画面右侧的手抬高一点', pose_short: '右侧手抬高', pose_pt: [200, 200]}, expect: ['P-pose']},
  {name: '人像：姿势到位', sub: 'full', f: {...PERSON, pose_on: true, pose_score: 88}, expect: ['P-poseok']},
  {name: '人像：偏暗', sub: 'sit', f: {...PERSON, mean: 40}, expect: ['P-dark']},
  {name: '人像：过曝', sub: 'sit', f: {...PERSON, hi: 0.2}, expect: ['P-bright']},
];

const SUBS = ['vista', 'city', 'sunset', 'night', 'macro', 'full', 'half', 'travel', 'sit', 'selfie'];
let fails = 0;
const hit = new Set();
for(const c of CASES){
  const f = {...BASE, ...c.f};
  const res = runRules(lib, f, {sub: c.sub, tipIndex: 0});
  const ids = res.rules.map(r => r.id);
  ids.forEach(id => hit.add(id));
  const missing = c.expect.filter(id => !ids.includes(id));
  const extra = c.absentAll ? ids : [];
  const bad = res.rules.filter(r => !r.title || /undefined|NaN|\{|\}/.test(r.title + r.sub + (r.draw && r.draw.label || '')));
  const ok = !missing.length && !extra.length && !bad.length && !res.errors.length;
  if(!ok) fails++;
  console.log(`${ok ? '通过' : '失败'}  ${c.name.padEnd(14, '　')}  命中：${ids.join(', ') || '无'}${missing.length ? '  缺少：' + missing.join(',') : ''}${extra.length ? '  不该命中：' + extra.join(',') : ''}${bad.length ? '  文案异常：' + bad.map(r => r.id).join(',') : ''}${res.errors.length ? '  出错：' + res.errors.join('；') : ''}`);
}
// 覆盖率：每条检测规则至少被一个用例触发
const detect = lib.rules.filter(r => r.kind === 'detect').map(r => r.id);
const uncovered = detect.filter(id => !hit.has(id));
if(uncovered.length){ fails++; console.log('未被任何用例覆盖的规则：' + uncovered.join(', ')); }
// 每个场景都有技巧可轮播
for(const sub of SUBS){
  const res = runRules(lib, {...BASE}, {sub, tipIndex: 1});
  if(!res.tip){ fails++; console.log(`场景 ${sub} 没有可用的技巧`); }
}
const tips = lib.rules.filter(r => r.kind === 'tip').length;
console.log(`\n规则库 v${lib.version}：检测规则 ${detect.length} 条，场景技巧 ${tips} 条；用例 ${CASES.length} 个，覆盖 ${detect.length - uncovered.length}/${detect.length} 条检测规则。`);
console.log(fails ? `有 ${fails} 项未通过` : '全部通过');
process.exit(fails ? 1 : 0);

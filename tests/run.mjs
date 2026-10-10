// 规则库自动验证（发布网站前自动运行，失败则不发布）
// 1. 主库：为每条规则自动构造满足条件的信号，验证能触发、文案正常、叠加图形类型已定义
// 2. 补充规则（SS-）：手写用例
// 3. 统计：网页版能实时运行的规则数、尚未开放的场景
import {readFileSync} from 'node:fs';
import {compileRules, runRules, runPost, runnable, SUB_SCENES} from '../engine.js';

const json = JSON.parse(readFileSync(new URL('../rules.json', import.meta.url), 'utf8'));
const lib = compileRules(json);
let fails = 0;
const fail = msg => { fails++; console.log('失败  ' + msg); };
const badText = r => !r.title || /undefined|NaN|\{|\}/.test(r.title + r.sub + (r.draw && r.draw.label || ''));

// ---------- 1. 主库自动用例 ----------
function satisfy([sig, op, v]){
  switch(op){
    case '>=': case '<=': case '==': return v;
    case '>': return typeof v === 'number' ? v + 0.01 : v;
    case '<': return typeof v === 'number' ? v - 0.01 : v;
    case '!=': return typeof v === 'boolean' ? !v : typeof v === 'number' ? v + 1 : '__other__';
    case 'in': return v[0];
    case 'in_range_any': return v[0][0];
  }
}
const main = json.rules.filter(r => typeof r.when === 'object');
const knownOverlays = new Set(Object.keys(json.overlays || {}));
let mainOk = 0;
for(const raw of main){
  const env = {};
  for(const c of raw.when.all || []) env[c[0]] = satisfy(c);
  if(raw.when.any && raw.when.any.length){ const c = raw.when.any[0]; env[c[0]] = satisfy(c); }
  const scenes = raw.scenes.includes('*') ? ['landscape'] : raw.scenes;
  const res = runRules(lib, env, {sub: 'vista', scenes});
  const hit = res.rules.find(r => r.id === raw.id);
  if(raw.overlay && !knownOverlays.has(raw.overlay.type)) fail(`${raw.id} 使用了未定义的叠加图形 ${raw.overlay.type}`);
  if(raw.tip === null){ mainOk++; continue; }            // 豁免规则：只用于抑制其他规则
  if(!hit && !res.suppressed.includes(raw.id)) { fail(`${raw.id} 条件满足时没有触发（${JSON.stringify(env)}）`); continue; }
  if(hit && badText(hit)) { fail(`${raw.id} 文案异常：${hit.title} / ${hit.sub}`); continue; }
  if(res.errors.length) { fail(`${raw.id} 执行出错：${res.errors.join('；')}`); continue; }
  mainOk++;
}
console.log(`主库：${mainOk}/${main.length} 条规则自动用例通过`);

// 条件不满足时不能触发（抽查：每条规则把第一个 all 条件取反）
let negOk = 0, negN = 0;
for(const raw of main){
  const all = raw.when.all || []; if(!all.length || raw.tip === null) continue;
  const env = {};
  for(const c of all) env[c[0]] = satisfy(c);
  if(raw.when.any && raw.when.any.length){ const c = raw.when.any[0]; env[c[0]] = satisfy(c); }
  const [sig, op, v] = all[0];
  const flip = {'>=': typeof v === 'number' ? v - 1 : null, '>': typeof v === 'number' ? v - 1 : null, '<': typeof v === 'number' ? v + 1 : null, '<=': typeof v === 'number' ? v + 1 : null, '==': typeof v === 'boolean' ? !v : typeof v === 'number' ? v + 1 : '__other__', '!=': v, 'in': '__other__', 'in_range_any': 999}[op];
  if(flip === null) continue;
  env[sig] = flip; negN++;
  const scenes = raw.scenes.includes('*') ? ['landscape'] : raw.scenes;
  const res = runRules(lib, env, {sub: 'vista', scenes});
  if(res.rules.some(r => r.id === raw.id)) fail(`${raw.id} 条件不满足（${sig}=${flip}）时却触发了`); else negOk++;
}
console.log(`主库：${negOk}/${negN} 条规则反向用例通过（条件不满足时不触发）`);

// ---------- 2. 补充规则用例 ----------
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
  {name: '风景：一切正常', sub: 'vista', f: {}, expect: [], none: true},
  {name: '半身：手机歪 4°', sub: 'half', f: {...PERSON, tilt: 4, tilt_abs: 4}, expect: ['SS-level']},
  {name: '建筑：无地平线时手机歪', sub: 'city', f: {has_hz: false, tilt: -3, tilt_abs: 3}, expect: ['SS-level']},
  {name: '风景：前景空', sub: 'vista', f: {low_edge: 0.01, low_sd: 5}, expect: ['SS-fore']},
  {name: '建筑：楼顶被切', sub: 'city', f: {top_edge: 0.3, vdens: 0.08}, expect: ['SS-top']},
  {name: '日落：天空过曝', sub: 'sunset', f: {hi: 0.08}, expect: ['SS-sunexp']},
  {name: '日落：天空太少', sub: 'sunset', f: {hz_y: 0.45}, expect: ['SS-sunhz']},
  {name: '日落：太阳居中', sub: 'sunset', f: {sun_mean: 250, sun_x: 0.5, sun_y: 0.45, sun_tx: 1/3, sun_ty: 1/3}, expect: ['SS-sunpos']},
  {name: '夜景：很暗', sub: 'night', f: {mean: 25}, expect: ['SS-nightmerge']},
  {name: '风景：过曝', sub: 'vista', f: {hi: 0.2}, expect: ['SS-bright']},
  {name: '人像：没有人', sub: 'full', f: {}, expect: ['SS-noperson']},
  {name: '全身：人偏离三分线', sub: 'full', f: {...PERSON, p_cx: 0.44, pos_t: 1/3, pos_d: -0.107}, expect: ['SS-pos']},
  {name: '全身：头顶切到', sub: 'full', f: {...PERSON, head_top: 0.01}, expect: ['SS-headcut']},
  {name: '全身：头顶空太多', sub: 'full', f: {...PERSON, head_top: 0.25, ankle_y: 0.85}, expect: ['SS-headroom-full']},
  {name: '半身：头顶空太多', sub: 'half', f: {...PERSON, full: false, head_top: 0.3}, expect: ['SS-headroom-half']},
  {name: '全身：脚离底边远', sub: 'full', f: {...PERSON, ankle_y: 0.8}, expect: ['SS-legs']},
  {name: '打卡：人太大', sub: 'travel', f: {...PERSON, height_ratio: 0.8}, expect: ['SS-toobig']},
  {name: '打卡：地平线穿脖子', sub: 'travel', f: {...PERSON, height_ratio: 0.3, hz_y: 0.25, neck_y: 0.24}, expect: ['SS-neck']},
  {name: '坐姿：俯拍', sub: 'sit', f: {...PERSON, eye_y: 0.6}, expect: ['SS-sitlevel']},
  {name: '坐姿：膝盖对镜头', sub: 'sit', f: {...PERSON, thigh_short: true}, expect: ['SS-knees']},
  {name: '自拍：太近', sub: 'selfie', f: {...SELFIE, face_w: 0.7}, expect: ['SS-far']},
  {name: '自拍：太远', sub: 'selfie', f: {...SELFIE, face_w: 0.15}, expect: ['SS-near']},
  {name: '自拍：脸偏右', sub: 'selfie', f: {...SELFIE, face_x: 0.65}, expect: ['SS-facepos']},
  {name: '人像：姿势差', sub: 'full', f: {...PERSON, pose_on: true, pose_score: 55, pose_hint: '画面右侧的手抬高一点', pose_short: '右侧手抬高', pose_pt: [200, 200]}, expect: ['SS-pose']},
  {name: '人像：姿势到位', sub: 'full', f: {...PERSON, pose_on: true, pose_score: 88}, expect: ['SS-poseok']},
];
const ssHit = new Set();
for(const c of CASES){
  const res = runRules(lib, {...BASE, ...c.f}, {sub: c.sub});
  const ids = res.rules.map(r => r.id); ids.forEach(id => ssHit.add(id));
  const missing = c.expect.filter(id => !ids.includes(id)), extra = c.none ? ids : [], bad = res.rules.filter(badText);
  if(missing.length || extra.length || bad.length || res.errors.length) fail(`${c.name}：命中 ${ids.join(',') || '无'}${missing.length ? ' 缺少 ' + missing : ''}${extra.length ? ' 不该命中 ' + extra : ''}${bad.length ? ' 文案异常 ' + bad.map(r => r.id) : ''}${res.errors.length ? ' 出错 ' + res.errors : ''}`);
}
const ss = json.rules.filter(r => r.id.startsWith('SS-')).map(r => r.id);
const ssMiss = ss.filter(id => !ssHit.has(id));
if(ssMiss.length) fail('补充规则未被用例覆盖：' + ssMiss.join(', '));
console.log(`补充规则：${CASES.length} 个用例，覆盖 ${ss.length - ssMiss.length}/${ss.length} 条`);

// ---------- 3. 技巧、拍后建议、统计 ----------
for(const sub of Object.keys(SUB_SCENES)){ if(!runRules(lib, {...BASE}, {sub, tipIndex: 1}).tip) fail(`场景 ${sub} 没有可轮播的技巧`); }
const post = runPost(lib, {after_capture: true, mean_luma: 0.2, highlight_clip_ratio: 0.01});
if(!post.some(p => p.id === 'POST-001') || !post.some(p => p.id === 'POST-006')) fail('拍后建议没有按条件触发');
const compiledMain = lib.rules.filter(r => !r.subs);
const runN = compiledMain.filter(runnable).length;
const appScenes = new Set(Object.values(SUB_SCENES).flat());
const closed = [...new Set(json.rules.flatMap(r => r.scenes || []))].filter(s => s !== '*' && !appScenes.has(s));
console.log(`规则库 v${json.version}（补充 ${json.app_extensions_version}）：主库 ${main.length} 条，其中网页版可实时运行 ${runN} 条；补充规则 ${ss.length} 条；技巧 ${lib.tips.length} 条；拍后建议 ${lib.post.length} 条`);
console.log(`尚未开放的场景（相关规则暂不触发）：${closed.join('、')}`);
console.log(fails ? `\n有 ${fails} 项未通过` : '\n全部通过');
process.exit(fails ? 1 : 0);

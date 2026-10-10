// 随手大师规则引擎 v2
// 读取 rules.json（主库：信号 + all/any 条件；补充规则：表达式条件），输入画面信号 env，输出命中的规则。
// 不依赖浏览器，可在 Node 里直接测试（tests/run.mjs）。

const HELPERS = { abs: Math.abs, min: Math.min, max: Math.max, round: Math.round };
const CONF_RANK = { high: 0, medium: 1, low: 2 };
export const PENALTY = { 1: 15, 2: 12, 3: 10, 4: 5, 5: 0, 6: 0 };

// 随手大师细分场景 → 规则库场景分类
export const SUB_SCENES = {
  vista: ['landscape', 'water'], city: ['building', 'street', 'interior'], sunset: ['landscape', 'water'], night: ['night', 'street'], macro: ['plant_flower', 'macro'],
  full: ['portrait', 'street'], half: ['portrait'], travel: ['portrait', 'landscape'], sit: ['portrait'], selfie: ['selfie'],
};

// 网页版当前能实时算出的信号（其余信号缺失时，依赖它们的规则自动跳过）
export const APP_SIGNALS = [
  'scene', 'mean_luma', 'highlight_clip_ratio', 'shadow_clip_ratio', 'bright_area_ratio', 'dark_area_ratio', 'color_cast_score', 'colorfulness_chaos',
  'horizon_detected', 'horizon_tilt_abs_deg', 'horizon_y_ratio', 'sky_texture', 'sky_ratio',
  'subject_detected', 'subject_area_ratio', 'subject_dist_to_center', 'subject_bottom_y', 'subject_touches_edges', 'subject_luma_vs_bg', 'subject_bg_color_similarity', 'subject_class', 'subject_mean_luma',
  'background_clutter', 'plain_bg_ratio', 'symmetry_score', 'symmetry_axis_offset_abs', 'diagonal_line_score', 'dominant_line_angle_deg', 'frame_border_score',
  'vertical_convergence', 'device_pitch_deg', 'device_shake', 'device_stable_s', 'exposure_time_s', 'digital_zoom_x', 'focal_equiv_mm', 'subject_motion', 'subject_idle_s',
  'face_count', 'person_count', 'persons_are_subject', 'face_area_ratio', 'eyes_y', 'face_yaw_abs_deg', 'shoulders_square', 'face_highlight_clip', 'face_hard_shadow', 'face_modeling', 'face_dappled_light', 'skin_cast', 'hair_bg_contrast',
  'camera_below_face', 'camera_vs_eye_deg', 'camera_above_subject_deg', 'limb_cut_at_joint', 'head_merge_object', 'facing_space_ratio', 'bg_bright_distractor',
  'light_direction', 'sun_in_frame', 'time_phase', 'weather_overcast', 'lens_obstruction', 'single_side_light', 'after_capture',
];

function expr(src, where){
  try {
    // 规则库由项目维护，不来自用户输入；with 让条件直接写信号名
    // eslint-disable-next-line no-new-func
    return new Function('f', `with(f){ return (${src}); }`);
  } catch(e){ throw new Error(`${where} 表达式无法解析：${src}（${e.message}）`); }
}
function template(src, where){
  if(typeof src !== 'string') return () => '';
  const parts = []; let last = 0;
  src.replace(/\{([^{}]+)\}/g, (m, body, i) => { parts.push(src.slice(last, i)); parts.push(expr(body, where)); last = i + m.length; return m; });
  parts.push(src.slice(last));
  return f => parts.map(p => typeof p === 'function' ? fmt(p(f)) : p).join('');
}
function fmt(v){ return typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v ?? ''); }

const OPS = {
  '>=': (a, b) => a >= b, '>': (a, b) => a > b, '<': (a, b) => a < b, '<=': (a, b) => a <= b,
  '==': (a, b) => a === b, '!=': (a, b) => a !== b,
  'in': (a, b) => Array.isArray(b) && b.includes(a),
  'in_range_any': (a, b) => Array.isArray(b) && b.some(([lo, hi]) => a >= lo && a <= hi),
};
// 结构化条件：返回 true / false / null（null = 缺少信号，无法判断）
function compileCond(when, where){
  const signals = new Set();
  const conds = k => (when[k] || []).map(c => {
    if(!Array.isArray(c) || c.length !== 3) throw new Error(`${where} 条件格式不对：${JSON.stringify(c)}`);
    const [sig, op, val] = c;
    if(!OPS[op]) throw new Error(`${where} 不支持的比较符：${op}`);
    signals.add(sig);
    return env => { const v = env[sig]; return v === undefined || v === null ? null : OPS[op](v, val); };
  });
  const all = conds('all'), any = conds('any');
  const fn = env => {
    let unknown = false;
    for(const c of all){ const r = c(env); if(r === false) return false; if(r === null) unknown = true; }
    if(any.length){
      let hit = false, anyUnknown = false;
      for(const c of any){ const r = c(env); if(r === true){ hit = true; break; } if(r === null) anyUnknown = true; }
      if(!hit){ if(anyUnknown) unknown = true; else return false; }
    }
    return unknown ? null : true;
  };
  return {fn, signals: [...signals]};
}

function compileRule(r, i, kindDefault){
  const where = `规则 ${r.id || '#' + i}`;
  if(!r.id) throw new Error(`${where} 缺少 id`);
  if(!r.scenes && !r.subs) throw new Error(`${where} 缺少 scenes 或 subs`);
  let when, signals = [];
  if(typeof r.when === 'string' || r.when == null){ const f = expr(r.when || 'true', where); when = env => { try { return !!f(env); } catch(e){ return null; } }; }
  else { const c = compileCond(r.when, where); when = c.fn; signals = c.signals; }
  const draw = r.draw ? Object.fromEntries(Object.entries(r.draw).map(([k, v]) => [k, (k === 'type' || k === 'color') ? (() => v) : k === 'label' ? template(v, where) : expr(String(v), where)])) : null;
  return {
    id: r.id, kind: r.kind || kindDefault, category: r.category || '', scenes: r.scenes || null, subs: r.subs || null,
    priority: r.priority ?? 4, confidence: r.confidence || 'medium', detectability: r.detectability || 'realtime',
    when, signals, tip: template(r.tip ?? r.text ?? '', where), problem: template(r.problem ?? r.title ?? '', where),
    overlay: r.overlay || null, draw, drawWhen: r.drawWhen ? expr(r.drawWhen, where) : () => true,
    picto: r.picto ? (/^[A-Za-z]+$/.test(r.picto) ? (() => r.picto) : expr(r.picto, where)) : null,
    flip: r.flip ? expr(r.flip, where) : () => false,
    suppresses: r.suppresses || [], source: r.source || '', note: r.note || '', principle: r.principle || '',
    silent: r.tip === null,
  };
}

export function compileRules(json){
  if(!json || !Array.isArray(json.rules)) throw new Error('规则库格式不对：缺少 rules 数组');
  const ids = new Set();
  const check = r => { if(ids.has(r.id)) throw new Error(`规则 ${r.id} 的 id 重复`); ids.add(r.id); return r; };
  const rules = json.rules.map((r, i) => check(compileRule(r, i, 'detect')));
  const tips = (json.tips || []).map((r, i) => check(compileRule(r, i, 'tip')));
  const post = (json.post_rules || []).map((r, i) => {
    const c = compileCond(r.when, `拍后建议 ${r.id}`);
    return {id: r.id, when: c.fn, signals: c.signals, problem: r.problem, action: r.action, source: r.source || ''};
  });
  return {version: json.version || '?', ext: json.app_extensions_version || '', policy: json.display_policy || {}, rules, tips, post, signals: json.signals || {}, overlays: json.overlays || {}};
}

function inScene(rule, ctx){
  if(rule.subs) return rule.subs.includes(ctx.sub);
  return rule.scenes.includes('*') || rule.scenes.some(s => ctx.scenes.includes(s));
}
function evalParams(params, env){
  if(!params) return {};
  const out = {};
  for(const [k, v] of Object.entries(params)){
    if(typeof v === 'string' && /[<>=?]/.test(v)){ try { out[k] = expr(v, 'overlay')(env); } catch(e){ out[k] = v; } }
    else out[k] = v;
  }
  return out;
}
function materialize(rule, env){
  let draw = null;
  if(rule.draw && rule.drawWhen(env)){ draw = {}; for(const k in rule.draw) draw[k] = rule.draw[k](env); }
  const overlay = rule.overlay ? {type: rule.overlay.type, params: evalParams(rule.overlay.params, env)} : null;
  return {
    id: rule.id, kind: rule.kind, category: rule.category, priority: rule.priority, confidence: rule.confidence, pen: PENALTY[rule.priority] ?? 0,
    title: rule.tip(env), sub: rule.problem(env), draw, overlay, picto: rule.picto ? rule.picto(env) : null, flip: !!rule.flip(env),
    suppresses: rule.suppresses, source: rule.source, note: rule.note, principle: rule.principle, silent: rule.silent,
  };
}

// env：画面信号；ctx：{sub, scenes, tipIndex}
export function runRules(lib, signals, ctx){
  const env = Object.assign(Object.create(null), HELPERS, signals, {sub: ctx.sub});
  const scenes = ctx.scenes || SUB_SCENES[ctx.sub] || [];
  const c2 = {sub: ctx.sub, scenes};
  const hits = [], unknown = [], errors = [];
  for(const rule of lib.rules){
    if(!inScene(rule, c2)) continue;
    let r;
    try { r = rule.when(env); } catch(e){ errors.push(`${rule.id}: ${e.message}`); continue; }
    if(r === true){ try { hits.push(materialize(rule, env)); } catch(e){ errors.push(`${rule.id}: ${e.message}`); } }
    else if(r === null) unknown.push(rule.id);
  }
  const suppressed = new Set(hits.flatMap(h => h.suppresses));
  const fired = hits.filter(h => !suppressed.has(h.id) && !h.silent);
  fired.sort((a, b) => a.priority - b.priority || (CONF_RANK[a.confidence] ?? 1) - (CONF_RANK[b.confidence] ?? 1));
  const score = Math.max(30, 100 - fired.reduce((s, r) => s + r.pen, 0));
  const okTips = lib.tips.filter(t => inScene(t, c2) && t.when(env) !== false);
  const tip = okTips.length ? materialize(okTips[(ctx.tipIndex || 0) % okTips.length], env) : null;
  return {rules: fired, score, tip, unknown, suppressed: [...suppressed].filter(id => hits.some(h => h.id === id)), errors};
}

export function runPost(lib, signals){
  const env = Object.assign(Object.create(null), signals);
  return lib.post.filter(p => p.when(env) === true).map(p => ({id: p.id, problem: p.problem, action: p.action, source: p.source}));
}

// 规则是否能在网页版实时运行（所需信号都已实现）
export function runnable(rule){ return rule.signals.every(s => APP_SIGNALS.includes(s)); }

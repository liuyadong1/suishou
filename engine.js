// 随手大师规则引擎：把 rules.json 编译成可执行规则，输入画面特征 f，输出要显示的提示。
// 不依赖浏览器，可在 Node 里直接测试（tests/run.mjs）。

const HELPERS = { abs: Math.abs, min: Math.min, max: Math.max, round: Math.round };
const LITERAL_KEYS = new Set(['type', 'label', 'color']);

function expr(src, where){
  try {
    // 规则库由项目维护，不来自用户输入；with 让条件直接写特征名
    // eslint-disable-next-line no-new-func
    return new Function('f', `with(f){ return (${src}); }`);
  } catch(e){
    throw new Error(`${where} 表达式无法解析：${src}（${e.message}）`);
  }
}
function template(src, where){
  if(typeof src !== 'string') return () => '';
  const parts = [];
  let last = 0;
  src.replace(/\{([^{}]+)\}/g, (m, body, i) => { parts.push(src.slice(last, i)); parts.push(expr(body, where)); last = i + m.length; return m; });
  parts.push(src.slice(last));
  return f => parts.map(p => typeof p === 'function' ? fmt(p(f)) : p).join('');
}
function fmt(v){ return typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v ?? ''); }

export function compileRules(json){
  if(!json || !Array.isArray(json.rules)) throw new Error('规则库格式不对：缺少 rules 数组');
  const ids = new Set();
  const rules = json.rules.map((r, i) => {
    const where = `规则 ${r.id || '#' + i}`;
    if(!r.id) throw new Error(`${where} 缺少 id`);
    if(ids.has(r.id)) throw new Error(`${where} 的 id 重复`);
    ids.add(r.id);
    if(!r.subs) throw new Error(`${where} 缺少 subs`);
    const draw = r.draw ? Object.fromEntries(Object.entries(r.draw).map(([k, v]) => [k, LITERAL_KEYS.has(k) ? (k === 'label' ? template(v, where) : () => v) : expr(String(v), where)])) : null;
    return {
      id: r.id, kind: r.kind || 'detect', subs: r.subs, pri: r.pri ?? 5,
      when: expr(r.when || 'true', where),
      pen: typeof r.pen === 'number' || r.pen == null ? (() => r.pen || 0) : expr(r.pen, where),
      title: template(r.title, where), text: template(r.text, where),
      picto: /^[A-Za-z]+$/.test(r.picto || 'idea') ? (() => r.picto || 'idea') : expr(r.picto, where),
      flip: r.flip ? expr(r.flip, where) : () => false,
      draw, drawWhen: r.drawWhen ? expr(r.drawWhen, where) : () => true,
      principle: r.principle || '', source: r.source || '',
    };
  });
  return {version: json.version || '?', name: json.name || '', rules};
}

function appliesTo(rule, sub){ return rule.subs === '*' || (Array.isArray(rule.subs) && rule.subs.includes(sub)); }
function materialize(rule, f){
  let draw = null;
  if(rule.draw && rule.drawWhen(f)){ draw = {}; for(const k in rule.draw) draw[k] = rule.draw[k](f); }
  return {
    id: rule.id, kind: rule.kind, pri: rule.pri, pen: Math.max(0, Math.round(rule.pen(f) || 0)),
    title: rule.title(f), sub: rule.text(f), picto: rule.picto(f), flip: !!rule.flip(f), draw,
    principle: rule.principle, source: rule.source,
  };
}

// f：画面特征；ctx：{sub, tipIndex}
export function runRules(lib, f, ctx){
  const env = Object.assign(Object.create(null), HELPERS, f, {sub: ctx.sub});
  const fired = [], errors = [];
  for(const rule of lib.rules){
    if(rule.kind !== 'detect' || !appliesTo(rule, ctx.sub)) continue;
    try { if(rule.when(env)) fired.push(materialize(rule, env)); }
    catch(e){ errors.push(`${rule.id}: ${e.message}`); }
  }
  fired.sort((a, b) => a.pri - b.pri);
  const score = Math.max(30, 100 - fired.reduce((s, r) => s + r.pen, 0));
  let tip = null;
  const tips = lib.rules.filter(r => r.kind === 'tip' && appliesTo(r, ctx.sub));
  const okTips = tips.filter(r => { try { return r.when(env); } catch(e){ return false; } });
  if(okTips.length){ tip = materialize(okTips[(ctx.tipIndex || 0) % okTips.length], env); }
  return {rules: fired, score, tip, errors};
}

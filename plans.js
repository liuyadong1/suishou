// 两段式第一段「找机位」：每个细分场景的机位方案。
// 用户在底部点选一个方案 → 取景画面出现参考线（guide）→ 按 check / need 提示离这个机位还差多少 → 稳住 1 秒自动锁定，进入第二段。
//   how    ：一句话说清楚站哪、手机多高、朝哪
//   picto  ：提示卡小图（index.html 里 PIC 的名字）
//   guide  ：画面参考线类型（index.html drawPlanGuide）
//   check  ：(F, s) => null（不检查）| {ok:true} | {ok:false, tip}；F 是画面特征，s 是信号
//   need   ：这些规则命中时说明还没到位，直接用规则的提示
//   suppress：选了这个方案后，和它冲突的规则不再提示

const near3 = y => Math.min(Math.abs(y - 1/3), Math.abs(y - 2/3));

const horizonThirds = F => {
  if(!F.horizon) return {ok: false, tip: '找到天和地的分界线，让它横穿画面'};
  const y = F.horizon.y;
  if(near3(y) < 0.07) return {ok: true};
  return {ok: false, tip: y > 0.5 ? '地平线往下压到下三分线：手机往上仰一点' : y < 0.2 ? '地平线太靠上了：手机往下压一点' : '地平线在正中间：手机往上仰或往下压一点'};
};

export const PLANS = {
  vista: [
    {id: 'hz3', name: '三分地平线', picto: 'pitchUp', guide: 'hz3', how: '天空好看就把地平线放到下三分线，地面好看就放到上三分线', check: horizonThirds},
    {id: 'fore', name: '前景引导', picto: 'fore', guide: 'fore', how: '蹲低，把石头、花草或栏杆放进画面下方', check: F => F.lowEdge < 0.02 && F.lowSd < 8 ? {ok: false, tip: '画面下方太空：蹲低一点，找块石头或一丛花草'} : {ok: true}, suppress: ['SS-fore']},
    {id: 'line', name: '引导线', picto: 'diagonal', guide: 'diag', how: '站在路、河岸或栈道上，让线条从画面下角伸向远方', check: F => F.diagRatio >= 0.25 ? {ok: true} : {ok: false, tip: '找一条路或河岸，让它斜着从下角伸进画面'}},
    {id: 'frame', name: '框景', picto: 'frame', guide: 'frame', how: '透过树枝、门洞或窗户拍，给风景加一个画框', check: F => F.frameScore >= 0.3 ? {ok: true} : {ok: false, tip: '往后退到树枝或门洞后面，让它围住画面四周'}},
  ],
  city: [
    {id: 'axis', name: '正面对称', picto: 'sym', guide: 'axis', how: '站到建筑的中轴线上，手机端平正对它', suppress: ['COMP-009'],
      check: F => F.symScore >= 0.6 && Math.abs(F.symShift) < 0.05 ? {ok: true} : F.symScore >= 0.35 ? {ok: false, tip: F.symShift > 0 ? '向右平移一步，对准中轴线' : '向左平移一步，对准中轴线'} : {ok: false, tip: '正对建筑，站到它的正中间'}},
    {id: 'up', name: '低角度仰拍', picto: 'keystone', guide: 'up', how: '走近建筑，手机放低往上拍，楼会显得更高大', suppress: ['ARC-001', 'ARC-003', 'SS-top'],
      check: F => F.keystone >= 3 ? {ok: true} : {ok: false, tip: '再走近一点，手机放低、往上仰'}},
    {id: 'corner', name: '斜侧 45°', picto: 'turn', guide: 'corner', how: '走到建筑的一角，同时拍到两个面，更有立体感', suppress: ['COMP-009', 'ARC-002']},
    {id: 'street', name: '街巷纵深', picto: 'diagonal', guide: 'vanish', how: '古街、巷子：站在路中间，手机放胸口高度，让两边屋檐和路面汇向远处',
      check: F => F.diagRatio >= 0.22 ? {ok: true} : {ok: false, tip: '站到街道正中，镜头对准街道尽头'}},
    {id: 'gate', name: '门洞框景', picto: 'frame', guide: 'frame', how: '退到门洞、牌坊或窗户后面，用它把建筑框起来', check: F => F.frameScore >= 0.3 ? {ok: true} : {ok: false, tip: '再往后退，让门洞的边框围住画面'}},
  ],
  sunset: [
    {id: 'sky', name: '天空为主', picto: 'pitchUp', guide: 'hzLow', how: '地平线压到下三分线，让彩霞占画面三分之二',
      check: F => !F.horizon ? null : Math.abs(F.horizon.y - 2/3) < 0.08 ? {ok: true} : {ok: false, tip: F.horizon.y < 2/3 ? '手机往上仰，多拍点天空' : '手机往下压一点，地平线放到下三分线'}},
    {id: 'silhouette', name: '剪影', picto: 'silhouette', guide: 'hzLow', how: '让人或树挡在亮的天空前面，点一下天空把亮度降下来'},
    {id: 'sun', name: '太阳放三分点', picto: 'sunpos', guide: 'pts', how: '移动手机，让太阳落在三分线的交点上', need: ['SS-sunpos']},
  ],
  night: [
    {id: 'steady', name: '稳住拍', picto: 'shake', guide: 'none', how: '靠住栏杆或墙，开夜景合成，按下后别动'},
    {id: 'reflect', name: '水面倒影', picto: 'sym', guide: 'hmid', how: '找水面或湿地面，让灯光和倒影上下对称'},
  ],
  macro: [
    {id: 'blur', name: '背景虚化', picto: 'closer', guide: 'blur', how: '靠近到半米内，背景选远处、颜色深的地方',
      check: F => F.centerSharp > F.borderSharp*1.8 ? {ok: true} : {ok: false, tip: '再靠近花一点，让背景虚掉'}},
    {id: 'level', name: '平视低角度', picto: 'sitlevel', guide: 'third', how: '蹲到和花一样高，从侧面平视，花放在三分点'},
    {id: 'top', name: '正上方俯拍', picto: 'focus', guide: 'top', how: '手机举到花的正上方，花心放在画面中间'},
    {id: 'back', name: '逆光透亮', picto: 'backlight', guide: 'none', how: '绕到花的对面，让阳光从花瓣后面透过来'},
  ],
  full: [
    {id: 'tall', name: '显高机位', picto: 'legs', guide: 'feet', how: '手机放到腰部高度略往下，人的脚踩在画面底边', need: ['SS-legs', 'SS-headcut']},
    {id: 'third', name: '人景三分', picto: 'pose', guide: 'person', how: '人站在画面左或右三分线上，另一边留给风景', need: ['SS-pos']},
    {id: 'walk', name: '走动抓拍', picto: 'pose', guide: 'none', how: '让 ta 慢慢走向你，自然摆臂，细节到位会自动连拍'},
  ],
  half: [
    {id: 'eye', name: '平视构图', picto: 'eyes', guide: 'eye', how: '手机和眼睛一样高，眼睛放在上三分线', need: ['SS-headcut', 'SS-headroom-half', 'POR-015']},
    {id: 'side', name: '侧光立体', picto: 'backlight', guide: 'none', how: '让 ta 侧对窗户或亮处，脸一半亮、一半稍暗'},
    {id: 'clean', name: '干净背景', picto: 'clutter', guide: 'none', how: '让人离背景远一点，你靠近人，背景选墙面、天空或树丛', need: ['POR-003']},
  ],
  travel: [
    {id: 'small', name: '人小景大', picto: 'toobig', guide: 'person', how: '人站在三分线上，只占画面高度的三分之一左右', need: ['SS-toobig', 'SS-pos']},
    {id: 'back', name: '背影看风景', picto: 'pose', guide: 'person', how: '让 ta 背对你望向远处，人放在三分线上'},
    {id: 'near', name: '近人远景', picto: 'legs', guide: 'feet', how: '人站近一点，身后是远处的地标，手机放到腰部', need: ['SS-neck']},
  ],
  sit: [
    {id: 'level', name: '平视坐姿', picto: 'sitlevel', guide: 'eye', how: '蹲下来，和坐着的人眼睛一样高', need: ['SS-sitlevel']},
    {id: 'legs', name: '斜侧伸腿', picto: 'knees', guide: 'none', how: '身体斜对镜头，腿斜着伸出去，显得腿长', need: ['SS-knees']},
  ],
  selfie: [
    {id: 'high', name: '举高 45°', picto: 'selfieAngle', guide: 'none', how: '手机举高一点往下拍，下巴微收', need: ['POR-005']},
    {id: 'face', name: '脸放三分线', picto: 'oval', guide: 'eye', how: '手机拿到一臂远，眼睛放在上三分线', need: ['SS-facepos', 'SS-far', 'SS-near']},
    {id: 'window', name: '窗边侧光', picto: 'backlight', guide: 'none', how: '侧对窗户站，让光从一边照过来'},
  ],
};

export const GUIDES = ['hz3', 'hzLow', 'fore', 'diag', 'frame', 'axis', 'up', 'corner', 'vanish', 'pts', 'hmid', 'blur', 'third', 'top', 'feet', 'person', 'eye', 'none'];

// 按画面特征推荐一个方案（没有把握时用第一个）
export function recommendPlan(sub, F){
  const list = PLANS[sub] || []; if(!list.length) return null;
  const pick = id => list.find(p => p.id === id) ? id : list[0].id;
  if(sub === 'vista') return pick(F.frameScore >= 0.3 ? 'frame' : F.diagRatio >= 0.3 ? 'line' : F.horizon ? 'hz3' : 'fore');
  if(sub === 'city') return pick(F.frameScore >= 0.3 ? 'gate' : F.symScore >= 0.5 ? 'axis' : F.diagRatio >= 0.3 ? 'street' : F.keystone >= 3 ? 'up' : 'axis');
  return list[0].id;
}

// 当前方案的状态：{ok, tip, rule}
export function planStatus(plan, F, s, rules){
  if(!plan) return null;
  const hit = (plan.need || []).map(id => rules.find(r => r.id === id)).find(Boolean);
  if(hit) return {ok: false, rule: hit};
  const c = plan.check ? plan.check(F, s || {}) : null;
  if(c && !c.ok) return {ok: false, tip: c.tip};
  return {ok: true, checked: !!c || !!(plan.need && plan.need.length)};
}

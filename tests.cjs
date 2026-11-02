// Rule tests for the treatment-ladder engine embedded in index.html (/*ENGINE-START*/ … /*ENGINE-END*/).
// Run: node tests.cjs
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const src = html.slice(html.indexOf('/*ENGINE-START*/'), html.indexOf('/*ENGINE-END*/'));
const m = { exports: {} };
new Function('module', src)(m);
const LX = m.exports;

let pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL:', name); } }
const ctl = (day, night, rel, act) => ({ day, night, rel, act });
const ok = { adh: true, tech: true, risk: true, comorb: true, dx: true };
const base = (o) => Object.assign({ age: 'adult', track: 't2a', step: 3, c1: 'icsform', ctl: ctl(false, false, false, false), exac: 0, fev1: '', stable: 0, checks: ok, riskN: 0 }, o);

/* --- Table 2A control --- */
t('control well', LX.control(ctl(0, 0, 0, 0), 't2').level === 'well');
t('control partly 2/4', LX.control(ctl(1, 1, 0, 0), 't2').level === 'partly');
t('control un 3/4', LX.control(ctl(1, 1, 1, 0), 't2').level === 'un');
t('Track 1 ignores SABA question', LX.control(ctl(1, 1, 1, 0), 't1').n === 2 && LX.control(ctl(1, 1, 1, 0), 't1').of === 3);

/* --- Table 3 initial (≥12) --- */
const ini = (o) => LX.initial(Object.assign({ age: 'adult', days: 'le2', lf: 'normal', night: false, recentExac: false, acute: false }, o));
t('T3 row1 infrequent → step 1', ini({}).row === 1 && ini({}).step === 1);
t('T3 row2 ~3 d/wk → step 2', ini({ days: '3' }).step === 2);
t('T3 row3 most days → step 3', ini({ days: 'most' }).step === 3);
t('T3 row3 night waking alone → step 3', ini({ night: true }).step === 3);
t('T3 row3 low lung function alone → step 3', ini({ lf: 'low' }).step === 3);
t('T3 daily without low LF/exac → step 3', ini({ days: 'daily' }).step === 3);
t('T3 row4 daily + low LF → step 4', ini({ days: 'daily', lf: 'low' }).step === 4);
t('T3 row4 night + recent exac → step 4', ini({ night: true, recentExac: true }).row === 4);
t('T3 row5 acute → step 4 (medium MART)', ini({ acute: true }).row === 5 && ini({ acute: true }).step === 4);
t('initial never reaches step 5', ['le2', '3', 'most', 'daily'].every(d => [true, false].every(n => ['normal', 'low'].every(lf => ini({ days: d, night: n, lf }).step <= 4))));
t('recent exac with infrequent sx → caution', ini({ recentExac: true }).cautions.length === 1);
/* Table 4 (6–11) */
t('T4 acute → step 4', LX.initial({ age: 'child', days: 'le2', lf: 'na', acute: true }).step === 4);
t('T4 3–4 d/wk → step 2', LX.initial({ age: 'child', days: '3', lf: 'na' }).step === 2);

/* --- ongoing: step up / stay / down --- */
let o = LX.ongoing(base({ ctl: ctl(1, 1, 1, 0), exac: 1 }));
t('uncontrolled step 3 → up to 4', o.action === 'up' && o.to === 4);
t('Track 2 with exac → suggest Track 1', o.cautions.some(c => c.includes('Track 1')));
o = LX.ongoing(base({ ctl: ctl(1, 0, 0, 0) }));
t('partly, no exac → consider', o.action === 'consider' && o.to === 4);
o = LX.ongoing(base({ ctl: ctl(1, 0, 0, 0), exac: 2 }));
t('partly + exac → up', o.action === 'up');
o = LX.ongoing(base({ exac: 1 }));
t('well controlled + exac → consider (not automatic step up)', o.action === 'consider');
o = LX.ongoing(base({ ctl: ctl(1, 1, 1, 1), checks: Object.assign({}, ok, { tech: false }) }));
t('poor technique → fix first, step unchanged', o.action === 'fix' && o.to === 3 && o.next === 4);
o = LX.ongoing(base({ step: 5, ctl: ctl(1, 1, 1, 0) }));
t('step 5 uncontrolled → severe', o.action === 'severe' && o.to === 5);
o = LX.ongoing(base({ stable: 2 }));
t('adult well 2 months → step down', o.action === 'down' && o.to === 2);
o = LX.ongoing(base({ stable: 1 }));
t('adult well 1 month → stay', o.action === 'stay' && o.to === 3);
o = LX.ongoing(base({ age: 'child', step: 3, stable: 2 }));
t('child well 2 months → stay (needs 3)', o.action === 'stay');
o = LX.ongoing(base({ age: 'child', step: 3, stable: 3 }));
t('child well 3 months → step down', o.action === 'down' && o.to === 2);
o = LX.ongoing(base({ track: 't1', step: 3, stable: 3 }));
t('Track 1 step 3 down → AIR-only (2)', o.action === 'down' && o.to === 2);
o = LX.ongoing(base({ track: 't1', step: 2, stable: 6 }));
t('Track 1 AIR-only is the floor', o.action === 'stay' && o.cautions.some(c => c.includes('不要完全停用 ICS')));
o = LX.ongoing(base({ track: 't1', step: 1, ctl: ctl(1, 1, 0, 1) }));
t('Track 1 step 1 normalised to 2 then up to 3', o.from === 2 && o.to === 3);
o = LX.ongoing(base({ track: 't2a', step: 1, stable: 6 }));
t('Track 2 step 1 is the floor', o.action === 'stay' && o.to === 1);
o = LX.ongoing(base({ stable: 3, riskN: 1 }));
t('step down with risk factor → close-monitoring caution', o.action === 'down' && o.cautions.length === 1);
/* children step 1 → next depends on reliever (p.30) */
t('child step 1 ICS-formoterol → low-dose MART (3)', LX.ongoing(base({ age: 'child', step: 1, c1: 'icsform', ctl: ctl(1, 1, 0, 1) })).to === 3);
t('child step 1 ICS-SABA → step 2', LX.ongoing(base({ age: 'child', step: 1, c1: 'icssaba', ctl: ctl(1, 1, 1, 1) })).to === 2);
t('child no Track 1 suggestion', !LX.ongoing(base({ age: 'child', step: 3, ctl: ctl(1, 1, 1, 0), exac: 1 })).cautions.some(c => c.includes('Track 1（')));

/* --- regimens / Table 7 doses --- */
let r = LX.regimen('adult', 3, 't2a');
t('T1 step 3 = 1 inhalation bid (or daily) + prn', r.t1.ex.includes('早晚各 1 吸'));
t('T1 step 4 = 2 inhalations bid', LX.regimen('adult', 4, 't2a').t1.ex.includes('早晚各 2 吸'));
t('T1 max 12 inhalations (≥12)', LX.regimen('adol', 2, 't1').t1.note.includes('>12'));
t('T1 160/4.5 strength for ≥12', LX.regimen('adult', 1, 't1').t1.ex.includes('160/4.5'));
t('T1 steps 1 and 2 share AIR-only', LX.regimen('adult', 1, 't1').t1.lab === LX.regimen('adult', 2, 't1').t1.lab);
t('T2 step 1 ICS-SABA reliever', LX.regimen('adult', 1, 't2a').t2.rel.includes('ICS-SABA'));
t('T2 step 1 SABA-only → ICS whenever SABA', LX.regimen('adult', 1, 't2b').t2.rel.includes('每次用 SABA 後立即吸'));
t('T2 step 3 SABA-only reliever', LX.regimen('adult', 3, 't2b').t2.rel.startsWith('需要時 SABA'));
t('T2 step 4 FP 500 mcg/day = medium (Table 6 >250–500)', LX.regimen('adult', 4, 't2a').t2.ex.includes('FP 500'));
t('T2 step 3 FP 200 mcg/day = low (Table 6 100–250)', LX.regimen('adult', 3, 't2a').t2.ex.includes('FP 200'));
r = LX.regimen('child', 3, 't2a');
t('child regimen uses 80/4.5', r.child && r.pref.some(p => p.includes('80/4.5')));
t('child max 8 inhalations', LX.regimen('child', 1).note.includes('>8'));
t('child never shows 160/4.5', [1, 2, 3, 4, 5].every(s => !JSON.stringify(LX.regimen('child', s)).includes('160/4.5')));
t('child step 5 no MART', LX.regimen('child', 5).note.includes('不建議 Step 5 MART'));
t('child step 4 MART 1 inhalation bid', LX.regimen('child', 4).pref.some(p => p.includes('每日 2 次、每次 1 吸')));

/* --- Step 5 age limits (p.26) --- */
const s5 = a => JSON.stringify(LX.step5(a));
t('reslizumab ≥18 only', s5('adult').includes('reslizumab') && !s5('adol').includes('reslizumab'));
t('tezepelumab ≥12', s5('adol').includes('tezepelumab') && !s5('child').includes('tezepelumab'));
t('benralizumab/depemokimab ≥12', s5('adol').includes('depemokimab') && !s5('child').includes('benralizumab'));
t('bud-form-glyco ≥12; other triples ≥18', s5('adol').includes('budesonide-formoterol-glycopyrronium') && !s5('adol').includes('umeclidinium') && s5('adult').includes('umeclidinium'));
t('child: tiotropium, mepolizumab, dupilumab, omalizumab', ['tiotropium', 'mepolizumab', 'dupilumab', 'omalizumab'].every(x => s5('child').includes(x)));

/* --- step-down wording --- */
t('step-down: never stop ICS in Track 2 step 2', LX.stepDown('adult', 't2a', 2).some(x => x.includes('不要完全停用 ICS')));
t('step-down: 25–50%', LX.stepDown('adult', 't1', 4).some(x => x.includes('25–50%')));
t('step-down child: no SABA alone', LX.stepDown('child', 't2a', 3).some(x => x.includes('不可單用 SABA')));

/* --- risk alerts --- */
let a = LX.riskAlerts(new Set(['icu']), 50, 1);
t('ICU alert is stop-level', a[0][0] === 'stop');
t('FEV1 <60 and exac listed', a.some(x => x[2].includes('FEV₁ 50%') && x[2].includes('1 次')));
t('lf chip suppresses duplicate FEV1 line', !LX.riskAlerts(new Set(['lf']), 50, 0).some(x => x[2].includes('FEV₁ 50%')));

/* --- pregnancy: no step-down, step-up unaffected (p.9, p.31) --- */
o = LX.ongoing(base({ track: 't1', step: 4, stable: 6, preg: true }));
t('pregnant + well controlled → stay, no step-down', o.action === 'stay' && o.to === 4);
t('pregnant → 4–6 week follow-up caution', o.cautions.some(c => c.includes('4–6 週')));
t('same case not pregnant → step down', LX.ongoing(base({ track: 't1', step: 4, stable: 6 })).action === 'down');
o = LX.ongoing(base({ track: 't1', step: 3, ctl: ctl(1, 1, 0, 1), preg: true }));
t('pregnant + uncontrolled → step-up unchanged', o.action === 'up' && o.to === 4);
t('pregnancy flag ignored for children', LX.ongoing(base({ age: 'child', step: 3, stable: 3, preg: true })).action === 'down');

/* --- Table 1 diagnosis --- */
const dx = (o) => LX.dxEval(Object.assign({ age: 'ad18', sx: [0, 1, 2] }, o));
t('adult +200 mL, 6.5% → negative', dx({ obj: { pre: 3.1, post: 3.3 } }).key === 'sxOnly');
t('adult +250 mL, 12.5% → confirmed', dx({ obj: { pre: 2, post: 2.25 } }).key === 'confirmed');
t('adult +190 mL, 19% → negative (needs ≥200 mL)', dx({ obj: { pre: 1, post: 1.19 } }).key === 'sxOnly');
t('adult FVC response alone counts', dx({ obj: { pre: 2, post: 2.1, fvcPre: 3, fvcPost: 3.4 } }).key === 'confirmed');
t('adult FEV1 and FVC both short → negative', dx({ obj: { pre: 2, post: 2.1, fvcPre: 3, fvcPost: 3.1 } }).key === 'sxOnly');
t('adult PEF BDR ≥20% (no spirometry)', dx({ obj: { pefPre: 300, pefPost: 360 } }).key === 'confirmed');
t('adult PEF BDR 15% → negative', dx({ obj: { pefPre: 300, pefPost: 345 } }).key === 'sxOnly');
t('FEV1 takes priority over PEF BDR', dx({ obj: { pre: 2, post: 2.1, pefPre: 300, pefPost: 400 } }).key === 'sxOnly');
t('adult PEF variability >10%', dx({ obj: { pef: 14 } }).key === 'confirmed' && dx({ obj: { pef: 10 } }).key === 'sxOnly');
const kid = (o) => dx(Object.assign({ age: 'ch617' }, o));
t('child 10% of predicted → negative even if 13% of baseline', kid({ obj: { pre: 1.5, post: 1.7, pred: 2 } }).key === 'sxOnly');
t('child 12% of predicted → confirmed', kid({ obj: { pre: 1.5, post: 1.74, pred: 2 } }).key === 'confirmed');
let dxr = kid({ obj: { pre: 1.5, post: 1.9 } });
t('child without predicted → cannot judge, not negative', dxr.neg.length === 0 && dxr.ind.length === 1 && dxr.key === 'needTests');
t('child PEF BDR ≥15%, variability >13%', kid({ obj: { pefPre: 200, pefPost: 230 } }).key === 'confirmed' && kid({ obj: { pef: 13 } }).key === 'sxOnly' && kid({ obj: { pef: 14 } }).key === 'confirmed');
t('other Table 1 evidence counts', dx({ other: [1] }).key === 'confirmed');
t('low FEV1/FVC alone is not variability', dx({ obj: { ratio: 0.6 } }).key === 'needTests' && !dx({ obj: { ratio: 0.6 } }).objPos);
t('FeNO alone is not variability', dx({ obj: { feno: 60 } }).key === 'sxT2' && kid({ obj: { feno: 40 } }).key === 'sxT2' && dx({ obj: { feno: 40 } }).key === 'needTests');
t('positive test without typical history', dx({ sx: [1], obj: { pef: 14 } }).key === 'objOnly');
t('nothing entered', dx({ sx: [] }).key === 'insufficient');
t('out-of-range value ignored and flagged', dx({ obj: { pre: 2100, post: 2500 } }).bad.length === 2 && dx({ obj: { pre: 2100, post: 2500 } }).key === 'needTests');

/* --- Figure 9 severity --- */
const CL = ['sev', 'life', 'mod', 'mild', 'mild', 'mild'];
const ac = (p, pram) => LX.acuteClassify(CL, p, pram);
t('nothing ticked is not mild', ac([]).key === 'mod' && ac([]).incomplete);
t('some mild features only → moderate, flagged', ac([3, 4]).key === 'mod' && ac([3, 4]).incomplete);
t('all mild features → mild', ac([3, 4, 5]).key === 'mild' && !ac([3, 4, 5]).incomplete);
t('all mild plus one moderate → moderate', ac([2, 3, 4, 5]).key === 'mod' && !ac([2, 3, 4, 5]).incomplete);
t('any severe sign → severe', ac([0, 3, 4, 5]).key === 'sev');
t('any life sign → life', ac([0, 1]).key === 'life');
t('PRAM bands', [[1, 'mild'], [3, 'mild'], [4, 'mod'], [7, 'mod'], [8, 'sev'], [10, 'sev'], [11, 'life'], [12, 'life']].every(([s, k]) => LX.pramBand(s) === k));
t('PRAM out of range ignored', LX.pramBand(13) === null && LX.pramBand('') === null && LX.pramBand(null) === null);
t('PRAM alone sets severity', ac([], 9).key === 'sev' && ac([], 5).key === 'mod' && ac([], 2).key === 'mild');
t('PRAM mild does not override a severe sign', ac([0], 2).key === 'sev');
t('PRAM severe overrides mild features', ac([3, 4, 5], 9).key === 'sev');

/* --- teaching tabs: data shape, and cases / quiz checked against the engine --- */
const tsrc = html.slice(html.indexOf('/*TEACH-START*/'), html.indexOf('/*TEACH-END*/'));
const tm = { exports: {} };
new Function('module', tsrc)(tm);
const { CASES, QUIZ, MAP } = tm.exports;
t('6 cases', CASES.length === 6);
t('unique case ids', new Set(CASES.map(c => c.id)).size === 6);
CASES.forEach(c => {
  t(c.id + ' complete', c.story && c.ask && c.points.length >= 3 && c.trap && c.src && c.data.length);
  t(c.id + ' load and expect line up', c.load.length && c.load.length === c.expect.length);
  c.load.forEach((l, k) => {
    const e = c.expect[k];
    if (l.wiz) { t(c.id + ' wizard case has expected verdict', !!e.verdict); return; }
    const d = l.ladder;
    if (d.ctx === 'init') {
      const r = LX.initial(Object.assign({}, d.init, { age: d.age }));
      t(c.id + ' initial step ' + e.step, r.step === e.step && r.row === e.row);
    } else {
      const rk = new Set(d.risk || []);
      const o = LX.ongoing(Object.assign({}, d.m, { age: d.age, icu: rk.has('icu'), riskN: LX.riskCount(rk, d.m.fev1, d.m.exac) }));
      t(c.id + ' action ' + e.action, o.action === e.action && o.to === e.to && (e.next == null || o.next === e.next));
    }
  });
});
const c1 = CASES[0].load[0].wiz.obj;
t('c1 BDR numbers: +200 mL but 6.5%', Math.round((c1.post - c1.pre) * 1000) === 200 && Math.abs((c1.post - c1.pre) / c1.pre * 100 - 6.45) < 0.01 && c1.pef > 10);
t('c4 child doses stay 80/4.5 and >8', LX.regimen('child', 3).pref.some(p => p.includes('80/4.5') && p.includes('每日 1 次 1 吸')) && CASES[3].points.join('').includes('>8'));
t('c5 Step 3 MART is half of Step 4', LX.regimen('adult', 3, 't1').t1.ex.includes('早晚各 1 吸') && LX.regimen('adult', 4, 't1').t1.ex.includes('早晚各 2 吸'));
t('c6 adolescent Step 5 options', ['mepolizumab', 'benralizumab', 'depemokimab', 'dupilumab', 'tezepelumab', 'omalizumab', 'budesonide-formoterol-glycopyrronium'].every(x => s5('adol').includes(x)) && !s5('adol').includes('reslizumab'));

t('20 questions', QUIZ.length === 20);
t('10 basic + 10 advanced', QUIZ.filter(q => q.level === 'basic').length === 10 && QUIZ.filter(q => q.level === 'adv').length === 10);
t('unique question ids', new Set(QUIZ.map(q => q.id)).size === 20);
t('A–D answers 5 each', [0, 1, 2, 3].every(a => QUIZ.filter(q => q.ans === a).length === 5));
QUIZ.forEach(q => t(q.id + ' complete', q.opts.length === 4 && new Set(q.opts).size === 4 && q.ans >= 0 && q.ans <= 3 && q.stem && q.why && q.src.includes('p.')));
const longest = QUIZ.filter(q => q.opts[q.ans].length === Math.max(...q.opts.map(o => o.length))).length;
t('correct option is rarely the unique longest (' + longest + '/20)', longest <= 7);
const q = id => QUIZ.find(x => x.id === id);
t('q1 BDR is negative', (2.22 - 2.00) / 2.00 < 0.12 && q('q1').opts[q('q1').ans].includes('陰性'));
t('q2 pre-exercise SABA not counted → well', LX.control(ctl(0, 0, 0, 0), 't2').level === 'well' && q('q2').ans === 0);
t('q4 matches Table 3 row 4', ini({ days: 'daily', night: true, lf: 'low', recentExac: true }).step === 4 && q('q4').opts[q('q4').ans].startsWith('中劑量 MART') && LX.regimen('adult', 4, 't1').t1.ex.includes('早晚各 2 吸'));
t('q6 step-down wording', LX.stepDown('adult', 't1', 4).some(x => x.includes('25–50%')) && q('q6').opts[q('q6').ans].includes('25–50%'));
t('q11 child BDR under 12% predicted', (1.70 - 1.50) / 2.00 < 0.12 && (1.70 - 1.50) / 1.50 >= 0.12 && q('q11').opts[q('q11').ans].includes('陰性'));
t('q14 matches child Step 4 MART', LX.regimen('child', 4).pref.some(p => p.includes('每日 2 次、每次 1 吸')) && q('q14').opts[q('q14').ans].startsWith('每日 2 次、每次 1 吸'));
t('q18 reslizumab only for ≥18', s5('adult').includes('reslizumab') && !s5('adol').includes('reslizumab') && q('q18').opts[q('q18').ans] === 'Reslizumab');

t('map has both sides', MAP.dx.length >= 5 && MAP.tx.length >= 5);
[...MAP.dx, ...MAP.tx].forEach(b => t('map branch ' + b.t, b.t && b.s && b.l.length >= 3 && b.l.every(x => x.length === 2 && x[0] && x[1])));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

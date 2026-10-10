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

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../../../data/sources.json'));else root.AsiLoop=factory(root.ASI_SOURCES);})(typeof globalThis!=='undefined'?globalThis:this,function(sources){
'use strict';
const get=id=>sources.entries.find(x=>x.id===id).value;
const kappa=Math.LN2/get('pointsPerDoubling');
const delta=get('preciseSlopeNew')*kappa;
const defaults={phi:1-get('betaBefore')/kappa,psi:(get('betaBefore')-get('betaAfter'))/kappa,lambda:1,boost:1,spending:1};
const breakModel={...defaults,phi:1-get('betaBreak')/kappa,psi:0};
const needed=p=>(1-p.phi)/p.lambda;
const multiplier=p=>Math.exp(delta*(1-p.phi)/p.lambda);
const presets=[{...defaults,psi:0},{...breakModel,spending:multiplier(breakModel)},{...breakModel,spending:4},{...defaults,psi:.3,boost:4},{...defaults,psi:.6},{...defaults,psi:needed(defaults)}];
function solve(p,t){const e=p.phi+p.lambda*p.psi, q=1-e, k=p.lambda*Math.log(p.spending), d=delta*p.boost; const vertical=q < -1e-9 ? (k===0?1/(-q*d):Math.log1p(k/(-q*d))/k):Infinity; if(t>=vertical)return {abilities:Infinity,growth:Infinity,vertical,e}; const I=k===0?t:Math.expm1(k*t)/k; const a=Math.abs(q)<=1e-9?d*I:Math.log1p(q*d*I)/q; return {abilities:a/Math.LN2,growth:d*Math.exp(k*t-q*a)/Math.LN2,vertical,e};}
const challenges=[
 p=>Math.abs(p.psi)<1e-9 && Math.abs(p.lambda-.8)<1e-9 && Math.abs(p.phi-.65)<1e-9 && Math.abs(p.boost-1)<1e-9 && [0,10].every(t=>Math.abs(solve(p,t).growth/(delta/Math.LN2)-1)<=0.01) && solve(p,0).vertical>10,
 p=>Math.abs(p.psi-.35)<1e-9 && Math.abs(p.phi-defaults.phi)<1e-9 && Math.abs(p.boost-1)<1e-9 && Math.abs(p.spending-1)<1e-9 && Math.abs(p.lambda*p.psi+p.phi-1)<=.005,
 p=>Math.abs(p.psi-.49)<1e-9 && Math.abs(p.phi-defaults.phi)<1e-9 && Math.abs(p.lambda-1)<1e-9 && Math.abs(p.spending-1)<1e-9 && solve(p,0).vertical<=2 && p.boost-1/(2*(p.phi+p.lambda*p.psi-1)*delta)<=.1
];
function doublingTime(p,n){const q=1-p.phi-p.lambda*p.psi,d=delta*p.boost,k=p.lambda*Math.log(p.spending), a=n*Math.LN2;const I=Math.abs(q)<1e-9?a/d:Math.expm1(q*a)/(q*d);return k===0?I:Math.log1p(k*I)/k;}
function doublingGaps(p,n=6){let prev=0;return Array.from({length:n},(_,i)=>{const t=doublingTime(p,i+1),gap=t-prev;prev=t;return gap})}
function gapText(growth){const years=1/growth;if(years<1/365.25/2)return 'less than a day';let n,unit;if(years<14/365.25){n=years*365.25;unit='day'}else if(years<60/365.25){n=years*365.25/7;unit='week'}else if(years<2){n=years*12;unit='month'}else{n=years;unit='year'}n=Math.max(.1,Math.round(n*10)/10);return `${n} ${unit}${n===1?'':'s'}`}
function doublingFrom(p,t){const n=Math.floor(solve(p,t).abilities);return doublingTime(p,n+1)-doublingTime(p,n);}
function liveSentence(p){const start=solve(p,0),boosted=Math.abs(p.boost-1)>1e-9,first=gapText(1/doublingTime(p,1));let intro=boosted?`Without the boost, the next doubling takes about ${gapText(1/doublingTime({...p,boost:1},1))}. With the ×${Number(p.boost.toPrecision(3))} boost, the next doubling takes about ${first}`:(()=>{const naive=1/start.growth,actual=doublingTime(p,1);if(Math.abs(actual-naive)/naive<.03)return `The next doubling takes about ${first}`;return `At today's pace, about ${start.growth.toFixed(1)} doublings a year, a doubling would take ${gapText(start.growth)}. Because growth ${actual>naive?'slows':'speeds up'} along the way, the next doubling takes about ${first}`})();if(start.vertical<=10){const t=Math.min(.5,start.vertical/2);return `${intro}. With these settings, the doubling under way ${t===.5?'in six months':`in ${gapText(1/t)}`} takes about ${gapText(1/doublingFrom(p,t))}, and growth goes vertical in year ${Number(start.vertical.toFixed(2))}: in this model, unlimited growth in finite time.`}return `${intro}. With these settings, the doubling under way a year from now takes about ${gapText(1/doublingFrom(p,1))}, and the one under way in year ten about ${gapText(1/doublingFrom(p,10))}.`}

const forces=p=>({push:p.lambda*p.psi,pull:1-p.phi});
function encode(p){return new URLSearchParams(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,String(v)]))).toString()}
const limits={phi:[0,1.5],psi:[0,1],lambda:[.2,1.5],boost:[1,10],spending:[1,8]};
function decode(s){const u=new URLSearchParams(s),p={...defaults};for(const k of Object.keys(p)){const v=u.get(k);if(v!==null&&v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=limits[k][0]-1e-9&&Number(v)<=limits[k][1]+1e-9)p[k]=Number(v)}return p}
return {delta,kappa,defaults,breakModel,needed,forces,multiplier,presets,solve,challenges,doublingTime,doublingFrom,doublingGaps,gapText,liveSentence,encode,decode,limits};});

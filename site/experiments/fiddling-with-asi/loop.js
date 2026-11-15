(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../../../data/sources.json'));else root.AsiLoop=factory(root.ASI_SOURCES);})(typeof globalThis!=='undefined'?globalThis:this,function(sources){
'use strict';
const get=id=>sources.entries.find(x=>x.id===id).value;
const delta=get('slopeNew')*Math.LN2/get('pointsPerDoubling');
const defaults={phi:.59,psi:.01,lambda:1,boost:1,spending:1};
const needed=p=>(1-p.phi)/p.lambda;
const multiplier=p=>Math.exp(delta*(1-p.phi)/p.lambda);
const presets=[{...defaults,psi:0},{...defaults,psi:0,spending:multiplier(defaults)},{...defaults,spending:4},{...defaults,psi:.3,boost:4},{...defaults,psi:.6},{...defaults,psi:needed(defaults)}];
function solve(p,t){const e=p.phi+p.lambda*p.psi, q=1-e, k=p.lambda*Math.log(p.spending), d=delta*p.boost; const vertical=q < -1e-9 ? (k===0?1/(-q*d):Math.log1p(k/(-q*d))/k):Infinity; if(t>=vertical)return {abilities:Infinity,growth:Infinity,vertical,e}; const I=k===0?t:Math.expm1(k*t)/k; const a=Math.abs(q)<=1e-9?d*I:Math.log1p(q*d*I)/q; return {abilities:a/Math.LN2,growth:d*Math.exp(k*t-q*a)/Math.LN2,vertical,e};}
function doublingTime(p,n){const q=1-p.phi-p.lambda*p.psi,d=delta*p.boost,k=p.lambda*Math.log(p.spending), a=n*Math.LN2;const I=Math.abs(q)<1e-9?a/d:Math.expm1(q*a)/(q*d);return k===0?I:Math.log1p(k*I)/k;}
function doublingGaps(p,n=6){let prev=0;return Array.from({length:n},(_,i)=>{const t=doublingTime(p,i+1),gap=t-prev;prev=t;return gap})}
function gapText(growth){const years=1/growth;if(years<1/365.25/2)return 'less than a day';let n,unit;if(years<14/365.25){n=years*365.25;unit='day'}else if(years<60/365.25){n=years*365.25/7;unit='week'}else if(years<2){n=years*12;unit='month'}else{n=years;unit='year'}n=Math.max(.1,Math.round(n*10)/10);return `${n} ${unit}${n===1?'':'s'}`}
function liveSentence(p){const start=solve(p,0),one=solve(p,1),end=solve(p,10),boosted=Math.abs(p.boost-1)>1e-9,intro=`Today AI's abilities double about every ${gapText(delta/Math.LN2)}`+(boosted?`. The ×${Number(p.boost.toPrecision(3))} boost makes that every ${gapText(start.growth)} at once`:'');if(start.vertical<=10){const t=Math.min(.5,start.vertical/2);return `${intro}. With these settings, ${t===.5?'in six months':`in ${gapText(1/t)}`} they double every ${gapText(solve(p,t).growth)}, and they go vertical in year ${Number(start.vertical.toFixed(2))}: in this model, unlimited growth in finite time.`}if(Math.abs(end.growth-start.growth)<1e-8*Math.max(1,start.growth))return `${intro}, and with these settings they keep that pace.`;return `${intro}. With these settings, in a year they double every ${gapText(one.growth)}, and by year ten every ${gapText(end.growth)}.`}
const forces=p=>({push:p.lambda*p.psi,pull:1-p.phi});
const neededMultiple=p=>p.psi>0?Math.max(0,needed(p))/p.psi:Infinity;
function encode(p){return new URLSearchParams(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,Number(v.toPrecision(10)).toString()]))).toString()}
const limits={phi:[0,1.5],psi:[0,1],lambda:[.2,1.5],boost:[1,10],spending:[1,8]};
function decode(s){const u=new URLSearchParams(s),p={...defaults};for(const k of Object.keys(p)){const v=u.get(k);if(v!==null&&v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=limits[k][0]-1e-9&&Number(v)<=limits[k][1]+1e-9)p[k]=Number(v)}return p}
return {delta,defaults,needed,neededMultiple,forces,multiplier,presets,solve,doublingTime,doublingGaps,gapText,liveSentence,encode,decode,limits};});

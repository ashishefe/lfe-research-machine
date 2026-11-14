/* One model for both views. Rates are doublings per year. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ResearchMachine = api;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const defaults = Object.freeze({X:2,s:2/3,L:6.25,A:1,k:1,phi0:.5,phi1:.5,a:.5,sigma:1,lambda:1,h:1,b:1,T0:3,W:1,beta:.25,L0:100,K0:100});
  const isCD = sigma => Math.abs(sigma - 1) < 1e-6;
  function state(input = {}) { return {...defaults, ...input}; }
  function compute(input) {
    const p = state(input);
    const E = p.k*p.phi1/p.phi0, Cr = p.k*(1-p.phi1)/(1-p.phi0);
    const g0 = p.s*p.T0, c0 = (1-p.s)*p.T0;
    return {E,Cr,g0,c0,c:c0+Math.log2(Cr)/p.W};
  }
  function experimentDial(input, E) {
    const p=state(input), {Cr}=compute(p);
    const k=E*p.phi0+Cr*(1-p.phi0);
    return {...p,k,phi1:E*p.phi0/k};
  }
  // Log-sum-exp keeps CES stable close to Cobb-Douglas.
  function logF(L,E,a,sigma) {
    if(isCD(sigma)) return a*Math.log(L)+(1-a)*Math.log(E);
    const rho=(sigma-1)/sigma;
    if(L===0) return rho<0 ? -Infinity : Math.log((1-a)*Math.pow(E,rho))/rho;
    const x=rho*Math.log(L), y=rho*Math.log(E), m=Math.max(x,y);
    return (m+Math.log(a*Math.exp(x-m)+(1-a)*Math.exp(y-m)))/rho;
  }
  function F(L,E,a,sigma) { return Math.exp(logF(L,E,a,sigma)); }
  function forward(input) {
    const p=state(input), d=compute(p);
    const G=p.A*Math.exp(p.lambda*logF(p.L,d.E,p.a,p.sigma));
    const Xe=(G*d.g0+d.c)/p.T0;
    return {...d,G,Xe,X_out:1+(Xe-1)/(p.b*p.h)};
  }
  function inverse(input, logAOverride, trainingGrowth) {
    const p=state(input), d=compute(p), Xe=1+p.b*p.h*(p.X-1);
    if(trainingGrowth !== undefined) d.c=trainingGrowth;
    const G=(Xe*p.T0-d.c)/d.g0;
    const base={...d,Xe,G,L_needed:0,logL:null,Tg:null,G_max:null,X_max:null};
    if(G<=0) return {...base,status:'none-needed'};
    const logA=logAOverride === undefined ? Math.log(p.A) : logAOverride;
    const logTg=(Math.log(G)-logA)/p.lambda;
    base.Tg=logTg<Math.log(Number.MAX_VALUE) ? Math.exp(logTg) : null;
    let logL;
    if(isCD(p.sigma)) logL=(logTg-(1-p.a)*Math.log(d.E))/p.a;
    else {
      const rho=(p.sigma-1)/p.sigma;
      const target=rho*logTg, term=Math.log(1-p.a)+rho*Math.log(d.E);
      if(target<=term) {
        if(rho>0) return {...base,status:'compute-alone'};
        const logMax=Math.log(d.E)+Math.log(1-p.a)/rho;
        const G_max=Math.exp(logA+p.lambda*logMax);
        return {...base,status:'wall',L_needed:null,G_max,X_max:1+((G_max*d.g0+d.c)/p.T0-1)/(p.b*p.h)};
      }
      logL=(target+Math.log(-Math.expm1(term-target))-Math.log(p.a))/rho;
    }
    return {...base,logL,L_needed:logL<Math.log(Number.MAX_VALUE)?Math.exp(logL):null,status:logL<Math.log(Number.MAX_VALUE)?'ok':'out-of-range'};
  }
  // Within a phase, the required pace is constant. When the zero-labour
  // floor binds, y = exp(beta * ln(2) * D) satisfies y' = q*g0*(K-y).
  // Solve that branch and its single possible crossing with the target
  // exactly, rather than letting chart sampling determine the trajectory.
  function timeEvaluator(input) {
    const p=state(input), d=compute(p), Xe=1+p.b*p.h*(p.X-1);
    const G1=(Xe*p.T0-d.c)/d.g0, G2=(Xe*p.T0-d.c0)/d.g0;
    const q=p.beta*Math.LN2, logK=Math.log(p.A)+p.lambda*logF(0,d.E,p.a,p.sigma);
    function advance(D, duration, required) {
      if(duration<=0)return D;
      const floor=Math.exp(logK-q*D);
      if(q===0)return D+d.g0*(Math.max(required,floor)-1)*duration;
      if(floor===0)return D+d.g0*(Math.max(required,0)-1)*duration;
      const rate=q*d.g0;
      const floorAdvance=dt=>D+Math.log1p((floor-1)*(-Math.expm1(-rate*dt)))/q;
      if(floor>required) {
        if(required>1) {
          const crossing=Math.log(required*(floor-1)/(floor*(required-1)))/rate;
          if(crossing<duration) {
            const atCrossing=(logK-Math.log(required))/q;
            return atCrossing+d.g0*(required-1)*(duration-crossing);
          }
        }
        return floorAdvance(duration);
      }
      if(required<1 && required>0) {
        const crossing=Math.log(floor/required)/(rate*(required-1));
        if(crossing<duration) {
          const atCrossing=(logK-Math.log(required))/q;
          return atCrossing+Math.log1p((required-1)*(-Math.expm1(-rate*(duration-crossing))))/q;
        }
      }
      return D+d.g0*(required-1)*duration;
    }
    const atW=advance(0,p.W,G1);
    return t=>{
      const D=t<=p.W?advance(0,t,G1):advance(atW,t-p.W,G2);
      const logA=Math.log(p.A)-q*D;
      const G_required=t<=p.W?G1:G2, G_floor=Math.exp(logK-q*D);
      const G_actual=Math.max(G_required,G_floor);
      return {t,A:Math.exp(logA),D,G1,G2,G_required,G_floor,G_actual,...inverse(p,logA,t<=p.W?d.c:d.c0)};
    };
  }
  function timePoint(input, t) { return timeEvaluator(input)(t); }
  function timePath(input, steps=100) {
    const p=state(input), points=[], point=timeEvaluator(p);
    // Include both sides of the phase change so the chart shows the jump.
    const times=[...new Set([...Array.from({length:steps+1},(_,i)=>5*i/steps),p.W, ...(p.W<5?[p.W+1e-9]:[])])].sort((a,b)=>a-b);
    for(const t of times) {
      let answer=point(t);
      if(answer.status==='wall' && points.length) {
        let low=points.at(-1).t, high=t;
        // Find the first wall inside this interval, including a jump after W.
        for(let i=0;i<60 && high-low>1e-12;i++) {
          const mid=low+(high-low)/2;
          if(point(mid).status==='wall') high=mid; else low=mid;
        }
        answer=point(high);
      }
      points.push(answer);
      if(answer.status==='wall'||answer.status==='out-of-range') break;
    }
    return points;
  }
  function walkTimePath(input, steps=100) {
    const points=timePath(input,steps), last=points.at(-1);
    return {points, last, status:last.status, wallYear:last.status==='wall'?last.t:null,
      L5:last.t===5 && !['wall','out-of-range'].includes(last.status)?last.L_needed:null};
  }
  const cases = Object.freeze([
    {name:"Tejas's model",change:{}},
    {name:'Research productivity falls 20%',change:{A:.8}},
    {name:'Experiment compute doubled',E:2},
    {name:'All compute doubled',change:{k:2}},
    {name:'AI caused 80% of the speedup',change:{h:.8}},
    {name:'Harder to swap',change:{sigma:.75}},
    {name:'Very hard to swap',change:{sigma:.5}}
  ]);
  function scenario(index) {const c=cases[index]; return c.E?experimentDial(defaults,c.E):state(c.change);}
  function format(value, digits=2) {
    if(value===null || !Number.isFinite(value)) return 'beyond numeric range';
    if(Math.abs(value)>=1e6) { const scales=[[1e300,'centillion'],[1e15,'quadrillion'],[1e12,'trillion'],[1e9,'billion'],[1e6,'million']]; const [scale,name]=scales.find(([n])=>Math.abs(value)>=n); return (value/scale).toLocaleString('en-GB',{maximumSignificantDigits:3})+' '+name; }
    if(value!==0 && Math.abs(value)<.001) return value.toExponential(2);
    return value.toLocaleString('en-GB',{maximumFractionDigits:digits});
  }
  function kitchen(share) {
    const skill=1.5**share, price=1.5**(-(1-share)), ingredients=2*1.5**(1-share);
    return {budget:2, price, ingredients, skill, meals:ingredients*skill};
  }
  function spendingPuzzle() {
    const data={h1:1850,nine2025:3594,year2025:6338,year2024:2275,year2023:422,actual:9741,nine2026:19240,slopeOld:15,slopeNew:29};
    const {h1,actual}=data, q3=data.nine2025-h1, h2=data.year2025-h1, annual=data.year2025/data.year2024;
    // Time is measured in quarters from January 2023. A path gives spending per quarter.
    const integral=(rate,start,end)=>Math.abs(rate)<1e-12?end-start:(Math.exp(rate*end)-Math.exp(rate*start))/rate;
    const fit=(p1,p2)=>{let lo=-5,hi=5; for(let i=0;i<100;i++){const mid=(lo+hi)/2; if(integral(mid,p2[0],p2[1])/integral(mid,p1[0],p1[1])<p2[2]/p1[2])lo=mid;else hi=mid;} const rate=(lo+hi)/2; return {rate,scale:p1[2]/integral(rate,p1[0],p1[1])};};
    const total=(path,start,end)=>path.scale*integral(path.rate,start,end);
    const p2023=[0,4,data.year2023],p2024=[4,8,data.year2024],pH1=[8,10,h1],pQ3=[10,11,q3],p2025=[8,12,data.year2025],pH2=[10,12,h2];
    const t1=fit(p2023,p2024),t2=fit(p2024,pH1),t3=fit(pH1,pQ3),year=fit(p2024,p2025),t6=fit(pH1,pH2);
    const anchor=(rate,p)=>({rate,scale:p[2]/integral(rate,p[0],p[1])});
    const trends=[t1,t2,t3,anchor(year.rate,pH1),anchor(year.rate,pQ3),t6];
    const projected=trends.map(t=>total(t,12,14));
    const q=Math.exp(t3.rate), rough=Math.pow(q3/(h1/2),2/3);
    // Garicano and Imas appendix: progress 1.9063, spending 6.19, staff 3.10.
    const ratios=projected.map(x=>actual/x);
    const appendixRatios={matched:{immediate:0.31,yearDelay:0.60},janSep:{immediate:0.36,yearDelay:0.90}};
    const studyInputs={progress:1.9063,spending:6.19,staff:3.10};
    const appendixFalls=Object.fromEntries(Object.entries(appendixRatios).map(([k,v])=>[k,{immediate:1-v.immediate,yearDelay:1-v.yearDelay}]));
    const labourBase=inverse(defaults).L_needed, labourRates=[Math.SQRT2,annual,(h2/h1)**2], labourPowers=labourRates.map(n=>n**15);
    return {appendixRatios,appendixFalls,studyInputs,labourBase,labourRates,labourPowers,trendGrowth:projected[0]/(data.year2024/2), trendTest1:total(t1,8,10)/h1, trendTest2:total(t2,10,11), trends, trendAnnual:trends.map(t=>Math.exp(4*t.rate)), trendTotal:total, data,q,quarters:[q3,data.year2025-data.nine2025,data.nine2026-actual],spending:actual/h1,pace:data.slopeNew/data.slopeOld,falls:[1-(data.slopeNew/data.slopeOld)/(actual/h1),1-1/(actual/h1)],projected,ratios,whatIf:ratios.map(x=>1/3+2*x/3),annual,fast:(h2/h1)**2,worlds:[{input:2,price:1,productivity:1.5},{input:3,price:2/3,productivity:1}],roughProjection:h1*rough**4, studyFalls:[1-studyInputs.progress/studyInputs.spending,1-studyInputs.progress/studyInputs.staff],labour:labourPowers.map(power=>labourBase*power)};
  }
  return {defaults,state,isCD,compute,experimentDial,F,forward,inverse,timePoint,timePath,walkTimePath,cases,scenario,format,spendingPuzzle,kitchen};
});

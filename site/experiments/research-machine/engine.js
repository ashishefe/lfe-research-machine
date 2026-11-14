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
    if(Math.abs(value)>=1e6 || (value!==0 && Math.abs(value)<.001)) return value.toExponential(2);
    return value.toLocaleString('en-GB',{maximumFractionDigits:digits});
  }
  function kitchen(share) {
    const skill=1.5**share, price=1.5**(-(1-share)), ingredients=2*1.5**(1-share);
    return {budget:2, price, ingredients, skill, meals:ingredients*skill};
  }
  function spendingPuzzle() {
    const data={h1:1850,nine2025:3594,year2025:6338,year2024:2275,year2023:422,actual:9741,nine2026:19240,slopeOld:15,slopeNew:29};
    const {h1,actual}=data, q3=data.nine2025-h1, h2=data.year2025-h1, annual=data.year2025/data.year2024;
    const R=q3/(h1/2), q=(R+Math.sqrt(R*R+8*R))/4;
    const rough=Math.pow(q3/(h1/2),2/3);
    const projected=[2*(data.year2024/4)*(data.year2024/data.year2023)**1.75, 2*(h1/2)*((h1/2)/(data.year2024/4))**(1/.75), q3*(q*q+q*q*q),h1*annual,q3*(annual**.5+annual**.75),h1*(h2/h1)**2];
    // Garicano and Imas appendix: progress 1.9063, spending 6.19, staff 3.10.
    const ratios=projected.map(x=>actual/x);
    return {trendGrowth:(data.year2024/data.year2023)**1.75, trendTest1:(data.year2024/4)*(data.year2024/data.year2023)**.75/(h1/2), trendTest2:(h1/2)*((h1/2)/(data.year2024/4))**.5, data,q,quarters:[q3,data.year2025-data.nine2025,data.nine2026-actual],spending:actual/h1,pace:data.slopeNew/data.slopeOld,falls:[1-(data.slopeNew/data.slopeOld)/(actual/h1),1-1/(actual/h1)],projected,ratios,whatIf:ratios.map(x=>1/3+2*x/3),annual,fast:(h2/h1)**2,worlds:[{input:2,price:1,productivity:1.5},{input:3,price:2/3,productivity:1}],roughProjection:h1*rough**4, studyFalls:[1-1.9063/6.19,1-1.9063/3.10],labour:[Math.SQRT2,annual,(h2/h1)**2].map(n=>6.25*n**15)};
  }
  return {defaults,state,isCD,compute,experimentDial,F,forward,inverse,timePoint,timePath,walkTimePath,cases,scenario,format,spendingPuzzle,kitchen};
});

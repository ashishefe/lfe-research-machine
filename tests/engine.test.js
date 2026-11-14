'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../site/experiments/research-machine/engine.js');
const close=(actual,expected,tol=1e-9)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);
test('expected-values table: all seven cases',()=>{
  const expected=[6.25,9.765625,3.125,2,4.84,9.41081592787378];
  expected.forEach((v,i)=>close(m.inverse(m.scenario(i)).L_needed,v,i===5?.001:1e-9));
  close(m.inverse().G,2.5); close(m.forward().X_out,2);
  close(m.inverse(m.scenario(3)).G,2); close(m.inverse(m.scenario(4)).G,2.2);
  const wall=m.inverse(m.scenario(6)); assert.equal(wall.status,'wall');
  close(wall.G_max,2); close(wall.X_max,5/3);
});
test('inverse recovers forward labour across parameter grid',()=>{
  let count=0;
  for(const sigma of [.5,.75,1,1.000002,1.5,3])
  for(const a of [.1,.5,.9]) for(const lambda of [.3,1,1.5])
  for(const A of [.3,1,1.5]) for(const E of [.1,1,8])
  for(const h of [.3,1]) for(const b of [.5,2]) for(const L of [.5,6.25,40]) {
    const p=m.experimentDial({sigma,a,lambda,A,h,b,L},E);
    const out=m.forward(p), back=m.inverse({...p,X:out.X_out});
    // At near-perfect complementarity, floating point can erase the labour contribution.
    if(back.status==='wall') {assert.ok(sigma<1); continue;}
    close(back.L_needed,L,3e-5); count++;
  }
  assert.equal(count,5832);
});
test('forward rises with labour',()=>{
  for(const sigma of [.2,.5,.75,1,2,3]) for(const a of [.1,.5,.9]) {
    const values=[.5,1,6.25,20,40].map(L=>m.forward({sigma,a,L}).X_out);
    values.slice(1).forEach((x,i)=>assert.ok(x>values[i]));
  }
});
test('CES tends to CD, threshold and normalisation',()=>{
  for(const sigma of [.99999,1.00001,.9999999,1.0000001]) {
    close(m.F(6.25,2,.5,sigma),m.F(6.25,2,.5,1),1e-5);
    close(m.F(1,1,.3,sigma),1);
  }
  assert.equal(m.isCD(1.0000001),true); assert.equal(m.isCD(.75),false);
});
test('all inverse statuses and zero-labour forward',()=>{
  assert.equal(m.inverse().status,'ok');
  assert.equal(m.inverse({X:1,k:8,W:.5}).status,'none-needed');
  assert.equal(m.inverse(m.experimentDial({X:1,sigma:3},20)).status,'compute-alone');
  assert.equal(m.inverse({sigma:.5}).status,'wall');
  assert.equal(m.inverse({},-1000).status,'out-of-range');
  close(m.forward({L:0,sigma:.5}).G,0);
});
test('experiment dial preserves training compute, including a changed split',()=>{
  for(const p of [{},{k:3,phi0:.2,phi1:.8}]) for(const E of [.1,2,8]) {
    const q=m.experimentDial(p,E); close(m.compute(q).E,E); close(m.compute(q).Cr,m.compute(p).Cr);
  }
});
function finiteTree(x) {
  if(typeof x==='number') assert.ok(Number.isFinite(x),`non-finite number: ${x}`);
  else if(x && typeof x==='object') Object.values(x).forEach(finiteTree);
}
test('slider extremes stay finite or explicitly absent, including time paths',()=>{
  const ranges={X:[1,4],s:[.1,.9],L:[.5,60],A:[.3,1.5],k:[.5,8],phi0:[.05,.95],phi1:[.05,.95],a:[.1,.9],sigma:[.2,3],lambda:[.3,1.5],h:[.3,1],b:[.5,2],T0:[1,6],W:[.5,5],beta:[0,1]};
  for(const [key,range] of Object.entries(ranges)) for(const value of range) {
    const p={[key]:value}; finiteTree(m.forward(p));finiteTree(m.inverse(p));finiteTree(m.timePath(p));
  }
  let seed=17;
  for(let i=0;i<2000;i++) {
    const p={}; for(const [key,range] of Object.entries(ranges)) {seed=(seed*16807)%2147483647;p[key]=range[seed%2];}
    finiteTree(m.forward(p));finiteTree(m.inverse(p));finiteTree(m.timePath(p,10));
  }
  assert.doesNotMatch(m.format(Infinity),/Infinity|NaN/);
});
test('time path holds target, stops at wall, and respects beta and slow growth',()=>{
  const path=m.timePath(); close(path[0].L_needed,6.25); close(path.at(-1).L_needed,6.25*Math.pow(2,7.5));
  const fixed=m.timePath({beta:0}); fixed.forEach(p=>close(p.L_needed,6.25));
  m.timePath({X:1}).forEach(p=>close(p.A,1));
  const wall=m.timePath({sigma:.75}); assert.equal(wall.at(-1).status,'wall'); assert.ok(wall.at(-1).t<5);
});

test('training level boost ends after W and productivity uses both phases',()=>{
 const p={k:2,W:1};
 const start=m.timePoint(p,0), boundary=m.timePoint(p,1), after=m.timePoint(p,1+1e-8), end=m.timePoint(p,5);
 close(start.L_needed,2);close(boundary.G,2);close(after.G,2.5);
 close(boundary.D,2);close(end.D,14);close(end.A,2**-3.5);close(end.L_needed,400);
 close(after.A,boundary.A,1e-7);close(after.L_needed/boundary.L_needed,2.5**2/2**2,1e-7);
 const d=m.compute(p);close(end.c,d.c0);close(boundary.c,d.c);
 assert.ok(m.timePath(p).some(q=>q.t>1&&q.t<1.000001));
 for(const T0 of [1,6]) {
  const q=m.timePoint({T0},5);close(q.L_needed,6.25*2**(2.5*T0));
 }
 assert.equal(m.timePoint({sigma:.5},5).status,'wall');
});
test('nonpositive forward values remain in engine, h and b enter only as product',()=>{
 const p={k:.5,phi0:.05,phi1:.95,W:.5,T0:1,L:.5,A:.3,s:.1,h:.3,b:.5};
 assert.ok(m.forward(p).X_out<0);
 close(m.forward({h:.5,b:2}).X_out,m.forward({h:1,b:1}).X_out);
 close(m.inverse({h:.5,b:2}).L_needed,m.inverse({h:1,b:1}).L_needed);
 assert.ok(m.forward({h:.8}).X_out>m.forward({h:1}).X_out);
});


test('shared walk reports completion or the first wall, including recovery',()=>{
 const base=m.walkTimePath();close(base.L5,1131.370849898476);assert.equal(base.wallYear,null);
 const wall=m.walkTimePath({sigma:.75});assert.equal(wall.status,'wall');assert.equal(wall.L5,null);assert.ok(wall.wallYear>0&&wall.wallYear<5);
 const recovering={k:.75,phi1:2/3,W:1,beta:0,sigma:.6};assert.equal(m.timePoint(recovering,5).status,'ok');
 assert.equal(m.walkTimePath(recovering).wallYear,0);assert.equal(m.walkTimePath(recovering).L5,null);
 const nonpositive=m.forward({h:.3,b:.5,L:.5});assert.ok(nonpositive.X_out<0);close(nonpositive.Cr,1);
});

test('bisect first wall independently of the sampling step',()=>{
 const p={sigma:.5,X:1.5}, expected=Math.log2(8/7)/.375;
 for(const steps of [10,100,500]) {
  const walk=m.walkTimePath(p,steps);
  close(walk.wallYear,expected,1e-10);
  assert.equal(walk.status,'wall');assert.equal(walk.last.status,'wall');
  assert.equal(m.timePoint(p,walk.wallYear-1e-8).status,'ok');
  assert.equal(walk.L5,null);
 }
 close(m.walkTimePath({sigma:.5}).wallYear,0);
 // A discontinuous wall after the training boost ends must stay at W.
 const jump=m.walkTimePath({sigma:.5,k:2,beta:0,X:3});
 close(jump.wallYear,1,1e-8);assert.ok(jump.wallYear>1);
});

test('signed excess lets productivity recover before the training transition ends',()=>{
 const p={k:4,W:.5};
 const start=m.timePoint(p,0), transition=m.timePoint(p,.5), end=m.timePoint(p,5);
 close(start.G1,.5);close(start.G2,2.5);
 close(transition.D,-.5);close(transition.A,2**.125);
 assert.ok(transition.A>1);
 close(end.D,13);close(end.L_needed,141.4213562373095);
 close(m.timePoint({k:2,W:1},5).L_needed,400);
 close(m.timePoint({},5).L_needed,1131.370849898476);
});

test('actual growth respects the zero-labour floor and exposes the requested pace separately',()=>{
 const p={sigma:2,k:8,W:2};
 const start=m.timePoint(p,0);
 close(start.G_required,1.75);close(start.G_floor,2);close(start.G_actual,2);
 assert.equal(start.status,'compute-alone');close(start.L_needed,0);
 const dt=1e-5;
 close((m.timePoint(p,dt).D-start.D)/dt,2,1e-5);
 for(const t of [0,.2,1,2,2+1e-8,5]) {
  const q=m.timePoint(p,t);
  close(q.G_floor,q.A*m.F(0,q.E,.5,2));
  close(q.G_actual,Math.max(q.G_required,q.G_floor));
  if(q.L_needed>0)close(m.forward({...p,A:q.A,L:q.L_needed}).G,q.G_actual);
 }
 for(const sigma of [.5,1]) {
  const q=m.timePoint({sigma,k:8,W:.5},.25);
  assert.ok(q.G_required<0);close(q.G_floor,0);close(q.G_actual,0);
  close(q.D,-.5);close(q.A,2**.125);
 }
 const fixed=m.timePoint({...p,beta:0},2);
 close(fixed.G_actual,2);close(fixed.D,4);close(fixed.A,1);
});

// Independent integration checks both floor/target crossings. Split at W so
// the integration never averages across the discontinuity in required growth.
function integratedExcess(input,t) {
 const p=m.state(input), d=m.compute(p), Xe=1+p.b*p.h*(p.X-1);
 const floor0=p.A*m.F(0,d.E,p.a,p.sigma)**p.lambda;
 let D=0;
 for(const [duration,c] of [[Math.min(t,p.W),d.c],[Math.max(0,t-p.W),d.c0]]) {
  const required=(Xe*p.T0-c)/d.g0, steps=Math.ceil(duration*10000), h=duration/steps;
  const slope=value=>(Math.max(required,floor0*2**(-p.beta*value))-1)*d.g0;
  for(let i=0;i<steps;i++) {
   const a=slope(D),b=slope(D+h*a/2),c=slope(D+h*b/2),e=slope(D+h*c);
   D+=h*(a+2*b+2*c+e)/6;
  }
 }
 return D;
}
test('closed-form time path agrees with independent integration through both floor crossings',()=>{
 for(const p of [
  {sigma:2,k:8,W:2}, // floor falls below the required pace
  {sigma:2,k:8,W:5,X:1,A:.3,beta:1}, // recovery raises floor above the required pace
  {sigma:3,k:8,W:.5,X:1,beta:.8}, // negative required pace, positive actual growth
  {sigma:2,k:4,W:2,X:1,beta:.25}, // equilibrium floor
  {sigma:2,k:8,W:2,beta:0}
 ]) for(const t of [.1,1,2,5]) close(m.timePoint(p,t).D,integratedExcess(p,t),2e-8);
 const p={sigma:2,k:8,W:2};
 const low=m.walkTimePath(p,10),high=m.walkTimePath(p,500);
 close(low.L5,high.L5);close(low.last.D,high.last.D);
 const boundary=m.timePoint(p,2), after=m.timePoint(p,2+1e-8);
 close(boundary.D,after.D,1e-7);close(boundary.G_required,1.75);close(after.G_required,2.5);
});

test('all eleven preset answers and explanatory examples retain their numeric basis',()=>{
 const inputs=[...m.cases.map((_,i)=>m.scenario(i)),{X:4},m.experimentDial({X:4},2),m.experimentDial({X:4},4),{X:4,A:.8}];
 const expected=[6.25,9.765625,3.125,2,4.84,9.41081592787378,null,30.25,15.125,7.5625,47.265625];
 inputs.forEach((p,i)=>{
  if(expected[i]===null)assert.equal(m.inverse(p).status,'wall');
  else close(m.inverse(p).L_needed,expected[i],i===5?.001:1e-9);
 });
 close(m.inverse({A:1.3}).L_needed,3.698224852071006);
 close(m.inverse({h:.8}).L_needed,4.84);
 close(m.inverse({X:1.3}).L_needed,2.1025);
 close(m.inverse({X:3}).L_needed,16);
 close(m.forward({L:6.25}).X_out,2);
 assert.ok(m.forward({L:60}).X_out>m.forward({L:40}).X_out);
});


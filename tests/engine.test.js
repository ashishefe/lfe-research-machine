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
  const ranges={X:[1,4],s:[.1,.9],L:[.5,40],A:[.3,1.5],k:[.5,8],phi0:[.05,.95],phi1:[.05,.95],a:[.1,.9],sigma:[.2,3],lambda:[.3,1.5],h:[.3,1],b:[.5,2],T0:[1,6],W:[.5,5],beta:[0,1]};
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

const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const L=require('../site/experiments/fiddling-with-asi/loop.js');
test('closed form agrees with RK4 across regimes',()=>{let seed=42;const rand=()=>((seed=seed*16807%2147483647)/2147483647);for(let i=0;i<30;i++){const p={...L.defaults,phi:i%3===0?.3:i%3===1?.8:1.1,psi:i%3===1?.2:rand()*.15,lambda:1,boost:1+rand(),spending:1+rand()};const t=Math.min(.2,L.solve(p,0).vertical*.5), n=2000,h=t/n;let a=0;const f=(x,y)=>L.delta*p.boost*Math.exp(p.lambda*Math.log(p.spending)*x+(p.phi+p.lambda*p.psi-1)*y);for(let j=0;j<n;j++){const x=j*h,k1=f(x,a),k2=f(x+h/2,a+h*k1/2),k3=f(x+h/2,a+h*k2/2),k4=f(x+h,a+h*k3);a+=h*(k1+2*k2+2*k3+k4)/6}assert.ok(Math.abs(a/Math.LN2-L.solve(p,t).abilities)<1e-4)}});
test('regimes and defaults',()=>{assert.ok(L.solve(L.defaults,1).growth< L.solve(L.defaults,0).growth);assert.ok(Math.abs(L.solve(L.defaults,1).growth-2.08)<.01);assert.ok(Math.abs(L.needed(L.defaults)-.064/L.kappa)<1e-9);const line=L.presets[5];assert.ok(Math.abs(L.solve(line,2).growth-L.solve(line,0).growth)<1e-9);const above=L.presets[4],v=L.solve(above,0).vertical;assert.ok(Math.abs(v-1/((above.phi+above.psi-1)*L.delta))<1e-9);assert.equal(L.solve(above,v).abilities,Infinity)});
test('presets, spending and URL',()=>{const p=L.presets[1];assert.ok(Math.abs(L.solve(p,10).growth/L.solve(p,0).growth-1)<.01);assert.ok(Math.abs(Math.exp(25*L.kappa*(1-L.breakModel.phi))-4.16)<.1);assert.deepEqual(L.decode('?'+L.encode(L.presets[3])),L.presets[3]);assert.equal(L.presets[0].psi,0);assert.equal(L.presets[2].boost,1);assert.equal(L.presets[2].phi,L.breakModel.phi);assert.equal(L.presets[2].psi,0);assert.equal(L.presets[1].phi,L.breakModel.phi);assert.equal(L.presets[3].boost,4);assert.equal(L.presets[4].psi,.6);assert.equal(L.presets[5].psi,L.needed(L.defaults))});
test('fallback and navigation',()=>{const dirs=['intelligence-explosion','research-machine','spending-puzzle','fiddling-with-asi'];for(const d of dirs){const h=fs.readFileSync(`site/experiments/${d}/index.html`,'utf8');const nav=h.match(/<nav class="project-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];assert.equal((nav.match(/<a /g)||[]).length,4);assert.match(nav,/aria-current="page"/)}const h=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8');for(const id of ['abilities-chart','growth-chart','map'])assert.match(h,new RegExp(`id="${id}"`));assert.match(h,/class="equation[ "]/);assert.doesNotMatch(h,/NaN|Infinity/) });
test('default map labels have separate approximate bounding boxes',()=>{
 const vm=require('node:vm');const base='site/experiments/fiddling-with-asi/';const html=fs.readFileSync(base+'index.html','utf8');const css=fs.readFileSync(base+'styles.css','utf8');assert.match(css,/\.map-figure svg text,#map-grid text,#map-presets text\{font-size:20px\}/);
 const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',style:{},dataset:{},value:'',setAttribute(k,v){this[k]=String(v)},addEventListener(){},classList:{toggle(){},add(){}},firstChild:{}});return nodes.get(id)}
 const document={getElementById:node,querySelectorAll(){return []},querySelector(){return node('figure')},documentElement:node('root')};
 vm.runInNewContext(fs.readFileSync(base+'app.js','utf8'),{window:{AsiLoop:L},document,location:{search:'',pathname:'/',hash:''},history:{replaceState(){}},localStorage:{getItem(){return ''},setItem(){}},URLSearchParams,Math,Number,String});
 const map=html.match(/<svg id="map"[\s\S]*?<\/svg>/)[0];const fragments=map.replace('<g id="map-grid"></g>',node('map-grid').innerHTML).replace('<g id="map-presets"></g>',node('map-presets').innerHTML).replace(/<text id="drag-hint"[^>]*>/,`<text id="drag-hint" x="${node('drag-hint').x}" y="${node('drag-hint').y}">`).replace(/<text id="needed-label"[^>]*>[^<]*/,`<text id="needed-label" x="${node('needed-label').x}" y="${node('needed-label').y}" text-anchor="${node('needed-label')['text-anchor']}">${node('needed-label').textContent}`).replace(/<text id="line-label"[^>]*>/,`<text id="line-label" x="${node('line-label').x}" y="${node('line-label').y}">`);
 const boxes=[...fragments.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([,attrs,label])=>{const attr=n=>attrs.match(new RegExp(`\\b${n}="([^"]+)"`))?.[1];const x=Number(attr('x')),y=Number(attr('y')),w=20*.55*Array.from(label).length,anchor=attr('text-anchor');let left=x-(anchor==='middle'?w/2:anchor==='end'?w:0),top=y-20,right=left+w,bottom=y;if(attr('transform')){const cx=18,cy=270;[left,top,right,bottom]=[cx+top-cy,cy-(right-cx),cx+bottom-cy,cy-(left-cx)]}return {label,left,top,right,bottom}});
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${a.label} overlaps ${b.label}`)}
 for(const a of boxes){const lo=Math.max(0,(a.top-45)/450),hi=Math.min(1,(a.bottom-45)/450);if(lo<=hi)assert.ok(a.right<100+300*lo||a.left>100+300*hi,`${a.label} intersects diagonal`)}
 assert.ok(map.indexOf('id="map-dot"')<map.indexOf('id="map-presets"'));assert.match(css,/#map-presets\{pointer-events:none\}/);assert.match(css,/#map-presets circle\{fill:none;/);
 assert.equal((node('map-presets').innerHTML.match(/<circle /g)||[]).length,L.presets.filter(v=>v.psi>=.05).length);assert.match(html,/id="estimate-b"/);
});
test('doubling gaps and crossing calculations',()=>{const sets=[.01,L.needed(L.defaults),.60].map(psi=>({...L.defaults,psi}));const gaps=sets.map(p=>L.doublingGaps(p));assert.ok(gaps[0].every((v,i,a)=>!i||v>a[i-1]));assert.ok(gaps[1].every(v=>Math.abs(v-gaps[1][0])<1e-10));assert.ok(gaps[2].every((v,i,a)=>!i||v<a[i-1]));for(let i=1;i<=6;i++){const t=L.doublingTime(sets[2],i);assert.ok(t<L.solve(sets[2],0).vertical);assert.ok(Math.abs(L.solve(sets[2],t).abilities-i)<1e-8)}assert.ok(Math.abs(L.needed({...L.defaults,lambda:.5})-2*L.needed(L.defaults))<1e-10);assert.deepEqual(L.forces(L.defaults),{push:L.defaults.psi,pull:1-L.defaults.phi})});
test('calendar sentences use full doubling times across regimes',()=>{
 const p=L.defaults, sentence=L.liveSentence(p), first=Number(sentence.match(/next doubling takes about ([\d.]+) months/)[1]);
 assert.equal(first,Math.round(L.doublingTime(p,1)*12*10)/10);
 for(const t of [1,10]){const n=Math.floor(L.solve(p,t).abilities),before=L.doublingTime(p,n),after=L.doublingTime(p,n+1),gap=L.doublingFrom(p,t);assert.ok(before<=t&&t<after);assert.ok(Math.abs(gap-(after-before))<1e-10);assert.ok(sentence.includes(L.gapText(1/gap)));}
 assert.match(L.liveSentence({...p,psi:L.needed(p)}),/year ten/);assert.match(L.liveSentence({...p,psi:.6}),/goes vertical/);const boost={...p,boost:4},without={...boost,boost:1};assert.ok(L.liveSentence(boost).includes(`Without the boost, the next doubling takes about ${L.gapText(1/L.doublingTime(without,1))}`));assert.ok(L.presets.every(story=>story.lambda===1));
});

test('loop, infographic and gallery thumbnail text stays apart',()=>{
 const h=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8');
 const check=(svg,size)=>{const boxes=[...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([,a,label])=>{const attr=n=>a.match(new RegExp(`\\b${n}="([^"]+)"`))?.[1];const x=Number(attr('x')),y=Number(attr('y')),w=size*.55*Array.from(label).length,anchor=attr('text-anchor');const left=x-(anchor==='middle'?w/2:anchor==='end'?w:0);return {label,left,right:left+w,top:y-size,bottom:y}});for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${a.label} overlaps ${b.label}`)}};
 const loop=h.match(/<figure class="loop-figure">([\s\S]*?)<\/figure>/)[1];check(loop,16);
 const info=h.match(/<div class="infographic"[\s\S]*?<aside class="note">/)[0];const svgs=[...info.matchAll(/<svg\b[\s\S]*?<\/svg>/g)];assert.equal(svgs.length,3);svgs.forEach(m=>check(m[0],15));
 const gallery=h.match(/<div class="story-gallery"[\s\S]*?<p id="preset-message"/)[0];assert.equal((gallery.match(/class="story"/g)||[]).length,6);const thumbs=[...gallery.matchAll(/<svg\b[\s\S]*?<\/svg>/g)];assert.equal(thumbs.length,12);thumbs.forEach(m=>check(m[0],15));
});
test('gallery and later sections retain the requested copy and static drawings',()=>{const h=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8'),js=fs.readFileSync('site/experiments/fiddling-with-asi/app.js','utf8');for(const phrase of ['6. What it implies','7. What the model leaves out, and who is working on it','8. Takeaway: three questions, and what would change the answer','9. Sources','This is the pattern found across many fields','What would move you towards an explosion','Michael Kremer','Independent Assessment of AI R&amp;D Acceleration'])assert.ok(h.includes(phrase),phrase);assert.match(js,/abilities-chart'\)\.scrollIntoView/);assert.equal((h.match(/class="story-figures"/g)||[]).length,6)});

test('dial strips track values and keep label rows apart',()=>{
 const vm=require('node:vm'),nodes=new Map(),handlers={};
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',style:{},dataset:{},value:'',setAttribute(k,v){this[k]=String(v)},addEventListener(type,fn){handlers[id+type]=fn},classList:{toggle(){},add(){}},firstChild:{}});return nodes.get(id)}
 const document={getElementById:node,querySelectorAll(){return []},querySelector(){return node('figure')},documentElement:node('root')};
 vm.runInNewContext(fs.readFileSync('site/experiments/fiddling-with-asi/app.js','utf8'),{window:{AsiLoop:L},document,location:{search:'',pathname:'/',hash:''},history:{replaceState(){}},localStorage:{getItem(){return ''},setItem(){}},URLSearchParams,Math,Number,String});
 const markers=id=>[...node('context-'+id).innerHTML.matchAll(/<circle cx="([\d.]+)%"/g)].map(m=>Number(m[1]));
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
 close(markers('phi')[1],L.breakModel.phi/1.5*100);close(markers('psi')[1],L.defaults.psi*100);close(markers('psi')[2],L.needed(L.defaults)*100);close(markers('lambda')[1],.8/1.3*100);close(markers('boost')[0],.85/9*100);close(markers('spending')[2],(L.multiplier(L.breakModel)-1)/7*100);
 for(const id of ['phi','psi','lambda','boost','spending']){const html=node('context-'+id).innerHTML;const labels=[...html.matchAll(/class="strip-label" style="--position:([\d.]+)%;--row:(\d+)">([^<]+)<\/span>/g)];const dots=markers(id);assert.equal(labels.length,dots.length);labels.forEach((label,i)=>{close(Number(label[1]),dots[i]);assert.equal(Number(label[2]),i);assert.ok(label[3].length>0)});}

 handlers.spendinginput({target:{value:2}});assert.match(node('spending-map-message').textContent,/Spending is growing 2× a year/);handlers.spendinginput({target:{value:1}});assert.equal(node('spending-map-message').textContent,'');handlers.phiinput({target:{value:1.1}});assert.match(node('forces').innerHTML,/Pull: none \(φ above 1\)/);
 handlers.phiinput({target:{value:.7}});close(markers('psi')[2],30);handlers.lambdainput({target:{value:.5}});close(markers('psi')[2],60);assert.equal(node('map-presets').opacity,'0.3');assert.match(node('story-map-message').textContent,/Numbered stories assume λ = 1/);handlers.lambdainput({target:{value:1}});assert.equal(node('map-presets').opacity,'1');assert.equal(node('story-map-message').textContent,'');handlers.psiinput({target:{value:.6}});assert.match(node('compute-caveat').textContent,/no limit on computing/);handlers.psiinput({target:{value:0}});assert.equal(node('compute-caveat').textContent,'');
 for(const lambda of [.2,.5,1,1.5]){handlers.lambdainput({target:{value:lambda}});const x=Number(node('line-label').x),y=Number(node('line-label').y);assert.ok(x>=100&&x<=400&&y>=45&&y<=495);close((x-14-100)/300+lambda*(495-y)/450,1) /* label sits 14 units right of the line */}
 assert.match(node('needed-label').textContent,/^ψ must reach /);assert.match(node('map-multiple').textContent,/^ψ must reach /);handlers.psiinput({target:{value:0}});assert.match(node('needed-label').textContent,/^ψ must reach /);handlers.psiinput({target:{value:1}});assert.equal(node('needed-label').textContent,'at or above the line');
});

test('loop and infographic text avoids their drawn nodes and lines',()=>{
 const h=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8');
 const textBoxes=svg=>[...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([,a,t])=>{const get=n=>a.match(new RegExp(`\\b${n}="([^"]+)"`))?.[1],x=+get('x'),y=+get('y'),size=svg.includes('700 450')?16:15,w=size*.55*Array.from(t).length,anchor=get('text-anchor'),left=x-(anchor==='middle'?w/2:anchor==='end'?w:0);return {label:t,left,right:left+w,top:y-size,bottom:y}});
 const touches=(b,x,y)=>x>b.left&&x<b.right&&y>b.top&&y<b.bottom;
 const loop=h.match(/<figure class="loop-figure">([\s\S]*?)<\/figure>/)[1],boxes=textBoxes(loop);
 const points=[[350,75],[471,285],[229,285]];for(let x=12;x<=202;x++)points.push([x,215]);
 // Samples follow the three circular arrow arcs, including their end points.
 for(let deg=-83;deg<=-7;deg++)points.push([350+140*Math.cos(deg*Math.PI/180),215+140*Math.sin(deg*Math.PI/180)]);
 for(let deg=34;deg<=146;deg++)points.push([350+140*Math.cos(deg*Math.PI/180),215+140*Math.sin(deg*Math.PI/180)]);
 for(let deg=187;deg<=263;deg++)points.push([350+140*Math.cos(deg*Math.PI/180),215+140*Math.sin(deg*Math.PI/180)]);
 for(const b of boxes)for(const [x,y] of points)assert.ok(!touches(b,x,y),`${b.label} touches loop drawing`);
 const info=h.match(/<div class="infographic"[\s\S]*?<aside class="note">/)[0];for(const [svg] of info.matchAll(/<svg\b[\s\S]*?<\/svg>/g)){for(const b of textBoxes(svg))for(const [,attrs] of svg.matchAll(/<line\b([^>]*)\/>/g)){const get=n=>+attrs.match(new RegExp(`\\b${n}="([^"]+)"`))[1],x1=get('x1'),x2=get('x2'),y1=get('y1'),y2=get('y2');for(let i=0;i<=100;i++)assert.ok(!touches(b,x1+(x2-x1)*i/100,y1+(y2-y1)*i/100),`${b.label} touches a line`)}}
});

test('bottom prompt sends the reader back to the loop, and the loop speed follows the model', () => {
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '../site/experiments/fiddling-with-asi/index.html'), 'utf8');
  assert.match(html, /<section id="the-loop">/);
  assert.match(html, /id="loop-return"[^]*href="#the-loop"/);
  assert.match(html, /id="loop-runner"/);
  const L = require('../site/experiments/fiddling-with-asi/loop.js'), today = L.delta / Math.LN2;
  const at = (psi, t) => L.solve({ ...L.defaults, psi }, t).growth / today;
  assert.ok(at(0.02, 5) < at(0.02, 0));
  assert.ok(Math.abs(at(L.needed(L.defaults), 5) - at(L.needed(L.defaults), 0)) < 1e-6);
  assert.ok(at(0.6, 1) > at(0.6, 0));
});

test('Garicano and Imas break model story settles near 25 points',()=>{assert.equal(L.presets[2].spending,4);assert.ok(Math.abs(L.solve(L.presets[2],10).growth*5-25)<1);assert.ok(Math.abs(L.needed({...L.defaults,phi:.84,lambda:.75})-.2133333333)<1e-8)});
test('sources all link to their works',()=>{const h=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8');const list=h.match(/<h2>9. Sources<\/h2><ul>([\s\S]*?)<\/ul>/)[1];for(const item of list.match(/<li>[\s\S]*?<\/li>/g))assert.match(item,/<a href=/)});

test('calibration, per-doubling explanation, and URL preserve source values',()=>{
 const sources=require('../data/sources.json').entries, get=id=>sources.find(x=>x.id===id).value;
 assert.equal(L.defaults.phi,1-get('betaBefore')/L.kappa);assert.equal(L.defaults.psi,(get('betaBefore')-get('betaAfter'))/L.kappa);assert.equal(L.breakModel.phi,1-get('betaBreak')/L.kappa);assert.ok(Math.abs(L.delta/L.kappa-29.3)<1e-12);assert.deepEqual(L.decode('?'+L.encode(L.defaults)),L.defaults);
 const html=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8');for(const [id,value] of [['default-psi',L.defaults.psi.toFixed(3)],['needed',L.needed(L.defaults).toFixed(2)],['current-effort',Math.round((2**L.defaults.psi-1)*100)],['line-effort',Math.round((2**L.needed(L.defaults)-1)*100)],['break-multiplier',L.multiplier(L.breakModel).toFixed(1)],['break-comparison',Math.round(Math.exp(25*L.kappa*(1-L.breakModel.phi)))]])assert.ok(html.includes(`data-derived="${id}">${value}</span>`),id);
 assert.doesNotMatch(html+fs.readFileSync('site/experiments/fiddling-with-asi/app.js','utf8'),/more AI help needed|times the research help|no help from AI/);
});

test('static examples and source bundle follow the engine',()=>{
 const vm=require('node:vm'),html=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8'),context={window:{}};
 vm.runInNewContext(fs.readFileSync('site/experiments/fiddling-with-asi/sources.js','utf8'),context);
 const entries=require('../data/sources.json').entries;
 for(const entry of context.window.ASI_SOURCES.entries) assert.equal(entry.value,entries.find(e=>e.id===entry.id).value);
 const info=html.match(/<div class="infographic"[\s\S]*?<aside class="note">/)[0],svgs=[...info.matchAll(/<svg\b[\s\S]*?<\/svg>/g)];
 [.01,.41,.6].forEach((psi,i)=>{const p={...L.defaults,phi:.59,psi},values=[...svgs[i][0].matchAll(/>(\d+\.\d) mo<\/text>/g)].map(m=>m[1]);assert.deepEqual(values,L.doublingGaps(p).map(x=>(x*12).toFixed(1)));});
 assert.ok(html.includes(L.liveSentence(L.defaults)));assert.match(html,/sources\.js\?v=\d+/);
});

test('both maps keep labels apart from each other and the diagonal',()=>{
 const pages=['site/experiments/fiddling-with-asi/index.html','site/experiments/intelligence-explosion/index.html'];
 for(const [index,file] of pages.entries()){
  const html=fs.readFileSync(file,'utf8'),svg=index?html.match(/<svg viewBox="0 0 420 390"[\s\S]*?<\/svg>/)[0]:html.match(/<svg id="map"[\s\S]*?<\/svg>/)[0];
  const boxes=[...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([,a,label])=>{const attr=n=>a.match(new RegExp(`\\b${n}="([^"]+)"`))?.[1],x=+attr('x'),y=+attr('y'),size=Number(a.match(/font-size:(\d+)px/)?.[1]||(a.includes('phi-region')?13:index?15:20)),w=size*.55*Array.from(label).length,anchor=attr('text-anchor');let left=x-(anchor==='middle'?w/2:anchor==='end'?w:0),top=y-size,right=left+w,bottom=y;if(attr('transform')){const cx=index?22:18,cy=index?180:270;[left,top,right,bottom]=[cx+top-cy,cy-(right-cx),cx+bottom-cy,cy-(left-cx)]}return {label,left,right,top,bottom}});
  for(let i=0;i<boxes.length;i++){const a=boxes[i];for(let j=i+1;j<boxes.length;j++){const b=boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${file}: ${a.label} overlaps ${b.label}`)}
   const [x0,y0,x1,y1]=index?[60,30,280,330]:[100,45,400,495];const lo=Math.max(0,(a.top-y0)/(y1-y0)),hi=Math.min(1,(a.bottom-y0)/(y1-y0));if(lo<=hi){const l=x0+lo*(x1-x0),r=x0+hi*(x1-x0);assert.ok(a.right<l||a.left>r,`${file}: ${a.label} intersects diagonal`)}
  }
 }
});

test('map estimate markers follow the shared source coefficients',()=>{
 const html=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8'),hub=fs.readFileSync('site/experiments/intelligence-explosion/index.html','utf8');
 for(const [id,p] of [['a',L.defaults],['b',L.breakModel]]){const tag=html.match(new RegExp(`<circle id="estimate-${id}"[^>]+>`))[0];const get=k=>+tag.match(new RegExp(`${k}="([^"]+)"`))[1];assert.ok(Math.abs(get('cx')-(100+300*p.phi))<1e-9);assert.ok(Math.abs(get('cy')-(495-450*p.psi))<1e-9)}
 const marks=[...hub.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="4" fill="var\(--red\)"\/>/g)];assert.equal(marks.length,2);for(const [i,p] of [L.defaults,L.breakModel].entries()){assert.ok(Math.abs(+marks[i][1]-(60+220*p.phi))<.006);assert.ok(Math.abs(+marks[i][2]-(330-300*p.psi))<.006)}
 for(const page of [html,hub]){assert.match(page,/Regions assume spending is held fixed\./);assert.match(page,/Selected estimates, not a margin of error/);assert.match(page,/φ above 1:/);assert.match(page,/past progress helps more \(φ\)/)}
});

test('boost lesson and story five carry the requested caveat',()=>{const h=fs.readFileSync('site/experiments/fiddling-with-asi/index.html','utf8'),app=fs.readFileSync('site/experiments/fiddling-with-asi/app.js','utf8');assert.match(app,/Permanent productivity step \(applied once\)/);assert.ok(h.includes('Below the line, with spending unchanged, a permanent rise in research productivity gives a jump in growth that then fades; above the line it brings the explosion forward.'));assert.match(h,/data-preset="4"[^]*?This model has no limit on computing for experiments or for running the AI itself; section 7 covers that\.[^]*?<\/button>/);});

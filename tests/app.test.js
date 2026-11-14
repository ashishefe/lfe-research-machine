// Script integration in a small DOM stand-in. These checks do not replace browser QA.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const dir=__dirname+'/../site/experiments/research-machine/';
function boot(mobile=false,reduced=false,dom=false,hash='') {
 const nodes=new Map(),listeners={},media=[],html=fs.readFileSync(dir+'index.html','utf8');
 class SvgNode {
  constructor(tag,attrs='',parent=null){this.tag=tag;this.parent=parent;this.children=[];this.dataset={};this.attrs={};this.textContent='';for(const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g))this.setAttribute(m[1],m[2]);}
  setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
  getAttribute(k){return this.attrs[k];}
  querySelectorAll(selector){const all=this.children.flatMap(c=>[c,...c.querySelectorAll('*')]);return all.filter(c=>selector==='*'||selector==='details'&&c.tag==='details'||selector==='svg'&&c.tag==='svg'||selector==='desc'&&c.tag==='desc'||selector==='text.value'&&c.tag==='text'&&c.attrs.class==='value'||selector==='.live-footer'&&c.attrs.class==='live-footer'||selector==='.dot'&&c.attrs.class==='dot');}
  querySelector(s){return this.querySelectorAll(s)[0];}
  closest(s){return s==='[hidden]'?(this.parent?.hidden?this.parent:this.parent?.closest?.(s)):null;}
  replaceWith(next){const list=this.parent.children;list[list.indexOf(this)]=next;next.parent=this.parent;}
  get previousElementSibling(){return this.parent.children[this.parent.children.indexOf(this)-1];}
  getTotalLength(){const nums=this.attrs.d.match(/[\d.]+/g).map(Number);let length=0;for(let i=2;i<nums.length;i+=2)length+=Math.hypot(nums[i]-nums[i-2],nums[i+1]-nums[i-1]);return length;}
  getPointAtLength(d){return {x:d,y:0};}
  pauseAnimations(){} unpauseAnimations(){}
 }
 function parseSvg(html,parent){const root=new SvgNode('root','',parent),stack=[root];for(const m of html.matchAll(/<([^>]+)>|([^<]+)/g)){
  if(m[2]){stack.at(-1).textContent+=m[2];continue;}
  if(m[1][0]==='/'){stack.pop();continue;}
  const tag=m[1].match(/^([\w-]+)/)?.[1];if(!tag)continue;
  const node=new SvgNode(tag,m[1],stack.at(-1));stack.at(-1).children.push(node);if(!m[1].endsWith('/'))stack.push(node);
 }return root;}
 class El {
  constructor(id,attrs='') {this.id=id;this.attrs={};this.listeners={};this.dataset={};this.hidden=false;this.innerHTML='';this.textContent='';this.parent={hidden:false};for(const a of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){this.attrs[a[1]]=a[2];if(a[1].startsWith('data-'))this.dataset[a[1].slice(5)]=a[2];}this.value=this.attrs.value||'';this.min=this.attrs.min;this.max=this.attrs.max;}
  addEventListener(k,fn){this.listeners[k]=fn;} setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  closest(selector){return selector==='label'?this.parent:null;}
  get innerHTML(){return this.raw||'';} set innerHTML(value){this.raw=value;this.tree=null;}
  querySelectorAll(selector){if(!this.tree)this.tree=parseSvg(this.raw,this);return this.tree.querySelectorAll(selector);}
  querySelector(selector){return dom?this.querySelectorAll(selector)[0]:{pauseAnimations(){},unpauseAnimations(){}};}
  focus(){document.activeElement=this;} setCustomValidity(v){this.validityMessage=v;}get valueAsNumber(){return Number(this.value);}
 }
 for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g))nodes.set(tag[1],new El(tag[1],tag[0]));
 const inputs=[...nodes.values()].filter(n=>n.dataset.key),outputs=[...html.matchAll(/<output[^>]*data-output="([^"]+)"[^>]*>/g)].map((m,i)=>{const e=new El('out'+i);e.dataset.output=m[1];return e;});
 const radios=['cd','ces'].map(v=>{const e=new El(v);e.value=v;return e;});
 const tabs=new El('tabs');
 const document={documentElement:new El('html'),hidden:false,activeElement:null,getElementById:id=>nodes.get(id),addEventListener:(k,fn)=>listeners[k]=fn,
 querySelector:()=>tabs,querySelectorAll:selector=>selector==='#equations details, #derivation details'?['equations','derivation'].flatMap(id=>nodes.get(id).querySelectorAll('details')):selector==='[data-key]'?inputs:selector==='[data-output]'?outputs:selector==='[name="form"]'?radios:dom&&selector==='.diagram .dot'?['diagram-machine','diagram-workings'].flatMap(id=>nodes.get(id).querySelectorAll('.dot')):[]};
 const location={hash,pathname:'/index.html',search:''};
 const window={listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}};
 if(dom)window.requestAnimationFrame=fn=>window.frame=fn;
 if(dom)document.createElement=()=>new El('scratch');
 const context={setTimeout,clearTimeout,window,document,location,history:{replaceState(a,b,url){location.hash=url.startsWith('#')?url:'';}},matchMedia:q=>{const m={matches:q.includes('760')?mobile:reduced,addEventListener(){}};media.push(m);return m;},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync(dir+'engine.js','utf8'),context);vm.runInContext(fs.readFileSync(dir+'help.js','utf8'),context);vm.runInContext(fs.readFileSync(dir+'app.js','utf8'),context);
 const input=(key,value)=>{const e=inputs.find(e=>e.dataset.key===key);e.value=String(value);e.listeners.input();};
 return {nodes,inputs,radios,window,input,location,listeners,document,media};
}
function assertFiniteMarkup(app) {
 for(const [id,e] of app.nodes)assert.doesNotMatch(e.innerHTML,/NaN|Infinity/,id);
}
test('classic-script engine and app boot, tabs and shared controls',()=>{
 const app=boot();assert.match(app.nodes.get('inverse-readout').innerHTML,/6.25x/);
 app.input('A',.8);assert.match(app.nodes.get('inverse-readout').innerHTML,/9.77x/);
 assert.equal(app.inputs.find(e=>e.id==='work-A').value,.8);
 app.nodes.get('tab-machine').listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(app.document.documentElement.attrs['data-view'],'workings');assert.equal(app.nodes.get('tab-workings').attrs['aria-selected'],'true');assert.equal(app.location.hash,'#workings');
 app.radios[1].listeners.change();assert.equal(app.nodes.get('work-sigma').value,.75);
 assert.match(app.nodes.get('equations').innerHTML,/CES/);assertFiniteMarkup(app);
});
test('every control endpoint renders finite markup, wide and narrow, motion and reduced',()=>{
 for(const mobile of [false,true])for(const reduced of [false,true]) {
  const app=boot(mobile,reduced);
  for(const input of app.inputs)for(const edge of ['min','max']) {
   const value=input[edge];if(value===undefined||Number(value)<=0)continue;
   app.input(input.dataset.key,Number(value));assertFiniteMarkup(app);
   app.listeners.click({target:{closest:s=>s==='[data-reset]'?{}:null}});
  }
  const diagram=app.nodes.get('diagram-machine').innerHTML;
  assert.match(diagram,/class="dot" data-rate=/);
  assert.doesNotMatch(diagram,/animateMotion/);
  if(mobile)assert.match(app.nodes.get('diagram-workings').innerHTML,/φ₀/);
 }
});
test('large finite time-path chart, initial wall, and G below one',()=>{
 const app=boot();const extreme={X:4,s:.1,A:1.5,k:.5,phi0:.05,phi1:.05,a:.1,sigma:1,lambda:1.5,h:1,b:2,T0:6,W:5,beta:1};
 for(const [k,v] of Object.entries(extreme))app.input(k,v);
 assertFiniteMarkup(app);
 app.listeners.click({target:{closest:s=>s==='[data-reset]'?{}:null}});
 app.input('sigma',.5);assert.match(app.nodes.get('chart-time').innerHTML,/Wall at year 0/);
 app.input('sigma',1);app.input('X',1);app.input('k',2);
 assert.match(app.nodes.get('equations').innerHTML.replace(/<[^>]+>/g,''),/D\(5\) ≈ −1\s+A\(5\) ≈ 1.1892/);
});

const textOf=html=>html.replace(/<[^>]+>/g,'');
test('equations and derivation use true mathematical markup, including CES and zero-labour statuses',()=>{
 const app=boot();
 for(const sigma of [1,.75,.5,2]) {
  app.input('sigma',sigma);
  const html=app.nodes.get('equations').innerHTML, steps=app.nodes.get('derivation').innerHTML;
  assert.doesNotMatch(textOf((html+steps).replace(/<(?:sub|sup)>[\s\S]*?<\/(?:sub|sup)>/g,'')),/[\^_]|φ[01]|\b(?:T0|g0|c0|L0|K0|Xe|Cr)\b/);
  assert.match(html,/<sup>/);assert.match(html,/<sub>0<\/sub>/);assert.match(html,/<var>φ<\/var><sub>1<\/sub>/);
  assert.doesNotMatch(textOf(steps),/\. ≈/);
  if(sigma===.5)assert.match(textOf(steps),/No finite L reaches the target/);
  else assert.match(textOf(steps),/L ≈ [\d.]+x/);
 }
 app.input('X',1);app.input('k',8);assert.match(textOf(app.nodes.get('derivation').innerHTML),/L = 0/);
 const fallback=fs.readFileSync(dir+'index.html','utf8');assert.doesNotMatch(fallback.replace(/<[^>]+>/g,' '),/[\^_]|φ[01]/);
});
test('results lead the diagram; embedded meter and compact result track inputs',()=>{
 const html=fs.readFileSync(dir+'index.html','utf8');assert.ok(html.indexOf('id="forward-readout"')<html.indexOf('id="diagram-machine"'));
 const app=boot(true);assert.match(app.nodes.get('compact-readout').textContent,/Progress 2x · Labour 6.25x/);
 const before=app.nodes.get('diagram-machine').innerHTML;
 app.input('L',20);const after=app.nodes.get('diagram-machine').innerHTML;
 assert.notEqual(before.match(/<circle cx="([^"]+)" cy="37"/)[1],after.match(/<circle cx="([^"]+)" cy="37"/)[1]);
 assert.match(after,/Index pace .*METR mark 2x. METR would not be surprised by 1.3x or 3x/);
 assert.match(app.nodes.get('compact-readout').textContent,/Progress 3.31x/);
});
test('charts use whole-number forward ticks and decade time ticks, including zero and numeric-limit paths',()=>{
 const app=boot(), forward=app.nodes.get('chart-forward').innerHTML, time=app.nodes.get('chart-time').innerHTML;
 const ticks=html=>[...html.matchAll(/text-anchor="end">([^<]+)x<\/text>/g)].map(m=>m[1]);
 assert.ok(ticks(forward).every(v=>/^[-\d,]+$/.test(v)));
 assert.deepEqual(ticks(time),['1','10','100','1,000','10,000']);
 app.window.ResearchMachine.walkTimePath=()=>({points:[{t:0,L_needed:1,status:'ok'},{t:5,L_needed:Number.MAX_VALUE,status:'ok'}],last:{t:5,L_needed:Number.MAX_VALUE,status:'ok'},status:'ok',wallYear:null,L5:Number.MAX_VALUE});
 app.input('L',7);assertFiniteMarkup(app);
 app.window.ResearchMachine.walkTimePath=()=>({points:[{t:0,L_needed:0,status:'none-needed'},{t:5,L_needed:0,status:'none-needed'}],last:{t:5,L_needed:0,status:'none-needed'},status:'none-needed',wallYear:null,L5:0});
 app.input('L',8);assert.match(app.nodes.get('chart-time').innerHTML,/No labour needed \(0x\)/);assertFiniteMarkup(app);
});

test('phase card, sensitivity, negative progress and readable statuses',()=>{
 const app=boot(true);
 app.input('k',2);
 assert.match(textOf(app.nodes.get('equations').innerHTML),/At year 5:[\s\S]*400x/);
 assert.match(app.nodes.get('time-sensitivity').textContent,/T₀ = 1.*T₀ = 6/);
 for(const [k,v] of Object.entries({k:.5,phi0:.05,phi1:.95,W:.5,T0:1,L:.5,A:.3,s:.1,h:.3,b:.5}))app.input(k,v);
 const sentence='The reported index would fall in this setting. The cut in training compute outweighs research.';
 assert.equal(app.nodes.get('forward-readout').innerHTML,sentence);
 assert.ok(app.nodes.get('compact-readout').textContent.startsWith(sentence));
 assert.match(textOf(app.nodes.get('diagram-machine').innerHTML),/The reported index would fall in this setting\. The cut in training compute outweighs research\./);
 assert.doesNotMatch(app.nodes.get('diagram-machine').innerHTML,/-[\d.]+x/);
 app.listeners.click({target:{closest:s=>s==='[data-reset]'?{}:null}});
 app.input('sigma',.5);
 assert.doesNotMatch(app.nodes.get('compact-readout').textContent,/Labour Wall/);
 assert.doesNotMatch(app.nodes.get('chart-time').innerHTML,/Labour starts at/);
 const steps=textOf(app.nodes.get('derivation').innerHTML);assert.equal((steps.match(/No finite L reaches/g)||[]).length,1);
 const eq=app.nodes.get('equations').innerHTML;
 assert.match(eq.replace(/<button[^>]*>|<\/button>/g,''),/<span class="math-power"><var>L<\/var><sup>/);
 assert.match(eq,/<ul class="definitions"><li><var>C<\/var> —/);
 assert.match(app.nodes.get('diagram-workings').innerHTML,/role="group"/);
 assert.match(app.nodes.get('diagram-workings').innerHTML,/<a href="#research" tabindex="0"/);
 assert.match(app.nodes.get('chart-forward').innerHTML,/class="target-line"/);
});

test('diagram patches preserve dots, update rates and pause without restarting',()=>{
 const app=boot(false,false,true),diagram=app.nodes.get('diagram-machine');
 const svg=diagram.querySelector('svg'),dot=diagram.querySelectorAll('.dot')[0];
 app.window.frame(0);app.window.frame(100);
 const before=dot.distance;assert.ok(before>0);
 app.input('L',20);
 assert.equal(diagram.querySelector('svg'),svg);assert.equal(diagram.querySelectorAll('.dot')[0],dot);
 assert.equal(dot.distance,before);assert.equal(dot.dataset.rate,'20');
 app.window.frame(200);assert.ok(dot.distance>before);
 app.document.hidden=true;const frozen=dot.distance;app.window.frame(300);assert.equal(dot.distance,frozen);
 app.document.hidden=false;app.media[1].matches=true;app.window.frame(400);assert.equal(dot.distance,frozen);
 app.media[1].matches=false;dot.distance=dot.previousElementSibling.getTotalLength()-1;app.window.frame(500);
 assert.ok(dot.distance<dot.previousElementSibling.getTotalLength());
 const short=diagram.querySelectorAll('.dot')[1],long=diagram.querySelectorAll('.dot')[3];short.distance=0;long.distance=0;
 app.window.frame(600);assert.equal(short.distance,long.distance);
});
test('equation bookmarks survive load and skip link selects machine',()=>{
 const app=boot(false,false,false,'#research');assert.equal(app.location.hash,'#research');assert.equal(app.document.documentElement.attrs['data-view'],'workings');
 app.nodes.get('tab-machine').listeners.click();assert.equal(app.location.hash,'');
 app.location.hash='#main';app.window.listeners.hashchange();assert.equal(app.document.documentElement.attrs['data-view'],'machine');
 app.location.hash='#compute-link';app.window.listeners.hashchange();assert.equal(app.document.documentElement.attrs['data-view'],'workings');assert.equal(app.location.hash,'#compute-link');
});

test('nonpositive wall ceiling uses words in every result and derivation',()=>{
 const app=boot();
 for(const [k,v] of Object.entries({k:.5,phi0:.05,phi1:.95,W:.5,T0:1,L:.5,A:.3,s:.1,h:.3,b:.5,sigma:.2}))app.input(k,v);
 assert.ok(app.window.ResearchMachine.inverse({k:.5,phi0:.05,phi1:.95,W:.5,T0:1,L:.5,A:.3,s:.1,h:.3,b:.5,sigma:.2}).X_max<0);
 for(const id of ['forward-readout','inverse-readout','compact-readout','time-sensitivity','derivation','equations','diagram-machine']) {
  const e=app.nodes.get(id);assert.doesNotMatch(textOf(e.innerHTML+' '+e.textContent),/[−-][\d,.]+x/,id);
 }
 assert.equal(app.nodes.get('inverse-readout').innerHTML,"No amount of research labour reaches METR's 2x here.");
});


test('index mapping can stop progress without cutting training',()=>{
 const app=boot();for(const [k,v] of Object.entries({h:.3,b:.5,L:.5}))app.input(k,v);
 const sentence='The reported index would fall in this setting. At these values of h and b, the reported index reading falls to zero or below.';
 assert.equal(app.nodes.get('forward-readout').innerHTML,sentence);
 assert.ok(app.nodes.get('compact-readout').textContent.startsWith(sentence));
 assert.match(app.nodes.get('diagram-machine').innerHTML,/[Aa]t these values of h and b/);
 assert.match(app.nodes.get('chart-forward').innerHTML,/The reported index would fall in this setting\. At these values/);
 assert.doesNotMatch(app.nodes.get('chart-forward').innerHTML,/, No progress/);
});
test('time card, chart and sensitivity all stop at the first wall',()=>{
 const app=boot();assert.match(textOf(app.nodes.get('equations').innerHTML),/L\(5\) = 1,130x/);
 app.input('sigma',.75);
 for(const id of ['equations','chart-time']) assert.match(textOf(app.nodes.get(id).innerHTML),/Wall at year/);
 assert.doesNotMatch(textOf(app.nodes.get('equations').innerHTML),/D\(5\) ≈|L\(5\) =|ceiling/);
 app.input('sigma',.5);
 assert.match(app.nodes.get('time-sensitivity').textContent,/with T₀ = 1: wall from the start. With T₀ = 6: wall from the start/);
 assert.match(textOf(app.nodes.get('equations').innerHTML),/Wall from the start/);
 // With a temporary compute cut the year-five solution can recover after an earlier wall.
 for(const [k,v] of Object.entries({k:.75,phi1:2/3,W:1,beta:0,sigma:.6}))app.input(k,v);
 const m=app.window.ResearchMachine, params={k:.75,phi1:2/3,W:1,beta:0,sigma:.6};
 assert.equal(m.timePoint(params,5).status,'ok');assert.equal(m.walkTimePath(params).wallYear,0);
 assert.match(app.nodes.get('time-sensitivity').textContent,/T₀ = 1: wall from the start/);
});
test('count experiment dial once; preserve typed decimal levels',()=>{
 const app=boot();app.input('E',2);assert.match(app.nodes.get('changed').innerHTML,/1 setting differs/);
 for(const key of ['L0','K0']) {
  const input=app.nodes.get('work-'+key);input.type='number';app.document.activeElement=input;
  input.value='100.';input.listeners.input();assert.equal(input.value,'100.');
  input.value='100.25';input.listeners.input();assert.equal(input.value,'100.25');assert.equal(input.validityMessage,'');
 }
 assert.match(app.nodes.get('levels').textContent,/100.25/);
});
test('readable derivations, round ticks, static precision and mobile bounds',()=>{
 const app=boot(true);app.input('sigma',.5);
 assert.doesNotMatch(textOf(app.nodes.get('derivation').innerHTML),/\.\./);
 app.input('X',1);app.input('k',8);assert.match(textOf(app.nodes.get('derivation').innerHTML),/L = 0. No labour needed\./);
 app.input('k',.5);app.input('W',.5);assert.match(textOf(app.nodes.get('derivation').innerHTML),/× 3 \+ 1/);
 for(const [key,value] of Object.entries({L:40,h:.3,b:.5,A:1.5,lambda:1.5,sigma:3}))app.input(key,value);
 const ticks=[...app.nodes.get('chart-forward').innerHTML.matchAll(/text-anchor="end">([\d,]+)x/g)].map(m=>Number(m[1].replaceAll(',','')));
 assert.ok(ticks.every(n=>n%10===0));
 const svg=app.nodes.get('diagram-machine').innerHTML;assert.match(svg,/L4 115 L4 455/);assert.match(svg,/viewBox="0 0 330 1045"/);
 const html=fs.readFileSync(dir+'index.html','utf8');assert.match(html,/<strong>2x<\/strong>/);assert.doesNotMatch(html,/<strong>2.0x/);
 assert.match(html,/Old pace means METR's baseline, March 2024 to October 2025/);
 assert.match(html,/Much of METR's evidence measures well-specified tasks/);
 assert.match(html,/Cobb-Douglas form, labour weight/);
 assert.match(html,/class="quiet meter-band-label static-only">METR would not be surprised by 1.3x or 3x/);
});


test('individual compute controls each count once',()=>{
 for(const [key,value] of Object.entries({k:2,phi0:.6,phi1:.6})) {
  const app=boot();app.input(key,value);assert.match(app.nodes.get('changed').innerHTML,/1 setting differs/);
 }
 const app=boot();app.input('E',2);app.input('A',.8);assert.match(app.nodes.get('changed').innerHTML,/2 settings differ/);
 app.input('E',1);assert.match(app.nodes.get('changed').innerHTML,/1 setting differs/);
 app.input('A',1);assert.equal(app.nodes.get('changed').hidden,true);
});


test('blocked-script CSS overrides dial display rules',()=>{
 const css=fs.readFileSync(dir+'styles.css','utf8');
 assert.match(css,/html:not\(\[data-interactive\]\) \.dial input\[type="range"\]/);
 assert.match(css,/html:not\(\[data-interactive\]\) \.dial input\[type="number"\]/);
 assert.match(css,/html:not\(\[data-interactive\]\) \.interactive-only,[\s\S]*?display: none/);
 assert.match(fs.readFileSync(dir+'index.html','utf8'),/class="static-only">Starting inputs/);
});


test('E counts once after a changed compute split or pool',()=>{
 for(const [key,value] of Object.entries({phi0:.6,phi1:.6,k:2})) {
  const app=boot();app.input(key,value);
  const originalE=Number(app.nodes.get('simple-E').value);
  app.input('E',4);assert.match(app.nodes.get('changed').innerHTML,/2 settings differ/);
  app.input('E',5);assert.match(app.nodes.get('changed').innerHTML,/2 settings differ/);
  app.input('E',originalE);assert.match(app.nodes.get('changed').innerHTML,/1 setting differs/);
  app.listeners.click({target:{closest:s=>s==='[data-reset]'?{}:null}});assert.equal(app.nodes.get('changed').hidden,true);
 }
});


test('experiment-only preset counts E and its solved labour',()=>{
 const app=boot();app.nodes.get('scenarios').listeners.click({target:{closest:()=>({dataset:{case:'2'}})}});
 assert.match(app.nodes.get('changed').innerHTML,/2 settings differ/);
});


test('E grouping survives subsequent compute edits and no-op events',()=>{
 for(const [key,value] of Object.entries({phi0:.6,phi1:.6,k:2})) {
  const app=boot();app.input('E',2);
  const prior=Number(app.nodes.get('work-'+key).value);app.input(key,prior);
  assert.match(app.nodes.get('changed').innerHTML,/1 setting differs/);
  app.input(key,value);assert.match(app.nodes.get('changed').innerHTML,/2 settings differ/);
 }
});

test('distinguish a causal training cut from an index-mapping failure',()=>{
 for(const mobile of [false,true]) {
  const app=boot(mobile,false,true);
  for(const [k,v] of Object.entries({h:.3,b:.5,L:.5,phi1:.51}))app.input(k,v);
  assert.match(app.nodes.get('forward-readout').innerHTML,/[Aa]t these values of h and b/);
  for(const id of ['diagram-machine','diagram-workings']) {
   const desc=app.nodes.get(id).querySelector('desc').textContent;
   assert.match(desc,/\. The reported index would fall in this setting\. At these values/);
   assert.doesNotMatch(desc,/produce No progress/);
  }
  // A cut that turns otherwise positive index progress nonpositive.
  for(const [k,v] of Object.entries({h:1,b:1,k:.5,W:.5,phi1:.5,L:.5}))app.input(k,v);
  assert.match(app.nodes.get('forward-readout').innerHTML,/[Tt]he cut in training compute/);
  app.input('b',2);
  assert.match(app.nodes.get('forward-readout').innerHTML,/the reported pace would be/);
  for(const id of ['diagram-machine','diagram-workings']) {
   const values=app.nodes.get(id).querySelectorAll('text.value');
   assert.match(values[6].textContent,/Pace |C × S/);
   assert.doesNotMatch(values[6].textContent,/No progress/);
   assert.doesNotMatch(values[7].textContent,/No progress/);
  }
 }
});
test('no-progress accessible description is a complete sentence',()=>{
 const app=boot();for(const [k,v] of Object.entries({h:.3,b:.5,L:.5}))app.input(k,v);
 for(const id of ['diagram-machine','diagram-workings']) {
  const desc=app.nodes.get(id).innerHTML.match(/<desc[^>]*>(.*?)<\/desc>/)[1];
  assert.match(desc,/\. The reported index would fall in this setting\./);assert.doesNotMatch(desc,/produce No progress/);
 }
});
test('uncertainty label sits inside the capability node below the meter',()=>{
 for(const mobile of [false,true]) {
  const app=boot(mobile);
  for(const id of ['diagram-machine','diagram-workings']) {
   const svg=app.nodes.get(id).innerHTML;
   const node=[...svg.matchAll(/<rect class="node" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)].at(-1).slice(1).map(Number);
   const meter=svg.match(/<svg x="([^"]+)" y="([^"]+)" width="([^"]+)" height="80"/).slice(1).map(Number);
   const label=svg.match(/<text class="meter-label" x="([^"]+)" y="([^"]+)">METR would not be<tspan x="([^"]+)" dy="18">surprised by 1.3x or 3x/).slice(1).map(Number);
   assert.ok(label[0]>node[0]&&label[0]<node[0]+node[2]);
   assert.ok(label[1]>meter[1]+80&&label[1]+18<node[1]+node[3]);
  }
 }
 const html=fs.readFileSync(dir+'index.html','utf8');
 assert.doesNotMatch(html,/<figcaption>Methods[^<]*METR would/);
});
test('sentence-opening statuses are capitalised; script notice survives failed loads',()=>{
 const app=boot();app.input('sigma',.5);
 assert.match(textOf(app.nodes.get('equations').innerHTML),/Wall from the start\./);
 assert.match(textOf(app.nodes.get('chart-time').innerHTML),/\. Wall from the start\./);
 assert.match(app.nodes.get('time-sensitivity').textContent,/T₀ = 1: wall from the start/);
 const html=fs.readFileSync(dir+'index.html','utf8');
 assert.match(html,/<p id="script-note" class="aside-rule">The dials need JavaScript/);
 assert.doesNotMatch(html,/<noscript>/);
 assert.equal(app.nodes.get('script-note').hidden,true);
 const source=fs.readFileSync(dir+'app.js','utf8');
 assert.ok(source.indexOf("$('script-note').hidden=true")>source.lastIndexOf('update();'));
 app.input('X',1.5);
 assert.match(textOf(app.nodes.get('equations').innerHTML),/Wall at year 0.51/);
});

test('every equation symbol has an entry, across CD and CES',()=>{
 const app=boot(), H=app.window.ResearchHelp;
 for(const sigma of [1,.75,.5,3]) {
  app.input('sigma',sigma);
  const equations=[...app.nodes.get('equations').innerHTML.matchAll(/<p class="formula">([\s\S]*?)<\/p>/g)];
  assert.equal(equations.length,5);
  for(const [,line] of equations) {
   const buttons=[...line.matchAll(/<button[^>]+data-help="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
   assert.ok(buttons.length>0);
   for(const [,key,content] of buttons){assert.ok(H.entries[key],key);assert.match(content,/<var>|<span>log|inner|max|min/);}
   assert.doesNotMatch(line.replace(/<button[^>]*>[\s\S]*?<\/button>/g,''),/<var>/,'Unexplained equation symbol');
  }
  for(const [,substitution] of app.nodes.get('equations').innerHTML.matchAll(/<p class="formula substitution">([\s\S]*?)<\/p>/g))assert.doesNotMatch(substitution,/<button/);
 }
 assert.throws(()=>H.equation('<var>z</var>'),/Missing explanation/);
});

test('explanations preserve every supplied word and start closed',()=>{
 const app=boot(),H=app.window.ResearchHelp,guideCopy=require('./expected-copy.json')["symbolGuide"];
 const keys=['S','C','Cr','L','E','A','g','g0','c','c0','G','F','Tg','a','sigma','rho','lambda','beta','k','phi0','W','T0','s','X','Xe','X_out','h','b','D(t)','A(t)','L0'];
 const rows=guideCopy.split('\n').filter(l=>l.startsWith('| ')).slice(1);
 const overridden=new Set(['L','E','a','sigma','lambda','phi0','W','L0']);
 rows.forEach((row,i)=>{if(overridden.has(keys[i]))return;const [,symbol,name,meaning,turn]=row.split('|').map(s=>s.trim());const entry=H.entries[keys[i]];assert.equal(entry.name,name,symbol);assert.equal(entry.meaning.replace('2<sup>−<var>β</var></sup>','2^−β'),meaning,symbol);assert.equal(entry.turn,turn,symbol);});
 const html=fs.readFileSync(dir+'index.html','utf8'),eq=app.nodes.get('equations').innerHTML;
 assert.equal((eq.match(/<summary>In plain English<\/summary>/g)||[]).length,5);
 assert.equal((eq.match(/<h4>Symbols<\/h4>/g)||[]).length,5);
 assert.doesNotMatch(eq,/<details open/);
 for(const text of Object.values(H.plain))assert.ok(eq.includes(text));
 for(const [,article] of eq.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g))assert.ok(article.indexOf('<details>')<article.indexOf('class="definitions"'));
 assert.equal((app.nodes.get('derivation').innerHTML.match(/<li>/g)||[]).length,4);
 for(const text of H.why)assert.ok(app.nodes.get('derivation').innerHTML.includes(text));
 assert.match(html,/<details><summary>About this model<\/summary>/);
 assert.ok(html.replace(/<[^>]+>/g,'').includes(guideCopy.match(/\*\*Guide, at the top of the workings:\*\*\s+"([^"]+)"/)[1]));
 assert.match(html,/Romer and Jones/);assert.match(html,/We did not estimate them/);
 const fallback=html.match(/id="equations">([\s\S]*?)<section class="parameters"/)[1];assert.doesNotMatch(fallback,/<button/);assert.match(fallback,/<details>/);
 for(const key of Object.keys(app.window.ResearchMachine.defaults))assert.ok(H.entries[key],key);
});

function helpHarness(mobile=false) {
 const events={},winEvents={},timers=new Map();let counter=0;
 const classList={values:{},toggle(key,value){this.values[key]=value;}};
 const content={innerHTML:''};
 const popover={hidden:true,offsetWidth:260,offsetHeight:180,style:{},classList,querySelector:()=>content,addEventListener:(k,fn)=>events['popover-'+k]=fn,matches:()=>false,contains:el=>el===content||el===popover};
 const document={body:{},activeElement:null,getElementById:()=>popover,querySelectorAll:()=>[],addEventListener:(k,fn)=>events[k]=fn};
 const window={addEventListener:(k,fn)=>winEvents[k]=fn};
 const context={window,document,innerWidth:mobile?375:1440,innerHeight:800,matchMedia:()=>({matches:mobile}),setTimeout:fn=>{timers.set(++counter,fn);return counter;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);vm.runInContext(fs.readFileSync(dir+'engine.js','utf8'),context);vm.runInContext(fs.readFileSync(dir+'help.js','utf8'),context);
 const H=window.ResearchHelp;H.setState(window.ResearchMachine.state());H.init();
 const trigger=(key,slider=false)=>({dataset:{help:key,...(slider?{slider:'true'}:{})},attrs:{},isConnected:true,setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},contains(el){return el===this;},closest(s){return s==='[data-help]'?this:null;},getBoundingClientRect:()=>({left:1400,top:700,bottom:725}),focus(){document.activeElement=this;events.focusin({target:this});}});
 const click=target=>events.click({target,preventDefault(){}});
 const outside={closest:()=>null};
 return {H,events,winEvents,document,popover,content,trigger,click,outside,timers,context};
}

test('focus then click stays open; live values, one popover, Close and Esc restore focus',()=>{
 const a=helpHarness(),L=a.trigger('L',true);L.focus();a.click(L);
 assert.equal(a.popover.hidden,false);assert.match(a.content.innerHTML,/Now: 6.25/);assert.match(a.content.innerHTML,/Turn it up: A faster pace of new methods\. With default weights and λ = 1, each extra unit adds less\./);
 const beta=a.trigger('beta',true);beta.focus();a.click(beta);assert.equal(L.attrs['aria-expanded'],'false');assert.equal(beta.attrs['aria-expanded'],'true');assert.match(a.content.innerHTML,/2<sup>−<var>β<\/var><\/sup>/);
 const close={closest:s=>s==='[data-help-close]'?{}:null};a.click(close);assert.equal(a.popover.hidden,true);assert.equal(a.document.activeElement,beta);
 L.focus();a.events.keydown({key:'Escape'});assert.equal(a.popover.hidden,true);assert.equal(a.document.activeElement,L);
 const h=a.trigger('h',true);h.focus();assert.doesNotMatch(a.content.innerHTML,/Turn it up/);a.click(a.outside);assert.equal(a.popover.hidden,true);
 a.H.setState({...windowDefaults(),L:10});L.focus();assert.match(a.content.innerHTML,/Now: 10/);
 function windowDefaults(){return {X:2,s:2/3,L:6.25,A:1,k:1,phi0:.5,phi1:.5,a:.5,sigma:1,lambda:1,h:1,b:1,T0:3,W:1,beta:.25,L0:100,K0:100};}
});

test('delayed hover, outside dismissal, internal scroll, and viewport placement',()=>{
 const a=helpHarness(),L=a.trigger('L');
 a.events.pointerover({target:L,pointerType:'mouse',relatedTarget:null});assert.equal(a.popover.hidden,true);assert.equal(a.timers.size,1);
 for(const fn of [...a.timers.values()])fn();assert.equal(a.popover.hidden,false);
 assert.ok(parseFloat(a.popover.style.left)+260<=1440);assert.ok(parseFloat(a.popover.style.top)+180<700);
 a.winEvents.scroll({target:a.content});assert.equal(a.popover.hidden,false);
 a.winEvents.scroll({target:a.document});assert.equal(a.popover.hidden,true);
 a.events.pointerover({target:L,pointerType:'mouse',relatedTarget:null});a.events.pointerout({target:L,relatedTarget:null});assert.equal(a.popover.hidden,true);
 const m=helpHarness(true),source=m.trigger('A');source.focus();assert.equal(m.popover.hidden,false);assert.equal(m.popover.style.top,'');assert.equal(m.popover.style.left,'');
 const chart=m.trigger('chart-forward-help');chart.focus();assert.ok(m.content.innerHTML.includes(m.H.charts['chart-forward-help']));
});

test('symbolic derivations, including ceilings, have complete help coverage',()=>{
 const app=boot();
 for(const sigma of [1,.75,.5,3]) {
  app.input('sigma',sigma);
  const steps=app.nodes.get('derivation').innerHTML;
  for(const [,key] of steps.matchAll(/data-help="([^"]+)"/g))assert.ok(app.window.ResearchHelp.entries[key],key);
  assert.doesNotMatch(steps.replace(/<button[^>]*>[\s\S]*?<\/button>/g,''),/<var>/);
 }
});
test('phone help fits above or below its source without shifting the page',()=>{
 for(const height of [320,800])for(const top of [10,height/2,height-30]) {
  const a=helpHarness(true);a.context.innerHeight=height;
  const source=a.trigger('L');source.getBoundingClientRect=()=>({left:20,top,bottom:top+20});source.focus();
  const maxHeight=parseFloat(a.popover.style.maxHeight);
  assert.ok(maxHeight>=0);
  if(a.popover.classList.values['top-sheet'])assert.ok(maxHeight<=top-8);
  else assert.ok(height-maxHeight>=top+20+8);
  assert.equal(a.popover.style.top,'');
 }
});
test('live help uses the target in derivations and words for no progress',()=>{
 const a=helpHarness(),M=a.H;
 M.setState({L:.5,h:.3,b:.5});const out=a.trigger('X_out');out.focus();assert.match(a.content.innerHTML,/Now: The reported index would fall in this setting/);
 M.setState({L:1});const xe=a.trigger('Xe');xe.focus();assert.match(a.content.innerHTML,/Now: 1<\/p>/);
 const needed=a.trigger('L');needed.closest=s=>s==='[data-help]'?needed:s==='#derivation'?{}:null;needed.focus();assert.match(a.content.innerHTML,/Now: 6.25<\/p>/);
 const derivation=a.trigger('Xe');derivation.closest=s=>s==='[data-help]'?derivation:s==='#derivation'?{}:null;derivation.focus();assert.match(a.content.innerHTML,/Now: 2<\/p>/);
});

test('exact corrected copy and independent phi entries',()=>{
 const {window:{ResearchHelp:H}}=boot();
 assert.equal(H.entries.phi0.meaning,'The share of compute that went to experiments before the change.');
 assert.equal(H.entries.phi0.turn,'Less experiment compute and more training compute, compared with baseline.');
 assert.equal(H.entries.phi1.meaning,'The share of compute that goes to experiments after the change.');
 assert.equal(H.entries.phi1.turn,'More for experiments, less for training.');
 assert.notEqual(H.entries.phi0.name,H.entries.phi1.name);
 assert.equal(H.entries.a.turn,'Labour matters more. Labour needed falls if it is above E and rises if it is below E.');
 assert.equal(H.entries.lambda.meaning,'How the pace of new methods responds when both inputs grow together. 1 means in step. Below 1, researchers start to duplicate each other. Above 1, the pace outruns the inputs.');
 assert.equal(H.entries.lambda.turn,'With inputs above baseline the pace rises. With inputs below baseline it falls further.');
 for(const k of ['L','E'])assert.equal(H.entries[k].turn,'A faster pace of new methods. With default weights and λ = 1, each extra unit adds less.');
 assert.equal(H.entries.W.turn,'The same change moves yearly training growth less.');
 assert.equal(H.entries.inner.meaning,'A working term in the CES solution.');
 assert.equal(H.entries.log2.meaning,'How many doublings a ratio equals.');
 for(const k of ['max','min'])assert.equal(H.entries[k].meaning,'The larger or smaller of two values.');
 const copy=require('./expected-copy.json')["symbolExplanations"];
 for(const text of [H.why[0],H.charts['chart-time-help']])assert.ok(copy.includes(text));
 assert.ok(H.plain.research.includes('With equal weights and λ = 1, neither input can do the work alone: four times the labour only doubles the pace.'));
 assert.ok(H.researchCES.includes('past some point more labour adds little. Above 1, either input can do it alone.'));
 assert.ok(H.plain['final-sector'].includes('That lets us split baseline growth: s to software, 1 − s to training. Tejas supposes two-thirds and one-third.'));
 assert.ok(H.plain['compute-link'].includes("We assume training's effect on models arrives over W years."));
 assert.ok(H.plain['time-link'].includes('D(t) is how many more doublings S has had by year t than on the baseline path. It is negative if S has fallen behind.'));
});

test('disclosure state survives every slider rerender',()=>{
 const a=boot(),details=()=>a.document.querySelectorAll('#equations details, #derivation details');
 assert.equal(details().length,9);
 details().forEach((el,i)=>el.open=i%2===0);
 a.input('A',.8);
 assert.deepEqual(details().map(el=>el.open),[true,false,true,false,true,false,true,false,true]);
 a.input('k',8);a.input('X',1); // training alone reduces the number of steps
 assert.equal(details()[7].open,true);
 assert.equal(details()[0].open,true);
});

test('branch-specific why text and one tab stop per equation or derivation line',()=>{
 const a=boot();
 for(const sigma of [1,.75,.5,3]) {
  a.input('sigma',sigma);
  for(const id of ['equations','derivation']) {
   const re=id==='equations'?/<p class="formula">([\s\S]*?)<\/p>/g:/<li>([\s\S]*?)<\/li>/g;
   for(const [,line] of a.nodes.get(id).innerHTML.matchAll(re))assert.equal((line.match(/tabindex="0"/g)||[]).length,1,line);
  }
 }
 a.input('sigma',.5);assert.match(a.nodes.get('derivation').innerHTML,/No amount of labour reaches this\. The step reports the ceiling\./);
 a.input('X',1);a.input('k',8);assert.match(a.nodes.get('derivation').innerHTML,/Training compute alone reaches the target, so no labour is needed\./);
 // CES with high substitution can reach the target using only experiment compute.
 a.input('k',1);a.input('sigma',3);a.input('X',1);a.input('E',4);
 assert.match(a.nodes.get('derivation').innerHTML,/Experiment compute alone reaches the target, so no labour is needed\./);
});

test('focus scroll keeps help open and arrow keys rove within a line',()=>{
 const a=helpHarness(),L=a.trigger('L');L.focus();a.winEvents.scroll({target:a.document});assert.equal(a.popover.hidden,false);
 a.document.activeElement=null;a.winEvents.scroll({target:a.document});assert.equal(a.popover.hidden,true);
 const E=a.trigger('E'),symbols=[L,E],line={querySelectorAll:()=>symbols};
 for(const symbol of symbols)symbol.closest=s=>s==='[data-help]'||s==='.symbol'?symbol:s==='.formula, #derivation li'?line:null;
 L.focus();a.events.keydown({target:L,key:'ArrowRight',preventDefault(){}});
 assert.equal(a.document.activeElement,E);assert.equal(L.tabIndex,-1);assert.equal(E.tabIndex,0);
 a.events.keydown({target:E,key:'ArrowRight',preventDefault(){}});assert.equal(a.document.activeElement,L);
 a.events.keydown({target:L,key:'End',preventDefault(){}});assert.equal(a.document.activeElement,E);
});

test('fixed engine-derived takeaway and exact preset labour',()=>{
 const a=boot(),initial=a.nodes.get('takeaway-lead').innerHTML,rows=a.nodes.get('takeaway-rows').innerHTML;
 const spec=require('./expected-copy.json')["modelIntroduction"];assert.ok(spec.includes(initial));
 assert.match(rows,/6 months<\/td><td>1x<\/td><td>1x/);
 assert.match(rows,/<tr class="current"><td>3 months<\/td><td>2x<\/td><td>about 6x/);
 assert.match(rows,/1.5 months<\/td><td>4x<\/td><td>about 30x/);
 const M=a.window.ResearchMachine;
 for(const [i,expected] of [30.25,15.125,7.5625,47.265625].entries()){
  a.nodes.get('scenarios').listeners.click({target:{closest:()=>({dataset:{case:String(i+7)}})}});
  const p={};a.inputs.filter(e=>e.dataset.key!=='E').forEach(e=>p[e.dataset.key]=Number(e.value));
  assert.equal(p.X,4);assert.ok(Math.abs(M.inverse(p).L_needed-expected)<1e-10);
  if(i===1||i===2){assert.ok(Math.abs(M.compute(p).E-(i===1?2:4))<1e-10);assert.ok(Math.abs(M.compute(p).Cr-1)<1e-10);}
  assert.equal(a.nodes.get('takeaway-lead').innerHTML,initial);assert.equal(a.nodes.get('takeaway-rows').innerHTML,rows);
 }
 const html=fs.readFileSync(dir+'index.html','utf8');assert.ok(html.includes(initial));assert.ok(html.includes(rows));
 assert.ok(html.indexOf('class="takeaway"')<html.indexOf('id="forward-readout"'));
 assert.ok(html.includes(`content="${initial.replace(/<br>/g,' ')}"`));
 assert.ok(html.includes('Compute beyond the old trend lowers these numbers. Harder ideas raise them. <span class="interactive-only">Test that with the dials below.</span>'));
 assert.ok(html.includes("The months are an illustration. METR measured a benchmark index, not release dates. These figures use Tejas's assumptions, and 4x is our what-if, not a forecast. These are starting figures. Holding the pace takes more each year if ideas get harder."));
 assert.doesNotMatch(html.match(/id="equations">([\s\S]*?)<section class="parameters"/)[1],/<button/);
});

test('added operators are explained; CES inner has its live value',()=>{
 const a=boot();a.input('sigma',.75);
 for(const [id,key] of [['equations','log2'],['equations','max'],['equations','G_actual'],['derivation','inner']])assert.ok(a.nodes.get(id).innerHTML.includes(`data-help="${key}"`));
 const h=helpHarness();h.H.setState({sigma:.75});h.trigger('inner').focus();
 const r=h.context.window.ResearchMachine.inverse({sigma:.75}),rho=-1/3;
 const expected=h.context.window.ResearchMachine.format((Math.pow(r.Tg,rho)-.5*Math.pow(r.E,rho))/.5,4);
 assert.ok(h.content.innerHTML.includes('Now: '+expected));
 const html=fs.readFileSync(dir+'index.html','utf8');
 assert.match(html,/<span class="interactive-only">You can change anything here and the machine changes too\. Hover over or tap any symbol/);
 assert.match(html,/data-help="chart-forward-help" aria-label="About progress as labour rises"/);
 assert.match(html,/data-help="chart-time-help" aria-label="About labour to hold the pace"/);
});

test('verbatim grouped presets, unique accessible names and engine results',()=>{
 const a=boot(),M=a.window.ResearchMachine,live=a.nodes.get('scenarios').innerHTML;
 const html=fs.readFileSync(dir+'index.html','utf8');
 const fallback=html.match(/<div id="scenarios">([\s\S]*?)<\/div>/)[1];
 const spec=require('./expected-copy.json')["scenarioDescriptions"];
 const expected=[...spec.matchAll(/^\| (.+) \| (.+) \|$/gm)].filter(m=>m[1]!=='Name');
 assert.equal(expected.length,11);
 expected[5]=[null,"Thinking can't fully replace experiments",'Researchers, human or AI, share experiment compute, so extra labour helps less (σ = 0.75).'];
 expected[6]=[null,'Thinking can barely replace experiments','Past a point, more researchers, human or AI, add almost nothing, and experiment compute sets a limit (σ = 0.5).'];
 const buttons=[...live.matchAll(/<button[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
 assert.equal(buttons.length,11);assert.equal(new Set(buttons.map(m=>m[1])).size,11);
 for(const markup of [live,fallback]) {
  assert.equal((markup.match(/<li>/g)||[]).length,11);
  for(const heading of ['To double the pace (2x)','To double the pace again (4x)'])assert.ok(markup.includes('>'+heading+'</h3>'));
  expected.forEach(([_,name,gloss],i)=>{
   const row=[...markup.matchAll(/<li>([\s\S]*?)<\/li>/g)][i][1];
   assert.ok(row.includes(`<span class="scenario-name">${name}</span>`));
   assert.ok(row.includes(`<span class="scenario-gloss quiet" id="scenario-gloss-${i}">${gloss}</span>`));
   const group=i<7?'To double the pace (2x)':'To double the pace again (4x)';
   assert.equal(buttons[i][1],`${group}: ${name}`);
   assert.ok(live.includes(`aria-describedby="scenario-gloss-${i} scenario-result-${i}"`));
   a.nodes.get('scenarios').listeners.click({target:{closest:()=>({dataset:{case:String(i)}})}});
   const p={};a.inputs.filter(e=>e.dataset.key!=='E').forEach(e=>p[e.dataset.key]=Number(e.value));
   const result=M.inverse(p);
   const value=result.status==='wall'?`Never reaches ${M.format(p.X)}x: stops at ${M.format(result.X_max)}x`:`${M.format(result.L_needed)}x`;
   assert.ok(row.includes(`<span class="result" id="scenario-result-${i}">${value}</span>`),value);
  });
 }
 assert.ok(html.includes('Click a row to load it into the dials. The right-hand number is the research labour needed.'));
 assert.ok(html.includes("Reset to Tejas's model"));
 assert.doesNotMatch(fallback,/<button/);
 assert.match(live,/Never reaches 2x: stops at 1.67x/);
});

test('verbatim lambda explanation and baseline accessible names',()=>{
 const a=helpHarness();
 assert.equal(a.H.entries.lambda.turn,'With inputs above baseline the pace rises. With inputs below baseline it falls further.');
 for(const [key,name] of [['L0','Baseline labour'],['K0','Baseline compute']]) {
  assert.match(a.H.button(key,'?',true),new RegExp('aria-label="'+name+'"'));
 }
 a.trigger('lambda',true).focus();
 assert.ok(a.content.innerHTML.includes('Turn it up: '+a.H.entries.lambda.turn));
});

test('phone closes offscreen focused help only when outside scrolling ends',()=>{
 for(const rect of [
  {left:10,right:40,top:-30,bottom:0},
  {left:10,right:40,top:800,bottom:830},
  {left:-30,right:0,top:100,bottom:130},
  {left:375,right:400,top:100,bottom:130}
 ]) {
  const a=helpHarness(true),L=a.trigger('L');
  L.getBoundingClientRect=()=>({left:10,right:40,top:100,bottom:130});L.focus();
  L.getBoundingClientRect=()=>rect;
  a.winEvents.scroll({target:a.document});assert.equal(a.popover.hidden,false,'keep open during scroll');
  a.winEvents.scrollend({target:a.content});assert.equal(a.popover.hidden,false,'ignore sheet scrolling');
  a.winEvents.scrollend({target:a.document});assert.equal(a.popover.hidden,true);
  assert.equal(L.attrs['aria-expanded'],'false');assert.equal(L.attrs['aria-describedby'],undefined);
  assert.equal(a.document.activeElement,L,'closing must not move focus');
 }
 const a=helpHarness(true),L=a.trigger('L');
 L.getBoundingClientRect=()=>({left:10,right:40,top:-10,bottom:10});L.focus();
 a.winEvents.scrollend({target:a.document});assert.equal(a.popover.hidden,false,'partly visible symbol stays open');
 L.getBoundingClientRect=()=>({left:10,right:40,top:810,bottom:840});
 a.winEvents.scroll({target:a.document});
 for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
 assert.equal(a.popover.hidden,true,'debounced fallback closes without native scrollend');
 const desktop=helpHarness(),symbol=desktop.trigger('L');symbol.focus();
 symbol.getBoundingClientRect=()=>({left:10,right:40,top:810,bottom:840});
 desktop.winEvents.scrollend({target:desktop.document});assert.equal(desktop.popover.hidden,false);
});

test('one masthead message, quiet credit and static model origin',()=>{
 const html=fs.readFileSync(dir+'index.html','utf8'),spec=require('./expected-copy.json')["modelIntroduction"];
 const hero=html.match(/<header class="shell masthead">([\s\S]*?)<\/header>/)[1];
 const message=boot().nodes.get('takeaway-lead').innerHTML;
 assert.ok(spec.includes(message));
 assert.match(hero,/<h1>The research machine<\/h1>\s*<p id="takeaway-lead" class="subheading">/);
 assert.equal((hero.match(/<p\b/g)||[]).length,2);
 assert.equal((html.match(/id="takeaway-lead"/g)||[]).length,1);
 const credit=hero.match(/<p class="quiet source-credit">([\s\S]*?)<\/p>/)[1];
 assert.equal(credit,"Based on <a href=\"https://x.com/TejasReal/status/2118873231872643552\">a short model</a> by Tejas Subramaniam, using METR's estimate that Anthropic's models are improving about twice as fast as before on well-specified tasks.");
 assert.match(fs.readFileSync(dir+'styles.css','utf8'),/\.source-credit \{ font-size: \.9rem; \}/);
 const machine=html.match(/<section id="machine"[\s\S]*?(?=<section id="workings")/)[0];
 assert.match(machine,/<div class="takeaway">\s*<table class="takeaway-ladder">/);
 assert.doesNotMatch(machine,/id="takeaway-lead"/);
 const origin=machine.match(/<section class="model-origin"><h2>Where this comes from<\/h2><p>(.*?)<\/p><\/section>\s*<section class="assumptions"><h2>What the number depends on/);
 assert.ok(origin);assert.ok(spec.includes('"'+origin[1]+'"'));
 for(const key of ['name="description"','property="og:description"'])assert.ok(html.includes(`<meta ${key} content="${message.replace(/<br>/g,' ')}">`));
});

test('exact form-specific copy, visible CES definition and persistent sections',()=>{
 const a=boot(false,false,true);
 const H=a.window.ResearchHelp,copies=[H.plain.research,H.researchCES];
 const card=()=>a.nodes.get('equations').innerHTML.match(/<article[^>]+id="research">([\s\S]*?)<\/article>/)[1];
 const details=()=>a.document.querySelectorAll('#equations details, #derivation details');
 for(const [i,sigma] of [[0,1],[1,.75],[1,3],[0,1]]) {
  details().forEach(el=>el.open=true);
  if(sigma===1)a.radios[0].listeners.change();else if(sigma===.75)a.radios[1].listeners.change();else a.input('sigma',sigma);
  assert.ok(card().includes(copies[i]));assert.ok(details().every(el=>el.open));
  assert.doesNotMatch(card(),/within 0\.000001/);
  const symbols=card().match(/class="definitions">([\s\S]*?)<\/ul>/)[1];
  assert.ok(textOf(symbols).includes('F — Combines labour and experiment compute'));
  assert.ok(textOf(symbols).includes('a — Labour weight against experiment compute'));
  if(i===0)assert.doesNotMatch(card(),/[σρ]/);
  else {
   const eq=card().match(/class="formula">([\s\S]*?)<\/p>/)[1];
   assert.ok(textOf(eq).includes('ρ = (σ − 1)/σ'));
   for(const key of ['sigma','rho'])assert.ok(eq.includes(`data-help="${key}"`));
  }
 }
 const holding=textOf(a.nodes.get('equations').innerHTML);
 assert.ok(holding.includes('Read the shape of the line. Its size depends on β and on g₀, which comes from T₀. Both are our illustrative numbers.'));
});

test('all card and derivation explanations name visible symbols or explain their entry',()=>{
 const normalize=s=>s.replaceAll('₀','0').replaceAll('₁','1').replaceAll('₂','2');
 const symbols=html=>new Set([...html.matchAll(/<var>([^<]+)<\/var>(?:<sub>([^<]+)<\/sub>)?/g)].map(m=>m[1]+(m[2]||'')));
 const references=html=>{
  const refs=symbols(html),plain=normalize(textOf(html)).replace(/\bA (?:model|lab|change|cut)\b/g,'');
  for(const m of plain.matchAll(/(?<![\p{L}\p{N}_'’])(?:X_out|[A-Z](?:[012])?|g0|c0|[σρλβφ](?:[01])?|g|b|h|s)(?![\p{L}\p{N}_])/gu))refs.add(m[0]);
  return refs;
 };
 // Each permitted indirect symbol must state its route to a symbol in this equation.
 const routes={
  research:{S:['g',/how fast S grows/]},
  'compute-link':{K:['k',/k is the total compute pool K divided by its baseline/]},
  'index-link':{X:['Xe',/target X enters through Xe/],A:['G',/Research productivity A enters through G in the research sector\./]},
  'time-link':{S:['D',/S is software, whose excess doublings enter through D\(t\)/],E:['A',/experiment compute E stays at its new level and enters the inverse research function/]}
 };
 const a=boot();
 for(const sigma of [1,.75,.5,3])for(const target of [1,2,4]) {
  a.input('sigma',sigma);a.input('X',target);
  const cards=[...a.nodes.get('equations').innerHTML.matchAll(/<article[^>]+id="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length,5);
  for(const [,id,html] of cards) {
   const equation=html.match(/<p class="formula">([\s\S]*?)<\/p>/)[1],visible=symbols(equation);
   const explanation=html.match(/<details>([\s\S]*?)<\/details>/)[1],plain=normalize(textOf(explanation));
   for(const key of references(explanation)) {
    if(visible.has(key))continue;
    const route=routes[id]?.[key];
    assert.ok(route,`${id}: ${key} missing from equation at sigma=${sigma}`);
    assert.ok(visible.has(route[0]),`${id}: missing entry point for ${key}`);
    assert.match(plain,route[1]);
   }
  }
  const derivation=a.nodes.get('derivation').innerHTML,visible=symbols(derivation.replace(/<details>[\s\S]*?<\/details>/g,''));
  for(const [,why] of derivation.matchAll(/<details>([\s\S]*?)<\/details>/g))for(const key of references(why))assert.ok(visible.has(key),`derivation: ${key}`);
  // The one inline definition names the function whose required value Tg represents.
  if(derivation.includes('required value of'))assert.match(textOf(derivation),/Tg is the required value of F/);
 }
});

test('every card equation and numeric substitution starts its own line, including fallback',()=>{
 const a=boot();
 for(const sigma of [1,.75]) {
  a.input('sigma',sigma);
  for(const [,content] of a.nodes.get('equations').innerHTML.matchAll(/<p class="formula(?: substitution)?">([\s\S]*?)<\/p>/g)) {
   assert.match(content,/^<span class="equation-line">/);
   assert.doesNotMatch(textOf(content),/;/);
   assert.equal((content.match(/class="equation-line"/g)||[]).length,content.split('\n').length);
  }
 }
 const fallback=fs.readFileSync(dir+'index.html','utf8').match(/id="equations">([\s\S]*?)<section class="parameters"/)[1];
 const live=boot().nodes.get('equations').innerHTML.replace(/<button[^>]*class="symbol"[^>]*>([\s\S]*?)<\/button>/g,'$1');
 assert.equal(fallback.trim().replace(/<\/div>\s*$/,''),live);
});


test('verbatim labour copy, help, caveat and both forms',()=>{
 const a=boot(),H=a.window.ResearchHelp;
 const spec=require('./expected-copy.json')["researchLabour"];
 const html=fs.readFileSync(dir+'index.html','utf8');
 const quoted=[...spec.matchAll(/"([^"\n]+)"/g)].map(m=>m[1]);
 for(const copy of quoted.filter(s=>s.startsWith('Better methods')||s.startsWith('Research labour here')||s.startsWith('The model treats')))assert.ok(html.includes(copy),copy);
 for(const key of ['L','sigma'])assert.ok(spec.includes(H.entries[key].meaning));
 assert.ok(spec.includes(H.entries.sigma.turn));
 for(const sigma of [1,.75,.5,3,1]) {
  a.input('sigma',sigma);
  const cards=a.nodes.get('equations').innerHTML;
  const research=cards.match(/id="research">([\s\S]*?)<\/article>/)[1];
  const copy=sigma===1?H.plain.research:H.researchCES;
  for(const sentence of quoted.filter(s=>s.startsWith('Its inputs')||s.startsWith(sigma===1?'With equal weights':'σ says')||sigma===1&&s.startsWith('Cobb-Douglas builds')))assert.ok(copy.includes(sentence),sentence);
  const note=research.match(/<p class="formula tejas-equation">([\s\S]*?)<\/p>/);
  assert.equal(!!note,sigma===1);
  if(note){assert.equal(textOf(note[1]),"With a = 0.5 and λ = 1, this is Tejas's equation: G = A × √L × √E.");assert.match(note[1],/<var>L<\/var>/);
   for(const key of ['a','lambda','G','A','L','E'])assert.ok(note[1].includes(`data-help="${key}"`),key);
   assert.equal((note[1].match(/tabindex="0"/g)||[]).length,1);}
  assert.equal((cards.match(/<ul class="definitions">/g)||[]).length,5);
  for(const [,list] of cards.matchAll(/<ul class="definitions">([\s\S]*?)<\/ul>/g)){
   assert.doesNotMatch(list,/<p>|[=;]/);
   for(const [,entry] of list.matchAll(/<li>([\s\S]*?)<\/li>/g)){
    assert.equal(textOf(entry).split(' — ').length,2);
    const [symbol,meaning]=textOf(entry).split(' — ');
    if(symbol==='D(t)')assert.equal(meaning,'How many more doublings S has had by year t than on the baseline path. It is negative if S has fallen behind.');
    else if(symbol==='Xout')assert.equal(meaning,'The reported index speedup implied by the inputs, given b and h');
    else if(symbol==='E')assert.equal(meaning,'Experiment compute compared with baseline. Compute per unit of time');
    else if(symbol==='Cr')assert.equal(meaning,'Training-compute effect relative to baseline at the end of W years');
    else assert.ok(meaning.split(/\s+/).length<=8,entry);
   }
  }
 }
 for(const id of ['compute-link','index-link']){
  const card=a.nodes.get('equations').innerHTML.match(new RegExp('id="'+id+'">([\\s\\S]*?)<\\/article>'))[1];
  const plain=textOf(card.match(/<summary>In plain English<\/summary><p>([\s\S]*?)<\/p>/)[1]);
  const prefix=id==='compute-link'?'The experiment dial':'Only b × h';
  const expected=quoted.find(s=>s.startsWith(prefix)).replace('C_r','Cr').replace('X_e','Xe');
  assert.ok(plain.includes(expected),plain);
  assert.match(card,id==='compute-link'?/<var>C<\/var><sub>r<\/sub>/:/<var>X<\/var><sub>e<\/sub> = 1/);
 }
 // FIXES-19 compares AI labour costs with people; retain the ban for model labour.
 const sources=['app.js','help.js','index.html'].map(file=>fs.readFileSync(dir+file,'utf8')).join('\n').replaceAll('A 6.25 is the total, including the original 1, and it does not mean 6.25 times the staff.','').replaceAll("AI labour may cost less than people",'');
 assert.doesNotMatch(sources,/\b(?:people|person|staff)\b/i);
});


test('snapshots export the experiment dial as E and describe unreachable targets in words',()=>{
 const app=boot(),snapshot=()=>app.window.ResearchMachineApp.snapshot();
 app.input('E',2);
 assert.deepEqual(Array.from(snapshot().changed),['E = 2']);
 assert.equal(snapshot().settings.k,1.5);assert.ok(Math.abs(snapshot().settings.phi1-2/3)<1e-12);
 app.input('E',1);assert.deepEqual(Array.from(snapshot().changed),[]);
 app.input('k',2);assert.ok(snapshot().changed.includes('k = 2'));
 app.input('E',3);assert.ok(snapshot().changed.some(x=>x.startsWith('k = ')));
 app.listeners.click({target:{closest:s=>s==='[data-reset]'?{}:null}});
 app.input('sigma',.5);
 assert.equal(snapshot().labour,'never reaches 2x, stops at 1.67x');
 const {commentsToMarkdown}=require('../review/feedback.js');
 const md=commentsToMarkdown({name:'',date:'',buildId:'',comments:[{where:'Here',text:'Check',snapshot:snapshot()}]});
 assert.match(md,/labour needed for target never reaches 2x, stops at 1.67x/);
});

test('outside review copy appears verbatim in live and static views',()=>{
 const a=boot(),H=a.window.ResearchHelp,html=fs.readFileSync(dir+'index.html','utf8');
 const lead="If AI has doubled Anthropic's pace, Tejas's model says that's like having about 6 times the research workforce.<br>On the same model, doubling the pace again would take about 30 times the original workforce.";
 assert.equal(a.nodes.get('takeaway-lead').innerHTML,lead);
 for(const attr of ['name="description"','property="og:description"'])assert.ok(html.includes(`<meta ${attr} content="${lead.replace('<br>',' ')}">`));
 const range="METR would not be surprised by 1.3x or 3x. Through this model that is about 2x to 16x the research labour. This is our calculation, not METR's.";
 assert.equal(a.nodes.get('takeaway-range').innerHTML,range);assert.ok(html.includes(range));
 for(const copy of [
 "Old pace means METR's baseline, March 2024 to October 2025. We assume that trend would have continued. It is not an observed world without AI.",
 'Every ratio compares with the assumed continuation of METR\'s baseline trend at the same date.',
 "The compute split, the bridge and the time path are this page's own extensions. The paper does not calibrate β here.",
 'This is a sensitivity exercise. We did not estimate these parameters for Anthropic, and the chart does not predict labour supply or model AI feeding back into research labour.'
 ])assert.ok(html.includes(copy),copy);
 assert.ok(html.includes('href="https://doi.org/10.1257/aer.20180338"'));
 const signed='How many more doublings S has had by year t than on the baseline path. It is negative if S has fallen behind.';
 assert.equal(H.entries['D(t)'].meaning,signed);assert.ok(H.plain['time-link'].includes('D(t) is '+signed[0].toLowerCase()+signed.slice(1)));
 assert.ok(H.plain['time-link'].includes('If D is negative, A rises above its starting ratio.'));
 assert.equal(H.entries.h.meaning,"The assumed share of the acceleration that AI caused. It gives a labour equivalent for that part, and does not identify the actual uplift.");
 assert.equal(H.entries.b.meaning,'An assumed link between the index speedup and the effective compute speedup. We have no estimate of it.');
 const compute="Experiments use a change at once. We assume training's effect on models arrives over W years. So E measures compute in use now, and Cr measures the training-compute effect, relative to baseline, at the end of W years. During those years the two need not add up to the pool.";
 assert.ok(textOf(H.plain['compute-link']).includes(compute));
 assert.equal(H.entries.Cr.meaning,'Training-compute effect relative to baseline at the end of W years');
 assert.ok(H.entries.E.meaning.includes('Compute per unit of time'));
 assert.ok(H.charts['chart-time-help'].includes('Each ratio compares with the baseline workforce at that date.'));
 for(const markup of [html,a.nodes.get('scenarios').innerHTML])assert.doesNotMatch(markup,/Ideas (?:get )?20% harder/);
 assert.equal((a.nodes.get('scenarios').innerHTML.match(/class="scenario-name">Research productivity falls 20%/g)||[]).length,2);
 assert.ok(a.nodes.get('scenarios').innerHTML.includes("METR's guess. This is the labour equivalent of AI's part only, and it depends on where the other causes act."));
});

test('all eleven presets preserve numeric answers and load their labour into both dials',()=>{
 const a=boot(),M=a.window.ResearchMachine;
 const expected=[6.25,9.765625,3.125,2,4.84,9.413047667452211,null,30.25,15.125,7.5625,47.265625];
 for(let i=0;i<11;i++){
  a.nodes.get('scenarios').listeners.click({target:{closest:()=>({dataset:{case:String(i)}})}});
  const state=a.window.ResearchMachineApp.snapshot().settings,r=M.inverse(state);
  for(const id of ['simple-L','work-L'])assert.equal(Number(a.nodes.get(id).value),state.L);
  assert.ok(state.L>=.5&&state.L<=60);
  if(expected[i]===null){assert.equal(r.status,'wall');assert.equal(state.L,6.25);}
  else {
   assert.ok(Math.abs(r.L_needed-expected[i])<1e-9,`${i}: ${r.L_needed}`);
   assert.equal(state.L,r.L_needed);assert.ok(Math.abs(M.forward(state).X_out-state.X)<1e-12);
  }
 }
 for(const id of ['simple-L','work-L']){
  assert.equal(a.nodes.get(id).max,'60');assert.equal(a.nodes.get(id).min,'0.5');
  assert.equal(a.nodes.get(id).attrs.step,'any');
 }
 a.input('L',60);assert.equal(a.window.ResearchMachineApp.snapshot().settings.L,60);
 assert.match(a.nodes.get('chart-forward').innerHTML,/>60<\/text>/);assertFiniteMarkup(a);
 a.input('L',6.25);assert.equal(a.window.ResearchMachineApp.snapshot().settings.L,6.25);
 // Exercise the no-labour branch with a synthetic preset within the supported dial bounds.
 Object.assign(M.cases[1].change,{k:8,W:.5});
 a.nodes.get('scenarios').listeners.click({target:{closest:()=>({dataset:{case:'1'}})}});
 assert.equal(M.inverse(a.window.ResearchMachineApp.snapshot().settings).L_needed,0);
 assert.equal(Number(a.nodes.get('work-L').value),Number(a.nodes.get('work-L').min));
});

test('attribution and index bridge copy follows h, b and target on desktop and phone',()=>{
 for(const mobile of [false,true])for(const X of [2,3,4]){
  const a=boot(mobile),M=a.window.ResearchMachine;
  a.input('X',X);
  for(const [h,b] of [[.8,1],[.8,.5],[.8,2],[1,.5],[1,2],[.5,2],[1,1],[1,1+Number.EPSILON]]){
   a.input('h',h);a.input('b',b);
   const state=a.window.ResearchMachineApp.snapshot().settings,d=M.forward(state),r=M.inverse(state);
   const target=X===2?"METR's 2x":`the ${X}x target`;
   const attribution=h<1,bridge=b!==1||h!==1;
   const forward=attribution?`With these inputs, the reported pace would be ${M.format(d.X_out)}x its old pace, because we assume they explain only part of the speedup.`:bridge?`Under this index bridge, the reported pace would be ${M.format(d.X_out)}x its old pace.`:`With these inputs, AI progress runs at ${M.format(d.X_out)}x its old pace.`;
   const inverse=attribution?`The labour equivalent of AI's part of ${target} is ${M.format(r.L_needed)}x. The model does not say where the other causes act.`:bridge?`To reach the ${X}x target under this bridge, research labour must be ${M.format(r.L_needed)}x its old level.`:`To reach ${target} with everything else as set, research labour must be ${M.format(r.L_needed)}x its old level.`;
   assert.equal(textOf(a.nodes.get('forward-readout').innerHTML),forward);
   assert.equal(textOf(a.nodes.get('inverse-readout').innerHTML),inverse);
   assert.equal(a.nodes.get('compact-readout').textContent,bridge?forward+' '+inverse:`Progress ${M.format(d.X_out)}x · Labour ${M.format(r.L_needed)}x`);
   if(bridge)for(const id of ['diagram-machine','diagram-workings']){
    const desc=a.nodes.get(id).innerHTML.match(/<desc[^>]*>(.*?)<\/desc>/)[1];
    assert.ok(desc.includes(forward));assert.ok(desc.includes(inverse));
   }
   assert.equal(a.nodes.get('chart-time').innerHTML.includes("This path counts AI's part only."),h<1);
   assert.ok(textOf(a.nodes.get('chart-forward').innerHTML).includes(bridge?forward:`At ${M.format(state.L)}x labour, index progress is ${M.format(d.X_out)}x.`));
   assert.equal(textOf(a.nodes.get('target-note').innerHTML),`Target: ${target}. Change it in the workings.`);
   if(X!==2)for(const id of ['forward-readout','inverse-readout','compact-readout','diagram-machine','diagram-workings','target-note']){
    const node=a.nodes.get(id);assert.doesNotMatch(node.innerHTML+node.textContent,/METR's/);
   }
  }
 }
});

test('fixed engine-derived examples, signed time results and three-significant-figure displays',()=>{
 const a=boot(),M=a.window.ResearchMachine;
 assert.ok(Math.abs(M.inverse({A:1.3}).L_needed-3.698224852071006)<1e-12);
 assert.equal(Math.round(M.inverse({X:1.3}).L_needed),2);assert.equal(Math.round(M.inverse({X:3}).L_needed),16);
 const example='For example, if other causes raised A to 1.3 and AI supplied the rest of a 2x pace, labour would need about 3.7x, against 4.84x with h = 0.8 and A = 1.';
 for(const settings of [{},{k:4,W:.5},{k:2,W:1},{X:1,A:1.5,k:8,beta:0}]){
  a.listeners.click({target:{closest:s=>s==='[data-reset]'?{}:null}});
  for(const [k,v] of Object.entries(settings))a.input(k,v);
  const state=a.window.ResearchMachineApp.snapshot().settings,walk=M.walkTimePath(state);
  const displayed=walk.L5.toLocaleString('en-GB',{maximumSignificantDigits:3});
  for(const id of ['equations','chart-time'])assert.ok(textOf(a.nodes.get(id).innerHTML).includes(`L(5) = ${displayed}x`));
  assert.ok(textOf(a.nodes.get('equations').innerHTML).includes(example));
  if(settings.k===4){assert.equal(walk.last.D,13);assert.match(textOf(a.nodes.get('equations').innerHTML),/D\(5\) ≈ 13/);}
 }
 const html=fs.readFileSync(dir+'index.html','utf8');assert.ok(html.includes(example));
 assert.match(html,/L\(5\) = 1,130x/);assert.doesNotMatch(html,/1,131\.37x/);
});

test('zero labour can exceed the target and its faster growth is retained in time descriptions',()=>{
 const a=boot();
 for(const [k,v] of Object.entries({sigma:2,k:8,W:2}))a.input(k,v);
 const M=a.window.ResearchMachine,p=a.window.ResearchMachineApp.snapshot().settings,start=M.timePoint(p,0);
 assert.equal(start.G_required,1.75);assert.ok(Math.abs(start.G_actual-2)<1e-12);
 assert.equal(a.nodes.get('inverse-readout').innerHTML,'No research labour is needed: these inputs already beat the target.');
 assert.match(a.nodes.get('chart-time').innerHTML,/With no labour, the lab keeps the faster growth\./);
 assert.match(a.nodes.get('diagram-workings').innerHTML,/during the transition/);
 const h=helpHarness();h.H.setState(p);h.trigger('c').focus();assert.match(h.content.innerHTML,/during the transition/);
});

test('exact zero remains No progress while a negative index is described as a decline',()=>{
 const a=boot();
 for(const [k,v] of Object.entries({s:.5,T0:2,k:.5,W:.5,L:2,A:1}))a.input(k,v);
 const M=a.window.ResearchMachine;
 assert.equal(M.forward(a.window.ResearchMachineApp.snapshot().settings).X_out,0);
 for(const id of ['forward-readout','compact-readout','diagram-machine','diagram-workings']){
  const el=a.nodes.get(id),text=el.innerHTML+' '+el.textContent;
  assert.match(text,/No progress/);assert.doesNotMatch(text,/index would fall/i);
 }
 a.input('L',1);
 assert.ok(M.forward(a.window.ResearchMachineApp.snapshot().settings).X_out<0);
 for(const id of ['forward-readout','compact-readout','diagram-machine','diagram-workings']){
  const el=a.nodes.get(id),text=el.innerHTML+' '+el.textContent;
  assert.match(text,/The reported index would fall in this setting\./);
  assert.match(text,/[Tt]he cut in training compute outweighs research/);
 }
});

test('each effective state has one shared path calculation per update, including matching sensitivity states',()=>{
 const a=boot(),M=a.window.ResearchMachine,walk=M.walkTimePath,calls=[];
 M.walkTimePath=p=>{calls.push(JSON.stringify(p));return walk(p);};
 for(const [key,value] of [['L',7],['T0',1],['beta',0]]){
  calls.length=0;a.input(key,value);
  assert.equal(calls.length,new Set(calls).size);
  const current=JSON.stringify(a.window.ResearchMachineApp.snapshot().settings);
  assert.equal(calls.filter(p=>p===current).length,1);
 }
 const h=helpHarness(),HM=h.context.window.ResearchMachine,p=HM.state(),cached=HM.walkTimePath(p);
 HM.walkTimePath=()=>{throw Error('Help should reuse the current path');};
 h.H.setState(p,cached);h.trigger('G1').focus();assert.match(h.content.innerHTML,/Now: 2.5/);
});


test('time summary rounds starting labour as well as year five without rounding preset answers',()=>{
 const a=boot();
 for(const index of [1,4,10]){
  a.nodes.get('scenarios').listeners.click({target:{closest:()=>({dataset:{case:String(index)}})}});
  const M=a.window.ResearchMachine,p=a.window.ResearchMachineApp.snapshot().settings;
  const expected=M.inverse(p).L_needed.toLocaleString('en-GB',{maximumSignificantDigits:3});
  assert.ok(textOf(a.nodes.get('chart-time').innerHTML).includes(`At year 0: ${expected}x.`));
  assert.doesNotMatch(textOf(a.nodes.get('chart-time').innerHTML),/\.\./);
 }
 assert.match(a.nodes.get('scenarios').innerHTML,/47.27x/);
 for(const [k,v] of Object.entries({X:1,sigma:2,k:8,W:2}))a.input(k,v);
 assert.doesNotMatch(textOf(a.nodes.get('chart-time').innerHTML),/\.\./);
});


test('declining index retains the AI attribution caveat in both diagram descriptions',()=>{
 for(const dom of [false,true]){
  const a=boot(false,false,dom);
  for(const [k,v] of Object.entries({h:.3,b:.5,L:.5}))a.input(k,v);
  const inverse=textOf(a.nodes.get('inverse-readout').innerHTML);
  for(const id of ['diagram-machine','diagram-workings']){
   const node=a.nodes.get(id),desc=dom?node.querySelector('desc').textContent:node.innerHTML.match(/<desc[^>]*>(.*?)<\/desc>/)[1];
   assert.ok(desc.includes('The reported index would fall in this setting.'));
   assert.ok(desc.includes(inverse));
   assert.ok(desc.includes('The model does not say where the other causes act.'));
  }
 }
});

test('fix list 16 exact explanations and static fallback use the supplied copy',()=>{
 const a=boot(),H=a.window.ResearchHelp,html=fs.readFileSync(dir+'index.html','utf8');
 const meaning='The reported index speedup implied by the inputs, given b and h';
 assert.equal(H.entries.X_out.meaning,meaning);
 const h=helpHarness();h.trigger('X_out').focus();assert.ok(textOf(h.content.innerHTML).includes(meaning));
 for(const copy of [
  'D(t) is how many more doublings S has had by year t than on the baseline path. It is negative if S has fallen behind.',
  'If the other inputs beat the target with no labour, the lab keeps the faster growth.',
  'A change in training compute makes labour jump once, at year W: down after a cut, up after an increase.'
 ]){
  assert.ok(H.plain['time-link'].includes(copy));
  assert.ok(textOf(a.nodes.get('equations').innerHTML).includes(copy));
  assert.ok(textOf(html).includes(copy));
 }
 assert.ok(textOf(html).includes('Adding research labour adds no experiment compute.'));
 const mistakes=fs.readFileSync(__dirname+'/../WHAT-WE-GOT-WRONG.md','utf8');
 assert.doesNotMatch(mistakes,/behavior/);assert.match(mistakes,/preset behaviour/);
});

test('training increases and cuts show during the transition at every live site',()=>{
 for(const mobile of [false,true])for(const k of [.5,1,2]){
  const a=boot(mobile);a.input('k',k);
  const cards=a.nodes.get('equations').innerHTML;
  const compute=cards.match(/id="compute-link">([\s\S]*?)<\/article>/)[1];
  const footer=[...a.nodes.get('diagram-workings').innerHTML.matchAll(/class="live-footer"[^>]*>(.*?)<\/text>/g)].map(m=>m[1]).join(' ');
  const h=helpHarness();h.H.setState(h.context.window.ResearchMachine.state({k}));h.trigger('c').focus();
  for(const content of [compute,footer,h.content.innerHTML])assert.equal(content.includes('during the transition'),k!==1,JSON.stringify({mobile,k,content}));
 }
});

test('phone wall readout reports declining index once for the supplied settings',()=>{
 const a=boot(true);
 for(const [key,value] of Object.entries({sigma:.5,k:.5,W:.5,A:.3,h:.3}))a.input(key,value);
 const M=a.window.ResearchMachine,state=a.window.ResearchMachineApp.snapshot().settings;
 assert.equal(M.inverse(state).status,'wall');assert.ok(M.inverse(state).X_max<0);
 const forward=textOf(a.nodes.get('forward-readout').innerHTML);
 const inverse=textOf(a.nodes.get('inverse-readout').innerHTML);
 assert.equal(inverse,"No amount of research labour reaches METR's 2x here.");
 assert.equal(a.nodes.get('compact-readout').textContent,forward+' '+inverse);
 assert.equal((a.nodes.get('compact-readout').textContent.match(/The reported index would fall in this setting\./g)||[]).length,1);
 const sentences=a.nodes.get('compact-readout').textContent.split(/\. (?=[A-Z])/);
 assert.equal(new Set(sentences).size,sentences.length);
 a.input('X',4);assert.equal(a.nodes.get('inverse-readout').innerHTML,'No amount of research labour reaches the 4x target here.');
});

test('half attribution with b = 2 survives diagram patches and phone rendering',()=>{
 for(const mobile of [false,true])for(const dom of [false,true]){
  const a=boot(mobile,false,dom);
  a.input('h',.5);a.input('b',2);
  const forward='With these inputs, the reported pace would be 2x its old pace, because we assume they explain only part of the speedup.';
  const inverse="The labour equivalent of AI's part of METR's 2x is 6.25x. The model does not say where the other causes act.";
  assert.equal(textOf(a.nodes.get('forward-readout').innerHTML),forward);
  assert.equal(textOf(a.nodes.get('inverse-readout').innerHTML),inverse);
  assert.equal(a.nodes.get('compact-readout').textContent,forward+' '+inverse);
  for(const id of ['diagram-machine','diagram-workings']){
   const node=a.nodes.get(id),desc=dom?node.querySelector('desc').textContent:node.innerHTML.match(/<desc[^>]*>(.*?)<\/desc>/)[1];
   assert.ok(desc.includes(forward));assert.ok(desc.includes(inverse));
   assert.doesNotMatch(desc,/under this (?:index )?bridge|Software and training produce index progress/i);
  }
  assert.ok(textOf(a.nodes.get('chart-forward').innerHTML).includes(forward));
  assert.ok(textOf(a.nodes.get('chart-time').innerHTML).includes("This path counts AI's part only."));
 }
});

test('training-compute definition is exact in symbols, popover and static fallback',()=>{
 const a=boot(),H=a.window.ResearchHelp,html=fs.readFileSync(dir+'index.html','utf8');
 const meaning='Training-compute effect relative to baseline at the end of W years';
 const plain='and Cr measures the training-compute effect, relative to baseline, at the end of W years';
 assert.equal(H.entries.Cr.meaning,meaning);
 const h=helpHarness();h.trigger('Cr').focus();assert.ok(textOf(h.content.innerHTML).includes(meaning));
 for(const content of [a.nodes.get('equations').innerHTML,html]){
  assert.ok(textOf(content).includes('Cr — '+meaning));
  assert.ok(textOf(content).includes(plain));
 }
 assert.ok(textOf(H.plain['compute-link']).includes(plain));
 for(const file of ['app.js','help.js','index.html'])assert.doesNotMatch(fs.readFileSync(dir+file,'utf8'),/showing in models/);
});



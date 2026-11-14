const {test}=require('node:test'), assert=require('node:assert/strict');
const m=require('../site/experiments/research-machine/engine.js');
const close=(a,b,t=.0001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('spending puzzle calculations and shared model agree',()=>{
 const x=m.spendingPuzzle();close(x.trendGrowth,19.067,.03);close(x.trendTest1,2.18,.01);close(x.trendTest2,1179,1);close(1-x.trendTest2/x.quarters[0],.324,.002);assert.deepEqual(x.quarters,[1744,2744,9499]);close(x.spending,5.2654);close(x.pace,1.9333);close(x.falls[0],.6328);close(x.falls[1],.8101);
 [.4490,2.753,.9107,1.89,1.4601,.8947].forEach((v,i)=>close(x.ratios[i],v));close(x.q,1.55065);close(x.projected[0],21696,1);close(x.projected[1],3538,1);close(x.projected[2],10696,.01);close(x.whatIf[2],.9405);close(x.whatIf[3],1.5933);close(x.studyFalls[0],1-1.9063/6.19);close(x.studyFalls[1],1-1.9063/3.10);
 x.worlds.forEach(w=>{close(w.input*w.price,2);close(w.input*w.productivity,3)});
 close(x.labour[0],m.timePoint(m.defaults,5).L_needed);close(x.labour[1]/1e6,29.542179,.001);close(x.labour[2]/1e12,2.1994476,.001);
 close(m.inverse({...m.defaults,X:29/15}).G,2.4);close(m.inverse({...m.defaults,X:29/15}).L_needed,5.76);
});

const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/experiments/spending-puzzle/index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../site/experiments/spending-puzzle/app.js'),'utf8');
function boot(search=''){
 const elements={},inputs=[],tries=[],values=[];
 function el(id){return elements[id]||(elements[id]={id,dataset:{},style:{},textContent:'',value:'',hidden:false,attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.events[k]=f},closest(){return el('opening-svg')}})}
 for(let i=1;i<=4;i++)for(let j=0;j<[2,6,2,3][i-1];j++){let e=el(`panel${i}-${j}`);e.name=`panel${i}`;e.value=String(j);inputs.push(e)}
 for(const a of html.matchAll(/<a class="try" href="([^"]+)" data-try="(\d+)"(?: data-case="(\d+)")?/g)){let e=el('try'+a[2]);e.hash=a[1];e.dataset={try:a[2],case:a[3]};tries.push(e)}
 for(const a of html.matchAll(/<span data-value="([^"]+)">([^<]+)<\/span>/g)){let e=el('value'+values.length);e.dataset.value=a[1];e.textContent=a[2];values.push(e)}
 let url='';const document={documentElement:{classList:{add(){}}},getElementById:el,querySelector(q){const a=q.match(/name="panel(\d)"\]\[value="(\d)"/);return el(`panel${a[1]}-${a[2]}`)},querySelectorAll(q){return q==='[data-value]'?values:q==='.controls input[name]'?inputs.filter(e=>e.name!=='panel3'&&e.name!=='panel2'):q==='.try'?tries:[]}};
 const location={search,pathname:'/p/',hash:''};vm.runInNewContext(script,{window:{ResearchMachine:m},document,location,URLSearchParams,history:{replaceState(a,b,u){url=u}},localStorage:{setItem(){},removeItem(){},getItem(){return ''}},Math,Number});return {el,inputs,tries,values,get url(){return url}};
}
test('static default panel results and bound prose match the computed page',()=>{
 const b=boot();for(const i of [1,4]){const match=html.match(new RegExp(`<p id="result${i}"[^>]*>([^<]+)</p>`));assert.equal(match[1],b.el('result'+i).textContent)}
 for(const v of b.values){const match=[...html.matchAll(new RegExp(`<span data-value="${v.dataset.value}">([^<]+)</span>`,'g'))];assert.ok(match.every(x=>x[1]===String(v.textContent)),v.dataset.value)}
});
test('remaining panel settings round trip through the URL',()=>{const b=boot('?p2=3');for(const [i,v] of [[1,1],[4,2]]){const e=b.inputs.find(x=>x.name===`panel${i}`&&x.value===String(v));e.events.change()}b.el('kitchen-slider').events.input({target:{value:'20'}});const c=boot(b.url.slice(b.url.indexOf('?')));assert.match(c.el('result1').textContent,/did not speed up/);assert.equal(c.el('kitchen-slider').value,'20');assert.equal(c.el('kitchen-price-value').textContent,'0.67×');assert.match(c.el('result4').textContent,/2.2 trillion/);assert.doesNotMatch(b.url,/p2=/)});
test('kitchen calculation holds at every slider step and the three named positions',()=>{for(let i=0;i<=20;i++){const k=m.kitchen(1-i/20);close(k.meals,3);close(k.budget/k.price,k.ingredients);close(k.ingredients*k.skill,3)}for(const [c,expected] of [[1,[1,2,1.5]],[.5,[.82,2.45,1.22]],[0,[.67,3,1]]]){const k=m.kitchen(c);[k.price,k.ingredients,k.skill].forEach((v,i)=>close(v,expected[i],.005))}});
test('static kitchen chart contains the middle values and exact new copy',()=>{for(const [key,value] of Object.entries({budget:'2.00',price:'0.82',ingredients:'2.45',skill:'1.22',meals:'3.00'}))assert.match(html,new RegExp(`id="kitchen-${key}-value">${value}×`));assert.match(html,/Story three: a bit of both/);assert.match(html,/different causes that leave the same marks in the data/);assert.doesNotMatch(html,/Two worlds, same numbers|name="panel3"/);});
test('six static trend charts, labels and tests appear in groups',()=>{const panel=html.match(/<div class="panel" id="panel2">([\s\S]*?)<p id="explain2">/)[1];assert.equal((panel.match(/class="trend-card"/g)||[]).length,6);const groups=panel.split('Using figures from after the bend');assert.equal((groups[0].match(/class="trend-card"/g)||[]).length,3);assert.equal((groups[1].match(/class="trend-card"/g)||[]).length,3);for(let i=1;i<=6;i++)assert.match(panel,new RegExp(`Trend ${i}:`));assert.equal((panel.match(/Spending in early 2026 was/g)||[]).length,6);assert.equal((panel.match(/Test:/g)||[]).length,6);assert.doesNotMatch(html,/Reading (one|two|three|four)|Try it/)});
test('quarterly figures and worked predictions are bound to engine',()=>{const x=m.spendingPuzzle(),b=boot(), v=k=>b.values.find(e=>e.dataset.value===k).textContent;[x.data.year2023/4,x.data.year2024/4,x.data.h1/2,x.quarters[0],x.quarters[1],x.data.actual/2].forEach((n,i)=>assert.equal(v('quarter'+i),(n/1000).toFixed(2)));assert.deepEqual(['growth1','growth2','prediction1','prediction2','quarter5'].map(v),['5.4','1.9','10.8','1.77','4.87']);for(let i=0;i<2;i++)close(x.projected[i]*x.ratios[i],x.data.actual);});
test('static cases and review corrections remain present',()=>{assert.equal((html.match(/class="static-case"/g)||[]).length,2);assert.match(html,/id="opening-dollar"/);assert.match(html,/final score still falls inside the margin of error/);assert.match(html,/Gemini Carbon, Fable 5.2 and Astra/)});

test('opening bars use one scale for all three quantities',()=>{
 const b=boot(), x=m.spendingPuzzle(), start=45, scale=445/5.3;
 close(+b.el('opening-spending').attrs.x2-start,scale*x.spending);
 close(+b.el('opening-pace').attrs.x2-start,scale*x.pace);
 close(+b.el('opening-dollar').attrs.x2-start,scale*(1-x.falls[0]));
 assert.match(b.el('opening-fall-label').textContent,/0\.37×/);
});

test('margin note rows reserve enough height at 900 and 1440',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../site/experiments/spending-puzzle/styles.css'),'utf8');
 assert.match(css,/\.noted\{display:grid;grid-template-columns:12rem minmax\(0,1fr\)/);
 assert.match(css,/\.noted>\.note\{grid-column:1;grid-row:1;float:none/);
 assert.match(css,/\.table-note\{display:grid;grid-template-columns:12rem minmax\(0,1fr\)/);
 assert.match(css,/\.table-note \.note\{grid-column:1;grid-row:1;float:none/);
 const rows=[...html.matchAll(/<div class="(noted|table-note)">([\s\S]*?)<aside class="note">([\s\S]*?)<\/aside><\/div>/g)];
 assert.equal(rows.length,(html.match(/<aside class="note">/g)||[]).length,'every margin note has its own grid row');
 // Model the grid row sizing: a row is at least as tall as either of its cells.
 // Use deliberately different line heights and widths to exercise both columns.
 for(const width of [900,1440]){
  const readingWidth=Math.min(780,width-272-32), chars=Math.max(1,Math.floor(readingWidth/10));
  let y=0, previousBottom=0;
  for(const [,kind,body,note] of rows){
   const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
   const noteHeight=Math.ceil(clean(note).length/23)*19.5+5.6;
   const bodyHeight=kind==='table-note'?260:Math.ceil(clean(body).length/chars)*31;
   const top=y+5.6, bottom=top+noteHeight-5.6;
   assert.ok(top>=previousBottom,`${width}px: margin notes overlap`);
   y+=Math.max(noteHeight,bodyHeight)+16; previousBottom=bottom;
  }
 }
});


test('trend key and connectors describe the engine values on the shared log scale',()=>{
 const panel=html.match(/<div class="panel" id="panel2">([\s\S]*?)<p id="explain2">/)[1];
 const groups=[...panel.matchAll(/<div class="trend-grid">([\s\S]*?)<\/div>/g)];
 assert.equal(groups.length,2);
 assert.deepEqual(groups.map(g=>[...g[1].matchAll(/data-trend="(\d)"/g)].map(x=>+x[1])),[[1,2,3],[4,5,6]]);
 const key=panel.match(/<p class="trend-key"[\s\S]*?<\/p>/)[0];
 assert.equal((key.match(/<svg /g)||[]).length,3);
 for(const text of ['Dot: what Anthropic actually spent, per quarter (the table above)','Dashed line: where this trend says spending would go','Red line: the bend, October 2025']) assert.ok(key.includes(text));
 assert.match(panel,/The number under each chart compares the last dot, early 2026, with the end of the dashed line\./);
 const x=m.spendingPuzzle(), y=v=>184.03-61.59*Math.log10(v/.1);
 const cards=[...panel.matchAll(/<article class="trend-card"[\s\S]*?<\/article>/g)];
 cards.forEach((card,i)=>{const line=card[0].match(/class="trend-gap" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);assert.ok(line);close(+line[1],345);close(+line[3],345);close(+line[2],y(x.data.actual/2000),.02);close(+line[4],y(x.projected[i]/2000),.02);assert.match(card[0],/cx="345.00" cy="80.09" r="4.5"/)});
});
test('appendix percentages retain their matching windows and delays',()=>{
 const x=m.spendingPuzzle();
 assert.deepEqual(x.appendixRatios,{matched:{immediate:.31,yearDelay:.60},janSep:{immediate:.36,yearDelay:.90}});
 for(const key of ['matched','janSep']) for(const delay of ['immediate','yearDelay']) close(x.appendixFalls[key][delay],1-x.appendixRatios[key][delay]);
 assert.deepEqual(Object.values(x.appendixFalls.matched).map(v=>Math.round(v*100)),[69,40]);
 assert.deepEqual(Object.values(x.appendixFalls.janSep).map(v=>Math.round(v*100)),[64,10]);
 close(x.quarters[2],19240-9741);
});
test('workforce scenarios retain their comparator and match the powers within rounding',()=>{
 const x=m.spendingPuzzle(),b=boot();
 for(let i=0;i<3;i++) { const e=b.inputs.find(v=>v.name==='panel4'&&v.value===String(i)); e.events.change(); assert.match(b.el('result4').textContent,/the workforce the old path would have had by then\.$/); close(x.labour[i],x.labourBase*x.labourPowers[i],.001); }
 close(x.labourBase*Math.round(x.labourPowers[0]),x.labour[0],4);
 close(x.labourBase*(Math.round(x.labourPowers[1]/1e5)*1e5),x.labour[1],400000);
});

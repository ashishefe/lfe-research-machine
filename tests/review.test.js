const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {commentsToMarkdown}=require('../review/feedback.js');
const base={name:'Example Reviewer',date:'2026-11-07T09:00:00.000Z',buildId:'2026-11-07-abc123'};
test('review Markdown has exact headers, numbered comments and saved settings',()=>{
 assert.equal(commentsToMarkdown({...base,comments:[{where:'The workings › Research sector',text:'Check this.',snapshot:{changed:['L = 10','A = 0.8'],speedup:2,labour:6.25}}]}),
 '# Comments on The research machine\n\nFrom: Example Reviewer\nDate: 2026-11-07T09:00:00.000Z\nPage build: 2026-11-07-abc123\n\n## Comment 1\n\nWhere: The workings › Research sector\n\nSettings changed from the defaults: L = 10; A = 0.8\nResult at these settings: speedup 2; labour needed for target 6.25\n\nCheck this.\n');
 const md=commentsToMarkdown({...base,comments:[{where:'Here',text:'One',snapshot:{changed:[],speedup:2,labour:'wall'}},{where:'There',text:'Two'}]});
 assert.match(md,/defaults: none/);assert.match(md,/labour needed for target wall/);assert.match(md,/## Comment 2/);
});
test('review Markdown omits settings and retains special characters and multiline text exactly',()=>{
 const text='  <script>& "quotes" *stars* `code`\n\n# heading\nLast line  ';
 const md=commentsToMarkdown({...base,comments:[{where:'A & B',text}]});
 assert.equal(md.slice(md.indexOf('Where:')),'Where: A & B\n\n'+text+'\n');
 assert.doesNotMatch(md,/Settings changed|Result at these settings/);
});
test('review bundle is self-contained, safely escaped, with no network APIs; public page has no tool',async()=>{
 const {buildReviewCopy}=await import('../scripts/build-review-copy.mjs');
 const {html,id}=buildReviewCopy(new Date(base.date),base.name);
 assert.match(id,/^2026-11-07-[a-f0-9]{10}$/);
 assert.match(html,/<meta name="robots" content="noindex">/);
 assert.match(html,/Private review copy for Example Reviewer\. This page is not public yet\./);
 assert.match(html,/<a href="https:\/\/lfe.econforeverybody.com\/experiments\/intelligence-explosion\/" aria-current="page">Intelligence explosion<\/a>/);
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|(?:src|href)="(?:\.\.?\/|index\.html|[^"#:]+\.(?:js|css))"|@import|url\(['"]?(?:https?:|\.\.?\/)/i);
 assert.doesNotMatch(html,/\b(?:fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b/);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,5);
 scripts.forEach(([,code])=>new vm.Script(code));
 const publicHtml=fs.readFileSync(path.resolve(__dirname,'../site/experiments/research-machine/index.html'),'utf8');
 assert.doesNotMatch(publicHtml,/review-feedback|feedback\.(?:js|css)|Add a comment|review-panel/);
 assert.notEqual(id,buildReviewCopy(new Date('2026-11-08')).id);
});
test('test sources do not read excluded planning files or personal paths',()=>{
 for(const file of fs.readdirSync(__dirname).filter(f=>/\.(js|cjs|json)$/.test(f))){
  const source=fs.readFileSync(path.join(__dirname,file),'utf8');
  assert.doesNotMatch(source,/readFileSync\([^\n]*planning\//);
  assert.doesNotMatch(source,/\/Users\/[a-z]/);
 }
});
function feedbackBoot({blocked=false,saved=null,height=800,width=1440,popover=null,readout=null,heading=null,reviewer=''}={}) {
 const observers=[],nodes=new Map(),events={},storage=new Map(saved?[['research-machine-review-comments-v1',saved]]:[]);
 function node(id='') {return {id,hidden:false,value:'',checked:true,style:{},children:[],listeners:{},textContent:'',
  set innerHTML(html){this.html=html;for(const [,id]of html.matchAll(/id="([^"]+)"/g))nodes.set(id,node(id));},
  append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},click(){this.listeners.click?.({});},focus(){},remove(){},
  getBoundingClientRect(){return {top:0,bottom:0,width:0,height:0};}};}
 for(const id of ['workings','machine','symbol-popover','compact-readout'])nodes.set(id,node(id));
 nodes.get('workings').hidden=true;nodes.get('machine').querySelectorAll=()=>[{textContent:heading?.textContent??'Research sector',innerText:heading?.innerText??'Research sector',closest:()=>null,getBoundingClientRect:()=>({top:height/2})}];
 for(const [id,rect]of [['symbol-popover',popover],['compact-readout',readout]]){nodes.get(id).hidden=!rect;if(rect)nodes.get(id).getBoundingClientRect=()=>({...rect,width:300,height:rect.bottom-rect.top});}
 const document={body:node(),createElement:()=>node(),getElementById:id=>nodes.get(id),querySelector:selector=>({content:selector.includes('reviewer-name')?reviewer:base.buildId})};
 let helpClosed=false;
 let state={settings:{L:6.25},changed:[],speedup:2,labour:6.25};
 const window={document,innerHeight:height,ResearchHelp:{close(){helpClosed=true;nodes.get('symbol-popover').hidden=true;}},getComputedStyle:()=>({getPropertyValue:()=>width<=600?'.48':'.7'}),ResearchMachineApp:{snapshot:()=>JSON.parse(JSON.stringify(state))},addEventListener:(k,fn)=>events[k]=fn,setTimeout:fn=>fn(),localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}}};
 const context={window,MutationObserver:class{constructor(callback){this.callback=callback;}observe(node){observers.push({node,callback:this.callback});}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../review/feedback.js'),'utf8'),context);
 nodes.get('workings').querySelectorAll=()=>[{innerText:'Research lab',closest:()=>null,getBoundingClientRect:()=>({top:height/2})}];
 return {nodes,events,storage,helpClosed:()=>helpClosed,switchTab(){nodes.get('workings').hidden=!nodes.get('workings').hidden;observers.filter(o=>o.node===nodes.get('workings')).forEach(o=>o.callback());},setState:s=>state=s,save(text,attach=true){nodes.get('review-text').value=text;nodes.get('review-attach').checked=attach;nodes.get('review-form').listeners.submit({preventDefault(){}});}};
}
test('feedback saves engine snapshots, edits, deletes, persists and tracks downloaded revisions',()=>{
 const a=feedbackBoot(),get=id=>a.nodes.get('review-'+id);get('open').click();assert.equal(get('where').value,'The machine › Research sector');
 a.save('  First\nline  ');let stored=()=>JSON.parse(a.storage.values().next().value);
 assert.equal(stored().comments[0].text,'  First\nline  ');assert.equal(stored().comments[0].snapshot.speedup,2);
 a.setState({settings:{L:10},changed:['L = 10'],speedup:3,labour:'wall'});assert.equal(stored().comments[0].snapshot.speedup,2);
 let warned=false;a.events.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,true);
 get('download').click();warned=false;a.events.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,false);
 get('list').children[0].children[2].click();a.save('Edited',false);assert.equal(stored().comments[0].snapshot,undefined);
 const b=feedbackBoot({saved:a.storage.values().next().value});assert.equal(b.nodes.get('review-list').children[0].children[1].textContent,'Edited');
 b.nodes.get('review-list').children[0].children[3].click();warned=false;b.events.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,false);assert.equal(b.nodes.get('review-list').children.length,0);
});
test('feedback remains usable when localStorage is blocked',()=>{
 const a=feedbackBoot({blocked:true});a.nodes.get('review-open').click();a.save('Memory only');assert.equal(a.nodes.get('review-list').children.length,1);assert.doesNotThrow(()=>a.nodes.get('review-download').click());
});
test('feedback panel stays within free viewport space above and below explanation sheets',()=>{
 for(const height of [667,800])for(const popover of [{top:height*.55,bottom:height},{top:0,bottom:height*.45}]){
  const a=feedbackBoot({height,popover,readout:{top:0,bottom:50}}),panel=a.nodes.get('review-panel');
  const bottom=parseFloat(panel.style.bottom),size=parseFloat(panel.style.maxHeight),top=height-bottom-size;
  assert.ok(top>=12);assert.ok(bottom+size<=height);if(popover.top===0)assert.ok(top>=popover.bottom+12);else assert.ok(height-bottom<=popover.top-12);
 }
});

test('Where uses the visible heading and excludes the hidden fallback',()=>{
 const a=feedbackBoot({heading:{textContent:'Change the inputsStarting inputs',innerText:'Change the inputs'}});
 a.nodes.get('review-open').click();
 assert.equal(a.nodes.get('review-where').value,'The machine › Change the inputs');
 a.save('Check inputs');
 assert.equal(JSON.parse(a.storage.values().next().value).comments[0].where,'The machine › Change the inputs');
});
test('Markdown rounds settings and results to at most four significant figures without changing snapshots or prose',()=>{
 const snapshot={changed:['L = 6.250000000000001','s = 0.6666666666666666','A = 0.00001234567','T0 = 1234567','form = cobb'],speedup:1.9999999999999998,labour:6.250000000000001};
 const original=JSON.stringify(snapshot),text='Keep 6.250000000000001 in my comment.';
 const md=commentsToMarkdown({...base,comments:[{where:'Here',text,snapshot}]});
 assert.match(md,/defaults: L = 6.25; s = 0.6667; A = 0.00001235; T0 = 1.235e\+6; form = cobb/);
 assert.match(md,/speedup 2; labour needed for target 6.25/);
 assert.ok(md.includes(text));assert.equal(JSON.stringify(snapshot),original);
 for(const [value,expected]of [[0,'0'],[-12.34567,'-12.35'],[1e-12,'1e-12'],[1e30,'1e+30'],[Number.MAX_VALUE,'1.798e+308'],['wall','wall']]){
  const output=commentsToMarkdown({...base,comments:[{where:'Here',text:'Test',snapshot:{changed:[],speedup:value,labour:value}}]});
  assert.ok(output.includes(`speedup ${expected}; labour needed for target ${expected}`));
 }
});
test('review banner shares the page width without inset padding',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../review/feedback.css'),'utf8');
 const rule=css.match(/\.review-banner\s*\{([^}]+)\}/)[1];
 assert.match(rule,/width: var\(--site-w\)/);assert.match(rule,/margin: .7rem auto/);
 assert.match(rule,/max-width: none/);assert.doesNotMatch(rule,/padding/);
 const pageCSS=fs.readFileSync(path.join(__dirname,'../site/experiments/research-machine/styles.css'),'utf8');
 assert.match(pageCSS,/p\s*\{[^}]*max-width: 70ch/);
});
test('review build works without an output folder and has optional escaped reviewer details',async()=>{
 const {buildReviewCopy}=await import('../scripts/build-review-copy.mjs');
 const generic=buildReviewCopy(new Date(base.date));
 assert.match(generic.html,/<p class="review-banner">Private review copy\. This page is not public yet\.<\/p>/);
 assert.match(generic.html,/<meta name="reviewer-name" content="">/);
 const named=buildReviewCopy(new Date(base.date),' A & <B> "C" ');
 assert.match(named.html,/Private review copy for A &amp; &lt;B&gt; &quot;C&quot;\. This page is not public yet\./);
 assert.match(named.html,/<meta name="reviewer-name" content="A &amp; &lt;B&gt; &quot;C&quot;">/);
 assert.notEqual(generic.id,named.id);
 assert.equal(feedbackBoot().nodes.get('review-name').value,'');
});


test('deleting another comment preserves a draft and the active edit index',()=>{
 const a=feedbackBoot(),get=id=>a.nodes.get('review-'+id);
 get('open').click();a.save('First');a.save('Second');a.save('Third');
 get('text').value='Unsaved draft';get('where').value='My place';get('where').listeners.input();get('attach').checked=false;
 get('list').children[0].children[3].click();
 assert.equal(get('text').value,'Unsaved draft');assert.equal(get('where').value,'My place');assert.equal(get('attach').checked,false);
 get('list').children[1].children[2].click();
 get('list').children[0].children[3].click();
 assert.equal(get('text').value,'Third');a.save('Third edited');
 assert.equal(get('list').children.length,1);assert.equal(get('list').children[0].children[1].textContent,'Third edited');
 get('list').children[0].children[2].click();get('list').children[0].children[3].click();
 assert.equal(get('text').value,'');assert.equal(get('cancel').hidden,true);
});
test('automatic location follows tabs until edited, including close and reopen',()=>{
 const a=feedbackBoot(),get=id=>a.nodes.get('review-'+id);
 get('open').click();a.switchTab();assert.equal(get('where').value,'The workings › Research lab');
 get('where').value='My location';get('where').listeners.input();a.switchTab();assert.equal(get('where').value,'My location');
 get('close').click();get('open').click();assert.equal(get('where').value,'My location');
 a.save('A comment');a.switchTab();assert.equal(get('where').value,'The workings › Research lab');
 get('list').children[0].children[2].click();a.switchTab();assert.equal(get('where').value,'My location');
});
test('reviewer metadata prefills the name and stored edits take precedence',()=>{
 assert.equal(feedbackBoot({reviewer:'Example Reviewer'}).nodes.get('review-name').value,'Example Reviewer');
 const saved=JSON.stringify({comments:[],name:'Edited name'});
 assert.equal(feedbackBoot({reviewer:'Example Reviewer',saved}).nodes.get('review-name').value,'Edited name');
});
test('phone panel respects its CSS height cap at both viewport heights',()=>{
 for(const height of [667,900]){
  const a=feedbackBoot({height,width:375});a.nodes.get('review-open').click();
  assert.ok(parseFloat(a.nodes.get('review-panel').style.maxHeight)<=height*.48);
 }
});

test('pointer activation preserves the comment button until click then dismisses help at both widths',()=>{
 for(const width of [375,1440]){
  const a=feedbackBoot({width,popover:{top:450,bottom:800}}),open=a.nodes.get('review-open');
  let prevented=false;open.listeners.pointerdown({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(a.nodes.get('symbol-popover').hidden,false);
  open.click();assert.equal(a.helpClosed(),true);assert.equal(a.nodes.get('review-panel').hidden,false);
  assert.equal(open['aria-expanded'],'true');
 }
});
test('reviewer names retain replacement metacharacters literally',async()=>{
 const {buildReviewCopy}=await import('../scripts/build-review-copy.mjs');
 const reviewer="$& $` $' $$ </script><script>";
 const html=buildReviewCopy(new Date(base.date),reviewer).html;
 assert.ok(html.includes("Private review copy for $&amp; $` $' $$ &lt;/script&gt;&lt;script&gt;. This page is not public yet."));
 assert.equal([...html.matchAll(/<script>/g)].length,5);
});

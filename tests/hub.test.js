const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'), hub=path.join(root,'site/experiments/intelligence-explosion');
const cardsFile=fs.existsSync(path.join(root,'planning/hub-cards.json'))?path.join(root,'planning/hub-cards.json'):path.join(__dirname,'fixtures/hub-cards.json');
const fixtureFile=path.join(__dirname,'fixtures/hub-cards.json');
const writeCards=(tmp,cards)=>{fs.mkdirSync(path.join(tmp,'planning'),{recursive:true});fs.writeFileSync(path.join(tmp,'planning/hub-cards.json'),JSON.stringify(cards));};
test('draft cards stay out of static record and new approved cards build from data',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-test-'));const dir=path.join(tmp,'site/experiments/intelligence-explosion');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(tmp,'site/experiments/spending-puzzle'),{recursive:true});
 fs.copyFileSync(path.join(root,'site/experiments/spending-puzzle/index.html'),path.join(tmp,'site/experiments/spending-puzzle/index.html'));
 const cards=JSON.parse(fs.readFileSync(fixtureFile));assert.ok(cards.every(c=>!c.approved));cards.push({...cards[0],id:'new-card',title:'A new approved card',approved:true});writeCards(tmp,cards);
 cp.execFileSync('python3',[path.join(root,'scripts/build-hub.py')],{cwd:tmp});const page=fs.readFileSync(path.join(dir,'index.html'),'utf8').split('<script type="application/json"')[0];assert.match(page,/id="new-card"/);assert.doesNotMatch(page,/id="chalmers"|id="garicano-imas"/);
});

test('hub margin notes each share a row with their text',()=>{
 const html=fs.readFileSync(path.join(hub,'index.html'),'utf8');
 const rows=[...html.matchAll(/<div class="noted">([\s\S]*?)<aside class="note">([\s\S]*?)<\/aside><\/div>/g)];
 assert.equal(rows.length,(html.match(/<aside class="note">/g)||[]).length);
 assert.equal(rows.filter(([,body])=>/^<p>[1-5]\. /.test(body)).length,5);
 const css=fs.readFileSync(path.join(root,'site/experiments/spending-puzzle/styles.css'),'utf8');
 assert.match(css,/\.noted\{display:grid;grid-template-columns:12rem minmax\(0,1fr\)/);
 assert.match(css,/\.noted>\.note\{grid-column:1;grid-row:1;float:none/);
 for(const width of [900,1440]){
  let y=0, previousBottom=0;
  for(const [,body,note] of rows){
   const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
   const noteHeight=Math.ceil(clean(note).length/23)*19.5+5.6;
   const bodyHeight=Math.ceil(clean(body).length/Math.floor(Math.min(780,width-304)/10))*31;
   assert.ok(y+5.6>=previousBottom,`${width}px: margin notes overlap`);
   previousBottom=y+noteHeight; y+=Math.max(noteHeight,bodyHeight)+16;
  }
 }
});

test('public page contains no draft data and local preview contains every draft',()=>{
 const page=fs.readFileSync(path.join(hub,'index.html'),'utf8');
 const previewPath=path.join(root,'dist/hub-drafts-preview.html');const preview=fs.existsSync(previewPath)?fs.readFileSync(previewPath,'utf8'):null;
 for(const c of JSON.parse(fs.readFileSync(cardsFile))){
  if(!c.approved){assert.ok(!page.includes(c.title));if(preview&&cardsFile.includes('planning'))assert.ok(preview.includes(c.title));}
 }
 const live=JSON.parse(fs.readFileSync(cardsFile));
 if(live.some(c=>c.approved))assert.match(page,/<h2>The record<\/h2>/);else assert.doesNotMatch(page,/The record/); // record section appears only once a card is approved
 assert.doesNotMatch(page,/Worked examples/);
 assert.doesNotMatch(fs.readFileSync(path.join(hub,'app.js'),'utf8'),/URLSearchParams|drafts/);
});

test('approved card links target the card and include its caveats',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-approved-'));
 const dir=path.join(tmp,'site/experiments/intelligence-explosion');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(tmp,'site/experiments/spending-puzzle'),{recursive:true});
 fs.copyFileSync(path.join(root,'site/experiments/spending-puzzle/index.html'),path.join(tmp,'site/experiments/spending-puzzle/index.html'));
 const cards=JSON.parse(fs.readFileSync(fixtureFile));cards[0].approved=true;writeCards(tmp,cards);
 cp.execFileSync('python3',[path.join(root,'scripts/build-hub.py')],{cwd:tmp});
 const page=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(page,/href="#garicano-imas"/);assert.match(page,/Their caveats\./);assert.ok(!page.includes(cards[1].title));
 const app=fs.readFileSync(path.join(hub,'app.js'),'utf8');assert.match(app,/target\.open=true/);assert.match(app,/scrollIntoView/);
});


test('public record is filtered and supports rebuilding without private cards',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-record-'));
 const dir=path.join(tmp,'site/experiments/intelligence-explosion');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(tmp,'site/experiments/spending-puzzle'),{recursive:true});
 fs.copyFileSync(path.join(root,'site/experiments/spending-puzzle/index.html'),path.join(tmp,'site/experiments/spending-puzzle/index.html'));
 const cards=JSON.parse(fs.readFileSync(cardsFile));cards[0].approved=true;writeCards(tmp,cards);
 const run=()=>cp.execFileSync('python3',[path.join(root,'scripts/build-hub.py')],{cwd:tmp});run();
 const record=JSON.parse(fs.readFileSync(path.join(dir,'record.json')));assert.deepEqual(record,cards.filter(c=>c.approved));
 fs.unlinkSync(path.join(tmp,'planning/hub-cards.json'));run();assert.match(fs.readFileSync(path.join(dir,'index.html'),'utf8'),/id="garicano-imas"/);
 fs.unlinkSync(path.join(dir,'record.json'));assert.throws(run, error=>{assert.match(error.stderr.toString(),/No card source found: expected planning\/hub-cards\.json or site\/experiments\/intelligence-explosion\/record\.json/);return true;});
});

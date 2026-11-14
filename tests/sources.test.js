const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const entries=JSON.parse(fs.readFileSync(path.join(root,'data/sources.json'),'utf8')).entries;
const byId=Object.fromEntries(entries.map(e=>[e.id,e]));
const value=id=>{assert.ok(byId[id],`missing source ${id}`);return byId[id].value};
const model=require('../site/experiments/research-machine/engine.js').spendingPuzzle();
test('source ledger records the engine inputs and derived quarter figures',()=>{
 assert.equal(Object.keys(byId).length,entries.length,'source IDs must be unique');
 for(const e of entries) for(const field of ['id','value','units','period','source','location','transformation']) assert.ok(e[field]!==undefined&&e[field]!==null&&e[field]!=='',`${e.id}: ${field}`);
 for(const [key,n] of Object.entries(model.data)) assert.equal(n,value(key),key);
 for(const [i,id] of ['q3_2025','q4_2025','q3_2026'].entries()) assert.equal(model.quarters[i],value(id));
 assert.equal(value('q3_2025'),value('nine2025')-value('h1'));
 assert.equal(value('q4_2025'),value('year2025')-value('nine2025'));
 assert.equal(value('q3_2026'),value('nine2026')-value('actual'));
 for(const [k,id] of Object.entries({progress:'studyProgress',spending:'studySpending',staff:'studyStaff'})) assert.equal(model.studyInputs[k],value(id));
 for(const window of ['matched','janSep']) for(const delay of ['immediate','yearDelay']) assert.equal(model.appendixRatios[window][delay],value(`${window}_${delay}`));
});
test('delay paragraph pairs each window with its own immediate and delayed figures',()=>{
 const html=fs.readFileSync(path.join(root,'site/experiments/spending-puzzle/index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'site/experiments/spending-puzzle/app.js'),'utf8');
 const paragraph=html.match(/<p>Timing matters as well\.[\s\S]*?<\/p>/)[0];
 const comparisons=[['matched','periods that match METR', 'appendix69','appendix40'],['janSep','January to September','appendix64','appendix10']];
 for(const [window,wording,first,second] of comparisons){
  const sentence=paragraph.split('. ').find(s=>s.includes(wording));assert.ok(sentence);
  const spans=[...sentence.matchAll(/<span data-value="([^"]+)">(\d+)<\/span>%/g)];
  assert.deepEqual(spans.map(s=>s[1]),[first,second]);
  for(const [i,delay] of ['immediate','yearDelay'].entries()){
   assert.equal(+spans[i][2],Math.round((1-value(`${window}_${delay}`))*100));
   assert.match(app,new RegExp(`${spans[i][1]}:Math\\.round\\(m\\.appendixFalls\\.${window}\\.${delay}\\*100\\)`));
  }
 }
});
test('other cited source figures remain present in page copy',()=>{
 const html=fs.readFileSync(path.join(root,'site/experiments/spending-puzzle/index.html'),'utf8');
 assert.match(html,new RegExp(`${value('intervalLow')} to ${value('intervalHigh')} times`));
 assert.match(html,new RegExp(`${value('preciseSlopeOld')} and ${value('preciseSlopeNew').toFixed(2)}`));
 assert.match(html,new RegExp(`about ${value('illustrationPace')} points a year`));
 assert.equal(value('illustrationGrowth'),4);assert.match(html,/roughly quadruple each year/);
});
test('margin labels distinguish quotations, study findings and accounting figures',()=>{
 const html=fs.readFileSync(path.join(root,'site/experiments/spending-puzzle/index.html'),'utf8');
 for(const [tag,text] of [['QUOTED',"Krier's post"],['CLAIMED','Bloom, Jones'],['MEASURED',"From the project's open records"],['MEASURED',"Anthropic's two filings"]]){
  const notes=[...html.matchAll(/<aside class="note"><strong>([^<]+)<\/strong> ([\s\S]*?)<\/aside>/g)];
  const note=notes.find(n=>n[2].includes(text));assert.ok(note, text);assert.equal(note[1],tag,text);
 }
});

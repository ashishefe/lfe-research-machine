const fs=require('node:fs'), path=require('node:path'), {createRequire}=require('node:module');
const filename=path.resolve('tests/app.test.js');
const prefix=fs.readFileSync(filename,'utf8').split('function assertFiniteMarkup')[0];
const boot=new Function('require','__dirname',prefix+';return boot;')(createRequire(filename),path.dirname(filename));
const app=boot(), file='site/experiments/research-machine/index.html';
let html=fs.readFileSync(file,'utf8');
for(const [id,tag] of [['equations','div'],['chart-time','div'],['derivation','ol'],['time-sensitivity','p'],['takeaway-lead','p'],['takeaway-range','p'],['takeaway-rows','tbody']]) {
 const re=new RegExp(`(<${tag}[^>]*id="${id}"[^>]*>)[\\s\\S]*?(</${tag}>)`);
 html=html.replace(re,(_,open,close)=>open+(id==='time-sensitivity'?app.nodes.get(id).textContent:app.nodes.get(id).innerHTML.replace(/<button[^>]*class="symbol"[^>]*>([\s\S]*?)<\/button>/g,'$1'))+close);
}
const description=app.nodes.get('takeaway-lead').innerHTML.replace(/<br>/g,' ');
html=html.replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*(">)/g,(_,open,close)=>open+description+close);
// Static scenario rows use the same engine-derived render as the live list.
html=html.replace(/(<div id="scenarios">)[\s\S]*?(<\/div>)/,(_,open,close)=>open+app.nodes.get('scenarios').innerHTML.replace(/<button[^>]*>([\s\S]*?)<\/button>/g,'<span class="scenario-row">$1</span>')+close);
fs.writeFileSync(file,html);

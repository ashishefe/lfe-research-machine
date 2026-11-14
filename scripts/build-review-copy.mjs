import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=resolve(root,'site/experiments/research-machine');
const read=p=>readFileSync(p,'utf8');
const script=s=>s.replace(/<\/script/gi,'<\\/script');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildReviewCopy(date=new Date(), reviewer='') {
 reviewer=reviewer.trim();
 let html=read(resolve(page,'index.html'));
 html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>`<script>${script(read(resolve(page,src)))}</script>`)
  .replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,src)=>`<style>${read(resolve(page,src.split("?")[0]))}</style>`);
 html=html.replace(/(<(?:header|div) class="(?:site-bar|topic-bar)">)[\s\S]*?(<\/(?:header|div)>)/g,part=>part.replace(/href="([^"]+)"/g,(_,href)=>`href="${(href==='index.html'||href.includes('/research-machine/'))?'#':href==='../spending-puzzle/'?'https://lfe.econforeverybody.com/experiments/spending-puzzle/':href==='../intelligence-explosion/'?'https://lfe.econforeverybody.com/experiments/intelligence-explosion/':new URL(href,'https://lfe.econforeverybody.com/').href}"`));
 html=html.replaceAll('href="../intelligence-explosion/"','href="https://lfe.econforeverybody.com/experiments/intelligence-explosion/"');
 html=html.replaceAll('href="../research-machine/"','href="https://lfe.econforeverybody.com/experiments/research-machine/"');
 html=html.replaceAll('href="../spending-puzzle/"','href="https://lfe.econforeverybody.com/experiments/spending-puzzle/"');
 html=html.replace(/(<header class="shell masthead">)/,()=>`<p class="review-banner">Private review copy${reviewer?' for '+escape(reviewer):''}. This page is not public yet.</p>\n<header class="shell masthead">`);
 html=html.replace('</head>',()=>`<meta name="robots" content="noindex"><meta name="reviewer-name" content="${escape(reviewer)}"><style>${read(resolve(root,'review/feedback.css'))}</style></head>`);
 const feedback=read(resolve(root,'review/feedback.js'));
 const id=`${date.toISOString().slice(0,10)}-${createHash('sha256').update(html+feedback).digest('hex').slice(0,10)}`;
 html=html.replace('</head>',()=>`<meta name="review-build" content="${id}"></head>`);
 html=html.replace('</body>',()=>`<script>${script(feedback)}</script></body>`);
 return {html,id};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2);
 if(args.length && (args.length!==2 || args[0]!=='--reviewer' || !args[1].trim()))throw Error('Usage: node scripts/build-review-copy.mjs [--reviewer "Name"]');
 const {html,id}=buildReviewCopy(new Date(),args[1]||'');mkdirSync(resolve(root,'dist'),{recursive:true});
 writeFileSync(resolve(root,'dist/research-machine-review.html'),html);console.log(`Built dist/research-machine-review.html (${id})`);
}

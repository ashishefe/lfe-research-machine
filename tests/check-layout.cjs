const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try {
  const page=await browser.newPage();
  for(const width of [1440,375]) for(const name of ['intelligence-explosion','spending-puzzle','research-machine']){
   await page.setViewportSize({width,height:1000});
   await page.goto('file://'+path.resolve(`site/experiments/${name}/index.html`));
   const result=await page.evaluate(()=>{
    const nav=document.querySelector('.project-nav'), links=[...nav.querySelectorAll('a')], rects=links.map(a=>a.getBoundingClientRect()), n=nav.getBoundingClientRect(), bar=document.querySelector('.topic-bar .bar-inner').getBoundingClientRect();
    return {gap:parseFloat(getComputedStyle(nav).columnGap), separated:rects.every((r,i)=>!i||r.left>=rects[i-1].right+1), aligned:Math.abs(rects[0].left-bar.left)<2, oneLine:rects.every(r=>Math.abs(r.top-rects[0].top)<1), contained:document.documentElement.scrollWidth<=innerWidth, current:links.filter(a=>a.getAttribute('aria-current')==='page').length};
   });
   if(!(result.gap>0&&result.separated&&result.aligned&&result.oneLine&&result.contained&&result.current===1))throw Error(`${name} ${width}: ${JSON.stringify(result)}`);
   if(name==='intelligence-explosion'){
    const details=await page.evaluate(()=>{
     const notes=[...document.querySelectorAll('.note')].map(n=>({note:n.getBoundingClientRect(),body:n.parentElement.querySelector('p').getBoundingClientRect()}));
     const items=[...document.querySelectorAll('section:nth-of-type(2) .noted > p')].slice(0,5).map(p=>({font:getComputedStyle(p).fontSize,top:p.getBoundingClientRect().top}));
     const head=document.querySelector('.head');return {notes,items,headOverflow:head.scrollWidth>head.clientWidth,headHeight:head.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(head).lineHeight)};
    });
    if(width>=900){for(let i=0;i<details.notes.length;i++){const x=details.notes[i];if(Math.abs(x.note.top-x.body.top)>8)throw Error(`note ${i} not aligned`);if(i&&x.note.top<details.notes[i-1].note.bottom-1)throw Error(`note ${i} overlaps`);}}
    if(new Set(details.items.map(x=>x.font)).size!==1)throw Error('item font sizes differ');
    if(details.headOverflow)throw Error('dateline overflows');
   }
   console.log(`${name} ${width}: passed`);
  }
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

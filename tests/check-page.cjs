const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
for(const dir of ['qa/browser-profile','qa/browser-tmp','qa/browser-output'])fs.mkdirSync(path.resolve(dir),{recursive:true});
(async()=>{
 const context=await chromium.launchPersistentContext(path.resolve('qa/browser-profile'),{...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,viewport:{width:1440,height:1000},args:['--use-mock-keychain','--password-store=basic','--disable-background-networking','--disable-component-update','--no-first-run'],env:{...process.env,TMPDIR:path.resolve('qa/browser-tmp')}});
 await context.route('http://**',r=>r.abort()); await context.route('https://**',r=>r.abort());
 const page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url='file://'+path.resolve('site/experiments/research-machine/index.html');
 await page.goto(url);
 if(await page.locator('#script-note').isVisible())throw Error('Script notice visible after startup');
 if(!/about 6 times/.test(await page.locator('#takeaway-lead').innerText()))throw Error('Missing takeaway');
 console.log('Initial:',await page.locator('#forward-readout').innerText(),await page.locator('#inverse-readout').innerText());
 await page.locator('#tab-workings').click();
 if(await page.locator('#equations details[open]').count())throw Error('Explanations start open');
 if(await page.locator('#equations > article').count()!==5)throw Error('Missing cards');
 if(await page.locator('#equations > article > .formula:not(.substitution) var').evaluateAll(els=>els.some(el=>!el.closest('[data-help]'))))throw Error('Unexplained symbol');
 const symbol=page.locator('#research [data-help="L"]').first();
 await symbol.focus();await symbol.click();
 if(!await page.locator('#symbol-popover').isVisible())throw Error('Click after focus closed help');
 await page.locator('[data-help-close]').click();
 if(await page.locator('#symbol-popover').isVisible())throw Error('Close reopened help');
 const question=page.locator('#all-controls [data-help="A"]');await question.click();
 if(!/Turn it up: Less labour needed/.test(await page.locator('#symbol-popover').innerText()))throw Error('Missing slider explanation');
 await page.keyboard.press('Escape');
 await page.locator('#research summary').click();
 await page.locator('#work-A').evaluate(el=>{el.value=.8;el.dispatchEvent(new Event('input',{bubbles:true}));});
 if(!await page.locator('#research details').getAttribute('open').then(v=>v!==null))throw Error('Rerender closed disclosure');
 await page.locator('[data-reset]').first().click();
 await page.locator('#derivation details').last().evaluate(el=>el.open=true);
 await page.locator('#work-A').evaluate(el=>{el.value=.9;el.dispatchEvent(new Event('input',{bubbles:true}));});
 if(!await page.locator('#derivation details').last().evaluate(el=>el.open))throw Error('Why disclosure closed');
 const first=page.locator('#research .formula').first().locator('.symbol').first();await first.focus();
 await page.keyboard.press('ArrowRight');
 if(await first.evaluate(el=>el.tabIndex)!==-1)throw Error('Roving tabindex did not advance');
 await page.locator('#time-link [data-help="beta"]').first().focus();
 await page.evaluate(()=>window.scrollBy(0,100));
 if(!await page.locator('#symbol-popover').isVisible())throw Error('Focused help closed during scroll');
 await page.keyboard.press('Escape');
 console.log('Symbol focus/click/Close, roving arrows, focused scrolling and persistent disclosures: pass');
 // inspect both research forms at desktop and phone widths.
 for(const width of [1440,375])for(const form of ['cd','ces']) {
  await page.setViewportSize({width,height:1000});
  await page.locator('[name="form"][value="'+form+'"]').check();
  if(!await page.locator('#research details').evaluate(el=>el.open))throw Error('Form switch closed explanation');
  const copy=await page.locator('#research details').innerText();
  if(form==='cd'&&/[σρ]/.test(copy))throw Error('CD explains hidden symbols');
  if(form==='ces'&&await page.locator('#research > .formula [data-help="sigma"]').count()!==2)throw Error('Missing CES sigma definition');
  const bad=await page.locator('#research > .formula:first-of-type .equation-line').evaluateAll((lines,width)=>lines.some(line=>{
   if(line.scrollWidth>line.clientWidth+1)return true;
   if(width!==1440)return false;
   const bounds=[];
   for(const node of line.childNodes){
    if(node.nodeType===Node.TEXT_NODE){const r=document.createRange();r.selectNodeContents(node);bounds.push(...r.getClientRects());}
    else bounds.push(...node.getClientRects());
   }
   const box=line.getBoundingClientRect();
   return bounds.some(r=>r.height>0&&r.top>box.top+box.height*.65);
  }),width);
  if(bad)throw Error('Research equation wrap/overflow '+width+' '+form);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflow '+width+' '+form);
  console.log('Research equation layout',width,form,'pass');
 }

 for(const width of [1440,375]) for(const theme of ['light','dark']) for(const view of ['machine','workings']) {
   await page.setViewportSize({width,height:1000});
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await page.locator('#tab-'+view).click();
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+width+' '+theme+' '+view);
   console.log('Layout',width,theme,view,await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,bad:[...document.querySelectorAll('svg text')].filter(t=>t.getBoundingClientRect().width&&(()=>{const b=t.getBBox(),s=t.ownerSVGElement.viewBox.baseVal;return b.x<0||b.x+b.width>s.width+1})()).map(t=>t.textContent)})));
   await page.screenshot({path:`qa/browser-output/${view}-${width}-${theme}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#tab-machine').click();
 await page.locator('[data-case="6"]').click();console.log('Wall:',await page.locator('#inverse-readout').innerText());
 await page.locator('#tab-workings').click();
 console.log('Case sync sigma',await page.locator('#work-sigma').inputValue());
 await page.locator('[name="form"][value="cd"]').check();
 await page.locator('#work-A').evaluate(e=>{e.value=.8;e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#tab-machine').click();console.log('Synced A',await page.locator('#simple-A').inputValue(),await page.locator('#inverse-readout').innerText());
 await page.locator('[data-reset]').first().click();
 await page.locator('#tab-machine').focus();await page.keyboard.press('ArrowRight');
 console.log('Keyboard',await page.locator('#tab-workings').getAttribute('aria-selected'),await page.evaluate(()=>document.activeElement.id),await page.evaluate(()=>location.hash));
 await page.emulateMedia({reducedMotion:'reduce'});
 console.log('Reduced motion animations:',await page.locator('animateMotion').count());
 await page.locator('#tab-machine').click();
 for(const input of await page.locator('[data-key]').all()) {
   // Work through hidden and visible controls via DOM; exercise every extreme.
   for(const edge of ['min','max']) {
    const value=await input.getAttribute(edge);if(value===null||value==='0')continue;
    await input.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
    const bad=await page.evaluate(()=>[...document.querySelectorAll('svg')].some(e=>/NaN|Infinity/.test(e.outerHTML))||/NaN|Infinity/.test(document.body.innerText));
    if(bad)throw Error('Non-finite UI '+await input.getAttribute('id')+' '+edge);
    await page.locator('[data-reset]').first().click();
   }
 }
 console.log('All control extremes: no NaN or Infinity');
 console.log('Errors',JSON.stringify(errors));
 await context.close();
 const nojs=await chromium.launchPersistentContext(path.resolve('qa/browser-output/nojs-profile'),{...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,javaScriptEnabled:false,viewport:{width:375,height:1000},env:{...process.env,TMPDIR:path.resolve('qa/browser-tmp')}});
 const staticPage=await nojs.newPage();await staticPage.goto(url);
 if(await staticPage.locator('input:visible').count())throw Error('Controls visible with JavaScript blocked');
 if(await staticPage.locator('.interactive-only:visible').count())throw Error('Change the inputs visible with JavaScript blocked');
 if(await staticPage.locator('#equations button.symbol, #derivation button.symbol').count())throw Error('Static symbols are interactive');
 if(!/about 6 times/.test(await staticPage.locator('#takeaway-lead').innerText()))throw Error('Missing static takeaway');
 if(await staticPage.locator('#takeaway-rows tr').count()!==3)throw Error('Missing static ladder');
 if(await staticPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Static horizontal overflow');
 console.log('Blocked-script controls hidden; native explanations and plain symbols retained');
 console.log('No JS',await staticPage.locator('#machine').isVisible(),await staticPage.locator('#workings').isVisible(),await staticPage.locator('#script-note').innerText(),await staticPage.evaluate(()=>document.documentElement.scrollWidth));
 await staticPage.screenshot({path:'qa/browser-output/no-js-375.png',fullPage:true});await nojs.close();
 for(const script of ['app.js','engine.js','help.js']) {
  const blocked=await chromium.launchPersistentContext(path.resolve('qa/browser-output/blocked-'+script+'-profile'),{...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,viewport:{width:375,height:1000},args:['--use-mock-keychain','--password-store=basic','--disable-background-networking','--disable-component-update','--no-first-run'],env:{...process.env,TMPDIR:path.resolve('qa/browser-tmp')}});
  await blocked.route('http://**',r=>r.abort());await blocked.route('https://**',r=>r.abort());
  await blocked.route('**/'+script,r=>r.abort());
  const failed=await blocked.newPage();await failed.goto(url);
  if(!await failed.locator('#script-note').isVisible())throw Error('Missing notice after '+script+' fails');
  if(await failed.locator('input:visible').count())throw Error('Controls visible after '+script+' fails');
  if(!await failed.locator('#machine').isVisible()||!await failed.locator('#workings').isVisible())throw Error('Missing static view after '+script+' fails');
  console.log('Failed script fallback:',script,'notice and both views visible; controls hidden');await blocked.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});

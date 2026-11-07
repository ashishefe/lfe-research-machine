// Optional rendered review checks. Requires an already installed Playwright and browser.
const {chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const work=path.resolve('qa/browser-output');fs.mkdirSync(work,{recursive:true});
 const browserTmp=path.resolve('qa/browser-tmp');fs.mkdirSync(browserTmp,{recursive:true});
 const context=await chromium.launchPersistentContext(path.join(work,'review-profile'),{headless:true,env:{...process.env,TMPDIR:browserTmp},...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--use-mock-keychain','--password-store=basic','--disable-background-networking','--disable-component-update','--disable-breakpad','--no-first-run']});
 try {
  let requests=0;await context.route(/https?:/,r=>{requests++;return r.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,375])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.goto('file://'+path.resolve('dist/research-machine-review.html'));
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   await page.locator('#tab-workings').click();
   await page.locator('#research [data-help="L"]').first().click();
   if(!await page.locator('#symbol-popover').isVisible())throw Error('Symbol help did not open');
   await page.locator('#review-open').click();
   if(!await page.locator('#review-panel').isVisible())throw Error(`One click failed to open comments at ${width}`);
   if(await page.locator('#symbol-popover').isVisible())throw Error('Comment click did not dismiss help');
   if(width===375&&await page.locator('#review-panel').evaluate(el=>el.getBoundingClientRect().height>innerHeight*.48+1))throw Error('Phone panel exceeds CSS cap');
   await page.locator('#tab-machine').click();
   if(!/^The machine/.test(await page.locator('#review-where').inputValue()))throw Error('Automatic location did not follow tab');
   await page.locator('#review-where').fill('My location');await page.locator('#tab-workings').click();
   if(await page.locator('#review-where').inputValue()!=='My location')throw Error('Custom location overwritten');
   await page.locator('#review-text').fill('Saved comment');await page.locator('#review-form button[type=submit]').click();
   await page.locator('#review-text').fill('Unsaved draft');await page.locator('#review-list li').last().getByRole('button',{name:'Delete',exact:true}).click();
   if(await page.locator('#review-text').inputValue()!=='Unsaved draft')throw Error('Delete erased draft');
   await page.locator('#review-close').click();
   for(const tab of ['machine','workings']){
    await page.locator('#tab-'+tab).click();await page.locator('#review-open').click();
    await page.locator('#review-text').fill('  <&>\nSecond line  ');await page.locator('#review-form button[type=submit]').click();
    if(await page.locator('#review-list li').count()<1)throw Error('Comment missing');
    await page.locator('#review-list button').first().click();await page.locator('#review-text').fill('Edited');await page.locator('#review-form button[type=submit]').click();
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#review-download').click()]);await download.saveAs(path.join(work,`comments-${width}-${theme}-${tab}.md`));
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
    await page.screenshot({path:path.join(work,`review-${width}-${theme}-${tab}.png`)});await page.locator('#review-close').click();
   }
  }
  if(errors.length||requests)throw Error(JSON.stringify({errors,requests}));console.log('Review: 1440/375, light/dark, both tabs; one-click comments with symbol help open, phone height cap, location tracking, draft preservation, save/edit/download; no page errors or network requests.');
 }finally{await context.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

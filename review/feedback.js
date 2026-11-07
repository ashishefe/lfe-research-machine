(function(root) {
 'use strict';
 // Round export values only; saved engine snapshots retain their full precision.
 const formatNumber=value=>typeof value==='number' && Number.isFinite(value)
  ?value.toPrecision(4).replace(/(\.\d*?[1-9])0+(?=e|$)|\.0+(?=e|$)/g,'$1'):value;
 const formatSetting=setting=>setting.replace(/( = )(.+)$/,(_,equals,value)=>
  equals+(Number.isFinite(Number(value))?formatNumber(Number(value)):value));
 function commentsToMarkdown({name,date,buildId,comments}) {
  return `# Comments on The research machine\n\nFrom: ${name}\nDate: ${date}\nPage build: ${buildId}\n`+comments.map((c,i)=>
   `\n## Comment ${i+1}\n\nWhere: ${c.where}\n\n`+(c.snapshot?`Settings changed from the defaults: ${c.snapshot.changed.length?c.snapshot.changed.map(formatSetting).join('; '):'none'}\nResult at these settings: speedup ${formatNumber(c.snapshot.speedup)}; labour needed for target ${formatNumber(c.snapshot.labour)}\n\n`:'')+c.text+'\n').join('');
 }
 if(typeof module==='object' && module.exports)module.exports={commentsToMarkdown};
 if(!root?.document)return;
 const d=root.document, key='research-machine-review-comments-v1';
 let comments=[],name=d.querySelector('meta[name="reviewer-name"]')?.content||'',revision=0,downloaded=0,editing=null,whereEdited=false;
 try {const saved=JSON.parse(root.localStorage.getItem(key));if(saved && Array.isArray(saved.comments)){comments=saved.comments;name=saved.name??name;revision=saved.revision??1;downloaded=saved.downloaded??0;}}catch{}
 const persist=()=>{try{root.localStorage.setItem(key,JSON.stringify({comments,name,revision,downloaded}));}catch{}};
 const host=d.createElement('div');host.id='review-feedback';
 host.innerHTML=`<button type="button" id="review-open" aria-controls="review-panel" aria-expanded="false">Add a comment</button>
 <aside id="review-panel" aria-label="Comments" hidden><button type="button" id="review-close">Close</button><h2>Comments</h2>
 <form id="review-form"><label>Your name<input id="review-name" autocomplete="name"></label><label>Where<input id="review-where"></label>
 <p class="review-hint">Three things would help most: did we get your model right, is anything unfair to you, and what would you change? Comments stay in this browser until you download them. Nothing is sent anywhere.</p>
 <textarea id="review-text" aria-label="Comment" placeholder="What's wrong, unclear or missing?" required></textarea>
 <label class="review-attach"><input id="review-attach" type="checkbox" checked>Attach the current settings</label>
 <button type="submit">Save comment</button><button type="button" id="review-cancel" hidden>Cancel edit</button></form>
 <p id="review-status" role="status"></p><ol id="review-list"></ol><button type="button" id="review-download">Download comments (.md)</button><p>Send the file back to Ashish.</p></aside>`;
 d.body.append(host);
 const $=id=>d.getElementById('review-'+id),panel=$('panel');$('name').value=name;
 const buildId=d.querySelector('meta[name="review-build"]').content;
 function where() {
  const tab=d.getElementById('workings').hidden?'machine':'workings',area=d.getElementById(tab);
  const headings=[...area.querySelectorAll('h2,h3')].filter(h=>!h.closest('[hidden]'));
  headings.sort((a,b)=>Math.abs(a.getBoundingClientRect().top-root.innerHeight/2)-Math.abs(b.getBoundingClientRect().top-root.innerHeight/2));
  return `${tab==='machine'?'The machine':'The workings'}${headings[0]?' › '+headings[0].innerText.replace(/\s+/g,' ').trim().replace(/\s*\?\s*$/,''):''}`;
 }
 function render() {
  $('list').replaceChildren();
  comments.forEach((c,i)=>{const li=d.createElement('li'),place=d.createElement('strong'),text=d.createElement('p');place.textContent=c.where;text.textContent=c.text;li.append(place,text);
   for(const action of ['Edit','Delete']){const b=d.createElement('button');b.type='button';b.textContent=action;b.addEventListener('click',()=>{
    if(action==='Delete'){
     if(editing===i)$('cancel').click();else if(editing!==null&&editing>i)editing--;
     comments.splice(i,1);revision++;persist();render();return;
    }
    editing=i;whereEdited=true;$('where').value=c.where;$('text').value=c.text;$('attach').checked=!!c.snapshot;$('cancel').hidden=false;$('text').focus();
   });li.append(b);} $('list').append(li);
  });$('download').disabled=!comments.length;
 }
 // Keep the button still until click: focus would dismiss help and move it on pointerdown.
 $('open').addEventListener('pointerdown',event=>event.preventDefault());
 $('open').addEventListener('click',()=>{root.ResearchHelp?.close();panel.hidden=false;$('open').setAttribute('aria-expanded','true');if(editing===null&&!whereEdited)$('where').value=where();$('text').focus();position();});
 $('close').addEventListener('click',()=>{panel.hidden=true;$('open').setAttribute('aria-expanded','false');$('open').focus();});
 $('cancel').addEventListener('click',()=>{editing=null;whereEdited=false;$('text').value='';$('attach').checked=true;$('where').value=where();$('cancel').hidden=true;});
 $('where').addEventListener('input',()=>{whereEdited=true;});
 new MutationObserver(()=>{if(!panel.hidden&&editing===null&&!whereEdited)$('where').value=where();}).observe(d.getElementById('workings'),{attributes:true,attributeFilter:['hidden']});
 $('name').addEventListener('input',()=>{name=$('name').value;revision++;persist();});
 $('form').addEventListener('submit',event=>{event.preventDefault();if(!$('text').value.trim())return;
  const comment={where:$('where').value,text:$('text').value};
  if($('attach').checked)comment.snapshot=root.ResearchMachineApp.snapshot();
  if(editing===null)comments.push(comment);else comments[editing]=comment;
  revision++;persist();$('cancel').click();render();$('status').textContent='Comment saved.';
 });
 $('download').addEventListener('click',()=>{
  const date=new Date().toISOString(),markdown=commentsToMarkdown({name,date,buildId,comments});
  const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'})),a=d.createElement('a');
  a.href=url;a.download=`research-machine-comments-${date.slice(0,10)}.md`;d.body.append(a);a.click();a.remove();root.setTimeout(()=>URL.revokeObjectURL(url),1000);
  downloaded=revision;persist();
 });
 root.addEventListener('beforeunload',event=>{if(comments.length && revision!==downloaded){event.preventDefault();event.returnValue='';}});
 // Move the controls into free space above an explanation sheet or sticky readout.
 function position(){
  const blockers=['symbol-popover','compact-readout'].map(id=>d.getElementById(id)).filter(el=>el&&!el.hidden).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<root.innerHeight);
  let bottom=12,top=12;
  for(const r of blockers) {
   if((r.top+r.bottom)/2>root.innerHeight/2)bottom=Math.max(bottom,root.innerHeight-r.top+12);
   else top=Math.max(top,r.bottom+12);
  }
  $('open').style.bottom=bottom+'px';panel.style.bottom=(bottom+48)+'px';
  const limit=Number(root.getComputedStyle(panel).getPropertyValue('--review-height-limit'));
  panel.style.maxHeight=Math.max(0,Math.min(root.innerHeight*limit,root.innerHeight-bottom-48-top))+'px';
 }
 root.addEventListener('resize',position);root.addEventListener('scroll',position,{passive:true});
 new MutationObserver(position).observe(d.getElementById('symbol-popover'),{attributes:true,attributeFilter:['hidden','style','class']});
 render();position();
})(typeof window==='undefined'?null:window);

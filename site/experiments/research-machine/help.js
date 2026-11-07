(function () {
'use strict';
const entries = {
  "S": {
    "name": "Software",
    "meaning": "The stock of methods. S = 2 means today's methods get as much from compute as twice the compute did before.",
    "turn": ""
  },
  "C": {
    "name": "Training compute",
    "meaning": "The computing power used to train models.",
    "turn": ""
  },
  "Cr": {
    "name": "Training compute ratio",
    "meaning": "Training compute compared with the baseline path, at the end of W years.",
    "turn": ""
  },
  "L": {
    "name": "Research labour",
    "meaning": "Human researchers plus AI doing research work, in researcher-equivalents, compared with baseline. 2 means twice the baseline.",
    "turn": "A faster pace of new methods, usually with less from each extra unit."
  },
  "E": {
    "name": "Experiment compute",
    "meaning": "Computing power for research experiments, compared with baseline.",
    "turn": "A faster pace of new methods, usually with less from each extra unit."
  },
  "A": {
    "name": "Research productivity",
    "meaning": "How much the lab finds from a given effort, compared with baseline. Below 1 means ideas have got harder to find.",
    "turn": "Less labour needed."
  },
  "g": {
    "name": "Software growth",
    "meaning": "How fast S grows, in doublings a year.",
    "turn": ""
  },
  "g0": {
    "name": "Baseline software growth",
    "meaning": "How fast S grew before the speedup.",
    "turn": ""
  },
  "c": {
    "name": "Training growth",
    "meaning": "How fast training compute grows, in doublings a year.",
    "turn": ""
  },
  "c0": {
    "name": "Baseline training growth",
    "meaning": "How fast training compute grew before the speedup.",
    "turn": ""
  },
  "G": {
    "name": "Software speedup",
    "meaning": "The new pace of software divided by the old pace.",
    "turn": ""
  },
  "F": {
    "name": "Research production function",
    "meaning": "Turns labour and experiment compute into research output. F = 1 at baseline.",
    "turn": ""
  },
  "Tg": {
    "name": "Required research output",
    "meaning": "The value of F the lab must reach to hit the target.",
    "turn": ""
  },
  "a": {
    "name": "Labour weight",
    "meaning": "How much labour counts in research, against experiment compute.",
    "turn": "Labour matters more. Labour needed falls if it is above E and rises if it is below E."
  },
  "sigma": {
    "name": "Elasticity of substitution",
    "meaning": "How far more research labour can stand in for more experiments. 1 is Cobb-Douglas.",
    "turn": "Labour and experiments swap more easily."
  },
  "rho": {
    "name": "Substitution parameter",
    "meaning": "σ rewritten for the CES formula: ρ = (σ − 1)/σ.",
    "turn": ""
  },
  "lambda": {
    "name": "Returns to scale",
    "meaning": "How the pace of new methods responds when both inputs grow together. 1 means in step. Below 1, researchers start to duplicate each other. Above 1, the pace outruns the inputs.",
    "turn": "With inputs above baseline the pace rises. With inputs below baseline it falls further."
  },
  "beta": {
    "name": "Ideas getting harder",
    "meaning": "Each extra doubling of S multiplies A by 2<sup>−<var>β</var></sup>. 0 means ideas do not get harder.",
    "turn": "Labour needed climbs faster over time."
  },
  "k": {
    "name": "Total compute",
    "meaning": "The whole compute pool. k compares it with the baseline path.",
    "turn": "More for both experiments and training."
  },
  "phi0": {
    "name": "Experiment share",
    "meaning": "The share of compute that goes to experiments, before and after.",
    "turn": "More for experiments, less for training."
  },
  "W": {
    "name": "Compute-change period",
    "meaning": "The years over which a change in training compute takes effect.",
    "turn": "The same change moves yearly training growth less."
  },
  "T0": {
    "name": "Baseline pace",
    "meaning": "Growth of effective compute before the speedup, in doublings a year. Illustrative.",
    "turn": ""
  },
  "s": {
    "name": "Software share",
    "meaning": "The part of baseline progress that came from software. Tejas supposes two-thirds.",
    "turn": ""
  },
  "X": {
    "name": "Target speedup",
    "meaning": "The reported speedup the model tries to reach. METR's estimate is about 2.",
    "turn": "More labour needed."
  },
  "Xe": {
    "name": "Effective compute speedup",
    "meaning": "The speedup in effective compute, after h and b.",
    "turn": ""
  },
  "X_out": {
    "name": "Index speedup",
    "meaning": "The speedup the inputs produce, read on the index.",
    "turn": ""
  },
  "h": {
    "name": "AI share",
    "meaning": "The share of the speedup that AI caused.",
    "turn": ""
  },
  "b": {
    "name": "Index bridge",
    "meaning": "How much effective compute speeds up for each unit of index speedup.",
    "turn": ""
  },
  "D(t)": {
    "name": "Extra software doublings",
    "meaning": "How many more doublings S has had by year t than on the baseline path.",
    "turn": ""
  },
  "A(t)": {
    "name": "Productivity at year t",
    "meaning": "A after t years at the fast pace.",
    "turn": ""
  },
  "L0": {
    "name": "Baseline labour",
    "meaning": "Starting amounts of labour and compute, for display. They cancel out, so they do not change any result.",
    "turn": ""
  },
  "K": {
    "name": "Total compute",
    "meaning": "The whole compute pool. k compares it with the baseline path.",
    "turn": "More for both experiments and training."
  },
  "phi1": {
    "name": "Experiment share",
    "meaning": "The share of compute that goes to experiments, before and after.",
    "turn": "More for experiments, less for training."
  },
  "K0": {
    "name": "Baseline compute",
    "meaning": "Starting amounts of labour and compute, for display. They cancel out, so they do not change any result.",
    "turn": ""
  },
  "G1": {
    "name": "Software speedup through W",
    "meaning": "G₁ applies through W years.",
    "turn": ""
  },
  "G2": {
    "name": "Software speedup after W",
    "meaning": "G₂ applies after W.",
    "turn": ""
  },
  "t": {
    "name": "Year",
    "meaning": "Time in years from the start of the fast pace.",
    "turn": ""
  }
};
Object.assign(entries, {
 phi0:{name:'Baseline experiment share',meaning:'The share of compute that went to experiments before the change.',turn:'Less experiment compute and more training compute, compared with baseline.'},
 phi1:{name:'New experiment share',meaning:'The share of compute that goes to experiments after the change.',turn:'More for experiments, less for training.'},
 inner:{name:'CES working term',meaning:'A working term in the CES solution.',turn:''},
 log2:{name:'Base-two logarithm',meaning:'How many doublings a ratio equals.',turn:''},
 max:{name:'Maximum',meaning:'The larger or smaller of two values.',turn:''},
 min:{name:'Minimum',meaning:'The larger or smaller of two values.',turn:''},
 F_max:{name:'Research output ceiling',meaning:'The highest research output experiment compute permits when research labour and experiments are hard to swap.',turn:''},
 G_max:{name:'Software speedup ceiling',meaning:'The highest software speedup the research output ceiling permits.',turn:''},
 X_max:{name:'Index speedup ceiling',meaning:'The index speedup at the software speedup ceiling.',turn:''}
});
const plain = {
  "final-sector": "A model gets better in two ways: more training compute, or better methods. The two multiply, so doubling either one doubles effective compute. In growth rates the multiplying becomes adding: growth in effective compute equals growth in C plus growth in S. That lets us split baseline growth: s to software, 1 − s to training. Tejas supposes two-thirds and one-third. No research labour appears in this equation. Research labour comes in one step earlier, in the research lab. Methods are non-rival: each run uses all of S.",
  "research": "This equation makes new methods. Its output is a pace: how fast S grows. Its inputs are research labour, human or AI, and experiment compute. With equal weights and λ = 1, neither input can do the work alone: four times the labour only doubles the pace. A scales the whole result. If ideas get harder to find, A falls and the same lab finds less. Cobb-Douglas builds in one fixed answer to how far more research labour can stand in for more experiments, so no symbol for it appears here. Choose CES below to set it yourself.",
  "compute-link": "A lab has one pool of compute and two uses for it: experiments and training. φ₀ and φ₁ are the shares that go to experiments before and after the change. If the pool stays the same, more for experiments means less for training. If the pool doubles and the split stays the same, both double. Experiments get a change at once. A change in training takes W years to show in full. The experiment dial on The machine holds <var>C</var><sub>r</sub> fixed.",
  "index-link": "The model works in effective compute, but METR reports a benchmark index. This card turns one into the other. With h and b both at 1, the two speedups are the same. h says how much of the speedup AI caused. b says how the index speedup relates to the effective compute speedup. Only b × h enters. Lowering h means more of the reported speedup comes from outside AI, so the same inputs report a larger speedup. With h below 1, the labour figure covers only the part attributed to AI. The target X enters through <var>X</var><sub>e</sub> = 1 + <var>b</var> × <var>h</var> × (<var>X</var> − 1).",
  "time-link": "Going faster uses up the easy ideas faster. Unless β is 0, A keeps falling while the fast pace lasts, so the labour needed climbs. A cut in training compute can make it drop once, at year W. Read the shape of the line. Its size depends on β and on g₀, which comes from T₀. Both are our illustrative numbers."
};
const researchCES = "This equation makes new methods. Its output is a pace: how fast S grows. Its inputs are research labour, human or AI, and experiment compute. A scales the whole result. If ideas get harder to find, A falls and the same lab finds less. σ says how far more research labour can stand in for more experiments. ρ is the same number rewritten for the formula. Below σ = 1 they are hard to swap, and past some point more labour adds little. Above 1, either input can do it alone.";
const why = ["Start from the target speedup. Adjust it for how much AI caused and for how the index relates to effective compute.", "Take away what training compute supplies. Software must supply the rest.", "Divide by research productivity, then undo the power λ. This gives what the lab's research labour and experiment compute must produce.", "Undo the production function to find the labour that produces it."];
const charts = {
  "chart-forward-help": "Moving right multiplies labour. The line shows the speedup that labour gives, with everything else as set. The shaded band is what METR would not be surprised by.",
  "chart-time-help": "Each year at the fast pace makes ideas harder to find, so the labour needed climbs, unless β is 0. Equal steps up the chart multiply labour by the same amount. The dashed line shows the case where ideas do not get harder."
};
const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function button(key,content,slider=false) {
 if(!entries[key]&&!charts[key])throw Error('Missing explanation: '+key);
 return `<button type="button" class="${slider||charts[key]?'help-question':'symbol'}" data-help="${key}"${slider?' data-slider="true"':''} aria-label="${escape(entries[key]?.name||(key==='chart-forward-help'?'About progress as labour rises':'About labour to hold the pace'))}" aria-expanded="false" aria-controls="symbol-popover">${content}</button>`;
}
function equation(html) {
 // Treat subscripted symbols and time-dependent functions as single buttons.
 let first=true;
 return html.replace(/<span>log<\/span><sub>2<\/sub>|\b(?:inner|max|min)\b|<var>([^<]+)<\/var>(?:<sub>([^<]+)<\/sub>|\(<var>t<\/var>\))?/g,(whole,base,sub)=>{
 if(['inner','max','min'].includes(whole)||whole.startsWith('<span>')) {const out=button(whole.startsWith('<span>')?'log2':whole,whole).replace(' data-help=',` tabindex="${first?0:-1}" data-help=`);first=false;return out;}
 const map={'φ':'phi','σ':'sigma','ρ':'rho','λ':'lambda','β':'beta'};
 const key=whole.includes('(<var>t')?base+'(t)':sub?(base==='X'&&sub==='out'?'X_out':(['max','out'].includes(sub)?base+'_'+sub:base+sub)):map[base]||base;
 const normalized=key==='Tg'||key==='Xe'||key==='Cr'?key:key.replace('φ','phi');
 const out=button(normalized,whole).replace(' data-help=',` tabindex="${first?0:-1}" data-help=`);first=false;return out;
 });
}
let state, active=null, timer, scrollTimer, popover, restoringFocus=false;
const nodeMap={inner:'research',log2:'compute-link',max:'time-link',min:'time-link',G1:'research',G2:'research',F_max:'research',G_max:'research',X_max:'index-link',S:'final-sector',C:'final-sector',Cr:'compute-link',L:'research',E:'compute-link',A:'research',g:'research',g0:'final-sector',c:'compute-link',c0:'final-sector',G:'research',F:'research',Tg:'research',a:'research',sigma:'research',rho:'research',lambda:'research',beta:'time-link',k:'compute-link',K:'compute-link',phi0:'compute-link',phi1:'compute-link',W:'compute-link',T0:'final-sector',s:'final-sector',X:'index-link',Xe:'index-link',X_out:'index-link',h:'index-link',b:'index-link','D(t)':'time-link','A(t)':'time-link',t:'time-link',L0:'research',K0:'compute-link'};
function highlight(id) {
 document.querySelectorAll('#diagram-workings a').forEach(a=>a.classList.toggle('help-match',a.getAttribute('href')==='#'+(id==='time-link'?'research':id)));
}
function close(returnFocus=false) {
 clearTimeout(timer);clearTimeout(scrollTimer);
 const previous=active;
 if(previous){previous.setAttribute('aria-expanded','false');previous.removeAttribute('aria-describedby');}
 active=null;if(popover)popover.hidden=true;highlight(null);
 if(returnFocus&&previous?.isConnected){restoringFocus=true;previous.focus({preventScroll:true});restoringFocus=false;}
}
function live(key,trigger) {
 const M=window.ResearchMachine, d=M.forward(state), r=M.inverse(state), end=M.walkTimePath(state).last;
 const values={...state,...d,K:state.K0*state.k,C:state.K0*(1-state.phi0)*d.Cr,g:d.G*d.g0,F:M.F(state.L,d.E,state.a,state.sigma),inner:M.isCD(state.sigma)?null:(Math.pow(r.Tg,(state.sigma-1)/state.sigma)-(1-state.a)*Math.pow(r.E,(state.sigma-1)/state.sigma))/state.a,Tg:r.Tg,rho:(state.sigma-1)/state.sigma,G1:end.G1,G2:end.G2};
 if(key==='S'||key==='t'||key==='D(t)'||key==='A(t)')return null;
 if(key==='X_out'&&d.X_out<=0)return 'No progress';
 if(trigger.closest('#derivation')){values.G=r.G;values.Xe=r.Xe;values.L=r.L_needed;values.F=r.Tg;values.g=r.G*d.g0;}
 if(trigger.closest('#time-link'))values.Xe=r.Xe;
 const value=values[key]??({F_max:r.status==='wall'?r.E*Math.pow(1-state.a,state.sigma/(state.sigma-1)):null,G_max:r.G_max,X_max:r.X_max})[key];
 if(key==='X_max'&&Number.isFinite(value)&&value<=0)return 'No progress at the ceiling';
 return Number.isFinite(value)?M.format(value,4):null;
}
function position() {
 if(!active||popover.hidden)return;
 const box=active.getBoundingClientRect(), gap=8, mobile=matchMedia('(max-width: 760px)').matches;
 popover.style.maxHeight='';
 if(mobile){
  const below=Math.max(0,innerHeight-box.bottom-gap),above=Math.max(0,box.top-gap);
  const useTop=below<Math.min(120,popover.offsetHeight)&&above>below;
  popover.classList.toggle('top-sheet',useTop);
  popover.style.maxHeight=Math.min(innerHeight*.45,useTop?above:below)+'px';
  popover.style.left='';popover.style.top='';return;
 }
 popover.classList.toggle('top-sheet',false);
 const width=popover.offsetWidth,height=popover.offsetHeight;
 popover.style.left=Math.max(gap,Math.min(box.left,innerWidth-width-gap))+'px';
 const below=box.bottom+gap, above=box.top-height-gap;
 popover.style.top=(below+height<=innerHeight-gap?below:Math.max(gap,above))+'px';
}
function finishScroll(event) {
 if(event&&popover.contains(event.target))return;
 if(!active||popover.hidden||!matchMedia('(max-width: 760px)').matches)return;
 const box=active.getBoundingClientRect();
 if(box.bottom<=0||box.top>=innerHeight||box.right<=0||box.left>=innerWidth)close();
}
function show(trigger) {
 clearTimeout(timer);if(!trigger.isConnected)return;
 close();active=trigger;
 const key=trigger.dataset.help, entry=entries[key], value=entry?live(key,trigger):null;
 popover.querySelector('.help-content').innerHTML=entry?`<strong>${entry.name}</strong><p>${entry.meaning}</p>${value===null?'':`<p>Now: ${value}</p>`}${trigger.dataset.slider&&entry.turn?`<p>Turn it up: ${entry.turn}</p>`:''}`:`<p>${charts[key]}</p>`;
 trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-describedby','help-content');
 popover.hidden=false;highlight(nodeMap[key]);position();
}
function init() {
 popover=document.getElementById('symbol-popover');
 document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-help]');
 if(trigger){event.preventDefault();show(trigger);}
 else if(event.target.closest('[data-help-close]'))close(true);
 else if(!event.target.closest('#symbol-popover'))close();
 });
 document.addEventListener('keydown',event=>{
 if(event.key==='Escape')close(true);
 const trigger=event.target?.closest('.symbol'), line=trigger?.closest('.formula, #derivation li');
 if(line&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) {
  const symbols=Array.from(line.querySelectorAll('.symbol')), index=symbols.indexOf(trigger);
  const next=event.key==='Home'?0:event.key==='End'?symbols.length-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+symbols.length)%symbols.length;
  event.preventDefault();symbols.forEach((symbol,i)=>symbol.tabIndex=i===next?0:-1);symbols[next].focus();
 }
 });
 document.addEventListener('focusin',event=>{if(restoringFocus)return;const trigger=event.target.closest('[data-help]');if(trigger){const line=trigger.closest('.formula, #derivation li');if(line)line.querySelectorAll('.symbol').forEach(symbol=>symbol.tabIndex=symbol===trigger?0:-1);show(trigger);}else if(!event.target.closest('#symbol-popover'))close();});
 document.addEventListener('pointerover',event=>{
 if(event.pointerType==='touch')return;
 const trigger=event.target.closest('[data-help]');
 if(trigger&&!trigger.contains(event.relatedTarget)){clearTimeout(timer);timer=setTimeout(()=>show(trigger),220);}
 const card=event.target.closest('.formula-card');if(card&&!active)highlight(card.id);
 });
 document.addEventListener('pointerout',event=>{
 const trigger=event.target.closest('[data-help]');
 if(trigger&&!trigger.contains(event.relatedTarget)){clearTimeout(timer);if(active===trigger&&document.activeElement!==trigger)timer=setTimeout(()=>{if(!popover.matches(':hover'))close();},180);}
 if(event.target.closest('.formula-card')&&!active)highlight(null);
 });
 popover.addEventListener('pointerleave',()=>{if(active&&document.activeElement!==active)close();});
 window.addEventListener('resize',position);
 window.addEventListener('scrollend',finishScroll,true);
 window.addEventListener('scroll',event=>{
  if(popover.contains(event.target))return;
  if(active&&document.activeElement===active){
   position();
   // Fallback for browsers without scrollend; restart until scrolling stops.
   clearTimeout(scrollTimer);scrollTimer=setTimeout(finishScroll,150);
  }else close();
 },true);
 document.querySelectorAll('#all-controls input[data-key]').forEach(input=>{
 const label=input.closest('label'), text=label.querySelector('.label-line > span');
 // Keep buttons outside labels so help never activates the slider.
 const span=document.createElement('span');span.className='assumption-label';
 const actual=document.createElement('label');actual.htmlFor=input.id;actual.innerHTML=text.innerHTML;
 span.append(actual);span.insertAdjacentHTML('beforeend',button(input.dataset.key,'?',true));text.replaceWith(span);
 const wrapper=document.createElement('div');wrapper.className=label.className;label.replaceWith(wrapper);while(label.firstChild)wrapper.append(label.firstChild);
 });
}
window.ResearchHelp={entries,plain, researchCES,why,charts,button,equation,init,close,setState(next){state=window.ResearchMachine.state(next);close();}};
})();

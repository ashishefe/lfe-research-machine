(function () {
  'use strict';
  const M=window.ResearchMachine, $=id=>document.getElementById(id), f=M.format;
  const incoming=new URLSearchParams(location.search);
  const keys=Object.keys(M.defaults);
  let p=M.state(), experimentBase=null;
  const bounds={X:[1,4],s:[.1,.9],L:[.5,60],A:[.3,1.5],k:[.5,8],phi0:[.05,.95],phi1:[.05,.95],a:[.1,.9],sigma:[.2,3],lambda:[.3,1.5],h:[.3,1],b:[.5,2],T0:[1,6],W:[.5,5],beta:[0,1.5],L0:[Number.MIN_VALUE,Infinity],K0:[Number.MIN_VALUE,Infinity]};
  const round10=value=>String(Number(value.toPrecision(10)));
  let badLink=false;
  if([...incoming.keys()].some(key=>keys.includes(key))) keys.forEach(key=>{
    const raw=incoming.get(key), value=raw===null||raw.trim()===''?NaN:Number(raw), [min,max]=bounds[key];
    if(Number.isFinite(value)&&value>=min-1e-12&&value<=max+1e-12&&(min!==Number.MIN_VALUE||value>0)) p[key]=value;
    else badLink=true;
  });
  function settingsURL() {
    const params=new URLSearchParams(); keys.forEach(key=>params.set(key,round10(p[key])));
    return location.pathname+'?'+params.toString()+location.hash;
  }
  window.ResearchMachineApp = Object.freeze({
    snapshot() {
      const settings={...p}, result=M.inverse(settings);
      const compute=M.compute(settings), baseline=M.compute(M.defaults);
      const unchangedTraining=Math.abs(compute.Cr-baseline.Cr)<1e-12;
      const changed=Object.keys(M.defaults).filter(key=>settings[key]!==M.defaults[key]&&(!unchangedTraining||!['k','phi1'].includes(key))).map(key=>`${key} = ${settings[key]}`);
      if(unchangedTraining&&Math.abs(compute.E-baseline.E)>1e-12)changed.push(`E = ${compute.E}`);
      const labour=result.status==='ok'?result.L_needed
        :result.status==='wall'?`never reaches ${f(settings.X)}×, approaches a ceiling of ${f(result.X_max)}×`
        :result.status==='none-needed'?'no labour needed: training compute reaches the target'
        :result.status==='compute-alone'?'no labour needed: experiment compute reaches the target'
        :'labour exceeds numeric range';
      return {settings, changed, speedup:M.forward(settings).X_out, labour};
    }
  });
  // The page groups the core presets with the four higher-target cases.
  const groups=['To double the pace (2×)','To double the pace again (4×)'];
  const labels=[
    ["Tejas's model",'His assumptions, unchanged.'],
    ['Research productivity falls 20%','The same effort finds 20% less.'],
    ['Twice the experiment compute','Training compute stays on its old path.'],
    ['Twice the compute everywhere','Experiments and training both double. Depends on our illustrative T₀ and W. METR is confident the acceleration was not due to faster training compute scaling.'],
    ['AI caused 80% of the speedup',"METR's guess. This is the labour equivalent of AI's part only, and it depends on where the other causes act."],
    ["Research labour and experiment compute are strong complements",'Researchers, human or AI, share experiment compute, so extra labour helps less (σ = 0.75). This is about research labour against experiment computing. It does not capture bottlenecks between tasks inside research, such as research judgement against coding.'],
    ['Research labour and experiment compute are very strong complements','Past a point, more researchers, human or AI, add almost nothing, and experiment compute sets a limit (σ = 0.5). This is about research labour against experiment computing. It does not capture bottlenecks between tasks inside research, such as research judgement against coding.'],
    ["Tejas's model",'His assumptions, with the target at 4×.'],
    ['Twice the experiment compute',"The labour needed halves."],
    ['Four times the experiment compute',"The labour needed falls to a quarter."],
    ['Research productivity falls 20%','The same effort finds 20% less.']
  ];
  const cases=[...M.cases,
    {change:{X:4}},
    {change:{X:4},E:2},
    {change:{X:4},E:4},
    {change:{X:4,A:.8}}
  ].map((c,i)=>({...c,name:labels[i][0],gloss:labels[i][1],group:i<7?0:1}));
  const scenario=index=>{const c=cases[index], base=M.state(c.change);return c.E?M.experimentDial(base,c.E):base;};
  const ladder=[1,2,4].map(X=>({X,months:6/X,labour:M.inverse({...M.defaults,X}).L_needed}));
  const uncertainty=[1.3,3].map(X=>Math.round(M.inverse({...M.defaults,X}).L_needed));
  $('takeaway-range').innerHTML=`METR would not be surprised by 1.3× or 3×. Through this model that is about ${uncertainty[0]}× to ${uncertainty[1]}× the research labour. This is our calculation, not METR's.`;
  const lead=`If AI has doubled Anthropic's pace, Tejas's model says that's like having about ${Math.round(ladder[1].labour)} times the research workforce.<br>On the same model, doubling the pace again would take about ${Math.round(ladder[2].labour)} times the original workforce.`;
  $('takeaway-lead').innerHTML=lead;
  $('takeaway-rows').innerHTML=ladder.map((row,i)=>`<tr${i===1?' class="current"':''}><td>${f(row.months)} months</td><td>${row.X}×</td><td>${i?'about '+Math.round(row.labour):f(row.labour)}×</td></tr>`).join('');
  const bridgeChanged=()=>p.b!==1 || p.h!==1;
  const partial=()=>p.h<1;
  const targetName=()=>p.X===2?"METR's 2×":`the ${times(p.X)} target`;
  const forwardText=d=>d.X_out<=0?noProgress():partial()?`With these inputs, the reported pace would be ${times(d.X_out)} its old pace, because we assume they explain only part of the speedup.`:bridgeChanged()?`Under this index bridge, the reported pace would be ${times(d.X_out)} its old pace.`:`With these inputs, AI progress runs at <strong>${times(d.X_out)}</strong> its old pace.`;
  const noProgress=()=> {
    const d=M.forward(p);
    const withoutTrainingCut=1+((d.G*d.g0+d.c0)/p.T0-1)/(p.b*p.h);
    const cause=d.Cr<1 && withoutTrainingCut>0?'the cut in training compute outweighs research.':'at these values of h and b, the reported index reading falls to zero or below.';
    return d.X_out<0?'The reported index would fall in this setting. '+cause[0].toUpperCase()+cause.slice(1):'No progress in this setting: '+cause;
  };
  const pathText=(walk,sentence=true)=> {
    const text=walk.wallYear!==null
    ?(walk.wallYear===0?'wall from the start':`wall at year ${f(walk.wallYear)}`)
    :walk.status==='out-of-range'?`labour exceeds numeric range at year ${f(walk.last.t)}`:`L(5) = ${timeTimes(walk.L5)}`;
    return sentence?text[0].toUpperCase()+text.slice(1):text;
  };
  const signed=(value,subtract=false)=>`${value<0?(subtract?'+':'−'):(subtract?'−':'+')} ${f(Math.abs(value))}`;
  const narrow=matchMedia('(max-width: 760px)'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const times = value => `${f(value)}×`;
  const timeTimes=value=>`${Math.abs(value)>=1e6?f(value):value.toLocaleString('en-GB',{maximumSignificantDigits:3})}×`;
  // Typeset only authored mathematical text; identifiers in attributes stay intact.
  function math(text, variables=true) {
    text=text.replace(/-(?=\d)/g,'−');
    let i=0;
    const render=token=>{
      const names={G_actual:['G','actual'],G_required:['G','required'],G_floor:['G','floor'],X_out:['X','out'],F_max:['F','max'],G_max:['G','max'],X_max:['X','max'],Tg:['T','g'],Xe:['X','e'],Cr:['C','r'],log2:['log','2']};
      const pair=names[token]||(/^[TGgcφLK][012]$/.test(token)?[token[0],token[1]]:null);
      if(pair)return `<${pair[0]==='log'?'span':'var'}>${pair[0]}</${pair[0]==='log'?'span':'var'}><sub>${pair[1]}</sub>`;
      return variables&&/^[ACDEFGKLSTWXabchkgstσρλφβ]$/.test(token)?`<var>${token}</var>`:token;
    };
    function sequence(stop=false) {
      const chunks=[];
      while(i<text.length) {
        if(text[i]===')'&&stop){i++;break;}
        if(text[i]==='^') {
          i++;
          let exponent;
          if(text[i]==='('){i++;exponent=sequence(true);}
          else {const token=text.slice(i).match(/^(?:[−-]?(?:\d+(?:\.\d+)?|[a-zA-Zρλβ]+))/);const value=token?token[0]:text[i];i+=value.length;exponent=math(value);}
          const base=chunks.pop()||'';
          chunks.push(`<span class="math-power">${base}<sup>${exponent}</sup></span>`);continue;
        }
        if(text[i]==='(') {
          i++;let group='('+sequence(true)+')';
          // Keep a function and its arguments together when raised to a power.
          if(/^(?:<var>[FA]<\/var>|max|min|<span>log<\/span><sub>2<\/sub>)$/.test(chunks.at(-1)||''))group=chunks.pop()+group;
          chunks.push(group);continue;
        }
        const token=text.slice(i).match(/^(?:[a-zA-Z_][a-zA-Z_0-9]*|[σρλφβ][012]?|\d+(?:\.\d+)?)/);
        if(token){chunks.push(render(token[0]));i+=token[0].length;}
        else chunks.push(text[i++]);
      }
      return chunks.join('');
    }
    return sequence();
  }
  const H=window.ResearchHelp;
  if(document.body)H.init();
  const equationLines=text=>text.split('; ').map(line=>`<span class="equation-line">${math(line)}</span>`).join('\n');
  const formula=(id,title,equation,substitution,definitions,plain=H.plain[id],note='')=>`<article class="formula-card" id="${id}"><h3>${title}</h3><p class="formula">${H.equation(equationLines(equation))}</p>${note}<p class="formula substitution">${equationLines(substitution)}</p><details><summary>In plain English</summary><p>${plain}</p><h4>Symbols</h4><ul class="definitions">${definitions.map(([symbol,name])=>`<li>${math(symbol)} — ${name}</li>`).join('')}</ul></details></article>`;
  function inverseText(r,short=false) {
    if(r.status==='wall' && r.X_max<=0)return short?'No finite labour; no progress at the ceiling':`No amount of research labour reaches ${targetName()} here.`;
    if(r.status==='wall') return short?`No finite labour; ceiling ${times(r.X_max)}`:`No amount of research labour reaches ${targetName()} here. It approaches a ceiling of <strong>${times(r.X_max)}</strong>.`;
    if(r.L_needed===0 && M.forward({...p,L:0}).X_out>p.X+1e-12)return 'No research labour is needed: these inputs already beat the target.';
    if(r.status==='none-needed') return short?'No labour needed':'Training compute alone reaches the target. No research labour is needed.';
    if(r.status==='compute-alone') return short?'Experiments alone suffice':'Experiment compute alone is enough for the target. No research labour is needed.';
    if(r.status==='out-of-range') return short?'Beyond numeric range':'The labour required exceeds the numeric range of this calculation.';
    if(partial())return `The labour equivalent of AI's part of ${targetName()} is ${times(r.L_needed)}. The model does not say where the other causes act.`;
    if(bridgeChanged())return `To reach the ${times(p.X)} target under this bridge, research labour must be ${times(r.L_needed)} its old level.`;
    return short?times(r.L_needed):`To reach ${targetName()} with everything else as set, research labour must be <strong>${times(r.L_needed)}</strong> its old level.`;
  }
  function drawMachine(id,symbols) {
    const d=M.forward(p), mobile=narrow.matches, w=mobile?330:900, h=mobile?(symbols?1110:1045):620;
    const positions=mobile?[[10,15],[10,150],[10,280],[170,280],[10,420],[10,550],[170,690],[10,840]]:[[15,25],[15,285],[260,190],[330,340],[350,25],[660,25],[660,240],[660,420]];
    const widths=mobile?[145,145,145,145,145,145,150,310]:Array(8).fill(220);
    const labels=['Researchers','Compute pool','Experiments','Training','Research lab','Stock of methods','Training run','AI capability'];
    const values=[`${symbols?'L = ':''}${times(p.L)}`,`${symbols?'K/K₀ = ':''}${times(p.k)}`,`${symbols?'E = ':''}${times(d.E)}`,`${symbols?'Cᵣ = ':''}${times(d.Cr)}`,`${symbols?'g/g₀ = ':''}${times(d.G)}`,`${symbols?'S · ':''}growth ${times(d.G)}`,d.X_out<0?'Index would fall':d.X_out===0?'No progress':`${symbols?'C × S · ': 'Pace '}${times(d.Xe)}`,d.X_out<0?'Index would fall':d.X_out===0?'No progress':times(d.X_out)];
    const keys=['research','compute-link','compute-link','compute-link','research','final-sector','final-sector','index-link'];
    const edges=mobile?[
      [0,4,'M82 87 L82 115 L4 115 L4 455 L10 455',p.L],
      [1,2,'M82 222 L82 280',d.E],[1,3,'M155 186 L245 186 L245 280',d.Cr],
      [2,4,'M82 352 L82 420',d.E],[4,5,'M82 492 L82 550',d.G],
      [5,6,'M82 622 L82 726 L170 726',d.G],[3,6,'M245 352 L245 690',d.Cr],
      [6,7,'M245 762 L245 800 L165 800 L165 840',d.X_out]
    ]:[
      [0,4,'M235 61 L350 61',p.L],[1,2,'M125 285 L125 226 L260 226',d.E],
      [1,3,'M235 321 L280 321 L280 376 L330 376',d.Cr],[2,4,'M370 190 L370 97',d.E],
      [4,5,'M570 61 L660 61',d.G],[5,6,'M770 97 L770 240',d.G],
      [3,6,'M550 376 L620 376 L620 276 L660 276',d.Cr],[6,7,'M770 312 L770 420',d.X_out]
    ];
    const pipeId=id+'-arrow';
    let svg=`<svg viewBox="0 0 ${w} ${h}" role="group" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">The research machine${symbols?' with symbols':''}</title><desc id="${id}-desc">Labour ${times(p.L)} and experiments ${times(d.E)} enter the research lab, producing software progress ${times(d.G)}. Compute ${times(p.k)} splits between experiments and training ${times(d.Cr)}. ${bridgeChanged()?forwardText(d)+' '+inverseText(M.inverse(p)).replace(/<[^>]+>/g,''):d.X_out<=0?noProgress():'Software and training produce index progress '+times(d.X_out)+'.'}</desc><defs><marker id="${pipeId}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>`;
    for(const [, ,path,rate] of edges) {
      const start=path.match(/M([\d.]+) ([\d.]+)/);
      svg+=`<path class="pipe" d="${path}" marker-end="url(#${pipeId})"/><circle class="dot" data-rate="${Math.max(0,rate)}" r="2.6" cx="${start[1]}" cy="${start[2]}"/>`;
    }
    positions.forEach(([x,y],i)=>{
      svg+=`${symbols?`<a href="#${keys[i]}" tabindex="0" aria-label="${labels[i]}: go to equation">`:''}<rect class="node" x="${x}" y="${y}" width="${widths[i]}" height="${i===7?195:72}"/><text x="${x+10}" y="${y+25}">${labels[i]}</text><text class="value" style="font-size:${Math.min(19,(widths[i]-20)/(values[i].length*.57))}px" x="${x+10}" y="${y+53}">${values[i]}</text>${i===7?meter(x+8,y+65,widths[i]-16,d.X_out)+`<text class="meter-label" x="${x+10}" y="${y+162}">METR would not be<tspan x="${x+10}" dy="18">surprised by 1.3× or 3×</tspan></text>`:''}${symbols?'</a>':''}`;
    });
    if(symbols && mobile) svg+=`<text class="live-footer" x="10" y="${h-38}">φ₀ = ${f(p.phi0)} · φ₁ = ${f(p.phi1)}</text>`;
    if(symbols) svg+=`<text class="live-footer" x="10" y="${h-12}">${mobile?'A = '+f(p.A)+' · c = '+f(d.c)+(d.c!==d.c0?' during the transition':''):'A = '+f(p.A)+' · c = '+f(d.c)+' doublings/year'+(d.c!==d.c0?' during the transition':'')+' · φ₀ = '+f(p.phi0)+' · φ₁ = '+f(p.phi1)}</text>`;
    const container=$(id), layout=String(mobile);
    if(container.dataset.layout===layout && document.createElement) {
      const scratch=document.createElement('div');scratch.innerHTML=svg+'</svg>';
      const old=container.querySelector('svg'), fresh=scratch.querySelector('svg');
      for(const selector of ['text.value','.live-footer','desc']) {
        const next=fresh.querySelectorAll(selector);
        old.querySelectorAll(selector).forEach((el,i)=>{el.textContent=next[i].textContent;el.setAttribute('style',next[i].getAttribute('style')||'');});
      }
      old.querySelector('svg').replaceWith(fresh.querySelector('svg'));
      old.querySelectorAll('.dot').forEach((dot,i)=>dot.dataset.rate=String(Math.max(0,edges[i][3])));
    } else {container.innerHTML=svg+'</svg>';container.dataset.layout=layout;}
  }
  let lastFrame;
  function animatePipes(now) {
    const dt=lastFrame===undefined?0:Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
    if(!document.hidden&&!reduced.matches) document.querySelectorAll('.diagram .dot').forEach(dot=>{
      if(dot.closest('[hidden]'))return;
      const path=dot.previousElementSibling, length=path.getTotalLength();
      dot.distance=((dot.distance||0)+dt*30*Number(dot.dataset.rate))%length;
      const point=path.getPointAtLength(dot.distance);
      dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);
    });
    window.requestAnimationFrame(animatePipes);
  }
  if(window.requestAnimationFrame)window.requestAnimationFrame(animatePipes);
  function meter(x,y,width,X) {
    if(X<=0)return `<svg x="${x}" y="${y}" width="${width}" height="80" viewBox="0 0 ${width} 80" role="img" aria-label="${noProgress()}"><text class="meter-label" x="8" y="20">${X<0?'Index would fall':'No progress in this setting'}</text></svg>`;
    const scale=v=>10+Math.max(0,Math.min(4,v))/4*(width-20);
    return `<svg x="${x}" y="${y}" width="${width}" height="80" viewBox="0 0 ${width} 80" role="img" aria-label="${X<=0?noProgress():'Index pace '+times(X)}; METR mark 2×. METR would not be surprised by 1.3× or 3×"><rect class="meter-band" x="${scale(1.3)}" y="28" width="${scale(3)-scale(1.3)}" height="18" fill="var(--band)"/><path d="M10 37 H${width-10}" stroke="var(--hairline)"/><path d="M${scale(2)} 22 V51" stroke="var(--muted)"/><circle cx="${scale(X)}" cy="37" r="5" fill="var(--accent)"/><text class="meter-label" x="${scale(2)}" y="16" text-anchor="middle">METR 2×</text><text class="meter-label" x="${scale(1.3)}" y="70" text-anchor="middle">1.3×</text><text class="meter-label" x="${scale(3)}" y="70" text-anchor="middle">3×</text>${X>4?`<text class="meter-label" x="${width-10}" y="16" text-anchor="end">&gt;4×</text>`:X<=0?'<text class="meter-label" x="10" y="16">No progress</text>':''}</svg>`;
  }
  function equations(walk) {
    const end=walk.last;
    const d=M.forward(p), r=M.inverse(p), cd=M.isCD(p.sigma), rho=(p.sigma-1)/p.sigma;
    const form=cd?'F(L, E) = L^a × E^(1 − a)':'F(L, E) = [a × L^ρ + (1 − a) × E^ρ]^(1/ρ); ρ = (σ − 1)/σ';
    $('equations').innerHTML=
      formula('final-sector','Final sector · Training run','Effective compute = C × S; g0 = s × T0; c0 = (1 − s) × T0',`g0 ≈ ${f(p.s)} × ${f(p.T0)} ≈ ${f(d.g0)}; c0 = (1 − ${f(p.s)}) × ${f(p.T0)} ≈ ${f(d.c0)} doublings/year.`, [["C", "Computing power used to train models"], ["S", "The stock of research methods"], ["g0", "Baseline software growth in doublings/year"], ["c0", "Baseline training growth in doublings/year"], ["s", "Software share of baseline progress"], ["T0", "Baseline effective-compute growth in doublings/year"]])+
      formula('research','Research sector · Research lab',`g = g0 × A × F(L, E)^λ; G = g/g0 = A × F(L, E)^λ; ${form}`,`F = ${cd?`${f(p.L)}^${f(p.a)} × ${f(d.E)}^(1 − ${f(p.a)})`:`[${f(p.a)} × ${f(p.L)}^${f(rho,4)} + (1 − ${f(p.a)}) × ${f(d.E)}^${f(rho,4)}]^(1/${f(rho,4)})`} ≈ ${f(M.F(p.L,d.E,p.a,p.sigma))}; G ≈ ${f(p.A)} × ${f(M.F(p.L,d.E,p.a,p.sigma))}^${f(p.lambda)} ≈ ${f(d.G)}; ${cd?'Cobb-Douglas':`CES: ρ ≈ ${f(rho,4)}`}; a ≈ ${f(p.a)}; F(1,1) = 1.`, [["g", "Software growth in doublings a year"], ["g0", "Software growth before the speedup"], ["G", "New software pace divided by old"], ["A", "Research productivity compared with baseline"], ["L", "Human and AI research labour"], ["E", "Experiment compute compared with baseline. Compute per unit of time"], ["λ", "Returns to scale in research"], ["F", "Combines labour and experiment compute"], ["a", "Labour weight against experiment compute"]].concat(cd?[]:[['σ','How easily labour stands in for experiments'],['ρ','Substitution parameter rewritten for the formula']] ),cd?H.plain.research:H.researchCES,cd?`<p class="formula tejas-equation">${H.equation(`With ${math('a = 0.5')} and ${math('λ = 1')}, this is Tejas's equation: ${math('G = A × √L × √E')}.`)}</p>`:'')+
      formula('compute-link','Compute link · Compute pool','E = k × φ1/φ0; Cr = k × (1 − φ1)/(1 − φ0); c = c0 + log2(Cr)/W',`E ≈ ${f(p.k)} × ${f(p.phi1)}/${f(p.phi0)} ≈ ${f(d.E)}; Cr ≈ ${f(p.k)} × (1 − ${f(p.phi1)})/(1 − ${f(p.phi0)}) ≈ ${f(d.Cr)}; c ≈ ${f(d.c0)} + log2(${f(d.Cr)})/${f(p.W)} ≈ ${f(d.c)}${d.c!==d.c0?" during the transition":""}.`, [["k", "Total compute pool divided by baseline"], ["φ0", "Experiment share before the change"], ["φ1", "Experiment share after the change"], ["E", "Experiment compute compared with baseline. Compute per unit of time"], ["Cr", "Training-compute effect relative to baseline at the end of W years"], ["c", "Training growth in doublings a year"], ["c0", "Training growth before the speedup"], ["log2", "How many doublings a ratio equals"], ["W", "Years for the training compute change"]])+
      formula('index-link','Reading the index · AI capability','Xe = (G × g0 + c)/T0; X_out = 1 + (Xe − 1)/(b × h)',d.X_out<=0?noProgress():`Xe = (${f(d.G)} × ${f(d.g0)} ${signed(d.c)})/${f(p.T0)} ≈ ${f(d.Xe)}; X_out = 1 + (${f(d.Xe)} − 1)/(${f(p.b)} × ${f(p.h)}) ≈ ${f(d.X_out)}.`, [["G", "New software pace divided by old"], ["g0", "Software growth before the speedup"], ["c", "Training growth in doublings a year"], ["T0", "Baseline effective-compute growth in doublings/year"], ["Xe", "Effective-compute speedup after h and b"], ["X_out", "The reported index speedup implied by the inputs, given b and h"], ["b", "Bridge from index to effective-compute speedup"], ["h", "Share of the speedup AI caused"]],H.plain['index-link']+` Research productivity A enters through G in the research sector. For example, if other causes raised A to 1.3 and AI supplied the rest of a 2× pace, labour would need about ${f(M.inverse({...M.defaults,A:1.3}).L_needed,1)}×, against ${f(M.inverse({...M.defaults,h:.8}).L_needed)}× with h = 0.8 and A = 1.`)+
      formula('time-link','Holding the pace','G1 = (Xe × T0 − c)/g0; G2 = (Xe × T0 − c0)/g0; G_required(t) = G1 for t ≤ W, G2 after; G_floor(t) = A(t) × F(0, E)^λ; G_actual(t) = max(G_required(t), G_floor(t)); dD/dt = (G_actual(t) − 1) × g0; D(0) = 0; A(t) = A × 2^(−β × D(t))',walk.L5!==null?`At year 5: G1 ≈ ${f(end.G1)}; G2 ≈ ${f(end.G2)}; D(5) ≈ ${f(end.D)}; A(5) ≈ ${f(end.A,4)}; ${pathText(walk)}.`:`${pathText(walk)}.`, [["A(t)", "Research productivity at year t"], ["A", "Research productivity at the starting point"], ["β", "Rate at which ideas get harder"], ["D(t)", "How many more doublings S has had by year t than on the baseline path. It is negative if S has fallen behind."], ["G1", "Required software speedup through W years"], ["G2", "Required software speedup after W years"], ["Xe", "Effective-compute speedup required for the target"], ["T0", "Baseline effective-compute growth in doublings/year"], ["g0", "Software growth before the speedup"], ["c", "Training growth through W years"], ["c0", "Baseline training growth after W years"], ["W", "Years for the training compute change"], ["t", "Time since the change in years"], ["max", "The larger of two values"], ["G_required", "Software growth required for the target"], ["G_actual", "Software growth the lab actually produces"], ["G_floor", "Software growth at zero labour"], ["F", "Combines labour and experiment compute"], ["E", "Experiment compute compared with baseline. Compute per unit of time"], ["λ", "Returns to scale in research"]]);
    $('derivation').innerHTML=`<li>Target X ≈ ${f(p.X)} → Xe = 1 + ${f(p.b)} × ${f(p.h)} × (${f(p.X)} − 1) ≈ ${f(r.Xe)}.</li><li>G = (Xe × T0 − c)/g0 = (${f(r.Xe)} × ${f(p.T0)} ${signed(r.c,true)})/${f(r.g0)} ≈ ${f(r.G)}.</li>`;
    if(r.G>0) {
      $('derivation').innerHTML+=`<li>Tg = (G/A)^(1/λ) = (${f(r.G)}/${f(p.A)})^(1/${f(p.lambda)}) ≈ ${f(r.Tg)}. Tg is the required value of F.</li><li>${cd?`L = (Tg/E^(1 − a))^(1/a) = (${f(r.Tg)}/${f(r.E)}^(1 − ${f(p.a)}))^(1/${f(p.a)})`:`ρ ≈ ${f(rho,4)}; inner = (${f(r.Tg)}^${f(rho,4)} − (1 − ${f(p.a)}) × ${f(r.E)}^${f(rho,4)})/${f(p.a)}. ${r.status==='wall'?'inner ≤ 0: no finite L':r.status==='compute-alone'?'inner ≤ 0: experiment compute alone suffices':'L = inner^(1/ρ)'}`}.</li>`;
      if(r.status==='wall') $('derivation').innerHTML+=`<li>F_max = E × (1 − a)^(1/ρ) ≈ ${f(r.E*Math.pow(1-p.a,1/rho))}; G_max = A × F_max^λ ≈ ${f(r.G_max)}. ${r.X_max<=0?'X_max ≤ 0. '+noProgress():'The forward map gives X_max ≈ '+times(r.X_max)+'.'}</li>`;
    }
    const result=r.L_needed===0?'L = 0. No labour needed.':r.status==='wall'?`No finite L reaches the target. ${r.X_max<=0?noProgress():'X_max ≈ '+times(r.X_max)+'.'}`:r.status==='out-of-range'?'L exceeds the numeric range of this calculation.':`L ≈ ${times(r.L_needed)}.`;
    $('derivation').innerHTML+='<li>'+result+'</li>';
    $('derivation').innerHTML=$('derivation').innerHTML.replace(/>([^<]+)</g,(_,text)=>'>'+H.equation(math(text))+'<');
    const steps=Array.from($('derivation').innerHTML.matchAll(/<li>([\s\S]*?)<\/li>/g),match=>match[1]);
    if(steps.length>4)steps.splice(3,steps.length-3,steps.slice(3).join(' '));
    $('derivation').innerHTML=steps.map((content,i)=>{let first=true;content=content.replace(/tabindex="[01-]+"/g,()=>`tabindex="${first?(first=false,0):-1}"`);return `<li>${content}<details><summary>Why this step</summary><p>${i===steps.length-1?(r.status==='wall'?'No amount of labour reaches this. The step reports the ceiling.':r.status==='none-needed'?'Training compute alone reaches the target, so no labour is needed.':r.status==='compute-alone'?'Experiment compute alone reaches the target, so no labour is needed.':H.why[3]):H.why[i]}</p></details></li>`;}).join('');
  }
  function chart(id,data,reference,options) {
    const w=570,h=350,left=narrow.matches?120:82,right=20,top=24,bottom=55,iw=w-left-right,ih=h-top-bottom;
    const ys=[...data,...reference].filter(q=>q.y!==null).map(q=>q.y);
    const logY=options.logY;
    const finite=ys.filter(Number.isFinite), positive=finite.filter(v=>v>0);
    const rawMin=Math.min(0,...finite), rawMax=Math.max(options.band?3:1,...finite);
    const magnitude=Math.pow(10,Math.floor(Math.log10(Math.max(1,rawMax-rawMin)/5)));
    const step=Math.max(1,[1,2,5,10].find(n=>n*magnitude>=(rawMax-rawMin)/5)*magnitude);
    const min=logY?Math.min(0,...positive.map(v=>Math.floor(Math.log10(v)))):Math.floor(rawMin/step)*step;
    const max=logY?Math.max(min+1,...positive.map(v=>Math.ceil(Math.log10(v)))):Math.min(Number.MAX_VALUE,Math.ceil(rawMax/step)*step);
    const x=v=>left+(options.log?Math.log(v/.5)/Math.log(120):v/5)*iw;
    const y=v=>top+ih*(1-(logY?Math.log10(v)-min:v-min)/(max-min));
    const clip=id+'-clip';
    let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${options.title}</title><desc id="${id}-desc">${options.summary}</desc><defs><clipPath id="${clip}"><rect x="${left}" y="${top}" width="${iw}" height="${ih}"/></clipPath></defs>`;
    if(options.band) svg+=`<rect class="band" x="${left}" y="${y(3)}" width="${iw}" height="${y(1.3)-y(3)}"/><path class="target-line" d="M${left} ${y(2)} H${w-right}"/>`;
    const xt=options.log?[.5,1,2,5,10,20,40,60]:[0,1,2,3,4,5];
    xt.forEach(v=>{svg+=`<text x="${x(v)}" y="${h-bottom+24}" text-anchor="middle">${v}</text>`;});
    const tickCount=logY?max-min:Math.round((max-min)/step);
    const stride=Math.max(1,Math.ceil(tickCount/6));
    for(let i=0;i<=tickCount;i+=stride) {
      const value=logY?Math.pow(10,min+i):min+step*i;
      const label=logY?(min+i>=-3&&min+i<=6?value.toLocaleString('en-GB'):`10<tspan baseline-shift="super" font-size="10">${min+i}</tspan>`):f(value,0);
      const tickY=logY?top+ih*(1-i/(max-min)):y(value);
      svg+=`<path class="axis" d="M${left} ${tickY} H${w-right}"/><text x="${left-10}" y="${tickY+5}" text-anchor="end">${label}×</text>`;
    }
    const path=points=>{let pen=false;return points.map(q=>{if(!Number.isFinite(q.y)||(logY&&q.y<=0)){pen=false;return '';}const command=pen?'L':'M';pen=true;return `${command}${x(q.x)},${y(q.y)}`;}).join(' ');};
    svg+=`<g clip-path="url(#${clip})"><path class="reference" d="${path(reference)}"/><path class="curve" d="${path(data)}"/>`;
    if(options.point) svg+=`<circle class="point" cx="${x(options.point.x)}" cy="${y(options.point.y)}" r="4"/>`;
    svg+='</g>';
    if(options.wall) {const q=data.filter(q=>Number.isFinite(q.y)&&(!logY||q.y>0)).at(-1);if(q)svg+=`<circle class="point" cx="${x(q.x)}" cy="${y(q.y)}" r="4"/><text x="${Math.min(w-75,x(q.x)+8)}" y="${Math.max(18,y(q.y)-12)}">Wall</text>`;else svg+=`<text x="${left+12}" y="${top+24}">Wall at year 0</text>`;}
    if(logY&&data.some(q=>q.y===0))svg+=`<text x="${left+12}" y="${top+24}">No labour needed (0×)</text>`;
    svg+=`<text x="${left+iw/2}" y="${h-5}" text-anchor="middle">${options.log?'Research labour L (log scale)':'Years'}</text></svg><p class="quiet chart-summary">${options.summary}</p>`;
    $(id).innerHTML=svg;
  }
  function charts(walk,pathFor) {
    const data=[],reference=[];
    for(let i=0;i<=100;i++) {const L=.5*Math.pow(120,i/100); data.push({x:L,y:Math.max(0,M.forward({...p,L}).X_out)});if(!M.isCD(p.sigma))reference.push({x:L,y:Math.max(0,M.forward({...p,L,sigma:1}).X_out)});}
    chart('chart-forward',data,reference,{title:'Index progress against research labour',log:true,band:true,point:{x:p.L,y:Math.max(0,M.forward(p).X_out)},summary:`${bridgeChanged()?forwardText(M.forward(p)):M.forward(p).X_out<=0?noProgress():'At '+times(p.L)+' labour, index progress is '+times(M.forward(p).X_out)+'.'} ${reference.length?'Muted dashes show Cobb-Douglas at the same settings.':'The curve uses Cobb-Douglas.'} Settings with a decline or no progress sit at zero on this chart.`});
    const path=walk.points,last=walk.last, ref=pathFor({...p,beta:0}).points;
    $('time-sensitivity').textContent=`These figures depend on our illustrative T₀. At current settings, with T₀ = 1: ${pathText(pathFor({...p,T0:1}),false)}. With T₀ = 6: ${pathText(pathFor({...p,T0:6}),false)}.`;
    const points=path.map(q=>({x:q.t,y:q.L_needed}));
    chart('chart-time',points,ref.map(q=>({x:q.t,y:q.L_needed})),{title:'Labour needed to hold the target pace',logY:true,wall:last.status==='wall',summary:`Target ${times(p.X)}. At year 0: ${path[0].status==='ok'?timeTimes(path[0].L_needed):inverseText(path[0],true).replace(/\.$/,'')}. ${pathText(walk)}. Labour uses a logarithmic axis. Muted dashes hold β = 0.${p.h<1?" This path counts AI's part only.":""}${path.some(q=>q.G_actual>q.G_required+1e-12)?" With no labour, the lab keeps the faster growth.":""}`});
  }
  function update() {
    const d=M.forward(p), r=M.inverse(p);
    $('beta-warning').hidden=p.beta<=1;
    $('sigma-warning').hidden=p.sigma<=1;
    history.replaceState(null,'',settingsURL());
    const paths=new Map(), pathFor=state=>{const key=JSON.stringify(state);if(!paths.has(key))paths.set(key,M.walkTimePath(state));return paths.get(key);};
    const walk=pathFor(p);
    H.setState(p,walk);
    const opened=Array.from(document.querySelectorAll('#equations details, #derivation details')).map(el=>el.open);
    document.querySelectorAll('[data-key]').forEach(input=>{
      const key=input.dataset.key;
      if(key==='E') {
        const min=Math.max(.00001,(.5-d.Cr*(1-p.phi0))/p.phi0,d.Cr*(1-p.phi0)*.05/(.95*p.phi0));
        const max=Math.min((8-d.Cr*(1-p.phi0))/p.phi0,d.Cr*(1-p.phi0)*.95/(.05*p.phi0));
        input.min=Math.min(min,d.E);input.max=Math.max(max,d.E);if(!(input.type==='number' && document.activeElement===input)) input.value=input.type==='number'?round10(d.E):d.E;
      } else if(!(input.type==='number' && document.activeElement===input)) input.value=input.type==='number'?round10(p[key]):p[key];
      input.setAttribute('aria-valuetext',key==='s'&&p.s===2/3?'two thirds':f(key==='E'?d.E:p[key],4));
    });
    document.querySelectorAll('[data-output]').forEach(out=>{const key=out.dataset.output;out.textContent=key==='s'&&p.s===2/3?'2/3':f(key==='E'?d.E:p[key],4);});
    document.querySelectorAll('[name="form"]').forEach(input=>input.checked=input.value===(M.isCD(p.sigma)?'cd':'ces'));
    ($('work-sigma').closest('label')||$('work-sigma').closest('.dial')).hidden=M.isCD(p.sigma);
    const counted=experimentBase?{...p,k:experimentBase.k,phi1:experimentBase.phi1}:p;
    const count=Object.keys(M.defaults).filter(key=>Math.abs(counted[key]-M.defaults[key])>1e-10).length
      + Number(experimentBase!==null && Math.abs(d.E-M.compute(counted).E)>1e-10);
    $('changed').hidden=!count;
    $('changed').innerHTML=`${count} ${count===1?'setting differs':'settings differ'} from the defaults. <a href="#workings">See the workings</a> or <button type="button" data-reset>reset</button>.`;
    $('forward-readout').innerHTML=forwardText(d);
    $('inverse-readout').innerHTML=inverseText(r);
    $('compact-readout').textContent=bridgeChanged()?`${forwardText(d)} ${inverseText(r).replace(/<[^>]+>/g,'')}`:`${d.X_out<=0?noProgress():'Progress '+times(d.X_out)} · ${r.status==='ok'?'Labour ':''}${inverseText(r,true)}`;
    $('target-note').innerHTML=`Target: ${targetName()}. Change it in <a href="#workings">the workings</a>.`;
    $('levels').textContent=`Labour: ${f(p.L0)} → ${f(p.L0*p.L)}. Compute: ${f(p.K0)} → ${f(p.K0*p.k)}.`;
    drawMachine('diagram-machine',false);drawMachine('diagram-workings',true);equations(walk);charts(walk,pathFor);
    const disclosures=Array.from(document.querySelectorAll('#equations details, #derivation details'));
    disclosures.forEach((el,i)=>el.open=!!opened[i===disclosures.length-1?opened.length-1:i]);
  }
  const isWorkingsHash=target=>['workings','research','compute-link','final-sector','index-link','time-link','work-lambda'].includes(target);
  function setTab(name,focus=false,preserveHash=false) {
    if(name!=='workings') name='machine';
    document.documentElement.setAttribute('data-view',name);
    for(const view of ['machine','workings']) {
      $(view).hidden=view!==name;const tab=$('tab-'+view);
      tab.setAttribute('aria-selected',String(view===name));tab.tabIndex=view===name?0:-1;
      if(focus&&view===name)tab.focus();
    }
    if(!preserveHash)history.replaceState(null,'',name==='workings'?'#workings':location.pathname+location.search);
    document.querySelectorAll('.diagram svg').forEach(svg=>{if(document.hidden||reduced.matches||svg.closest('[hidden]'))svg.pauseAnimations();else svg.unpauseAnimations();});
  }
  document.querySelector('[data-tabs]').setAttribute('role','tablist');
  for(const name of ['machine','workings']) {
    $('tab-'+name).setAttribute('role','tab');$(name).setAttribute('role','tabpanel');$(name).tabIndex=0;
    $('tab-'+name).addEventListener('click',()=>setTab(name));
    $('tab-'+name).addEventListener('keydown',event=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {event.preventDefault();setTab(event.key==='Home'?'machine':event.key==='End'?'workings':name==='machine'?'workings':'machine',true);}
    });
  }
  document.querySelectorAll('[data-key]').forEach(input=>{
  const message=()=>document.getElementById(input.id+'-error');
  const validate=()=>{
    const value=input.valueAsNumber;
    if(!Number.isFinite(value) || (input.min!=='' && value<Number(input.min)) || (input.max!=='' && input.max!==undefined && value>Number(input.max)) || ((input.dataset.key==='L0'||input.dataset.key==='K0')&&value<=0)) {return false;}
    input.setCustomValidity(''); if(message()) message().textContent='';
    if(input.dataset.key==='E') {
      if(!experimentBase)experimentBase={k:p.k,phi1:p.phi1,E:M.compute(p).E};
      p=M.experimentDial(p,value);
    } else {
      if(experimentBase && ['k','phi1'].includes(input.dataset.key) && Math.abs(value-p[input.dataset.key])>1e-10)
        experimentBase={...experimentBase,[input.dataset.key]:value};
      p={...p,[input.dataset.key]:value};
    }
    update(); return true;
  };
  input.addEventListener('input',validate);
  const finish=()=>{if(message()?.textContent && input.value===round10(input.dataset.key==='E'?M.compute(p).E:p[input.dataset.key])) return; if(!validate()){input.value=round10(input.dataset.key==='E'?M.compute(p).E:p[input.dataset.key]); input.setCustomValidity(''); if(message()) message().textContent=`Enter a number between ${round10(Number(input.min))} and ${round10(Number(input.max))}.`;}};
  if(input.type==='number'){input.addEventListener('change',finish);input.addEventListener('blur',finish);}
  });
  document.querySelectorAll('[name="form"]').forEach(input=>input.addEventListener('change',()=>{p.sigma=input.value==='cd'?1:.75;update();}));
  $('copy-settings').addEventListener('click',async()=>{
    const url=new URL(settingsURL(),location.href).href;
    const seen=new Set();
    const summary=Array.from(document.querySelectorAll('[data-copy-label]')).filter(el=>{if(seen.has(el.dataset.key))return false;seen.add(el.dataset.key);return true;}).map(el=>`${el.dataset.copyLabel}: ${round10(el.dataset.key==='E'?M.compute(p).E:p[el.dataset.key])}${el.dataset.copyUnit?' '+el.dataset.copyUnit:''}`).join('\n')+'\n'+url;
    try { await navigator.clipboard.writeText(summary); $('copy-status').textContent='Settings copied.'; }
    catch (_) { $('copy-status').textContent='Could not copy settings. Copy the address from your browser.'; }
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-reset]')) {p=M.state();experimentBase=null;update();}
    const link=event.target.closest('a[href="#workings"]');if(link){event.preventDefault();setTab('workings',true);}
  });
  window.addEventListener('hashchange',()=>{const target=location.hash.slice(1);setTab(isWorkingsHash(target)?'workings':'machine',false,true);if(target&&!['workings','machine'].includes(target))$(target)?.scrollIntoView?.();});
  $('scenarios').innerHTML=groups.map((group,g)=>`<section aria-labelledby="scenario-group-${g}"><h3 id="scenario-group-${g}">${group}</h3><ul>${cases.map((c,i)=>{
    if(c.group!==g)return '';
    const state=scenario(i),result=M.inverse(state);
    const text=result.status==='wall'?`Never reaches ${times(state.X)}: approaches a ceiling of ${times(result.X_max)}`:inverseText(result,true);
    return `<li><button class="scenario-row" type="button" data-case="${i}" aria-label="${group}: ${c.name}" aria-describedby="scenario-gloss-${i} scenario-result-${i}"><span class="scenario-copy"><span class="scenario-name">${c.name}</span><span class="scenario-gloss quiet" id="scenario-gloss-${i}">${c.gloss}</span></span><span class="result" id="scenario-result-${i}">${text}</span></button></li>`;
  }).join('')}</ul></section>`).join('');
  $('scenarios').addEventListener('click',event=>{const button=event.target.closest('[data-case]');if(button){const index=Number(button.dataset.case);p=scenario(index);const solved=M.inverse(p);p.L=solved.status==='wall'?6.25:solved.L_needed===0?Number($('work-L').min):solved.L_needed??6.25;experimentBase=cases[index].E?{k:M.defaults.k,phi1:M.defaults.phi1,E:1}:null;update();}});
  narrow.addEventListener('change',update);reduced.addEventListener('change',update);
  document.addEventListener('visibilitychange',()=>document.querySelectorAll('.diagram svg').forEach(svg=>{if(document.hidden||reduced.matches||svg.closest('[hidden]'))svg.pauseAnimations();else svg.unpauseAnimations();}));
  document.documentElement.setAttribute('data-interactive','true');
  $('compact-readout').hidden=false;
  const target=location.hash.slice(1);
  setTab(isWorkingsHash(target)?'workings':'machine',false,true);update();
  $('script-note').hidden=true;
  if(badLink) $('link-warning').hidden=false;
  if(target && !['machine','workings'].includes(target))$(target)?.scrollIntoView?.();
})();

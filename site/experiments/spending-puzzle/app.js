(function(){
'use strict';
const m=window.ResearchMachine.spendingPuzzle(), $=id=>document.getElementById(id), params=new URLSearchParams(location.search);
document.documentElement.classList.add('js');
// Garicano and Imas report a 38% fall in progress per technical employee.
const values={trendGrowth:Math.round(m.trendGrowth),h1:(m.data.h1/1000).toFixed(2),actual:(m.data.actual/1000).toFixed(2),slopeOld:m.data.slopeOld,slopeNew:m.data.slopeNew,spending:m.spending.toFixed(1),pace:m.pace.toFixed(1),fall:Math.round(m.falls[0]*100),projected:(m.projected[0]/1000).toFixed(1),ratio:m.ratios[0].toFixed(2),perOld:(m.data.slopeOld/(m.data.h1/1000)/2).toFixed(2),perNew:(m.data.slopeNew/(m.data.actual/1000)/2).toFixed(2),budget:(m.worlds[0].input*m.worlds[0].price).toFixed(0),meals:(m.worlds[0].input*m.worlds[0].productivity).toFixed(0),skill:Math.round((m.worlds[0].productivity-1)*100),price:Math.round((1-m.worlds[1].price)*100),fallNoSpeedup:Math.round(m.falls[1]*100),quarterWords:Math.round((m.q-1)*2)===1?'half again':(m.q-1).toFixed(1)+' times more',earlierRate:Math.SQRT2.toFixed(1),slowRate:m.annual.toFixed(1),fastRate:m.fast.toFixed(1),trillionWords:Math.round(m.labour[2]/1e12)===2?'two trillion':(m.labour[2]/1e12).toFixed(1)+' trillion',trendLow:m.ratios[0].toFixed(2),trendHigh:m.ratios[1].toFixed(2),studyDollar:Math.round(m.studyFalls[0]*100),studyStaff:38,workforce:Math.round(window.ResearchMachine.inverse(window.ResearchMachine.defaults).L_needed)};
[m.data.year2023/4,m.data.year2024/4,m.data.h1/2,m.quarters[0],m.quarters[1],m.data.actual/2].forEach((v,i)=>values['quarter'+i]=(v/1000).toFixed(2));
m.ratios.forEach((v,i)=>values['ratio'+i]=v.toFixed(2));
values.growth1=(m.data.year2024/m.data.year2023).toFixed(1); values.growth2=((m.data.h1/2)/(m.data.year2024/4))**(1/.75); values.growth2=values.growth2.toFixed(1);
values.prediction1=(m.projected[0]/2000).toFixed(1); values.prediction2=(m.projected[1]/2000).toFixed(2);
const openingScale=445/5.3;
$('opening-spending-label').textContent=`Research spending: ${values.spending}×`; $('opening-pace-label').textContent=`Progress made: ${values.pace}×`; if($('ot-spending')){$('ot-spending').textContent=values.spending;$('ot-progress').textContent=values.pace;$('ot-fall').textContent=Math.round(m.falls[0]*100);} $('opening-fall-label').textContent=`Progress per dollar: ${(1-m.falls[0]).toFixed(2)}×`; $('opening-spending').setAttribute('x2',45+openingScale*m.spending); $('opening-pace').setAttribute('x2',45+openingScale*m.pace); $('opening-dollar').setAttribute('x2',45+openingScale*(1-m.falls[0])); $('opening-spending').closest('svg').setAttribute('aria-label',`Compared with the first half of 2025, spending was ${values.spending} times, pace was ${values.pace} times, and progress per dollar was ${(1-m.falls[0]).toFixed(2)} times.`);
document.querySelectorAll('[data-value]').forEach(el=>{el.textContent=values[el.dataset.value]});
const selected=[0,0,10,0];
for (const [i,max] of [[0,2],[3,3]]) { const raw=params.get('p'+(i+1)), n=Number(raw); if(raw!==null && Number.isInteger(n) && n>=1 && n<=max) selected[i]=n-1; }
{ const raw=params.get('p3'), n=Number(raw); if(raw!==null && raw.trim()!=='' && Number.isInteger(n) && n>=0 && n<=20) selected[2]=n; }
function render(){
 for(const i of [0,3]) document.querySelector(`input[name="panel${i+1}"][value="${selected[i]}"]`).checked=true;
 const sp=m.spending.toFixed(1), pace=m.pace.toFixed(1);
 $('result1').textContent=selected[0]===0?`Spending rose ${sp} times and progress rose ${pace} times. Each dollar bought ${Math.round(m.falls[0]*100)}% less progress.`:`Spending rose ${sp} times and progress did not speed up. Each dollar would have bought ${Math.round(m.falls[1]*100)}% less progress.`;
 $('kitchen-slider').value=String(selected[2]);
 const kitchen=window.ResearchMachine.kitchen(1-selected[2]/20);
 $('kitchen-slider').setAttribute('aria-valuetext', selected[2]===0?'All better cooks':selected[2]===20?'All cheaper vegetables':`${selected[2]*5}% along the slider, from better cooks towards cheaper vegetables`);
 $('kitchen-summary').textContent=`Budget ${kitchen.budget.toFixed(2)} times, prices ${kitchen.price.toFixed(2)} times, ingredients bought ${kitchen.ingredients.toFixed(2)} times, cooks' skill ${kitchen.skill.toFixed(2)} times, meals ${kitchen.meals.toFixed(2)} times.`;
 for(const [key,value] of Object.entries(kitchen)) { $('kitchen-'+key+'-value').textContent=value.toFixed(2)+'×'; $('kitchen-'+key+'-bar').style.width=(value/3*100)+'%'; }
 const l=m.labour[selected[3]], formatted=selected[3]===0?Math.round(l/10)*10:selected[3]===1?(l/1e6).toFixed(1)+' million':(l/1e12).toFixed(1)+' trillion';$('result4').textContent=`After five years: about ${typeof formatted==='number'?formatted.toLocaleString('en-GB'):formatted} times${selected[3]===0?' the workforce':''}.`;
}
function saveState(){params.delete('p2');params.set('p1',selected[0]+1);params.set('p3',selected[2]);params.set('p4',selected[3]+1);history.replaceState(null,'',location.pathname+'?'+params.toString()+location.hash);render()}
document.querySelectorAll('.controls input[name]').forEach(el=>el.addEventListener('change',()=>{selected[Number(el.name.slice(-1))-1]=Number(el.value);saveState()}));
$('kitchen-slider').addEventListener('input',e=>{selected[2]=Number(e.target.value);saveState()});
const guess=$('guess'), saved=$('saved-guess');try{localStorage.setItem('spending-puzzle-probe','1');localStorage.removeItem('spending-puzzle-probe');$('privacy').textContent='Only you can see it.';guess.value=localStorage.getItem('spending-puzzle-guess')||''}catch(_){}function sync(){saved.textContent=guess.value;$('guess-return').hidden=!guess.value.trim();try{localStorage.setItem('spending-puzzle-guess',guess.value)}catch(_){}}guess.addEventListener('input',sync);sync();render();
})();

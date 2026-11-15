(function(){
'use strict';
function update(){
 const m=window.ResearchMachine.spendingPuzzle(), put=(id,value)=>document.getElementById(id).textContent=value;
 put('example-base',m.labourBase.toFixed(2)); put('example-base2',m.labourBase.toFixed(2));
 put('example-total',(Math.round(m.labour[0]/10)*10).toLocaleString('en-GB'));
 put('example-rate',Math.SQRT2.toFixed(3)); put('example-power',Math.round(m.labourPowers[0]).toLocaleString('en-GB'));
 put('example-spending',m.annual.toFixed(1)); put('example-slow-total',(m.labour[1]/1e6).toFixed(0)+' million'); put('example-slow',m.annual.toFixed(3)); put('example-slow-power',(m.labourPowers[1]/1e6).toFixed(1)+' million');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
})();

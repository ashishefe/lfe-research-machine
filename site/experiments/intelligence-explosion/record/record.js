(function(){
'use strict';
const deck=document.getElementById('deck'), cards=[...deck.querySelectorAll('.deck-card')], grid=document.getElementById('grid'), position=document.getElementById('position'), open=document.getElementById('open-grid'), close=document.getElementById('close-grid');
if(!cards.length)return;
document.documentElement.classList.add('deck-ready');
function fit(){const top=deck.getBoundingClientRect().top+scrollY;document.documentElement.style.setProperty('--deck-h',Math.max(352,innerHeight-top-8)+'px')}fit();addEventListener('resize',fit);
const reduced=matchMedia('(prefers-reduced-motion: reduce)'); let current=0, timer;
function move(i, smooth=true){i=Math.max(0,Math.min(cards.length-1,i));deck.scrollTo({left:cards[i].offsetLeft-deck.offsetLeft,behavior:smooth&&!reduced.matches?'smooth':'instant'});setCurrent(i);}
function setCurrent(i){if(i!==current){const old=cards[current];setTimeout(()=>{if(cards[current]!==old)old.scrollTop=0},300);current=i;}position.textContent=String(i+1);history.replaceState(null,'','#'+encodeURIComponent(cards[i].id));document.getElementById('previous').disabled=i===0;document.getElementById('next').disabled=i===cards.length-1;}
function hash(){let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}const i=cards.findIndex(c=>c.id===id);if(i>=0)move(i,false)}
deck.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>{const rect=deck.getBoundingClientRect();let i=cards.reduce((best,c,n)=>Math.abs(c.getBoundingClientRect().left-rect.left)<Math.abs(cards[best].getBoundingClientRect().left-rect.left)?n:best,0);setCurrent(i)},100)},{passive:true});
document.getElementById('previous').onclick=()=>move(current-1);document.getElementById('next').onclick=()=>move(current+1);
open.onclick=()=>{grid.hidden=false;document.documentElement.classList.add('grid-open');close.focus()};function hide(back=true){grid.hidden=true;document.documentElement.classList.remove('grid-open');if(back)open.focus()}close.onclick=hide;
grid.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const i=cards.findIndex(c=>c.id===a.getAttribute('href').slice(1));hide(i<0);if(i>=0){move(i);cards[i].focus({preventScroll:true})}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!grid.hidden){hide();return}if(e.key==='Tab'&&!grid.hidden){const items=[close,...grid.querySelectorAll('.grid-tiles a')];const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}return}if(!grid.hidden||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(current+(e.key==='ArrowRight'?1:-1))}});
document.querySelectorAll('.read-on').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const target=document.getElementById(a.getAttribute('href').slice(1));const card=target.closest('.deck-card');card.scrollTo({top:target.offsetTop-card.querySelector('.card-inner').offsetTop,behavior:reduced.matches?'instant':'smooth'});}));
window.addEventListener('hashchange',hash);if('scrollRestoration' in history)history.scrollRestoration='manual';if(location.hash){hash();const top=()=>{scrollTo(0,0);fit()};setTimeout(top,0);addEventListener('load',top,{once:true})}else setCurrent(0);
})();

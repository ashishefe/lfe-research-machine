(function(){
'use strict';
function openTarget(){
 const id=decodeURIComponent(location.hash.slice(1));
 const target=id && document.getElementById(id);
 if(target && target.matches('#record details')){target.open=true;target.scrollIntoView();}
}
window.addEventListener('hashchange',openTarget);
openTarget();
})();

(() => {
'use strict';
const $=s=>document.querySelector(s),canvas=$('#walkCanvas'),modal=$('#walkMode'),model=HallModel;
const keys=new Set(),touchKeys=new Set(),moves=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
let engine,active=false,paused=false,location='lobby',seated=null,nearby=null,position={x:0,z:5},yaw=Math.PI,pitch=0,drag,frame,last=0,hud='',noticeTimer;
const hallNumber=()=>Number(Cinema.context?.session.hall.match(/\d+/)?.[0]||1),label=q=>'Ряд '+q.row+', место '+q.seat;
function notice(text){$('#walkNotice').textContent=text;$('#walkNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#walkNotice').hidden=true,4500);}
function screenTexture(){
 const c=document.createElement('canvas');c.width=1536;c.height=640;const g=c.getContext('2d');
 g.fillStyle='#29113d';g.fillRect(0,0,c.width,c.height);g.fillStyle='#ff5a20';g.beginPath();g.arc(1380,180,330,0,Math.PI*2);g.fill();
 g.fillStyle='#fff';g.font='800 34px sans-serif';g.fillText('КИНОСТАР',100,112);g.font='bold 64px sans-serif';let line='',y=250;
 for(const word of (Cinema.context?.film.title||'Добро пожаловать').split(' ')){if(line&&g.measureText(line+' '+word).width>1120){g.fillText(line,100,y);y+=76;line=word;}else line=line?line+' '+word:word;}
 g.fillText(line,100,y);g.font='28px sans-serif';g.fillStyle='#ddc9ed';g.fillText((Cinema.context?.session.hall||'Зал')+' · '+(Cinema.context?.session.time||'')+'   /   Выберите свой ракурс',100,550);
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
}
function build(){
 const T=THREE,renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const camera=new T.PerspectiveCamera(72,1,.04,70);camera.rotation.order='YXZ';
 engine={renderer,camera,...createCinemaHall(T,model,screenTexture),lobby:CinemaLobby.build(T),ray:new T.Raycaster(),colorKey:''};recolor();
}
function recolor(){
 const key=Cinema.selected.id+':'+(nearby?.id||'');if(!engine||engine.colorKey===key)return;
 model.seats.forEach((q,i)=>{const c=new THREE.Color(Cinema.taken.has(q.id)?'#191b1d':q.id===nearby?.id?'#575c58':'#3e4140').convertSRGBToLinear();engine.backs.setColorAt(i,c);engine.bases.setColorAt(i,c);});
 engine.backs.instanceColor.needsUpdate=true;engine.bases.instanceColor.needsUpdate=true;engine.colorKey=key;
 const q=Cinema.selected;engine.marker.position.set(q.x,q.y+.013,q.z-.7);
}
function resize(){if(!engine)return;const r=modal.getBoundingClientRect();if(!r.width||!r.height)return;engine.renderer.setSize(r.width,r.height,false);engine.camera.aspect=r.width/r.height;engine.camera.fov=r.width<r.height?82:72;engine.camera.updateProjectionMatrix();}
function aim(x,z){yaw=Math.atan2(position.x-x,position.z-z);pitch=0;}
function faceScreen(){if(location==='lobby'){const d=CinemaLobby.doors.find(d=>d.hall===hallNumber());if(d.side==='end'&&position.z<23)aim(0,25);else aim(d.x,d.z);return;}yaw=Math.atan2(position.x,position.z);pitch=Math.atan2(4.4-(seated?seated.y+1.17:model.floorAt(position.z)+1.68),Math.hypot(position.x,position.z));}
function clearMovement(){keys.clear();touchKeys.clear();drag=null;document.querySelectorAll('[data-walk]').forEach(b=>b.classList.remove('active'));}
function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
function updateHUD(){
 const key=location+':'+(seated?.id||'')+':'+(nearby?.id||nearby?.hall||nearby?.type||'')+':'+Cinema.selected.id;if(hud===key)return;hud=key;const lobby=location==='lobby';
 $('#walkPlace').textContent=lobby?'Фойе · ваш зал '+hallNumber():seated?label(seated):'Зал '+hallNumber()+' · свободная прогулка';
 $('#walkState').textContent=seated?'Вы сидите':lobby?'Кинобар → зал '+hallNumber():'Выберите кресло';
 $('#seatHint').textContent=lobby?(nearby?.type==='bar'?'Попкорн и напитки — можно взять с собой':nearby?.type==='door'?'Вход в зал '+nearby.hall:'Идите по коридору к залу '+hallNumber()):seated?'Оцените вид на экран и начните оформление':nearby?.type==='exit'?'Вернуться в фойе':nearby?label(nearby):'Подойдите к свободному креслу';
 $('#interactSeat').disabled=!seated&&!nearby;
 $('#interactSeat').textContent=lobby?(nearby?.type==='bar'?'Открыть кинобар · E':'Войти в зал · E'):seated?'Встать · E':nearby?.type==='exit'?'В коридор · E':'Сесть сюда · E';
 $('#walkChoice').textContent=lobby?'Зал '+hallNumber()+' · '+(Cinema.context?.session.time||''):'Выбрано: '+label(Cinema.selected).toLowerCase();
 $('#walkBuy').textContent='Начать → к оплате';$('#walkBuy').disabled=!seated||lobby;
 $('#returnToSeat').textContent=lobby?'Показать направление':'К выбранному креслу';$('#centerView').textContent=lobby?'К моему залу':'К экрану';$('#toLobby').hidden=lobby;$('#miniCaption').textContent=lobby?'Ваш зал выделен':'Вы в зале '+hallNumber();
}
function findNearby(){
 if(location==='lobby')return CinemaLobby.nearest(position);if(seated)return null;
 if(Math.hypot(position.x-6.7,position.z-18.9)<1.25)return{type:'exit'};
 let best=null,score=Infinity;
 for(const q of model.seats){if(Cinema.taken.has(q.id))continue;const d=Math.hypot(q.x-position.x,q.z-position.z);if(d<1.35){const facing=(-Math.sin(yaw)*(q.x-position.x)-Math.cos(yaw)*(q.z-position.z))/Math.max(d,.01),s=d-facing*.25;if(s<score){score=s;best=q;}}}return best;
}
function sit(q){if(location!=='hall'||!q||!q.id||Cinema.taken.has(q.id))return;seated=q;Cinema.selectSeat(q.id);position={x:q.x,z:q.z-.03};nearby=null;clearMovement();faceScreen();hud='';updateHUD();recolor();}
function stand(){if(!seated)return;position={x:seated.x,z:seated.z-.87};seated=null;nearby=findNearby();hud='';updateHUD();}
function enterHall(door){if(door.hall!==hallNumber())return notice('Ваш сеанс проходит в зале '+hallNumber()+'. Номер подсвечен на плане.');location='hall';seated=null;position={x:6.7,z:18};engine.camera.position.set(position.x,model.floorAt(position.z)+1.68,position.z);faceScreen();hud='';notice('Вы в зале '+hallNumber()+'. Пройдите между рядами и сядьте на свободное место.');}
function toLobby(){location='lobby';seated=null;const d=CinemaLobby.doors.find(d=>d.hall===hallNumber());position={x:d.side==='left'?-2.5:d.side==='right'?2.5:d.x,z:d.side==='end'?26.2:d.z};engine.camera.position.set(position.x,1.68,position.z);yaw=d.side==='left'?-Math.PI/2:d.side==='right'?Math.PI/2:0;pitch=0;clearMovement();hud='';}
function interact(){if(paused)return;if(location==='lobby'){if(nearby?.type==='bar')CinemaCommerce.openShop();else if(nearby?.type==='door')enterHall(nearby);}else if(nearby?.type==='exit')toLobby();else if(seated)stand();else sit(nearby);}
function open(options={}){
 if(active||!Cinema.context)return;$('#walkError').hidden=true;
 try{if(!window.THREE)throw Error('Не удалось загрузить 3D');if(!engine)build();}catch(e){$('#walkError').textContent='Не удалось открыть прогулку. '+e.message;$('#walkError').hidden=false;return;}
 active=true;paused=false;location='lobby';seated=null;position={x:0,z:5.2};yaw=-.85;pitch=-.04;modal.hidden=false;modal.inert=false;document.body.classList.add('walking');$('.app-shell').inert=true;
 engine.camera.position.set(position.x,1.68,position.z);resize();clearMovement();hud='';nearby=findNearby();updateHUD();canvas.focus();last=performance.now();frame=requestAnimationFrame(tick);
 if(options.resume){enterHall({hall:hallNumber()});sit(Cinema.selected);}else notice('Начните с кинобара. WASD — ходить, зажатая мышь — осмотр, E — действие.');
}
function close(){active=false;paused=false;clearMovement();releaseMouse();cancelAnimationFrame(frame);modal.hidden=true;modal.inert=false;document.body.classList.remove('walking');$('.app-shell').inert=false;clearTimeout(noticeTimer);$('#walkNotice').hidden=true;$('#walkBtn').focus();}
function pause(value){paused=value;clearMovement();releaseMouse();modal.inert=value;if(!value&&active)canvas.focus();}
function drawMiniMap(){
 const g=$('#miniMap').getContext('2d');g.clearRect(0,0,180,210);let px,pz;
 if(location==='lobby'){
 px=x=>34+x*5.7;pz=z=>198-z*6.4;g.fillStyle='#34303f';g.fillRect(px(-4),pz(28),8*5.7,28*6.4);g.fillRect(px(4),pz(28),16*5.7,6*6.4);
 g.font='bold 13px sans-serif';g.textAlign='center';for(const d of CinemaLobby.doors){g.fillStyle=d.hall===hallNumber()?'#ff6c36':'#9e95ad';g.fillRect(px(d.x)-8,pz(d.z)-9,16,18);g.fillStyle=d.hall===hallNumber()?'#171018':'#fff';g.fillText(d.hall,px(d.x),pz(d.z)+4);}
 g.fillStyle='#b49adb';g.fillRect(px(1.5),pz(4.5),12,21);g.font='9px sans-serif';g.fillStyle='#fff';g.fillText('ВХОД',34,209);
 }else{px=x=>90+x*10;pz=z=>9+z*9.2;g.strokeStyle='#69717a';g.strokeRect(10,6,160,189);g.fillStyle='#dae9f3';g.fillRect(33,12,114,3);for(const q of model.seats){g.fillStyle=q.id===Cinema.selected.id?'#ff7956':Cinema.taken.has(q.id)?'#343c49':'#8d9698';g.fillRect(px(q.x)-2.8,pz(q.z)-2.8,5.6,5.6);}}
 const x=px(position.x),z=pz(position.z);g.fillStyle='#8ee5d4';g.beginPath();g.arc(x,z,3.5,0,Math.PI*2);g.fill();g.strokeStyle='#8ee5d4';g.lineWidth=2;g.beginPath();g.moveTo(x,z);g.lineTo(x-Math.sin(yaw)*13,z+(location==='lobby'?1:-1)*Math.cos(yaw)*13);g.stroke();
}
function tick(now){
 if(!active)return;const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
 if(!paused){
 const f=Number(keys.has('KeyW')||keys.has('ArrowUp')||touchKeys.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||touchKeys.has('back')),s=Number(keys.has('KeyD')||keys.has('ArrowRight')||touchKeys.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||touchKeys.has('left'));
 if(f||s){if(seated)stand();const v=model.direction(yaw,f,s),speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?4:2.8;position=(location==='lobby'?CinemaLobby:model).move(position,v.x*speed*dt,v.z*speed*dt);}
 const c=engine.camera,y=location==='lobby'?1.68:seated?seated.y+1.17:model.floorAt(position.z)+1.68;c.position.x=position.x;c.position.z=position.z;c.position.y+=(y-c.position.y)*(1-Math.exp(-12*dt));c.rotation.set(pitch,yaw,0,'YXZ');nearby=findNearby();updateHUD();recolor();drawMiniMap();
 }engine.renderer.render(location==='lobby'?engine.lobby.scene:engine.scene,engine.camera);frame=requestAnimationFrame(tick);
}
function look(dx,dy){yaw-=dx*.0025;pitch=Math.max(-1.25,Math.min(1.25,pitch-dy*.0025));}
function selectPoint(x,y){if(location==='lobby'){if(nearby)interact();return;}const r=canvas.getBoundingClientRect(),locked=document.pointerLockElement===canvas;engine.ray.setFromCamera({x:locked?0:(x-r.left)/r.width*2-1,y:locked?0:-(y-r.top)/r.height*2+1},engine.camera);const hit=engine.ray.intersectObjects([engine.backs,engine.bases])[0];if(!hit)return;const q=model.seats[hit.instanceId];if(Cinema.taken.has(q.id))return notice('Это кресло занято в макете. Выберите другое.');if(Math.hypot(position.x-q.x,position.z-q.z)>1.8)return notice('Подойдите к креслу поближе.');sit(q);}
canvas.addEventListener('pointerdown',e=>{if(!active||paused||e.button!==0)return;canvas.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY,distance:0};if(document.pointerLockElement!==canvas)canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!active||paused)return;if(document.pointerLockElement===canvas)return look(e.movementX,e.movementY);if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.distance+=Math.hypot(dx,dy);look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const click=drag.distance<5;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(click)selectPoint(e.clientX,e.clientY);});
canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerlockchange',()=>{clearMovement();$('#mouseLook').textContent=document.pointerLockElement===canvas?'Мышь захвачена · Esc':'Управлять мышью';});
document.addEventListener('pointerlockerror',()=>notice('Осматривайтесь, удерживая левую кнопку мыши.'));
$('#mouseLook').addEventListener('click',async()=>{if(document.pointerLockElement===canvas)return releaseMouse();try{if(!canvas.requestPointerLock)throw Error();await canvas.requestPointerLock();}catch{notice('Осматривайтесь, удерживая левую кнопку мыши.');}});
window.addEventListener('keydown',e=>{if(!active||paused)return;if(moves.has(e.code)||e.code==='Space')e.preventDefault();if(moves.has(e.code)||e.code.startsWith('Shift'))keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='Space'&&!e.repeat)stand();if(e.code==='Tab'){const a=[...modal.querySelectorAll('button:not(:disabled),canvas[tabindex]')].filter(el=>el.getClientRects().length);if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0].focus();}}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearMovement();releaseMouse();}});window.addEventListener('resize',resize);
for(const b of document.querySelectorAll('[data-walk]')){b.addEventListener('pointerdown',e=>{if(paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);touchKeys.add(b.dataset.walk);b.classList.add('active');});const stop=()=>{touchKeys.delete(b.dataset.walk);b.classList.remove('active');};b.addEventListener('pointerup',stop);b.addEventListener('pointercancel',stop);b.addEventListener('lostpointercapture',stop);}
$('#walkBtn').addEventListener('click',open);$('#closeWalk').addEventListener('click',close);$('#centerView').addEventListener('click',faceScreen);$('#interactSeat').addEventListener('click',interact);$('#toLobby').addEventListener('click',toLobby);
$('#returnToSeat').addEventListener('click',()=>location==='lobby'?faceScreen():sit(Cinema.selected));
$('#walkBuy').addEventListener('click',()=>{if(!seated||location!=='hall')return;close();CinemaCommerce.checkout();});
$('#walkBag').addEventListener('click',()=>CinemaCommerce.openShop());
window.addEventListener('cinema-session-change',()=>{hud='';if(engine){engine.screen.material.map.dispose();engine.screen.material.map=screenTexture();engine.screen.material.needsUpdate=true;}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();close();$('#walkError').hidden=false;$('#walkError').textContent='3D прерван. Обновите страницу, чтобы продолжить.';});
window.CinemaTour={open,close,pause,get active(){return active;}};
})();

/* Instanced upholstery and hardware keep all 112 detailed chairs inexpensive to draw. */
window.createCinemaHall = function(T, model, screenTexture) {
  const scene = new T.Scene(); scene.background = new T.Color('#101113');
  const material = (color, roughness=.75, metalness=0) => {
    const m = new T.MeshStandardMaterial({color, roughness, metalness});m.color.convertSRGBToLinear();return m;
  };
  const floor=material('#343333'),wall=material('#191b1e'),panel=material('#242529'),
    leather=material('#ffffff',.52),black=material('#242626',.49),metal=material('#555956',.3,.7),
    seam=material('#777b75',.9),red=new T.MeshBasicMaterial({color:'#ff1737'}),white=new T.MeshBasicMaterial({color:'#e8f1ff'});
  const box=new T.BoxGeometry(1,1,1);
  const {room,screen:screenSize,projector:projectorPosition}=model.config;
  const depth=room.back-room.front,centerZ=(room.back+room.front)/2;
  const block=(x,y,z,w,h,d,m)=>{const o=new T.Mesh(box,m);o.position.set(x,y,z);o.scale.set(w,h,d);scene.add(o);return o;};
  scene.add(new T.HemisphereLight('#d8ddff','#51454d',.65));
  for(const z of [10,17]) {const light=new T.PointLight('#e7eeff',.55,24,1.3);light.position.set(0,6,z);scene.add(light);}
  block(0,-.14,centerZ,room.width,.28,depth,floor);block(0,room.height,centerZ,room.width,.2,depth,wall);
  for(const z of [room.front,room.back])block(0,room.height/2,z,room.width,room.height,.2,wall);
  for(const side of [-1,1]) {
    block(side*(room.width/2-.05),room.height/2,centerZ,.15,room.height,depth,wall);
    for(let z=-2;z<19;z+=3.2){
      block(side*(room.width/2-.18),5.6,z,.1,9.4,2.6,panel);
      block(side*(room.width/2-.27),4.25,z+1.4,.04,5.65,.11,white);
      block(side*(room.width/2-.31),4.25,z+1.54,.02,5.65,.025,white);
    }
    for(let z=3;z<19;z+=3.1)block(side*5.7,room.height-.15,z,.15,.025,.15,white);
  }
  for(let row=2;row<=8;row++){
    const start=3.97+(row-1)*model.config.rowGap,end=row===8?19.8:start+model.config.rowGap,y=(row-1)*model.config.rise;
    block(0,y/2,(start+end)/2,room.width-.2,y,end-start,floor);
    for(const x of [-6.75,6.75])block(x,y+.012,start+.018,1.85,.025,.045,red);
  }
  // Front handrails leave both walking routes clear.
  for(const side of [-1,1]) {
    for(const x of [2.6,4,5.4])block(side*x,.48,3.3,.045,.96,.045,metal);
    block(side*4,.96,3.3,2.85,.045,.045,metal);
    block(side*4,.48,3.3,2.85,.03,.03,metal);
  }
  block(0,screenSize.y,screenSize.z-.12,screenSize.width+.32,screenSize.height+.32,.18,black);
  const screen=new T.Mesh(new T.PlaneGeometry(screenSize.width,screenSize.height),new T.MeshBasicMaterial({map:screenTexture(),toneMapped:false}));screen.position.set(0,screenSize.y,screenSize.z);scene.add(screen);
  // Broad, inexpensive light spill; no shadow maps or post-processing on mobile.
  for(const x of [-8,0,8]){const glow=new T.PointLight(x===0?'#c2cbff':'#b99bff',1.3,20,1.5);glow.position.set(x,4,screenSize.z+1.8);scene.add(glow);}
  const projector=block(projectorPosition.x,projectorPosition.y,projectorPosition.z,1.3,.65,.8,metal);
  block(0,5.65,19.25,.16,.25,.2,black);
  const lens=new T.Mesh(new T.CylinderGeometry(.13,.17,.16,24),white);lens.rotation.x=Math.PI/2;lens.position.set(0,5.2,18.65);scene.add(lens);
  block(.48,5.25,18.68,.06,.06,.025,new T.MeshBasicMaterial({color:'#8ee5d4'}));
  for(let i=0;i<5;i++)block(-.42+i*.15,5.12,18.69,.05,.23,.02,black);
  const projectorLight=new T.PointLight('#d8e6ff',.45,5);projectorLight.position.set(0,5.3,18.4);scene.add(projectorLight);
  block(6.7,2.45,19.6,1.45,2.4,.16,black);
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#075637';g.fillRect(0,0,512,128);g.fillStyle='white';g.font='bold 62px sans-serif';g.textAlign='center';g.fillText('В КОРИДОР',256,86);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;const exit=new T.Mesh(new T.PlaneGeometry(1.6,.4),new T.MeshBasicMaterial({map:t}));exit.position.set(6.7,3.95,19.48);exit.rotation.y=Math.PI;scene.add(exit);
  const dummy=new T.Object3D();
  function instances(geometry,mat,items){const mesh=new T.InstancedMesh(geometry,mat,items.length);items.forEach((v,i)=>{dummy.position.set(...v.p);dummy.scale.set(...(v.s||[1,1,1]));dummy.rotation.set(v.rx||0,v.ry||0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});scene.add(mesh);return mesh;}
  function rounded(w,h,d,r){const s=new T.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.025,bevelThickness:.035,bevelSegments:3,steps:1,curveSegments:7});geo.translate(0,0,-d/2);return geo;
  }
  const backs=instances(rounded(.58,.68,.13,.1),leather,model.seats.map(q=>({p:[q.x,q.y+.84,q.z+.22],rx:-.13})));
  const bases=instances(rounded(.58,.6,.13,.09),leather,model.seats.map(q=>({p:[q.x,q.y+.43,q.z-.04],rx:-Math.PI/2})));
  // Large independent headrest, side bolsters, padded armrests, recessed cupholders.
  instances(rounded(.61,.23,.19,.09),black,model.seats.map(q=>({p:[q.x,q.y+1.23,q.z+.23],rx:-.08})));
  instances(rounded(.1,.55,.15,.045),black,model.seats.flatMap(q=>[-1,1].map(s=>({p:[q.x+s*.26,q.y+.83,q.z+.13],rx:-.13}))));
  instances(rounded(.12,.59,.11,.045),black,model.seats.flatMap(q=>[-1,1].map(s=>({p:[q.x+s*.335,q.y+.65,q.z-.015],rx:-Math.PI/2}))));
  instances(box,black,model.seats.flatMap(q=>[-1,1].map(s=>({p:[q.x+s*.335,q.y+.38,q.z+.12],s:[.11,.5,.3]}))));
  instances(new T.TorusGeometry(.043,.008,7,16),metal,model.seats.flatMap(q=>[-1,1].map(s=>({p:[q.x+s*.335,q.y+.724,q.z-.21],rx:-Math.PI/2}))));
  instances(new T.CircleGeometry(.035,16),material('#080909'),model.seats.flatMap(q=>[-1,1].map(s=>({p:[q.x+s*.335,q.y+.723,q.z-.21],rx:-Math.PI/2}))));
  instances(box,seam,model.seats.flatMap(q=>[-1,1].map(s=>({p:[q.x+s*.17,q.y+.83,q.z+.137],s:[.003,.41,.003],rx:-.13}))));
  instances(box,metal,model.seats.map(q=>({p:[q.x,q.y+.18,q.z],s:[.24,.36,.3]})));
  const marker=new T.Mesh(new T.RingGeometry(.27,.30,32),new T.MeshBasicMaterial({color:'#ff6537',side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;scene.add(marker);
  return {scene,screen,backs,bases,marker,projector};
};

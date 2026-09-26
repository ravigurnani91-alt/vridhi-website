(function(){
const sec=document.getElementById('imageSection');
sec.innerHTML=`
<div class="subtabs" id="imgTabs"></div>
<div class="card"><div class="drop" id="imgDrop">Click or drag an image here (JPG, PNG, WebP)</div>
<input type="file" id="imgFile" accept="image/*"><div class="hint" id="imgFileHint"></div></div>
<div class="card" id="imgToolCard" style="display:none;">
<div id="panel-bg"></div><div id="panel-remove" style="display:none;"></div>
<div id="panel-crop" style="display:none;"></div>
<div id="panel-filters" style="display:none;"></div><div id="panel-compress" style="display:none;"></div>
<div id="panel-convert" style="display:none;"></div>
<div class="canvas-wrap"><div style="position:relative;display:inline-block;">
<canvas id="imgCanvas"></canvas>
<canvas id="imgMaskCanvas" style="position:absolute;left:0;top:0;pointer-events:none;touch-action:none;"></canvas>
</div></div>
<div class="row"><button class="btn" id="imgDownloadBtn">Download</button>
<button class="btn secondary" id="undoBtn" disabled>Undo</button>
<button class="btn secondary" id="redoBtn" disabled>Redo</button>
<button class="btn secondary" id="imgResetBtn">Reset to original</button>
<span class="hint" id="imgSizeInfo"></span></div></div>`;

const tabs=[{id:'bg',label:'Remove Background'},{id:'remove',label:'Remove Element'},{id:'crop',label:'Crop & Resize'},{id:'filters',label:'Filters & Adjust'},{id:'compress',label:'Compress'},{id:'convert',label:'Convert Format'}];
const tabsEl=document.getElementById('imgTabs');
tabs.forEach((t,i)=>{const b=document.createElement('button');b.className='subtab'+(i===0?' active':'');b.textContent=t.label;b.dataset.id=t.id;b.onclick=()=>selectTab(t.id);tabsEl.appendChild(b);});

let originalImg=null, activeTab='bg';
const canvas=document.getElementById('imgCanvas'), ctx=canvas.getContext('2d');
const maskCanvas=document.getElementById('imgMaskCanvas'), mCtx=maskCanvas.getContext('2d');
const toolCard=document.getElementById('imgToolCard');
const fileInput=document.getElementById('imgFile');
const drop=document.getElementById('imgDrop');
drop.onclick=()=>fileInput.click();
drop.ondragover=e=>{e.preventDefault();drop.style.borderColor='var(--brand)';};
drop.ondragleave=()=>{drop.style.borderColor='var(--border)';};
drop.ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);};
fileInput.onchange=e=>{if(e.target.files[0])loadFile(e.target.files[0]);};

// ---- history (undo/redo) ----
let history=[], historyIdx=-1, restoring=false;
function pushHistory(){
  if(restoring)return;
  history=history.slice(0,historyIdx+1);
  history.push(canvas.toDataURL('image/png'));
  if(history.length>20)history.shift(); else historyIdx++;
  historyIdx=history.length-1;
  updateUndoRedoBtns();
}
function restoreFromHistory(){
  restoring=true;
  const img=new Image();
  img.onload=()=>{canvas.width=img.width;canvas.height=img.height;maskCanvas.width=img.width;maskCanvas.height=img.height;ctx.filter='none';ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);updateSizeInfo();restoring=false;};
  img.src=history[historyIdx];
}
function updateUndoRedoBtns(){
  document.getElementById('undoBtn').disabled=historyIdx<=0;
  document.getElementById('redoBtn').disabled=historyIdx>=history.length-1;
}
document.getElementById('undoBtn').onclick=()=>{if(historyIdx>0){historyIdx--;restoreFromHistory();updateUndoRedoBtns();}};
document.getElementById('redoBtn').onclick=()=>{if(historyIdx<history.length-1){historyIdx++;restoreFromHistory();updateUndoRedoBtns();}};

function loadFile(file){
  const img=new Image();
  img.onload=()=>{
    originalImg=img; canvas.width=img.width; canvas.height=img.height; ctx.drawImage(img,0,0);
    maskCanvas.width=img.width; maskCanvas.height=img.height;
    toolCard.style.display='block';
    document.getElementById('imgFileHint').textContent=file.name+' loaded ('+img.width+'x'+img.height+')';
    history=[]; historyIdx=-1; pushHistory();
    selectTab(activeTab); updateSizeInfo();
  };
  img.onerror=()=>alert('Could not load that image.');
  img.src=URL.createObjectURL(file);
}
function updateSizeInfo(){canvas.toBlob(b=>{document.getElementById('imgSizeInfo').textContent=b?(Math.round(b.size/1024)+' KB - '+canvas.width+'x'+canvas.height):'';},'image/png');}
document.getElementById('imgResetBtn').onclick=()=>{if(!originalImg)return;canvas.width=originalImg.width;canvas.height=originalImg.height;ctx.filter='none';ctx.drawImage(originalImg,0,0);mCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);updateSizeInfo();pushHistory();};

function selectTab(id){
  activeTab=id;
  [...tabsEl.children].forEach(b=>b.classList.toggle('active',b.dataset.id===id));
  ['bg','remove','crop','filters','compress','convert'].forEach(t=>{document.getElementById('panel-'+t).style.display=t===id?'block':'none';});
  maskCanvas.style.pointerEvents = id==='remove' ? 'auto' : 'none';
  maskCanvas.style.cursor = id==='remove' ? 'crosshair' : 'default';
  if(!originalImg)return; buildPanel(id);
}
function buildPanel(id){
  const el=document.getElementById('panel-'+id); el.innerHTML='';
  if(id==='bg')buildBgPanel(el); if(id==='remove')buildRemovePanel(el);
  if(id==='crop')buildCropPanel(el);
  if(id==='filters')buildFiltersPanel(el); if(id==='compress')buildCompressPanel(el);
  if(id==='convert')buildConvertPanel(el);
}
function buildBgPanel(el){
  el.innerHTML=`<p class="hint" style="margin-top:0">Click a spot on the background in the preview, then adjust tolerance.</p>
  <div class="row"><div><label>Tolerance</label><input type="range" id="tolerance" min="5" max="120" value="35"></div>
  <button class="btn" id="applyBg">Remove picked color</button></div>`;
  let pickedColor=null;
  canvas.onclick=(e)=>{
    if(activeTab!=='bg')return;
    const rect=canvas.getBoundingClientRect();
    const x=Math.floor((e.clientX-rect.left)*(canvas.width/rect.width));
    const y=Math.floor((e.clientY-rect.top)*(canvas.height/rect.height));
    const d=ctx.getImageData(x,y,1,1).data; pickedColor=[d[0],d[1],d[2]];
  };
  document.getElementById('applyBg').onclick=()=>{
    if(!pickedColor){alert('Click on the background color in the image first.');return;}
    const tol=parseInt(document.getElementById('tolerance').value,10);
    const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
    const d=imgData.data,[r0,g0,b0]=pickedColor;
    for(let i=0;i<d.length;i+=4){const dist=Math.sqrt((d[i]-r0)**2+(d[i+1]-g0)**2+(d[i+2]-b0)**2);if(dist<tol)d[i+3]=0;}
    ctx.putImageData(imgData,0,0); updateSizeInfo(); pushHistory();
  };
}
// ---- Remove Element: brush a mask, then fill it via neighbor-diffusion inpainting ----
function buildRemovePanel(el){
  el.innerHTML=`<p class="hint" style="margin-top:0">Brush over the object you want removed, then apply. Best for small objects on fairly simple backgrounds.</p>
  <div class="row"><div><label>Brush size</label><input type="range" id="brushSize" min="5" max="60" value="20"></div>
  <button class="btn secondary" id="clearMaskBtn">Clear selection</button>
  <button class="btn" id="applyRemove">Remove selected</button></div>`;
  let drawing=false;
  function getPos(e){
    const rect=maskCanvas.getBoundingClientRect();
    return [(e.clientX-rect.left)*(maskCanvas.width/rect.width),(e.clientY-rect.top)*(maskCanvas.height/rect.height)];
  }
  function drawDot(e){
    const [x,y]=getPos(e);
    const size=parseInt(document.getElementById('brushSize').value,10);
    mCtx.fillStyle='rgba(255,60,60,0.45)';
    mCtx.beginPath(); mCtx.arc(x,y,size,0,Math.PI*2); mCtx.fill();
  }
  maskCanvas.onpointerdown=e=>{if(activeTab!=='remove')return;drawing=true;drawDot(e);};
  maskCanvas.onpointermove=e=>{if(!drawing||activeTab!=='remove')return;drawDot(e);};
  window.addEventListener('pointerup',()=>drawing=false);
  document.getElementById('clearMaskBtn').onclick=()=>mCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);
  document.getElementById('applyRemove').onclick=()=>{
    const mData=mCtx.getImageData(0,0,maskCanvas.width,maskCanvas.height).data;
    let minX=maskCanvas.width,minY=maskCanvas.height,maxX=0,maxY=0,any=false;
    for(let y=0;y<maskCanvas.height;y++)for(let x=0;x<maskCanvas.width;x++){
      const a=mData[(y*maskCanvas.width+x)*4+3];
      if(a>10){any=true;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }
    if(!any){alert('Brush over the object first.');return;}
    const pad=6;
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
    maxX=Math.min(maskCanvas.width-1,maxX+pad);maxY=Math.min(maskCanvas.height-1,maxY+pad);
    const w=maxX-minX+1,h=maxY-minY+1;
    const imgData=ctx.getImageData(minX,minY,w,h);
    const maskCrop=mCtx.getImageData(minX,minY,w,h);
    inpaint(imgData,maskCrop,w,h,60);
    ctx.putImageData(imgData,minX,minY);
    mCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);
    updateSizeInfo(); pushHistory();
  };
}
function inpaint(imgData,maskData,w,h,iterations){
  const d=imgData.data, md=maskData.data;
  const mask=new Uint8Array(w*h);
  for(let p=0;p<w*h;p++)mask[p]=md[p*4+3]>10?1:0;
  let rs=0,gs=0,bs=0,cnt=0;
  for(let p=0;p<w*h;p++)if(!mask[p]){rs+=d[p*4];gs+=d[p*4+1];bs+=d[p*4+2];cnt++;}
  const ar=cnt?rs/cnt:128, ag=cnt?gs/cnt:128, ab=cnt?bs/cnt:128;
  const buf=new Float32Array(w*h*3);
  for(let p=0;p<w*h;p++){
    if(mask[p]){buf[p*3]=ar;buf[p*3+1]=ag;buf[p*3+2]=ab;}
    else{buf[p*3]=d[p*4];buf[p*3+1]=d[p*4+1];buf[p*3+2]=d[p*4+2];}
  }
  for(let it=0;it<iterations;it++){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x; if(!mask[p])continue;
      let r=0,g=0,b=0,n=0;
      if(x>0){const q=p-1;r+=buf[q*3];g+=buf[q*3+1];b+=buf[q*3+2];n++;}
      if(x<w-1){const q=p+1;r+=buf[q*3];g+=buf[q*3+1];b+=buf[q*3+2];n++;}
      if(y>0){const q=p-w;r+=buf[q*3];g+=buf[q*3+1];b+=buf[q*3+2];n++;}
      if(y<h-1){const q=p+w;r+=buf[q*3];g+=buf[q*3+1];b+=buf[q*3+2];n++;}
      buf[p*3]=r/n; buf[p*3+1]=g/n; buf[p*3+2]=b/n;
    }
  }
  for(let p=0;p<w*h;p++)if(mask[p]){d[p*4]=buf[p*3];d[p*4+1]=buf[p*3+1];d[p*4+2]=buf[p*3+2];}
}
function buildCropPanel(el){
  el.innerHTML=`<div class="row"><div><label>Width</label><input type="number" id="cw" value="${canvas.width}"></div>
  <div><label>Height</label><input type="number" id="ch" value="${canvas.height}"></div>
  <label style="display:flex;align-items:center;gap:6px;margin-top:16px;"><input type="checkbox" id="lockAspect" checked> Lock aspect ratio</label></div>
  <div class="row"><button class="btn" id="applyResize">Resize</button></div>`;
  const cw=document.getElementById('cw'),ch=document.getElementById('ch'),lock=document.getElementById('lockAspect');
  const ratio=canvas.width/canvas.height;
  cw.oninput=()=>{if(lock.checked)ch.value=Math.round(cw.value/ratio);};
  ch.oninput=()=>{if(lock.checked)cw.value=Math.round(ch.value*ratio);};
  document.getElementById('applyResize').onclick=()=>{
    const w=parseInt(cw.value,10),h=parseInt(ch.value,10); if(!w||!h)return;
    const tmp=document.createElement('canvas'); tmp.width=w;tmp.height=h; tmp.getContext('2d').drawImage(canvas,0,0,w,h);
    canvas.width=w;canvas.height=h; maskCanvas.width=w;maskCanvas.height=h; ctx.drawImage(tmp,0,0); updateSizeInfo(); pushHistory();
  };
}
function buildFiltersPanel(el){
  el.innerHTML=`<div class="row"><div><label>Brightness</label><input type="range" id="fb" min="0" max="200" value="100"></div>
  <div><label>Contrast</label><input type="range" id="fc" min="0" max="200" value="100"></div>
  <div><label>Saturation</label><input type="range" id="fs" min="0" max="200" value="100"></div>
  <div><label>Blur</label><input type="range" id="fbl" min="0" max="10" value="0"></div></div>
  <div class="row"><button class="btn secondary" id="grayscaleBtn">Grayscale</button>
  <button class="btn secondary" id="sepiaBtn">Sepia</button><button class="btn" id="applyFilters">Apply</button></div>`;
  const preview=()=>{
    const b=document.getElementById('fb').value,c=document.getElementById('fc').value,s=document.getElementById('fs').value,bl=document.getElementById('fbl').value;
    ctx.filter=`brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${bl}px)`; ctx.drawImage(originalImg,0,0,canvas.width,canvas.height);
  };
  ['fb','fc','fs','fbl'].forEach(id=>document.getElementById(id).oninput=preview);
  document.getElementById('grayscaleBtn').onclick=()=>{ctx.filter='grayscale(100%)';ctx.drawImage(originalImg,0,0,canvas.width,canvas.height);};
  document.getElementById('sepiaBtn').onclick=()=>{ctx.filter='sepia(100%)';ctx.drawImage(originalImg,0,0,canvas.width,canvas.height);};
  document.getElementById('applyFilters').onclick=()=>{ctx.filter='none';updateSizeInfo();pushHistory();};
}
function buildCompressPanel(el){
  el.innerHTML=`<div class="row"><div><label>Quality</label><input type="range" id="q" min="10" max="100" value="80"></div>
  <button class="btn" id="applyCompress">Compress (JPEG)</button></div><p class="hint" id="compressResult"></p>`;
  document.getElementById('applyCompress').onclick=()=>{
    const q=parseInt(document.getElementById('q').value,10)/100;
    canvas.toBlob(b=>{
      document.getElementById('compressResult').textContent='New size: '+Math.round(b.size/1024)+' KB';
      const img=new Image(); img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);pushHistory();};
      img.src=URL.createObjectURL(b); canvas.dataset.exportType='image/jpeg'; canvas.dataset.exportQuality=q;
    },'image/jpeg',q);
  };
}
function buildConvertPanel(el){
  el.innerHTML=`<div class="row"><div><label>Export as</label>
  <select id="fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></div>
  <button class="btn" id="setFmt">Use this format for download</button></div>`;
  document.getElementById('setFmt').onclick=()=>{canvas.dataset.exportType=document.getElementById('fmt').value;canvas.dataset.exportQuality=0.92;updateSizeInfo();};
}
document.getElementById('imgDownloadBtn').onclick=()=>{
  const type=canvas.dataset.exportType||'image/png';
  const q=canvas.dataset.exportQuality?parseFloat(canvas.dataset.exportQuality):0.92;
  canvas.toBlob(blob=>{
    if(!blob){alert('Export failed.');return;}
    const ext=type.split('/')[1]; const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='vridhi-image.'+ext; a.click();
  },type,q);
};
})();

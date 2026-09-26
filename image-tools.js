(function(){
const sec=document.getElementById('imageSection');
sec.innerHTML=`
<div class="subtabs" id="imgTabs"></div>
<div class="card"><div class="drop" id="imgDrop">Click or drag an image here (JPG, PNG, WebP)</div>
<input type="file" id="imgFile" accept="image/*"><div class="hint" id="imgFileHint"></div></div>
<div class="card" id="imgToolCard" style="display:none;">
<div id="panel-bg"></div><div id="panel-crop" style="display:none;"></div>
<div id="panel-filters" style="display:none;"></div><div id="panel-compress" style="display:none;"></div>
<div id="panel-convert" style="display:none;"></div>
<div class="canvas-wrap"><canvas id="imgCanvas"></canvas></div>
<div class="row"><button class="btn" id="imgDownloadBtn">Download</button>
<button class="btn secondary" id="imgResetBtn">Reset image</button>
<span class="hint" id="imgSizeInfo"></span></div></div>`;

const tabs=[{id:'bg',label:'Remove Background'},{id:'crop',label:'Crop & Resize'},{id:'filters',label:'Filters & Adjust'},{id:'compress',label:'Compress'},{id:'convert',label:'Convert Format'}];
const tabsEl=document.getElementById('imgTabs');
tabs.forEach((t,i)=>{const b=document.createElement('button');b.className='subtab'+(i===0?' active':'');b.textContent=t.label;b.dataset.id=t.id;b.onclick=()=>selectTab(t.id);tabsEl.appendChild(b);});

let originalImg=null, activeTab='bg';
const canvas=document.getElementById('imgCanvas'), ctx=canvas.getContext('2d');
const toolCard=document.getElementById('imgToolCard');
const fileInput=document.getElementById('imgFile');
const drop=document.getElementById('imgDrop');
drop.onclick=()=>fileInput.click();
drop.ondragover=e=>{e.preventDefault();drop.style.borderColor='var(--brand)';};
drop.ondragleave=()=>{drop.style.borderColor='var(--border)';};
drop.ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);};
fileInput.onchange=e=>{if(e.target.files[0])loadFile(e.target.files[0]);};

function loadFile(file){
  const img=new Image();
  img.onload=()=>{
    originalImg=img; canvas.width=img.width; canvas.height=img.height; ctx.drawImage(img,0,0);
    toolCard.style.display='block';
    document.getElementById('imgFileHint').textContent=file.name+' loaded ('+img.width+'x'+img.height+')';
    selectTab(activeTab); updateSizeInfo();
  };
  img.onerror=()=>alert('Could not load that image.');
  img.src=URL.createObjectURL(file);
}
function updateSizeInfo(){canvas.toBlob(b=>{document.getElementById('imgSizeInfo').textContent=b?(Math.round(b.size/1024)+' KB - '+canvas.width+'x'+canvas.height):'';},'image/png');}
document.getElementById('imgResetBtn').onclick=()=>{if(!originalImg)return;canvas.width=originalImg.width;canvas.height=originalImg.height;ctx.filter='none';ctx.drawImage(originalImg,0,0);updateSizeInfo();};

function selectTab(id){
  activeTab=id;
  [...tabsEl.children].forEach(b=>b.classList.toggle('active',b.dataset.id===id));
  ['bg','crop','filters','compress','convert'].forEach(t=>{document.getElementById('panel-'+t).style.display=t===id?'block':'none';});
  if(!originalImg)return; buildPanel(id);
}
function buildPanel(id){
  const el=document.getElementById('panel-'+id); el.innerHTML='';
  if(id==='bg')buildBgPanel(el); if(id==='crop')buildCropPanel(el);
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
    ctx.putImageData(imgData,0,0); updateSizeInfo();
  };
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
    canvas.width=w;canvas.height=h; ctx.drawImage(tmp,0,0); updateSizeInfo();
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
  document.getElementById('applyFilters').onclick=()=>{ctx.filter='none';updateSizeInfo();};
}
function buildCompressPanel(el){
  el.innerHTML=`<div class="row"><div><label>Quality</label><input type="range" id="q" min="10" max="100" value="80"></div>
  <button class="btn" id="applyCompress">Compress (JPEG)</button></div><p class="hint" id="compressResult"></p>`;
  document.getElementById('applyCompress').onclick=()=>{
    const q=parseInt(document.getElementById('q').value,10)/100;
    canvas.toBlob(b=>{
      document.getElementById('compressResult').textContent='New size: '+Math.round(b.size/1024)+' KB';
      const img=new Image(); img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);};
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

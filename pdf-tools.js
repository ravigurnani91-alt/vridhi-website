(function(){
const sec=document.getElementById('pdfSection');
sec.innerHTML=`
<div class="subtabs" id="pdfTabs"></div>
<div class="card" id="pdfPanel"></div>`;
const tabs=[{id:'merge',label:'Merge PDFs'},{id:'split',label:'Split / Extract'},{id:'rotate',label:'Rotate'},{id:'img2pdf',label:'Images to PDF'},{id:'pdf2img',label:'PDF to Images'}];
const tabsEl=document.getElementById('pdfTabs');
tabs.forEach((t,i)=>{const b=document.createElement('button');b.className='subtab'+(i===0?' active':'');b.textContent=t.label;b.dataset.id=t.id;b.onclick=()=>selectTab(t.id);tabsEl.appendChild(b);});
function selectTab(id){[...tabsEl.children].forEach(b=>b.classList.toggle('active',b.dataset.id===id));build(id);}

function fileRow(name){const d=document.createElement('div');d.textContent=name;return d;}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();}

function build(id){
  const p=document.getElementById('pdfPanel'); p.innerHTML='';
  if(id==='merge')buildMerge(p);
  if(id==='split')buildSplit(p);
  if(id==='rotate')buildRotate(p);
  if(id==='img2pdf')buildImg2Pdf(p);
  if(id==='pdf2img')buildPdf2Img(p);
}
build('merge');

function buildMerge(p){
  p.innerHTML=`<div class="drop" id="mergeDrop">Click or drag two or more PDFs here (order = merge order)</div>
  <input type="file" id="mergeFile" accept="application/pdf" multiple>
  <div class="filelist" id="mergeList"></div>
  <div class="row"><button class="btn" id="mergeBtn" disabled>Merge & Download</button></div>`;
  let files=[];
  const drop=document.getElementById('mergeDrop'),input=document.getElementById('mergeFile');
  drop.onclick=()=>input.click();
  drop.ondrop=e=>{e.preventDefault();addFiles([...e.dataTransfer.files]);};
  drop.ondragover=e=>e.preventDefault();
  input.onchange=e=>addFiles([...e.target.files]);
  function addFiles(fs){files=files.concat(fs.filter(f=>f.type==='application/pdf'));render();}
  function render(){
    const list=document.getElementById('mergeList'); list.innerHTML='';
    files.forEach(f=>list.appendChild(fileRow(f.name)));
    document.getElementById('mergeBtn').disabled=files.length<2;
  }
  document.getElementById('mergeBtn').onclick=async()=>{
    const {PDFDocument}=PDFLib; const merged=await PDFDocument.create();
    for(const f of files){
      const bytes=await f.arrayBuffer(); const src=await PDFDocument.load(bytes);
      const pages=await merged.copyPages(src,src.getPageIndices());
      pages.forEach(pg=>merged.addPage(pg));
    }
    const out=await merged.save(); download(new Blob([out],{type:'application/pdf'}),'merged.pdf');
  };
}

function buildSplit(p){
  p.innerHTML=`<div class="drop" id="splitDrop">Click or drag a PDF here</div>
  <input type="file" id="splitFile" accept="application/pdf">
  <div class="hint" id="splitHint"></div>
  <div class="row"><div><label>Page range (e.g. 1-3,5)</label><input type="text" id="pageRange" placeholder="1-3,5"></div>
  <button class="btn" id="splitBtn" disabled>Extract & Download</button></div>`;
  let doc=null,total=0;
  const drop=document.getElementById('splitDrop'),input=document.getElementById('splitFile');
  drop.onclick=()=>input.click(); drop.ondragover=e=>e.preventDefault();
  drop.ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);};
  input.onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};
  async function load(f){
    const bytes=await f.arrayBuffer(); doc=await PDFLib.PDFDocument.load(bytes); total=doc.getPageCount();
    document.getElementById('splitHint').textContent=f.name+' - '+total+' pages';
    document.getElementById('splitBtn').disabled=false;
  }
  function parseRange(str,max){
    const idx=new Set();
    str.split(',').forEach(part=>{
      part=part.trim(); if(!part)return;
      if(part.includes('-')){const[a,b]=part.split('-').map(n=>parseInt(n,10));for(let i=a;i<=b;i++)if(i>=1&&i<=max)idx.add(i-1);}
      else{const n=parseInt(part,10);if(n>=1&&n<=max)idx.add(n-1);}
    });
    return [...idx].sort((a,b)=>a-b);
  }
  document.getElementById('splitBtn').onclick=async()=>{
    const range=document.getElementById('pageRange').value||('1-'+total);
    const idxs=parseRange(range,total); if(!idxs.length){alert('No valid pages in that range.');return;}
    const out=await PDFLib.PDFDocument.create();
    const pages=await out.copyPages(doc,idxs); pages.forEach(pg=>out.addPage(pg));
    const bytes=await out.save(); download(new Blob([bytes],{type:'application/pdf'}),'extracted.pdf');
  };
}

function buildRotate(p){
  p.innerHTML=`<div class="drop" id="rotDrop">Click or drag a PDF here</div>
  <input type="file" id="rotFile" accept="application/pdf">
  <div class="hint" id="rotHint"></div>
  <div class="row"><div><label>Rotate by</label><select id="rotDeg"><option value="90">90 clockwise</option><option value="180">180</option><option value="270">270 clockwise</option></select></div>
  <button class="btn" id="rotBtn" disabled>Rotate All Pages & Download</button></div>`;
  let doc=null;
  const drop=document.getElementById('rotDrop'),input=document.getElementById('rotFile');
  drop.onclick=()=>input.click(); drop.ondragover=e=>e.preventDefault();
  drop.ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);};
  input.onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};
  async function load(f){
    const bytes=await f.arrayBuffer(); doc=await PDFLib.PDFDocument.load(bytes);
    document.getElementById('rotHint').textContent=f.name+' - '+doc.getPageCount()+' pages';
    document.getElementById('rotBtn').disabled=false;
  }
  document.getElementById('rotBtn').onclick=async()=>{
    const deg=parseInt(document.getElementById('rotDeg').value,10);
    doc.getPages().forEach(pg=>{const cur=pg.getRotation().angle;pg.setRotation(PDFLib.degrees((cur+deg)%360));});
    const bytes=await doc.save(); download(new Blob([bytes],{type:'application/pdf'}),'rotated.pdf');
  };
}

function buildImg2Pdf(p){
  p.innerHTML=`<div class="drop" id="i2pDrop">Click or drag images here (order = page order)</div>
  <input type="file" id="i2pFile" accept="image/*" multiple>
  <div class="filelist" id="i2pList"></div>
  <div class="row"><button class="btn" id="i2pBtn" disabled>Create PDF & Download</button></div>`;
  let files=[];
  const drop=document.getElementById('i2pDrop'),input=document.getElementById('i2pFile');
  drop.onclick=()=>input.click(); drop.ondragover=e=>e.preventDefault();
  drop.ondrop=e=>{e.preventDefault();addFiles([...e.dataTransfer.files]);};
  input.onchange=e=>addFiles([...e.target.files]);
  function addFiles(fs){files=files.concat(fs.filter(f=>f.type.startsWith('image/')));render();}
  function render(){
    const list=document.getElementById('i2pList'); list.innerHTML='';
    files.forEach(f=>list.appendChild(fileRow(f.name)));
    document.getElementById('i2pBtn').disabled=files.length<1;
  }
  document.getElementById('i2pBtn').onclick=async()=>{
    const doc=await PDFLib.PDFDocument.create();
    for(const f of files){
      const bytes=await f.arrayBuffer();
      let img; if(f.type==='image/png')img=await doc.embedPng(bytes); else img=await doc.embedJpg(await toJpegBytes(f));
      const page=doc.addPage([img.width,img.height]); page.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
    }
    const bytes=await doc.save(); download(new Blob([bytes],{type:'application/pdf'}),'images.pdf');
  };
  function toJpegBytes(file){
    return new Promise((res)=>{
      const img=new Image();
      img.onload=()=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);c.toBlob(async b=>res(new Uint8Array(await b.arrayBuffer())),'image/jpeg',0.92);};
      img.src=URL.createObjectURL(file);
    });
  }
}

function buildPdf2Img(p){
  p.innerHTML=`<div class="drop" id="p2iDrop">Click or drag a PDF here</div>
  <input type="file" id="p2iFile" accept="application/pdf">
  <div class="hint" id="p2iHint"></div>
  <div id="p2iResults" class="row"></div>`;
  const drop=document.getElementById('p2iDrop'),input=document.getElementById('p2iFile');
  drop.onclick=()=>input.click(); drop.ondragover=e=>e.preventDefault();
  drop.ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);};
  input.onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};
  async function load(f){
    document.getElementById('p2iHint').textContent='Rendering '+f.name+'...';
    const bytes=await f.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    const results=document.getElementById('p2iResults'); results.innerHTML='';
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i); const viewport=page.getViewport({scale:1.5});
      const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height;
      await page.render({canvasContext:c.getContext('2d'),viewport}).promise;
      const wrap=document.createElement('div'); c.style.maxWidth='140px'; wrap.appendChild(c);
      const btn=document.createElement('button'); btn.className='btn secondary'; btn.style.display='block'; btn.style.marginTop='4px';
      btn.textContent='Download page '+i;
      btn.onclick=()=>c.toBlob(b=>download(b,'page-'+i+'.png'),'image/png');
      wrap.appendChild(btn); results.appendChild(wrap);
    }
    document.getElementById('p2iHint').textContent=f.name+' - '+pdf.numPages+' pages rendered';
  }
}
})();

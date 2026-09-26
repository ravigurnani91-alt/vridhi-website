(function(){
const sec=document.getElementById('videoSection');
sec.innerHTML=`
<div class="note">Browsers can only export edited video as <b>WebM</b> (no built-in, royalty-free MP4 encoder). Trim and compress work fully offline; for MP4 output you'd need a server-side step.</div>
<div class="drop" id="vidDrop">Click or drag a video here (MP4, WebM, MOV)</div>
<input type="file" id="vidFile" accept="video/*">
<div class="hint" id="vidHint"></div>
<div class="card" id="vidToolCard" style="display:none;">
<video id="vidPreview" controls style="width:100%;max-height:360px;background:#000;"></video>
<div class="row"><div><label>Trim start (sec)</label><input type="number" id="trimStart" value="0" min="0" step="0.1"></div>
<div><label>Trim end (sec)</label><input type="number" id="trimEnd" value="0" min="0" step="0.1"></div>
<div><label>Scale</label><select id="vidScale"><option value="1">Original</option><option value="0.75">75%</option><option value="0.5">50%</option><option value="0.25">25%</option></select></div>
<div><label>Quality (bitrate)</label><select id="vidBitrate"><option value="2500000">High</option><option value="1200000" selected>Medium</option><option value="500000">Low</option></select></div></div>
<div class="row"><button class="btn" id="vidProcessBtn">Process & Download WebM</button><span class="hint" id="vidStatus"></span></div>
<div class="hint" id="vidProgress"></div>
</div>`;

let srcFile=null;
const drop=document.getElementById('vidDrop'),input=document.getElementById('vidFile'),preview=document.getElementById('vidPreview');
drop.onclick=()=>input.click(); drop.ondragover=e=>e.preventDefault();
drop.ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);};
input.onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};

function load(f){
  srcFile=f; preview.src=URL.createObjectURL(f);
  document.getElementById('vidToolCard').style.display='block';
  preview.onloadedmetadata=()=>{
    document.getElementById('vidHint').textContent=f.name+' - '+preview.duration.toFixed(1)+'s, '+preview.videoWidth+'x'+preview.videoHeight;
    document.getElementById('trimEnd').value=preview.duration.toFixed(1);
    document.getElementById('trimEnd').max=preview.duration.toFixed(1);
    document.getElementById('trimStart').max=preview.duration.toFixed(1);
  };
}

document.getElementById('vidProcessBtn').onclick=async()=>{
  if(!srcFile)return;
  const start=parseFloat(document.getElementById('trimStart').value)||0;
  const end=parseFloat(document.getElementById('trimEnd').value)||preview.duration;
  const scale=parseFloat(document.getElementById('vidScale').value);
  const bitrate=parseInt(document.getElementById('vidBitrate').value,10);
  if(end<=start){alert('Trim end must be after trim start.');return;}
  const status=document.getElementById('vidStatus'); status.textContent='Processing...';
  const progress=document.getElementById('vidProgress');
  const btn=document.getElementById('vidProcessBtn'); btn.disabled=true;

  const w=Math.round(preview.videoWidth*scale), h=Math.round(preview.videoHeight*scale);
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d');

  const procVideo=document.createElement('video');
  procVideo.src=preview.src; procVideo.muted=false; procVideo.playsInline=true;
  await new Promise(res=>{procVideo.onloadedmetadata=res;});
  procVideo.currentTime=start;
  await new Promise(res=>{procVideo.onseeked=res;});

  const canvasStream=canvas.captureStream(30);
  let audioTrack=null;
  try{
    const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const src=audioCtx.createMediaElementSource(procVideo);
    const dest=audioCtx.createMediaStreamDestination();
    src.connect(dest); src.connect(audioCtx.destination);
    audioTrack=dest.stream.getAudioTracks()[0];
  }catch(e){}
  const mixedStream=new MediaStream([...canvasStream.getVideoTracks(),...(audioTrack?[audioTrack]:[])]);

  let mime='video/webm;codecs=vp9,opus';
  if(!MediaRecorder.isTypeSupported(mime))mime='video/webm;codecs=vp8,opus';
  if(!MediaRecorder.isTypeSupported(mime))mime='video/webm';
  const recorder=new MediaRecorder(mixedStream,{mimeType:mime,videoBitsPerSecond:bitrate});
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};

  const duration=end-start;
  recorder.start();
  procVideo.play();
  const drawFrame=()=>{
    if(procVideo.currentTime>=end||procVideo.paused===false&&procVideo.ended){
      recorder.stop(); return;
    }
    if(procVideo.currentTime-start>=duration){recorder.stop();return;}
    ctx.drawImage(procVideo,0,0,w,h);
    progress.textContent='Encoding: '+Math.min(100,Math.round(((procVideo.currentTime-start)/duration)*100))+'%';
    requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);
  setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},(duration+1)*1000+3000);

  recorder.onstop=()=>{
    procVideo.pause();
    const blob=new Blob(chunks,{type:'video/webm'});
    status.textContent='Done - '+Math.round(blob.size/1024/1024*10)/10+' MB';
    progress.textContent='';
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='vridhi-video.webm'; a.click();
    btn.disabled=false;
  };
};
})();

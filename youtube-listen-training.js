(function(w){
 'use strict';
 const S=w.SwarSadhika;let activeStream=null,recorder=null,chunks=[],startedAt=0,hardStop=null;
 function youtubeId(value){const text=String(value||'').trim();if(!text)throw new Error('YouTube वीडियो का लिंक डालें।');let url;try{url=new URL(text);}catch(_){throw new Error('मान्य YouTube URL डालें।');}const host=url.hostname.toLowerCase().replace(/^www\./,'');let id='';if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||'';else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)){if(url.pathname==='/watch')id=url.searchParams.get('v')||'';else{const parts=url.pathname.split('/').filter(Boolean);if(['embed','shorts','live','v'].includes(parts[0]))id=parts[1]||'';}}if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Error('इस लिंक से वैध 11-अक्षर YouTube वीडियो ID नहीं मिली।');return id;}
 function embed(value,container){const id=youtubeId(value);if(!container)throw new Error('YouTube प्लेयर के लिए स्थान नहीं मिला।');const frame=document.createElement('iframe');frame.title='YouTube गायन संदर्भ';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?playsinline=1&rel=0';container.replaceChildren(frame);return{id,frame};}
 function stopTracks(){if(activeStream){activeStream.getTracks().forEach(t=>{try{t.stop();}catch(_){}});activeStream=null;}}
 async function getCaptureStream(mode='auto'){
  const errors=[];
  if((mode==='system'||mode==='auto')&&navigator.mediaDevices&&typeof navigator.mediaDevices.getDisplayMedia==='function'){
   try{const display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});const audioTracks=display.getAudioTracks();display.getVideoTracks().forEach(t=>t.stop());if(audioTracks.length){const audioOnly=new w.MediaStream(audioTracks);display.getTracks().filter(t=>!audioTracks.includes(t)).forEach(t=>t.stop());return{stream:audioOnly,kind:'display-audio'};}display.getTracks().forEach(t=>t.stop());errors.push('चयनित Screen/Tab ने audio track उपलब्ध नहीं कराया।');}catch(e){errors.push(e.message||'Screen audio capture उपलब्ध नहीं।');if(mode==='system')throw new Error(errors.join(' '));}
  }
  if(mode==='system')throw new Error(errors.join(' ')||'इस ब्राउज़र में system audio capture उपलब्ध नहीं है।');
  if(!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=='function')throw new Error('इस ब्राउज़र में microphone capture उपलब्ध नहीं है। '+errors.join(' '));
  try{return{stream:await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false}),kind:'microphone-loopback'};}catch(e){throw new Error('माइक्रोफ़ोन अनुमति/कैप्चर विफल: '+(e.message||e));}
 }
 function startRecorder(stream,kind,options={}){
  if(typeof w.MediaRecorder!=='function'){stopTracks();throw new Error('इस ब्राउज़र में MediaRecorder उपलब्ध नहीं है।');}
  const mimeTypes=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];const mime=mimeTypes.find(x=>w.MediaRecorder.isTypeSupported&&w.MediaRecorder.isTypeSupported(x));
  const instance=new w.MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder=instance;chunks=[];startedAt=Date.now();
  instance.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  const done=new Promise((resolve,reject)=>{instance.onerror=e=>{clearTimeout(hardStop);stopTracks();if(recorder===instance)recorder=null;reject(e.error||new Error('ऑडियो कैप्चर त्रुटि।'));};instance.onstop=()=>{clearTimeout(hardStop);const blob=new Blob(chunks,{type:instance.mimeType||mime||'audio/webm'});stopTracks();if(recorder===instance)recorder=null;chunks=[];resolve({blob,kind,durationSec:(Date.now()-startedAt)/1000});};});
  instance.start(1000);hardStop=setTimeout(()=>{if(recorder===instance&&instance.state==='recording')instance.stop();},15*60*1000);return done;
 }
 async function start(options={}){
  if(recorder&&recorder.state==='recording')throw new Error('ऑडियो कैप्चर पहले से चल रहा है।');
  const result=await getCaptureStream(options.mode||'auto');activeStream=result.stream;const done=startRecorder(result.stream,result.kind,options);return{kind:result.kind,done};
 }
 async function stop(){if(!recorder)return true;if(recorder.state==='recording')recorder.stop();return true;}
 function cancel(){clearTimeout(hardStop);if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch(_){}}stopTracks();recorder=null;chunks=[];}
 S.YouTubeListenTraining={youtubeId,embed,start,stop,cancel,isRecording:()=>!!recorder&&recorder.state==='recording'};
})(window);

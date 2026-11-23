(function (w) {
  'use strict';
  const S=w.SwarSadhika;
  function rms(data){let s=0;for(let i=0;i<data.length;i++)s+=data[i]*data[i];return Math.sqrt(s/Math.max(1,data.length));}
  function detectPitch(frame,sampleRate){
    let mean=0;for(let i=0;i<frame.length;i++)mean+=frame[i];mean/=frame.length;
    const x=new Float32Array(frame.length);let energy=0;for(let i=0;i<frame.length;i++){x[i]=frame[i]-mean;energy+=x[i]*x[i];}if(energy<1e-6)return 0;
    const minLag=Math.max(2,Math.floor(sampleRate/1000)),maxLag=Math.min(Math.floor(sampleRate/65),Math.floor(x.length/2));let best=0,bestCorr=0;
    for(let lag=minLag;lag<=maxLag;lag++){let corr=0;for(let i=0;i<x.length-lag;i++)corr+=x[i]*x[i+lag];corr/=energy;if(corr>bestCorr){bestCorr=corr;best=lag;}}
    if(bestCorr<.34||!best)return 0;return sampleRate/best;
  }
  function estimateTempo(samples,sr){
    const step=Math.max(256,Math.floor(sr*.10));const energies=[];for(let i=0;i<samples.length;i+=step)energies.push(rms(samples.subarray(i,Math.min(samples.length,i+step))));
    const flux=energies.map((e,i)=>Math.max(0,e-(energies[i-1]||0)));let best=0,bestLag=0;
    for(let lag=Math.max(2,Math.round(60/(180*.1)));lag<=Math.min(30,Math.round(60/(45*.1)));lag++){let c=0;for(let i=lag;i<flux.length;i++)c+=flux[i]*flux[i-lag];if(c>best){best=c;bestLag=lag;}}
    if(!bestLag)return 0;let bpm=60/(bestLag*.1);while(bpm<65)bpm*=2;while(bpm>170)bpm/=2;return Math.round(bpm);
  }
  function midiName(f){const m=Math.round(69+12*Math.log2(f/440));const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];return names[(m%12+12)%12]+(Math.floor(m/12)-1);}
  function analyzeBuffer(buffer){
    const sr=buffer.sampleRate;const channels=[];for(let c=0;c<buffer.numberOfChannels;c++)channels.push(buffer.getChannelData(c));const n=channels[0].length;const mono=new Float32Array(n);let peak=0;
    for(let i=0;i<n;i++){let x=0;for(const ch of channels)x+=ch[i]/channels.length;mono[i]=x;peak=Math.max(peak,Math.abs(x));}
    const level=rms(mono);const frameSize=2048,pitches=[],hist={};
    // Bound CPU use for long recordings: inspect at most 120 evenly spaced windows,
    // decimating each frame by 2 for the pitch estimator.
    const windowCount=Math.min(120,Math.max(1,Math.floor(n/(sr*.25))));
    for(let k=0;k<windowCount;k++){const start=Math.min(Math.max(0,n-frameSize),Math.floor((windowCount===1?0:k*(n-frameSize)/(windowCount-1))));const frame=mono.subarray(start,start+frameSize);if(frame.length<frameSize||rms(frame)<.018)continue;const reduced=new Float32Array(frameSize/2);for(let j=0;j<reduced.length;j++)reduced[j]=frame[j*2];const pitch=detectPitch(reduced,sr/2);if(pitch>0){pitches.push(pitch);const name=midiName(pitch);hist[name]=(hist[name]||0)+1;}}
    pitches.sort((a,b)=>a-b);const avgPitch=pitches.length?pitches[Math.floor(pitches.length/2)]:0;const dominant=Object.entries(hist).sort((a,b)=>b[1]-a[1])[0];
    return {duration:buffer.duration,sampleRate:sr,channels:buffer.numberOfChannels,rms:level,peak,averagePitch:avgPitch,dominantNote:dominant?dominant[0]:'',tempo:estimateTempo(mono,sr),pitchSamples:pitches.length,noteHistogram:hist,analyzedAt:new Date().toISOString()};
  }
  function drawWave(canvas,buffer){if(!canvas||!buffer)return;const c=canvas.getContext('2d');const w0=canvas.width,h=canvas.height;c.clearRect(0,0,w0,h);c.strokeStyle='#866c95';c.lineWidth=1.2;c.beginPath();const data=buffer.getChannelData(0);const step=Math.ceil(data.length/w0);for(let x=0;x<w0;x++){let min=1,max=-1;for(let i=0;i<step;i++){const v=data[x*step+i]||0;min=Math.min(min,v);max=Math.max(max,v);}c.moveTo(x,(1+min)*h/2);c.lineTo(x,(1+max)*h/2);}c.stroke();}
  async function decodeFile(file){const C=w.AudioContext||w.webkitAudioContext;if(!C)throw new Error('Web Audio उपलब्ध नहीं है।');const c=new C();try{const ab=await S.readFileArrayBuffer(file);const buffer=await c.decodeAudioData(ab.slice(0));return {buffer,context:c};}catch(e){await c.close().catch(()=>{});throw new Error('इस मीडिया की ध्वनि ब्राउज़र में decode नहीं हो सकी: '+e.message);}}
  S.Media={rms,detectPitch,estimateTempo,midiName,analyzeBuffer,drawWave,decodeFile};
})(window);

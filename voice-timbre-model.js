(function (w) {
  'use strict';
  const S = w.SwarSadhika;
  const VERSION = 'one-shot-voice-timbre-1.0.0';
  const BAND_COUNT = 24;
  const HIDDEN = 16;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const median = values => { const a = values.filter(Number.isFinite).slice().sort((x,y)=>x-y); if(!a.length)return 0; const m=a.length>>1; return a.length%2?a[m]:(a[m-1]+a[m])/2; };
  const sigmoid = x => 1/(1+Math.exp(-clamp(x,-18,18)));
  function rng(seed) { let x = seed >>> 0 || 0x9e3779b9; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
  function fft(re, im) {
    const n = re.length;
    for (let i=1,j=0;i<n;i++) { let bit=n>>1; for(;j&bit;bit>>=1)j^=bit; j^=bit; if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];} }
    for(let len=2;len<=n;len<<=1){const angle=-2*Math.PI/len,wr0=Math.cos(angle),wi0=Math.sin(angle);for(let i=0;i<n;i+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const u=i+j,v=u+len/2,tr=re[v]*wr-im[v]*wi,ti=re[v]*wi+im[v]*wr;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;const nwr=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=nwr;}}}
  }
  function downmixAndResample(buffer, targetRate=12000) {
    if(!buffer||!buffer.numberOfChannels||!buffer.length||!buffer.sampleRate)throw new Error('मान्य AudioBuffer आवश्यक है।');
    const rate=Math.max(1,Math.floor(buffer.sampleRate/targetRate));const sr=buffer.sampleRate/rate;const out=new Float32Array(Math.ceil(buffer.length/rate));
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
    for(let j=0;j<out.length;j++){const start=j*rate,end=Math.min(buffer.length,start+rate);let sum=0,count=0;for(let i=start;i<end;i++)for(const ch of channels){sum+=ch[i]||0;count++;}out[j]=count?sum/count:0;}
    return {samples:out,sampleRate:sr};
  }
  function bandEdges(sr) {
    const nyquist=sr/2, min=90, max=Math.min(7200,nyquist*.92), edges=[];
    for(let i=0;i<=BAND_COUNT;i++)edges.push(min*Math.pow(max/min,i/BAND_COUNT));
    return edges;
  }
  function spectrumBands(frame, sr) {
    const n=512,re=new Float64Array(n),im=new Float64Array(n);let mean=0;
    for(let i=0;i<n;i++)mean+=(frame[i]||0);mean/=n;
    for(let i=0;i<n;i++){const hann=.5-.5*Math.cos(2*Math.PI*i/(n-1));re[i]=((frame[i]||0)-mean)*hann;}
    fft(re,im);const edges=bandEdges(sr),bands=[],magnitudes=[];let max=1e-9,centroidNum=0,centroidDen=0,geometricLog=0;
    for(let i=1;i<n/2;i++){const mag=Math.hypot(re[i],im[i]);const hz=i*sr/n;magnitudes.push(mag);centroidNum+=hz*mag;centroidDen+=mag;geometricLog+=Math.log(Math.max(1e-12,mag));}
    for(let b=0;b<BAND_COUNT;b++){let sum=0,count=0;for(let i=1;i<n/2;i++){const hz=i*sr/n;if(hz>=edges[b]&&hz<edges[b+1]){sum+=Math.hypot(re[i],im[i]);count++;}}const value=count?sum/count:1e-9;bands.push(value);max=Math.max(max,value);}
    let zeroCrossings=0;for(let i=1;i<n;i++)if(((frame[i]||0)>=0)!==((frame[i-1]||0)>=0))zeroCrossings++;
    const arithmetic=magnitudes.reduce((a,b)=>a+b,0)/Math.max(1,magnitudes.length),flatness=arithmetic>0?Math.exp(geometricLog/Math.max(1,magnitudes.length))/arithmetic:0;
    const logBands=bands.map(x=>clamp(Math.log(Math.max(1e-9,x)/max),-4,0));
    return {bands:logBands.map(x=>clamp((x+2)*.5,-1,1)),centroid:centroidDen?centroidNum/centroidDen:0,zeroCrossing:zeroCrossings/(n-1),spectralFlatness:clamp(flatness,0,1)};
  }
  function analyzeBuffer(buffer, options={}) {
    const converted=downmixAndResample(buffer),samples=converted.samples,sr=converted.sampleRate;
    if(samples.length<sr*2)throw new Error('एक-बार प्रशिक्षण के लिए कम-से-कम 2 सेकंड का स्पष्ट नमूना चाहिए; 15–60 सेकंड बेहतर है।');
    const frameSize=1024,hop=512,available=Math.max(0,Math.floor((samples.length-frameSize)/hop)+1),count=Math.min(96,available);
    const rows=[],pitchValues=[],centroids=[],zcrValues=[],flatnessValues=[],levels=[];let peak=1e-8;
    for(let k=0;k<count;k++){
      const frameIndex=count===1?0:Math.round(k*(available-1)/(count-1)),start=frameIndex*hop,frame=samples.subarray(start,start+frameSize);
      let level=0;for(let i=0;i<frame.length;i++)level+=frame[i]*frame[i];level=Math.sqrt(level/frame.length);peak=Math.max(peak,level);levels.push(level);
      const pitch=S.SingingModel&&S.SingingModel.yinPitch?S.SingingModel.yinPitch(frame,sr):0;
      const spec=spectrumBands(frame,sr);if(pitch>0)pitchValues.push(pitch);centroids.push(spec.centroid);zcrValues.push(spec.zeroCrossing);flatnessValues.push(spec.spectralFlatness);
      rows.push({position:count<=1?0:k/(count-1),pitchHz:pitch,level,spectrum:spec.bands,centroid:spec.centroid,zcr:spec.zeroCrossing,time:start/sr});
    }
    const referenceMedianHz=median(pitchValues);if(rows.filter(r=>r.pitchHz>0).length<3||referenceMedianHz<=0)throw new Error('नमूने में स्थिर गायन-पिच नहीं मिली। 2 सेकंड से अधिक का साफ़, स्पष्ट एकल स्वर/गायन रिकॉर्ड करें।');
    const maxCentroid=Math.max(1,median(centroids));
    return {version:VERSION,sampleRate:buffer.sampleRate,analysisRate:sr,durationSec:Number(buffer.duration||samples.length/sr),frameCount:rows.length,voicedRatio:rows.filter(r=>r.pitchHz>0).length/rows.length,referenceMedianHz,pitchLowHz:Math.min(...pitchValues),pitchHighHz:Math.max(...pitchValues),spectralCentroidHz:maxCentroid,breathinessProxy:clamp(median(flatnessValues),0,1),harmonicityProxy:clamp(1-median(flatnessValues),0,1),zeroCrossingRate:median(zcrValues),averageRms:median(levels),peakRms:peak,frames:rows,createdAt:new Date().toISOString()};
  }
  function forward(net,input) {
    const hidden=net.hiddenWeights.map((row,i)=>Math.tanh(row.reduce((s,v,j)=>s+v*input[j],net.hiddenBias[i])));
    const output=net.outputWeights.map((row,i)=>Math.tanh(row.reduce((s,v,j)=>s+v*hidden[j],net.outputBias[i])));
    return {hidden,output};
  }
  function trainNetwork(analysis,options={}) {
    const rows=analysis.frames.filter(r=>r.level>.004);if(rows.length<3)throw new Error('Neural timbre model हेतु पर्याप्त सक्रिय ध्वनि-फ्रेम नहीं हैं।');
    const random=rng(Math.round(analysis.referenceMedianHz*997)+rows.length*7919);const net={architecture:'4-16-24-mlp-regression',hiddenWeights:Array.from({length:HIDDEN},()=>Array.from({length:4},()=>((random()-.5)*.22))),hiddenBias:Array(HIDDEN).fill(0),outputWeights:Array.from({length:BAND_COUNT},()=>Array.from({length:HIDDEN},()=>((random()-.5)*.18))),outputBias:Array(BAND_COUNT).fill(0)};
    const training=rows.map(r=>({input:[r.position,clamp(r.pitchHz/analysis.referenceMedianHz,.55,1.8)-1,clamp(r.level/analysis.peakRms,0,1),r.pitchHz>0?1:0],target:r.spectrum}));
    const epochs=Math.max(80,Math.min(420,Math.round(options.epochs||220))),lr=Math.max(.0005,Math.min(.035,Number(options.learningRate)||.006));let loss=0;
    for(let epoch=0;epoch<epochs;epoch++){
      let total=0;const rate=lr*(1-.25*epoch/epochs);
      for(let ri=0;ri<training.length;ri++){
        const row=training[ri],pred=forward(net,row.input),hiddenDelta=Array(HIDDEN).fill(0),outDelta=[];
        for(let o=0;o<BAND_COUNT;o++){const err=pred.output[o]-row.target[o];total+=err*err;outDelta[o]=err*(1-pred.output[o]*pred.output[o]);}
        for(let h=0;h<HIDDEN;h++){let d=0;for(let o=0;o<BAND_COUNT;o++)d+=outDelta[o]*net.outputWeights[o][h];hiddenDelta[h]=d*(1-pred.hidden[h]*pred.hidden[h]);}
        for(let o=0;o<BAND_COUNT;o++){for(let h=0;h<HIDDEN;h++)net.outputWeights[o][h]-=rate*outDelta[o]*pred.hidden[h];net.outputBias[o]-=rate*outDelta[o];}
        for(let h=0;h<HIDDEN;h++){for(let i=0;i<4;i++)net.hiddenWeights[h][i]-=rate*hiddenDelta[h]*row.input[i];net.hiddenBias[h]-=rate*hiddenDelta[h];}
      }
      loss=total/(training.length*BAND_COUNT);
      if(typeof options.onProgress==='function'&&(epoch%25===0||epoch===epochs-1))options.onProgress({epoch:epoch+1,epochs,loss});
    }
    net.training={epochs,rows:training.length,meanSquaredError:Number(loss.toFixed(6)),method:'local-backpropagation-one-shot-spectral-regression',trainedAt:new Date().toISOString()};return net;
  }
  function trainBuffer(buffer,options={}) {
    const analysis=analyzeBuffer(buffer,options),network=trainNetwork(analysis,options);
    const meanBands=Array.from({length:BAND_COUNT},(_,i)=>median(analysis.frames.filter(r=>r.pitchHz>0).map(r=>r.spectrum[i])));
    const profile={id:options.id||`voice-timbre-${Date.now()}`,profileKind:'voice-timbre-model',modelVersion:VERSION,modelType:'one-shot-local-neural-spectral-envelope',name:String(options.name||'एक-बार सीखा गया स्वर').slice(0,80),sampleCount:1,sampleDurationSec:Number(analysis.durationSec.toFixed(2)),referenceMedianHz:analysis.referenceMedianHz,pitchLowHz:analysis.pitchLowHz,pitchHighHz:analysis.pitchHighHz,voicedRatio:Number(analysis.voicedRatio.toFixed(3)),spectralCentroidHz:Math.round(analysis.spectralCentroidHz),breathinessProxy:Number(analysis.breathinessProxy.toFixed(4)),harmonicityProxy:Number(analysis.harmonicityProxy.toFixed(4)),zeroCrossingRate:Number(analysis.zeroCrossingRate.toFixed(4)),meanBands,neuralNetwork:network,training:{epochs:network.training.epochs,rows:network.training.rows,loss:network.training.meanSquaredError},source:{kind:options.sourceKind||'local-audio-file',name:String(options.sourceName||'local audio').slice(0,120)},createdAt:new Date().toISOString(),limitations:'एकल नमूने से spectral timbre approximation; पूर्ण voice cloning या phoneme-complete neural TTS नहीं।'};
    if(S.VocalTractModel){profile.vocalTract=S.VocalTractModel.learnFromProfile(profile);profile.synthesisEngine={name:'Adaptive Sanskrit Phoneme/Formant/Glottal Engine',version:'2.0.0',trainedLocally:true,createdAt:new Date().toISOString()};}
    if(!validateProfile(profile))throw new Error('प्रशिक्षित voice timbre मॉडल validation में असफल हुआ।');return profile;
  }
  function validateProfile(p) {
    if(!p||p.profileKind!=='voice-timbre-model'||p.modelVersion!==VERSION||!Number.isFinite(p.referenceMedianHz)||p.referenceMedianHz<=0||!Array.isArray(p.meanBands)||p.meanBands.length!==BAND_COUNT||!p.neuralNetwork)return false;
    const n=p.neuralNetwork;const bounded=a=>a.every(v=>Number.isFinite(v)&&Math.abs(v)<=12);return Number.isFinite(p.sampleDurationSec)&&p.sampleDurationSec>=2&&p.sampleDurationSec<=900&&p.meanBands.every(v=>Number.isFinite(v)&&v>=-1&&v<=1)&&n.architecture==='4-16-24-mlp-regression'&&Array.isArray(n.hiddenWeights)&&n.hiddenWeights.length===HIDDEN&&n.hiddenWeights.every(r=>Array.isArray(r)&&r.length===4&&bounded(r))&&Array.isArray(n.hiddenBias)&&n.hiddenBias.length===HIDDEN&&bounded(n.hiddenBias)&&Array.isArray(n.outputWeights)&&n.outputWeights.length===BAND_COUNT&&n.outputWeights.every(r=>Array.isArray(r)&&r.length===HIDDEN&&bounded(r))&&Array.isArray(n.outputBias)&&n.outputBias.length===BAND_COUNT&&bounded(n.outputBias)&&p.training&&Number.isFinite(p.training.loss)&&p.training.loss>=0&&p.training.loss<=10&&Number.isInteger(p.training.epochs)&&p.training.epochs>=80&&p.training.epochs<=420;
  }
  function predictEnvelope(profile,position,pitchHz,dynamics=0.72) {
    if(!validateProfile(profile))throw new Error('स्वर-विशेषता मॉडल मान्य नहीं है।');
    const relative=clamp(pitchHz/profile.referenceMedianHz,.55,1.8)-1,input=[clamp(position,0,1),relative,clamp(dynamics,0,1),1],pred=forward(profile.neuralNetwork,input).output;
    return pred.map((v,i)=>clamp(profile.meanBands[i]*.62+v*.38,-1,1));
  }
  S.VoiceTimbreModel={version:VERSION,bandCount:BAND_COUNT,analyzeBuffer,trainBuffer,validateProfile,predictEnvelope};
})(window);

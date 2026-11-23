(function (w) {
  'use strict';
  const S=w.SwarSadhika, SR=24000;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  let activeAudio=null, activeUrl=null;
  function bandGain(bands,hz) {
    const min=90,max=7200;
    const x=clamp(Math.log(Math.max(min,hz)/min)/Math.log(max/min)*(bands.length-1),0,bands.length-1);
    const i=Math.floor(x),j=Math.min(bands.length-1,i+1),t=x-i;
    const value=bands[i]*(1-t)+bands[j]*t;
    return Math.exp(clamp((value+1)*1.1-1.75,-2.2,.5));
  }
  function wavBlob(samples,sampleRate) {
    const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);let p=0;
    const write=s=>{for(let i=0;i<s.length;i++)view.setUint8(p++,s.charCodeAt(i));};
    write('RIFF');view.setUint32(p,36+samples.length*2,true);p+=4;write('WAVE');write('fmt ');view.setUint32(p,16,true);p+=4;
    view.setUint16(p,1,true);p+=2;view.setUint16(p,1,true);p+=2;view.setUint32(p,sampleRate,true);p+=4;view.setUint32(p,sampleRate*2,true);p+=4;view.setUint16(p,2,true);p+=2;view.setUint16(p,16,true);p+=2;
    write('data');view.setUint32(p,samples.length*2,true);p+=4;
    for(let i=0;i<samples.length;i++){const x=clamp(samples[i],-1,1);view.setInt16(p,x<0?x*32768:x*32767,true);p+=2;}
    return new Blob([buffer],{type:'audio/wav'});
  }
  function makeHarmonicBank(note,profile,phoneme,position,options) {
    const midi=Number(note.midi);if(!Number.isFinite(midi))throw new Error('स्वर-क्रम में अमान्य MIDI pitch है।');
    const baseHz=S.Singing.freq(midi);
    const tract=S.VocalTractModel.formantsFor(phoneme,profile,0);
    const bands=S.VoiceTimbreModel.predictEnvelope(profile,position,baseHz,clamp(note.velocity||.72,.2,1.1));
    const speaker=tract.speaker;
    const maxHarmonics=Math.min(54,Math.floor(SR*.46/baseHz));
    const harmonicGains=new Float32Array(maxHarmonics+1);
    let square=0;
    for(let h=1;h<=maxHarmonics;h++){
      const hz=baseHz*h;
      const tilt=S.GlottalSource.harmonicTilt(h,speaker.spectralTiltDbPerOctave);
      const envelope=bandGain(bands,hz);
      let resonance=S.VocalTractModel.resonanceGain(hz,tract.formants);
      // Nasal anti-formants add the characteristic hollow quality of anusvara/nasal consonants.
      if(tract.articulation.nasal){
        const notch1=1-.42*Math.exp(-.5*Math.pow((hz-650)/170,2));
        const notch2=1-.28*Math.exp(-.5*Math.pow((hz-1850)/260,2));
        resonance*=notch1*notch2;
      }
      const source=tilt*(1/Math.pow(h,.32));
      harmonicGains[h]=source*envelope*resonance;
      square+=harmonicGains[h]*harmonicGains[h]*.5;
    }
    const normalization=square>1e-10?.155/Math.sqrt(square):.1;
    for(let h=1;h<=maxHarmonics;h++)harmonicGains[h]*=normalization;
    return {baseHz,harmonicGains,maxHarmonics,tract,speaker,bands};
  }
  function renderPcm(notes,voiceProfile,options={}) {
    if(!S.VoiceTimbreModel||!S.VoiceTimbreModel.validateProfile(voiceProfile))throw new Error('पहले एक-बार स्वर-प्रशिक्षण करके स्थानीय voice profile सक्रिय करें।');
    if(!S.VocalTractModel||!S.GlottalSource||!S.SanskritPhonemeEngine)throw new Error('नए phoneme, vocal-tract और glottal source मॉड्यूल लोड नहीं हुए।');
    if(!Array.isArray(notes)||!notes.length)throw new Error('गायन के स्वरांश उपलब्ध नहीं हैं।');
    if(notes.length>700)throw new Error('एक WAV में अधिकतम 700 अक्षरांश रखें।');
    const gap=clamp(options.gap??.045,0,.25);
    const noteDurations=notes.map(n=>clamp(n.duration||.45,.12,3));
    const duration=noteDurations.reduce((sum,x)=>sum+x+gap,0)+.22;
    if(duration>480)throw new Error('एक WAV की अधिकतम अवधि 8 मिनट है।');
    const total=Math.ceil(duration*SR),output=new Float32Array(total);
    const random=S.GlottalSource.random(Math.round(voiceProfile.referenceMedianHz*1009)+notes.length*15401);
    let cursor=Math.floor(.07*SR),noiseState=0,phase=0,previousF0=0;
    const style=options.styleProfile&&S.SingingModel.validateProfile(options.styleProfile)?options.styleProfile:null;
    notes.forEach((note,index)=>{
      const dur=noteDurations[index],count=Math.floor(dur*SR),midi=Number(note.midi);
      const phoneme=S.SanskritPhonemeEngine.analyzeAkshara(note.syllable||'अ');
      const bank=makeHarmonicBank(note,voiceProfile,phoneme,index/Math.max(1,notes.length-1),options);
      const {harmonicGains,maxHarmonics,baseHz,tract,speaker}=bank;
      const isDiphthong=phoneme.vowel==='ai'||phoneme.vowel==='au';
      const initialVowel=(phoneme.vowel==='ai'||phoneme.vowel==='au')?'a':'a';
      const terminalVowel=phoneme.vowel==='ai'?'i':phoneme.vowel==='au'?'u':phoneme.vowel;
      const startBank=makeHarmonicBank(note,voiceProfile,{...phoneme,vowel:initialVowel},index/Math.max(1,notes.length-1),options);
      const endBank=isDiphthong?makeHarmonicBank(note,voiceProfile,{...phoneme,vowel:terminalVowel},index/Math.max(1,notes.length-1),options):bank;
      const vibratoRate=clamp(note.vibratoRate|| (style&&style.vibratoRateHz)||0,0,8);
      const vibratoDepth=clamp(note.vibratoDepthCents|| (style&&style.vibratoDepthSemitones*100)||0,0,45);
      const breath=clamp(speaker.breathiness*.42,.004,.13);
      const manner=phoneme.manner,onsetSec=tract.articulation.onsetMs/1000;
      const isFricative=manner==='fricative',isPlosive=manner==='plosive',isAspirated=phoneme.aspirated;
      const velocity=clamp(note.velocity||.72,.25,1.12);
      const jitter=clamp(speaker.jitterPercent,.04,.85);
      const shimmer=clamp(speaker.shimmerPercent,.2,2.5);
      let cycleRandom=1,cycleMark=-1,noisePrev=0,glottalPrev=0;
      for(let i=0;i<count;i++){
        const t=i/SR,progress=i/Math.max(1,count-1);
        const attack=Math.min(1,t/.045),release=Math.min(1,(dur-t)/.13);
        const swell=.88+.12*Math.sin(Math.PI*clamp(progress,0,1));
        const envelope=Math.max(0,Math.min(attack,release))*swell;
        const vibratoFade=clamp((progress-.18)/.32,0,1);
        const formantTransition=isDiphthong?clamp((progress-.10)/.78,0,1):clamp((progress-.025)/.20,0,1);
        const learnedPitch=style?S.SingingModel.predictStyle(style.neuralStyleNetwork,clamp((index+progress)/Math.max(1,notes.length),0,1)).pitchSemitones:0;
        const vibrato=Math.sin(2*Math.PI*vibratoRate*t)*vibratoDepth/100;
        const pitchGlide=(Number(note.pitchGlideSemitones)||0)*(1-progress);
        const f0=baseHz*Math.pow(2,(learnedPitch*.10+pitchGlide+vibrato*vibratoFade)/12);
        const cycle=Math.floor((t*f0));if(cycle!==cycleMark){cycleMark=cycle;cycleRandom=S.GlottalSource.cycleVariation(random,jitter);}
        const actualF0=clamp(f0*cycleRandom,65,1050);phase+=actualF0/SR;if(phase>=1)phase-=Math.floor(phase);
        // Rosenberg-like glottal flow derivative supplies a less sterile excitation than a sine-only oscillator.
        const oq=clamp(.59+(speaker.harmonicity-.7)*.11,.48,.72);
        const glottal=S.GlottalSource.derivative(phase,actualF0/SR,oq,.19);
        const glottalDelta=glottal-glottalPrev;glottalPrev=glottal;
        let voiced=0;for(let h=1;h<=maxHarmonics;h++){const gain=startBank.harmonicGains[h]*(1-formantTransition)+endBank.harmonicGains[h]*formantTransition;voiced+=Math.sin(2*Math.PI*phase*h)*gain;}
        // Small glottal pulse derivative blends source asymmetry into the harmonic bank.
        voiced=voiced*.88+glottalDelta*.0009;
        const n=S.GlottalSource.pinkishNoise(random,noisePrev);noisePrev=n.previous;noiseState=n.value;
        const onset=clamp(1-t/Math.max(.018,onsetSec),0,1);
        const plosiveClosure=isPlosive&&t<.026?.24:1;
        const aspirationLevel=(isAspirated? .105 : isFricative ? .125 : phoneme.visarga&&progress>.76?.06 : .018)*onset;
        const breathNoise=noiseState*(breath+aspirationLevel);
        const burst=isPlosive&&t<.014?noiseState*.085*(1-t/.014):0;
        const voicedGate=phoneme.hasVowel?plosiveClosure:clamp(1-t/.12,0,1);
        const shimmerGain=1+Math.sin(2*Math.PI*4.7*t+index)*shimmer*.0035;
        let sample=(voiced*voicedGate+breathNoise+burst)*envelope*velocity*shimmerGain;
        if(phoneme.visarga&&progress>.72)sample+=noiseState*.025*envelope*(progress-.72)/.28;
        output[cursor+i]=sample;
      }
      cursor+=count+Math.floor(gap*SR);
      previousF0=baseHz;
    });
    let peak=0;for(let i=0;i<output.length;i++)peak=Math.max(peak,Math.abs(output[i]));
    if(peak>0){const scale=peak>.94?.94/peak:Math.min(2.6,.72/peak);for(let i=0;i<output.length;i++)output[i]*=scale;}
    return {samples:output,sampleRate:SR,duration:output.length/SR,diagnostics:{engine:'adaptive-phoneme-formant-glottal-vocoder',sampleRate:SR,notes:notes.length,peak,sourceProfileVersion:voiceProfile.modelVersion,tractVersion:tractVersion(),formantTransitions:notes.filter(n=>['ऐ','औ','ै','ौ'].some(v=>String(n.syllable||'').includes(v))).length}};
  }
  function tractVersion(){return S.VocalTractModel&&S.VocalTractModel.version||'unavailable';}
  function renderWav(notes,profile,options={}){return wavBlob(renderPcm(notes,profile,options).samples,SR);}
  function stop(){if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0;}catch(_){}activeAudio=null;}return true;}
  function release(){stop();if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}}
  async function play(notes,profile,options={}){
    release();const blob=renderWav(notes,profile,options),url=URL.createObjectURL(blob),audio=new Audio();activeUrl=url;activeAudio=audio;audio.preload='auto';
    try{await new Promise((resolve,reject)=>{audio.addEventListener('canplay',resolve,{once:true});audio.addEventListener('error',()=>reject(new Error('स्थानीय गायन पूर्वावलोकन चल नहीं सका।')),{once:true});audio.src=url;audio.load();});await audio.play();return{audio,url,blob};}
    catch(error){release();throw error;}
  }
  S.NeuralVocoder={version:'adaptive-phoneme-formant-glottal-vocoder-2.0.0',sampleRate:SR,renderPcm,renderWav,play,stop,release};
})(window);

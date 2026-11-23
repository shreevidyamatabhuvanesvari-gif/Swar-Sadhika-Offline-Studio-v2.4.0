(function (w) {
  'use strict';
  const S=w.SwarSadhika;
  const intervals={bilawal:[0,2,4,5,7,9,11,12],kalyan:[0,2,4,6,7,9,11,12],bhairav:[0,1,4,5,7,8,11,12],pentatonic:[0,2,4,7,9,12]};
  const swaras={bilawal:['सा','रे','ग','म','प','ध','नि','सां'],kalyan:['सा','रे','ग','म॑','प','ध','नि','सां'],bhairav:['सा','रे॒','ग','म','प','ध॒','नि','सां'],pentatonic:['सा','रे','ग','प','ध','सां']};
  const noteNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const noteMidi={C4:60,D4:62,E4:64,F4:65,G4:67,A4:69};
  let ctx=null,playing=[],tanpuraNodes=[],sequence=[],lastOptions={};
  function audioContext(){const C=w.AudioContext||w.webkitAudioContext;if(!C)throw new Error('इस ब्राउज़र में Web Audio उपलब्ध नहीं है।');if(!ctx)ctx=new C();return ctx;}
  function freq(midi){return 440*Math.pow(2,(midi-69)/12);}
  function scaleNotes(base,mode,pattern){const start=noteMidi[base]||60;const ints=intervals[mode]||intervals.bilawal;let asc=ints.map((n,i)=>({midi:start+n,label:(swaras[mode]||swaras.bilawal)[i]||noteNames[(start+n)%12]}));let desc=asc.slice(0,-1).reverse();if(pattern==='descending')return asc.slice().reverse();if(pattern==='both')return asc.concat(desc);if(pattern==='alap')return asc.concat(desc).map((n,i)=>({...n,duration:i%2?.9:1.3}));return asc;}
  function scheduleTone(context,dest,midi,start,duration,amp=.19,shape='soft',note={}){
    const f=freq(midi); const g=context.createGain();const velocity=Math.max(.1,Math.min(1.2,Number(note.velocity)||1));const peak=amp*velocity;g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(peak,start+.025);g.gain.setValueAtTime(peak*.78,start+Math.max(.04,duration*.72));g.gain.exponentialRampToValueAtTime(.0001,start+duration+.10);g.connect(dest);
    const partials=shape==='soft'?[1,.34,.14,.06]:[1,.48,.22,.10,.04];
    partials.forEach((level,i)=>{const o=context.createOscillator();o.type=i===0?'sine':'triangle';o.frequency.setValueAtTime(f*(i+1),start);const p=context.createGain();p.gain.value=level;o.connect(p);p.connect(g);
      const vibratoRate=Math.max(0,Math.min(9,Number(note.vibratoRate)||0));const depth=Math.max(0,Math.min(40,Number(note.vibratoDepthCents)||0));
      if(vibratoRate>=1&&depth>0&&o.detune){const lfo=context.createOscillator(),mod=context.createGain();lfo.type='sine';lfo.frequency.setValueAtTime(vibratoRate,start);mod.gain.setValueAtTime(depth,start);lfo.connect(mod);mod.connect(o.detune);lfo.start(start);lfo.stop(start+duration+.12);playing.push(lfo);}
      o.start(start);o.stop(start+duration+.12);playing.push(o);});
    return g;
  }
  function playNotes(notes,options={}){
    const c=audioContext(); if(c.state==='suspended')c.resume(); stop(); const now=c.currentTime+.06; let t=now;
    const beat=60/(options.bpm||72); const defaultDuration=options.duration||beat*.8;
    notes.forEach((n,i)=>{const d=(n.duration||defaultDuration);scheduleTone(c,c.destination,n.midi,t,d,options.volume||.17,options.timbre||'soft',n);if(options.onNote)options.onNote(n,i,notes.length);t+=d+(options.gap??.045);});
    const timer=setTimeout(()=>{playing=[];if(options.onEnd)options.onEnd();},Math.max(250,(t-now)*1000+350));playing.push({timer});return (t-now);
  }
  function stop(){playing.forEach(x=>{if(x&&x.timer)clearTimeout(x.timer);else try{x.stop();}catch(_){}});playing=[];}
  function startTanpura(base='C4'){
    const c=audioContext();if(c.state==='suspended')c.resume();stopTanpura();const root=noteMidi[base]||60;const now=c.currentTime;
    [root-12,root,root+7,root+12].forEach((m,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=freq(m);g.gain.value=[.04,.022,.018,.013][i];o.connect(g);g.connect(c.destination);o.start(now);tanpuraNodes.push(o,g);});return true;
  }
  function stopTanpura(){tanpuraNodes.forEach(n=>{try{n.stop();}catch(_){}try{n.disconnect();}catch(_){}});tanpuraNodes=[];}
  function textToMelody(text,options={}){
    const analyzed=S.Sanskrit.analyze(text);const syl=analyzed.syllables;if(!syl.length)return [];
    const scale=scaleNotes(options.base||'C4',options.mode||'bilawal','ascending');const mids=scale.map(n=>n.midi);const vowels=/[आईऊएऐओऔाीूेैोौ]/u;
    return syl.map((part,i)=>{let idx=i%mids.length;const first=Array.from(part)[0]||'';if(vowels.test(first))idx=Math.min(mids.length-1,idx+1);if(/[ःंँ]/u.test(part))idx=Math.max(0,idx-1);return {midi:mids[idx],label:part+' · '+(swaras[options.mode||'bilawal'][idx]||'स्वर'),syllable:part,duration:options.duration||.42};});
  }
  function encodeWav(buffer){const channels=buffer.numberOfChannels,length=buffer.length;const bytes=44+length*channels*2;const ab=new ArrayBuffer(bytes),v=new DataView(ab);let p=0;const str=s=>{for(let i=0;i<s.length;i++)v.setUint8(p++,s.charCodeAt(i));};str('RIFF');v.setUint32(p,bytes-8,true);p+=4;str('WAVE');str('fmt ');v.setUint32(p,16,true);p+=4;v.setUint16(p,1,true);p+=2;v.setUint16(p,channels,true);p+=2;v.setUint32(p,buffer.sampleRate,true);p+=4;v.setUint32(p,buffer.sampleRate*channels*2,true);p+=4;v.setUint16(p,channels*2,true);p+=2;v.setUint16(p,16,true);p+=2;str('data');v.setUint32(p,bytes-44,true);p+=4;
    const data=Array.from({length:channels},(_,ch)=>buffer.getChannelData(ch));for(let i=0;i<length;i++)for(let ch=0;ch<channels;ch++){let x=Math.max(-1,Math.min(1,data[ch][i]));v.setInt16(p,x<0?x*32768:x*32767,true);p+=2;}return new Blob([ab],{type:'audio/wav'});
  }
  async function renderWav(notes,options={}){
    const sampleRate=44100, gap=options.gap??.05;const duration=notes.reduce((a,n)=>a+(n.duration||.5)+gap,0)+.3;const O=w.OfflineAudioContext||w.webkitOfflineAudioContext;if(!O)throw new Error('WAV निर्माण के लिए OfflineAudioContext उपलब्ध नहीं है।');
    const offline=new O(1,Math.ceil(duration*sampleRate),sampleRate);let t=.05;
    notes.forEach(n=>{const d=n.duration||.5;const f=freq(n.midi);const velocity=Math.max(.1,Math.min(1.2,Number(n.velocity)||1));const peak=.18*velocity;const g=offline.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+.025);g.gain.setValueAtTime(peak*.78,t+d*.7);g.gain.exponentialRampToValueAtTime(.0001,t+d+.1);g.connect(offline.destination);[1,.32,.12].forEach((level,i)=>{const o=offline.createOscillator(),p=offline.createGain();o.type=i?'triangle':'sine';o.frequency.value=f*(i+1);p.gain.value=level;o.connect(p);p.connect(g);const rate=Math.max(0,Math.min(9,Number(n.vibratoRate)||0)),depth=Math.max(0,Math.min(40,Number(n.vibratoDepthCents)||0));if(rate>=1&&depth>0&&o.detune){const lfo=offline.createOscillator(),mod=offline.createGain();lfo.frequency.value=rate;mod.gain.value=depth;lfo.connect(mod);mod.connect(o.detune);lfo.start(t);lfo.stop(t+d+.12);}o.start(t);o.stop(t+d+.12);});t+=d+gap;});
    return encodeWav(await offline.startRendering());
  }
  S.Singing={intervals,swaras,scaleNotes,playNotes,stop,startTanpura,stopTanpura,textToMelody,renderWav,freq,noteNames};
})(window);

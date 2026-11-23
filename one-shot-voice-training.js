(function(w){
 'use strict';
 const S=w.SwarSadhika,MAX_BYTES=150*1024*1024,MAX_DURATION=900;
 function validateBlob(blob){if(!blob||!Number.isFinite(blob.size)||blob.size<1024||blob.size>MAX_BYTES)throw new Error('प्रशिक्षण ऑडियो 1 KB से बड़ा और 150 MB से छोटा होना चाहिए।');if(blob.type&&!/^(audio\/|video\/webm|application\/octet-stream)/i.test(blob.type))throw new Error('एक-बार प्रशिक्षण के लिए audio या captured WebM ऑडियो चुनें।');return blob;}
 async function decodeBlob(blob){validateBlob(blob);const file=blob instanceof File?blob:new File([blob],'one-shot-reference.'+(blob.type.includes('webm')?'webm':'audio'),{type:blob.type||'audio/webm'});return S.Media.decodeFile(file);}
 async function trainBlob(blob,options={}){
  if(!S.VoiceTimbreModel||!S.NeuralVocoder||!S.VocalTractModel||!S.SanskritPhonemeEngine||!S.GlottalSource)throw new Error('स्थानीय स्वर-संश्लेषण मॉड्यूल लोड नहीं हुए।');
  const decoded=await decodeBlob(blob);let voice,style;
  try{
   const buffer=decoded.buffer;if(buffer.duration<2)throw new Error('कम-से-कम 2 सेकंड आवश्यक हैं; 15–60 सेकंड का साफ़ गायन बेहतर होगा।');if(buffer.duration>MAX_DURATION)throw new Error('एक नमूना अधिकतम 15 मिनट का हो सकता है।');
   if(typeof options.onProgress==='function')options.onProgress({stage:'acoustic',message:'स्वर-पिच, स्पेक्ट्रम, श्वास और ध्वनिक विशेषताएँ पढ़ी जा रही हैं…'});
   voice=S.VoiceTimbreModel.trainBuffer(buffer,{name:options.name||'एक-बार सीखा गया स्वर',sourceKind:options.sourceKind||'local-audio-file',sourceName:options.sourceName||'local audio',epochs:options.epochs||220,onProgress:p=>{if(options.onProgress)options.onProgress({stage:'neural',...p});}});
   if(typeof options.onProgress==='function')options.onProgress({stage:'vocal-tract',message:'स्वर-नली, फॉर्मेंट, स्पेक्ट्रल ढलान और श्वास-विशेषता अनुकूलित की जा रही है…'});
   voice.vocalTract=S.VocalTractModel.learnFromProfile(voice);
   voice.synthesisEngine={name:'Adaptive Sanskrit Phoneme/Formant/Glottal Engine',version:S.NeuralVocoder.version,trainedLocally:true,features:['pitch-conditioned spectral envelope','speaker-adaptive vowel formants','glottal pulse excitation','breath and fricative noise','Sanskrit consonant manner and place'],createdAt:new Date().toISOString()};
   if(typeof options.onProgress==='function')options.onProgress({stage:'style',message:'गायन-पिच और लय का शैली मॉडल बनाया जा रहा है…'});
   const analysis=S.SingingModel.analyzeBuffer(buffer);style=S.SingingModel.train([analysis],{name:(options.name||'मेरी गायन-शैली')+' · शैली',epochs:320});
   voice.id=S.uid();style.id=S.uid();voice.linkedStyleProfileId=style.id;style.linkedVoiceProfileId=voice.id;
   await S.Storage.put('profiles',voice);await S.Storage.put('profiles',style);
   await S.Storage.put('sessions',{id:S.uid(),type:'one-shot-voice-training',sourceKind:options.sourceKind||'local-audio-file',durationSec:buffer.duration,voiceProfileId:voice.id,styleProfileId:style.id,createdAt:new Date().toISOString()});
   if(typeof options.onProgress==='function')options.onProgress({stage:'complete',voiceProfile:voice,styleProfile:style});
   return{voiceProfile:voice,styleProfile:style,analysis:{durationSec:buffer.duration,medianPitchHz:analysis.medianPitchHz,voicedRatio:analysis.voicedRatio,networkLoss:voice.training.loss,vocalTractVersion:voice.vocalTract.version,synthesisEngine:voice.synthesisEngine.name}};
  }finally{if(decoded.context&&decoded.context.state!=='closed')await decoded.context.close().catch(()=>{});}
 }
 async function trainFile(file,options={}){if(!(file instanceof Blob))throw new Error('स्थानीय audio file चुनें।');return trainBlob(file,{...options,sourceKind:options.sourceKind||'local-audio-file',sourceName:file.name||options.sourceName||'audio file'});}
 S.OneShotVoiceTraining={maxBytes:MAX_BYTES,maxDuration:MAX_DURATION,trainBlob,trainFile,validateBlob};
})(window);

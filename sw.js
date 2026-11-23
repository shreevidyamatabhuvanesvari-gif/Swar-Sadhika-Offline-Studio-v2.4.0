'use strict';
const CACHE='swar-sadhika-v2.4.0';
const FILES=[
 './','./index.html','./manifest.webmanifest','./icons/icon.svg','./assets/css/app.css',
 './assets/js/core.js','./assets/js/storage.js','./assets/js/sanskrit.js','./assets/js/voice.js','./assets/js/natural-tts.js',
 './assets/js/singing.js','./assets/js/media.js','./assets/js/singing-model.js','./assets/js/auto-singing-training.js','./assets/js/voice-timbre-model.js','./assets/js/sanskrit-phoneme-engine.js','./assets/js/vocal-tract-model.js','./assets/js/glottal-source.js','./assets/js/neural-vocoder.js','./assets/js/one-shot-voice-training.js','./assets/js/youtube-listen-training.js','./assets/js/avatar.js','./assets/js/body-language.js','./assets/js/app.js'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('swar-sadhika-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
   if(response&&response.ok&&response.type==='basic'){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
   return response;
 }).catch(()=>caches.match('./index.html'))));
});

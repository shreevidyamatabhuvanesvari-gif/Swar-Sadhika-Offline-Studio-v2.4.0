(function (w) {
  'use strict';
  const S = w.SwarSadhika;
  let active = null;
  let runId = 0;
  let activeRun = null;
  let pauseTimer = null;

  const supported = () => !!(w.speechSynthesis && w.SpeechSynthesisUtterance);
  function listVoices() { return supported() ? w.speechSynthesis.getVoices() : []; }
  function rankedVoices() { return S.NaturalTTS ? S.NaturalTTS.rankVoices(listVoices()) : []; }
  function hindiFemaleCandidates() { return rankedVoices().filter(v => S.NaturalTTS.isExplicitFemale(v)); }
  function chooseVoice(voiceURI) {
    const voices = listVoices();
    if (voiceURI) return voices.find(v => v.voiceURI === voiceURI) || null;
    const recommendation = S.NaturalTTS ? S.NaturalTTS.recommendVoice(voices) : null;
    return recommendation && recommendation.voice || voices.find(v => /^hi-IN$/i.test(v.lang) && v.localService !== false) || null;
  }
  function cancel() {
    runId++;
    if (pauseTimer) clearTimeout(pauseTimer);
    pauseTimer = null;
    const previous = activeRun;
    activeRun = null;
    active = null;
    if (supported()) { try { w.speechSynthesis.cancel(); } catch (_) {} }
    if (previous && !previous.settled) {
      previous.settled = true;
      previous.resolve(false);
    }
  }
  function speak(text, options = {}) {
    if (!supported()) return Promise.reject(new Error('इस ब्राउज़र/डिवाइस में Speech Synthesis उपलब्ध नहीं है।'));
    const source = String(text || '').trim();
    if (!source) return Promise.reject(new Error('पहले पाठ लिखें।'));
    cancel();
    const thisRun = runId;
    const phrases = S.NaturalTTS ? S.NaturalTTS.splitPhrases(source, options.maxChunkLength || 170) : [{ text: source, pauseMs: 250 }];
    const voice = chooseVoice(options.voiceURI);
    if (!voice) { const remoteOnly = S.NaturalTTS && S.NaturalTTS.rankVoices(listVoices(), { includeRemote: true }).length > 0; return Promise.reject(new Error(remoteOnly ? 'हिंदी आवाज़ मिली, लेकिन उपलब्ध आवाज़ केवल नेटवर्क-आधारित है। Android की Text-to-speech settings में स्थानीय Hindi voice pack डाउनलोड/सक्रिय करें।' : 'स्थानीय हिंदी/संस्कृत आवाज़ उपलब्ध नहीं है। Android की Text-to-speech settings में स्थानीय Hindi voice pack सक्रिय करें।')); }
    if (voice.localService === false && !options.allowRemote) return Promise.reject(new Error('चुनी हुई आवाज़ नेटवर्क-आधारित है। बाहरी सेवा से बचने के लिए डिवाइस की स्थानीय आवाज़ चुनें।'));

    return new Promise((resolve, reject) => {
      const run = { resolve, reject, settled: false };
      activeRun = run;
      let index = 0;
      const finish = (error) => {
        if (run.settled || thisRun !== runId) return;
        run.settled = true;
        activeRun = null;
        active = null;
        if (error) reject(error);
        else {
          if (typeof options.onEnd === 'function') options.onEnd();
          resolve(true);
        }
      };
      const next = () => {
        if (thisRun !== runId || run.settled) return;
        if (index >= phrases.length) { finish(null); return; }
        const phrase = phrases[index++];
        let utterance;
        try {
          utterance = new w.SpeechSynthesisUtterance(phrase.text);
          utterance.voice = voice;
          utterance.lang = options.lang || voice.lang || 'hi-IN';
          utterance.rate = Math.max(.55, Math.min(1.25, Number(options.rate) || .84));
          utterance.pitch = Math.max(.85, Math.min(1.15, Number(options.pitch) || 1));
          utterance.volume = Math.max(.1, Math.min(1, Number(options.volume) || 1));
          active = utterance;
          utterance.onstart = () => { if (index === 1 && typeof options.onStart === 'function') options.onStart(); };
          utterance.onboundary = event => { if (typeof options.onBoundary === 'function') options.onBoundary(event, utterance); };
          utterance.onpause = () => { if (typeof options.onPause === 'function') options.onPause(); };
          utterance.onresume = () => { if (typeof options.onResume === 'function') options.onResume(); };
          utterance.onend = () => {
            if (thisRun !== runId || run.settled) return;
            active = null;
            if (index >= phrases.length) finish(null);
            else pauseTimer = setTimeout(() => { pauseTimer = null; next(); }, phrase.pauseMs);
          };
          utterance.onerror = event => {
            if (thisRun !== runId || run.settled) return;
            const error = new Error('वाणी त्रुटि: ' + (event.error || 'unknown'));
            if (typeof options.onError === 'function') options.onError(error);
            finish(error);
          };
          w.speechSynthesis.speak(utterance);
        } catch (error) { finish(error); }
      };
      next();
    });
  }
  function pause() { if (supported() && w.speechSynthesis.speaking) w.speechSynthesis.pause(); }
  function resume() { if (supported() && w.speechSynthesis.paused) w.speechSynthesis.resume(); }
  function waitForVoices(timeoutMs = 1200) {
    if (!supported()) return Promise.resolve([]);
    const now = listVoices();
    if (now.length) return Promise.resolve(now);
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); w.speechSynthesis.removeEventListener?.('voiceschanged', finish); resolve(listVoices()); };
      const timer = setTimeout(finish, timeoutMs);
      w.speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
      w.speechSynthesis.onvoiceschanged = finish;
    });
  }
  S.Voice = {
    supported, listVoices, rankedVoices, hindiFemaleCandidates, chooseVoice, speak, cancel, pause, resume, waitForVoices,
    get active() { return active; }
  };
})(window);

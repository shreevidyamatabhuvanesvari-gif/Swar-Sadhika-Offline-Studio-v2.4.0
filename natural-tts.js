(function (w) {
  'use strict';
  const FEMALE_MARKERS = /(?:female|woman|feminine|girl|स्त्री|महिला|नारी)/i;
  const MALE_MARKERS = /(?:male|man|masculine|boy|पुरुष)/i;
  const HINDI_OR_SANSKRIT = /^(?:hi|sa)(?:-|$)/i;

  function voiceLanguage(voice) { return String(voice && voice.lang || '').trim(); }
  function voiceName(voice) { return `${voice && voice.name || ''} ${voice && voice.voiceURI || ''} ${voice && voice.gender || ''}`.trim(); }
  function isHindiOrSanskrit(voice) { return HINDI_OR_SANSKRIT.test(voiceLanguage(voice)); }
  function isExplicitFemale(voice) { return FEMALE_MARKERS.test(voiceName(voice)); }
  function isExplicitMale(voice) { return MALE_MARKERS.test(voiceName(voice)); }
  function isLocal(voice) { return !!voice && voice.localService !== false; }

  function scoreVoice(voice) {
    let score = 0;
    const lang = voiceLanguage(voice).toLowerCase();
    const name = voiceName(voice);
    if (/^hi-in$/.test(lang)) score += 100;
    else if (/^hi(?:-|$)/.test(lang)) score += 88;
    else if (/^sa(?:-|$)/.test(lang)) score += 80;
    else score -= 140;
    if (voice && voice.localService === true) score += 65;
    else if (voice && voice.localService === false) score -= 180;
    if (isExplicitFemale(voice)) score += 75;
    if (isExplicitMale(voice)) score -= 95;
    if (/hindi|हिन्दी|भारत|india/i.test(name)) score += 12;
    if (voice && voice.default) score += 2;
    return score;
  }

  function rankVoices(voices, options = {}) {
    return (Array.isArray(voices) ? voices : [])
      .filter(voice => isHindiOrSanskrit(voice) && (options.includeRemote || isLocal(voice)))
      .map(voice => ({ voice, score: scoreVoice(voice) }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.voice);
  }

  function recommendVoice(voices) {
    const ranked = rankVoices(voices);
    const explicitFemale = ranked.find(isExplicitFemale);
    const selected = explicitFemale || ranked[0] || null;
    return {
      voice: selected,
      gender: selected ? (isExplicitFemale(selected) ? 'female-indicated' : isExplicitMale(selected) ? 'male-indicated' : 'unknown') : 'unavailable',
      local: !!selected && selected.localService === true,
      language: selected ? voiceLanguage(selected) : ''
    };
  }

  function describeVoice(voice) {
    if (!voice) return 'स्थानीय हिंदी/संस्कृत आवाज़ उपलब्ध नहीं मिली।';
    const gender = isExplicitFemale(voice) ? 'नाम में स्त्री-स्वर का संकेत' : isExplicitMale(voice) ? 'नाम में पुरुष-स्वर का संकेत' : 'आवाज़ का लिंग ब्राउज़र API में उपलब्ध नहीं';
    const locality = voice.localService === true ? 'डिवाइस में स्थानीय' : voice.localService === false ? 'नेटवर्क-आधारित' : 'स्थानीय स्थिति अज्ञात';
    return `${voice.name || 'डिवाइस आवाज़'} · ${voiceLanguage(voice)} · ${locality} · ${gender}`;
  }

  function splitPhrases(text, maxLength = 170) {
    const source = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!source) return [];
    const max = Math.max(40, Math.min(240, Number(maxLength) || 170));
    const result = [];
    let current = '';
    const push = () => {
      const part = current.trim();
      if (part) result.push({ text: part, pauseMs: pauseAfter(part) });
      current = '';
    };
    for (const char of source) {
      current += char;
      if (/[।॥!?;:\n]/u.test(char)) push();
      else if (current.length >= max) {
        const lastSpace = current.lastIndexOf(' ');
        if (lastSpace > Math.floor(max * .55)) {
          const head = current.slice(0, lastSpace).trim();
          const tail = current.slice(lastSpace + 1);
          current = head;
          push();
          current = tail;
        } else push();
      }
    }
    push();
    return result;
  }

  function pauseAfter(phrase) {
    const last = String(phrase || '').slice(-1);
    if (last === '॥') return 520;
    if (last === '।' || last === '!' || last === '?') return 320;
    if (last === '\n' || last === ':') return 240;
    if (last === ';') return 190;
    return 110;
  }

  function getLocalHindiStatus(voices) {
    const recommendation = recommendVoice(voices);
    if (!recommendation.voice) return { available: false, femaleIndicated: false, message: 'स्थानीय हिंदी/संस्कृत TTS आवाज़ नहीं मिली। Android Text-to-speech settings में Hindi voice pack स्थापित/सक्रिय करें।' };
    if (recommendation.gender === 'female-indicated') return { available: true, femaleIndicated: true, message: 'स्थानीय हिंदी/संस्कृत आवाज़ मिली; नाम में स्त्री-स्वर का संकेत है। वास्तविक गुणवत्ता नमूना सुनकर जाँचें।', recommendation };
    if (recommendation.gender === 'male-indicated') return { available: true, femaleIndicated: false, message: 'स्थानीय हिंदी आवाज़ मिली, लेकिन नाम में पुरुष-स्वर का संकेत है। दूसरी उपलब्ध आवाज़ चुनें।', recommendation };
    return { available: true, femaleIndicated: false, message: 'स्थानीय हिंदी/संस्कृत आवाज़ उपलब्ध है। ब्राउज़र API उसका लिंग नहीं बताती; “आवाज़ जाँचें” से सुनकर उपयुक्त स्त्री-स्वर चुनें।', recommendation };
  }

  w.SwarSadhika = w.SwarSadhika || {};
  w.SwarSadhika.NaturalTTS = {
    version: 'device-native-natural-tts-1.0.0',
    rankVoices, recommendVoice, describeVoice, splitPhrases, pauseAfter,
    getLocalHindiStatus, isExplicitFemale, isLocal, isHindiOrSanskrit
  };
})(window);

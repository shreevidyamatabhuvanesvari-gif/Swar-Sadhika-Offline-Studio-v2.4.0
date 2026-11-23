(function (w) {
  'use strict';
  const consonants = new Set(Array.from('कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळ'));
  const aspirated = new Set(Array.from('खघछझठढथधफभ'));
  const fricatives = new Set(Array.from('शषसह'));
  const nasals = new Set(Array.from('ङञणनम'));
  const plosives = new Set(Array.from('कखगघचछजझटठडढतथदधपफबभ'));
  const voiced = new Set(Array.from('गघङजझञडढणदधनबभमयरलवह'));
  const palatal = new Set(Array.from('चछजझञयश'));
  const retroflex = new Set(Array.from('टठडढणष'));
  const dental = new Set(Array.from('तथदधनलस'));
  const labial = new Set(Array.from('पफबभमव'));
  const vowelMap = {
    'अ':'a','आ':'aa','ा':'aa','इ':'i','ि':'i','ई':'ii','ी':'ii',
    'उ':'u','ु':'u','ऊ':'uu','ू':'uu','ऋ':'ri','ृ':'ri','ॠ':'ri','ॄ':'ri',
    'ए':'e','े':'e','ऐ':'ai','ै':'ai','ओ':'o','ो':'o','औ':'au','ौ':'au',
    'ऌ':'li','ॡ':'li'
  };
  function analyzeAkshara(value) {
    const text = String(value || '').normalize('NFC');
    const chars = Array.from(text);
    const consonantList = chars.filter(ch => consonants.has(ch));
    const independentVowel = chars.find(ch => /[अआइईउऊऋॠऌॡएऐओऔ]/u.test(ch));
    const vowelSign = chars.find(ch => Object.prototype.hasOwnProperty.call(vowelMap, ch) && !/[अआइईउऊऋॠऌॡएऐओऔ]/u.test(ch));
    const hasVirama = chars.includes('्');
    const vowelKey = text.includes('ॐ') ? 'o' : independentVowel ? vowelMap[independentVowel] : vowelSign ? vowelMap[vowelSign] : (hasVirama ? 'silence' : 'a');
    const initial = consonantList[0] || '';
    const manner = !initial ? 'vowel' : fricatives.has(initial) ? 'fricative' : nasals.has(initial) ? 'nasal' : plosives.has(initial) ? 'plosive' : 'approximant';
    const place = !initial ? 'vowel' : labial.has(initial) ? 'labial' : retroflex.has(initial) ? 'retroflex' : dental.has(initial) ? 'dental' : palatal.has(initial) ? 'palatal' : 'velar';
    return {
      text, consonants: consonantList, initial,
      vowel: vowelKey,
      hasVowel: vowelKey !== 'silence',
      hasVirama,
      aspirated: aspirated.has(initial),
      voiced: voiced.has(initial),
      nasalized: chars.some(ch => /[ंँ]/u.test(ch)),
      visarga: chars.includes('ः'),
      manner, place,
      phonemeClass: `${manner}-${place}${aspirated.has(initial) ? '-aspirated' : ''}`
    };
  }
  function analyzeText(text) {
    const chunks = w.SwarSadhika && w.SwarSadhika.Sanskrit
      ? w.SwarSadhika.Sanskrit.analyze(text).syllables : Array.from(String(text || ''));
    return chunks.map(analyzeAkshara);
  }
  w.SwarSadhika = w.SwarSadhika || {};
  w.SwarSadhika.SanskritPhonemeEngine = { analyzeAkshara, analyzeText, vowelMap };
})(window);

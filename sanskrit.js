(function (w) {
  'use strict';
  const S = w.SwarSadhika;
  const independent = {'ॐ':'oṃ','अ':'a','आ':'ā','इ':'i','ई':'ī','उ':'u','ऊ':'ū','ऋ':'ṛ','ॠ':'ṝ','ऌ':'ḷ','ए':'e','ऐ':'ai','ओ':'o','औ':'au'};
  const consonants = {'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ṅ','च':'c','छ':'ch','ज':'j','झ':'jh','ञ':'ñ','ट':'ṭ','ठ':'ṭh','ड':'ḍ','ढ':'ḍh','ण':'ṇ','त':'t','थ':'th','द':'d','ध':'dh','न':'n','प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'ś','ष':'ṣ','स':'s','ह':'h','ळ':'ḷ'};
  const signs = {'ा':'ā','ि':'i','ी':'ī','ु':'u','ू':'ū','ृ':'ṛ','ॄ':'ṝ','ॢ':'ḷ','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'ṃ','ः':'ḥ','ँ':'m̐','्':''};
  const vowelSigns = new Set(Object.keys(signs));
  const vowelNames = {'अ':'अ (a)','आ':'आ (ā)','इ':'इ (i)','ई':'ई (ī)','उ':'उ (u)','ऊ':'ऊ (ū)','ऋ':'ऋ (ṛ)','ए':'ए (e)','ऐ':'ऐ (ai)','ओ':'ओ (o)','औ':'औ (au)'};
  function transliterate(text) {
    let out=''; const chars=Array.from(String(text||''));
    for(let i=0;i<chars.length;i++){
      const c=chars[i];
      if(independent[c]) out+=independent[c];
      else if(consonants[c]) { out+=consonants[c]; const next=chars[i+1]; if(next==='्') i++; else if(next && /[ािीुूृॄॢेैोौ]/u.test(next)) {out+=signs[next];i++;} else if(next && /[ंःँ]/u.test(next)) {out+='a'+signs[next];i++;} else out+='a'; }
      else if(signs[c]!==undefined) out+=signs[c];
      else if(c==='।'||c==='॥') out+=c==='।'?' | ':' || ';
      else out+=c;
    }
    return out;
  }
  function splitGraphemes(text) {
    if (w.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter('hi',{granularity:'grapheme'}).segment(String(text||'')),x=>x.segment);
    return Array.from(String(text||'').normalize('NFC'));
  }
  function splitSyllables(word) {
    // Approximate Devanagari akshara segmentation: consonant clusters stay together
    // across virama; vowel signs, anusvara and visarga remain with the preceding akshara.
    const source=String(word||'').normalize('NFC').replace(/[\s।॥,;.!?]+/gu,'');
    const matches=source.match(/[क-हक़-य़](?:़)?(?:्[क-हक़-य़](?:़)?)*(?:[ािीुूृॄॢेैोौंःँ]*)|[अआइईउऊऋॠऌॡएऐओऔ][ंःँ]?|[ॐ]/gu);
    return matches && matches.length ? matches : splitGraphemes(source);
  }
  function analyze(text) {
    const value=String(text||'').normalize('NFC').trim();
    if(!value) return {text:'',words:[],syllables:[],transliteration:'',stats:{characters:0,words:0,syllables:0}};
    const words=value.split(/[\s।॥,;.!?]+/u).filter(Boolean);
    const syllables=words.flatMap(word=>splitSyllables(word));
    const graphemes=splitGraphemes(value);
    const vowels=graphemes.filter(g=>vowelNames[g] || /[ािीुूृॄॢेैोौ]/u.test(g));
    const nasal=graphemes.filter(g=>/[ंँः]/u.test(g)).length;
    return {text:value,words,syllables,transliteration:transliterate(value),stats:{characters:graphemes.length,words:words.length,syllables:syllables.length,vowelMarks:vowels.length,nasalMarks:nasal},hints:words.map(word=>({word,parts:splitSyllables(word),iast:transliterate(word)}))};
  }
  function pronounceableChunks(text) {
    return splitGraphemes(text).filter(c=>!/[\s।॥,;.!?]/u.test(c));
  }
  S.Sanskrit={transliterate,splitGraphemes,splitSyllables,analyze,pronounceableChunks};
})(window);

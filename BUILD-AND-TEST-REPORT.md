# निर्माण एवं ऑडिट रिपोर्ट — स्वर-साधिका Offline Studio 2.4.0

## Build सारांश

- Base archive: `Swar-Sadhika-Offline-Studio-v2.3.0.zip`.
- Version: `2.4.0`.
- कुल regular files: 29.
- कुल JavaScript files: 19 (जिसमें नया `natural-tts.js` शामिल है)।
- PWA cache version: `swar-sadhika-v2.4.0`.
- सभी build/test कार्य स्थानीय container में हुए। कोई वेबसाइट, Web Search, CDN, remote AI API, pretrained model, network voice service या package registry इस्तेमाल नहीं हुआ।

## उपयोगकर्ता की माँग के अनुसार TTS सुधार

उद्देश्य किसी व्यक्ति की आवाज़ की cloning नहीं, बल्कि उपलब्ध उच्च-गुणवत्ता स्थानीय स्त्री-स्वर से स्वाभाविक संस्कृत TTS है।

### `assets/js/natural-tts.js` — नया मॉड्यूल

1. उपलब्ध Web Speech voices में केवल Hindi/Sanskrit (`hi*`, `sa*`) और local/unknown-local voices को default सूची में रखता है; `localService === false` नेटवर्क-आधारित voices को सामान्य सूची से हटाता है।
2. `hi-IN` को प्राथमिकता देता है, फिर अन्य Hindi, फिर Sanskrit locale।
3. voice name, URI और जहाँ browser अतिरिक्त `gender` metadata देता है, उसमें explicit female marker मिलने पर उस voice को ऊपर रखता है।
4. यदि gender metadata उपलब्ध नहीं, तो स्पष्ट रूप से “लिंग अज्ञात” बताता है; महिला आवाज़ होने का झूठा दावा नहीं करता।
5. देवनागरी पाठ को `।`, `॥`, newline और आवश्यकतानुसार सुरक्षित text-length chunks में विभाजित करके phrase pause जोड़ता है। मूल पाठ/वर्तनी नहीं बदलता।
6. एक status helper स्थानीय Hindi voice की उपलब्धता और female-marker संकेत बताता है।

### `assets/js/voice.js` — TTS playback सुधार

- selected local Hindi/Sanskrit voice को स्पष्ट रूप से लागू करता है।
- केवल network-based voice मिलने पर उसे डिफ़ॉल्ट रूप से अस्वीकार कर offline voice pack सक्रिय करने का संदेश देता है।
- लंबे पाठ को क्रमिक phrase playback में पढ़ता है; danda/verse-end पर विराम देता है।
- rate को 0.55–1.25 और pitch को 0.85–1.15 में सीमित रखता है; default pitch 1.00 है ताकि कृत्रिम रूप से आवाज़ ऊँची न की जाए।
- cancel/pause/resume, boundary events और error handling मौजूद हैं।

### UI / Integration

- `index.html`: local Hindi/Sanskrit voice picker, voice status तथा “चयनित आवाज़ जाँचें” sample control जोड़ा।
- `app.js`: explicit female-indicated local voice को प्राथमिकता, selected voice URI को local preference में याद रखना, voice list refresh और sample playback जोड़ा।
- `core.js`, `package.json`: version 2.4.0.
- `sw.js`: नया TTS module PWA cache में शामिल; cache version बदला।

## TTS का व्यावहारिक उपयोग

App सामान्य पाठ के लिए handcrafted oscillator synthesizer का इस्तेमाल करके speech की नकल नहीं करता। यह डिवाइस के installed native Speech Synthesis voice engine को उपयोग करता है। Android पर पहले से उपलब्ध स्थानीय Hindi female voice pack होने पर वही उच्च गुणवत्ता की प्राकृतिक आवाज़ देगा। ऐप voice packs डाउनलोड नहीं करता और network-only voices को डिफ़ॉल्ट रूप से नहीं चलाता।

Web Speech API प्रत्येक voice का gender अनिवार्य रूप से expose नहीं करती। इसलिए female marker वाला नाम/metadata केवल संकेत माना जाता है; अंतिम पुष्टि “आवाज़ जाँचें” sample सुनकर करनी होगी। यदि device में स्थानीय female Hindi voice उपलब्ध नहीं है, तो इस ZIP के code मात्र से उसे पैदा करने का दावा नहीं किया गया है। OS settings में उपयुक्त offline Hindi voice pack स्थापित होना आवश्यक है।

## Automated test result

Command: `npm test`

**55 PASS, 0 FAIL**

महत्त्वपूर्ण नई जाँचें:
- नया Natural TTS UI/script order/Service Worker cache integration.
- स्थानीय Hindi female-indicated voice को प्राथमिकता।
- gender unknown स्थिति में “female” का झूठा दावा न करना।
- Sanskrit danda/paragraph segmentation और pause durations।
- गैर-Hindi तथा remote-only voices को default से बाहर रखना।
- mock SpeechSynthesis में Sanskrit phrases sequentially बोलना और चुनी स्थानीय voice/lang लागू करना।
- network-only voice उपलब्ध होने पर उसे offline policy के अंतर्गत अस्वीकार करना।

अन्य मौजूदा जाँचें JavaScript syntax, HTML ID uniqueness, script order, PWA cache files, Sanskrit phoneme parsing, singing model training, vocal-tract formants, glottal source, adaptive vocoder, YouTube URL validation, Storage, Backup/Restore आदि को कवर करती हैं।

## Chromium UI integration test

- Chromium: headless, viewport `390 × 844`.
- Test environment: isolated in-memory HTML/CSS/JS harness; Web Speech voice API को mock किया गया।
- App version loaded: `2.4.0`.
- Local mock voice list: Hindi female-indicated local, Sanskrit local (gender unknown), Hindi remote female.
- Selected voice: `hi-female-local`.
- Remote voice dropdown से बाहर रही।
- Sample “ॐ नमः शिवाय। सर्वे भवन्तु सुखिनः।” दो utterances में phrase pause के साथ भेजा गया। दोनों में selected `hi-female-local`, `hi-IN`, rate `0.85`, pitch `1.00` लागू थे।
- सभी 8 navigation pages खोले गए।
- Page errors: 0; Console errors: 0; horizontal overflow: false.

यह mock TTS control-flow का परीक्षण है, वास्तविक मानव आवाज़ playback/प्राकृतिकता का नहीं।

## ZIP integrity / package audit

- HTML IDs: 140, सभी unique.
- App script references: सभी स्थानीय फ़ाइलें उपस्थित.
- No external script/style/font/fetch endpoints detected. YouTube iframe optional remote player है; यह सामान्य TTS के लिए आवश्यक नहीं।

## सीमाएँ जिन्हें छिपाया नहीं गया

1. **Android device certification अभी नहीं हुआ।** वास्तविक फोन पर installed Hindi voice list, महिला आवाज़ की उपलब्धता, pronunciation, offline playback और long Sanskrit recitation को सुनकर जाँचना आवश्यक है।
2. **प्राकृतिक स्त्री-स्वर OS voice pack पर निर्भर है।** यदि Android में महिला Hindi voice pack उपलब्ध/स्थापित नहीं, ऐप उसे केवल JavaScript से कृत्रिम रूप से पूर्ण प्राकृतिक नहीं बना सकता।
3. Browser API gender metadata न दे तो app किसी voice को पक्का female घोषित नहीं करता।
4. मौजूदा singing path (`neural-vocoder.js`) एक locally trained spectral-profile नियंत्रित source-filter singing synthesizer है। यह सामान्य speech TTS से अलग है और पूर्ण natural waveform-generative singing vocoder नहीं है।
5. Human listening panel, MOS/ABX naturalness evaluation, वास्तविक handset test और YouTube tab/system capture test नहीं हुए।

## Privacy / network

- Normal TTS device native voice service पर चलता है; App remote voice को default से reject करता है।
- App code में कोई external AI API, CDN या remote package dependency नहीं।
- Voice URI preference केवल browser localStorage में रखी जाती है।
- YouTube player केवल तभी internet उपयोग करता है जब user उसे स्वयं खोलता है; यह TTS playback के लिए आवश्यक नहीं।

## अंतिम ZIP सत्यापन

- ZIP: `Swar-Sadhika-Offline-Studio-v2.4.0.zip`.
- Archive entries: 29 regular file entries; directory hierarchy ZIP में path prefixes के रूप में रखी है। Extract के बाद 29 files और 5 directories मिले।
- `unzip -t`: **No errors detected in compressed data**.
- Extracted ZIP पर `npm test`: **55 PASS, 0 FAIL**.
- Extracted App `package.json` version: `2.4.0`.
- `index.html`: 140 IDs, सभी अद्वितीय; नया `natural-tts.js` script उपस्थित।
- `sw.js`: नया `natural-tts.js` cached; cache version `swar-sadhika-v2.4.0`.
- SHA-256 checksum अलग `.sha256` फ़ाइल में दिया गया है।

# Swar-Sadhika-Offline-Studio-v2.4.0
# स्वर-साधिका — Offline Studio 2.4.0

स्वर-साधिका संस्कृत मंत्र, श्लोक, स्तोत्र और ऋचाओं के पाठ-अभ्यास, प्राकृतिक device-native TTS, स्थानीय गायन-संश्लेषण, संदर्भ-गायन से एक-बार ध्वनिक अनुकूलन, मीडिया अध्ययन, Avatar तथा देह-भाषा अभ्यास के लिए local-first Android/Chrome Studio है। ऐप स्वयं कोई pretrained voice model, CDN, cloud inference या third-party runtime package डाउनलोड/उपयोग नहीं करता।

## शुरू करें

1. ZIP Extract करें।
2. किसी कंप्यूटर पर Python 3 उपलब्ध हो तो इस फ़ोल्डर में `python run-local.py` चलाएँ और उसी डिवाइस के ब्राउज़र में `http://127.0.0.1:8765/` खोलें। यह helper केवल loopback पर bind होता है; LAN या Internet पर सर्वर नहीं खोलता।
3. Android पर HTTPS या localhost Origin का उपयोग करें। `file://` से खुलने पर मुख्य UI कुछ ब्राउज़र में चल सकता है, लेकिन Service Worker/PWA Cache तथा कुछ Storage/Media APIs सीमित रह सकती हैं।
4. सर्वोत्तम प्राकृतिक हिंदी स्त्री-स्वर के लिए Android में पहले से स्थापित **स्थानीय Hindi female Speech Services voice pack** चुनें। ऐप उपलब्ध local Hindi/Sanskrit voices को सूचीबद्ध करता है, नाम/metadata में स्पष्ट स्त्री-स्वर संकेत वाली आवाज़ को प्राथमिकता देता है और नमूना सुनने देता है। ऐप स्वयं voice pack डाउनलोड नहीं करता।

## प्राकृतिक हिंदी TTS — 2.4.0

पाठ एवं वाणी स्टूडियो का सामान्य TTS अब Android/Chrome के native Speech Synthesis engine का उपयोग करता है। यह हाथ से बनाए गए oscillator या formant tone को बोलचाल की आवाज़ की तरह प्रस्तुत करने का प्रयास नहीं करता; इसके बजाय डिवाइस में स्थापित उच्च-गुणवत्ता speech voice को चुनता है।

- **`natural-tts.js`:** स्थानीय Hindi/Sanskrit voices को rank करता है; Hindi-India को प्राथमिकता देता है; voice name/URI/जहाँ उपलब्ध हो gender metadata में female marker होने पर उसे ऊपर रखता है; श्लोक को `।`, `॥`, विराम-चिह्न और line breaks पर phrases में बाँटकर उपयुक्त pause जोड़ता है।
- **`voice.js`:** चयनित स्थानीय voice को sequential phrase playback में चलाता है; voice selection, pause/resume/cancel, rate/pitch, boundary callbacks और लंबे पाठ के सुरक्षित chunking को संभालता है। Network-only voice को डिफ़ॉल्ट रूप से अस्वीकार करता है।
- **`app.js`:** अनुशंसित voice चुनता है, चयन local preference में रखता है और “चयनित आवाज़ जाँचें” नमूना देता है।
- **स्त्री-स्वर की पहचान:** Web Speech API हर डिवाइस पर voice gender उपलब्ध नहीं कराती। इसलिए जहाँ metadata/name स्पष्ट संकेत देता है वहाँ उसे दर्शाया जाता है; अन्यथा ऐप “लिंग अज्ञात” कहता है और उपयोगकर्ता को आवाज़ सुनकर चुनने देता है।
- **पिच:** प्राकृतिक आवाज़ को कृत्रिम रूप से ऊँचा करने के बजाय default pitch 1.00 रखा है; सीमित adjustment उपलब्ध है।
- **विराम:** `।` पर छोटा तथा `॥` पर बड़ा phrase pause रखा है। मूल संस्कृत वर्तनी को बदला नहीं जाता।

### यदि स्थानीय स्त्री-स्वर उपलब्ध नहीं है

Android के System/Language & input/Text-to-speech output (निर्माता के अनुसार नाम बदल सकता है) में Hindi voice pack उपलब्ध कराएँ और यदि विकल्प मिले तो Female/महिला आवाज़ चुनें। Voice pack एक बार डाउनलोड होने के बाद offline उपलब्ध हो सकता है; उपलब्धता डिवाइस और Speech Services पर निर्भर है। ऐप किसी remote voice को चुपचाप चुनकर उसे local नहीं बताता।

**प्राकृतिकता की सीमा:** TTS का वास्तविक स्वर-गुण डिवाइस के installed Speech Services voice pack पर निर्भर है। ऐप voice gender का अनुमान लगाकर उसे प्रमाणित नहीं कर सकता, और प्रत्येक Android फोन पर एक समान female voice उपलब्ध होने की गारंटी नहीं है। वास्तविक डिवाइस पर चुनी आवाज़ सुनकर पुष्टि आवश्यक है।

## एक-बार संदर्भ-ऑडियो प्रशिक्षण

गायन पृष्ठ में **एक-बार स्वर-अधिगम एवं स्थानीय Neural Vocoder** पैनल है।

### स्थानीय ऑडियो फ़ाइल से

1. 15–60 सेकंड का साफ़ गायन चुनें (न्यूनतम 2 सेकंड; अधिकतम 15 मिनट और 150 MB)।
2. **एक बार सुनकर स्वर सीखें** दबाएँ।
3. ऐप एक बार AudioBuffer decode करके pitch, spectral-band envelope, centroid, spectral-flatness, energy और voiced-frame जानकारी निकालेगा।
4. 4–16–24 spectral-regression MLP को local backpropagation से train करेगा। इसके बाद `VocalTractModel` speaker-resonance scales, spectral tilt, bandwidth, breathiness, harmonicity, jitter और shimmer के सीमित अनुमान बनाएगा। Singing-style model पिच-कंटूर, dynamics और vibrato profile भी प्रशिक्षित करेगा।
5. Derived voice/style profiles IndexedDB में सुरक्षित होंगे। मूल audio फ़ाइल स्थायी रूप से संग्रहीत नहीं होती।

### YouTube वीडियो को सुनकर प्रशिक्षण

1. गायन पृष्ठ में YouTube URL डालकर Embed Player खोलें।
2. **सुनना और कैप्चर शुरू करें** दबाएँ। समर्थित ब्राउज़र में display/tab audio sharing का विकल्प आएगा; audio track उपलब्ध न होने पर microphone loopback विकल्प उपयोग होगा।
3. Capture चालू होने के बाद वीडियो पर Play करें और साफ़ अंश चलाएँ।
4. **सुनना रोकें और प्रशिक्षण करें** दबाएँ। Captured Blob स्वतः वही one-shot pipeline चलाता है।

**YouTube सीमाएँ:** YouTube iframe cross-origin है; ऐप उसके अंदर से JavaScript द्वारा raw PCM सीधे नहीं पढ़ता। Tab/system audio capture ब्राउज़र और OS support पर निर्भर है; Android Chrome में यह अनुपलब्ध हो सकता है। Microphone loopback तभी उपयोगी है जब speaker playback microphone तक पहुँचे; earphones/Bluetooth में ऐसा आवश्यक नहीं। YouTube playback के लिए Internet चाहिए। ऐप YouTube से audio डाउनलोड, DRM bypass या hidden extraction नहीं करता। केवल अधिकार-प्राप्त ऑडियो उपयोग करें।

## स्थानीय singing synthesis engine — 2.3+ आधार

यह सामान्य speech TTS से अलग अभ्यास/गायन-संश्लेषण पथ है।

- **`sanskrit-phoneme-engine.js`:** देवनागरी अक्षरांश को consonant onset, vowel/matra, virama, aspiration, voicing, nasalisation, visarga, manner और place-of-articulation संकेतों में बाँटता है।
- **`vocal-tract-model.js`:** अ, आ, इ, ई, उ, ऊ, ऋ, ए, ऐ, ओ, औ आदि के लिए अलग formant targets रखता है। reference voice profile से F1/F2/F3 resonance scaling, bandwidth, spectral tilt, breathiness, harmonicity और micro-variation की सीमित speaker adaptation करता है।
- **`glottal-source.js`:** Rosenberg-जैसे glottal-flow derivative, deterministic noise, harmonic tilt तथा cycle-level jitter helpers देता है।
- **`voice-timbre-model.js`:** 4–16–24 MLP local backpropagation training, 24-band spectral envelope और pitch/dynamics-conditioned prediction करता है।
- **`neural-vocoder.js`:** learned spectral envelope, pitch, vowel formants, consonant manner, glottal pulse, breath/frication noise, vibrato और amplitude envelope मिलाकर 24 kHz mono PCM और WAV बनाता है।
- **`one-shot-voice-training.js`:** एक decoded sample से voice + style profile train/save करता है; training progress में acoustic, neural, vocal-tract और style steps दिखाता है।
- **`youtube-listen-training.js`:** user-authorized system/tab capture या microphone loopback रिकॉर्ड करता है और उसी training function में देता है।

## अन्य ऐप क्षमताएँ

- **पाठ एवं वाणी:** संस्कृत संपादक, रचना-संग्रह, अक्षर-खंड, लिप्यंतरण, स्थानीय native Hindi/Sanskrit TTS voice picker, phrase-aware pauses और sample preview।
- **गायन एवं स्वर-अभ्यास:** बिलावल, कल्याण, भैरव और औडव; आरोह/अवरोह/आलाप; तानपुरा; text-to-melody; WAV export।
- **मीडिया अध्ययन:** स्थानीय ऑडियो का RMS, Peak, pitch, note histogram, अनुमानित BPM और waveform।
- **Avatar:** स्थानीय फोटो, मुख overlay और speech timing पर आधारित अनुमानित mouth animation।
- **देह-भाषा अभ्यास:** वीडियो फ्रेम चुनना, user-defined pose tags और अभ्यास रिकॉर्ड।
- **डेटा/बैकअप:** IndexedDB, सीमित localStorage fallback, JSON backup/restore और local data deletion। Profile में neural weights और speaker adaptation fields भी सुरक्षित होते हैं।
- **PWA shell:** HTTPS/localhost पर same-origin runtime files cache-first। YouTube iframe remote player है और offline cache का भाग नहीं।

## वैज्ञानिक सीमा — स्पष्ट जानकारी

Normal text-to-speech naturalness इस संस्करण में डिवाइस के native Speech Services voice pack से आती है; ऐप स्वयं waveform-generative female neural voice model नहीं बनाता। Female voice का नाम/metadata संकेत उपलब्ध न हो तो ऐप उसे प्रमाणित महिला आवाज़ घोषित नहीं करता। एक प्राकृतिक महिला आवाज़ तभी मिलेगी जब डिवाइस में उपयुक्त स्थानीय Hindi/Sanskrit voice pack स्थापित हो और उपयोगकर्ता उसे सुनकर चुनें।

अलग singing-synthesis path अभी handcrafted phoneme/articulation rules और locally trained spectral profile से नियंत्रित source-filter synthesizer है; यह आधुनिक high-capacity waveform-generative singing vocoder के बराबर नहीं है। एक single reference sample में जो ध्वनियाँ उपस्थित नहीं हैं, उनका पूरा वास्तविक उच्चारण उस sample से सीखना संभव नहीं। कोई naturalness MOS/ABX listening certification नहीं की गई।

Phoneme-perfect lip-sync, trained human-pose estimation और Android device certification इस बदलाव में शामिल नहीं हैं। वास्तविक फोन पर Speech engine, selected female voice naturalness, microphone/system capture, MediaRecorder, codecs, offline install और लंबे सत्रों की अलग जाँच जरूरी है।

## स्थानीय निर्भरताएँ और नेटवर्क

App code में कोई website, CDN, remote AI inference API, cloud server, remote font या third-party JavaScript package नहीं। Core TTS डिवाइस के पहले से स्थापित local Speech Services को उपयोग करता है। YouTube Player केवल तब Internet उपयोग करता है जब user स्वयं YouTube URL खोलता है। Device voice pack को OS settings में पहले से installed होना चाहिए; ऐप उसे download नहीं करता।

## परीक्षण

Node.js 18+ के साथ:

```bash
npm test
```

Tests में syntax, unique HTML IDs, JS element references, external dependency checks, service-worker cache list, NaturalTTS voice ranking, gender-unknown reporting, Sanskrit danda pause segmentation, sequential native TTS, network-only voice refusal, Sanskrit phoneme classes, formant adaptation, glottal excitation, pitch tracking, neural training, PCM/WAV synthesis, YouTube URL validation, storage और backup round-trip शामिल हैं। Automated tests तथा mock-voice Chromium UI run Android device certification या वास्तविक speech-quality guarantee नहीं हैं। देखें `BUILD-AND-TEST-REPORT.md`।

## गोपनीयता

TTS चुनी गई device-local voice से चलता है; network-only voices डिफ़ॉल्ट रूप से अस्वीकार होते हैं। Training के बाद source audio स्थायी रूप से नहीं रखा जाता; derived profile और learned weights local IndexedDB में रखे जाते हैं। Mic/screen capture केवल स्पष्ट user action और browser permission से शुरू होता है। YouTube playback external player से आता है। स्थानीय data साफ़ करने पर सभी local models/profile हट सकते हैं; आवश्यकता हो तो पहले JSON backup लें।

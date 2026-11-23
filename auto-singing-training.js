(function (w) {
  'use strict';
  const S = w.SwarSadhika;
  const MAX_FILES = 8;
  const MAX_FILE_BYTES = 100 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
  function validateFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) throw new Error('गायन-शैली प्रशिक्षण के लिए ऑडियो नमूने चुनें।');
    if (list.length > MAX_FILES) throw new Error(`एक प्रशिक्षण चक्र में अधिकतम ${MAX_FILES} ऑडियो नमूने चुनें।`);
    let total = 0;
    for (const file of list) {
      if (!file || !(file.type || '').toLowerCase().startsWith('audio/')) throw new Error('शैली प्रशिक्षण में केवल ऑडियो फ़ाइलें स्वीकार हैं।');
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error('हर ऑडियो फ़ाइल 1 byte से अधिक और 100 MB से छोटी होनी चाहिए।');
      total += file.size;
    }
    if (total > MAX_TOTAL_BYTES) throw new Error('सभी प्रशिक्षण ऑडियो का कुल आकार 250 MB से कम रखें।');
    return list;
  }
  async function trainFiles(files, options = {}) {
    if (!S.Media || !S.SingingModel) throw new Error('गायन-शैली प्रशिक्षण मॉड्यूल उपलब्ध नहीं हैं।');
    const list = validateFiles(files);
    const analyses = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (typeof options.onProgress === 'function') options.onProgress({ stage: 'decode', current: i + 1, total: list.length, name: file.name });
      const decoded = await S.Media.decodeFile(file);
      try {
        if (decoded.buffer.duration < 1.1) throw new Error(`${file.name}: कम-से-कम 1.1 सेकंड का नमूना चुनें।`);
        if (decoded.buffer.duration > 900) throw new Error(`${file.name}: एक नमूना अधिकतम 15 मिनट का होना चाहिए।`);
        const result = S.SingingModel.analyzeBuffer(decoded.buffer);
        result.sourceName = String(file.name || `नमूना ${i + 1}`).slice(0, 120);
        analyses.push(result);
      } finally {
        if (decoded.context && decoded.context.state !== 'closed') await decoded.context.close().catch(() => {});
      }
    }
    if (typeof options.onProgress === 'function') options.onProgress({ stage: 'train', current: list.length, total: list.length, name: '' });
    const profile = S.SingingModel.train(analyses, { name: options.name || 'स्थानीय गायन-शैली' });
    profile.trainingSamples = analyses.map((a, i) => ({
      index: i + 1, name: a.sourceName, durationSec: Number(a.durationSec.toFixed(2)),
      medianPitchHz: Number(a.medianPitchHz.toFixed(1)), voicedRatio: Number(a.voicedRatio.toFixed(3))
    }));
    profile.trainingCompletedAt = new Date().toISOString();
    return profile;
  }
  function trainBuffers(buffers, options = {}) {
    if (!Array.isArray(buffers) || !buffers.length) throw new Error('प्रशिक्षण हेतु AudioBuffer सूची आवश्यक है।');
    const analyses = buffers.map(buffer => S.SingingModel.analyzeBuffer(buffer));
    return S.SingingModel.train(analyses, options);
  }
  async function saveProfile(profile) {
    if (!S.SingingModel.validateProfile(profile)) throw new Error('अमान्य गायन-शैली मॉडल सुरक्षित नहीं किया जा सकता।');
    return S.Storage.put('profiles', profile);
  }
  S.AutoSingingTraining = { maxFiles: MAX_FILES, validateFiles, trainFiles, trainBuffers, saveProfile };
})(window);

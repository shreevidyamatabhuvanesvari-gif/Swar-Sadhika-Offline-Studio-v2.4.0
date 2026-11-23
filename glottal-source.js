(function (w) {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function random(seed) {
    let x=seed>>>0||0x6d2b79f5;
    return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
  }
  function flow(phase, openQuotient=.62, returnShape=.22) {
    const p=((phase%1)+1)%1, oq=clamp(openQuotient,.45,.78), rq=clamp(returnShape,.08,.42);
    if(p<oq) return .5*(1-Math.cos(Math.PI*p/oq));
    const t=(p-oq)/(1-oq);
    const decay=Math.exp(-t/(rq+.04));
    return Math.max(0,decay*(1-t)*(1-t)*(1+2*t));
  }
  function derivative(phase, step, openQuotient, returnShape) {
    return (flow(phase,openQuotient,returnShape)-flow(phase-step,openQuotient,returnShape))/Math.max(step,1e-5);
  }
  function pinkishNoise(next, previous) {
    const white=next()*2-1;
    return { value:white-previous*.74, previous:white };
  }
  function harmonicTilt(harmonic, dbPerOctave=-7) {
    const octaves=Math.log2(Math.max(1,harmonic));
    return Math.pow(10,(dbPerOctave*octaves)/20);
  }
  function cycleVariation(next, jitterPercent=.2) {
    return 1 + (next()*2-1)*clamp(jitterPercent,0,1.5)/100;
  }
  w.SwarSadhika = w.SwarSadhika || {};
  w.SwarSadhika.GlottalSource = { random, flow, derivative, pinkishNoise, harmonicTilt, cycleVariation };
})(window);

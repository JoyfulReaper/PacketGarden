// Shared Web Audio test double; never opens a device or adds runtime dependencies.
module.exports = function createAudioContext(options = {}) {
  const state = { now:0, contexts:[], gains:[], oscillators:[], buffers:[], sources:[], filters:[], compressors:[], resumes:0, ...options };
  const param = () => ({ value:0, events:[],
    setValueAtTime(value,time) { this.value=value; this.events.push(['set',value,time]); },
    linearRampToValueAtTime(value,time) { this.events.push(['linear',value,time]); },
    exponentialRampToValueAtTime(value,time) { this.events.push(['exponential',value,time]); }
  });
  class AudioContext {
    constructor() {
      if (state.failConstructor) throw new Error('Unavailable audio device');
      this.currentTime=0; this.sampleRate=48000; this.state='suspended'; this.destination={}; state.contexts.push(this);
    }
    resume() {
      state.resumes++;
      if (state.failResume) return Promise.reject(new Error('Resume failed'));
      if (state.deferredResume) return new Promise(resolve => { state.finishResume=()=>{this.state='running';resolve();}; });
      this.state='running'; return Promise.resolve();
    }
    createGain() {
      const gain={gain:param(),connect(){},disconnect(){this.disconnected=true;}};
      state.gains.push(gain); return gain;
    }
    createDynamicsCompressor() {
      const node={threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){this.disconnected=true;}};
      state.compressors.push(node);return node;
    }
    createBiquadFilter() {
      const node={frequency:param(),Q:param(),connect(){},disconnect(){this.disconnected=true;}};
      state.filters.push(node);return node;
    }
    createBuffer(channels,length,sampleRate) {
      const data=new Float32Array(length),buffer={length,sampleRate,getChannelData:()=>data};state.buffers.push(buffer);return buffer;
    }
    createBufferSource() {
      if(state.failPlayback)throw new Error('Playback failed');
      const node={playbackRate:param(),connect(){},disconnect(){this.disconnected=true;},start(time){this.startTime=time;},stop(time){this.stopTime=time;}};
      state.sources.push(node);return node;
    }
    createOscillator() {
      if (state.failPlayback) throw new Error('Playback failed');
      const oscillator={frequency:param(),connect(){},disconnect(){this.disconnected=true;},
        start(time){this.startTime=time;}, stop(time){this.stopTime=time;}};
      state.oscillators.push(oscillator); return oscillator;
    }
  }
  return {state, AudioContext};
};

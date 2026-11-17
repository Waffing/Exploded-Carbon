type SoundKind = 'select' | 'swap' | 'detent';
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let requested = false;
let revision = 0;
let failure: 'unavailable' | 'error' | null = null;
let lastDetent = -Infinity;
const voices = new Set<OscillatorNode>();
const MASTER_VOLUME = 0.2;

function audioConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
}

function mute() {
  if (!context || !master) return;
  try {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.value = 0;
  } catch {
    failure = 'error';
  }
  for (const voice of voices) {
    try {
      voice.stop();
      voice.disconnect();
    } catch {
      continue;
    }
  }
  voices.clear();
}

export function getAudioState(): { enabled: boolean; state: string } {
  return {
    enabled: enabled && context?.state === 'running',
    state: failure ?? context?.state ?? (audioConstructor() ? 'idle' : 'unavailable'),
  };
}

export async function setSoundEnabled(value: boolean): Promise<boolean> {
  const attempt = ++revision;
  requested = value;
  enabled = false;
  mute();
  if (!value) return false;
  try {
    const Constructor = audioConstructor();
    if (!Constructor) {
      failure = 'unavailable';
      requested = false;
      return false;
    }
    failure = null;
    if (!context || context.state === 'closed') {
      context = new Constructor();
      master = null;
    }
    const activeContext = context;
    if (!master) {
      master = activeContext.createGain();
      master.gain.value = 0;
      master.connect(activeContext.destination);
      activeContext.onstatechange = () => {
        if (context !== activeContext) return;
        if (activeContext.state !== 'running') {
          enabled = false;
          mute();
        } else if (requested) {
          try {
            master?.gain.setValueAtTime(MASTER_VOLUME, activeContext.currentTime);
            enabled = true;
          } catch {
            enabled = false;
            failure = 'error';
          }
        }
      };
    }
    if (activeContext.state !== 'running') await activeContext.resume();
    if (attempt !== revision || !requested || context !== activeContext) return getAudioState().enabled;
    if (activeContext.state !== 'running') return false;
    master.gain.cancelScheduledValues(activeContext.currentTime);
    master.gain.setValueAtTime(Math.min(0.25, Math.max(0, MASTER_VOLUME)), activeContext.currentTime);
    lastDetent = -Infinity;
    enabled = true;
    return true;
  } catch {
    if (attempt === revision) {
      enabled = false;
      requested = false;
      failure = 'error';
      mute();
    }
    return false;
  }
}

export function playSound(kind: SoundKind): void {
  if (!enabled || !context || !master || context.state !== 'running' || voices.size >= 4) return;
  if (kind !== 'select' && kind !== 'swap' && kind !== 'detent') return;
  const now = context.currentTime;
  if (kind === 'detent' && now - lastDetent < 0.065) return;
  let oscillator: OscillatorNode | undefined;
  let envelope: GainNode | undefined;
  let filter: BiquadFilterNode | undefined;
  try {
    oscillator = context.createOscillator();
    envelope = context.createGain();
    filter = context.createBiquadFilter();
    const duration = kind === 'swap' ? 0.16 : kind === 'select' ? 0.085 : 0.028;
    const startFrequency = kind === 'swap' ? 460 : kind === 'select' ? 700 : 1040;
    const endFrequency = kind === 'swap' ? 780 : kind === 'select' ? 470 : 620;
    oscillator.type = kind === 'detent' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(0.6, now);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(kind === 'detent' ? 0.12 : 0.22, now + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    envelope.gain.setValueAtTime(0, now + duration + 0.006);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    const voice = oscillator;
    const voiceEnvelope = envelope;
    const voiceFilter = filter;
    voice.onended = () => {
      voices.delete(voice);
      voice.disconnect();
      voiceFilter.disconnect();
      voiceEnvelope.disconnect();
    };
    voices.add(voice);
    voice.start(now);
    voice.stop(now + duration + 0.01);
    if (kind === 'detent') lastDetent = now;
  } catch {
    if (oscillator) {
      voices.delete(oscillator);
      try { oscillator.stop(); } catch {}
      oscillator.disconnect();
    }
    filter?.disconnect();
    envelope?.disconnect();
  }
}

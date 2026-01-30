export const playShakeSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        
        // Create noise buffer for rattle
        const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Filter to make it sound more like coins rattling (bandpass)
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1;

        // Gain envelope
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
        noise.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.error('Audio play failed', e);
    }
};

export const playCoinDropSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const t = ctx.currentTime;

        // Create 3 distinct "clinks" slightly offset
        [0, 0.05, 0.1].forEach((offset, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Metallic frequencies
            osc.frequency.setValueAtTime(2000 + Math.random() * 500, t + offset);
            osc.frequency.exponentialRampToValueAtTime(500, t + offset + 0.1);
            
            // Envelope
            gain.gain.setValueAtTime(0, t + offset);
            gain.gain.linearRampToValueAtTime(0.3, t + offset + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(t + offset);
            osc.stop(t + offset + 0.3);
        });
    } catch (e) {
        console.error('Audio play failed', e);
    }
};

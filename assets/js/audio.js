/**
 * audio.js — Web Audio API 音效系统
 * 纯代码合成音效，零外部文件依赖
 */

const Audio = {
  ctx: null,
  bgmGain: null,
  bgmPlaying: false,
  bgmInterval: null,
  bgmPadInterval: null,
  muted: false,

  /** 激活音频上下文（须在用户手势中调用，自动 resume） */
  activate() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  /** 播放一个音调 */
  playTone(freq, duration, type = 'sine', volume = 0.3) {
    if (this.muted) return;
    const ctx = this.activate();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  },

  /** 播放一段旋律 */
  playMelody(notes, baseTime = 0) {
    if (this.muted) return;
    const ctx = this.activate();
    const now = ctx.currentTime + baseTime;
    notes.forEach(([freq, start, dur, type = 'sine', vol = 0.25]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  },

  /** 噪声效果 */
  playNoise(duration, volume = 0.15) {
    if (this.muted) return;
    const ctx = this.activate();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  },

  // ========== 游戏音效 ==========

  /** 选专属箱 */
  playSelectBox() {
    this.playTone(220, 0.15, 'triangle', 0.3);
    setTimeout(() => this.playTone(330, 0.2, 'triangle', 0.25), 100);
    setTimeout(() => this.playTone(440, 0.3, 'triangle', 0.2), 200);
    this.playNoise(0.1, 0.2);
  },

  /** 开箱普通金额 */
  playOpenBox() {
    this.playNoise(0.15, 0.2);
    this.playTone(880, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(1100, 0.12, 'sine', 0.1), 60);
  },

  /** 开出 ≥$100k — 遗憾震惊 descending wah */
  playBigReveal() {
    this.playNoise(0.3, 0.25);
    this.playMelody([
      [523, 0, 0.25, 'square', 0.2],
      [466, 0.25, 0.25, 'square', 0.18],
      [415, 0.5, 0.25, 'square', 0.15],
      [349, 0.75, 0.5, 'square', 0.12],
    ]);
    setTimeout(() => this.playNoise(0.15, 0.1), 200);
  },

  /** 开出 $1,000,000 — 震撼爆裂 descending crash */
  playMillionReveal() {
    this.playNoise(0.5, 0.35);
    this.playMelody([
      [784, 0, 0.2, 'sawtooth', 0.2],
      [659, 0.2, 0.2, 'sawtooth', 0.18],
      [523, 0.4, 0.25, 'sawtooth', 0.15],
      [392, 0.65, 0.3, 'sawtooth', 0.12],
      [262, 0.95, 0.6, 'sawtooth', 0.1],
    ]);
    setTimeout(() => this.playNoise(0.2, 0.15), 400);
    setTimeout(() => this.playNoise(0.15, 0.1), 700);
  },

  /** 银行家报价铃声 */
  playBankerCall() {
    this.playMelody([
      [660, 0, 0.25, 'square', 0.1],
      [880, 0.3, 0.25, 'square', 0.1],
      [660, 0.6, 0.25, 'square', 0.1],
      [880, 0.9, 0.25, 'square', 0.1],
    ]);
  },

  /** Deal 成交上升 */
  playDeal() {
    this.playMelody([
      [523, 0, 0.2, 'sine', 0.3],
      [659, 0.2, 0.2, 'sine', 0.3],
      [784, 0.4, 0.3, 'sine', 0.3],
      [1047, 0.7, 0.5, 'sine', 0.35],
    ]);
  },

  /** No Deal 下降 */
  playNoDeal() {
    this.playMelody([
      [440, 0, 0.2, 'square', 0.15],
      [349, 0.2, 0.2, 'square', 0.15],
      [262, 0.4, 0.4, 'square', 0.15],
    ]);
    this.playNoise(0.2, 0.1);
  },

  /** 终极抉择心跳 */
  playFinalDrum() {
    this.playTone(60, 0.4, 'sine', 0.2);
    setTimeout(() => this.playTone(60, 0.4, 'sine', 0.2), 600);
    setTimeout(() => this.playTone(60, 0.6, 'sine', 0.25), 1200);
  },

  /** 最终开箱揭示 */
  playFinalReveal() {
    this.playMelody([
      [523, 0, 0.15, 'sine', 0.3],
      [659, 0.15, 0.15, 'sine', 0.3],
      [784, 0.3, 0.15, 'sine', 0.3],
      [1047, 0.45, 0.15, 'sine', 0.3],
      [1319, 0.6, 0.4, 'sine', 0.35],
    ]);
    setTimeout(() => this.playTone(1568, 0.6, 'triangle', 0.25), 700);
  },

  // ========== 背景音乐（综艺主题纯音乐） ==========

  /** 开始背景音乐 — C 小调优雅和弦循环 */
  startBGM() {
    if (this.bgmPlaying || this.muted) return;
    this.bgmPlaying = true;

    const ctx = this.activate();
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.18, ctx.currentTime);
    this.bgmGain.connect(ctx.destination);

    // 和弦进行：Cm → Ab → Eb → Bb（递进感）
    const chords = [
      [130.81, 155.56, 196.00, 261.63],
      [207.65, 261.63, 311.13, 415.30],
      [155.56, 196.00, 233.08, 311.13],
      [233.08, 293.66, 349.23, 466.16],
    ];

    let chordIndex = 0;

    const playBGM = () => {
      if (!this.bgmPlaying) return;
      const now = ctx.currentTime;
      const chord = chords[chordIndex % chords.length];

      // 琶音：和弦 4 音依次奏响（三角波 + 泛音）
      chord.forEach((freq, i) => {
        const t = i * 0.6;
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'triangle';
        o1.frequency.setValueAtTime(freq, now + t);
        g1.gain.setValueAtTime(0.09, now + t);
        g1.gain.linearRampToValueAtTime(0.001, now + t + 0.55);
        o1.connect(g1);
        g1.connect(this.bgmGain);
        o1.start(now + t);
        o1.stop(now + t + 0.55);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(freq * 2, now + t);
        g2.gain.setValueAtTime(0.02, now + t);
        g2.gain.linearRampToValueAtTime(0.001, now + t + 0.5);
        o2.connect(g2);
        g2.connect(this.bgmGain);
        o2.start(now + t);
        o2.stop(now + t + 0.5);
      });

      // 低音根基
      const oB = ctx.createOscillator();
      const gB = ctx.createGain();
      oB.type = 'sine';
      oB.frequency.setValueAtTime(chord[0] / 2, now);
      gB.gain.setValueAtTime(0.06, now);
      gB.gain.linearRampToValueAtTime(0.001, now + 2);
      oB.connect(gB);
      gB.connect(this.bgmGain);
      oB.start(now);
      oB.stop(now + 2);

      chordIndex++;
      this.bgmInterval = setTimeout(playBGM, 2400);
    };
    playBGM();
  },

  /** 停止背景音乐 */
  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearTimeout(this.bgmInterval);
      this.bgmInterval = null;
    }
  },

  /** 切换静音 */
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.muted;
  }
};

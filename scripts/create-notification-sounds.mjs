import { mkdirSync, writeFileSync } from "node:fs";

const output = "android/app/src/main/res/raw";
mkdirSync(output, { recursive: true });

const sampleRate = 44100;
const seconds = 0.72;
const totalSamples = Math.floor(sampleRate * seconds);

function makeTone(frequencies, filename) {
  const samples = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let value = 0;
    for (const tone of frequencies) {
      if (t >= tone.start && t <= tone.end) {
        const local = t - tone.start;
        const duration = tone.end - tone.start;
        const fade = Math.min(1, local / 0.018, (duration - local) / 0.045);
        value += Math.sin(2 * Math.PI * tone.frequency * local) * Math.max(0, fade);
      }
    }
    const sample = Math.max(-1, Math.min(1, value * 0.22));
    samples.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(samples.length, 40);
  writeFileSync(`${output}/${filename}`, Buffer.concat([header, samples]));
}

makeTone([{ frequency: 740, start: 0.02, end: 0.24 }], "c46_classic.wav");
makeTone([{ frequency: 520, start: 0.02, end: 0.34 }], "c46_soft.wav");
makeTone([
  { frequency: 660, start: 0.02, end: 0.18 },
  { frequency: 880, start: 0.24, end: 0.42 }
], "c46_double.wav");

console.log("Generated CRYPTOSIGNAL46 notification sounds.");

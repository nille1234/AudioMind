export function pcmToWav(pcmBase64: string, sampleRate: number = 24000): Blob {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);
  return new Blob([wavHeader, bytes], { type: 'audio/wav' });
}
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
}

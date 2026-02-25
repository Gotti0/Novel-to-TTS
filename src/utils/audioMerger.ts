export async function mergeAudioChunks(base64Chunks: string[]): Promise<string> {
  if (base64Chunks.length === 0) return '';
  
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const buffers = await Promise.all(base64Chunks.map(async (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    try {
      // Try to decode as WAV/MP3
      // Make a copy of the buffer because decodeAudioData might detach it on failure
      const bufferCopy = bytes.buffer.slice(0);
      return await audioCtx.decodeAudioData(bufferCopy);
    } catch (e) {
      console.warn("Failed to decode audio data, assuming raw PCM 24000Hz 16-bit mono", e);
      // Fallback: assume 24000Hz Int16 PCM and wrap in WAV
      const wavBytes = addWavHeader(bytes, 24000, 1, 16);
      return await audioCtx.decodeAudioData(wavBytes.buffer);
    }
  }));

  // Merge buffers
  const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
  const mergedBuffer = audioCtx.createBuffer(
    buffers[0].numberOfChannels,
    totalLength,
    buffers[0].sampleRate
  );

  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = mergedBuffer.getChannelData(channel);
      channelData.set(buffer.getChannelData(channel), offset);
    }
    offset += buffer.length;
  }

  // Convert merged buffer to WAV for playback/download
  const wavBytes = audioBufferToWav(mergedBuffer);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function addWavHeader(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);
  
  const wav = new Uint8Array(44 + pcmData.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcmData, 44);
  return wav;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  // Interleave channels
  const result = new Float32Array(buffer.length * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      result[i * numChannels + channel] = channelData[i];
    }
  }
  
  const dataLength = result.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write PCM data
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

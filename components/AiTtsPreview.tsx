/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { split_async } from '../src/utils/textSplitter';
import { mergeAudioChunks } from '../src/utils/audioMerger';
import { Play, Pause, Download } from 'lucide-react';

export interface AiTtsPreviewRef {
  generate: () => Promise<void>;
}

interface AiTtsPreviewProps {
  text: string;
  maxChars: number;
  language: string;
  instruct: string;
  voiceName: string;
  modelName: string;
  maxConcurrency: number;
  rpm: number;
  onProcessingChange?: (isProcessing: boolean) => void;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const AiTtsPreview = forwardRef<AiTtsPreviewRef, AiTtsPreviewProps>(({
  text, maxChars, language, instruct, voiceName, modelName, maxConcurrency, rpm, onProcessingChange
}, ref) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ step: string, current: number, total: number } | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setProcessing = (val: boolean) => {
    setIsProcessing(val);
    if (onProcessingChange) onProcessingChange(val);
  };

  useImperativeHandle(ref, () => ({
    generate: async () => {
      if (!text.trim() || isProcessing) return;

      setProcessing(true);
      setFinalAudioUrl(null);
      setChunks([]);

      try {
        // 1. Chunking
        setProgress({ step: '텍스트 분할 중...', current: 0, total: 1 });
        const textChunks = await split_async(text, maxChars);
        setChunks(textChunks);

        // 2. TTS Generation
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64AudioChunks: string[] = new Array(textChunks.length);

        const delayBetweenRequests = (60 / rpm) * 1000;
        const startTime = Date.now();
        let completedCount = 0;

        const processChunk = async (chunk: string, i: number) => {
          // Wait to respect RPM. e.g. 15 RPM = 1 request every 4 seconds.
          const expectedTime = startTime + i * delayBetweenRequests;
          const now = Date.now();
          if (now < expectedTime) {
            await delay(expectedTime - now);
          }

          const prompt = instruct
            ? `[Language: ${language}] ${instruct}\n\n${chunk}`
            : `[Language: ${language}]\n\n${chunk}`;

          console.debug(`[API Request - Chunk ${i + 1}/${textChunks.length}] Starting...`, { model: modelName, voice: voiceName, length: chunk.length });
          const reqStartTime = Date.now();

          let response;
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [{ parts: [{ text: prompt }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                  },
                },
              },
            });
            console.debug(`[API Request - Chunk ${i + 1}] Success in ${Date.now() - reqStartTime}ms`);
          } catch (chunkError) {
            console.error(`[API Request - Chunk ${i + 1}] Failed after ${Date.now() - reqStartTime}ms:`, chunkError);
            throw chunkError;
          }

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            base64AudioChunks[i] = base64Audio;
          } else {
            console.error(`[API Request - Chunk ${i + 1}] Missing audio data in response:`, response);
            throw new Error(`Failed to generate audio for chunk ${i + 1}`);
          }

          completedCount++;
          setProgress({ step: '오디오 생성 중...', current: completedCount, total: textChunks.length });
        };

        // Custom concurrency queue
        let currentIndex = 0;
        const worker = async () => {
          while (currentIndex < textChunks.length) {
            const i = currentIndex++;
            await processChunk(textChunks[i], i);
          }
        };

        const workers = Array.from({ length: Math.min(maxConcurrency, textChunks.length) }, () => worker());
        await Promise.all(workers);

        // 3. Merging
        setProgress({ step: '오디오 병합 중...', current: 1, total: 1 });
        const mergedUrl = await mergeAudioChunks(base64AudioChunks);
        setFinalAudioUrl(mergedUrl);

      } catch (error: any) {
        console.error("================ API ERROR ================");
        console.error("Error generating TTS:", error);
        if (error.status) console.error("Status:", error.status);
        if (error.message) console.error("Message:", error.message);
        console.error("Raw Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error("===========================================");
        alert(`오디오 생성 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}\n콘솔을 확인해주세요.`);
      } finally {
        setProcessing(false);
        setProgress(null);
      }
    }
  }));

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!isProcessing && !finalAudioUrl && chunks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      {isProcessing && progress && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 bg-indigo-50/30">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">{progress.step}</h3>
          <div className="w-full bg-indigo-100 rounded-full h-2.5 mb-2">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-indigo-600 text-right">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}

      {/* Final Audio Player */}
      {finalAudioUrl && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 bg-emerald-50/30">
          <h3 className="text-lg font-semibold text-emerald-900 mb-4">오디오 생성 완료</h3>

          <audio
            ref={audioRef}
            src={finalAudioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="hidden"
          />

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-14 h-14 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors shadow-sm"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>

            <a
              href={finalAudioUrl}
              download="novel-tts.wav"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              WAV 다운로드
            </a>
          </div>
        </div>
      )}

      {/* Chunks Preview */}
      {chunks.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 flex flex-col max-h-[600px]">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
            <span>텍스트 청크 분할 결과</span>
            <span className="text-sm font-normal text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md">
              총 {chunks.length}개 청크
            </span>
          </h3>
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
            {chunks.map((chunk, idx) => (
              <div key={idx} className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-sm text-zinc-700">
                <div className="text-xs font-medium text-zinc-400 mb-1">청크 {idx + 1} ({chunk.length}자)</div>
                {chunk}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default AiTtsPreview;
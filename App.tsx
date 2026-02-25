import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Loader2, Settings2, FileText, Music } from 'lucide-react';
import Carousel3D from './components/Carousel3D';
import AiTtsPreview, { AiTtsPreviewRef } from './components/AiTtsPreview';
import { VOICE_DATA } from './constants';

const DEFAULT_INSTRUCT = `Dark Xianxia and martial arts novel narration with dynamic, tense pacing at standard 1.0x to 1.05x speed, using crisp articulation and subtle reverb for atmospheric depth without dragging the tempo.

[Narrator] Medium-low pitch, rhythmically engaging and composed narration, switching to an intense, close-mic whisper with rapid delivery for sensual descriptions to maintain momentum.
[Male character] Low pitch with subtle vocal fry, wicked and arrogant tone, using a snappy, biting delivery instead of drawling when taunting, and heavy, rapid breathing when excited.
[Female character] Clear high pitch with urgent trembling, cold but breaking down with fast, breathless pacing, quivering sharply at line endings when resisting, and stammering with desperate, quickened tearful urgency when pleading.

Maximize emotional inflection for quoted dialogue with rapid back-and-forths, filling ellipses (……) with short, sharp inhales to build tension rather than long pauses, and apply dreamy reverb to inner monologue while keeping the internal tempo brisk and fluid.`;

const App: React.FC = () => {
  const [text, setText] = useState('');

  // Settings with lazy initialization from localStorage
  const initConfig = () => {
    const saved = localStorage.getItem('TTS_CONFIG');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse TTS_CONFIG from localStorage");
      }
    }
    return {};
  };

  const savedConfig = initConfig();

  const [maxChars, setMaxChars] = useState<number>(savedConfig.maxChars ?? 500);
  const [language, setLanguage] = useState<string>(savedConfig.language ?? 'ko');
  const [instruct, setInstruct] = useState<string>(savedConfig.instruct ?? DEFAULT_INSTRUCT);
  const [modelName, setModelName] = useState<string>(savedConfig.modelName ?? 'gemini-2.5-flash-preview-tts');
  const [maxConcurrency, setMaxConcurrency] = useState<number>(savedConfig.maxConcurrency ?? 3);
  const [rpm, setRpm] = useState<number>(savedConfig.rpm ?? 15);

  // Voice selection state
  const [activeIndex, setActiveIndex] = useState<number>(savedConfig.activeIndex ?? 0);
  const voiceName = VOICE_DATA[activeIndex]?.name || 'Kore';

  const [isProcessing, setIsProcessing] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const previewRef = useRef<AiTtsPreviewRef>(null);

  // Sync voiceName with activeIndex if needed and no saved config exists for it
  useEffect(() => {
    if (savedConfig.activeIndex === undefined) {
      const defaultIndex = VOICE_DATA.findIndex(v => v.name === 'Kore');
      if (defaultIndex !== -1) {
        setActiveIndex(defaultIndex);
      }
    }
  }, []);

  // Save config explicitly when any value changes
  useEffect(() => {
    const configToSave = {
      maxChars,
      language,
      instruct,
      modelName,
      maxConcurrency,
      rpm,
      activeIndex
    };
    localStorage.setItem('TTS_CONFIG', JSON.stringify(configToSave));
  }, [maxChars, language, instruct, modelName, maxConcurrency, rpm, activeIndex]);

  const handlePlayToggle = (name: string) => {
    setPlayingVoice(current => current === name ? null : name);
  };

  const handleGenerate = () => {
    previewRef.current?.generate();
  };

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 text-zinc-900 font-sans p-6 custom-scrollbar">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Header */}
        <div className="lg:col-span-12 mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Music className="w-8 h-8 text-indigo-600" />
            소설 오디오북 생성기
          </h1>
          <p className="text-zinc-500 mt-2">Gemini TTS를 사용하여 긴 소설을 고품질 오디오로 변환합니다.</p>
        </div>

        {/* Left Column: Input & Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold">소설 텍스트</h2>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 소설 텍스트를 붙여넣으세요..."
              className="w-full h-96 p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none custom-scrollbar"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold">TTS 설정</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">청크당 최대 글자 수</label>
                <input
                  type="number"
                  value={maxChars}
                  onChange={(e) => setMaxChars(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">언어 (힌트)</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ko">한국어</option>
                  <option value="en">영어</option>
                  <option value="ja">일본어</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">모델 (Model)</label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash Preview TTS</option>
                  <option value="gemini-2.5-pro-preview-tts">Gemini 2.5 Pro Preview TTS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">최대 동시 요청 (Concurrency)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">분당 요청 수 (RPM)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={rpm}
                  onChange={(e) => setRpm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">지시문 (Instruction)</label>
                <input
                  type="text"
                  value={instruct}
                  onChange={(e) => setInstruct(e.target.value)}
                  placeholder="예: 감정을 담아서 극적으로 읽어주세요"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isProcessing || !text.trim()}
              className="mt-6 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  처리 중...
                </>
              ) : (
                '오디오 생성하기'
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Voice Selection Aside */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 h-full flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-zinc-400" />
              목소리 선택
            </h2>
            <div className="flex-1 relative min-h-[400px]">
              <div className="absolute inset-0 scale-[0.75] origin-top">
                <Carousel3D
                  voices={VOICE_DATA}
                  activeIndex={activeIndex}
                  onChange={setActiveIndex}
                  playingVoice={playingVoice}
                  onPlayToggle={handlePlayToggle}
                  disabled={isProcessing}
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-zinc-900">{voiceName}</p>
              <p className="text-xs text-zinc-500">{activeIndex + 1} of {VOICE_DATA.length}</p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Status & Output */}
        <div className="lg:col-span-12 space-y-6">
          <AiTtsPreview
            ref={previewRef}
            text={text}
            maxChars={maxChars}
            language={language}
            instruct={instruct}
            voiceName={voiceName}
            modelName={modelName}
            maxConcurrency={maxConcurrency}
            rpm={rpm}
            onProcessingChange={setIsProcessing}
          />
        </div>
      </div>
    </div>
  );
};

export default App;

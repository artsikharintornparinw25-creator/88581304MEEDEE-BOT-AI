
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeAndWriteStory, generateSpeech, decodeAudioData } from './services/geminiService';
import { ChatSidebar } from './components/ChatSidebar';

const STORY_STYLES = [
  'Cinematic',
  'Gothic Noir',
  'High Fantasy',
  'Cyberpunk',
  'Whimsical',
  'Gritty Realism',
  'Lovecraftian'
];

const PACING_OPTIONS = [
  'Slow',
  'Normal',
  'Fast'
];

const AMBIENCE_OPTIONS = [
  'Automatic',
  'Rainy Night',
  'Enchanted Forest',
  'Distopian City',
  'Ancient Hall',
  'Ethereal Void',
  'Ocean Shore',
  'Busy Tavern',
  'Mechanical Works',
  'Snowy Peak',
  'Summer Meadow',
  'Zen Garden'
];

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [story, setStory] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');
  const [selectedPacing, setSelectedPacing] = useState('Normal');
  const [selectedAmbience, setSelectedAmbience] = useState('Automatic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Load session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('meedee_session');
    if (savedSession) {
      try {
        const { image: savedImage, story: savedStory, style: savedStyle, pacing: savedPacing, ambience: savedAmbience } = JSON.parse(savedSession);
        if (savedImage) setImage(savedImage);
        if (savedStory) setStory(savedStory);
        if (savedStyle) setSelectedStyle(savedStyle);
        if (savedPacing) setSelectedPacing(savedPacing);
        if (savedAmbience) setSelectedAmbience(savedAmbience);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  // Persist session on change
  useEffect(() => {
    if (image || story) {
      localStorage.setItem('meedee_session', JSON.stringify({ 
        image, 
        story, 
        style: selectedStyle,
        pacing: selectedPacing,
        ambience: selectedAmbience
      }));
    }
  }, [image, story, selectedStyle, selectedPacing, selectedAmbience]);

  // Update playback speed in real-time if audio is playing
  useEffect(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.setTargetAtTime(playbackSpeed, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [playbackSpeed]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setImage(base64);
        processImage(base64, selectedStyle, selectedPacing);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string, style: string, pacing: string) => {
    setIsGenerating(true);
    setError(null);
    setStory('');
    try {
      const generatedStory = await analyzeAndWriteStory(base64, style, pacing);
      setStory(generatedStory);
    } catch (err) {
      setError("Failed to reach the creative gods. Check your connection.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopNarration = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsNarrating(false);
  }, []);

  const handleNarration = async () => {
    if (isNarrating) {
      stopNarration();
      return;
    }

    setIsNarrating(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioBytes = await generateSpeech(story, selectedAmbience);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackSpeed; // Apply initial speed
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsNarrating(false);
      
      sourceNodeRef.current = source;
      source.start();
    } catch (err) {
      console.error(err);
      setIsNarrating(false);
      setError("The voice of the story was lost in the wind.");
    }
  };

  const reset = () => {
    stopNarration();
    setImage(null);
    setStory('');
    setError(null);
    setIsShareModalOpen(false);
    localStorage.removeItem('meedee_session');
    localStorage.removeItem('meedee_chat');
  };

  const handleCopyStory = () => {
    const textToCopy = `MEEDEE-AI Story (${selectedStyle} style, ${selectedPacing} pacing):\n\n${story}\n\nGenerated with MEEDEE-AI.`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row h-screen bg-stone-950 text-stone-100 selection:bg-cyan-600/30">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="p-6 border-b border-stone-900 flex items-center justify-between bg-stone-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-stone-400 bg-clip-text text-transparent">MEEDEE-AI</h1>
              <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.2em]">Cinematic Audio Engine</p>
            </div>
          </div>
          
          {image && (
            <button 
              onClick={reset}
              className="text-stone-500 hover:text-cyan-400 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-1.1 2c.15 0 .285.064.385.166l1.242 1.488c.31.371.91.371 1.22 0l1.242-1.488c.1-.102.235-.166.385-.166h.1a.5.5 0 0 1 0 1h-.1c-.05 0-.085.034-.135.084l-1.242 1.488a1.5 1.5 0 0 1-2.44 0l-1.242-1.488c-.05-.05-.085-.084-.135-.084h-.1a.5.5 0 0 1 0-1h.1z"/>
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
              New Sequence
            </button>
          )}
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          {!image ? (
            <div className="max-w-2xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif italic text-stone-200">
                  Visuals that speak volumes.
                </h2>
                <p className="text-stone-500 text-lg">
                  Configure your sequence and upload an image to synthesize a story.
                </p>
              </div>

              {/* Style & Pacing Selectors */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-cyan-600 font-bold">Atmospheric Style</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {STORY_STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                          selectedStyle === style 
                            ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]' 
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-cyan-600 font-bold">Narrative Tempo</p>
                  <div className="flex justify-center gap-2">
                    {PACING_OPTIONS.map(pacing => (
                      <button
                        key={pacing}
                        onClick={() => setSelectedPacing(pacing)}
                        className={`px-6 py-2 rounded-full text-xs font-semibold transition-all border ${
                          selectedPacing === pacing 
                            ? 'bg-stone-100 border-stone-100 text-stone-950 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        {pacing}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="group relative block w-full aspect-video border-2 border-dashed border-stone-800 rounded-3xl hover:border-cyan-600/50 hover:bg-stone-900/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center text-stone-600 group-hover:text-cyan-500 group-hover:scale-110 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                  </svg>
                </div>
                <span className="text-stone-400 font-medium">Inject Visual Source</span>
              </label>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-700">
              {/* Image & Story Split */}
              <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-cyan-600/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <img 
                    src={image} 
                    alt="Source" 
                    className="w-full rounded-2xl shadow-2xl border border-stone-800 relative z-10 aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                    <div className="px-3 py-1 bg-cyan-600 text-white text-[10px] font-bold uppercase rounded-full shadow-lg">
                      {selectedStyle}
                    </div>
                    <div className="px-3 py-1 bg-stone-100 text-stone-900 text-[10px] font-bold uppercase rounded-full shadow-lg">
                      {selectedPacing} Tempo
                    </div>
                  </div>
                  {isGenerating && (
                    <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-cyan-600/20 border-t-cyan-600 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium tracking-widest text-cyan-500 uppercase">Synthesizing...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6 flex flex-col justify-center min-h-[300px]">
                  {error ? (
                    <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-200 text-sm">
                      {error}
                    </div>
                  ) : story ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <div className="relative">
                        <svg className="absolute -left-6 -top-2 w-12 h-12 text-stone-800 -z-10" fill="currentColor" viewBox="0 0 32 32">
                          <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H6c0-2.2 1.8-4 4-4V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-8c0-2.2 1.8-4 4-4V8z"/>
                        </svg>
                        <p className="font-serif text-xl md:text-2xl leading-relaxed text-stone-300 first-letter:text-5xl first-letter:font-bold first-letter:text-cyan-500 first-letter:mr-3 first-letter:float-left">
                          {story}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <button 
                            onClick={handleNarration}
                            className={`flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all shadow-lg active:scale-95 ${
                              isNarrating 
                                ? 'bg-cyan-600 text-white hover:bg-cyan-500 ring-4 ring-cyan-600/20' 
                                : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                            }`}
                          >
                            {isNarrating ? (
                              <>
                                <div className="flex gap-1">
                                  <span className="w-1 h-3 bg-white/60 animate-bounce delay-75"></span>
                                  <span className="w-1 h-4 bg-white animate-bounce delay-150"></span>
                                  <span className="w-1 h-3 bg-white/60 animate-bounce delay-300"></span>
                                </div>
                                Stop Audio
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                                  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                                  <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182l-.707.707A3.489 3.489 0 0 1 9.025 8a3.489 3.489 0 0 1-1.025 2.475l.707.707z"/>
                                  <path d="M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4z"/>
                                </svg>
                                Play Audio
                              </>
                            )}
                          </button>

                          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-full px-4 py-3 gap-2">
                             <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter">Environment</span>
                             <select 
                                value={selectedAmbience}
                                onChange={(e) => setSelectedAmbience(e.target.value)}
                                className="bg-transparent text-cyan-500 text-xs font-bold outline-none cursor-pointer focus:text-cyan-400"
                             >
                                {AMBIENCE_OPTIONS.map(opt => (
                                  <option key={opt} value={opt} className="bg-stone-900">{opt}</option>
                                ))}
                             </select>
                          </div>

                          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-full px-4 py-3 gap-2">
                             <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter">Speed</span>
                             <select 
                                value={playbackSpeed}
                                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                className="bg-transparent text-cyan-500 text-xs font-bold outline-none cursor-pointer focus:text-cyan-400"
                             >
                                <option value="0.75" className="bg-stone-900">0.75x</option>
                                <option value="1.0" className="bg-stone-900">1.0x</option>
                                <option value="1.25" className="bg-stone-900">1.25x</option>
                                <option value="1.5" className="bg-stone-900">1.5x</option>
                             </select>
                          </div>

                          <button 
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex items-center gap-3 px-6 py-3 rounded-full font-semibold bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800 transition-all shadow-lg active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                            </svg>
                            Share
                          </button>
                        </div>
                        <div className="flex items-center gap-2 px-2">
                           <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                           <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">MEEDEE Atmospheric Engine Active</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-stone-800 rounded w-3/4"></div>
                      <div className="h-4 bg-stone-800 rounded w-full"></div>
                      <div className="h-4 bg-stone-800 rounded w-5/6"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar - Chat Interface */}
      <aside className="w-full md:w-80 lg:w-96 flex-shrink-0">
        <ChatSidebar storyContext={story} />
      </aside>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xl" onClick={() => setIsShareModalOpen(false)}></div>
          <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
              <h2 className="text-xl font-serif italic text-cyan-500">Share Sequence</h2>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <img 
                  src={image || ''} 
                  alt="Story Inspiration" 
                  className="w-full md:w-1/3 aspect-[4/3] object-cover rounded-xl border border-stone-800 shadow-lg"
                />
                <div className="flex-1 space-y-4">
                  <h3 className="text-stone-500 uppercase tracking-widest text-[10px] font-bold">The Narrative</h3>
                  <div className="relative">
                    <svg className="absolute -left-4 -top-1 w-8 h-8 text-stone-800 -z-10" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H6c0-2.2 1.8-4 4-4V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-8c0-2.2 1.8-4 4-4V8z"/>
                    </svg>
                    <p className="font-serif text-lg leading-relaxed text-stone-300">
                      {story}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <p className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">Digital Export</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handleCopyStory}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {copySuccess ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                          <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 1 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                        Copy Narrative
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'MEEDEE-AI Cinematic Export',
                          text: story,
                          url: window.location.href,
                        }).catch(console.error);
                      }
                    }}
                    className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                    </svg>
                    Mobile Share
                  </button>
                </div>
              </div>
            </div>

            <footer className="p-6 border-t border-stone-800 text-center bg-stone-900/80">
              <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Rendered with MEEDEE-AI Cinematic Engine</p>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

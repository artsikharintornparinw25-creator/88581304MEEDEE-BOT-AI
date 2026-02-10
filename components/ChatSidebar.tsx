
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { createStoryChat, generatePlotSuggestions } from '../services/geminiService';

interface ChatSidebarProps {
  storyContext: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ storyContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize and restore chat history
  useEffect(() => {
    const savedChat = localStorage.getItem('meedee_chat');
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error("Failed to restore chat", e);
      }
    }
  }, []);

  useEffect(() => {
    if (storyContext) {
      const systemPrompt = `You are MEEDEE-AI, a cinematic writing assistant. The user has generated a story sequence: "${storyContext}". Help the user explore this world, brainstorm characters, or expand the plot. Be atmospheric, slightly professional but highly creative. If the user picks a plot twist, weave it naturally into the ongoing story discussion.`;
      chatRef.current = createStoryChat(systemPrompt);
    }
  }, [storyContext]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('meedee_chat', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = createStoryChat(`You are MEEDEE-AI. Help the user write a story.`);
      }
      const response = await chatRef.current.sendMessage({ message: textToSend });
      const modelMsg: Message = { role: 'model', text: response.text || "I'm calculating the next narrative beat..." };
      setMessages(prev => [...prev, modelMsg]);
      // Clear suggestions after a choice is made
      if (customText) setSuggestions([]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Signal interference. Please retry the narrative link." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!storyContext || isSuggesting) return;
    setIsSuggesting(true);
    try {
      const twists = await generatePlotSuggestions(storyContext);
      setSuggestions(twists);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border-l border-stone-800 shadow-2xl">
      <div className="p-4 border-b border-stone-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Sequence Explorer</h2>
        {storyContext && (
          <button 
            onClick={handleGetSuggestions}
            disabled={isSuggesting}
            className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 border border-cyan-600/30 text-cyan-500 rounded hover:bg-cyan-600/10 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
            </svg>
            Plot Twists
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-stone-500 text-sm italic text-center py-8 px-4">
            Initialize the explorer to brainstorm characters, setting details, or plot advancement.
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-cyan-700 text-white' 
                : 'bg-stone-800 text-stone-200 border border-stone-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-800 text-cyan-500 rounded-2xl px-4 py-2 text-xs animate-pulse font-mono uppercase tracking-tighter">
              MEEDEE Processing...
            </div>
          </div>
        )}

        {suggestions.length > 0 && !isLoading && (
          <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-[10px] uppercase font-bold text-cyan-700 tracking-widest ml-1">Narrative Vectors</p>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(`Explore narrative vector: "${suggestion}"`)}
                className="w-full text-left p-3 rounded-xl bg-cyan-600/5 border border-cyan-600/20 text-stone-300 text-xs hover:bg-cyan-600/10 hover:border-cyan-600/40 hover:text-white transition-all group"
              >
                <span className="text-cyan-600 group-hover:text-cyan-400 mr-2 font-bold italic">»</span>
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        {isSuggesting && (
          <div className="space-y-2 pt-2">
            <div className="h-10 bg-stone-800/50 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-stone-800/50 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-stone-800/50 rounded-xl animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="p-4 bg-stone-900/50 backdrop-blur-sm border-t border-stone-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Transmit query..."
            className="w-full bg-stone-800 border border-stone-700 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 transition-all placeholder-stone-600 text-stone-200"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 h-8 w-8 bg-cyan-600 hover:bg-cyan-500 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:shadow-cyan-600/20 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

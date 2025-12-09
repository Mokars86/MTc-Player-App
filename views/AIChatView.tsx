import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icon';
import { MediaItem } from '../types';
import { chatWithMusicGenius, ChatMessage } from '../services/geminiService';

interface AIChatViewProps {
  currentTrack: MediaItem | null;
}

const AIChatView: React.FC<AIChatViewProps> = ({ currentTrack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm your Music Genius. Ask me about the current track, music history, or get fresh recommendations." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Get response
    // Pass previous messages as history (excluding the very last one we just added to state, 
    // but the service takes the full history including the new prompt usually, 
    // here we will pass the history *before* the current prompt to the chat init, 
    // but our service wrapper takes the prompt separately. 
    // So we pass 'messages' (current state before this update) as history.
    
    const responseText = await chatWithMusicGenius(messages, input, currentTrack);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Tell me about this artist",
    "Meaning of these lyrics?",
    "Suggest 3 songs like this",
    "Who is the producer?"
  ];

  return (
    <div className="p-6 pb-24 h-full flex flex-col animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 border-b border-app-border pb-4">
        <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-brand-light shadow-[0_0_15px_rgba(13,148,136,0.5)]">
          <Icons.Wand2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app-text">Music Genius</h1>
          <p className="text-xs text-brand-light flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online & Listening
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-brand-DEFAULT text-white rounded-br-none' 
                  : 'bg-app-card text-app-text rounded-bl-none border border-app-border'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-app-card border border-app-border px-4 py-3 rounded-2xl rounded-bl-none flex gap-1 items-center">
              <span className="w-2 h-2 bg-app-subtext rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-app-subtext rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-app-subtext rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (Only show if history is short or context changes) */}
      {currentTrack && messages.length < 3 && !isTyping && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar">
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              onClick={() => { setInput(s); }}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-app-surface border border-app-border text-xs text-app-subtext hover:border-brand-accent hover:text-brand-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentTrack ? `Ask about "${currentTrack.title}"...` : "Ask about music..."}
          className="w-full bg-app-surface border border-app-border rounded-xl pl-4 pr-12 py-3.5 text-app-text focus:outline-none focus:ring-2 focus:ring-brand-accent shadow-lg"
          disabled={isTyping}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="absolute right-2 top-2 p-1.5 rounded-lg bg-brand-accent text-white hover:bg-brand-light disabled:opacity-50 disabled:hover:bg-brand-accent transition-all"
        >
          <Icons.Play className="w-5 h-5 fill-current" />
        </button>
      </div>
    </div>
  );
};

export default AIChatView;
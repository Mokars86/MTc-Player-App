import React, { useState } from 'react';
import { Icons } from '../components/Icon';
import { MOODS } from '../constants';
import { generatePlaylistByMood, hasApiKey } from '../services/geminiService';

interface HomeViewProps {
  onPlayDemo: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onPlayDemo }) => {
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    setLoading(true);
    const result = await generatePlaylistByMood(mood);
    try {
      const parsed = JSON.parse(result);
      setAiSuggestions(parsed);
    } catch (e) {
      console.error("Failed to parse AI response", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-32 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-app-text">
            Good Evening
          </h1>
          <p className="text-brand-light text-sm mt-1">Ready for your session?</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-brand-dark overflow-hidden border-2 border-brand-accent">
          <img src="https://picsum.photos/100/100" alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Mood Selector */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Icons.Wand2 className="w-5 h-5 text-brand-accent" />
          <h2 className="text-xl font-semibold text-app-text">Mood Station</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MOODS.map((m) => (
                <button 
                    key={m.label}
                    onClick={() => handleMoodSelect(m.label)}
                    className={`relative overflow-hidden rounded-xl h-24 p-4 flex flex-col justify-end transition-transform transform hover:scale-105 active:scale-95 ${selectedMood === m.label ? 'ring-2 ring-brand-light' : ''}`}
                >
                    <div className={`absolute inset-0 ${m.color} opacity-90 z-0`}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0"></div>
                    <span className="relative z-10 text-2xl mb-1">{m.icon}</span>
                    <span className="relative z-10 font-bold text-white">{m.label}</span>
                </button>
            ))}
        </div>
      </section>

      {/* AI Results */}
      {loading && (
        <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
            <span className="ml-3 text-brand-light animate-pulse">Consulting AI DJ...</span>
        </div>
      )}

      {aiSuggestions && !loading && (
        <section className="glass-panel rounded-2xl p-4 border-app-border border shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-app-text">AI Recommended for "{selectedMood}"</h2>
                <button 
                    onClick={() => setAiSuggestions(null)} 
                    className="text-xs text-app-subtext hover:text-brand-light"
                >
                    Clear
                </button>
             </div>
             <div className="space-y-3">
                {aiSuggestions.map((track, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-app-text/5 rounded-lg group cursor-pointer" onClick={onPlayDemo}>
                        <div className="w-10 h-10 rounded bg-brand-dark/50 flex items-center justify-center text-brand-light font-bold">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-sm text-app-text group-hover:text-brand-accent">{track.title}</h3>
                            <p className="text-xs text-app-subtext">{track.artist}</p>
                        </div>
                        <p className="text-xs text-app-subtext italic hidden sm:block">"{track.reason}"</p>
                        <button className="p-2 rounded-full hover:bg-brand-accent/20 text-brand-accent">
                            <Icons.Play className="w-4 h-4" />
                        </button>
                    </div>
                ))}
             </div>
             {!hasApiKey() && <p className="text-xs text-red-400 mt-2 text-center">API Key not detected. Using mock generation logic in production.</p>}
        </section>
      )}

      {/* For You */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-app-text">Made For You</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
            {['Weekly Discovery', 'Chill Mix 2024', 'Gym Beast Mode', 'Late Night Lo-Fi'].map((title, i) => (
                <div key={i} className="min-w-[160px] flex flex-col group cursor-pointer">
                    <div className="w-40 h-40 bg-app-card rounded-lg overflow-hidden mb-2 relative border border-app-border shadow-sm">
                        <img src={`https://picsum.photos/300/300?random=${i + 10}`} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
                        <div className="absolute inset-0 bg-brand-DEFAULT/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icons.Play className="text-white fill-white w-10 h-10 drop-shadow-lg" />
                        </div>
                    </div>
                    <span className="font-medium text-sm truncate text-app-text group-hover:text-brand-light">{title}</span>
                    <span className="text-xs text-app-subtext">By MTc AI</span>
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default HomeView;
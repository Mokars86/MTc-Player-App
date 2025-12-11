
import React, { useState } from 'react';
import { Icons } from '../components/Icon';
import { MOODS } from '../constants';
import { generatePlaylistByMood, hasApiKey } from '../services/geminiService';

interface HomeViewProps {
  onPlayDemo: () => void;
  onOpenProfile: () => void;
  userName: string;
  isOnline: boolean;
}

const HomeView: React.FC<HomeViewProps> = ({ onPlayDemo, onOpenProfile, userName, isOnline }) => {
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleMoodSelect = async (mood: string) => {
    if (!isOnline) return;
    setSelectedMood(mood);
    setLoading(true);
    setAiSuggestions(null); // Reset previous suggestions
    
    const result = await generatePlaylistByMood(mood);
    try {
      const parsed = JSON.parse(result);
      // Simulate network delay for effect if result is instant (optional)
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
            Good Evening, {userName.split(' ')[0]}
          </h1>
          <p className="text-brand-light text-sm mt-1">{isOnline ? "Ready for your session?" : "Offline Mode Active"}</p>
        </div>
        <button onClick={onOpenProfile} className="w-10 h-10 rounded-full bg-brand-dark overflow-hidden border-2 border-brand-accent hover:scale-105 transition-transform shadow-lg cursor-pointer">
          <img src={`https://ui-avatars.com/api/?name=${userName}&background=0d9488&color=fff`} alt="Profile" className="w-full h-full object-cover" />
        </button>
      </div>

      {/* Mood Selector */}
      <section>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Icons.Wand2 className={`w-5 h-5 ${isOnline ? 'text-brand-accent' : 'text-gray-500'}`} />
                <h2 className={`text-xl font-semibold ${isOnline ? 'text-app-text' : 'text-gray-500'}`}>Mood Station {isOnline ? '' : '(Offline)'}</h2>
            </div>
            {!isOnline && <span className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-full bg-red-500/10">Internet required</span>}
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${!isOnline ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            {MOODS.map((m) => (
                <button 
                    key={m.label}
                    onClick={() => handleMoodSelect(m.label)}
                    disabled={loading || !isOnline}
                    className={`relative overflow-hidden rounded-xl h-24 p-4 flex flex-col justify-end transition-transform transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${selectedMood === m.label ? 'ring-2 ring-brand-light' : ''}`}
                >
                    <div className={`absolute inset-0 ${m.color} opacity-90 z-0`}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0"></div>
                    <span className="relative z-10 text-2xl mb-1">{m.icon}</span>
                    <span className="relative z-10 font-bold text-white">{m.label}</span>
                </button>
            ))}
        </div>
      </section>

      {/* AI Results Section */}
      {(loading || aiSuggestions) && (
        <section className="glass-panel rounded-2xl p-4 border-app-border border shadow-sm animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-app-text">
                   {loading ? `Consulting AI for "${selectedMood}"...` : `AI Recommended for "${selectedMood}"`}
                </h2>
                {!loading && (
                    <button onClick={() => setAiSuggestions(null)} className="text-xs text-app-subtext hover:text-brand-light">Clear</button>
                )}
             </div>
             
             <div className="space-y-3">
                {loading ? (
                    // Skeleton Loading State
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                            <div className="w-10 h-10 rounded bg-app-card animate-pulse"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-app-card rounded w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-app-card rounded w-1/2 animate-pulse"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    aiSuggestions && aiSuggestions.map((track, idx) => (
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
                    ))
                )}
             </div>
             {!loading && !hasApiKey() && <p className="text-xs text-red-400 mt-2 text-center">API Key not detected. Using mock generation logic in production.</p>}
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

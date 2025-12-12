
import { GoogleGenAI } from "@google/genai";
import { MediaItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to check if API key is present
export const hasApiKey = () => !!process.env.API_KEY;

export const generatePlaylistByMood = async (mood: string): Promise<string> => {
  if (!hasApiKey()) return "API Key missing. Cannot generate playlist.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Suggest a playlist of 5 songs for a "${mood}" mood. Return a JSON array of objects with 'title', 'artist', and a short 'reason' why it fits. Do not include markdown formatting like \`\`\`json.`,
      config: {
        responseMimeType: 'application/json'
      }
    });
    return response.text || "[]";
  } catch (error) {
    console.error("Gemini Playlist Error:", error);
    return "[]";
  }
};

export const getSmartSummary = async (text: string): Promise<string> => {
    if (!hasApiKey()) return "API Key missing.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following podcast transcript into 3 key bullet points:\n\n${text}`
        });
        return response.text || "Could not generate summary.";
    } catch (error) {
        console.error("Gemini Summary Error:", error);
        return "Could not generate summary.";
    }
};

export const translateLyrics = async (lyrics: string, targetLang: string = 'English'): Promise<string> => {
    if (!hasApiKey()) return lyrics; // Fallback

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following lyrics to ${targetLang}. Maintain the rhythm and line breaks if possible:\n\n${lyrics}`
        });
        return response.text || lyrics;
    } catch (error) {
        console.error("Gemini Translate Error:", error);
        return lyrics;
    }
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const chatWithMusicGenius = async (history: ChatMessage[], message: string, currentTrack?: MediaItem | null): Promise<string> => {
  if (!hasApiKey()) return "I need an API Key to function. Please configure it in your environment.";

  try {
    const contextPrompt = currentTrack 
      ? `The user is currently listening to "${currentTrack.title}" by "${currentTrack.artist}" (Type: ${currentTrack.type}). Use this context if they ask about "this song" or "this artist". `
      : `The user is not playing any music right now. `;

    const systemInstruction = `You are the "MTc Music Genius", an expert AI music historian, critic, and DJ. 
    Your tone is sophisticated, enthusiastic, and concise. 
    ${contextPrompt}
    Answer music-related questions, explain lyrics, or suggest similar artists. 
    Keep responses under 100 words unless asked for a deep dive.`;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't think of a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to the music knowledge base right now.";
  }
};
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface PodcastScript { title: string; hostName: string; content: string; }
export interface GroundingSource { title: string; uri: string; }

export async function generatePodcastScript(topic: string, language: string, depth: 'Resume' | 'Diskussion' | 'Deepdive', duration: number): Promise<{ script: PodcastScript; sources: GroundingSource[] }> {
  const depthPrompt = {
    'Resume': `Et kort og præcist overblik. Fokuser på de vigtigste pointer. Længden skal svare til ca. ${duration} minutters tale.`,
    'Diskussion': `En nuanceret debat, der belyser fordele og ulemper fra flere perspektiver. Længden skal svare til ca. ${duration} minutters tale.`,
    'Deepdive': `En omfattende og detaljeret analyse med dybdegående forklaringer og kontekst. Længden skal svare til ca. ${duration} minutters tale.`
  }[depth];

  const systemInstruction = `Du er en professionel podcast-vært. Generer et manuskript til en podcast-episode baseret på brugerens input. Sprog: ${language}. Dybde: ${depthPrompt}. Format: JSON. Podcasten skal have én enkelt AI-vært. Brug googleSearch værktøjet til at finde faktuelle oplysninger og kilder.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Emne/Tekst: ${topic}`,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, hostName: { type: Type.STRING }, content: { type: Type.STRING } },
        required: ["title", "hostName", "content"]
      }
    }
  });

  const script: PodcastScript = JSON.parse(response.text);
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) { sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri }); }
    });
  }
  const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
  return { script, sources: uniqueSources };
}

export async function generateSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO" as any],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) { throw new Error("Ingen lyd genereret"); }
  return base64Audio;
}

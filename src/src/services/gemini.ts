import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const generatePodcastContent = async (topic: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Lav et detaljeret podcast-manuskript om emnet: ${topic}.` }] }],
    });
    return response.text;
  } catch (error) {
    console.error("Fejl:", error);
    throw error;
  }
};

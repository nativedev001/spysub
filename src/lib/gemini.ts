// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai"

export const createGeminiClient = (modelName: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

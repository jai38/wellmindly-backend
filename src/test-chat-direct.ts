import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './config/env';

async function run() {
  if (!env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from environment");
    return;
  }
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  
  const systemInstruction = `You are a warm, calm senior companion. Do not use the word "wellness".`;
  
  try {
    console.log("Initializing model with systemInstruction...");
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });
    
    console.log("Starting chat session...");
    const chat = model.startChat();
    
    console.log("Sending chat message...");
    const result = await chat.sendMessage("Hi, I haven't slept for 2 days. What should I do?");
    console.log("✅ Success! Response:", result.response.text());
  } catch (err: any) {
    console.error("❌ Failed chat session on Gemma model:", err.message || err);
  }
}

run().catch(console.error);

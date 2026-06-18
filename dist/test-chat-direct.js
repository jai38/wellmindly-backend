"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("./config/env");
async function run() {
    if (!env_1.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is missing from environment");
        return;
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
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
    }
    catch (err) {
        console.error("❌ Failed chat session on Gemma model:", err.message || err);
    }
}
run().catch(console.error);

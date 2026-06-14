"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeminiClient = getGeminiClient;
exports.getGeminiChatSession = getGeminiChatSession;
exports.generateQuizFeedback = generateQuizFeedback;
exports.parseStoredClassification = parseStoredClassification;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
// Initialize the Gemini API client if API key is provided
let genAI = null;
if (env_1.env.GEMINI_API_KEY) {
    genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
}
/**
 * Gets the raw GoogleGenerativeAI client instance.
 * Useful for future integrations like WriteMindly chat sessions.
 */
function getGeminiClient() {
    return genAI;
}
/**
 * Returns a new chat session for conversation-based features.
 * Can be reused in future chat integrations like WriteMindly.
 */
function getGeminiChatSession(systemInstruction) {
    if (!genAI) {
        throw new Error('Gemini API client is not initialized. Please set GEMINI_API_KEY.');
    }
    const model = genAI.getGenerativeModel({
        model: env_1.env.GEMINI_MODEL || 'gemini-2.5-flash',
        systemInstruction,
    });
    return model.startChat();
}
/**
 * Generates custom, brand-aligned feedback for a quiz result using Gemini.
 * Falls back to null if Gemini is disabled or fails.
 */
async function generateQuizFeedback(quizTitle, category, overallScore, maxScore, classification) {
    if (!genAI) {
        console.log('Gemini API key is not configured. Falling back to static client responses.');
        return null;
    }
    const modelName = env_1.env.GEMINI_MODEL || 'gemini-2.5-flash';
    try {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: 'application/json',
            },
            systemInstruction: `You are an AI assistant helping a student understand their self-reflection quiz results.
Speak in the WellMindly brand voice:
- Tone: A thoughtful older friend who actually gets it.
- Style: Short sentences. Plain words. No wellness-speak.
- STRICT BANNED WORDS: NEVER use the words "journey", "wellness", "mental health", "transform", "empower", "resilience". If you need to refer to these, describe the feeling instead (e.g. "how you are doing", "feeling steady", "handling stress", "getting clearer").
- Realism: Don't cheerlead. Don't end every line on hope. Sit in the reality of the feeling first. Describe the feeling, not the symptom (e.g. "can't switch off" instead of "anxiety").
- Promises: Promise less than you can deliver. Use words like "clearer" (never "better"), "a bit" (never "a lot"), or "understand" (never "fix/cure").

You must return a valid JSON object matching this schema:
{
  "headline": "A short, warm, non-clinical title (e.g., 'When everything feels urgent...' or 'Doing it your own way')",
  "narrative": "A personal, supportive reflection of 2-3 short, clean sentences explaining what they might be feeling or carrying based on their result.",
  "tip": "One practical, low-effort advice action (e.g., 'Commit to just five minutes. Starting is the hard part, not finishing.')",
  "insights": [
    "A brand-aligned detailed observation about what they might be carrying (e.g., 'Saying yes to everyone else leaves you with a very quiet battery for yourself.')",
    "Another brand-aligned detailed insight based on their specific score/answers (e.g., 'Sleep has felt less like actual rest and more like just switching off the lights.')"
  ]
}`,
        });
        const prompt = `
Quiz Title: ${quizTitle}
Category/Focus: ${category}
User Result Summary / Classification: ${classification}
Overall Score: ${overallScore} out of ${maxScore}

Provide personalized, brand-aligned feedback based on this result.`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (!text) {
            return null;
        }
        const feedback = JSON.parse(text);
        // Safety check for empty or incorrect JSON fields
        if (feedback.headline && feedback.narrative && feedback.tip && Array.isArray(feedback.insights)) {
            return feedback;
        }
        return null;
    }
    catch (error) {
        console.error('Error generating AI quiz feedback with Gemini:', error);
        return null;
    }
}
/**
 * Parses classification field from database.
 * If serialized JSON (with aiFeedback), extracts clean classification and aiFeedback object.
 * Otherwise returns the raw value as classification.
 */
function parseStoredClassification(val) {
    if (val && val.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
                return {
                    classification: parsed.classification || 'Completed',
                    aiFeedback: parsed.aiFeedback,
                    answers: parsed.answers || null,
                };
            }
        }
        catch (e) {
            // Ignore and fallback
        }
    }
    return { classification: val };
}

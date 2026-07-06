"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("./utils/ai");
const env_1 = require("./config/env");
async function test() {
    console.log("GEMINI_API_KEY exists:", !!env_1.env.GEMINI_API_KEY);
    console.log("GEMINI_MODEL:", env_1.env.GEMINI_MODEL);
    const testPhrases = [
        "fu*k me",
        "anyone wanna fu*k me?",
        "this is the most f**ked platform",
        "I am feeling very tired and stressed about my CS exam",
    ];
    for (const content of testPhrases) {
        console.log(`\nEvaluating: "${content}"`);
        try {
            const res = await (0, ai_1.evaluateContentSafety)(content);
            console.log("Result:", JSON.stringify(res, null, 2));
        }
        catch (e) {
            console.error("Evaluation threw error:", e.message || e);
        }
    }
}
test();

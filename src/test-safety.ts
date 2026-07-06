import { evaluateContentSafety } from './utils/ai';
import { env } from './config/env';

async function test() {
  console.log("GEMINI_API_KEY exists:", !!env.GEMINI_API_KEY);
  console.log("GEMINI_MODEL:", env.GEMINI_MODEL);

  const testPhrases = [
    "fu*k me",
    "anyone wanna fu*k me?",
    "this is the most f**ked platform",
    "I am feeling very tired and stressed about my CS exam",
  ];

  for (const content of testPhrases) {
    console.log(`\nEvaluating: "${content}"`);
    try {
      const res = await evaluateContentSafety(content);
      console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e: any) {
      console.error("Evaluation threw error:", e.message || e);
    }
  }
}

test();

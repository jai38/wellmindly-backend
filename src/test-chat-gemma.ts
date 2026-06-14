import { env } from './config/env';

async function run() {
  if (!env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from environment");
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
  console.log("Fetching Gemma model IDs from URL...");
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data.error) {
      console.error("API Error:", data.error);
      return;
    }
    
    if (data.models) {
      const gemmaModels = data.models.filter((m: any) => m.name.toLowerCase().includes('gemma'));
      console.log(`\nFound ${gemmaModels.length} Gemma models:\n`);
      for (const m of gemmaModels) {
        console.log(`- name: ${m.name}`);
        console.log(`  displayName: ${m.displayName}`);
        console.log(`  description: ${m.description.substring(0, 100)}...`);
        console.log('---');
      }
    } else {
      console.log("No models returned in response:", data);
    }
  } catch (err) {
    console.error("Fetch request failed:", err);
  }
}

run().catch(console.error);

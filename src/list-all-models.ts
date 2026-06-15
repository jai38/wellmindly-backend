import { env } from './config/env';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment");
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log("Fetching all model IDs from URL...");
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data.error) {
      console.error("API Error:", data.error);
      return;
    }
    
    if (data.models) {
      console.log(`\nFound ${data.models.length} models:\n`);
      for (const m of data.models) {
        console.log(`- name: ${m.name}`);
        console.log(`  displayName: ${m.displayName}`);
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

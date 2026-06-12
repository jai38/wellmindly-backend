import { generateQuizFeedback } from './utils/ai';

async function testFeedback() {
  console.log('Testing generateQuizFeedback with sample data...');
  try {
    const feedback = await generateQuizFeedback(
      'Managing Work Pressure',
      'Stress & Coping',
      8,
      10,
      'High stress and feeling overwhelmed'
    );
    console.log('Result:', JSON.stringify(feedback, null, 2));
  } catch (err: any) {
    console.error('Test failed:', err);
  }
}

testFeedback();

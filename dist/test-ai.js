"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("./utils/ai");
async function testFeedback() {
    console.log('Testing generateQuizFeedback with sample data...');
    try {
        const feedback = await (0, ai_1.generateQuizFeedback)('Managing Work Pressure', 'Stress & Coping', 8, 10, 'High stress and feeling overwhelmed');
        console.log('Result:', JSON.stringify(feedback, null, 2));
    }
    catch (err) {
        console.error('Test failed:', err);
    }
}
testFeedback();

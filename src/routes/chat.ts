import { Router, Request, Response } from 'express';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { getGeminiClient } from '../utils/ai';
import { env } from '../config/env';
import prisma from '../lib/prisma';

const router = Router();

// Helper to determine daily limit based on the model in use to support 100 users daily
function getMaxRequestsForModel(modelName: string): number {
  const name = modelName.toLowerCase();
  if (name.includes('pro')) {
    return 10; // 1K limit / 100 users = 10
  }
  if (name.includes('lite')) {
    return 100; // Unlimited or very high limit
  }
  if (name.includes('gemma')) {
    return 10;
  }
  return 100; // 10K limit / 100 users = 100 (gemini-3.5-flash, gemini-2.5-flash)
}

// Helper to calculate total user requests today
async function getDailyRequestsUsed(userId: string): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return await prisma.chatMessage.count({
    where: {
      userId,
      sender: 'USER',
      createdAt: {
        gte: startOfToday,
      },
      message: {
        startsWith: 'WriteMindly User Message',
      },
    },
  });
}

// System instruction for WriteMindly
const SYSTEM_INSTRUCTION = `You are a warm, calm, and grounded senior companion or mentor for a student.
Speak in the WellMindly brand voice:
- Tone: A thoughtful older friend / senior peer who actually gets it and is here to listen. Like a calm, steady companion sitting next to them. Reassure them that things will be fine, but sit in the reality of their feelings first without over-cheerleading.
- Style: Keep your responses relatively short, conversational, and direct. Plain words. No therapist or wellness-speak.
- STRICT BANNED WORDS: NEVER use the words "journey", "wellness", "mental health", "transform", "empower", "resilience". If you need to refer to these, describe the feeling instead (e.g. "how you are doing", "feeling steady", "handling stress", "getting clearer").
- Realism: Don't cheerlead. Don't end every line on forced hope. Acknowledge the weight of what they are carrying. Use words like "clearer" (never "better"), "a bit" (never "a lot"), or "understand" (never "fix/cure").
- Purpose: Be a comforting companion who listens and offers gentle, practical, low-effort suggestions to help them relax or handle the situation. Don't just mirror or repeat back their symptoms; instead, suggest simple, realistic actions they can take to find some calm (e.g., closing their eyes for 5 minutes, stepping outside for fresh air, putting the phone face down, or letting go of one minor task for tonight). Keep advice incredibly small, plain, and grounded.`;

// Get or initialize a session (Calculated dynamically per User)
router.get(
  '/session/:sessionId',
  authenticateJWT,
  authorizeRoles('STUDENT', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'User ID missing from token' });
        return;
      }

      const dailyRequestsUsed = await getDailyRequestsUsed(userId);
      const modelName = env.GEMINI_MODEL || 'gemini-3.5-flash';
      const maxRequests = getMaxRequestsForModel(modelName);
      const remainingPercent = Math.max(0, 100 - Math.round((dailyRequestsUsed / maxRequests) * 100));

      res.status(200).json({
        sessionId: req.params.sessionId,
        tokensUsed: dailyRequestsUsed,
        maxTokens: maxRequests,
        remainingPercent,
      });
    } catch (err) {
      console.error('Error fetching session details:', err);
      res.status(500).json({ error: 'Failed to fetch session details' });
    }
  }
);

// Process a message
router.post(
  '/message',
  authenticateJWT,
  authorizeRoles('STUDENT', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'User ID missing from token' });
        return;
      }

      const { sessionId, message, history = [] } = req.body as {
        sessionId: string;
        message: string;
        history: { sender: 'user' | 'model'; text: string }[];
      };

      if (!sessionId || !message) {
        res.status(400).json({ error: 'Session ID and message are required' });
        return;
      }

      const modelName = env.GEMINI_MODEL || 'gemini-3.5-flash';
      const maxRequests = getMaxRequestsForModel(modelName);
      const dailyRequestsUsed = await getDailyRequestsUsed(userId);
      let remainingPercent = Math.max(0, 100 - Math.round((dailyRequestsUsed / maxRequests) * 100));

      // If no capacity remaining, return static fallback
      if (remainingPercent <= 0) {
        // Log static placeholder usage in DB (anonymized) to ensure daily limit is recorded
        await prisma.chatMessage.create({
          data: {
            userId,
            sender: 'USER',
            message: 'WriteMindly User Message (Limit Exceeded)',
          },
        });

        await prisma.chatMessage.create({
          data: {
            userId,
            sender: 'AI',
            message: 'WriteMindly AI Response (Limit Exceeded)',
          },
        });

        res.status(200).json({
          response: "I think we've covered a lot today. Let's take a deep breath, stretch, and sit with these feelings for a moment. You're doing okay.",
          remainingPercent: 0,
          tokensUsed: dailyRequestsUsed,
        });
        return;
      }

      // Log user message in DB
      await prisma.chatMessage.create({
        data: {
          userId,
          sender: 'USER',
          message: 'WriteMindly User Message',
        },
      });

      let replyText = "";
      try {
        const genAI = getGeminiClient();
        if (!genAI) {
          throw new Error('Gemini API key is not configured');
        }

        // Sequential fallback list
        const modelsToTry = Array.from(new Set([
          env.GEMINI_MODEL || 'gemini-3.5-flash',
          'gemini-3.5-flash',
          'gemini-2.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-2.5-pro'
        ]));

        let apiSuccess = false;
        let lastError: any = null;

        for (const modelName of modelsToTry) {
          try {
            console.log(`[WriteMindly] Attempting chat response using model: ${modelName}`);
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: SYSTEM_INSTRUCTION,
            });

            // Convert incoming history to Gemini history format (excluding current message)
            const geminiHistory = history.map((h) => ({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: h.text }],
            }));

            const chat = model.startChat({
              history: geminiHistory,
            });

            const result = await chat.sendMessage(message);
            replyText = result.response.text();
            
            if (replyText) {
              console.log(`[WriteMindly] ✅ Success! Response generated using model: ${modelName}`);
              apiSuccess = true;
              break;
            }
          } catch (modelError: any) {
            console.warn(`[WriteMindly] ⚠️ Model ${modelName} call failed or quota exceeded:`, modelError.message || modelError);
            lastError = modelError;
            // Continue to the next model in the fallback array
          }
        }

        if (!apiSuccess) {
          throw lastError || new Error('All configured models failed to generate response');
        }
      } catch (apiError) {
        console.error('All model attempts failed in fallback chain, falling back to static response:', apiError);
        replyText = "I hear you, and it's completely okay to feel this way. Things might feel heavy right now, but I'm here sitting with you. Let's take a slow breath. You're going to be fine.";
      }

      // Log AI response in DB
      await prisma.chatMessage.create({
        data: {
          userId,
          sender: 'AI',
          message: 'WriteMindly AI Response',
        },
      });

      const updatedRequestsUsed = dailyRequestsUsed + 1;
      remainingPercent = Math.max(0, 100 - Math.round((updatedRequestsUsed / maxRequests) * 100));

      res.status(200).json({
        response: replyText,
        remainingPercent,
        tokensUsed: updatedRequestsUsed,
      });
    } catch (error) {
      console.error('Error in WriteMindly chat route:', error);
      res.status(500).json({ error: 'An error occurred while generating the response' });
    }
  }
);

// Clear/delete a session (Stateless now, return success)
router.delete(
  '/session/:sessionId',
  authenticateJWT,
  authorizeRoles('STUDENT', 'ADMIN'),
  async (_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }
);

export default router;

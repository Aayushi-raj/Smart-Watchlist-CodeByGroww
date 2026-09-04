import { ChangeEvent, Stock } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../db';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface InsightResult {
  id: string;
  changeEventId: string;
  summary: string;
  explanation: string;
  modelVersion: string | null;
  generatedAt: Date;
}

export async function generateInsightForEvent(
  changeEvent: ChangeEvent & { stock: Stock },
  contextData: {
    percentageChange: number;
    absoluteChange: number;
    lastSeenTimestamp: Date;
    volume: number;
    score: number;
  }
): Promise<InsightResult> {
  // Return cached insight if already generated for this event
  const existingInsight = await prisma.insight.findFirst({
    where: { changeEventId: changeEvent.id },
  });
  if (existingInsight) return existingInsight;

  if (!genAI) {
    return generateDeterministicFallback(changeEvent, contextData);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const hoursAway = Math.round(
      (Date.now() - new Date(contextData.lastSeenTimestamp).getTime()) / (1000 * 60 * 60)
    );
    const direction = contextData.percentageChange >= 0 ? 'up' : 'down';

    const prompt = `
You are a financial analysis assistant for a Smart Market Watchlist.
A user returned to their watchlist and the system detected a meaningful change.

FACTS (use ONLY these — do not fabricate):
- Stock: ${changeEvent.stock.companyName} (${changeEvent.stock.symbol})
- Price moved: ${direction} ${Math.abs(contextData.percentageChange).toFixed(2)}% since the user last checked
- Absolute change: ₹${Math.abs(contextData.absoluteChange).toFixed(2)}
- User was away for approximately: ${hoursAway} hour(s)
- Current trading volume: ${contextData.volume.toLocaleString()}
- Anomaly severity: ${changeEvent.severity} (score: ${contextData.score}/100)
- Event type: ${changeEvent.eventType}

Format your response EXACTLY like this (use these exact section headers):

WHAT HAPPENED
[One sentence: what the price did, in plain language, anchored to when the user last checked.]

WHY WE FLAGGED IT
[One to two sentences: why the system classified this as ${changeEvent.severity}. Mention price movement and/or volume if relevant.]

POSSIBLE CONTEXT
[One sentence: what kind of market events typically cause this pattern. Be generic and factual — do NOT reference specific news.]

WHAT TO WATCH NEXT
[One sentence: what the user should monitor over the next few sessions.]

RULES: Do NOT give buy or sell advice. Do NOT predict specific future prices. Only use the facts above.
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const newInsight = await prisma.insight.create({
      data: {
        changeEventId: changeEvent.id,
        summary: `${changeEvent.stock.symbol} — ${changeEvent.severity} (${Math.abs(contextData.percentageChange).toFixed(2)}% move)`,
        explanation: text,
        modelVersion: 'gemini-1.5-flash',
      },
    });

    return newInsight;
  } catch (error) {
    console.error('[InsightEngine] Gemini generation failed, using deterministic fallback.', error);
    return generateDeterministicFallback(changeEvent, contextData);
  }
}

async function generateDeterministicFallback(
  changeEvent: ChangeEvent & { stock: Stock },
  contextData: {
    percentageChange: number;
    absoluteChange: number;
    lastSeenTimestamp: Date;
    volume: number;
    score: number;
  }
): Promise<InsightResult> {
  const direction = contextData.percentageChange >= 0 ? 'risen' : 'fallen';
  const hoursAway = Math.round(
    (Date.now() - new Date(contextData.lastSeenTimestamp).getTime()) / (1000 * 60 * 60)
  );

  const explanation = `
WHAT HAPPENED
${changeEvent.stock.companyName} (${changeEvent.stock.symbol}) has ${direction} ${Math.abs(contextData.percentageChange).toFixed(2)}% (₹${Math.abs(contextData.absoluteChange).toFixed(2)}) since you last checked ${hoursAway} hour(s) ago.

WHY WE FLAGGED IT
The system assigned an anomaly score of ${contextData.score}/100 and classified this as ${changeEvent.severity}. ${contextData.volume > 1_000_000 ? `Trading volume of ${(contextData.volume / 1_000_000).toFixed(1)}M is notably elevated.` : `Price movement of ${Math.abs(contextData.percentageChange).toFixed(2)}% exceeds the normal threshold for this stock.`}

POSSIBLE CONTEXT
Moves of this magnitude are typically associated with earnings releases, sector-wide news, or broader market volatility.

WHAT TO WATCH NEXT
Monitor ${changeEvent.stock.symbol} for follow-through volume and any official company announcements in the next few trading sessions.
`.trim();

  return await prisma.insight.create({
    data: {
      changeEventId: changeEvent.id,
      summary: `${changeEvent.stock.symbol} — ${changeEvent.severity} (fallback insight)`,
      explanation,
      modelVersion: 'deterministic-fallback-v2',
    },
  });
}

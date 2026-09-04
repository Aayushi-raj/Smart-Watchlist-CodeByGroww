import { PrismaClient, ChangeEvent, Stock } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// Initialize Gemini (Will fail gracefully if no API key is provided)
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateInsightForEvent(changeEvent: ChangeEvent & { stock: Stock }, contextData: any) {
  // Check if insight is already cached
  const existingInsight = await prisma.insight.findFirst({
    where: { changeEventId: changeEvent.id }
  });

  if (existingInsight) {
    return existingInsight;
  }

  // AI Fallback Mechanism: If AI is down or no key, generate deterministically
  if (!genAI) {
    return generateDeterministicFallback(changeEvent, contextData);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
    You are a financial analysis AI for a Smart Market Watchlist.
    A user has returned to their watchlist, and the system detected a meaningful change.
    
    FACTS:
    - Stock: ${changeEvent.stock.companyName} (${changeEvent.stock.symbol})
    - Event Type: ${changeEvent.eventType}
    - Severity: ${changeEvent.severity}
    - Score: ${changeEvent.score} (0-100)
    - Context: ${JSON.stringify(contextData)}
    
    Format your response EXACTLY like this:
    
    WHAT HAPPENED
    [Explain what happened based on facts, e.g., "Reliance fell 4.8% since your last check."]
    
    WHY WE FLAGGED IT
    [Explain based on the severity and score, e.g., "The move is significantly larger than its recent average..."]
    
    POSSIBLE CONTEXT
    [Mention any context provided, e.g., "Quarterly results were released today."]
    
    WHAT TO WATCH
    [One sentence on what to watch next]
    
    Do NOT give buy/sell advice. Do NOT predict the future. ONLY use the facts provided.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Store Insight (Caching)
    const newInsight = await prisma.insight.create({
      data: {
        changeEventId: changeEvent.id,
        summary: \`\${changeEvent.stock.symbol} experienced a \${changeEvent.severity} event.\`,
        explanation: text,
        modelVersion: 'gemini-1.5-flash'
      }
    });

    return newInsight;

  } catch (error) {
    console.error('AI Generation failed, falling back to deterministic insight.', error);
    return generateDeterministicFallback(changeEvent, contextData);
  }
}

async function generateDeterministicFallback(changeEvent: ChangeEvent & { stock: Stock }, contextData: any) {
  const explanation = \`
WHAT HAPPENED
\${changeEvent.stock.companyName} (\${changeEvent.stock.symbol}) experienced a \${changeEvent.eventType}.

WHY WE FLAGGED IT
The system detected an anomaly score of \${changeEvent.score}/100, marking it as \${changeEvent.severity}.

POSSIBLE CONTEXT
\${contextData.mockEvent || 'Market data suggests unusual activity.'}

WHAT TO WATCH
Monitor market reaction over the next few trading sessions. (AI Explanation temporarily unavailable).
\`;

  return await prisma.insight.create({
    data: {
      changeEventId: changeEvent.id,
      summary: \`Deterministic Fallback: \${changeEvent.stock.symbol}\`,
      explanation: explanation,
      modelVersion: 'fallback-deterministic-v1'
    }
  });
}

import { Goal, ChangeEvent } from '@prisma/client';
import prisma from '../db';

export async function calculateGoalImpact(goal: Goal, events: (ChangeEvent & { stock: { companyName: string; symbol: string } })[]) {
  const isShortTerm  = goal.horizonDays < 365;
  const isMediumTerm = goal.horizonDays >= 365 && goal.horizonDays <= 1825;
  // isLongTerm = >1825 days (implicitly)

  let totalRiskScore = 0;

  const impactAnalysis = events.map(event => {
    let impactText = '';
    let riskLevel = 'LOW';

    if (event.severity === 'SIGNIFICANT_CHANGE' || event.severity === 'ATTENTION') {
      if (isShortTerm) {
        impactText = `High risk. Short-term goals are highly sensitive to current volatility in ${event.stock.companyName}.`;
        riskLevel = 'HIGH';
        totalRiskScore += event.severity === 'SIGNIFICANT_CHANGE' ? 15 : 10;
      } else if (isMediumTerm) {
        impactText = `Moderate risk. Keep an eye on ${event.stock.companyName}, but you have time to recover.`;
        riskLevel = 'MEDIUM';
        totalRiskScore += 5;
      } else {
        impactText = `Low risk. Long-term goals can weather this short-term volatility in ${event.stock.companyName}. Potential buying opportunity.`;
        riskLevel = 'LOW';
        totalRiskScore += 1;
      }
    } else if (event.severity === 'WORTH_KNOWING') {
      impactText = `Minor event in ${event.stock.companyName}. Does not significantly alter your trajectory.`;
      riskLevel = 'LOW';
      totalRiskScore += 2;
    } else {
      impactText = 'No impact.';
      riskLevel = 'NONE';
    }

    return {
      eventId: event.id,
      stockId: event.stockId,
      stockSymbol: event.stock.symbol,
      stockName: event.stock.companyName,
      impactText,
      riskLevel,
    };
  });

  let goalHealth = 'ON_TRACK';
  if (totalRiskScore > 15)     goalHealth = 'AT_RISK';
  else if (totalRiskScore > 5) goalHealth = 'NEEDS_REVIEW';

  return {
    goalId: goal.id,
    goalName: goal.name,
    horizonDays: goal.horizonDays,
    targetAmount: goal.targetAmount,
    goalHealth,
    impactAnalysis,
    totalRiskScore,
  };
}

export async function getUserGoalImpacts(userId: string) {
  const goals = await prisma.goal.findMany({ where: { userId } });

  if (goals.length === 0) return [];

  // Fetch change events from the past 7 days for stocks in this user's watchlists
  const recentEvents = await prisma.changeEvent.findMany({
    where: {
      stock: {
        watchlists: {
          some: { watchlist: { userId } },
        },
      },
      detectedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      stock: {
        select: { companyName: true, symbol: true },
      },
    },
    orderBy: { detectedAt: 'desc' },
  });

  const impacts = await Promise.all(goals.map(goal => calculateGoalImpact(goal, recentEvents)));
  return impacts;
}

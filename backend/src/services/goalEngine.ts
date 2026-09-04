import { PrismaClient, Goal, ChangeEvent } from '@prisma/client';

const prisma = new PrismaClient();

export async function calculateGoalImpact(goal: Goal, events: ChangeEvent[]) {
  // Goal Horizons
  // Short Term < 365 days
  // Medium Term 1-5 years (365 - 1825 days)
  // Long Term > 5 years (> 1825 days)
  
  const isShortTerm = goal.horizonDays < 365;
  const isMediumTerm = goal.horizonDays >= 365 && goal.horizonDays <= 1825;
  const isLongTerm = goal.horizonDays > 1825;

  let totalRiskScore = 0;
  
  const impactAnalysis = events.map(event => {
    let impactText = '';
    let riskLevel = 'LOW';

    if (event.severity === 'ATTENTION') {
      if (isShortTerm) {
        impactText = 'High risk. Short-term goals are highly sensitive to current market volatility.';
        riskLevel = 'HIGH';
        totalRiskScore += 10;
      } else if (isMediumTerm) {
        impactText = 'Moderate risk. Keep an eye on it, but you have time to recover.';
        riskLevel = 'MEDIUM';
        totalRiskScore += 5;
      } else {
        impactText = 'Low risk. Long-term goals can weather this short-term volatility. Potential buying opportunity.';
        riskLevel = 'LOW';
        totalRiskScore += 1;
      }
    } else if (event.severity === 'WORTH_KNOWING') {
      impactText = 'Minor event. Does not significantly alter your trajectory.';
      riskLevel = 'LOW';
      totalRiskScore += 2;
    } else {
      impactText = 'No impact.';
      riskLevel = 'NONE';
    }

    return {
      eventId: event.id,
      stockId: event.stockId,
      impactText,
      riskLevel
    };
  });

  // Calculate overall goal health based on risk score
  let goalHealth = 'ON_TRACK';
  if (totalRiskScore > 15) {
    goalHealth = 'AT_RISK';
  } else if (totalRiskScore > 5) {
    goalHealth = 'NEEDS_REVIEW';
  }

  return {
    goalId: goal.id,
    goalName: goal.name,
    horizonDays: goal.horizonDays,
    goalHealth,
    impactAnalysis
  };
}

export async function getUserGoalImpacts(userId: string) {
  const goals = await prisma.goal.findMany({ where: { userId } });
  
  // Get recent change events for stocks in user's watchlists
  const recentEvents = await prisma.changeEvent.findMany({
    where: {
      stock: {
        watchlists: {
          some: {
            watchlist: {
              userId
            }
          }
        }
      },
      detectedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days
      }
    },
    include: { stock: true }
  });

  const impacts = await Promise.all(goals.map(goal => calculateGoalImpact(goal, recentEvents)));
  return impacts;
}

import yahooFinanceModule from 'yahoo-finance2';

// Singleton Yahoo Finance client — previously instantiated separately in
// api.ts and marketData.ts with a fragile `(module as any).default || module` hack.
const YF = (yahooFinanceModule as any).default ?? yahooFinanceModule;
const yahooFinance: typeof yahooFinanceModule = new YF();

export default yahooFinance;

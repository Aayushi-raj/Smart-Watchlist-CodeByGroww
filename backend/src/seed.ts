import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stocks = [
    { symbol: 'RELIANCE', companyName: 'Reliance Industries', exchange: 'NSE', sector: 'Energy' },
    { symbol: 'TCS', companyName: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT' },
    { symbol: 'INFY', companyName: 'Infosys', exchange: 'NSE', sector: 'IT' },
    { symbol: 'HDFCBANK', companyName: 'HDFC Bank', exchange: 'NSE', sector: 'Banking' },
    { symbol: 'WIPRO', companyName: 'Wipro Limited', exchange: 'NSE', sector: 'IT' },
    { symbol: 'ZOMATO', companyName: 'Zomato Ltd', exchange: 'NSE', sector: 'Consumer Services' },
  ];

  for (const s of stocks) {
    await prisma.stock.upsert({
      where: { symbol: s.symbol },
      update: {},
      create: s,
    });
  }
  
  console.log('Seeded initial stocks.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';
import { entryRepository } from './api/repositories/entry.repository.js'; // adding .js or .ts? ts-node on ESM usually likes .js or .ts

const prisma = new PrismaClient();

async function main() {
  const summary = await entryRepository.getSummary();
  console.log('SUMMARY:', summary);
  
  const entries = await prisma.entry.findMany({
    where: { entryStatus: 'PAGO' },
    include: { transaction: true }
  });
  
  console.log('\nPAGO ENTRIES:');
  entries.forEach((e: any) => {
    console.log(`[${e.transaction.tipo}] Valor: ${e.valor} | FP: ${e.transaction.formaPagamento}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

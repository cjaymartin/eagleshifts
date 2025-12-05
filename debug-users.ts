
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    where: {
      OR: [
        { name: { contains: 'TEST' } },
        { name: { contains: 'Bah' } },
        { name: { contains: 'Bob' } },
        { name: { contains: 'Fnord' } },
      ]
    },
    include: {
      user: true
    }
  });

  console.log('Found members:', JSON.stringify(members, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOTAL = 980;
const SPECIAL_START = 914;

async function main() {
  await prisma.userSticker.deleteMany();
  await prisma.sticker.deleteMany();

  const rows = Array.from({ length: TOTAL }, (_, i) => {
    const n = i + 1;
    const isSpecial = n >= SPECIAL_START;
    return {
      code: String(n).padStart(4, "0"),
      name: isSpecial ? `Especial ${n}` : null,
      isSpecial,
      sortOrder: n,
    };
  });

  await prisma.sticker.createMany({ data: rows });
  console.log(`Seed: ${TOTAL} figurinhas criadas (especiais a partir de #${SPECIAL_START}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

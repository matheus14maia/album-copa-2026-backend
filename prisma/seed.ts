import { PrismaClient, StickerKind } from "@prisma/client";

const prisma = new PrismaClient();

/** Ordem do álbum (seleções); siglas conforme catálogo Panini informado pelo projeto. */
const NATIONS: { name: string; code: string }[] = [
  { name: "México", code: "MEX" },
  { name: "África do Sul", code: "RSA" },
  { name: "Coreia do Sul", code: "KOR" },
  { name: "Tchéquia", code: "CZE" },
  { name: "Canadá", code: "CAN" },
  { name: "Bósnia e Herzegovina", code: "BIH" },
  { name: "Catar", code: "QAT" },
  { name: "Suíça", code: "SUI" },
  { name: "Brasil", code: "BRA" },
  { name: "Marrocos", code: "MAR" },
  { name: "Haiti", code: "HAI" },
  { name: "Escócia", code: "SCO" },
  { name: "Estados Unidos", code: "USA" },
  { name: "Paraguai", code: "PAR" },
  { name: "Austrália", code: "AUS" },
  { name: "Turquia", code: "TUR" },
  { name: "Alemanha", code: "GER" },
  { name: "Curaçao", code: "CUW" },
  { name: "Costa do Marfim", code: "CIV" },
  { name: "Equador", code: "ECU" },
  { name: "Holanda", code: "NED" },
  { name: "Japão", code: "JPN" },
  { name: "Suécia", code: "SWE" },
  { name: "Tunísia", code: "TUN" },
  { name: "Bélgica", code: "BEL" },
  { name: "Egito", code: "EGY" },
  { name: "Irã", code: "IRN" },
  { name: "Nova Zelândia", code: "NZL" },
  { name: "Espanha", code: "ESP" },
  { name: "Cabo Verde", code: "CPV" },
  { name: "Arábia Saudita", code: "KSA" },
  { name: "Uruguai", code: "URU" },
  { name: "França", code: "FRA" },
  { name: "Senegal", code: "SEN" },
  { name: "Iraque", code: "IRQ" },
  { name: "Noruega", code: "NOR" },
  { name: "Argentina", code: "ARG" },
  { name: "Argélia", code: "ALG" },
  { name: "Áustria", code: "AUT" },
  { name: "Jordânia", code: "JOR" },
  { name: "Portugal", code: "POR" },
  { name: "RD Congo", code: "COD" },
  { name: "Uzbequistão", code: "UZB" },
  { name: "Colômbia", code: "COL" },
  { name: "Inglaterra", code: "ENG" },
  { name: "Croácia", code: "CRO" },
  { name: "Gana", code: "GHA" },
  { name: "Panamá", code: "PAN" },
];

function buildCatalog() {
  const rows: Array<{
    code: string;
    name: string | null;
    isSpecial: boolean;
    stickerKind: StickerKind;
    nationCode: string | null;
    sortOrder: number;
  }> = [];

  let sortOrder = 0;

  const push = (row: Omit<(typeof rows)[number], "sortOrder">) => {
    sortOrder += 1;
    rows.push({ ...row, sortOrder });
  };

  for (let i = 0; i <= 19; i++) {
    push({
      code: `FWC ${i}`,
      name: `Especial FWC ${i}`,
      isSpecial: true,
      stickerKind: StickerKind.FWC,
      nationCode: null,
    });
  }

  for (const nation of NATIONS) {
    for (let n = 1; n <= 20; n++) {
      push({
        code: `${nation.code}${n}`,
        name: nation.name,
        isSpecial: false,
        stickerKind: StickerKind.NATION,
        nationCode: nation.code,
      });
    }
  }

  for (let n = 1; n <= 14; n++) {
    push({
      code: `CC${n}`,
      name: `Coca-Cola ${n}`,
      isSpecial: false,
      stickerKind: StickerKind.COCA_COLA,
      nationCode: null,
    });
  }

  return rows;
}

async function main() {
  await prisma.userSticker.deleteMany();
  await prisma.sticker.deleteMany();

  const rows = buildCatalog();
  await prisma.sticker.createMany({ data: rows });
  console.log(`Seed: ${rows.length} figurinhas (FWC → ${NATIONS.length} seleções × 20 → CC).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

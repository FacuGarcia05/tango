import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const filePath = resolve(__dirname, "seed_covers.json");
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, string>;

  const entries = Object.entries(data).filter(([key]) => !key.startsWith("_"));
  if (!entries.length) {
    console.log("No hay portadas para actualizar.");
    return;
  }

  let updated = 0;

  for (const [slug, url] of entries) {
    const normalized = typeof url === "string" ? url.trim() : "";
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
      console.warn(`URL invalida para ${slug}, se omite.`);
      continue;
    }

    const result = await prisma.games.updateMany({
      where: { slug },
      data: { cover_url: normalized },
    });

    if (result.count > 0) {
      updated += result.count;
      console.log(`Actualizada portada de ${slug}`);
    } else {
      console.warn(`Juego con slug ${slug} no encontrado.`);
    }
  }

  console.log(`Portadas actualizadas: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
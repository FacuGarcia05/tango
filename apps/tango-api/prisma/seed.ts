import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // taxonomías base
  await prisma.genres.createMany({
    data: [
      { slug: "rpg", name: "RPG" },
      { slug: "action", name: "Acción" },
      { slug: "adventure", name: "Aventura" },
      { slug: "indie", name: "Indie" },
    ],
    skipDuplicates: true,
  });

  await prisma.platforms.createMany({
    data: [
      { slug: "pc", name: "PC" },
      { slug: "ps5", name: "PlayStation 5" },
      { slug: "xbox", name: "Xbox Series" },
      { slug: "switch", name: "Nintendo Switch" },
    ],
    skipDuplicates: true,
  });

  // juegos de ejemplo
  const witcher = await prisma.games.upsert({
    where: { slug: "the-witcher-3" },
    update: {},
    create: {
      slug: "the-witcher-3",
      title: "The Witcher 3",
      type: "base",
      release_date: new Date("2015-05-19"),
      est_length_hours: 80,
      description: "RPG de mundo abierto",
      cover_url: "https://image.api.playstation.com/vulcan/ap/rnd/202211/0711/kh4MUIuMmHlktOHar3lVl6rY.png",
    },
  });

  const bloodAndWine = await prisma.games.upsert({
    where: { slug: "tw3-blood-and-wine" },
    update: {},
    create: {
      slug: "tw3-blood-and-wine",
      title: "Blood and Wine",
      type: "dlc",
      parent_game_id: witcher.id,
      release_date: new Date("2016-05-31"),
      est_length_hours: 25,
      description: "Expansión de The Witcher 3.",
      cover_url: "https://upload.wikimedia.org/wikipedia/en/d/d3/The_Witcher_3_Blood_and_Wine_cover.jpg",
    },
  });

  const hollowKnight = await prisma.games.upsert({
    where: { slug: "hollow-knight" },
    update: {},
    create: {
      slug: "hollow-knight",
      title: "Hollow Knight",
      type: "base",
      release_date: new Date("2017-02-24"),
      est_length_hours: 30,
      description: "Metroidvania desafiante.",
      cover_url: "https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Hollow_Knight_first_cover_art.webp/250px-Hollow_Knight_first_cover_art.webp.png",
    },
  });

  const celeste = await prisma.games.upsert({
    where: { slug: "celeste" },
    update: {},
    create: {
      slug: "celeste",
      title: "Celeste",
      type: "base",
      release_date: new Date("2018-01-25"),
      est_length_hours: 10,
      description: "Plataformero de precisión.",
      cover_url: "https://i.3djuegos.com/juegos/14243/celeste/fotos/ficha/celeste-3938712.jpg",
    },
  });

  const genreMap = await prisma.genres.findMany({
    where: { slug: { in: ["rpg", "action", "adventure", "indie"] } },
  });
  const platformMap = await prisma.platforms.findMany({
    where: { slug: { in: ["pc", "ps5", "xbox", "switch"] } },
  });

  const genreId = (slug: string) => genreMap.find((g) => g.slug === slug)?.id;
  const platformId = (slug: string) => platformMap.find((p) => p.slug === slug)?.id;

  await prisma.game_genres.createMany({
    data: [
      { game_id: witcher.id, genre_id: genreId("rpg")! },
      { game_id: witcher.id, genre_id: genreId("action")! },
      { game_id: witcher.id, genre_id: genreId("adventure")! },
      { game_id: bloodAndWine.id, genre_id: genreId("rpg")! },
      { game_id: bloodAndWine.id, genre_id: genreId("action")! },
      { game_id: bloodAndWine.id, genre_id: genreId("adventure")! },
      { game_id: hollowKnight.id, genre_id: genreId("indie")! },
      { game_id: hollowKnight.id, genre_id: genreId("action")! },
      { game_id: hollowKnight.id, genre_id: genreId("adventure")! },
      { game_id: celeste.id, genre_id: genreId("indie")! },
      { game_id: celeste.id, genre_id: genreId("action")! },
    ],
    skipDuplicates: true,
  });

  await prisma.game_platforms.createMany({
    data: [
      { game_id: witcher.id, platform_id: platformId("pc")! },
      { game_id: witcher.id, platform_id: platformId("ps5")! },
      { game_id: witcher.id, platform_id: platformId("xbox")! },
      { game_id: bloodAndWine.id, platform_id: platformId("pc")! },
      { game_id: bloodAndWine.id, platform_id: platformId("ps5")! },
      { game_id: bloodAndWine.id, platform_id: platformId("xbox")! },
      { game_id: hollowKnight.id, platform_id: platformId("pc")! },
      { game_id: hollowKnight.id, platform_id: platformId("switch")! },
      { game_id: celeste.id, platform_id: platformId("pc")! },
      { game_id: celeste.id, platform_id: platformId("switch")! },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => console.log("Seed OK"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

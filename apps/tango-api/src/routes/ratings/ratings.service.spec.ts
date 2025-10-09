import { NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { RatingsService } from "./ratings.service";

const prismaMock = {
  games: {
    findUnique: jest.fn(),
  },
  ratings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
  },
  game_stats: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaService;

describe("RatingsService", () => {
  let service: RatingsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new RatingsService(prismaMock);
  });

  describe("findMineBySlug", () => {
    it("throws when game does not exist", async () => {
      (prismaMock.games.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findMineBySlug("user-1", "missing")).rejects.toThrow(NotFoundException);
    });

    it("returns null when rating absent", async () => {
      (prismaMock.games.findUnique as jest.Mock).mockResolvedValue({ id: "game-1" });
      (prismaMock.ratings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findMineBySlug("user-1", "slug");
      expect(result).toEqual({ value: null });
    });

    it("returns numeric value when rating exists", async () => {
      (prismaMock.games.findUnique as jest.Mock).mockResolvedValue({ id: "game-1" });
      (prismaMock.ratings.findUnique as jest.Mock).mockResolvedValue({ score: 4 });

      const result = await service.findMineBySlug("user-1", "slug");
      expect(result).toEqual({ value: 4 });
    });
  });
});

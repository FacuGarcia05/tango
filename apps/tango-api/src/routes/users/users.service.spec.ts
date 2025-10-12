import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "./users.service";

const prismaMock = {
  $transaction: jest.fn((operations) => Promise.all(operations)),
  users: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  profiles: {
    upsert: jest.fn(),
  },
  follows: {
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  reviews: {
    count: jest.fn(),
  },
  ratings: {
    count: jest.fn(),
  },
} as unknown as PrismaService;

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation((operations: any[]) => Promise.all(operations));
    service = new UsersService(prismaMock);
  });

  describe("follow", () => {
    it("should prevent following self", async () => {
      await expect(service.follow("user-1", "user-1")).rejects.toThrow(BadRequestException);
    });

    it("should throw if relationship already exists", async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue({ id: "target" });
      (prismaMock.follows.create as jest.Mock).mockRejectedValue(
        new PrismaClientKnownRequestError("Unique constraint", {
          clientVersion: "6.16.0",
          code: "P2002",
        })
      );

      await expect(service.follow("user-1", "target")).rejects.toThrow(ConflictException);
    });

    it("should create follow and return updated stats", async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue({ id: "target" });
      (prismaMock.follows.create as jest.Mock).mockResolvedValue({});
      (prismaMock.follows.count as jest.Mock)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      (prismaMock.follows.findUnique as jest.Mock).mockResolvedValue({ follower_id: "user-1" });

      const stats = await service.follow("user-1", "target");

      expect(stats).toEqual({ followers: 5, following: 2, isFollowing: true });
      expect(prismaMock.follows.create).toHaveBeenCalledWith({
        data: { follower_id: "user-1", followee_id: "target" },
      });
    });
  });

  describe("unfollow", () => {
    it("should throw if link does not exist", async () => {
      (prismaMock.follows.delete as jest.Mock).mockRejectedValue(
        new PrismaClientKnownRequestError("Missing", {
          clientVersion: "6.16.0",
          code: "P2025",
        })
      );

      await expect(service.unfollow("user-1", "target")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getSummary", () => {
    it("should include counts and profile data", async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue({
        id: "target",
        email: "target@example.com",
        display_name: "Target",
        avatar_url: null,
        email_verified_at: null,
        provider: null,
        provider_id: null,
        profiles: {
          bio: "Bio",
          avatar_url: null,
          backdrop_url: null,
          fav_genres: [],
          fav_platforms: [],
        },
      });
      (prismaMock.reviews.count as jest.Mock).mockResolvedValue(3);
      (prismaMock.ratings.count as jest.Mock).mockResolvedValue(4);
      (prismaMock.follows.count as jest.Mock).mockResolvedValueOnce(6).mockResolvedValueOnce(1);
      (prismaMock.follows.findUnique as jest.Mock).mockResolvedValue(null);

      const summary = await service.getSummary("target", "viewer");

      expect(summary.followers).toBe(6);
      expect(summary.following).toBe(1);
      expect(summary.reviewsCount).toBe(3);
      expect(summary.ratingsCount).toBe(4);
    });
  });

  describe("searchUsers", () => {
    it("returns empty when query is missing", async () => {
      const result = await service.searchUsers("viewer", "   ");
      expect(result).toEqual({ total: 0, items: [] });
    });

    it("maps follow stats and following state", async () => {
      (prismaMock.users.count as jest.Mock).mockResolvedValue(1);
      (prismaMock.users.findMany as jest.Mock).mockResolvedValue([
        {
          id: "target",
          email: "target@example.com",
          display_name: "Target",
          avatar_url: null,
          email_verified_at: null,
          provider: null,
          provider_id: null,
          profiles: {
            bio: "Bio",
            avatar_url: "https://cdn/target.png",
            backdrop_url: null,
            fav_genres: [],
            fav_platforms: [],
          },
        },
      ]);
      (prismaMock.follows.groupBy as jest.Mock)
        .mockResolvedValueOnce([{ followee_id: "target", _count: { followee_id: 12 } }])
        .mockResolvedValueOnce([{ follower_id: "target", _count: { follower_id: 4 } }]);
      (prismaMock.follows.findMany as jest.Mock).mockResolvedValue([{ followee_id: "target" }]);

      const result = await service.searchUsers("viewer", "tar", 5, 0);

      expect(prismaMock.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 0,
        })
      );

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: "target",
        displayName: "Target",
        followers: 12,
        following: 4,
        isFollowing: true,
      });
    });
  });
});

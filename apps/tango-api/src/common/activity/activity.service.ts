import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface RecordActivityParams {
  actorId: string;
  verb: string;
  objectType?: string | null;
  objectId?: string | null;
  targetUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async recordActivity(params: RecordActivityParams) {
    const { actorId, verb, objectType, objectId, targetUserId, metadata } =
      params;

    return this.prisma.activities.create({
      data: {
        actor_id: actorId,
        verb,
        object_type: objectType ?? null,
        object_id: objectId ?? null,
        target_user_id: targetUserId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IsAdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const headerKey = request.headers['x-admin-key'] as string | undefined;
    const configuredKey = this.config.get<string>('ADMIN_KEY');

    if (configuredKey && headerKey && headerKey === configuredKey) {
      return true;
    }

    const userId: string | undefined = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Se requieren permisos de administrador');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { is_admin: true },
    });

    if (!user?.is_admin) {
      throw new ForbiddenException('Se requieren permisos de administrador');
    }

    return true;
  }
}

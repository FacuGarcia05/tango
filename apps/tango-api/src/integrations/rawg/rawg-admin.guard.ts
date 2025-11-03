import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RawgAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = this.config.get<string>('RAWG_ADMIN_KEY');
    const headerKey = request.headers['x-rawg-admin-key'];
    const bearer = Array.isArray(headerKey) ? headerKey[0] : headerKey;

    if (adminKey && bearer === adminKey) {
      return true;
    }

    const user = request.user;
    if (user && (user.role === 'admin' || user.isAdmin === true)) {
      return true;
    }

    throw new UnauthorizedException('Acceso no autorizado a RAWG admin');
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const hasAuthorization = Boolean(request?.headers?.authorization);
    const hasCookie = Boolean(request?.cookies?.access_token);

    if (!hasAuthorization && !hasCookie) {
      return true;
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      return true;
    }
  }

  handleRequest(err: unknown, user: any) {
    if (err) {
      return null;
    }
    return user ?? null;
  }
}

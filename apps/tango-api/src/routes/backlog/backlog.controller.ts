import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { BacklogService } from './backlog.service';

@ApiTags('Backlog')
@Controller('backlog')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class BacklogController {
  constructor(private readonly service: BacklogService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user.sub);
  }

  @Get('contains/:gameSlug')
  contains(@CurrentUser() user: any, @Param('gameSlug') gameSlug: string) {
    return this.service.contains(user.sub, gameSlug);
  }

  @Post(':gameSlug')
  add(@CurrentUser() user: any, @Param('gameSlug') gameSlug: string) {
    return this.service.add(user.sub, gameSlug);
  }

  @Delete(':gameSlug')
  remove(@CurrentUser() user: any, @Param('gameSlug') gameSlug: string) {
    return this.service.remove(user.sub, gameSlug);
  }
}

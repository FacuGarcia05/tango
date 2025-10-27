import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FeedService } from './feed.service';
import { MuteUserDto } from './dto';

@ApiTags('Feed')
@Controller('feed')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class FeedController {
  constructor(private readonly service: FeedService) {}

  @Get()
  getFeed(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('take') take?: string,
  ) {
    const parsedPage = page ? Number(page) : undefined;
    const parsedTake = take ? Number(take) : undefined;

    if (page && Number.isNaN(parsedPage)) {
      throw new BadRequestException('page debe ser numerico');
    }

    if (take && Number.isNaN(parsedTake)) {
      throw new BadRequestException('take debe ser numerico');
    }

    return this.service.getFeed(user.sub, parsedPage, parsedTake);
  }

  @Post('mute/:userId')
  muteUser(
    @CurrentUser() user: any,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: MuteUserDto,
  ) {
    return this.service.muteUser(user.sub, userId, dto.minutes);
  }

  @Delete('mute/:userId')
  unmuteUser(@CurrentUser() user: any, @Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.service.unmuteUser(user.sub, userId);
  }
}

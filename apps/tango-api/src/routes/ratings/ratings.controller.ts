import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateRatingDto } from './dto';
import { RatingsService } from './ratings.service';

@ApiTags('Ratings')
@Controller('games')
export class RatingsController {
  constructor(private service: RatingsService) {}

  @Put(':slug/ratings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.OK)
  upsert(
    @CurrentUser() user: any,
    @Param('slug') slug: string,
    @Body() dto: UpdateRatingDto,
  ) {
    return this.service.upsertBySlug(user.sub, slug, dto);
  }

  @Get(':slug/ratings/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  mine(@CurrentUser() user: any, @Param('slug') slug: string) {
    return this.service.findMineBySlug(user.sub, slug);
  }
}

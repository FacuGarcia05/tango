import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { daily_tango_mode } from '@prisma/client';

import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { JwtOptionalAuthGuard } from '../auth/jwt-optional.guard';
import {
  GuessWordDto,
  LeaderboardQueryDto,
  MemoryResultDto,
  ReactionResultDto,
} from './dto';
import { DailyTangoService } from './daily-tango.service';

@ApiTags('DailyTango')
@Controller('daily-tango')
export class DailyTangoController {
  constructor(private readonly service: DailyTangoService) {}

  @Get('today')
  @UseGuards(JwtOptionalAuthGuard)
  summary(@CurrentUser() user: JwtPayload | null) {
    return this.service.getTodaySummary(user?.sub ?? null);
  }

  @Post('word/guess')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  guessWord(@Body() dto: GuessWordDto, @CurrentUser() user: JwtPayload) {
    return this.service.submitWordGuess(user.sub, dto);
  }

  @Post('memory/result')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  saveMemoryResult(@Body() dto: MemoryResultDto, @CurrentUser() user: JwtPayload) {
    return this.service.submitMemoryResult(user.sub, dto);
  }

  @Post('reaction/result')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  saveReactionResult(
    @Body() dto: ReactionResultDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.submitReactionResult(user.sub, dto);
  }

  @Get('leaderboard')
  leaderboard(@Query() query: LeaderboardQueryDto) {
    const mode: daily_tango_mode = query.mode ?? 'word';
    const days = query.days ?? 7;
    return this.service.getLeaderboard(mode, days);
  }
}

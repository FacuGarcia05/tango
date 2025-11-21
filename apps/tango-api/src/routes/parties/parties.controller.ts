import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PartiesService } from './parties.service';
import type { PartySummary } from './parties.service';
import { CreatePartyDto } from './dto';

@ApiTags('Parties')
@Controller()
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get('games/:slug/parties')
  listByGame(@Param('slug') slug: string): Promise<PartySummary[]> {
    return this.parties.listByGameSlug(slug);
  }

  @Post('games/:slug/parties')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  create(
    @Param('slug') slug: string,
    @Body() dto: CreatePartyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PartySummary> {
    return this.parties.createForGame(slug, dto, user.sub);
  }

  @Post('parties/:id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  join(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<PartySummary> {
    return this.parties.joinParty(id, user.sub);
  }

  @Post('parties/:id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  close(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<PartySummary> {
    return this.parties.closeParty(id, user.sub);
  }

  @Delete('parties/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.parties.deleteParty(id, user.sub);
  }
}

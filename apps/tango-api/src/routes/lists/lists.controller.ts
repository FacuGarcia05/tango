import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { JwtOptionalAuthGuard } from '../auth/jwt-optional.guard';
import { AddListItemDto, CreateListDto, ReorderListDto, UpdateListDto } from './dto';
import { ListsService } from './lists.service';

@ApiTags('Lists')
@Controller()
export class ListsController {
  constructor(private readonly service: ListsService) {}

  @Post('lists')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  create(@CurrentUser() user: any, @Body() dto: CreateListDto) {
    return this.service.create(user.sub, dto);
  }

  @Get('lists/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  findMine(@CurrentUser() user: any) {
    return this.service.findMine(user.sub);
  }

  @Get('lists/public/by-user/:userId')
  findPublicByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
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

    return this.service.findPublicByUser(userId, parsedPage, parsedTake);
  }

  @Get('lists/:slug')
  @UseGuards(JwtOptionalAuthGuard)
  findBySlug(@CurrentUser() user: any, @Param('slug') slug: string) {
    return this.service.findBySlug(slug, user?.sub);
  }

  @Patch('lists/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  update(@CurrentUser() user: any, @Param('slug') slug: string, @Body() dto: UpdateListDto) {
    return this.service.update(user.sub, slug, dto);
  }

  @Delete('lists/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('slug') slug: string) {
    await this.service.remove(user.sub, slug);
  }

  @Post('lists/:slug/items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  addItem(@CurrentUser() user: any, @Param('slug') slug: string, @Body() dto: AddListItemDto) {
    return this.service.addItem(user.sub, slug, dto);
  }

  @Delete('lists/:slug/items/:gameSlug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @CurrentUser() user: any,
    @Param('slug') slug: string,
    @Param('gameSlug') gameSlug: string,
  ) {
    await this.service.removeItem(user.sub, slug, gameSlug);
  }

  @Patch('lists/:slug/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  reorder(
    @CurrentUser() user: any,
    @Param('slug') slug: string,
    @Body() dto: ReorderListDto,
  ) {
    return this.service.reorder(user.sub, slug, dto);
  }

  @Post('backlog/toggle/:gameSlug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  toggleBacklog(@CurrentUser() user: any, @Param('gameSlug') gameSlug: string) {
    return this.service.toggleBacklog(user.sub, gameSlug);
  }
}

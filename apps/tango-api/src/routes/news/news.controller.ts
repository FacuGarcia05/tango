import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { JwtOptionalAuthGuard } from '../auth/jwt-optional.guard';
import { IsAdminGuard } from '../../common/guards/is-admin.guard';
import { CreateNewsDto, UpdateNewsDto } from './dto';
import { NewsService } from './news.service';

@ApiTags('News')
@Controller()
export class NewsController {
  constructor(private readonly service: NewsService) {}

  @Get('news')
  list(@Query('page') page?: string, @Query('take') take?: string) {
    const parsedPage = page ? Number(page) : undefined;
    const parsedTake = take ? Number(take) : undefined;

    if (page && Number.isNaN(parsedPage)) {
      throw new BadRequestException('page debe ser numerico');
    }

    if (take && Number.isNaN(parsedTake)) {
      throw new BadRequestException('take debe ser numerico');
    }

    return this.service.list(parsedPage, parsedTake);
  }

  @Get('news/:slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get('homepage/featured')
  featured() {
    return this.service.featuredForHomepage();
  }

  @Post('news')
  @UseGuards(JwtOptionalAuthGuard, IsAdminGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  create(@Body() dto: CreateNewsDto) {
    return this.service.create(dto);
  }

  @Patch('news/:slug')
  @UseGuards(JwtOptionalAuthGuard, IsAdminGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  update(@Param('slug') slug: string, @Body() dto: UpdateNewsDto) {
    return this.service.update(slug, dto);
  }

  @Delete('news/:slug')
  @UseGuards(JwtOptionalAuthGuard, IsAdminGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  async remove(@Param('slug') slug: string) {
    await this.service.remove(slug);
  }
}

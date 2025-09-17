import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateReviewDto, ListReviewsQueryDto, UpdateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.service.create(user.sub, dto);
  }

  @Get('games/:slug/reviews')
  listByGame(@Param('slug') slug: string, @Query() q: ListReviewsQueryDto) {
    return this.service.listByGameSlug(slug, q.take ?? 20, q.skip ?? 0);
  }

  @Patch('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    await this.service.softDelete(user.sub, id);
  }

  @Post('reviews/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async like(@CurrentUser() user: any, @Param('id') id: string) {
    await this.service.like(user.sub, id);
  }

  @Delete('reviews/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(@CurrentUser() user: any, @Param('id') id: string) {
    await this.service.unlike(user.sub, id);
  }
}


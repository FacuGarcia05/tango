import {
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

import { JwtAuthGuard } from '../auth/jwt.guard';
import { JwtOptionalAuthGuard } from '../auth/jwt-optional.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateCommentDto, CreateReviewDto, ListReviewsQueryDto, UpdateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get('users/me/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  listMine(@CurrentUser() user: any, @Query() q: ListReviewsQueryDto) {
    return this.service.listByUser(user.sub, q.take ?? 20, q.skip ?? 0, user.sub);
  }

  @Get('users/:id/reviews')
  @UseGuards(JwtOptionalAuthGuard)
  listByUser(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() q: ListReviewsQueryDto,
  ) {
    return this.service.listByUser(id, q.take ?? 20, q.skip ?? 0, user?.sub);
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.service.create(user.sub, dto);
  }

  @Get('games/:slug/reviews')
  @UseGuards(JwtOptionalAuthGuard)
  listByGame(
    @CurrentUser() user: any,
    @Param('slug') slug: string,
    @Query() q: ListReviewsQueryDto,
  ) {
    return this.service.listByGameSlug(slug, q.take ?? 20, q.skip ?? 0, user?.sub);
  }

  @Get('reviews/me/:gameId/exists')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  reviewExists(@CurrentUser() user: any, @Param('gameId', new ParseUUIDPipe()) gameId: string) {
    return this.service.userHasReview(user.sub, gameId);
  }

  @Patch('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  update(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.softDelete(user.sub, id);
  }

  @Post('reviews/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  toggleLike(@CurrentUser() user: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.toggleLike(user.sub, id);
  }

  @Get('reviews/:id/comments')
  listComments(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.listComments(id);
  }

  @Post('reviews/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  createComment(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.service.createComment(user.sub, id, dto);
  }

  @Delete('reviews/:id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ) {
    await this.service.deleteComment(user.sub, id, commentId);
  }
}

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { JwtOptionalAuthGuard } from '../auth/jwt-optional.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchUsersQueryDto } from './dto/search-users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  me(@CurrentUser() user: any) {
    return this.usersService.getMe(user.sub);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  follow(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) targetId: string,
  ) {
    return this.usersService.follow(user.sub, targetId);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  unfollow(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) targetId: string,
  ) {
    return this.usersService.unfollow(user.sub, targetId);
  }

  @Get(':id/follow-stats')
  @UseGuards(JwtOptionalAuthGuard)
  followStats(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) targetId: string,
  ) {
    return this.usersService.getFollowStats(targetId, user?.sub);
  }

  @Get(':id/summary')
  @UseGuards(JwtOptionalAuthGuard)
  summary(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) targetId: string,
  ) {
    return this.usersService.getSummary(targetId, user?.sub);
  }

  @Get('search')
  @UseGuards(JwtOptionalAuthGuard)
  @ApiQuery({ name: 'q', required: false, description: 'Termino de busqueda por nombre o email' })
  search(
    @CurrentUser() user: any,
    @Query() query: SearchUsersQueryDto,
  ) {
    return this.usersService.searchUsers(user?.sub, query.q, query.take, query.skip);
  }
}

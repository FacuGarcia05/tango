import { Module } from "@nestjs/common";

import { JwtOptionalAuthGuard } from "../auth/jwt-optional.guard";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  providers: [UsersService, JwtOptionalAuthGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

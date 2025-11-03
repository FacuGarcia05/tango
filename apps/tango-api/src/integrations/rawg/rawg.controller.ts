import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { JwtOptionalAuthGuard } from '../../routes/auth/jwt-optional.guard';
import { RawgAdminGuard } from './rawg-admin.guard';
import { ImportResult, RawgService, RawgSearchResult } from './rawg.service';

class ImportBulkDto {
  slugs!: string[];
}

class ImportTopDto {
  pages?: number;
}

@ApiTags('RAWG')
@Controller('admin/rawg')
@UseGuards(JwtOptionalAuthGuard, RawgAdminGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-rawg-admin-key',
  required: false,
  description: 'Token admin para importaciones RAWG',
})
export class RawgController {
  constructor(private readonly rawg: RawgService) {}

  @Post('import/:slug')
  @ApiOperation({ summary: 'Importar un juego desde RAWG por slug o nombre' })
  @ApiParam({ name: 'slug', description: 'Slug o nombre del juego en RAWG' })
  async importOne(@Param('slug') slug: string): Promise<ImportResult> {
    return this.rawg.importBySlug(slug);
  }

  @Post('import-bulk')
  @ApiOperation({ summary: 'Importar en serie varios juegos desde RAWG' })
  @ApiBody({
    type: ImportBulkDto,
    examples: { default: { value: { slugs: ['celeste', 'the-witcher-3'] } } },
  })
  importBulk(@Body() dto: ImportBulkDto) {
    return this.rawg.importBulk(dto.slugs ?? []);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar un juego en RAWG por slug o nombre' })
  @ApiQuery({ name: 'q', description: 'Texto a buscar', required: true })
  async search(@Query('q') q: string): Promise<RawgSearchResult | null> {
    return this.rawg.searchOneBySlugOrName(q);
  }

  @Post('import-top')
  @ApiOperation({ summary: 'Importar las primeras paginas del catalogo RAWG' })
  @ApiBody({
    type: ImportTopDto,
    examples: { default: { value: { pages: 5 } } },
  })
  importTop(@Body() dto: ImportTopDto) {
    const pages = dto.pages ?? 5;
    return this.rawg.importTopGames(pages);
  }
}

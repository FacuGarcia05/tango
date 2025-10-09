import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as fs from "fs";
import * as path from "path";

import { AppModule } from "../app.module";
import { RawgService } from "../integrations/rawg/rawg.service";

interface CliOptions {
  slug?: string;
  file?: string;
  topPages?: number;
}

async function bootstrap() {
  const logger = new Logger("RawgImportCLI");
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    const rawgService = appContext.get(RawgService);
    const config = appContext.get(ConfigService);
    if (!config.get("RAWG_KEY")) {
      logger.warn("RAWG_KEY no esta configurada. Agrega tus credenciales en .env");
    }

    const options = parseArgs(process.argv.slice(2));
    if (options.topPages && options.topPages > 0) {
      const response = await rawgService.importTopGames(options.topPages);
      logger.log(`Import top pages completado. Importados ${response.imported}/${response.total}`);
    } else {
      const slugs = await collectSlugs(options);
      if (!slugs.length) {
        logger.error("Proporciona --slug <slug>, --file <archivo> o --top-pages <n>");
        process.exitCode = 1;
        return;
      }

      for (const slug of slugs) {
        try {
          const result = await rawgService.importBySlug(slug);
          logger.log(
            `Importado ${result.slug} (${result.title}) - DLCS: ${result.dlcsAdded}, Screenshots: ${result.screenshotsAdded}`,
          );
        } catch (error: any) {
          logger.error(`Fallo importando ${slug}: ${error?.message ?? error}`);
        }
      }
    }
  } finally {
    await appContext.close();
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (current === "--slug" && args[i + 1]) {
      options.slug = args[i + 1];
      i += 1;
    } else if (current === "--file" && args[i + 1]) {
      options.file = args[i + 1];
      i += 1;
    } else if (current === "--top-pages" && args[i + 1]) {
      options.topPages = Number(args[i + 1]);
      i += 1;
    } else if (!current.startsWith("--")) {
      if (!Number.isNaN(Number(current))) {
        options.topPages = Number(current);
      } else if (!options.slug) {
        options.slug = current;
      }
    }
  }
  return options;
}

async function collectSlugs(options: CliOptions) {
  if (options.slug) {
    return [options.slug.trim()];
  }
  if (options.file) {
    const filePath = path.resolve(process.cwd(), options.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`No existe el archivo ${filePath}`);
    }
    const content = await fs.promises.readFile(filePath, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

bootstrap().catch((error) => {
  console.error("Error ejecutando importador RAWG", error);
  process.exit(1);
});

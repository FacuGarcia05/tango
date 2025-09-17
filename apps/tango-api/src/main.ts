import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: 'http://localhost:3000', credentials: true } });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TANGO API')
    .setDescription('Títulos, Análisis, Novedades, Gaming y Opiniones')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  const port = process.env.PORT || 3001;
  await app.listen(port as number);
  console.log(`API on http://localhost:${port}`);
}
bootstrap();
//a

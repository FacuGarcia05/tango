import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: 'http://localhost:3000', credentials: true } });
  const port = process.env.PORT || 3001;
  await app.listen(port as number);
  console.log(`API on http://localhost:${port}`);
}
bootstrap();
//a
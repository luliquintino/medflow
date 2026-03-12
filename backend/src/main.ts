import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'debug', 'error', 'verbose', 'warn'],
  });

  // ── Security headers (Helmet) ───────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP managed separately if needed
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 63072000, includeSubDomains: true, preload: true }
          : false,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ].filter(Boolean);

  // Also allow Vercel preview/production URLs and custom domain
  const isAllowedDynamic = (origin: string) =>
    /^https:\/\/.*\.vercel\.app$/.test(origin) ||
    /^https:\/\/(www\.)?medflow\.tec\.br$/.test(origin) ||
    (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isAllowedDynamic(origin || '')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ──────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Med Flow API')
      .setDescription('Copiloto financeiro e de carga de trabalho para médicos plantonistas')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`\n🏥 Med Flow API running on http://localhost:${port}`);
  console.log(`📖 Swagger: http://localhost:${port}/api/docs\n`);
}

bootstrap();

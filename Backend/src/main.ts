import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from './infrastructure/database/mongodb';
import { AuthService } from './application/AuthService';
import { createApp } from './app';

const app = createApp();

const PORT = Number(process.env['EXPRESS_PORT'] ?? process.env['PORT'] ?? 3000);

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const adminEmail = process.env['ADMIN_EMAIL'] ?? 'admin@portfolio.dev';
  const adminPassword = process.env['ADMIN_PASSWORD'] ?? 'Admin@12345';
  const authService = new AuthService();
  await authService.registerAdmin(adminEmail, adminPassword);

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('❌ Startup error:', err);
  process.exit(1);
});

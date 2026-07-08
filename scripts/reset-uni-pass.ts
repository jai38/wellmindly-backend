import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL?.split('?')[0];

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('AdminPass123!', 10);
  const user = await prisma.user.update({
    where: { email: 'university@wellmindly.edu' },
    data: { passwordHash: hash }
  });
  console.log('Password reset successfully for:', user.email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

const isLocalhost = env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1');

// Strip query parameters to prevent node-postgres from overriding constructor ssl options
const connectionString = env.DATABASE_URL.split('?')[0];

const pool = new Pool({
  connectionString,
  ssl: isLocalhost ? undefined : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;

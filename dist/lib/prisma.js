"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/prisma/client");
const env_1 = require("../config/env");
const isLocalhost = env_1.env.DATABASE_URL.includes('localhost') || env_1.env.DATABASE_URL.includes('127.0.0.1');
// Strip query parameters to prevent node-postgres from overriding constructor ssl options
const connectionString = env_1.env.DATABASE_URL.split('?')[0];
const pool = new pg_1.Pool({
    connectionString,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false }
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;

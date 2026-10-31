import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SIMULATOR_PATH: z.string().default('./target/release/solar-sim'),
});
export const config = schema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://solarquote:solarquote@localhost:5432/solarquote',
  API_PORT: process.env.API_PORT,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  SIMULATOR_PATH: process.env.SIMULATOR_PATH,
});

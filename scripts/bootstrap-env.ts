/**
 * Load .env.local before any other imports that read process.env
 */
import { config } from "dotenv";
import { join } from "node:path";
config({ path: join(process.cwd(), ".env.local") });

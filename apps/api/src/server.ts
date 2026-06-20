import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { createApp } from "./app";
import { parseAppConfig } from "./config/environment";

loadDotEnv({ path: resolve(__dirname, "../../.env") });
loadDotEnv({ path: resolve(__dirname, "../.env"), override: true });

async function main(): Promise<void> {
  const config = parseAppConfig();
  const app = await createApp(config);

  await app.listen({
    host: config.host,
    port: config.port
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

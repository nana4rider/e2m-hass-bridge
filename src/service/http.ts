import env from "@/env";
import logger from "@/logger";
import { createServer } from "http";
import { JsonValue } from "type-fest";
import { promisify } from "util";

export default async function initializeHttpServer() {
  const endpoints = new Map<string, () => JsonValue>();

  const server = createServer((req, res) => {
    const resJson = (jsonValue: JsonValue, statusCode = 200) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jsonValue));
    };
    const handler = endpoints.get(req.url!);
    if (handler) {
      resJson(handler());
    } else {
      resJson({ error: "Not Found" }, 404);
    }
  });

  await promisify(server.listen.bind(server, env.PORT))();
  logger.info(`[HTTP] listen port: ${env.PORT}`);

  const setEndpoint = (path: string, handler: () => JsonValue) => {
    endpoints.set(path, handler);
  };

  const close = async () => {
    await promisify(server.close.bind(server))();
    logger.info("[HTTP] closed");
  };

  // health check
  setEndpoint("/health", () => ({}));

  return { setEndpoint, close };
}

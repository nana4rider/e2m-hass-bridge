import env from "@/env";
import logger from "@/logger";
import {
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { promisify } from "node:util";

type HttpServer = {
  close: () => Promise<void>;
  port: number;
};

export default async function initializeHttpServer(
  targetDevices: Map<string, ApiDevice>,
  getTaskQueueSize: () => number,
): Promise<HttpServer> {
  const server = createServer();

  server.on("request", (req: IncomingMessage, res: ServerResponse) => {
    const pathname = req.url?.split("?")[0];
    if (pathname === "/health" && req.method === "GET") {
      const healthResponse = {
        status: "ok",
        uptime: process.uptime(),
        timestamp: Date.now(),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(healthResponse));
    } else if (pathname === "/status" && req.method === "GET") {
      // for debug
      const devices = Array.from(targetDevices.values()).map((apiDevice) => {
        const { id, deviceType } = apiDevice;
        const autoRequestProperties = getAutoRequestProperties(apiDevice);
        const simpleComponents = getSimpleComponentConfigs(apiDevice).map(
          ({ property, component }) => ({
            name: property.name,
            component,
          }),
        );
        const compositeComponents = getCompositeComponentConfigs(apiDevice).map(
          ({ compositeComponentId, component }) => ({
            compositeComponentId,
            component,
          }),
        );
        return {
          id,
          deviceType,
          autoRequestProperties,
          simpleComponents,
          compositeComponents,
        };
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          taskQueueSize: getTaskQueueSize(),
          devices,
        }),
      );
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  return new Promise((resolve, reject) => {
    server.once("listening", () => {
      logger.info(`[HTTP] listen port: ${env.PORT}`);
      const { port } = server.address() as AddressInfo;
      resolve({
        port,
        close: promisify(server.close.bind(server)),
      });
    });
    server.once("error", (err) => reject(err));
    server.listen(env.PORT);
  });
}

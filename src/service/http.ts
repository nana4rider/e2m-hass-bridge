import {
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import fastify from "fastify";

export default async function initializeHttpServer(
  targetDevices: Map<string, ApiDevice>,
  getTaskQueueSize: () => number,
) {
  const server = fastify();

  server.get("/health", () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  }));

  // for debug
  server.get("/status", () => {
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
    return {
      taskQueueSize: getTaskQueueSize(),
      devices,
    };
  });

  return server;
}

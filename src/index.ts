import logger from "@/logger";
import {
  buildDevice,
  buildDiscoveryEntries,
  buildOrigin,
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import initializeHttpServer from "@/service/http";
import initializeMqttClient from "@/service/mqtt";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import env from "env-var";
import { setInterval } from "timers/promises";

async function main() {
  logger.info("start");

  const autoRequestInterval = env
    .get("AUTO_REQUEST_INTERVAL")
    .default(60000)
    .asIntPositive();

  const targetDevices = new Map<string, ApiDevice>();
  const origin = await buildOrigin();

  const mqtt = await initializeMqttClient((apiDevice) => {
    logger.info(`handleDevice: ${apiDevice.id}`);

    const device = buildDevice(apiDevice);

    buildDiscoveryEntries(apiDevice).forEach(({ relativeTopic, payload }) => {
      // Home Assistantへ送信
      mqtt.pushHassDiscovery(
        relativeTopic,
        {
          ...payload,
          ...device,
          ...origin,
        },
        () => {
          targetDevices.set(apiDevice.id, apiDevice);
        },
      );
    });
  });

  const http = await initializeHttpServer();
  http.setEndpoint("/health", () => ({}));
  http.setEndpoint("/", () => {
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
      taskQueueSize: mqtt.taskQueueSize,
      devices,
    };
  });

  // 更新通知をしないプロパティに対して、定期的に自動リクエストする
  void (async () => {
    for await (const _ of setInterval(autoRequestInterval)) {
      Array.from(targetDevices.values()).map((apiDevice) => {
        const autoRequestProperties = getAutoRequestProperties(apiDevice);
        mqtt.pushE2mRequest(apiDevice, autoRequestProperties);
      });
    }
  })();

  const shutdownHandler = async () => {
    logger.info("shutdown start");
    await mqtt.close();
    await http.close();
    logger.info("shutdown finished");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdownHandler());
  process.on("SIGTERM", () => void shutdownHandler());

  logger.info("ready");
}

try {
  await main();
} catch (err) {
  logger.error("main() error:", err);
  process.exit(1);
}

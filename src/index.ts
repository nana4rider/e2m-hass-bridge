import { language } from "@/deviceConfig";
import logger from "@/logger";
import {
  buildDevice,
  buildOrigin,
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import { Payload } from "@/payload/payloadType";
import { createUniqueId } from "@/payload/resolver";
import initializeHttpServer from "@/service/http";
import initializeMqttClient from "@/service/mqtt";
import {
  getAutoRequestProperties,
  getCompositeOverridePayload,
  getSimpleOverridePayload,
} from "@/util/deviceUtil";
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
  const origin = buildOrigin();

  const mqtt = await initializeMqttClient((apiDevice: ApiDevice) => {
    logger.info(`handleDevice: ${apiDevice.id}`);
    const discoveryEntries: { relativeTopic: string; payload: Payload }[] = [];
    const device = buildDevice(apiDevice);
    // 単一のプロパティから構成されるコンポーネント(sensor等)
    getSimpleComponentConfigs(apiDevice).forEach((componentConfig) => {
      const { component, property, builder } = componentConfig;
      const uniqueId = createUniqueId(apiDevice, componentConfig);
      const relativeTopic = `${component}/${uniqueId}/config`;
      const payload = builder(apiDevice, property);
      payload.unique_id = uniqueId;
      payload.name = property.schema.propertyName[language];
      const override = getSimpleOverridePayload(apiDevice, property.name);
      discoveryEntries.push({
        relativeTopic,
        payload: { ...payload, ...override },
      });
    });
    // 複数のプロパティから構成されるコンポーネント(climate等)
    getCompositeComponentConfigs(apiDevice).forEach((componentConfig) => {
      const { compositeComponentId, component, builder, name } =
        componentConfig;
      const uniqueId = createUniqueId(apiDevice, componentConfig);
      const relativeTopic = `${component}/${uniqueId}/config`;
      const payload = builder(apiDevice);
      payload.unique_id = uniqueId;
      payload.name = name?.[language] ?? apiDevice.descriptions[language];
      const override = getCompositeOverridePayload(
        apiDevice,
        compositeComponentId,
      );
      discoveryEntries.push({
        relativeTopic,
        payload: { ...payload, ...override },
      });
    });

    discoveryEntries.forEach(({ relativeTopic, payload }) => {
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

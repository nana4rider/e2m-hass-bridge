import { IgnoreDeviceTypePatterns, language } from "@/deviceConfig";
import logger from "@/logger";
import createMqtt from "@/mqtt";
import {
  buildDevice,
  buildOrigin,
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import { Payload } from "@/payload/payloadType";
import {
  getAutoRequestProperties,
  getCompositeOverridePayload,
  getSimpleOverridePayload,
} from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceSummary,
} from "echonetlite2mqtt/server/ApiTypes";
import env from "env-var";
import http from "http";
import { setInterval } from "timers/promises";

async function main() {
  logger.info("start");

  const autoRequestInterval = env
    .get("AUTO_REQUEST_INTERVAL")
    .default(60000)
    .asIntPositive();
  const port = env.get("PORT").default(3000).asIntPositive();

  const targetDevices = new Map<string, ApiDevice>();
  const origin = buildOrigin();

  const handleDeviceList = (apiDeviceSummaries: ApiDeviceSummary[]) => {
    logger.info("handleDeviceList");
    apiDeviceSummaries.forEach(({ deviceType, mqttTopics }) => {
      if (
        mqtt.isSubscribe(mqttTopics) ||
        // 除外するデバイスタイプは購読しない
        IgnoreDeviceTypePatterns.some((tester) => tester.test(deviceType))
      ) {
        return;
      }
      mqtt.addSubscribe(mqttTopics);
    });
  };

  const handleDevice = (apiDevice: ApiDevice) => {
    logger.info(`handleDevice: ${apiDevice.id}`);
    const discoveryEntries: { relativeTopic: string; payload: Payload }[] = [];
    const device = buildDevice(apiDevice);
    // 単一のプロパティから構成されるコンポーネント(sensor等)
    getSimpleComponentConfigs(apiDevice).forEach(
      ({ component, property, builder }) => {
        const uniqueId = `echonetlite_${apiDevice.id}_simple_${property.name}`;
        const relativeTopic = `${component}/${uniqueId}/config`;
        const payload = builder(apiDevice, property);
        payload.unique_id = uniqueId;
        payload.name = property.schema.propertyName[language];
        const override = getSimpleOverridePayload(apiDevice, property.name);
        discoveryEntries.push({
          relativeTopic,
          payload: { ...payload, ...override },
        });
      },
    );
    // 複数のプロパティから構成されるコンポーネント(climate等)
    getCompositeComponentConfigs(apiDevice).forEach(
      ({ compositeComponentId, component, builder, name }) => {
        const uniqueId = `echonetlite_${apiDevice.id}_composite_${compositeComponentId}`;
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
      },
    );

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
  };

  const mqtt = await createMqtt(handleDeviceList, handleDevice);
  // 更新通知をしないプロパティに対して、定期的に自動リクエストする
  void (async () => {
    for await (const _ of setInterval(autoRequestInterval)) {
      Array.from(targetDevices.values()).map((apiDevice) => {
        const autoRequestProperties = getAutoRequestProperties(apiDevice);
        mqtt.pushE2mRequest(apiDevice, autoRequestProperties);
      });
    }
  })();

  const server = http.createServer((req, res) => {
    const resJson = (o: unknown, statusCode = 200) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(o));
    };

    if (req.url === "/health") {
      resJson({});
    } else if (req.url === "/") {
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
      resJson({
        taskQueueSize: mqtt.taskQueueSize,
        devices,
      });
    } else {
      resJson({ error: "Not Found" }, 404);
    }
  });
  server.listen(port, "0.0.0.0", () => {
    logger.info(`Health check server running on port ${port}`);
  });

  const shutdownHandler = async () => {
    logger.info("shutdown start");
    await mqtt.close();
    server.close(() => {
      logger.info("shutdown finished");
      process.exit(0);
    });
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

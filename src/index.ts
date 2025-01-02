import {
  IgnoreDeviceTypePatterns,
  IgnorePropertyPatterns,
  language,
} from "@/deviceConfig";
import logger from "@/logger";
import {
  buildDevice,
  buildOrigin,
  getCompositeComponentBuilders,
  getSimpleComponentBuilder,
} from "@/payload/builder";
import { Component, Payload } from "@/payload/payloadType";
import { getSimpleComponent } from "@/payload/resolver";
import {
  getCompositeOverridePayload,
  getManifactureConfig,
  getSimpleOverridePayload,
} from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceSummary,
} from "echonetlite2mqtt/server/ApiTypes";
import env from "env-var";
import http from "http";
import mqtt from "mqtt";
import { setInterval } from "timers/promises";

async function main() {
  logger.info("start");

  const haDiscoveryPrefix = env
    .get("HA_DISCOVERY_PREFIX")
    .default("homeassistant")
    .asString();
  const echonetlite2mqttBaseTopic = env
    .get("ECHONETLITE2MQTT_BASE_TOPIC")
    .default("echonetlite2mqtt/elapi/v2/devices")
    .asString();
  const autoRequestInterval = env
    .get("AUTO_REQUEST_INTERVAL")
    .default(60000)
    .asIntPositive();
  const port = env.get("PORT").default(3000).asIntPositive();

  const getDiscoveryTopic = (component: Component, uniqueId: string) => {
    return `${haDiscoveryPrefix}/${component}/${uniqueId}/config`;
  };

  const mqttTaskQueue: (() => Promise<void>)[] = [];
  let isMqttTaskRunning = true;
  const mqttTask = (async () => {
    for await (const _ of setInterval(100)) {
      logger.silly(`mqttTaskQueue.length: ${mqttTaskQueue.length}`);
      if (!isMqttTaskRunning) break;
      const task = mqttTaskQueue.shift();
      if (task) {
        await task();
      }
    }
  })();
  const stopTask = async () => {
    isMqttTaskRunning = false;
    await mqttTask;
  };

  const origin = buildOrigin();

  const createDiscoveryEntries = (apiDevice: ApiDevice) => {
    const discoveryEntries: { topic: string; payload: Payload }[] = [];
    const device = buildDevice(apiDevice);
    const { id: deviceId, deviceType } = apiDevice;

    // 単一のプロパティから構成されるコンポーネント(sensor等)
    apiDevice.properties.forEach((property) => {
      if (
        IgnorePropertyPatterns.some((tester) =>
          tester.test(`${deviceType}_${property.name}`),
        )
      ) {
        logger.debug(`Ignore Property: ${deviceType}_${property.name}`);
        return;
      }
      const uniqueId = `echonetlite_${deviceId}_simple_${property.name}`;
      // コンポーネントの指定がない場合は自動判断する
      const component = getSimpleComponent(apiDevice, property);
      if (!component) {
        return; // 未サポートのプロパティ
      }
      const topic = getDiscoveryTopic(component, uniqueId);
      const builder = getSimpleComponentBuilder(component);
      const payload = builder(apiDevice, property);
      payload.unique_id = uniqueId;
      payload.name = property.schema.propertyName[language];
      const ovverride = getSimpleOverridePayload(apiDevice, property.name);

      discoveryEntries.push({ topic, payload: { ...payload, ...ovverride } });
    });

    // 複数のプロパティから構成されるコンポーネント(climate等)
    getCompositeComponentBuilders(deviceType).forEach(
      ({ compositeComponentId, component, builder, name }) => {
        const uniqueId = `echonetlite_${deviceId}_composite_${compositeComponentId}`;
        const topic = getDiscoveryTopic(component, uniqueId);
        const payload = builder(apiDevice);
        payload.unique_id = uniqueId;
        payload.name = name?.[language] ?? apiDevice.descriptions[language];
        const ovverride = getCompositeOverridePayload(
          apiDevice,
          compositeComponentId,
        );

        discoveryEntries.push({ topic, payload: { ...payload, ...ovverride } });
      },
    );

    return discoveryEntries.map(({ topic, payload }) => ({
      topic,
      payload: {
        ...payload,
        ...device,
        ...origin,
      },
    }));
  };

  const client = await mqtt.connectAsync(
    env.get("MQTT_BROKER").required().asString(),
    {
      username: env.get("MQTT_USERNAME").asString(),
      password: env.get("MQTT_PASSWORD").asString(),
    },
  );

  logger.info("mqtt-client: connected");

  // デバイスリストを購読
  await client.subscribeAsync(echonetlite2mqttBaseTopic);

  const subscribeDevices = new Map<string, ApiDeviceSummary>();

  const handleDeviceList = (apiDeviceSummaries: ApiDeviceSummary[]) => {
    apiDeviceSummaries.forEach((summary) => {
      const { deviceType, mqttTopics } = summary;
      // 除外するデバイスタイプは購読しない
      if (
        IgnoreDeviceTypePatterns.some((tester) => tester.test(deviceType)) ||
        subscribeDevices.has(mqttTopics)
      ) {
        return;
      }
      subscribeDevices.set(mqttTopics, summary);
      // デバイスのtopicを購読
      mqttTaskQueue.push(async () => {
        await client.subscribeAsync(mqttTopics);
        logger.info(`subscribe to: ${mqttTopics}`);
      });
    });
  };

  const handleDevice = (apiDevice: ApiDevice) => {
    logger.info(`handleDevice: ${apiDevice.id}`);
    const discoveryEntries = createDiscoveryEntries(apiDevice);
    discoveryEntries.forEach((entry) => {
      const message = JSON.stringify(entry.payload);
      // Home Assistantへ送信
      mqttTaskQueue.push(async () => {
        await client.publishAsync(entry.topic, message, {
          qos: 1,
          retain: true,
        });
        if (logger.isDebugEnabled()) {
          logger.debug(`publish to: ${entry.topic}`);
          const separator = "-".repeat(80);
          logger.silly(
            separator +
              "\n" +
              JSON.stringify(entry.payload, null, " ") +
              "\n" +
              separator,
          );
        }
      });
    });
  };

  client.on("message", (topic, payload) => {
    logger.debug("receive topic:", topic);
    try {
      if (topic === echonetlite2mqttBaseTopic) {
        handleDeviceList(JSON.parse(payload.toString()) as ApiDeviceSummary[]);
        return;
      } else if (subscribeDevices.has(topic)) {
        const apiDevice = JSON.parse(payload.toString()) as ApiDevice;
        handleDevice(apiDevice);
        return;
      } else {
        logger.error(`unknown topic: ${topic}`);
      }
    } catch (err) {
      logger.error("message error:", err);
    }
  });

  // 更新通知をしないプロパティに対して、定期的に自動リクエストする
  void (async () => {
    for await (const _ of setInterval(autoRequestInterval)) {
      Array.from(subscribeDevices.values()).map(
        ({ deviceType, manufacturer, mqttTopics }) => {
          const autoRequestProperties = getManifactureConfig(
            manufacturer.code,
            "autoRequestProperties",
          );
          const targetProperties = autoRequestProperties?.[deviceType];
          if (!targetProperties) return;
          // TODO multiple requests実装後に見直す
          for (const propertyName of targetProperties) {
            const topic = `${mqttTopics}/properties/${propertyName}/request`;
            mqttTaskQueue.push(async () => {
              await client.publishAsync(topic, "");
            });
            logger.debug(`request: ${topic}`);
          }
        },
      );
    }
  })();

  // ヘルスチェック用のHTTPサーバー
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({}));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(port, "0.0.0.0", () => {
    logger.info(`Health check server running on port ${port}`);
  });

  const shutdownHandler = async () => {
    logger.info("shutdown start");
    await stopTask();
    logger.info("mqttTask: stoped");
    await client.endAsync();
    logger.info("mqtt-client: closed");
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

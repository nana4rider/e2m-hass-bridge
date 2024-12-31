import {
  IgnoreDeviceTypes,
  IgnorePropertyPatterns,
} from "@/config/deviceConfig";
import logger from "@/config/loggerConfig";
import { createDevice, language, origin } from "@/payload";
import {
  getCompositeComponents,
  getSimpleComponent,
  getSimpleComponentBuilder,
} from "@/payload/component";
import { Component, Payload } from "@/payload/type";
import type {
  ApiDevice,
  ApiDeviceSummary,
} from "echonetlite2mqtt/server/ApiTypes";
import env from "env-var";
import http from "http";
import mqtt from "mqtt";

async function main() {
  logger.info("e2m-hass-bridge: start");

  const haDiscoveryPrefix = env
    .get("HA_DISCOVERY_PREFIX")
    .default("homeassistant")
    .asString();
  const echonetlite2mqttBaseTopic = env
    .get("ECHONETLITE2MQTT_BASE_TOPIC")
    .default("echonetlite2mqtt/elapi/v2/devices")
    .asString();
  const port = env.get("PORT").default(3000).asIntPositive();

  const getTopic = (component: Component, uniqueId: string) => {
    return `${haDiscoveryPrefix}/${component}/${uniqueId}/config`;
  };

  const createDiscoveryEntries = (apiDevice: ApiDevice) => {
    const discoveryEntries: { topic: string; payload: Payload }[] = [];
    const device = createDevice(apiDevice);
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
      const component = getSimpleComponent(property);
      if (!component) {
        return; // 未サポートのプロパティ
      }
      const topic = getTopic(component, uniqueId);
      const builder = getSimpleComponentBuilder(component);
      const payload = builder(apiDevice, property);

      payload.unique_id = uniqueId;
      payload.name = property.schema.propertyName[language];

      discoveryEntries.push({ topic, payload });
    });

    // 複数のプロパティから構成されるコンポーネント(climate等)
    getCompositeComponents(deviceType).forEach(
      ({ id, component, builder, name }) => {
        const uniqueId = `echonetlite_${deviceId}_composite_${id}`;
        const topic = getTopic(component, uniqueId);
        const payload = builder(apiDevice);

        payload.unique_id = uniqueId;
        payload.name = name;

        discoveryEntries.push({ topic, payload });
      },
    );

    return discoveryEntries.map(({ topic, payload }) => ({
      topic,
      payload: {
        ...payload,
        device,
        origin,
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

  const subscribeDevices = new Set<string>();

  const handleDeviceList = (apiDeviceSummaries: ApiDeviceSummary[]) => {
    apiDeviceSummaries.forEach(({ deviceType, mqttTopics }) => {
      // 除外するデバイスタイプは購読しない
      if (
        IgnoreDeviceTypes.has(deviceType) ||
        subscribeDevices.has(mqttTopics)
      ) {
        return;
      }
      subscribeDevices.add(mqttTopics);
      // デバイスのtopicを購読
      client.subscribe(mqttTopics);
      logger.debug(`subscribe to: ${mqttTopics}`);
    });
  };

  const handleDevice = (apiDevice: ApiDevice) => {
    logger.info(`handleDevice: ${apiDevice.id}`);
    const discoveryEntries = createDiscoveryEntries(apiDevice);
    discoveryEntries.forEach((entry) => {
      const message = JSON.stringify(entry.payload);
      // Home Assistantへ送信
      client.publish(entry.topic, message, {
        retain: true,
      });
      if (logger.isDebugEnabled()) {
        logger.debug(`publish to: ${entry.topic}`);
        const separator = "-".repeat(80);
        logger.debug(
          separator +
            "\n" +
            JSON.stringify(entry.payload, null, " ") +
            "\n" +
            separator,
        );
      }
    });
  };

  client.on("message", (topic, payload) => {
    logger.debug("receive topic:", topic);
    try {
      if (topic === echonetlite2mqttBaseTopic) {
        handleDeviceList(JSON.parse(payload.toString()) as ApiDeviceSummary[]);
        return;
      }
      if (subscribeDevices.has(topic)) {
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
    logger.info("e2m-hass-bridge: shutdown");
    await client.endAsync();
    logger.info("mqtt-client: closed");
    server.close(() => {
      logger.info("http: closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdownHandler());
  process.on("SIGTERM", () => void shutdownHandler());

  logger.info("e2m-hass-bridge: ready");
}

main().catch((error) => {
  logger.error("e2m-hass-bridge:", error);
  process.exit(1);
});

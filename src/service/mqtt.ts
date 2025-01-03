import { IgnoreDeviceTypePatterns } from "@/deviceConfig";
import logger from "@/logger";
import { Payload } from "@/payload/payloadType";
import { toJson } from "@/util/dataTransformUtil";
import { ApiDevice, ApiDeviceSummary } from "echonetlite2mqtt/server/ApiTypes";
import env from "env-var";
import mqttjs from "mqtt";
import { setInterval } from "timers/promises";

export default async function createMqtt(
  handleDevice: (apiDevice: ApiDevice) => void,
) {
  const haDiscoveryPrefix = env
    .get("HA_DISCOVERY_PREFIX")
    .default("homeassistant")
    .asString();
  const echonetlite2mqttBaseTopic = env
    .get("ECHONETLITE2MQTT_BASE_TOPIC")
    .default("echonetlite2mqtt/elapi/v2/devices")
    .asString();
  const mqttTaskInterval = env
    .get("MQTT_TASK_INTERVAL")
    .default(100)
    .asIntPositive();

  const client = await mqttjs.connectAsync(
    env.get("MQTT_BROKER").required().asString(),
    {
      username: env.get("MQTT_USERNAME").asString(),
      password: env.get("MQTT_PASSWORD").asString(),
    },
  );

  const subscribeDeviceTopics = new Set<string>();
  const handleDeviceList = (apiDeviceSummaries: ApiDeviceSummary[]) => {
    logger.info("[MQTT] handleDeviceList");
    apiDeviceSummaries.forEach(({ deviceType, mqttTopics }) => {
      if (
        subscribeDeviceTopics.has(mqttTopics) ||
        // 除外するデバイスタイプは購読しない
        IgnoreDeviceTypePatterns.some((tester) => tester.test(deviceType))
      ) {
        return;
      }
      subscribeDeviceTopics.add(mqttTopics);
      taskQueue.push(async () => {
        await client.subscribeAsync(mqttTopics);
        logger.info(`[MQTT] subscribe to: ${mqttTopics}`);
      });
    });
  };

  client.on("message", (topic, payload) => {
    logger.debug("[MQTT] receive topic:", topic);
    try {
      if (topic === echonetlite2mqttBaseTopic) {
        handleDeviceList(toJson(payload.toString()));
        return;
      } else if (subscribeDeviceTopics.has(topic)) {
        handleDevice(toJson(payload.toString()));
        return;
      } else {
        logger.error(`[MQTT] unknown topic: ${topic}`);
      }
    } catch (err) {
      logger.error("[MQTT] message error:", err);
    }
  });

  logger.info("[MQTT] connected");

  // デバイスリストを購読
  await client.subscribeAsync(echonetlite2mqttBaseTopic);

  const taskQueue: (() => Promise<void>)[] = [];
  let isMqttTaskRunning = true;
  const mqttTask = (async () => {
    for await (const _ of setInterval(mqttTaskInterval)) {
      logger.silly(`[MQTT] taskQueue: ${taskQueue.length}`);
      if (!isMqttTaskRunning) break;
      const task = taskQueue.shift();
      if (task) {
        await task();
      }
    }
  })();

  const close = async () => {
    isMqttTaskRunning = false;
    await mqttTask;
    logger.info("[MQTT] task stoped");
    await client.endAsync();
    logger.info("[MQTT] closed");
  };

  const pushHassDiscovery = (
    relativeTopic: string,
    payload: Payload,
    callback: () => void,
  ) => {
    const message = JSON.stringify(payload);
    taskQueue.push(async () => {
      await client.publishAsync(
        `${haDiscoveryPrefix}/${relativeTopic}`,
        message,
        {
          qos: 1,
          retain: true,
        },
      );
      if (logger.isDebugEnabled()) {
        logger.debug(`[MQTT] pushHassDiscovery: ${relativeTopic}`);
        const separator = "-".repeat(80);
        logger.silly(
          separator +
            "\n" +
            JSON.stringify(payload, null, " ") +
            "\n" +
            separator,
        );
      }
      callback();
    });
  };

  const pushE2mRequest = (apiDevice: ApiDevice, propertyNames: string[]) => {
    // TODO multiple requests
    for (const propertyName of propertyNames) {
      const topic = `${apiDevice.mqttTopics}/properties/${propertyName}/request`;
      taskQueue.push(async () => {
        await client.publishAsync(topic, "");
        logger.debug(`[MQTT] pushE2mRequest: ${topic}`);
      });
    }
  };

  return {
    get taskQueueSize() {
      return taskQueue.length;
    },
    pushHassDiscovery,
    pushE2mRequest,
    close,
  };
}

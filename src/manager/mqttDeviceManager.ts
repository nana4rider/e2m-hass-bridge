import { IgnoreDeviceTypePatterns } from "@/deviceConfig";
import env from "@/env";
import logger from "@/logger";
import {
  buildDevice,
  buildDiscoveryEntries,
  buildOrigin,
} from "@/payload/builder";
import { Payload } from "@/payload/payloadType";
import initializeMqttClient from "@/service/mqtt";
import { parseJson } from "@/util/dataTransformUtil";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import { ApiDevice, ApiDeviceSummary } from "echonetlite2mqtt/server/ApiTypes";
import { setTimeout } from "timers/promises";

export default async function setupMqttDeviceManager(
  targetDevices: Map<string, ApiDevice>,
) {
  const origin = await buildOrigin();

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
      mqtt.addSubscribe(mqttTopics);
    });
  };

  const handleDevice = (apiDevice: ApiDevice) => {
    logger.info(`handleDevice: ${apiDevice.id}`);
    const device = buildDevice(apiDevice);

    const entries = buildDiscoveryEntries(apiDevice);
    if (entries.length > 0) {
      targetDevices.set(apiDevice.id, apiDevice);
    }

    entries.forEach(({ relativeTopic, payload: entityPayload }) => {
      // Home Assistantへ送信
      const payload: Payload = {
        ...entityPayload,
        ...device,
        ...origin,
      };
      mqtt.publish(
        `${env.HA_DISCOVERY_PREFIX}/${relativeTopic}`,
        JSON.stringify(payload),
        {
          qos: 1,
          retain: true,
        },
      );

      /* istanbul ignore next */
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
    });
  };

  const handleMessage = (topic: string, message: string) => {
    if (topic === env.ECHONETLITE2MQTT_BASE_TOPIC) {
      handleDeviceList(parseJson(message));
      return;
    } else if (subscribeDeviceTopics.has(topic)) {
      handleDevice(parseJson(message));
      return;
    } else {
      logger.error(`[MQTT] unknown topic: ${topic}, message: ${message}`);
    }
  };

  const mqtt = await initializeMqttClient(
    [env.ECHONETLITE2MQTT_BASE_TOPIC],
    handleMessage,
  );

  // 更新通知をしないプロパティに対して、定期的に自動リクエストする
  void (async () => {
    while (true) {
      for (const apiDevice of Array.from(targetDevices.values())) {
        const topic = `${apiDevice.mqttTopics}/properties/request`;

        const autoRequestProperties = getAutoRequestProperties(apiDevice);
        const requestData: Record<string, string> = {};
        for (const propertyName of autoRequestProperties) {
          requestData[propertyName] = "";
        }
        const message = JSON.stringify(requestData);
        mqtt.publish(topic, message);
        logger.debug(
          `[MQTT] request e2m message: ${message} id: ${apiDevice.id}`,
        );
      }
      await setTimeout(env.AUTO_REQUEST_INTERVAL);
    }
  })();

  return mqtt;
}

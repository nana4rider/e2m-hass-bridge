import env from "@/env";
import logger from "@/logger";
import { randomBytes } from "crypto";
import mqttjs from "mqtt";
import { name as packageName } from "package.json";
import { setTimeout } from "timers/promises";

export type MqttClient = {
  taskQueueSize: number;
  publish: (
    topic: string,
    message: string,
    options?: { retain?: boolean; qos?: 0 | 1 | 2 },
  ) => void;
  addSubscribe: (topic: string) => void;
  close: (wait?: boolean) => Promise<void>;
  setMessageHandler: (
    handler: (topic: string, message: string) => void | Promise<void>,
  ) => void;
};

export default async function initializeMqttClient(): Promise<MqttClient> {
  const client = await mqttjs.connectAsync(env.MQTT_BROKER, {
    clientId: `${packageName}_${randomBytes(4).toString("hex")}`,
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
  });
  const taskQueue: (() => Promise<void>)[] = [];
  let currentMessageHandler:
    | ((topic: string, payload: Buffer) => void)
    | undefined;

  const setupMessageHandler = (
    handler: (topic: string, message: string) => void | Promise<void>,
  ) => {
    // 既存のリスナーを削除
    if (currentMessageHandler) {
      client.removeListener("message", currentMessageHandler);
    }

    // 新しいリスナーを作成
    currentMessageHandler = (topic, payload) => {
      logger.debug(`[MQTT] receive topic: ${topic}`);
      try {
        const result = handler(topic, payload.toString());
        if (result instanceof Promise) {
          result.catch((err) => {
            logger.error("[MQTT] message error:", err);
          });
        }
      } catch (err) {
        logger.error("[MQTT] message error:", err);
      }
    };

    // 新しいリスナーを登録
    client.on("message", currentMessageHandler);
  };

  logger.info("[MQTT] connected");

  client.on("error", (error) => {
    logger.error(`[MQTT] error: ${error.message}`);
  });

  let isMqttTaskRunning = true;
  const mqttTask = (async () => {
    while (isMqttTaskRunning) {
      logger.silly(`[MQTT] taskQueue: ${taskQueue.length}`);
      const task = taskQueue.shift();
      if (task) {
        await task();
      }
      await setTimeout(env.MQTT_TASK_INTERVAL);
    }
  })();

  const close = async (wait: boolean = false): Promise<void> => {
    if (wait) {
      logger.info("[MQTT] waiting for taskQueue to empty...");
      while (taskQueue.length > 0) {
        await setTimeout(env.MQTT_TASK_INTERVAL);
      }
      logger.info("[MQTT] taskQueue is empty");
    }

    isMqttTaskRunning = false;
    await mqttTask;
    logger.info("[MQTT] task stopped");
    await client.endAsync();
    logger.info("[MQTT] closed");
  };

  const publish = (
    topic: string,
    message: string,
    options?: { retain?: boolean; qos?: 0 | 1 | 2 },
  ): void => {
    taskQueue.push(async () => {
      await client.publishAsync(topic, message, options);
    });
  };

  const addSubscribe = (topic: string): void => {
    taskQueue.push(async () => {
      logger.debug(`[MQTT] subscribe topic: ${topic}`);
      await client.subscribeAsync(topic);
    });
  };

  return {
    get taskQueueSize() {
      return taskQueue.length;
    },
    publish,
    addSubscribe,
    close,
    setMessageHandler: (handler) => {
      setupMessageHandler(handler);
    },
  };
}

import env from "@/env";
import logger from "@/logger";
import mqttjs from "mqtt";
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
};

export default async function initializeMqttClient(
  subscribeTopics: string[],
  handleMessage: (topic: string, message: string) => void | Promise<void>,
) {
  const client = await mqttjs.connectAsync(env.MQTT_BROKER, {
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
  });
  const taskQueue: (() => Promise<void>)[] = [];

  client.on("message", (topic, payload) => {
    logger.debug(`[MQTT] receive topic: ${topic}`);
    try {
      const result = handleMessage(topic, payload.toString());
      if (result instanceof Promise) {
        result.catch((err) => {
          logger.error("[MQTT] message error:", err);
        });
      }
    } catch (err) {
      logger.error("[MQTT] message error:", err);
    }
  });

  logger.info("[MQTT] connected");

  await client.subscribeAsync(subscribeTopics);

  for (const topic of subscribeTopics) {
    logger.debug(`[MQTT] subscribe topic: ${topic}`);
  }

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
  };
}

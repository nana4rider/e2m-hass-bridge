import logger from "@/logger";
import env from "env-var";
import mqttjs from "mqtt";
import { setTimeout } from "timers/promises";

const MQTT_BROKER = env.get("MQTT_BROKER").required().asString();
const MQTT_USERNAME = env.get("MQTT_USERNAME").asString();
const MQTT_PASSWORD = env.get("MQTT_PASSWORD").asString();
const MQTT_TASK_INTERVAL = env
  .get("MQTT_TASK_INTERVAL")
  .default(100)
  .asIntPositive();

export default async function initializeMqttClient(
  subscribeTopics: string[],
  handleMessage: (topic: string, message: string) => void | Promise<void>,
) {
  const client = await mqttjs.connectAsync(MQTT_BROKER, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
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
      await setTimeout(MQTT_TASK_INTERVAL);
    }
  })();

  const close = async (wait: boolean = false): Promise<void> => {
    if (wait) {
      logger.info("[MQTT] waiting for taskQueue to empty...");
      while (taskQueue.length > 0) {
        await setTimeout(MQTT_TASK_INTERVAL);
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

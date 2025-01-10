import logger from "@/logger";
import setupHttpDeviceManager from "@/manager/httpDeviceManager";
import setupMqttDeviceManager from "@/manager/mqttDeviceManager";
import { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

async function main() {
  logger.info("start");

  const targetDevices = new Map<string, ApiDevice>();
  const mqtt = await setupMqttDeviceManager(targetDevices);
  const http = await setupHttpDeviceManager(
    targetDevices,
    () => mqtt.taskQueueSize,
  );

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

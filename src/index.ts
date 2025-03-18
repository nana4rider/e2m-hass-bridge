import logger from "@/logger";
import setupMqttDeviceManager from "@/manager/mqttDeviceManager";
import initializeHttpServer from "@/service/http";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

async function main() {
  logger.info("start");

  const targetDevices = new Map<string, ApiDevice>();
  const { mqtt, stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
  const http = await initializeHttpServer(
    targetDevices,
    () => mqtt.taskQueueSize,
  );

  const handleShutdown = async () => {
    logger.info("shutdown start");
    await stopAutoRequest();
    await mqtt.close();
    await http.close();
    logger.info("shutdown finished");
    process.exit(0);
  };

  process.on("SIGINT", () => void handleShutdown());
  process.on("SIGTERM", () => void handleShutdown());

  logger.info("ready");
}

try {
  await main();
} catch (err) {
  logger.error("main() error:", err);
  process.exit(1);
}

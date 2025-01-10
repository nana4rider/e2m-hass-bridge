import {
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import initializeHttpServer from "@/service/http";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

export default async function setupHttpDeviceManager(
  targetDevices: Map<string, ApiDevice>,
  getTaskQueueSize: () => number,
) {
  const http = await initializeHttpServer();
  http.setEndpoint("/health", () => ({}));
  http.setEndpoint("/", () => {
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
    return {
      taskQueueSize: getTaskQueueSize(),
      devices,
    };
  });

  return http;
}

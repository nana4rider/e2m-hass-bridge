import { Payload } from "@/payload/type";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function textBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  return {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
  };
}

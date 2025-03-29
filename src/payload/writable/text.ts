import type { Payload } from "@/payload/payloadType";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildText(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  return {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
  };
}

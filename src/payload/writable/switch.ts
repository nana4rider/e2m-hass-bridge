import { Payload } from "@/payload/payloadType";
import { assertBooleanType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildSwitch(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assertBooleanType(data);

  const [on, off] = data.enum;

  return {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
    payload_on: on.name,
    payload_off: off.name,
  };
}

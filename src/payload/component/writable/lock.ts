import { Payload } from "@/payload/type";
import { assertBooleanType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function lockBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assertBooleanType(data);
  const [lock, unlock] = data.enum;

  return {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
    payload_lock: lock.name,
    payload_unlock: unlock.name,
    state_lock: lock.name,
    state_unlock: unlock.name,
    optimistic: false,
    qos: 1,
    retain: true,
  };
}

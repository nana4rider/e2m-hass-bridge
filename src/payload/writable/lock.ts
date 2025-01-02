import { Payload } from "@/payload/payloadType";
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
    state_locked: lock.name,
    state_unlocked: unlock.name,
    qos: 1,
    retain: true,
  };
}

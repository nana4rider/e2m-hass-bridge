import { Payload } from "@/payload/payloadType";
import { isBooleanType } from "@/util/deviceUtil";
import assert from "assert";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildLock(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assert(isBooleanType(data));
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

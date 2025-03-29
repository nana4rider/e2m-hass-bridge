import type { Payload } from "@/payload/payloadType";
import { isBooleanType } from "@/util/deviceUtil";
import assert from "assert";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildBinarySensor(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assert(isBooleanType(data));

  const [on, off] = data.enum;
  const deviceClass = getDeviceClass(apiDevice, property);

  const payload: Payload = {
    state_topic: property.mqttTopics,
    payload_on: on.name,
    payload_off: off.name,
  };

  if (deviceClass !== undefined) {
    payload.device_class = deviceClass;
  }

  return payload;
}

function getDeviceClass(
  { deviceType }: ApiDevice,
  { name }: ApiDeviceProperty,
): string | undefined {
  if (deviceType === "humanDetectionSensor" && name === "detection") {
    return "motion";
  }

  if (name === "faultStatus") {
    return "problem";
  } else if (name.match(/door/i)) {
    return "door";
  } else if (name.match(/Status$/)) {
    return "running";
  } else {
    return undefined;
  }
}

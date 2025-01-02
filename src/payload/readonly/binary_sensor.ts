import { Payload } from "@/payload/payloadType";
import { assertBooleanType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function binarySensorBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assertBooleanType(data);

  const [on, off] = data.enum;
  const deviceClass = getDeviceClass(apiDevice, property, on.name);

  const payload: Payload = {
    state_topic: property.mqttTopics,
    payload_on: on.name,
    payload_off: off.name,
  };

  if (deviceClass) {
    payload.device_class = deviceClass;
  }

  return payload;
}

function getDeviceClass(
  { deviceType }: ApiDevice,
  { name }: ApiDeviceProperty,
  onValue: string,
): string | undefined {
  if (deviceType === "humanDetectionSensor" && name === "detection") {
    return "motion";
  }

  if (name === "smokeDetection") {
    return "smoke";
  } else if (name === "faultStatus") {
    return "problem";
  } else if (name.match(/door/i)) {
    return "door";
  } else if (name.match(/detection/i)) {
    return "motion";
  } else if (name.match(/Status$/)) {
    return "running";
  } else if (onValue === "open") {
    return "opening";
  } else {
    return undefined;
  }
}

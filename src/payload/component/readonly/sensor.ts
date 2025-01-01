import { Payload } from "@/payload/type";
import { getUnit, isElNumberType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function sensorBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;

  const payload: Payload = {
    state_topic: property.mqttTopics,
  };

  const deviceClass = getDeviceClass(apiDevice, property);
  if (deviceClass) {
    payload.device_class = deviceClass;
  }

  if (isElNumberType(data)) {
    const nativeValue =
      !data.multiple || Number.isInteger(data.multiple) ? "int" : "float";
    payload.native_value = nativeValue;
    payload.value_template = `
{% if value | ${nativeValue}(default=None) is not none %}
  {{ value | ${nativeValue} }}
{% else %}
  unknown
{% endif %}
`.trim();
  }

  const unit = getUnit(data);
  if (unit) {
    payload.unit_of_measurement = unit;
  }

  return payload;
}

function getDeviceClass(
  { deviceType }: ApiDevice,
  { name }: ApiDeviceProperty,
): string | undefined {
  if (deviceType === "temperatureSensor" && name === "value") {
    return "temperature";
  } else if (deviceType === "humiditySensor" && name === "value") {
    return "humidity";
  }

  if (name === "consumedCumulativeElectricEnergy") {
    return "energy";
  } else if (
    name === "remainingWater" ||
    name === "tankCapacity" ||
    name.match(/^bathWaterVolume/)
  ) {
    return "volume";
  } else if (name.match(/ElectricPowerFor/)) {
    return "power";
  } else if (name.match(/temperature/i)) {
    return "temperature";
  } else if (name.match(/humidity/i)) {
    return "humidity";
  } else {
    return undefined;
  }
}

import { language } from "@/deviceConfig";
import { Payload } from "@/payload/payloadType";
import { formattedPythonDict } from "@/util/dataTransformUtil";
import { getUnit, isElNumberType, isElStateType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function buildSensor(
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

  const stateClass = getStateClass(property);
  if (stateClass) {
    payload.state_class = stateClass;
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
  } else if (isElStateType(data)) {
    const valueMapping: Record<string, string> = {};
    data.enum.forEach(({ name, descriptions }) => {
      valueMapping[name] = descriptions[language];
    });

    payload.value_template = `
{% set mapping = ${formattedPythonDict(valueMapping)} %}
{{ mapping.get(value, 'unknown') }}
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

function getStateClass({ name }: ApiDeviceProperty): string | undefined {
  if (name === "consumedCumulativeElectricEnergy") {
    return "total_increasing";
  }

  return undefined;
}

import { language } from "@/deviceConfig";
import { Payload } from "@/payload/payloadType";
import { formattedPythonDict } from "@/util/dataTransformUtil";
import { assertElStateType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function buildSelect(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assertElStateType(data);

  const valueMapping: Record<string, string> = {};
  const commandMapping: Record<string, string> = {};
  data.enum.forEach(({ name, descriptions }) => {
    valueMapping[name] = descriptions[language];
    commandMapping[descriptions[language]] = name;
  });

  return {
    options: Object.values(valueMapping),
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
    value_template: `
{% set mapping = ${formattedPythonDict(valueMapping)} %}
{{ mapping.get(value, 'unknown') }}
`.trim(),
    command_template: `
{% set mapping = ${formattedPythonDict(commandMapping)} %}
{{ mapping[value] }}
`.trim(),
  };
}

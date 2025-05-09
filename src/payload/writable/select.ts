import env from "@/env";
import type { Payload } from "@/payload/payloadType";
import { formattedPythonDict } from "@/util/dataTransformUtil";
import { isElStateType } from "@/util/deviceUtil";
import assert from "assert";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildSelect(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assert(isElStateType(data));

  const valueMapping: Record<string, string> = {};
  const commandMapping: Record<string, string> = {};
  data.enum.forEach(({ name, descriptions }) => {
    valueMapping[name] = descriptions[env.DESCRIPTION_LANGUAGE];
    commandMapping[descriptions[env.DESCRIPTION_LANGUAGE]] = name;
  });

  return {
    options: Object.values(valueMapping),
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
    value_template: `
{% set mapping = ${formattedPythonDict(valueMapping)} %}
{{ mapping.get(value) }}
`.trim(),
    command_template: `
{% set mapping = ${formattedPythonDict(commandMapping)} %}
{{ mapping[value] }}
`.trim(),
  };
}

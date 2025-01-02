import { language } from "@/deviceConfig";
import { climateBuilder } from "@/payload/composite/climate";
import { coverBuilder } from "@/payload/composite/cover";
import {
  CompositeComponentConfig,
  Payload,
  SimpleComponent,
  SimpleComponentBuilder,
} from "@/payload/payloadType";
import { binarySensorBuilder } from "@/payload/readonly/binary_sensor";
import { sensorBuilder } from "@/payload/readonly/sensor";
import { lockBuilder } from "@/payload/writable/lock";
import { numberBuilder } from "@/payload/writable/number";
import { selectBuilder } from "@/payload/writable/select";
import { switchBuilder } from "@/payload/writable/switch";
import { textBuilder } from "@/payload/writable/text";
import { getAsciiProductCode, getManufacturerName } from "@/util/deviceUtil";
import { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import { homepage, name as packageName, version } from "package.json";

/** 単一のプロパティから構成されるコンポーネント */
const simpleComponentBuilder = new Map<
  SimpleComponent,
  SimpleComponentBuilder
>();
// readonly
simpleComponentBuilder.set("binary_sensor", binarySensorBuilder);
simpleComponentBuilder.set("sensor", sensorBuilder);
simpleComponentBuilder.set("select", selectBuilder);
simpleComponentBuilder.set("number", numberBuilder);
simpleComponentBuilder.set("text", textBuilder);
// writable
simpleComponentBuilder.set("switch", switchBuilder);
simpleComponentBuilder.set("light", switchBuilder);
simpleComponentBuilder.set("lock", lockBuilder);

/**
 * 複数のプロパティから構成されるコンポーネント
 */
const compositeComponentConfigs = new Map<string, CompositeComponentConfig[]>();
compositeComponentConfigs.set("homeAirConditioner", [
  {
    compositeComponentId: "climate",
    component: "climate",
    builder: climateBuilder,
  },
]);
compositeComponentConfigs.set("electricRainDoor", [
  {
    compositeComponentId: "cover",
    component: "cover",
    builder: coverBuilder,
  },
]);

export function getSimpleComponentBuilder(
  component: SimpleComponent,
): SimpleComponentBuilder {
  const builder = simpleComponentBuilder.get(component);
  if (builder) return builder;
  throw new Error(
    `Simple Component builder for '${component}' is not registered.`,
  );
}

export function getCompositeComponentBuilders(
  deviceType: string,
): CompositeComponentConfig[] {
  return compositeComponentConfigs.get(deviceType) ?? [];
}

export function deviceBuilder(apiDevice: ApiDevice): Readonly<Payload> {
  const device: Payload = {
    identifiers: [`echonetlite_${apiDevice.id}`],
    name: `${apiDevice.descriptions[language]}(${apiDevice.ip})`,
    manufacturer: getManufacturerName(apiDevice),
  };
  const model = getAsciiProductCode(apiDevice);
  if (model) device.model = model;
  return { device };
}

export function originBuilder(): Readonly<Payload> {
  const origin: Payload = {};
  if (typeof packageName === "string") origin.name = packageName;
  if (typeof version === "string") origin.sw_version = version;
  if (typeof homepage === "string") origin.support_url = homepage;
  return { origin };
}

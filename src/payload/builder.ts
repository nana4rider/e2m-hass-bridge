import { IgnorePropertyPatterns } from "@/deviceConfig";
import env from "@/env";
import logger from "@/logger";
import buildClimate from "@/payload/composite/climate";
import buildCover from "@/payload/composite/cover";
import {
  CompositeComponentConfig,
  Payload,
  SimpleComponent,
  SimpleComponentBuilder,
  SimpleComponentConfig,
} from "@/payload/payloadType";
import buildBinarySensor from "@/payload/readonly/binary_sensor";
import buildSensor from "@/payload/readonly/sensor";
import { createUniqueId, getSimpleComponent } from "@/payload/resolver";
import buildLock from "@/payload/writable/lock";
import buildNumber from "@/payload/writable/number";
import buildSelect from "@/payload/writable/select";
import buildSwitch from "@/payload/writable/switch";
import buildText from "@/payload/writable/text";
import {
  getAsciiProductCode,
  getCompositeOverridePayload,
  getManufacturerName,
  getSimpleOverridePayload,
} from "@/util/deviceUtil";
import assert from "assert";
import { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import {
  homepage as packageHomepage,
  name as packageName,
  version as packageVersion,
} from "~/package.json";

/** 単一のプロパティから構成されるコンポーネント */
const simpleComponentBuilder = new Map<
  SimpleComponent,
  SimpleComponentBuilder
>();
// readonly
simpleComponentBuilder.set("binary_sensor", buildBinarySensor);
simpleComponentBuilder.set("sensor", buildSensor);
simpleComponentBuilder.set("select", buildSelect);
simpleComponentBuilder.set("number", buildNumber);
simpleComponentBuilder.set("text", buildText);
// writable
simpleComponentBuilder.set("switch", buildSwitch);
simpleComponentBuilder.set("light", buildSwitch);
simpleComponentBuilder.set("lock", buildLock);

/**
 * 複数のプロパティから構成されるコンポーネント
 */
const compositeComponentConfigs = new Map<string, CompositeComponentConfig[]>();
compositeComponentConfigs.set("homeAirConditioner", [
  {
    compositeComponentId: "climate",
    component: "climate",
    builder: buildClimate,
  },
]);
compositeComponentConfigs.set("electricRainDoor", [
  {
    compositeComponentId: "cover",
    component: "cover",
    builder: buildCover,
  },
]);

export function getSimpleComponentConfigs(
  apiDevice: ApiDevice,
): SimpleComponentConfig[] {
  const { deviceType } = apiDevice;
  const simpleComponentBuilders: SimpleComponentConfig[] = [];

  apiDevice.properties.forEach((property) => {
    if (
      IgnorePropertyPatterns.some((tester) =>
        tester.test(`${deviceType}_${property.name}`),
      )
    ) {
      // 除外されたプロパティ
      logger.debug(`Ignore Property: ${deviceType}_${property.name}`);
      return;
    }
    const component = getSimpleComponent(apiDevice, property);
    if (!component) {
      // 未サポートのプロパティ
      logger.debug(`Unsupported Property: ${deviceType}_${property.name}`);
      return;
    }
    const builder = simpleComponentBuilder.get(component);
    assert(
      builder,
      `Simple Component builder for '${component}' is not registered.`,
    );

    simpleComponentBuilders.push({ property, component, builder });
  });

  return simpleComponentBuilders;
}

export function getCompositeComponentConfigs({
  deviceType,
}: ApiDevice): CompositeComponentConfig[] {
  return compositeComponentConfigs.get(deviceType) ?? [];
}

export function buildDevice(apiDevice: ApiDevice): Readonly<Payload> {
  const device: Payload = {
    identifiers: [`echonetlite_${apiDevice.id}`],
    name: `${apiDevice.descriptions[env.DESCRIPTION_LANGUAGE]}(${apiDevice.ip})`,
    manufacturer: getManufacturerName(apiDevice),
  };
  const model = getAsciiProductCode(apiDevice);
  if (model !== undefined) device.model = model;
  return { device };
}

export function buildOrigin(): Readonly<Payload> {
  const origin: Payload = {};
  if (typeof packageName === "string") origin.name = packageName;
  if (typeof packageVersion === "string") origin.sw_version = packageVersion;
  if (typeof packageHomepage === "string") origin.support_url = packageHomepage;
  return { origin };
}

export function buildDiscoveryEntries(apiDevice: ApiDevice) {
  const discoveryEntries: { relativeTopic: string; payload: Payload }[] = [];
  // 単一のプロパティから構成されるコンポーネント(sensor等)
  getSimpleComponentConfigs(apiDevice).forEach((componentConfig) => {
    const { component, property, builder } = componentConfig;
    const uniqueId = createUniqueId(apiDevice, componentConfig);
    const relativeTopic = `${component}/${uniqueId}/config`;
    const payload = builder(apiDevice, property);
    payload.unique_id = uniqueId;
    payload.name = property.schema.propertyName[env.DESCRIPTION_LANGUAGE];
    const override = getSimpleOverridePayload(apiDevice, property.name);
    discoveryEntries.push({
      relativeTopic,
      payload: { ...payload, ...override },
    });
  });
  // 複数のプロパティから構成されるコンポーネント(climate等)
  getCompositeComponentConfigs(apiDevice).forEach((componentConfig) => {
    const { compositeComponentId, component, builder, name } = componentConfig;
    const uniqueId = createUniqueId(apiDevice, componentConfig);
    const relativeTopic = `${component}/${uniqueId}/config`;
    const payload = builder(apiDevice);
    payload.unique_id = uniqueId;
    payload.name =
      name?.[env.DESCRIPTION_LANGUAGE] ??
      apiDevice.descriptions[env.DESCRIPTION_LANGUAGE];
    const override = getCompositeOverridePayload(
      apiDevice,
      compositeComponentId,
    );
    discoveryEntries.push({
      relativeTopic,
      payload: { ...payload, ...override },
    });
  });

  return discoveryEntries;
}

import type { ApiDeviceProperty } from "echonetlite2mqtt/server/ApiTypes";
import {
  isBooleanType,
  isElNumberType,
  isElStateType,
} from "../../util/deviceUtil";
import {
  CompositeComponentConfig,
  SimpleComponent,
  SimpleComponentBuilder,
} from "../type";
import { climateBuilder } from "./composite/climate";
import { binarySensorBuilder } from "./readonly/binary_sensor";
import { sensorBuilder } from "./readonly/sensor";
import { lockBuilder } from "./writable/lock";
import { numberBuilder } from "./writable/number";
import { selectBuilder } from "./writable/select";
import { switchBuilder } from "./writable/switch";
import { textBuilder } from "./writable/text";

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
simpleComponentBuilder.set("lock", lockBuilder);

/**
 * 複数のプロパティから構成されるコンポーネント
 * レコードのキーは、unique_idの一部に使用します。
 */
const compositeComponentConfigs = new Map<
  string,
  Record<string, CompositeComponentConfig>
>();
compositeComponentConfigs.set("homeAirConditioner", {
  main: {
    name: "エアコン",
    component: "climate",
    builder: climateBuilder,
  },
});

export function getSimpleComponentBuilder(
  component: SimpleComponent,
): SimpleComponentBuilder {
  const builder = simpleComponentBuilder.get(component);
  if (builder) return builder;
  throw new Error(
    `Simple Component builder for '${component}' is not registered.`,
  );
}

export function getCompositeComponents(
  deviceType: string,
): (CompositeComponentConfig & { id: string })[] {
  const compositeComponentConfig = compositeComponentConfigs.get(deviceType);
  if (!compositeComponentConfig) return [];

  return Object.entries(compositeComponentConfig).map(([id, config]) => ({
    ...config,
    ...{ id },
  }));
}

export function getSimpleComponent(
  property: ApiDeviceProperty,
): SimpleComponent | undefined {
  const { data, accessRule } = property.schema;
  // 値を読み取れないプロパティはサポートしない
  if (accessRule.get === "notApplicable") {
    return undefined;
  }

  if (property.writable) {
    // 更新可
    if (isBooleanType(data)) {
      return "switch";
    } else if (isElStateType(data)) {
      return "select";
    } else if (isElNumberType(data)) {
      return "number";
    } else {
      return "text";
    }
  } else {
    // 更新不可
    if (
      isBooleanType(data) ||
      (isElStateType(data) && data.enum[0].name === "open")
    ) {
      return "binary_sensor";
    } else {
      return "sensor";
    }
  }
}

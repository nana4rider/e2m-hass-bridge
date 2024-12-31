import { climateBuilder } from "@/payload/component/composite/climate";
import { binarySensorBuilder } from "@/payload/component/readonly/binary_sensor";
import { sensorBuilder } from "@/payload/component/readonly/sensor";
import { lockBuilder } from "@/payload/component/writable/lock";
import { numberBuilder } from "@/payload/component/writable/number";
import { selectBuilder } from "@/payload/component/writable/select";
import { switchBuilder } from "@/payload/component/writable/switch";
import { textBuilder } from "@/payload/component/writable/text";
import {
  CompositeComponentConfig,
  SimpleComponent,
  SimpleComponentBuilder,
} from "@/payload/type";

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

export function getCompositeComponentBuilders(
  deviceType: string,
): (CompositeComponentConfig & { id: string })[] {
  const compositeComponentConfig = compositeComponentConfigs.get(deviceType);
  if (!compositeComponentConfig) return [];

  return Object.entries(compositeComponentConfig).map(([id, config]) => ({
    ...config,
    ...{ id },
  }));
}

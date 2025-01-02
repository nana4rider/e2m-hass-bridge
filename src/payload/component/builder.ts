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
simpleComponentBuilder.set("light", switchBuilder);
simpleComponentBuilder.set("lock", lockBuilder);

/**
 * 複数のプロパティから構成されるコンポーネント
 */
const compositeComponentConfigs = new Map<string, CompositeComponentConfig[]>();
compositeComponentConfigs.set("homeAirConditioner", [
  {
    compositeComponentId: "climate",
    name: {
      ja: "エアコン",
      en: "Air Conditioner",
    },
    component: "climate",
    builder: climateBuilder,
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

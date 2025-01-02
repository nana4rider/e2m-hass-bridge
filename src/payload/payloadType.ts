import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
export type Payload = Record<string, JSONValue>;

export type SimpleComponent =
  // readonly
  | "binary_sensor"
  | "sensor"
  // writable
  | "switch"
  | "light"
  | "lock"
  | "select"
  | "number"
  | "text";
export type CompositeComponent = "climate" | "cover";
export type Component = SimpleComponent | CompositeComponent;

/** Home Assistantにおけるunique_idのsuffixに利用される */
export type CompositeComponentId = "climate" | "cover";

export type SimpleComponentBuilder = (
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
) => Payload;
export type SimpleComponentConfig = {
  component: SimpleComponent;
  property: ApiDeviceProperty;
  builder: SimpleComponentBuilder;
};

export type CompositeComponentBuilder = (apiDevice: ApiDevice) => Payload;
export type CompositeComponentConfig = {
  compositeComponentId: CompositeComponentId;
  /** 設定しない場合は、descriptionが採用される */
  name?: {
    ja: string;
    en: string;
  };
  /** SimpleComponentも指定可能(複数のプロパティを組み合わせたスイッチ等) */
  component: Component;
  builder: CompositeComponentBuilder;
};

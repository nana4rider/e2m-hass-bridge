import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export type Component = SimpleComponent | CompositeComponent;
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
export type CompositeComponent = "climate";

export type SimpleComponentBuilder = (
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
) => Payload;

export type CompositeComponentBuilder = (apiDevice: ApiDevice) => Payload;

export type CompositeComponentConfig = {
  name: string;
  /** SimpleComponentも指定可能(複数のプロパティを組み合わせたスイッチ等) */
  component: Component;
  builder: CompositeComponentBuilder;
};
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
export type Payload = Record<string, JSONValue>;

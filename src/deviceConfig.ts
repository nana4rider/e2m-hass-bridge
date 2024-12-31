import env from "env-var";

export const language =
  env.get("DESCRIPTION_LANGUAGE").asString() === "en" ? "en" : "ja";

/**
 * メーカーコード
 * https://echonet.jp/wp/wp-content/uploads/pdf/General/Echonet/ManufacturerCode/list_code.pdf
 */
export const Manufacturer = {
  Panasonic: "00000b",
} as const;
type Manufacturer = (typeof Manufacturer)[keyof typeof Manufacturer];

/**
 * 検出を除外するデバイスタイプ
 */
export const IgnoreDeviceTypes = new Set(["nodeProfile"]);

/**
 * 検出を除外するプロパティのパターン
 * ${deviceType}_${propertyName}
 */
export const IgnorePropertyPatterns: RegExp[] = [
  // 共通
  /_unknown/,
  /_installationLocation$/,
  /_protocol$/,
  /_id$/,
  /_manufacturerFaultCode$/,
  /_manufacturer$/,
  /_productCode$/,
  /_locationInformation$/,
  // json?
  /^electricWaterHeater_estimatedElectricEnergyAtShiftTime/,
  /^electricWaterHeater_electricEnergyConsumptionRate/,
  // climateで実装
  /^homeAirConditioner_operationMode$/,
  /^homeAirConditioner_targetTemperature$/,
  /^homeAirConditioner_airFlowLevel$/,
];

/**
 * 単位の変換
 * https://developers.home-assistant.io/docs/core/entity/sensor/
 * Wh, W, V, second, r/min, ppm, MJ, minutes, minute, mA, m3/h, m3, lux, liter
 * L, kWh, kW, kvarh, klux, digit, degree, days, Celsius, Ah, A, %
 */
export const UnitMapping: Record<string, string> = {
  // Home Assistantのプリセットに変換
  second: "s",
  minute: "min",
  Celsius: "°C",
};

export interface ManufacturerConfig {
  climate: {
    minTemperature?: number;
    maxTemperature?: number;
    fanmodeMapping?: {
      command: Record<string, string>;
      state: Record<string, string>;
    };
  };
}

export const ManufacturerConfigMap: Record<Manufacturer, ManufacturerConfig> = {
  [Manufacturer.Panasonic]: {
    climate: {
      minTemperature: 16,
      maxTemperature: 30,
      fanmodeMapping: {
        command: {
          auto: "auto",
          "1": "2",
          "2": "3",
          "3": "4",
          "4": "6",
        },
        state: {
          auto: "auto",
          "1": "1",
          "2": "1",
          "3": "2",
          "4": "3",
          "6": "4",
        },
      },
    },
  },
};

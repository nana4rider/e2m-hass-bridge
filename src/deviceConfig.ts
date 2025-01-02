import env from "env-var";

export const language =
  env.get("DESCRIPTION_LANGUAGE").asString() === "en" ? "en" : "ja";

/**
 * メーカーコード
 * https://echonet.jp/wp/wp-content/uploads/pdf/General/Echonet/ManufacturerCode/list_code.pdf
 */
export const Manufacturer = {
  Panasonic: "00000b",
  KadenEmulator: "ffffff",
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
  /^homeAirConditioner_operationStatus$/,
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
export const UnitMapping: { [hass: string]: string } = {
  // Home Assistantのプリセットに変換
  second: "s",
  minute: "min",
  Celsius: "°C",
};

export interface ManufacturerConfig {
  climate?: {
    minTemperature?: number;
    maxTemperature?: number;
    fanmodeMapping?: {
      command: { [hass: string]: string };
      state: { [echonet: string]: string };
    };
  };
  numberRange?: {
    [deviceType: string]: {
      [propertyName: string]: {
        min?: number;
        max?: number;
      };
    };
  };
}

export const ManufacturerConfigMap: Partial<
  Record<Manufacturer, ManufacturerConfig>
> = {
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
  // https://github.com/banban525/echonet-lite-kaden-emulator
  [Manufacturer.KadenEmulator]: {
    climate: {
      minTemperature: 15,
      maxTemperature: 30,
    },
    numberRange: {
      electricWaterHeater: {
        targetBathWaterTemperature: {
          min: 30,
          max: 60,
        },
      },
    },
  },
};

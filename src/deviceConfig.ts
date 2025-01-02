import { CompositeComponentId, Payload } from "@/payload/type";
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
 * 検出を除外するデバイスタイプのパターン
 */
export const IgnoreDeviceTypePatterns: RegExp[] = [
  /^nodeProfile$/,
  /^Unknown_/,
];

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
  /^homeAirConditioner_airFlowDirectionVertical$/,
  /^homeAirConditioner_automaticControlAirFlowDirection$/,
  // coverで実装
  /^electricRainDoor_openCloseStatus$/,
  /^electricRainDoor_openCloseOperation$/,
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
    fanmodeMapping?: {
      command: { [hass: string]: string };
      state: { [echonet: string]: string };
    };
  };
  override?: {
    simple?: {
      [deviceType: string]: {
        [propertyName: string]: Payload;
      };
    };
    composite?: Partial<{
      [id in CompositeComponentId]: Payload;
    }>;
  };
}

export const ManufacturerConfigMap: Partial<
  Record<Manufacturer, ManufacturerConfig>
> = {
  [Manufacturer.Panasonic]: {
    climate: {
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
          "2": "1", // エオリアアプリ: 1
          "3": "2", // エオリアアプリ: 2
          "4": "3", // エオリアアプリ: 3
          "5": "3",
          "6": "4", // エオリアアプリ: 4
          "7": "4",
          "8": "4",
        },
      },
    },
    override: {
      composite: {
        climate: {
          min_temp: 16,
          max_temp: 30,
        },
      },
    },
  },
  // https://github.com/banban525/echonet-lite-kaden-emulator
  [Manufacturer.KadenEmulator]: {
    override: {
      simple: {
        electricWaterHeater: {
          targetBathWaterTemperature: {
            min: 30,
            max: 60,
          },
        },
      },
      composite: {
        climate: {
          min_temp: 18,
          max_temp: 30,
        },
        cover: {
          optimistic: false,
        },
      },
    },
  },
};

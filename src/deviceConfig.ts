// ご自宅の家電で正しく動作しない場合はPRをお願いします。
// https://github.com/nana4rider/e2m-hass-bridge/pulls
import { CompositeComponentId, Payload } from "@/payload/payloadType";
import env from "env-var";

const DESCRIPTION_LANGUAGE =
  env.get("DESCRIPTION_LANGUAGE").asString() === "en" ? "en" : "ja";

export const language = DESCRIPTION_LANGUAGE;

/**
 * メーカーコード
 * @see https://echonet.jp/wp/wp-content/uploads/pdf/General/Echonet/ManufacturerCode/list_code.pdf
 */
export const Manufacturer = {
  Panasonic: "00000b",
  // https://github.com/SonyCSL/MoekadenRoom
  MoekadenRoom: "000000",
  // https://github.com/banban525/echonet-lite-kaden-emulator
  KadenEmulator: "ffffff",
};
type Manufacturer = (typeof Manufacturer)[keyof typeof Manufacturer];

/**
 * 検出を除外するデバイスタイプのパターン
 */
export const IgnoreDeviceTypePatterns: Readonly<RegExp[]> = [
  /^nodeProfile$/,
  /^Unknown_/,
];

/**
 * 検出を除外するプロパティのパターン
 * ${deviceType}_${propertyName}
 */
export const IgnorePropertyPatterns: Readonly<RegExp[]> = [
  // 共通
  /_unknown/,
  /_installationLocation$/, // 設置場所
  /_locationInformation$/, // 位置情報
  /_protocol$/, // 規格Version情報
  /_id$/, // 識別番号
  /_serialNumber$/, // 製造番号
  /_manufacturerFaultCode$/, // メーカ異常コード
  /_manufacturer$/, // メーカコード
  /_productCode$/, // 商品コード
  /_businessFacilityCode$/, // 事業場コード
  /_productionDate$/, // 製造年月日
  // json?
  /^electricWaterHeater_estimatedElectricEnergyAtShiftTime/, // 昼間沸き上げシフト時刻%dでの沸き上げ予測電力量
  /^electricWaterHeater_electricEnergyConsumptionRate/, // 時間あたり消費電力量%d
  // climateで実装
  /^homeAirConditioner_operationStatus$/, // 動作状態
  /^homeAirConditioner_operationMode$/, // 運転モード設定
  /^homeAirConditioner_targetTemperature$/, // 温度設定値
  /^homeAirConditioner_airFlowLevel$/, // 換気風量設定
  /^homeAirConditioner_airFlowDirectionVertical$/, // 風向上下設定
  /^homeAirConditioner_automaticControlAirFlowDirection$/, // 風向自動設定
  // coverで実装
  /^electricRainDoor_openCloseStatus$/, // 開閉状態
  /^electricRainDoor_openCloseOperation$/, // 開閉動作設定
];

/**
 * 単位の変換
 * Wh, W, V, second, r/min, ppm, MJ, minutes, minute, mA, m3/h, m3, lux, liter
 * L, kWh, kW, kvarh, klux, digit, degree, days, Celsius, Ah, A, %
 * @see https://developers.home-assistant.io/docs/core/entity/sensor/
 */
export const UnitMapping: Readonly<{ [hass: string]: string }> = {
  // Home Assistantのプリセットに変換
  second: "s",
  minute: "min",
  Celsius: "°C",
};

/**
 * グローバル設定
 */
export const GlobalDeviceConfig: DeviceConfig = {
  override: {
    composite: {
      climate: {
        icon: "mdi:air-conditioner",
      },
    },
  },
  autoRequestProperties: {
    // 積算消費電力計測値は全てのデバイスで定期リクエストする
    "*": ["consumedCumulativeElectricEnergy"],
  },
};

/**
 * メーカーごとの独自設定
 */
export const ManufacturerDeviceConfig: Readonly<
  Partial<Record<Manufacturer, DeviceConfig>>
> = {
  [Manufacturer.Panasonic]: {
    override: {
      composite: {
        climate: {
          min_temp: 16,
          max_temp: 30,
        },
      },
    },
    autoRequestProperties: {
      homeAirConditioner: [
        // Eoliaアプリやリモコンで変更された場合に通知されない
        "operationStatus",
        "operationMode",
        "targetTemperature",
        "airFlowLevel",
        "airFlowDirectionVertical",
        "automaticControlAirFlowDirection",
        "roomTemperature",
        "humidity",
      ],
      electricWaterHeater: ["remainingWater"],
    },
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
    autoRequestProperties: {
      // humidityは存在しないがITのために追加
      homeAirConditioner: ["roomTemperature", "humidity"],
    },
  },
};

/**
 * デバイスの設定
 */
export interface DeviceConfig {
  /**
   * 自動生成したDevice Discovery Payloadを上書きする設定
   * @see https://www.home-assistant.io/integrations/mqtt/#device-discovery-payload
   */
  override?: OverrideConfig;
  /**
   * 定期的にリクエストするプロパティ
   * deviceType:*で全てのデバイスを対象にする
   * @see https://github.com/banban525/echonetlite2mqtt/blob/master/README.ja.md#2-echonet-lite-%E6%A9%9F%E5%99%A8%E3%81%8C%E8%87%AA%E5%8B%95%E3%81%A7%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3%E3%82%92%E9%80%81%E3%82%89%E3%81%AA%E3%81%84%E3%81%AE%E3%81%8B%E3%82%82
   */
  autoRequestProperties?: {
    [deviceType: string]: string[];
  };
  /**
   * エアコンの設定
   */
  climate?: {
    fanmodeMapping?: {
      command: { [hass: string]: string };
      state: { [echonet: string]: string };
    };
  };
}

/**
 * 上書き設定
 */
export interface OverrideConfig {
  simple?: {
    [deviceType: string]: {
      [propertyName: string]: Payload;
    };
  };
  composite?: Partial<{
    [id in CompositeComponentId]: Payload;
  }>;
}

// ご自宅の家電で正しく動作しない場合はPRをお願いします。
// https://github.com/nana4rider/e2m-hass-bridge/pulls
import type { CompositeComponentId, Payload } from "@/payload/payloadType";

/**
 * メーカーコード定数
 * 使用頻度の高いメーカーのみ定数として定義
 */
export const MANUFACTURER = {
  PANASONIC: "00000b",
  MOEKADEN_ROOM: "000000",
  KADEN_EMULATOR: "ffffff",
} as const;

/**
 * メーカーコード → 会社名のマッピング
 * @see https://echonet.jp/wp/wp-content/uploads/pdf/General/Echonet/ManufacturerCode/list_code.pdf
 */
export const Manufacturer = {
  "00006b": "株式会社アイ・エス・ビー",
  "000056": "株式会社iND",
  "000087": "株式会社アイ･オー･データ機器",
  "00013e": "株式会社アイ・グリッド・ソリューションズ",
  "000068": "株式会社アイシン",
  "00011a": "株式会社ACCESS",
  "0000ac": "IDEC株式会社",
  "00002f": "アイホン株式会社",
  "000110": "株式会社あすかソリューション",
  "000096": "アズビル株式会社",
  "000133": "株式会社afterFIT",
  "0000ed": "アンフィニ株式会社",
  "000079": "アンリツエンジニアリング株式会社",
  "00007f": "アンリツカスタマーサポート株式会社",
  "000077": "学校法人幾徳学園　神奈川工科大学",
  "000132": "EX4Energy株式会社",
  "0000b0": "株式会社イデア",
  "00004d": "因幡電機産業株式会社",
  "000081": "岩崎通信機株式会社",
  "00010f": "岩谷産業株式会社",
  "0000b1": "株式会社インターネットイニシアティブ",
  "000124": "株式会社インテック",
  "00002c": "株式会社AFT",
  "0000df": "SMAジャパン株式会社",
  "00007e": "SMK株式会社",
  "0000f3": "株式会社エナジーゲートウェイ",
  "0000f2": "エナジー・ソリューションズ株式会社",
  "00013f": "エナジープールジャパン株式会社",
  "0000dd": "株式会社エナ・ストーン",
  "000072": "株式会社エナリス",
  "000073": "NECプラットフォームズ株式会社",
  "000091": "NECプラットフォームズ株式会社",
  "000118": "ＮＥＣマグナスコミュニケーションズ株式会社",
  "00007c": "ＮＳＷ株式会社",
  "0000b2": "株式会社NFブロッサムテクノロジーズ",
  "0000a0": "エヌ・ティ・ティ・アドバンステクノロジ株式会社",
  "000023": "エヌ・ティ・ティ・コムウェア株式会社",
  "0000e9": "株式会社NTTスマイルエナジー",
  "000061": "株式会社NTTデータ先端技術",
  "00012e": "エネクラウド株式会社",
  "000041": "株式会社エネゲート",
  "00010a": "株式会社エネルギーギャップ",
  "000113": "荏原実業株式会社",
  "000057": "エリーパワー株式会社",
  "000012": "大井電気株式会社",
  "0000d8": "大崎データテック株式会社",
  "0000f5": "オーデリック株式会社",
  "00012c": "オーナンバ株式会社",
  "00006a": "岡谷鋼機株式会社",
  "000114": "岡谷機電株式会社",
  "000137": "岡谷機電株式会社",
  "000048": "沖電気工業株式会社",
  "000052": "大崎電気工業株式会社",
  "000064": "オムロン ソーシアルソリューションズ株式会社",
  "0000d7": "加賀電子株式会社",
  "00009b": "株式会社ガスター",
  "0000f0": "株式会社カネカ",
  "000063": "河村電器産業株式会社",
  "00009a": "関西電力送配電株式会社",
  "00010b": "株式会社北日本電線",
  "0000bf": "九州電力送配電株式会社",
  "00008c": "九電テクノシステムズ株式会社",
  "00003b": "京セラ株式会社",
  "000130": "株式会社クールデザイン",
  "00013a": "株式会社ＧＵＧＥＮ",
  "000129": "GoodWe　Japan株式会社",
  "000134": "GoodWe Technologies Co.,Ltd.",
  "00008f": "株式会社グラモ",
  "00013b": "株式会社Crossdoor",
  "0000e8": "コイズミ照明株式会社",
  "000067": "株式会社コロナ",
  "000123": "株式会社コンテック",
  "000128": "埼広エンジニヤリング株式会社",
  "00006e": "株式会社サウンドビジョン",
  "00011e": "株式会社サカイガワ",
  "000093": "佐鳥電機株式会社",
  "00010e": "株式会社サニックス",
  "0000ba": "三協立山株式会社",
  "000116": "Sungrow Power Supply Co., Ltd.",
  "0000db": "サンテックパワージャパン株式会社",
  "00011c": "サンデン・リテールシステム株式会社",
  "000101": "サンポット株式会社",
  "0000c5": "三和シヤッター工業株式会社",
  "0000fb": "志幸技研工業株式会社",
  "00002e": "四国計測工業株式会社",
  "0000ae": "四国電力株式会社",
  "00009f": "株式会社GSユアサ",
  "00010d": "株式会社Shizen Connect",
  "0000f8": "株式会社シムックスイニシアティブ",
  "000005": "シャープ株式会社",
  "0000ca": "株式会社ジェイエスピー",
  "0000f7": "株式会社ジェイシティ",
  "000131": "Shenzhen Eternalplanet Energy Pingshan Ltd.",
  "0000ce": "新電元工業株式会社",
  "00007a": "図研エルミック株式会社",
  "000100": "スマートソーラー株式会社",
  "0000a8": "株式会社スマートパワーシステム",
  "00003d": "住友電気工業株式会社",
  "00003e": "住友電工ネットワークス株式会社",
  "000107": "株式会社正興電機製作所",
  "00003a": "積水ハウス株式会社",
  "000108": "株式会社SOUSEI Technology",
  "00011b": "SolaX Power Network Technology (Zhe jiang) Co. , Ltd.",
  "0000e1": "ソフトバンク株式会社",
  "000060": "株式会社ソニーコンピュータサイエンス研究所",
  "000008": "ダイキン工業株式会社",
  "000015": "株式会社ダイキンシステムソリューションズ研究所",
  "000141": "大光電機株式会社",
  "000119": "株式会社ダイヘン",
  "000080": "ダイヤゼブラ電機株式会社",
  "00009c": "ダイヤモンド電機株式会社",
  "00004f": "大和ハウス工業株式会社",
  "00012f": "台湾プラスチックジャパンニューエナジー株式会社",
  "0000af": "タカラスタンダード株式会社",
  "00012d": "立川ブラインド工業株式会社",
  "000117": "WWB株式会社",
  "000136": "株式会社中央物産",
  "0000b5": "中国電力株式会社",
  "0000a3": "中部電力パワーグリッド株式会社",
  "0000d2": "長府工産株式会社",
  "0000d5": "長州産業株式会社",
  "000088": "株式会社長府製作所",
  "0000c1": "通研電気工業株式会社",
  "0000d0": "株式会社椿本チエイン",
  "000076": "株式会社TSP",
  "0000e3": "株式会社ディーディーエル",
  "000103": "データテクノロジー株式会社",
  "0000e4": "株式会社テクノアイ",
  "0000ee": "テセラ・テクノロジー株式会社",
  "0000ad": "デルタ電子株式会社",
  "0000be": "株式会社デンケン",
  "00003c": "株式会社デンソー ",
  "000109": "株式会社デンソー",
  "00012b": "株式会社デンソーウェーブ",
  "0000f4": "株式会社デンソーエアクール",
  "0000ff": "東京電力エナジーパートナー株式会社",
  "000099": "東京電力ホールディングス株式会社",
  "000085": "株式会社東光高岳",
  "000035": "東光東芝メーターシステムズ株式会社",
  "000016": "株式会社東芝",
  "0000d9": "東芝ITコントロールシステム株式会社",
  "0000ec": "東芝エネルギーシステムズ株式会社",
  "000043": "東芝デベロップメントエンジニアリング㈱",
  "000069": "東芝ライフスタイル株式会社",
  "00001b": "東芝ライテック株式会社",
  "000050": "ＴＯＴＯ株式会社",
  "000111": "東プレ株式会社",
  "0000f9": "東邦電子株式会社",
  "0000c2": "東北計器工業株式会社",
  "0000bc": "東北電力ネットワーク株式会社",
  "000126": "株式会社戸上電機製作所",
  "0000cd": "トクラス株式会社",
  "0000b3": "特定非営利活動法人TOPPERSプロジェクト",
  "0000ef": "株式会社豊田自動織機",
  "000121": "トヨタ自動車株式会社",
  "00011f": "豊田通商株式会社",
  "00005c": "トランスブート株式会社",
  "000138": "TRENDE株式会社",
  "000086": "西日本電信電話株式会社",
  "000112": "日栄インテック株式会社",
  "00006c": "ニチコン株式会社",
  "0000eb": "ニチコン亀岡株式会社",
  "000102": "ニチコン草津株式会社",
  "0000a5": "株式会社ニチベイ",
  "000036": "株式会社日新システムズ",
  "0000b7": "日東工業株式会社",
  "00013d": "日本瓦斯株式会社",
  "000017": "日本キヤリア株式会社",
  "000009": "日本電気株式会社",
  "0000c3": "日本電気計器検定所",
  "00008d": "日本電信電話株式会社",
  "000071": "株式会社日本産業",
  "0000dc": "日本テクノ株式会社",
  "000106": "Nature株式会社 ",
  "000104": "ネクストエナジー・アンド・リソース株式会社",
  "0000e2": "NextDrive株式会社",
  "000054": "株式会社ノーリツ",
  "000082": "パーパス株式会社",
  "00006f": "株式会社バッファロー",
  "00000b": "パナソニック ホールディングス株式会社",
  "0000fe": "パナソニック エコシステムズ株式会社",
  "0000da": "パナソニック産機システムズ株式会社",
  "000127": "株式会社パロマ",
  "000122": "ハンファＱセルズジャパン株式会社",
  "000047": "東日本電信電話株式会社",
  "000001": "株式会社日立製作所",
  "000022": "日立グローバルライフソリューションズ株式会社",
  "000044": "株式会社日立産機システム",
  "0000cc": "日立ジョンソンコントロールズ空調株式会社",
  "000040": "株式会社日立ハイテクソリューションズ",
  "0000e5": "株式会社日立パワーソリューションズ",
  "000115": "華為技術日本株式会社",
  "000055": "株式会社ファミリーネット・ジャパン",
  "0000f6": "株式会社フィールドロジック",
  "0000b4": "フォーアールエナジー株式会社",
  "000051": "富士アイティ株式会社",
  "0000fc": "富士工業株式会社",
  "0000de": "富士フイルムビジネスイノベーションジャパン株式会社",
  "00004e": "富士通株式会社",
  "000090": "富士通コンポーネント株式会社",
  "00008a": "株式会社富士通ゼネラル",
  "0000cb": "富士電機株式会社",
  "0000fa": "ぷらっとホーム株式会社",
  "0000b6": "文化シヤッター株式会社",
  "0000fd": "株式会社ベルニクス",
  "0000bb": "北陸電力送配電株式会社",
  "0000e6": "一般財団法人北海道電気保安協会",
  "0000b8": "北海道電力株式会社",
  "0000a1": "株式会社本田技術研究所",
  "000078": "マクセル株式会社",
  "00010c": "マックス株式会社",
  "000006": "三菱電機株式会社",
  "000034": "三菱電機エンジニアリング株式会社",
  "000105": "三菱電機照明株式会社",
  "000097": "株式会社未来技術研究所",
  "00011d": "mui Lab株式会社",
  "0000d4": "株式会社村田製作所",
  "000120": "明星電気株式会社",
  "000058": "株式会社メディオテック",
  "000083": "株式会社メルコテクノ横浜",
  "00012a": "株式会社モノクローム",
  "00009e": "株式会社安川電機",
  "000142": "株式会社Yanekara",
  "000095": "大和電器株式会社",
  "000053": "株式会社ユビキタスAI",
  "000139": "ラトックシステム株式会社",
  "0000f1": "株式会社ラプラス・システム",
  "000140": "Landis+Gyr AG",
  "000025": "株式会社LIXIL",
  "000125": "株式会社LiveSmart",
  "000135": "株式会社リンクジャパン",
  "000059": "リンナイ株式会社",
  "0000e0": "株式会社Looop",
  // https://github.com/SonyCSL/MoekadenRoom
  "000000": "MoekadenRoom",
  // https://github.com/banban525/echonet-lite-kaden-emulator
  ffffff: "KadenEmulator",
} as const;
type ManufacturerCode = keyof typeof Manufacturer;

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
  Partial<Record<ManufacturerCode, DeviceConfig>>
> = {
  [MANUFACTURER.PANASONIC]: {
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
  [MANUFACTURER.KADEN_EMULATOR]: {
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

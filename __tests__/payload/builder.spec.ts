import env from "@/env";
import { buildDevice, buildOrigin } from "@/payload/builder";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import { Writable } from "type-fest";

describe("buildDevice", () => {
  beforeEach(() => {
    (env as Writable<typeof env>).DESCRIPTION_LANGUAGE = "ja";
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("未定義のmanufacturer", () => {
    const actual = buildDevice({
      id: "test_id",
      ip: "127.0.0.1",
      descriptions: {
        ja: "test_descriptions",
        eh: "test_descriptions",
      },
      values: {
        manufacturer: { value: "xxxxxx" },
      },
    } as unknown as ApiDevice);

    expect(actual).toEqual({
      device: {
        identifiers: ["echonetlite_test_id"],
        manufacturer: "xxxxxx",
        name: "test_descriptions(127.0.0.1)",
      },
    });
  });

  test("定義済みのmanufacturer", () => {
    const actual = buildDevice({
      id: "test_id",
      ip: "127.0.0.1",
      descriptions: {
        ja: "test_descriptions",
        en: "test_descriptions",
      },
      values: {
        manufacturer: { value: "ffffff" },
      },
    } as unknown as ApiDevice);

    expect(actual).toEqual({
      device: {
        identifiers: ["echonetlite_test_id"],
        manufacturer: "KadenEmulator",
        name: "test_descriptions(127.0.0.1)",
      },
    });
  });

  test("productCodeが存在する", () => {
    const actual = buildDevice({
      id: "test_id",
      ip: "127.0.0.1",
      descriptions: {
        ja: "test_descriptions",
        en: "test_descriptions",
      },
      values: {
        manufacturer: { value: "manufacturer" },
        productCode: { value: "6563686f6e6574" },
      },
    } as unknown as ApiDevice);

    expect(actual).toEqual({
      device: {
        identifiers: ["echonetlite_test_id"],
        manufacturer: "manufacturer",
        model: "echonet",
        name: "test_descriptions(127.0.0.1)",
      },
    });
  });

  test("英語設定", () => {
    (env as Writable<typeof env>).DESCRIPTION_LANGUAGE = "en";

    const actual = buildDevice({
      id: "test_id",
      ip: "127.0.0.1",
      descriptions: {
        ja: "test_descriptions_ja",
        en: "test_descriptions_en",
      },
      values: {
        manufacturer: { value: "manufacturer" },
        productCode: { value: "6563686f6e6574" },
      },
    } as unknown as ApiDevice);

    expect(actual).toEqual({
      device: {
        identifiers: ["echonetlite_test_id"],
        manufacturer: "manufacturer",
        model: "echonet",
        name: "test_descriptions_en(127.0.0.1)",
      },
    });
  });

  test("日本語設定", () => {
    const actual = buildDevice({
      id: "test_id",
      ip: "127.0.0.1",
      descriptions: {
        ja: "test_descriptions_ja",
        eh: "test_descriptions_en",
      },
      values: {
        manufacturer: { value: "manufacturer" },
        productCode: { value: "6563686f6e6574" },
      },
    } as unknown as ApiDevice);

    expect(actual).toEqual({
      device: {
        identifiers: ["echonetlite_test_id"],
        manufacturer: "manufacturer",
        model: "echonet",
        name: "test_descriptions_ja(127.0.0.1)",
      },
    });
  });
});

describe("buildOrigin", () => {
  test("必要な属性が揃っている", () => {
    const origin = buildOrigin();
    expect(origin).toHaveProperty("origin.name");
    expect(origin).toHaveProperty("origin.sw_version");
    expect(origin).toHaveProperty("origin.support_url");
  });
});

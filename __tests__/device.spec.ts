import { buildDevice } from "@/payload/builder";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

const env = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...env };
});

test("device: manufacturerが含まれない)", () => {
  const actual = () =>
    buildDevice({
      id: "test_id",
      ip: "127.0.0.1",
      descriptions: {
        ja: "test_descriptions",
        en: "test_descriptions",
      },
      values: {},
    } as unknown as ApiDevice);

  expect(actual).toThrow();
});

test("device: 未定義のmanufacturer", () => {
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

test("device: 定義済みのmanufacturer", () => {
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

test("device: productCodeが存在する", () => {
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

test("device: 英語設定", async () => {
  process.env.DESCRIPTION_LANGUAGE = "en";

  const { buildDevice } = await import("@/payload/builder");
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

test("device: 日本語設定", () => {
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
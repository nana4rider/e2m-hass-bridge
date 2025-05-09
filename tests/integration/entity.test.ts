import { buildDiscoveryEntries } from "@/payload/builder";
import { parseJson } from "@/util/dataTransformUtil";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import { readFile } from "fs/promises";
import { glob, globSync } from "glob";
import * as path from "path";
import type { JsonObject } from "type-fest";
import { fileURLToPath } from "url";

async function readJsonFile<T>(filePath: string): Promise<T> {
  return parseJson<T>(await readFile(filePath, "utf-8"));
}

describe("entity", () => {
  const baseDir = path.dirname(fileURLToPath(import.meta.url));

  // https://www.home-assistant.io/integrations/mqtt/#discovery-topic
  const discoveryTopicPattern =
    /^(?<discovery_prefix>\w+)\/(?<component>\w+)\/((?<node_id>\w+)\/)?(?<object_id>\w+)\/config$/;

  const inputPaths = globSync(path.join(baseDir, "input", "*.json"));

  test.each(inputPaths.map((filePath) => [path.basename(filePath), filePath]))(
    "file: %s",
    async (_, filePath) => {
      const apiDevice = await readJsonFile<ApiDevice>(filePath);
      const expectedDir = path.join(
        baseDir,
        "expected",
        path.parse(filePath).name,
      );

      const finishedFiles = new Set<string>();
      for (const { relativeTopic, payload } of buildDiscoveryEntries(
        apiDevice,
      )) {
        // MQTTトピックがHome Assistantの仕様に準拠しているか
        expect(`test_prefix/${relativeTopic}`).toMatch(discoveryTopicPattern);
        const expectedFile = path.join(
          expectedDir,
          relativeTopic.replace(/\/config$/, ".json"),
        );
        // await writeFile(expectedFile, JSON.stringify(payload));
        // Payloadが一致するか
        const expected = await readJsonFile<JsonObject>(expectedFile);
        expect(payload).toEqual(expected);
        finishedFiles.add(expectedFile);
      }

      const autoRequestProperties = getAutoRequestProperties(apiDevice);
      const autoRequestPropertiesFile = path.join(
        expectedDir,
        "autoRequestProperties.json",
      );
      // await writeFile(
      //   path.join(expectedDir, "autoRequestProperties.json"),
      //   JSON.stringify(autoRequestProperties),
      // );
      // 自動更新プロパティが一致するか
      const expected = await readJsonFile<JsonObject>(
        autoRequestPropertiesFile,
      );
      expect(autoRequestProperties).toEqual(expected);
      finishedFiles.add(autoRequestPropertiesFile);

      // 検証ファイルを全て消化できているか
      const expectedFiles = await glob(path.join(expectedDir, "**", "*.json"));
      expect(finishedFiles).toEqual(new Set(expectedFiles));
    },
  );
});

import { buildDiscoveryEntries } from "@/payload/builder";
import { toJson } from "@/util/dataTransformUtil";
import { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import { readFile } from "fs/promises";
import { glob, globSync } from "glob";
import * as path from "path";
import { JsonObject } from "type-fest";
import { fileURLToPath } from "url";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

// https://www.home-assistant.io/integrations/mqtt/#discovery-topic
const discoveryTopicPattern =
  /^(?<discovery_prefix>\w+)\/(?<component>\w+)\/((?<node_id>\w+)\/)?(?<object_id>\w+)\/config$/;

async function readJsonFile<T>(filePath: string): Promise<T> {
  return toJson<T>(await readFile(filePath, "utf-8"));
}

const inputPaths = globSync(path.join(baseDir, "input", "*.json"));

test.each(inputPaths.map((filePath) => [path.basename(filePath), filePath]))(
  "entity: %s",
  async (_, filePath) => {
    const apiDevice = await readJsonFile<ApiDevice>(filePath);
    const expectedDir = path.join(
      baseDir,
      "expected",
      path.parse(filePath).name,
    );

    const finishedFiles = new Set<string>();
    for (const { relativeTopic, payload } of buildDiscoveryEntries(apiDevice)) {
      // MQTTトピックがHome Assistantの仕様に準拠しているか
      expect(`test_prefix/${relativeTopic}`).toMatch(discoveryTopicPattern);
      const expectedFile = path.join(
        expectedDir,
        relativeTopic.replace(/\/config$/, ".json"),
      );
      // Payloadが一致するか
      const expected = await readJsonFile<JsonObject>(expectedFile);
      // await fs.writeFile(expectedFile, JSON.stringify(expected));
      expect(payload).toEqual(expected);
      finishedFiles.add(expectedFile);
    }

    // エンティティが全て揃っているか
    const expectedFiles = await glob(path.join(expectedDir, "**", "*.json"));
    expect(finishedFiles).toEqual(new Set(expectedFiles));
  },
);

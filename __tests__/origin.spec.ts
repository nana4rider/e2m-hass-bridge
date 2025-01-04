import { buildOrigin } from "@/payload/builder";

test("origin: 必要な属性が揃っているか", () => {
  const origin = buildOrigin();
  expect(origin).toHaveProperty("origin.name");
  expect(origin).toHaveProperty("origin.sw_version");
  expect(origin).toHaveProperty("origin.support_url");
});

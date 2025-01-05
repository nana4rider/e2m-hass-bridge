import { buildOrigin } from "@/payload/builder";

describe("origin", () => {
  test("必要な属性が揃っている", () => {
    const origin = buildOrigin();
    expect(origin).toHaveProperty("origin.name");
    expect(origin).toHaveProperty("origin.sw_version");
    expect(origin).toHaveProperty("origin.support_url");
  });
});

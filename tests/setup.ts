import type * as envalid from "envalid";

vi.mock("envalid", async () => {
  const actual = await vi.importActual<typeof envalid>("envalid");
  return {
    ...actual,
    cleanEnv: <S>(
      environment: unknown,
      specs: S,
      options: envalid.CleanOptions<S> = {},
    ): envalid.CleanedEnv<S> => {
      // omit Object.freeze
      return { ...actual.cleanEnv(environment, specs, options) };
    },
  };
});

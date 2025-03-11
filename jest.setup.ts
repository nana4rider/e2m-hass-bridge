import envalid, { accessorMiddleware, CleanedEnv, CleanOptions } from "envalid";
import { getSanitizedEnv } from "envalid/dist/core";

jest.mock("envalid", () => {
  const actual = jest.requireActual<typeof envalid>("envalid");
  return {
    ...actual,
    cleanEnv: <S>(
      environment: unknown,
      specs: S,
      options: CleanOptions<S> = {},
    ): CleanedEnv<S> => {
      // omit Object.freeze
      const cleaned = getSanitizedEnv(environment, specs, options);
      return accessorMiddleware(cleaned, environment) as CleanedEnv<S>;
    },
  };
});

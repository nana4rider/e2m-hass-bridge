import env from "@/env";
import { config } from "dotenv";
import { Writable } from "type-fest";

config({ path: "./.env.test" });

export type MutableEnv = Partial<Writable<typeof env>>;

let overrideEnv: MutableEnv = {};

beforeEach(() => {
  overrideEnv = {};
});

jest.mock("@/env", () => {
  const { default: defaultEnv } = jest.requireActual<{ default: typeof env }>(
    "@/env",
  );
  return new Proxy(
    { ...defaultEnv },
    {
      get(target, prop: keyof typeof env) {
        if (prop in overrideEnv) {
          return overrideEnv[prop];
        }
        return target[prop];
      },
      set(
        target,
        prop: keyof typeof env,
        value: (typeof env)[keyof typeof env],
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (overrideEnv as any)[prop] = value;
        return true;
      },
    },
  );
});

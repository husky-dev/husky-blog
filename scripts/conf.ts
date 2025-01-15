import { getStrEnv, getStrEnvOrExit } from "./utils";

export const conf = {
  r2: {
    accountId: getStrEnvOrExit("R2_ACCOUNT_ID"),
    accessKeyId: getStrEnvOrExit("R2_ACCESS_KEY_ID"),
    secretAccessKey: getStrEnvOrExit("R2_SECRET_ACCESS_KEY"),
    staticBucket: getStrEnvOrExit("R2_STATIC_BUCKET"),
    staticUrl: getStrEnvOrExit("R2_STATIC_URL"),
    prefix: getStrEnv("R2_PREFIX"),
  },
};

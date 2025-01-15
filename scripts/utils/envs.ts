export const getStrEnvOrExit = (name: string): string => {
  const value = getStrEnv(name);
  if (!value) {
    console.error(`Env ${name} is not set`);
    process.exit(1);
  }
  return value;
};

export const getStrEnv = (
  name: string,
  defaultValue?: string
): string | undefined => {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  return value;
};

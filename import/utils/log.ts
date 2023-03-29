export const log = {
  trace: (...args: unknown[]) => console.log("[*]:", ...args),
  debug: (...args: unknown[]) => console.log("[-]:", ...args),
  info: (...args: unknown[]) => console.log("[+]:", ...args),
  err: (...args: unknown[]) => console.log("[x]:", ...args),
};

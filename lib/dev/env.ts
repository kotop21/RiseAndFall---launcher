/**
 * Compile-time development build indicator.
 * - In prod builds (`scripts/build-bundle.js --mode=prod`): `process.env.IS_DEV` is defined as `"false"` -> `false`.
 * - In dev builds (`scripts/build-bundle.js --mode=dev`): `process.env.IS_DEV` is defined as `"true"` -> `true`.
 * - In local `bun dev` / `bun test`: falls back to `process.env.NODE_ENV !== "production"` -> `true`.
 */
export const IS_DEV_BUILD: boolean =
  process.env.IS_DEV === "true"
    ? true
    : process.env.IS_DEV === "false"
      ? false
      : process.env.NODE_ENV !== "production";

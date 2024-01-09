/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * Generated by convex@1.7.1.
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as constants from "../constants.js";
import type * as cursors from "../cursors.js";
import type * as lib_FastIntegerCompression from "../lib/FastIntegerCompression.js";
import type * as lib_compression from "../lib/compression.js";
import type * as lib_historicalObject from "../lib/historicalObject.js";
import type * as lib_positionTracking from "../lib/positionTracking.js";
import type * as lib_sessions from "../lib/sessions.js";
import type * as lib_xxhash from "../lib/xxhash.js";
import type * as sessions from "../sessions.js";
import type * as types from "../types.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  constants: typeof constants;
  cursors: typeof cursors;
  "lib/FastIntegerCompression": typeof lib_FastIntegerCompression;
  "lib/compression": typeof lib_compression;
  "lib/historicalObject": typeof lib_historicalObject;
  "lib/positionTracking": typeof lib_positionTracking;
  "lib/sessions": typeof lib_sessions;
  "lib/xxhash": typeof lib_xxhash;
  sessions: typeof sessions;
  types: typeof types;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

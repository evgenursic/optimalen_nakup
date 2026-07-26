/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as alerts from "../alerts.js";
import type * as billing from "../billing.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_alerts from "../lib/alerts.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as monitoring from "../monitoring.js";
import type * as organizations from "../organizations.js";
import type * as public_ from "../public.js";
import type * as research from "../research.js";
import type * as users from "../users.js";
import type * as worker from "../worker.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  alerts: typeof alerts;
  billing: typeof billing;
  crons: typeof crons;
  http: typeof http;
  "lib/alerts": typeof lib_alerts;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  monitoring: typeof monitoring;
  organizations: typeof organizations;
  public: typeof public_;
  research: typeof research;
  users: typeof users;
  worker: typeof worker;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

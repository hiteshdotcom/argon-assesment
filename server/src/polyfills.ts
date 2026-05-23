/**
 * Runtime polyfills loaded before anything else in the server.
 *
 * `util.isNullOrUndefined` was deprecated in Node 4 and *removed* in Node 22+.
 * @tensorflow/tfjs-node@4.22 still references it from createTensorsTypeOpAttr,
 * so the first inference crashes with "isNullOrUndefined is not a function" on
 * any modern Node. Patching `util` here guarantees the fix is in place before
 * any code path (including dynamic imports) touches tfjs-node.
 */
import util from "node:util";

const u = util as unknown as { isNullOrUndefined?: (v: unknown) => boolean };
if (typeof u.isNullOrUndefined !== "function") {
  u.isNullOrUndefined = (v: unknown) => v === null || v === undefined;
}

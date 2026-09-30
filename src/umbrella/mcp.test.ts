import { test } from "node:test";
import { strict as assert } from "node:assert";
import { READ_TOOLS, serializeArguments, UmbrellaMcp } from "./mcp.js";
test("MCP arguments preserve strings and encode arrays/booleans/objects", () => {
  assert.deepEqual(serializeArguments({ IsAccount: true, filters: { service: ["EC2"] }, absent: undefined, accountKey: "001" }),
    { IsAccount: "true", filters: '{"service":["EC2"]}', accountKey: "001" });
});
test("logout and unknown tools cannot be called", async () => {
  assert.equal(READ_TOOLS.has("logout"), false);
  await assert.rejects(new UmbrellaMcp().call("logout"), /allowlist/);
});

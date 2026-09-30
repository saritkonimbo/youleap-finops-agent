import { createServer } from "node:http";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { FileOAuthProvider, umbrellaUrl } from "./auth.js";
import { UmbrellaMcp } from "./mcp.js";

async function connect() {
  const provider = await new FileOAuthProvider(true).load();
  let complete!: () => void;
  let fail!: (error: Error) => void;
  const completion = new Promise<void>((resolve, reject) => { complete = resolve; fail = reject; });
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", provider.redirectUrl);
    if (url.pathname !== "/callback") { response.writeHead(404).end(); return; }
    if (url.searchParams.get("state") !== provider.expectedState) { response.writeHead(400).end("Invalid OAuth state"); return; }
    const code = url.searchParams.get("code");
    if (!code) { response.writeHead(400).end("Authorization was not completed"); fail(new Error("Umbrella authorization denied")); return; }
    try {
      const result = await auth(provider, { serverUrl: umbrellaUrl, authorizationCode: code });
      if (result !== "AUTHORIZED") throw new Error("Authorization incomplete");
      response.end("Umbrella connected. You can close this window.");
      complete();
    } catch { response.writeHead(500).end("Authorization failed"); fail(new Error("Umbrella token exchange failed")); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(8787, "127.0.0.1", resolve); });
  const timer = setTimeout(() => fail(new Error("Authorization timed out; run connect again")), 10 * 60 * 1000);
  try {
    const result = await auth(provider, { serverUrl: umbrellaUrl, scope: "openid profile email offline_access" });
    if (result === "REDIRECT") await completion;
    console.log("Umbrella authorization saved securely on this host.");
  } finally { clearTimeout(timer); server.close(); }
}
async function inspect() {
  const client = await new UmbrellaMcp().connect();
  try {
    if (process.argv[2] === "tools") console.log(JSON.stringify(client.schemas(), null, 2));
    else if (process.argv[2] === "accounts") console.log(JSON.stringify(await client.call("api___v1_users_plain_sub_users", { IsAccount: true }), null, 2));
    else throw new Error("Use connect, tools, or accounts");
  } finally { await client.close(); }
}
(process.argv[2] === "connect" ? connect() : inspect()).catch(() => {
  console.error("Umbrella operation failed. Verify network access and run umbrella:connect on the runtime host. No credentials were printed.");
  process.exitCode = 1;
});

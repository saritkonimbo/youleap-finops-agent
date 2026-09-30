import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

export const umbrellaUrl = new URL(process.env.UMBRELLA_MCP_URL || "https://mcp.umbrellacost.io/mcp");
if (umbrellaUrl.origin !== "https://mcp.umbrellacost.io") throw new Error("Unexpected Umbrella MCP origin");
type State = { client?: OAuthClientInformationMixed; tokens?: OAuthTokens; verifier?: string };

export class FileOAuthProvider implements OAuthClientProvider {
  readonly redirectUrl = "http://127.0.0.1:8787/callback";
  readonly clientMetadata = {
    client_name: "YouLeap FinOps Agent",
    redirect_uris: [this.redirectUrl],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: "openid profile email offline_access"
  };
  readonly expectedState = randomBytes(32).toString("hex");
  private data: State = {};
  private readonly path = resolve(process.env.UMBRELLA_AUTH_FILE || ".auth/umbrella.json");
  constructor(private readonly interactive = false) {}
  async load() {
    try { this.data = JSON.parse(await readFile(this.path, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    return this;
  }
  state() { return this.expectedState; }
  clientInformation() { return this.data.client; }
  tokens() { return this.data.tokens; }
  async saveClientInformation(client: OAuthClientInformationMixed) { this.data.client = client; await this.save(); }
  async saveTokens(tokens: OAuthTokens) { this.data.tokens = tokens; delete this.data.verifier; await this.save(); }
  async saveCodeVerifier(verifier: string) { this.data.verifier = verifier; await this.save(); }
  codeVerifier() { if (!this.data.verifier) throw new Error("Missing PKCE verifier"); return this.data.verifier; }
  redirectToAuthorization(url: URL) {
    if (!this.interactive) throw new Error("Umbrella authorization required. Run npm run umbrella:connect on the runtime host.");
    console.log("Open this URL in your browser to authorize Umbrella:\n" + url.href);
  }
  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    if (scope === "all") this.data = {};
    if (scope === "client") delete this.data.client;
    if (scope === "tokens") delete this.data.tokens;
    if (scope === "verifier") delete this.data.verifier;
    await this.save();
  }
  private async save() {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await chmod(dirname(this.path), 0o700);
    const temporary = this.path + ".tmp";
    await writeFile(temporary, JSON.stringify(this.data), { mode: 0o600 });
    await chmod(temporary, 0o600);
    await rename(temporary, this.path);
  }
}

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FileOAuthProvider, umbrellaUrl } from "./auth.js";

export const READ_TOOLS = new Set([
  "api___v1_users_plain_sub_users", "session_status",
  "get_available_filter_and_groupby_options", "api___v2_invoices_cost_and_usage",
  "api___v1_anomaly_detection", "api___v1_anomalies_stats",
  "api___v1_recommendationsNew_heatmap_summary", "api___v2_recommendations_list",
  "api___v1_budgets_v2_i_", "api___v1_usage_rds_instance_costs",
  "api___v1_usage_s3_bucket_costs", "list_distinct_tags", "list_business_mapping_viewpoints"
]);
export function serializeArguments(input: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]));
}
export class UmbrellaMcp {
  private readonly client = new Client({ name: "youleap-finops-agent", version: "0.2.0" });
  private definitions = new Map<string, { name: string; inputSchema: { required?: string[]; properties?: Record<string, unknown> } }>();
  async connect() {
    try {
      await this.client.connect(new StreamableHTTPClientTransport(umbrellaUrl, { authProvider: await new FileOAuthProvider().load() }));
      let cursor: string | undefined;
      do {
        const page = await this.client.listTools({ cursor });
        for (const tool of page.tools) this.definitions.set(tool.name, tool);
        cursor = page.nextCursor;
      } while (cursor);
    } catch (error) { await this.close(); throw error; }
    return this;
  }
  schemas() { return [...this.definitions.values()]; }
  async call(name: string, input: Record<string, unknown> = {}) {
    if (!READ_TOOLS.has(name)) throw new Error("Tool is not in the FinOps read allowlist");
    const tool = this.definitions.get(name);
    if (!tool) throw new Error("Umbrella does not expose the requested tool");
    const args = serializeArguments(input);
    for (const key of tool.inputSchema.required || []) {
      if (!tool.inputSchema.properties?.[key]) throw new Error("Umbrella tool schema is inconsistent; contact provider");
      if (!args[key]) throw new Error("Missing required Umbrella tool argument: " + key);
    }
    const result = await this.client.callTool({ name, arguments: args });
    if (result.isError) throw new Error("Umbrella tool returned an error; financial data unavailable");
    return result;
  }
  async cost(input: { accountKey: string; divisionId: string; startDate: string; endDate: string; groupBy?: string; filters?: Record<string, unknown> }) {
    if (input.groupBy && input.groupBy !== "none" || input.filters) {
      // Lookup is mandatory. Live values are returned for the caller to inspect;
      // the provider also validates requested dimensions.
      await this.call("get_available_filter_and_groupby_options", { accountKey: input.accountKey, divisionId: input.divisionId });
    }
    return this.call("api___v2_invoices_cost_and_usage", { ...input, periodGranLevel: "month", costCalculationType: "unblended", priceView: "customer" });
  }
  close() { return this.client.close(); }
}

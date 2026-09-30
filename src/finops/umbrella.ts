import { config } from "../config.js";
import type { CostQuery, CostResult, FinOpsProvider } from "./types.js";

/**
 * Umbrella adapter boundary.
 *
 * The agent must only access Umbrella through explicit, read-only methods here.
 * Do not pass Umbrella credentials or arbitrary URLs/queries to an LLM.
 *
 * TODO(connection): wire these methods to the Umbrella MCP/API available
 * in the organization's account after authentication details are confirmed.
 */
export class UmbrellaProvider implements FinOpsProvider {
  async getCost(_query: CostQuery): Promise<CostResult> {
    this.assertConfigured();
    throw new Error("Umbrella connection is not configured yet.");
  }

  async getRecommendations(): Promise<unknown> {
    this.assertConfigured();
    throw new Error("Umbrella connection is not configured yet.");
  }

  async getBudgets(): Promise<unknown> {
    this.assertConfigured();
    throw new Error("Umbrella connection is not configured yet.");
  }

  private assertConfigured() {
    if (!config.UMBRELLA_MCP_URL && !config.UMBRELLA_API_BASE_URL) {
      throw new Error("Set UMBRELLA_MCP_URL or UMBRELLA_API_BASE_URL.");
    }
  }
}

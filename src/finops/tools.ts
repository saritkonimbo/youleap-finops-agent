import type { CostQuery, FinOpsProvider } from "./types.js";

export class FinOpsTools {
  constructor(private readonly provider: FinOpsProvider) {}

  getCost(query: CostQuery) {
    return this.provider.getCost(query);
  }

  comparePeriods(current: CostQuery, previous: CostQuery) {
    return Promise.all([
      this.provider.getCost(current),
      this.provider.getCost(previous)
    ]).then(([a, b]) => ({
      current: a,
      previous: b,
      delta: a.total - b.total,
      deltaPercent: b.total === 0 ? null : ((a.total - b.total) / b.total) * 100
    }));
  }

  getCostByService(query: Omit<CostQuery, "groupBy">) {
    return this.provider.getCost({ ...query, groupBy: ["service"] });
  }

  getCostByAccount(query: Omit<CostQuery, "groupBy">) {
    return this.provider.getCost({ ...query, groupBy: ["linked_account"] });
  }

  getRecommendations() {
    return this.provider.getRecommendations();
  }

  getBudgets() {
    return this.provider.getBudgets();
  }
}

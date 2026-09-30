export type Granularity = "daily" | "weekly" | "monthly";
export type CostDimension = "service" | "region" | "linked_account" | "cost_center" | "tag";

export interface CostQuery {
  startDate: string;
  endDate: string;
  granularity?: Granularity;
  groupBy?: CostDimension[];
  filters?: Record<string, string[]>;
}

export interface CostRow {
  period?: string;
  dimensions: Record<string, string>;
  cost: number;
  currency: string;
}

export interface CostResult {
  total: number;
  currency: string;
  rows: CostRow[];
  source: "umbrella";
}

export interface FinOpsProvider {
  getCost(query: CostQuery): Promise<CostResult>;
  getRecommendations(): Promise<unknown>;
  getBudgets(): Promise<unknown>;
}

import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1),
  SLACK_APP_TOKEN: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  UMBRELLA_MCP_URL: z.string().url().optional(),
  UMBRELLA_API_BASE_URL: z.string().url().optional(),
  UMBRELLA_API_TOKEN: z.string().optional(),
  FINOPS_ALLOWED_CHANNEL_IDS: z.string().default(""),
  FINOPS_DEFAULT_CURRENCY: z.string().default("USD")
});

export const config = schema.parse(process.env);
export const allowedChannels = new Set(
  config.FINOPS_ALLOWED_CHANNEL_IDS.split(",").map(v => v.trim()).filter(Boolean)
);

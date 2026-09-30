import { App } from "@slack/bolt";
import { allowedChannels, config } from "../config.js";
import { FinOpsTools } from "../finops/tools.js";

export function createSlackApp(tools: FinOpsTools) {
  const app = new App({
    token: config.SLACK_BOT_TOKEN,
    signingSecret: config.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: config.SLACK_APP_TOKEN
  });

  app.event("app_mention", async ({ event, say }) => {
    if (allowedChannels.size && !allowedChannels.has(event.channel)) {
      await say("This FinOps agent is not enabled in this channel.");
      return;
    }

    const question = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    await say({
      text: [
        "FinOps agent received your question:",
        `“${question}”`,
        "",
        "The Slack interface is ready. Umbrella authentication/query execution is the next connection step."
      ].join("\n"),
      thread_ts: event.ts
    });

    // Deliberately no arbitrary LLM-to-provider execution yet.
    // Next step: intent -> allowlisted FinOpsTools method -> formatted answer.
    void tools;
  });

  return app;
}

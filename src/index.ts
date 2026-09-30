import { UmbrellaProvider } from "./finops/umbrella.js";
import { FinOpsTools } from "./finops/tools.js";
import { createSlackApp } from "./slack/app.js";

const provider = new UmbrellaProvider();
const tools = new FinOpsTools(provider);
const app = createSlackApp(tools);

await app.start();
console.log("⚡️ YouLeap FinOps Agent is running in Slack Socket Mode");

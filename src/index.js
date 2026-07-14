#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerElevenLabsTools } from "./tools/elevenlabs.js";
import { registerFishAudioTools } from "./tools/fishaudio.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerThumbnailTools } from "./tools/thumbnail.js";
import { registerLeadTools } from "./tools/leads.js";
import { registerLinkedInTools } from "./tools/linkedin.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerReplicateTools } from "./tools/replicate.js";
import { registerBrandOSTools } from "./tools/brandos.js";
import { registerRemotionTools } from "./tools/remotion.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

// --- Global Error Handling ---
process.on("unhandledRejection", (reason, promise) => {
    console.error("[Process] ❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("[Process] ❌ Uncaught Exception:", error);
    // Keep the process alive but log the error
});

// --- Server Setup ---

const server = new McpServer({
    name: "AIGigLab MCP",
    version: "1.0.0"
});

// Register Tool Modules
registerElevenLabsTools(server);
registerFishAudioTools(server);
registerAssetTools(server);
registerThumbnailTools(server);
registerLeadTools(server);
registerLinkedInTools(server);
registerProfileTools(server);
registerReplicateTools(server);
registerBrandOSTools(server);
registerRemotionTools(server);

// --- SSE Server ---
const app = express();
const PORT = process.env.PORT || 3000;
let sseTransports = new Map();

app.get("/sse", async (req, res) => {
    console.log("[SSE] New connection request");
    const transport = new SSEServerTransport("/messages", res);
    sseTransports.set(transport.sessionId, transport);
    
    await server.connect(transport);
    
    transport.onclose = () => {
        sseTransports.delete(transport.sessionId);
        console.log(`[SSE] Connection closed: ${transport.sessionId}`);
    };
});

app.post("/messages", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sseTransports.get(sessionId);

    if (!transport) {
        res.status(404).send("Session not found");
        return;
    }

    await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
    console.error(`AIGigLab MCP Server (SSE) running on http://localhost:${PORT}`);
});

// --- Server Startup ---

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("AIGigLab MCP Server (Stdio) running");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

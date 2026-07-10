import { z } from "zod";
import { apiClient } from "../api.js";
import fs from "fs";
import { handleFilePath } from "../utils/fileHandler.js";

export function registerAssetTools(server) {

    server.tool(
        "generate_asset",
        "Generate an image asset using AI models.",
        {
            prompt: z.string().describe("The text prompt for image generation"),
            modelId: z.string().optional().default("google/nano-banana-pro").describe("The ID of the AI model to use. Defaults to 'google/nano-banana-pro'."),
            aspectRatio: z.string().optional().describe("Aspect ratio (e.g., '1:1', '16:9'). Default depends on model."),
            image_file: z.string().optional().describe("Absolute local path for image-to-image generation"),
            image_content: z.string().optional().describe("Base64 encoded image content for image-to-image")
        },
        async (args) => {
            try {
                let modelId = args.modelId || "google/nano-banana-pro";
                if (!["google/nano-banana-pro", "ideogram-ai/ideogram-v3-turbo", "ideogram-ai/ideogram-v2"].includes(modelId)) {
                    modelId = "google/nano-banana-pro";
                }

                const payload = {
                    prompt: args.prompt,
                    modelId: modelId,
                    aspectRatio: args.aspectRatio || "1:1"
                };

                // Handle Image Input (Read file -> Convert to Base64 data URI if needed, or send as is depending on backend expectation)
                // The controller expects `image` in body. Replicate usually expects a URL or Data URI.
                // We will convert to Data URI.

                let base64Image = null;

                if (args.image_content) {
                    base64Image = args.image_content;
                } else if (args.image_file) {
                    const normalizedPath = handleFilePath(args.image_file);
                    if (fs.existsSync(normalizedPath)) {
                        base64Image = fs.readFileSync(normalizedPath, { encoding: 'base64' });
                    } else {
                        throw new Error(`Image file not found: ${normalizedPath}`);
                    }
                }

                if (base64Image) {
                    // Start of data URI usually needed? The controller passes it to Replicate.
                    // Replicate handles base64, but best to prefix. Let's assume standard format if prompt doesn't say.
                    // But usually the client sends the raw base64 or data uri. Let's send a standard data uri prefix if missing?
                    // Safe bet: The user might paste raw base64. Let's prepend generic png/jpeg prefix if missing?
                    // Actually, let's just send what we have.
                    payload.image = `data:image/png;base64,${base64Image}`;
                }

                const response = await apiClient.post('/assets/generate', payload);

                // Initialize response text
                let responseText = "";

                if (response.data.status === "action_required") {
                    responseText = `Clarification Needed: ${response.data.message}\nOriginal Input: ${response.data.originalInput}`;
                } else if (response.data.status === "success") {
                    const asset = response.data.asset;
                    responseText = `Asset Generated Successfully!\n\nID: ${asset._id}\nStatus: ${asset.status}\nModel: ${asset.modelId}\n\nOutput URL(s):\n${asset.outputUrls.join('\n')}`;
                } else {
                    responseText = JSON.stringify(response.data, null, 2);
                }

                return {
                    content: [{
                        type: "text",
                        text: responseText
                    }]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating asset: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "list_assets",
        "List your generated AI assets.",
        {
            page: z.number().optional().describe("Page number (default: 1)"),
            limit: z.number().optional().describe("Items per page (default: 20)")
        },
        async (args) => {
            try {
                const params = {
                    page: args.page || 1,
                    limit: args.limit || 20
                };

                const response = await apiClient.get('/assets', { params });

                // Format the output nicely
                const assets = response.data.assets || [];
                const formattedAssets = assets.map(a => ({
                    id: a._id,
                    model: a.modelId,
                    prompt: a.originalPrompt.substring(0, 50) + "...",
                    status: a.status,
                    created: a.createdAt,
                    url: a.outputUrls?.[0] || "Processing..."
                }));

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(formattedAssets, null, 2)
                    }]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing assets: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}

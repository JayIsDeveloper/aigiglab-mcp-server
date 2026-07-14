import { z } from "zod";
import fs from "fs";
import path from "path";
import { apiClient } from "../api.js";

function getBase64DataURI(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const ext = path.extname(filePath).toLowerCase();
    let mime = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.webp') mime = 'image/webp';
    else if (ext === '.gif') mime = 'image/gif';

    const base64 = fs.readFileSync(filePath).toString('base64');
    return `data:${mime};base64,${base64}`;
}

export function registerBrandOSTools(server) {
    
    server.tool(
        "brandos_get_profile",
        "Retrieve the user's active Brand Vault identity.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/brand/profile');
                return {
                    content: [{
                        type: "text",
                        text: `Brand Vault Profile:\n\n${JSON.stringify(response.data.brandProfile, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching Brand Profile: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "brandos_update_profile",
        "Update the user's Brand Vault settings (identity, colors, mood, fonts).",
        {
            name: z.string().describe("The name of the brand"),
            slogan: z.string().optional().describe("Brand slogan or tagline"),
            colors: z.array(z.string()).optional().describe("Array of brand colors (hex codes or names)"),
            fontDetails: z.string().optional().describe("Typography style description"),
            mood: z.string().optional().describe("Overall mood or aesthetic (e.g. Professional, Playful)"),
            industry: z.string().optional().describe("Brand's industry"),
            negativePrompts: z.string().optional().describe("Things to avoid in brand generations")
        },
        async (args) => {
            try {
                const response = await apiClient.put('/brand/profile', args);
                return {
                    content: [{
                        type: "text",
                        text: `✅ Brand Vault updated successfully!\n\n${JSON.stringify(response.data.brandProfile, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error updating Brand Profile: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "brandos_generate_asset",
        "Generate an image asset using BrandOS Identity Engine.",
        {
            prompt: z.string().describe("The description of the image to generate"),
            modelId: z.string().describe("e.g. 'google/nano-banana-pro' or 'ideogram-ai/ideogram-v3-turbo'"),
            aspectRatio: z.string().optional().default("1:1").describe("e.g., '1:1', '16:9', '9:16'"),
            studioMode: z.string().optional().default("IDENTITY").describe("Studio mode routing"),
            useBrandVault: z.boolean().optional().default(true).describe("Whether to automatically inject brand identity"),
            imagePath: z.string().optional().describe("Absolute local path to a source image for img2img"),
            referenceImagesPaths: z.array(z.string()).optional().describe("Array of absolute local paths for reference images")
        },
        async (args) => {
            try {
                const payload = {
                    prompt: args.prompt,
                    modelId: args.modelId,
                    aspectRatio: args.aspectRatio,
                    studioMode: args.studioMode,
                    useBrandVault: args.useBrandVault
                };

                if (args.imagePath) {
                    payload.image = getBase64DataURI(args.imagePath);
                }

                if (args.referenceImagesPaths && args.referenceImagesPaths.length > 0) {
                    payload.referenceImages = args.referenceImagesPaths.map(p => getBase64DataURI(p));
                }

                const response = await apiClient.post('/brand/generate', payload);

                return {
                    content: [{
                        type: "text",
                        text: `✅ BrandOS Asset Generated!\n\nAsset ID: ${response.data.asset?._id}\nOutput URLs:\n${response.data.asset?.outputUrls?.join('\n') || "No URLs returned"}\nRemaining Credits: ${response.data.remainingCredits}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error generating BrandOS Asset: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "brandos_generate_mockup",
        "Generate a blank product mockup template or a flat print design using AI.",
        {
            prompt: z.string().describe("Description of the mockup or design"),
            type: z.enum(["TEMPLATE", "DESIGN"]).describe("Whether to generate a blank TEMPLATE or flat DESIGN"),
            aspectRatio: z.string().optional().default("1:1").describe("Aspect ratio (e.g. '1:1', '16:9')"),
            resolution: z.string().optional().default("2K").describe("Resolution quality (e.g. '2K', '4K')"),
            referenceImagePath: z.string().optional().describe("Absolute local path to an image reference")
        },
        async (args) => {
            try {
                const payload = {
                    prompt: args.prompt,
                    type: args.type,
                    aspectRatio: args.aspectRatio,
                    resolution: args.resolution
                };

                if (args.referenceImagePath) {
                    payload.referenceImage = getBase64DataURI(args.referenceImagePath);
                }

                const response = await apiClient.post('/mockup/generate-asset', payload);

                return {
                    content: [{
                        type: "text",
                        text: `✅ BrandOS Mockup Asset Generated!\n\nID: ${response.data.template?._id || response.data.design?._id || 'Unknown'}\nImage URL: ${response.data.template?.imageUrl || response.data.design?.imageUrl || 'Unknown'}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error generating Mockup Asset: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );
}

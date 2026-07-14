import { z } from "zod";
import fs from "fs";
import FormData from "form-data";
import { apiClient } from "../api.js";

export function registerRemotionTools(server) {
    
    server.tool(
        "remotion_generate_video",
        "Generate a dynamic, code-based video presentation using Remotion and AI.",
        {
            scriptText: z.string().describe("The core script, topic, or creative brief for the video"),
            voiceId: z.string().optional().default("none").describe("ElevenLabs Voice ID (e.g., 'XrExE9yKIg1WjnnlVkGX'). Pass 'none' for a silent video."),
            aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional().default("16:9").describe("Video aspect ratio"),
            logoPath: z.string().optional().describe("Absolute local path to a logo image (SVG, PNG, JPG) to overlay on the video")
        },
        async (args) => {
            try {
                const formData = new FormData();
                formData.append("scriptText", args.scriptText);
                formData.append("voiceId", args.voiceId);
                formData.append("aspectRatio", args.aspectRatio);
                formData.append("useAI", "true");

                if (args.logoPath) {
                    if (!fs.existsSync(args.logoPath)) {
                        return { content: [{ type: "text", text: `Logo file not found: ${args.logoPath}` }], isError: true };
                    }
                    formData.append("logo", fs.createReadStream(args.logoPath));
                }

                const response = await apiClient.post('/remotion/generate', formData, {
                    headers: formData.getHeaders()
                });

                return {
                    content: [{
                        type: "text",
                        text: `✅ Remotion Video Generation Queued!\n\nJob ID: ${response.data.jobId}\nMessage: ${response.data.message}\n\nNote: The video is rendering asynchronously. Use the 'remotion_get_status' tool with this Job ID to check its progress and get the final MP4 URL.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error generating Remotion video: ${error.response?.data?.message || error.response?.data?.error || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "remotion_get_status",
        "Check the rendering status of a queued Remotion video using its Job ID.",
        {
            jobId: z.string().describe("The Job ID returned from remotion_generate_video")
        },
        async (args) => {
            try {
                const response = await apiClient.get(`/remotion/status/${args.jobId}`);
                
                const status = response.data.status; // 'queued', 'processing', 'completed', 'failed'
                const videoUrl = response.data.videoUrl || "Not ready yet";
                const error = response.data.error || "None";

                return {
                    content: [{
                        type: "text",
                        text: `Remotion Job Status: ${status.toUpperCase()}\n\nJob ID: ${args.jobId}\nVideo URL: ${videoUrl}\nError: ${error}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching Remotion status: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "remotion_get_history",
        "Get the user's past Remotion video generation jobs.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/remotion/history');
                return {
                    content: [{
                        type: "text",
                        text: `Remotion Generation History:\n\n${JSON.stringify(response.data, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching Remotion history: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );
}

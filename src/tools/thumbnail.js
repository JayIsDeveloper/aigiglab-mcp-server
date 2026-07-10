import { z } from "zod";
import { apiClient } from "../api.js";

export function registerThumbnailTools(server) {

    server.tool(
        "generate_thumbnail_concepts",
        "Analyze a video title/script and generate viral thumbnail concepts (hooks).",
        {
            videoTitle: z.string().describe("The title of the YouTube video"),
            videoScript: z.string().optional().describe("Brief script or summary of the video content")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/youtube/thumbnail/concepts', {
                    videoTitle: args.videoTitle,
                    videoScript: args.videoScript
                });

                if (response.data.success) {
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(response.data.concepts, null, 2)
                        }]
                    };
                } else {
                    return {
                        content: [{ type: "text", text: "Failed to generate concepts." }],
                        isError: true
                    };
                }

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating concepts: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "generate_thumbnail_image",
        "Generate a real thumbnail image based on a selected concept.",
        {
            videoTitle: z.string().optional().describe("The video title (for history tracking)"),
            conceptType: z.enum(['curiosity', 'extreme', 'negative', 'custom']).describe("The type of viral angle"),
            visualDescription: z.string().describe("Detailed visual description of the thumbnail scene"),
            style: z.string().optional().describe("Artistic style (e.g., 'hyper-realistic', '3d render')"),
            format: z.enum(['youtube_long', 'shorts_reels', 'instagram_square', 'linkedin_article', 'twitter_card']).default('youtube_long').describe("Target platform format")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/youtube/thumbnail/generate', {
                    videoTitle: args.videoTitle || "Untitled via MCP",
                    conceptType: args.conceptType,
                    visualDescription: args.visualDescription,
                    style: args.style,
                    format: args.format
                });

                if (response.data.success) {
                    return {
                        content: [{
                            type: "text",
                            text: `Thumbnail Generated Successfully!\n\nURL: ${response.data.image}\nCredits Remaining: ${response.data.credits}`
                        }]
                    };
                } else {
                    return {
                        content: [{ type: "text", text: "Failed to generate thumbnail image." }],
                        isError: true
                    };
                }

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating thumbnail: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}

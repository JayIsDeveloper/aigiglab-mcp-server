import { z } from "zod";
import fs from "fs";
import FormData from "form-data";
import { apiClient } from "../api.js";

export function registerReplicateTools(server) {
    
    server.tool(
        "replicate_wan_t2v",
        "Generate a high-quality video from text using Wan 2.5 Text-to-Video.",
        {
            prompt: z.string().describe("The text prompt for video generation"),
            size: z.enum(["1280*720", "720*1280", "1920*1080", "1080*1920", "832*480", "480*832"]).optional().default("1280*720").describe("Video resolution"),
            duration: z.union([z.literal(5), z.literal(10)]).optional().default(5).describe("Duration in seconds (5 or 10)"),
            negative_prompt: z.string().optional().describe("What to avoid in the video"),
            enable_prompt_expansion: z.boolean().optional().default(true).describe("Enhance prompt automatically"),
            seed: z.number().optional().describe("Random seed for reproducibility"),
            audioPath: z.string().optional().describe("Absolute path to a local audio file to drive the video")
        },
        async (args) => {
            try {
                const formData = new FormData();
                formData.append("prompt", args.prompt);
                formData.append("size", args.size);
                formData.append("duration", args.duration.toString());
                if (args.negative_prompt) formData.append("negative_prompt", args.negative_prompt);
                formData.append("enable_prompt_expansion", args.enable_prompt_expansion.toString());
                if (args.seed !== undefined) formData.append("seed", args.seed.toString());

                if (args.audioPath) {
                    if (!fs.existsSync(args.audioPath)) {
                        return { content: [{ type: "text", text: `Audio file not found: ${args.audioPath}` }], isError: true };
                    }
                    formData.append("audio", fs.createReadStream(args.audioPath));
                }

                const response = await apiClient.post('/replicate/wan-t2v', formData, {
                    headers: formData.getHeaders()
                });

                return {
                    content: [{
                        type: "text",
                        text: `✅ Wan 2.5 Video Generation Started!\n\nPrediction ID: ${response.data.predictionId}\nOutput URL: ${response.data.output}\n\nNote: The video might take a few minutes to complete on Replicate's servers.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error generating Wan 2.5 video: ${error.response?.data?.message || error.response?.data?.error || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "replicate_latentsync",
        "Synchronize lip movements in a video to match an audio file (Video Lip Sync).",
        {
            audioPath: z.string().describe("Absolute path to the local audio file (.wav, .mp3)"),
            videoPath: z.string().describe("Absolute path to the local video file (.mp4)"),
            seed: z.number().optional().default(0).describe("Random seed"),
            guidance_scale: z.number().optional().default(1).describe("Guidance scale for the model"),
            sizeQuality: z.enum(["latentsync_standard", "latentsync_hd"]).optional().default("latentsync_standard").describe("Quality of the output video")
        },
        async (args) => {
            try {
                if (!fs.existsSync(args.audioPath)) {
                    return { content: [{ type: "text", text: `Audio file not found: ${args.audioPath}` }], isError: true };
                }
                if (!fs.existsSync(args.videoPath)) {
                    return { content: [{ type: "text", text: `Video file not found: ${args.videoPath}` }], isError: true };
                }

                const formData = new FormData();
                formData.append("audio", fs.createReadStream(args.audioPath));
                formData.append("video", fs.createReadStream(args.videoPath));
                formData.append("seed", args.seed.toString());
                formData.append("guidance_scale", args.guidance_scale.toString());
                formData.append("sizeQuality", args.sizeQuality);

                const response = await apiClient.post('/replicate/latentsync', formData, {
                    headers: formData.getHeaders()
                });

                return {
                    content: [{
                        type: "text",
                        text: `✅ LatentSync Video Lip Sync Started!\n\nPrediction ID: ${response.data.predictionId}\nOutput URL: ${response.data.output}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error generating LatentSync: ${error.response?.data?.message || error.response?.data?.error || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "replicate_ltx_fast",
        "Generate a fast, high-quality video from a single image using LTX-2-Fast.",
        {
            imagePath: z.string().describe("Absolute path to the local image file"),
            prompt: z.string().describe("Text prompt describing the motion/scene"),
            duration: z.number().optional().default(10).describe("Duration in seconds"),
            resolution: z.enum(["1080p", "2k", "4k"]).optional().default("1080p").describe("Output video resolution"),
            generate_audio: z.boolean().optional().default(true).describe("Whether to generate audio for the video")
        },
        async (args) => {
            try {
                if (!fs.existsSync(args.imagePath)) {
                    return { content: [{ type: "text", text: `Image file not found: ${args.imagePath}` }], isError: true };
                }

                const formData = new FormData();
                formData.append("image", fs.createReadStream(args.imagePath));
                formData.append("prompt", args.prompt);
                formData.append("duration", args.duration.toString());
                formData.append("resolution", args.resolution);
                formData.append("generate_audio", args.generate_audio.toString());

                const response = await apiClient.post('/replicate/ltx-fast', formData, {
                    headers: formData.getHeaders()
                });

                return {
                    content: [{
                        type: "text",
                        text: `✅ LTX-2-Fast Image-to-Video Started!\n\nPrediction ID: ${response.data.predictionId}\nOutput URL: ${response.data.output}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error generating LTX-2-Fast video: ${error.response?.data?.message || error.response?.data?.error || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "replicate_history",
        "Get the user's last 20 Replicate AI Studio generations.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/replicate/history');
                return {
                    content: [{
                        type: "text",
                        text: `Replicate Generation History:\n\n${JSON.stringify(response.data.history, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching history: ${error.response?.data?.message || error.response?.data?.error || error.message}` }],
                    isError: true
                };
            }
        }
    );
}

import { z } from "zod";
import { apiClient } from "../api.js";
import fs from "fs";
import path from "path";
import FormData from 'form-data';
import { AUDIO_DIR, handleFilePath } from "../utils/fileHandler.js";

// Note: Backend endpoint base path is likely mounted at /api/fish-audio based on controller conventions, 
// but user code suggests /fishaudio in the store. We'll use the path derived from store logic but adapted for the MCP AXIOS client logic which targets the main backend.
// The store uses /fishaudio/..., let's assume the backend routes are mounted there or we check the main server.
// Looking at the controller file, it doesn't show the route mount, but usually it's /api/fish-audio or /api/fish.
// Assuming /api/fishaudio based on store usage `axiosInstance.post('/fishaudio/...')`. 
// The MCP `apiClient` base URL is likely http://localhost:5000/api. So we use `/fishaudio/...`

export function registerFishAudioTools(server) {

    server.tool(
        "fish_list_models",
        "List available FishAudio models.",
        {
            limit: z.number().optional().describe("Number of models to return (default: 20)"),
            offset: z.number().optional().describe("Offset for pagination (default: 0)"),
            title: z.string().optional().describe("Search by title")
        },
        async (args) => {
            try {
                const params = {
                    limit: args.limit || 20,
                    offset: args.offset || 0
                };
                if (args.title) params.title = args.title;

                const response = await apiClient.get('/fishaudio/models', { params });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(response.data, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing FishAudio models: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    /* server.tool(
        "fish_synthesize_voice",
        "Generate audio using FishAudio TTS.",
        {
            text: z.string().describe("The text to synthesize"),
            reference_id: z.string().describe("Reference ID of the voice model"),
            format: z.string().optional().describe("Audio format (mp3, wav, etc.) - Default: mp3"),
            latency: z.string().optional().describe("Latency (normal, balanced) - Default: normal")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/fishaudio/tts', {
                    text: args.text,
                    reference_id: args.reference_id,
                    format: args.format || 'mp3',
                    latency: args.latency || 'normal'
                }, {
                    responseType: 'arraybuffer'
                });

                const audioBuffer = Buffer.from(response.data);
                const filename = `fish_speech_${Date.now()}.${args.format || 'mp3'}`;
                const filePath = path.join(AUDIO_DIR, filename);

                fs.writeFileSync(filePath, audioBuffer);

                return {
                    content: [{
                        type: "text",
                        text: `🐠 FishAudio generated successfully!\n\nI'm sending the file to you now.\n(Local Path: ${filePath})`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating FishAudio: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    ); */

    server.tool(
        "fish_transcribe_audio",
        "Transcribe audio using FishAudio ASR.",
        {
            file: z.string().optional().describe("Absolute local path to audio file"),
            file_content: z.string().optional().describe("Base64 encoded audio content"),
            language: z.string().optional().describe("Language code (default: en)")
        },
        async (args) => {
            try {
                const form = new FormData();
                form.append('language', args.language || 'en');
                form.append('ignore_timestamps', 'false');

                if (args.file) {
                    const normalizedPath = handleFilePath(args.file);
                    if (fs.existsSync(normalizedPath)) {
                        form.append('audio', fs.createReadStream(normalizedPath));
                    } else {
                        throw new Error(`File not found: ${normalizedPath}`);
                    }
                } else if (args.file_content) {
                    const buffer = Buffer.from(args.file_content, 'base64');
                    form.append('audio', buffer, { filename: 'audio.mp3' });
                } else {
                    throw new Error("Provide either 'file' or 'file_content'");
                }

                const response = await apiClient.post('/fishaudio/asr', form, {
                    headers: { ...form.getHeaders() }
                });

                return {
                    content: [{
                        type: "text",
                        text: `Transcription:\n${response.data.text || JSON.stringify(response.data)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error transcribing with FishAudio: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "fish_create_voice_clone",
        "Create a voice clone model with FishAudio.",
        {
            title: z.string().describe("Title for the voice model"),
            description: z.string().optional().describe("Description"),
            texts: z.string().optional().describe("Reference text spoken in audio"),
            files: z.array(z.string()).optional().describe("List of absolute local file paths"),
            files_content: z.array(z.string()).optional().describe("List of Base64 encoded file contents")
        },
        async (args) => {
            try {
                const form = new FormData();
                form.append('title', args.title);
                form.append('type', 'tts');
                form.append('train_mode', 'fast');
                form.append('visibility', 'private');

                if (args.description) form.append('description', args.description);
                if (args.texts) form.append('texts', args.texts);

                let hasFiles = false;

                if (args.files) {
                    for (const filePath of args.files) {
                        const normalizedPath = handleFilePath(filePath);
                        if (fs.existsSync(normalizedPath)) {
                            form.append('voices', fs.createReadStream(normalizedPath));
                            hasFiles = true;
                        }
                    }
                }

                if (args.files_content) {
                    args.files_content.forEach((content, i) => {
                        form.append('voices', Buffer.from(content, 'base64'), { filename: `sample_${i}.mp3` });
                        hasFiles = true;
                    });
                }

                if (!hasFiles) throw new Error("At least one audio sample file is required.");

                const response = await apiClient.post('/fishaudio/clone', form, {
                    headers: { ...form.getHeaders() }
                });

                return {
                    content: [{
                        type: "text",
                        text: `FishAudio Model Created!\nID: ${response.data._id}\nTitle: ${response.data.title}`
                    }]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error cloning with FishAudio: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}

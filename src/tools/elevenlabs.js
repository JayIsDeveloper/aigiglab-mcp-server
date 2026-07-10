import { z } from "zod";
import { apiClient } from "../api.js";
import fs from "fs";
import path from "path";
import FormData from 'form-data';
import { AUDIO_DIR, handleFilePath } from "../utils/fileHandler.js";

export function registerElevenLabsTools(server) {
    server.tool(
        "list_voices",
        "List available ElevenLabs voices for text-to-speech.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/eleven-labs/voices');
                const voices = response.data.voices || [];
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(voices.map(v => ({
                            voice_id: v.voice_id,
                            name: v.name,
                            category: v.category
                        })), null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing voices: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "list_models",
        "List available ElevenLabs models for speech synthesis.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/eleven-labs/models');
                const models = response.data.models || [];
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(models.map(m => ({
                            model_id: m.model_id,
                            name: m.name,
                            description: m.description,
                            languages: m.languages?.map(l => l.name)
                        })), null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing models: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "synthesize_voice",
        "Generate audio from text using ElevenLabs.",
        {
            text: z.string().describe("The text content to speak."),
            voiceId: z.string().describe("The ID of the voice to use (use list_voices to find IDs).")
        },
        async (args) => {
            try {
                const response = await apiClient.post(`/eleven-labs/text-to-speech/${args.voiceId}`, {
                    text: args.text
                }, {
                    responseType: 'arraybuffer'
                });

                const audioBuffer = Buffer.from(response.data);
                const filename = `speech_${Date.now()}.mp3`;
                const filePath = path.join(AUDIO_DIR, filename);

                fs.writeFileSync(filePath, audioBuffer);
                console.log(`[ElevenLabs] 💾 Audio saved to: ${filePath}`);

                return {
                    content: [
                        {
                            type: "text",
                            text: `🎵 Audio generated successfully!\n\nI'm sending the file to you now.\n(Local Path: ${filePath})`
                        }
                    ]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating audio: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "create_voice_clone",
        "Clone a new voice from audio samples.",
        {
            name: z.string().describe("Name of the voice to create"),
            description: z.string().optional().describe("Description of the voice"),
            files: z.array(z.string()).describe("List of ABSOLUTE LOCAL PATHS to audio samples on the Windows machine (e.g., 'C:/Users/name/Downloads/sample.mp3'). Do NOT use virtual paths like /mnt/."),
            files_content: z.array(z.string()).optional().describe("List of Base64 encoded file contents (Alternative to 'files' for drag-and-drop)")
        },
        async (args) => {
            try {
                const form = new FormData();
                form.append('name', args.name);
                if (args.description) form.append('description', args.description);

                if (args.files && args.files.length > 0) {
                    for (const filePath of args.files) {
                        const normalizedPath = handleFilePath(filePath);
                        if (fs.existsSync(normalizedPath)) {
                            form.append('files', fs.createReadStream(normalizedPath));
                        } else {
                            throw new Error(`File not found at local path: ${normalizedPath}`);
                        }
                    }
                }

                if (args.files_content && args.files_content.length > 0) {
                    args.files_content.forEach((base64Content, index) => {
                        const buffer = Buffer.from(base64Content, 'base64');
                        form.append('files', buffer, { filename: `sample_${index}.mp3` });
                    });
                }

                if ((!args.files || args.files.length === 0) && (!args.files_content || args.files_content.length === 0)) {
                    throw new Error("You must provide either 'files' (paths) or 'files_content' (Base64 data).");
                }

                const response = await apiClient.post('/eleven-labs/voices/add', form, {
                    headers: {
                        ...form.getHeaders()
                    }
                });

                return {
                    content: [{
                        type: "text",
                        text: `Voice cloned successfully! Voice ID: ${response.data.voice_id}`
                    }]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error cloning voice: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "transcribe_audio",
        "Transcribe an audio file to text.",
        {
            file: z.string().optional().describe("ABSOLUTE LOCAL PATH to the audio file on the Windows machine (e.g., 'C:/Users/name/Downloads/file.mp3'). Do NOT use virtual paths like /mnt/."),
            file_content: z.string().optional().describe("Base64 encoded content of the audio file (Alternative to 'file' for drag-and-drop)"),
            model_id: z.string().optional().describe("Model ID (default: scribe_v1)")
        },
        async (args) => {
            try {
                const form = new FormData();
                form.append('model_id', args.model_id || 'scribe_v1');

                if (args.file) {
                    const normalizedPath = handleFilePath(args.file);
                    if (fs.existsSync(normalizedPath)) {
                        form.append('file', fs.createReadStream(normalizedPath));
                    } else {
                        throw new Error(`File not found at local path: ${normalizedPath}`);
                    }
                } else if (args.file_content) {
                    const buffer = Buffer.from(args.file_content, 'base64');
                    form.append('file', buffer, { filename: 'audio.mp3' });
                } else {
                    throw new Error("You must provide either 'file' (path) or 'file_content' (Base64 data).");
                }

                const response = await apiClient.post('/eleven-labs/speech-to-text', form, {
                    headers: {
                        ...form.getHeaders()
                    }
                });

                const text = response.data.text || JSON.stringify(response.data);

                return {
                    content: [{
                        type: "text",
                        text: `Transcription:\n\n${text}`
                    }]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error transcribing audio: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "create_composition_plan",
        "Create a composition plan for music generation.",
        {
            prompt: z.string().describe("Prompt to create a composition plan for (e.g., 'A synthwave track with a driving bassline')"),
            music_length_ms: z.number().optional().describe("The length of the composition plan to generate in milliseconds (10000ms - 300000ms).")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/eleven-labs/music/composition-plan', args);
                return {
                    content: [{
                        type: "text",
                        text: `Music Composition Plan Created!\n\nPlan ID: ${response.data.id}\nDuration: ${response.data.duration_ms}ms\n\nYou can now use 'compose_music' with this plan.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating composition plan: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "compose_music",
        "Convert a prompt or composition plan into actual music.",
        {
            prompt: z.string().optional().describe("Prompt to convert to music (if no plan is provided)"),
            composition_plan: z.any().optional().describe("The composition plan object from 'create_composition_plan'"),
            music_length_ms: z.number().optional().describe("Length in ms (if no plan is provided)")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/eleven-labs/music/generate', args, {
                    responseType: 'arraybuffer'
                });

                const audioBuffer = Buffer.from(response.data);
                const filename = `music_${Date.now()}.mp3`;
                const filePath = path.join(AUDIO_DIR, filename);

                fs.writeFileSync(filePath, audioBuffer);

                return {
                    content: [{
                        type: "text",
                        text: `🎸 Music generated successfully!\n\nI'm sending the file to you now.\n(Local Path: ${filePath})`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating music: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "text_to_sound_effects",
        "Generate high-quality sound effects from a text description.",
        {
            text: z.string().describe("Description of the sound effect (e.g., 'A futuristic laser blast')"),
            duration_seconds: z.number().optional().describe("Duration in seconds (0.5 - 5.0)")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/eleven-labs/sound-effects', args, {
                    responseType: 'arraybuffer'
                });

                const audioBuffer = Buffer.from(response.data);
                const filename = `sfx_${Date.now()}.mp3`;
                const filePath = path.join(AUDIO_DIR, filename);

                fs.writeFileSync(filePath, audioBuffer);

                return {
                    content: [{
                        type: "text",
                        text: `🔊 Sound Effect generated successfully!\n\nI'm sending the file to you now.\n(Local Path: ${filePath})`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating sound effect: ${error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}

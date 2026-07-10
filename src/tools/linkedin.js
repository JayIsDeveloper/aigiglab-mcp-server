import { z } from "zod";
import { apiClient } from "../api.js";

export function registerLinkedInTools(server) {

    server.tool(
        "get_linkedin_auth_urls",
        "Get the OAuth connection URLs to connect a personal LinkedIn profile or a Company Page.",
        z.object({}),
        async () => {
            try {
                const personalRes = await apiClient.get('/linkedin/auth-url');
                const companyRes = await apiClient.get('/linkedin/company-auth-url');
                return {
                    content: [{ 
                        type: "text", 
                        text: `LinkedIn Authentication URLs:\n\nPersonal Profile: ${personalRes.data.url}\n\nCompany Page: ${companyRes.data.url}\n\nPlease click the appropriate link to connect your account.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching auth URLs: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_linkedin_config",
        "Get the current LinkedIn automation configuration, connection status, stats, and recent logs.",
        z.object({}),
        async () => {
            try {
                const response = await apiClient.get('/linkedin/config');
                const data = response.data;
                
                // Delete logs to avoid confusing the LLM into rendering history instead of config
                if (data.logs) {
                    delete data.logs;
                }
                
                // Delete referenceContent from topics to save tokens and prevent caching
                if (data.config && Array.isArray(data.config.topics)) {
                    data.config.topics.forEach(topic => {
                        if (topic.referenceContent) {
                            delete topic.referenceContent;
                        }
                    });
                }

                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching config: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "update_linkedin_config",
        "Update LinkedIn automation configuration (e.g., topics, schedules, tone, post types).",
        {
            isActive: z.boolean().optional().describe("Enable or disable the automation"),
            tone: z.enum(["Professional", "Casual", "Witty", "Controversial", "Storyteller", "Educational"]).optional().describe("Tone of voice"),
            targetAudience: z.string().optional().describe("Target audience description (e.g., 'Software Engineers', 'Startup Founders')"),
            postTypes: z.enum(["text_only", "image_post", "carousel_post", "mixed"]).optional().describe("Type of posts to generate"),
            carouselImageCount: z.number().min(2).max(5).optional().describe("Number of images for carousel_post (min 2, max 5)"),
            timezone: z.string().optional().describe("Timezone for scheduling (e.g., 'Asia/Calcutta')"),
            schedulingMode: z.enum(["daily", "weekly", "one_time"]).optional().describe("Scheduling mode"),
            customPrompt: z.string().optional().describe("Additional custom instructions for the AI"),
            topics: z.array(z.object({
                _id: z.string().optional(),
                name: z.string(),
                enabled: z.boolean().optional(),
                priority: z.number().min(1).max(5).optional().describe("Priority level from 1 (Lowest) to 5 (Highest)"),
                referenceUrl: z.string().optional(),
                isSeries: z.boolean().optional(),
                seriesTotal: z.number().optional()
            })).optional().describe("CRITICAL: This replaces the ENTIRE topics list. To add a new topic without deleting existing ones, you MUST include all existing topics (including their _id) in this array alongside the new one."),
            dailySchedule: z.array(z.object({
                time: z.string(),
                topicId: z.string().optional()
            })).optional().describe("CRITICAL: This replaces the ENTIRE daily schedule list. You MUST include all existing schedules you want to keep."),
            weeklySchedule: z.record(
                z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
                z.array(z.object({
                    time: z.string(),
                    topicId: z.string().optional(),
                    enabled: z.boolean().optional()
                }))
            ).optional().describe("Weekly schedule slots keyed by day e.g. { 'Wed': [{ time: '16:40' }] }"),
            oneTimeDate: z.string().optional().describe("Date-time string for one_time scheduling (e.g. '2026-07-08T16:40:00.000Z')"),
            oneTimeTopicId: z.string().optional().describe("Topic ID for the one_time post")
        },
        async (args) => {
            try {
                const response = await apiClient.put('/linkedin/config', args);
                return {
                    content: [{ type: "text", text: `Configuration updated successfully!\n\n${JSON.stringify(response.data.config, null, 2)}` }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error updating config: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "trigger_linkedin_post_now",
        "Immediately generate and post content to LinkedIn using your current configuration and available credits.",
        z.object({}),
        async () => {
            try {
                const response = await apiClient.post('/linkedin/post-now', {});
                return {
                    content: [{ type: "text", text: `Post triggered successfully!\n\nPost URN: ${response.data.urn}` }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error triggering post: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_linkedin_post_history",
        "Retrieve the history of recent LinkedIn posts generated by the AI.",
        {
            limit: z.number().default(10).describe("Number of recent posts to retrieve")
        },
        async (args) => {
            try {
                const response = await apiClient.get(`/linkedin/history?limit=${args.limit}`);
                
                // Map to a concise format to prevent exceeding the 5000 character cache limit
                const conciseHistory = Array.isArray(response.data) ? response.data.map(p => ({
                    id: p._id,
                    topic: p.topicName,
                    hook: p.hook,
                    date: p.createdAt,
                    status: p.status,
                    urn: p.urn,
                    preview: p.postText ? p.postText.substring(0, 80) + '...' : ''
                })) : response.data;

                return {
                    content: [{ type: "text", text: JSON.stringify(conciseHistory, null, 2) }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching history: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_linkedin_pages",
        "Get available LinkedIn Company Pages that the user manages.",
        z.object({}),
        async () => {
            try {
                const response = await apiClient.get('/linkedin/pages');
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching pages: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "set_linkedin_post_target",
        "Set whether to post to the 'personal' profile or a specific 'company' page.",
        {
            postTarget: z.enum(["personal", "company"]).describe("The target type"),
            orgId: z.string().optional().describe("Required if postTarget is 'company'"),
            name: z.string().optional().describe("Company name"),
            logo: z.string().optional().describe("Company logo URL")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/linkedin/set-target', args);
                return {
                    content: [{ type: "text", text: `Target updated successfully!\n\n${JSON.stringify(response.data, null, 2)}` }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error setting target: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );
}

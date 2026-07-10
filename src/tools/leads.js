import { z } from "zod";
import { apiClient } from "../api.js";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR, handleFilePath } from "../utils/fileHandler.js";

export function registerLeadTools(server) {

    server.tool(
        "scrape_leads",
        "Start a background job to scrape leads from Google Places based on a query and location.",
        {
            textQuery: z.string().describe("The search query (e.g., 'Digital Marketing Agencies')"),
            targetLocationName: z.string().describe("Human-readable location name (e.g., 'Mumbai, India')"),
            radiusMeters: z.number().default(5000).describe("Search radius in meters (max 50000)"),
            maxLeads: z.number().optional().default(50).describe("Maximum leads to collect (default 50)"),
            centerLatitude: z.number().optional().describe("Optional center latitude for precise search"),
            centerLongitude: z.number().optional().describe("Optional center longitude for precise search"),
            minRating: z.number().optional().describe("Minimum business rating (0-5)"),
            includedPrimaryTypes: z.array(z.string()).optional().describe("Filter by Google Place types (e.g., ['restaurant', 'gym'])")
        },
        async (args) => {
            try {
                const response = await apiClient.post('/leads/scrape', {
                    textQuery: args.textQuery,
                    targetLocationName: args.targetLocationName,
                    radiusMeters: args.radiusMeters,
                    maxLeads: args.maxLeads,
                    centerLatitude: args.centerLatitude,
                    centerLongitude: args.centerLongitude,
                    minRating: args.minRating,
                    includedPrimaryTypes: args.includedPrimaryTypes,
                    selectedFields: ['phone', 'website', 'address', 'rating', 'userRatingCount']
                });

                return {
                    content: [{
                        type: "text",
                        text: `🚀 Lead scraping job started successfully!\n\nCampaign ID: ${response.data.campaignId}\nTotal Grids to Scan: ${response.data.totalGridsToScan}\n\nI will process this in the background. You can check the status later using 'list_lead_campaigns'.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error starting scrape job: ${error.response?.data?.error || error.response?.data?.message || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "list_lead_campaigns",
        "List your recent lead scraping campaigns and their status.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/leads/campaigns');
                const campaigns = response.data.campaigns || [];
                
                if (campaigns.length === 0) {
                    return { content: [{ type: "text", text: "No lead campaigns found." }] };
                }

                const formatted = campaigns.map(c => ({
                    id: c._id,
                    query: c.searchQuery,
                    location: c.targetLocationName,
                    status: c.status,
                    leads: c.totalLeadsFound,
                    created: new Date(c.createdAt).toLocaleString()
                }));

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(formatted, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing campaigns: ${error.response?.data?.error || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_leads",
        "Fetch leads collected for a specific campaign.",
        {
            campaignId: z.string().describe("The ID of the campaign"),
            page: z.number().optional().default(1),
            limit: z.number().optional().default(20)
        },
        async (args) => {
            try {
                const response = await apiClient.get(`/leads/campaigns/${args.campaignId}/leads`, {
                    params: { page: args.page, limit: args.limit }
                });

                const leads = response.data.leads || [];
                const formatted = leads.map(l => ({
                    name: l.name,
                    phone: l.internationalPhoneNumber,
                    website: l.websiteUri,
                    address: l.formattedAddress,
                    rating: l.rating
                }));

                return {
                    content: [{
                        type: "text",
                        text: `Total Leads: ${response.data.total}\nPage: ${response.data.page}/${response.data.totalPages}\n\n${JSON.stringify(formatted, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching leads: ${error.response?.data?.error || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "export_leads",
        "Export leads for a campaign to a CSV file and send it.",
        {
            campaignId: z.string().describe("The ID of the campaign to export")
        },
        async (args) => {
            try {
                const response = await apiClient.get(`/leads/campaigns/${args.campaignId}/export`, {
                    responseType: 'arraybuffer'
                });

                const filename = `leads_export_${args.campaignId}_${Date.now()}.csv`;
                const filePath = path.join(UPLOAD_DIR, filename);

                fs.writeFileSync(filePath, Buffer.from(response.data));
                console.error(`[Leads] 📊 CSV Export saved to: ${filePath}`);

                return {
                    content: [{
                        type: "text",
                        text: `✅ Leads exported successfully!\n\nI'm sending the CSV file to you now.\n(Local Path: ${filePath})`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error exporting leads: ${error.response?.data?.error || error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}

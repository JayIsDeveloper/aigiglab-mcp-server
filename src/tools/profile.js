import { z } from "zod";
import { apiClient } from "../api.js";

export function registerProfileTools(server) {
    server.tool(
        "get_profile_info",
        "Get the authenticated user's profile, active plan, and credit balance.",
        {},
        async () => {
            try {
                const response = await apiClient.get('/check');
                const user = response.data.user || response.data;
                
                const profile = {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.activePlan?.name || "Free",
                    credits: user.credits?.balance || 0,
                    apiKeys: user.apiKeys?.length || 0
                };

                return {
                    content: [{
                        type: "text",
                        text: `User Profile:\n${JSON.stringify(profile, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching profile: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_credit_transactions",
        "Get the user's billing and credit transaction history.",
        {
            page: z.number().optional().default(1),
            limit: z.number().optional().default(10)
        },
        async (args) => {
            try {
                const response = await apiClient.get('/transactions', {
                    params: { page: args.page, limit: args.limit }
                });
                
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(response.data, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching transactions: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_product_usage",
        "Get the user's AI tool and product usage history.",
        {
            page: z.number().optional().default(1),
            limit: z.number().optional().default(10)
        },
        async (args) => {
            try {
                const response = await apiClient.get('/usage', {
                    params: { page: args.page, limit: args.limit }
                });
                
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(response.data, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error fetching usage: ${error.response?.data?.message || error.message}` }],
                    isError: true
                };
            }
        }
    );
}

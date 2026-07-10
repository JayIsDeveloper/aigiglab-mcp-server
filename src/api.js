import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'https://cs4ow08w8gso40wso4ck0ks0.console.aigiglab.com/api';
const API_KEY = process.env.AIGIGLAB_API_KEY || process.env.MCP_API_KEY;

if (!API_KEY) {
    console.error("⚠️ FATAL: AIGIGLAB_API_KEY environment variable is not set.");
    console.error("Please get your API key from https://aigiglab.com and set it in your environment.");
    process.exit(1);
}


export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
    }
});


apiClient.interceptors.response.use(response => response, error => {
    console.error(`API Error [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, error.response?.data?.message || error.message);
    return Promise.reject(error);
});


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AUDIO_DIR = path.join(__dirname, '../../generated_audio');
export const UPLOAD_DIR = path.join(__dirname, '../../uploads');

export function ensureDirectories() {
    [AUDIO_DIR, UPLOAD_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

ensureDirectories();

export function handleFilePath(inputPath) {
    if (!inputPath) return inputPath;

    if (/^[A-Z]:/i.test(inputPath)) {
        return inputPath;
    }

    if (inputPath.startsWith('/mnt/c/')) {
        return inputPath.replace('/mnt/c/', 'C:/').replace(/\//g, '\\');
    }

    if (inputPath.startsWith('/mnt/')) {
        const match = inputPath.match(/^\/mnt\/([a-z])(\/.*)/i);
        if (match) {
            return `${match[1].toUpperCase()}:${match[2].replace(/\//g, '\\')}`;
        }

        throw new Error(`The path '${inputPath}' is a virtual file system path and cannot be accessed by the MCP server on Windows. Please read the file content yourself and retry the request using the 'file_content' (or 'files_content') argument with Base64 encoded data.`);
    }

    return inputPath;
}

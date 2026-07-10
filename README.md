# @aigiglab-org/mcp-server

The official Model Context Protocol (MCP) server for **AIGigLab**. 

This server allows AI assistants (like Claude, Cursor, and others) to natively interact with the AIGigLab API, giving them powerful capabilities to:
- Generate Leads (Google Places)
- Manage LinkedIn Automation
- Clone Voices & Generate TTS (ElevenLabs & FishAudio)
- Generate Visual Assets & Thumbnails

## 🚀 Getting Started

### Prerequisites
You need an **AIGigLab API Key**. You can obtain one by signing up at [aigiglab.com](https://aigiglab.com).

### Installation via Cursor
To connect this MCP server to your Cursor IDE:
1. Open Cursor Settings -> Features -> MCP
2. Click **+ Add new MCP server**
3. Configure it as follows:
   - **Type:** `command`
   - **Name:** `AIGigLab`
   - **Command:** `npx -y @aigiglab-org/mcp-server`
   - **Environment Variables:**
     - Name: `AIGIGLAB_API_KEY`, Value: `YOUR_API_KEY_HERE`

### Installation via Claude Desktop
Add the following configuration to your Claude Desktop `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "aigiglab": {
      "command": "npx",
      "args": [
        "-y",
        "@aigiglab-org/mcp-server"
      ],
      "env": {
        "AIGIGLAB_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

## 🛠️ Usage
Once installed, your AI assistant will automatically discover the tools and use them when you ask it to perform tasks like:
- *"Scrape leads for coffee shops in London."*
- *"Trigger my latest LinkedIn post."*
- *"Clone this voice and generate a greeting audio."*

## 📄 License
This project is licensed under the MIT License.

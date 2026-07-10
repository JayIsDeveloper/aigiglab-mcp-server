# @aigiglab-org/mcp-server

The official Model Context Protocol (MCP) server for **AIGigLab**. 

This server allows AI assistants (like Claude, Cursor, and others) to natively interact with the AIGigLab API, giving them powerful capabilities to automate LinkedIn, generate B2B leads, synthesize AI voices, compose music, and create visual thumbnails.

## 🚀 Getting Started

### Prerequisites
You need an **AIGigLab API Key**. 
1. Sign up or log in at [aigiglab.com](https://aigiglab.com).
2. Grab your API Key from the developer dashboard here: [https://aigiglab.com/developers/api-keys](https://aigiglab.com/developers/api-keys).

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

## 🛠️ Features & Use Cases

Once installed, your AI assistant will automatically discover the tools and use them when you ask it to perform tasks.

### 👔 LinkedIn Automation
- **View Configuration:** `get_linkedin_config` to see the current automation schedules, topics, and tone.
- **Update Strategy:** `update_linkedin_config` to change how often you post, target audience, and posting topics.
- **Instant Posting:** `trigger_linkedin_post_now` to force the AI to instantly generate and publish a post.
- **View History:** `get_linkedin_post_history` to retrieve recent posts made to your profile or pages.
- **Manage Pages:** `get_linkedin_pages` and `set_linkedin_post_target` to switch between automating your personal profile vs. your company pages.

*Example prompt:* "Update my LinkedIn config to post 3 times a week about AI Automation, and then trigger a post right now."

### 🎯 Lead Generation (Google Maps)
- **Start Scraping:** `scrape_leads` allows the AI to search for businesses in specific regions (e.g., "coffee shops in London").
- **Track Campaigns:** `get_campaign_status` and `list_lead_campaigns` to monitor the scraping progress.
- **Retrieve Data:** `get_leads_by_batch` to fetch the finalized leads (emails, phone numbers, websites, and ratings).

*Example prompt:* "Start a lead generation campaign for dental clinics in New York, tell me when it's done, and get the results."

### 🎙️ AI Voice Cloning & Synthesis (ElevenLabs & FishAudio)
- **Voice Discovery:** `elevenlabs_get_voices` and `fish_list_models` to browse available high-quality voices.
- **Voice Cloning:** `elevenlabs_create_voice` and `fish_create_model` to clone a custom voice from an audio sample.
- **Speech Generation:** `elevenlabs_generate_speech` and `fish_synthesize_voice` to turn text into highly realistic spoken audio.
- **Audio History:** `elevenlabs_get_history` to redownload past generations.

*Example prompt:* "Use my cloned voice to generate a welcome greeting for my new podcast episode."

### 🎵 Music Composition
- **Composition Plans:** `create_composition_plan` to architect the structure and lyrics for an AI music track.
- **Render Music:** `compose_music` to transform your plan (or a direct prompt) into a fully rendered MP3 song.

*Example prompt:* "Create a composition plan for an upbeat synthwave track with a driving bassline, and then compose the music."

### 🖼️ Thumbnails & Assets
- **Asset Storage:** `upload_asset` and `list_assets` to manage logos, references, and audio files on your AIGigLab account.
- **Thumbnail Generation:** `generate_thumbnail` and `get_thumbnail_history` to design stunning, high-retention YouTube thumbnails from a prompt or reference image.

*Example prompt:* "Generate a YouTube thumbnail for my video about learning AI in 10 minutes, using a curiosity-driven concept."

## 📄 License
This project is licensed under the MIT License.

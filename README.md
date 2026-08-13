# 🤖 AI Cloner Discord Bot

### Zenix Development — Server Backup, Restore & AI Builder

A powerful **Discord.js v14 server management bot** focused on server backups, restoration, cloning, and AI-powered server building.

> **Version:** `2.0.0`
> **Runtime:** Node.js
> **Library:** Discord.js v14
> **AI:** Groq
> **Default Prefix:** `ux`

---

## ✨ Features

### 📦 Server Backups

Create a complete JSON backup of your Discord server.

Backups can include:

* 🎭 Roles and permission bits
* 📁 Categories
* 💬 Text channels
* 🔊 Voice channels
* 🎙️ Stage channels
* 💬 Forum channels
* 🔐 Channel permission overwrites
* 😀 Emojis
* 🏷️ Stickers
* ⚙️ Server settings
* 🖼️ Server icon and banner

Backups are stored locally inside the configured backup directory.

---

### 🔄 Server Restore

Restore a previously created backup using its unique backup ID.

The restore system rebuilds supported server resources from the saved backup data.

---

### 🔁 Server Cloning

Clone a server's structure into another server.

The bot can transfer supported:

* Roles
* Permissions
* Categories
* Channels
* Emojis
* Server configuration

The bot must be present in **both the source and destination servers**.

> ⚠️ Cloning can modify or remove existing resources in the destination server. Always create a backup before cloning.

---

### 🧠 AI Server Builder

The `build` command uses **Groq AI** to generate a complete Discord server design.

The AI asks a series of questions about:

1. Server name
2. Server purpose
3. Target audience
4. Theme / vibe
5. Desired features
6. Approximate channel count
7. Extra requirements

Groq then generates a structured JSON server design containing things such as:

* Server name
* Description
* Roles
* Role colors
* Categories
* Channels
* Channel topics
* Slowmode
* NSFW settings
* Rules
* Welcome message
* Boost perks
* Suggested bots

The generated structure is then used to build the server.

---

## 🎮 Commands

The default prefix is `ux`.

| Command               | Alias  | Description                                  |
| --------------------- | ------ | -------------------------------------------- |
| `uxhelp`              | —      | Display the bot help menu                    |
| `uxping`              | —      | Check bot latency/status                     |
| `uxbackup`            | `uxbk` | Create a server backup                       |
| `uxbackups`           | —      | View available backups                       |
| `uxbackupinfo <id>`   | —      | View information about a backup              |
| `uxrestore <id>`      | —      | Restore a server backup                      |
| `uxdeletebackup <id>` | —      | Delete a backup                              |
| `uxclone <serverID>`  | `uxcl` | Clone another server into the current server |
| `uxbuild`             | —      | Generate and build a server using AI         |
| `uxcredits`           | —      | Display project credits                      |

All commands currently require **Administrator** permission.

---

## 📁 Project Structure

```text
AI-Cloner-Discord-Bot/
│
├── src/
│   ├── commands/
│   │   ├── backup.js
│   │   ├── backupinfo.js
│   │   ├── backups.js
│   │   ├── build.js
│   │   ├── clone.js
│   │   ├── credits.js
│   │   ├── deletebackup.js
│   │   ├── help.js
│   │   ├── ping.js
│   │   └── restore.js
│   │
│   ├── utils/
│   │   ├── components.js
│   │   └── serializer.js
│   │
│   └── index.js
│
├── package.json
├── package-lock.json
└── backups/
```

---

## 🛠️ Requirements

Before running the bot, install:

* **Node.js**
* A **Discord Bot Token**
* A **Groq API Key** for the AI builder

The project uses:

```text
discord.js
dotenv
axios
groq-sdk
nodemon
```

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/Zyfanity/AI-Cloner-Discord-Bot.git
cd AI-Cloner-Discord-Bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env`

Create a file named:

```text
.env
```

Example:

```env
BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
GROQ_API_KEY=YOUR_GROQ_API_KEY
PREFIX=ux
BACKUP_DIR=./backups
```

### 4. Start the bot

Production:

```bash
npm start
```

Development:

```bash
npm run dev
```

---

## 🔐 Discord Permissions

The bot requires sufficient permissions to manage the resources it is backing up, restoring, cloning, or creating.

Depending on the operation, this can include:

```text
Manage Channels
Manage Roles
Manage Emojis and Stickers
Manage Guild
View Channels
Send Messages
Read Message History
```

The bot also checks that the user running commands has the **Administrator** permission.

---

## 💾 Backup System

When `uxbackup` is executed, the bot creates a JSON backup of the supported server configuration.

Backups are stored using the configured backup directory:

```text
backups/<backup-id>.json
```

The backup system records information such as:

* Backup ID
* Creation date
* File size
* Number of roles
* Number of categories
* Number of channels
* Number of emojis
* Number of stickers

---

## 🧠 AI Builder

The AI builder uses Groq to generate a structured Discord server configuration based on the user's requirements.

The generated configuration can contain:

```json
{
  "serverName": "My Community",
  "description": "A friendly community server.",
  "roles": [],
  "categories": [],
  "rules": [],
  "welcomeMessage": "",
  "boostPerks": [],
  "suggestedBots": []
}
```

The configuration is then processed by the bot to build the requested server structure.

---

## ⚠️ Important

This bot performs **server-management operations** that can modify existing Discord resources.

Always:

* Create a backup before major operations.
* Test the bot in a test server first.
* Only use the bot on servers you own or have permission to manage.
* Keep your Discord bot token private.
* Keep your Groq API key private.
* Never commit `.env` to GitHub.

---

## 🔒 Security

Never expose:

```env
BOT_TOKEN=
GROQ_API_KEY=
```

If your Discord bot token is leaked, reset it immediately through the Discord Developer Portal.

If your Groq API key is leaked, revoke or rotate it immediately.

Add the following to `.gitignore`:

```gitignore
.env
node_modules/
backups/
```

---

## 🗺️ Roadmap

* [ ] Web dashboard
* [ ] Scheduled automatic backups
* [ ] Cloud backup storage
* [ ] Backup encryption
* [ ] Backup import/export
* [ ] Selective channel restoration
* [ ] Selective role restoration
* [ ] Improved clone progress tracking
* [ ] More AI customization options
* [ ] Multiple AI providers
* [ ] Backup comparison
* [ ] Automatic backup rotation
* [ ] Improved permission handling
* [ ] Database-backed backup management

---

## 🤝 Contributing

Contributions and improvements are welcome.

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Test the bot.
5. Commit your changes.
6. Open a pull request.

Please do not commit secrets, `.env` files, `node_modules`, or generated backups.

---

## 📜 License

No license is currently specified in the repository.

If you want others to legally reuse, modify, and redistribute the project, consider adding a license such as MIT.

---

## ⭐ Credits

### Zenix Development

Built with:

* Discord.js
* Node.js
* Groq
* JavaScript

If you like the project, consider giving the repository a ⭐.

---

# 🤖 Zenix Development

**Backup. Restore. Clone. Build with AI.**

**AI Cloner Discord Bot — v2.0.0**

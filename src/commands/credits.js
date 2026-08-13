const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

module.exports = {
  name: 'credits',
  aliases: ['about', 'info'],
  description: 'Bot credits and support info',

  async execute(message) {
    return message.reply(
      msgV2(
        container(COLOR.brand,
          textDisplay(
            `### 💎  Umbrax Development\n` +
            `*Server Backup & Cloner Bot*`
          ),
          separator(),
          textDisplay(
            `**Developer**  Umbrax Development\n` +
            `**Version**  \`2.0.0\`\n` +
            `**Library**  discord.js v14\n` +
            `**UI Format**  Components V2\n` +
            `**Prefix**  \`${process.env.PREFIX || 'ux'}\``
          ),
          separator(),
          textDisplay(
            `**Features**\n` +
            `> 📦 Full server backups stored as JSON files\n` +
            `> ♻️ One-command restore with progress tracking\n` +
            `> 🔁 Server cloner (roles, channels, emojis, perms)\n` +
            `> 🎭 Permission overwrites preserved on restore/clone\n` +
            `> 😀 Emoji & sticker images embedded in backup\n` +
            `> 🖼️ Server icon, banner & splash backed up`
          ),
          separator(),
          textDisplay(
            `**Support**\n` +
            `> Join our server: [discord.gg/y74cue9txv](https://discord.gg/y74cue9txv)`
          ),
          separator(),
          actionRow(
            button('Support Server', null, 5, '🔗', 'https://discord.gg/y74cue9txv'),
          ),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      )
    );
  },
};
const fs   = require('fs');
const path = require('path');
const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

module.exports = {
  name: 'backupinfo',
  aliases: ['bkinfo', 'binfo'],
  description: 'Show details of a specific backup',

  async execute(message, args, _client, BACKUP_DIR) {
    const id = args[0];
    if (!id) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay('### ❌  Missing ID\n`uxbackupinfo <backupID>`'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const filePath = path.join(BACKUP_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay(`### ❌  Not Found\nNo backup with ID \`${id}\`.`),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const d  = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const s  = d.stats;
    const ts = Math.floor(d.createdAt / 1000);
    const kb = (fs.statSync(filePath).size / 1024).toFixed(1);

    return message.reply(
      msgV2(
        container(COLOR.brand,
          textDisplay(`### 📦  Backup Info — \`${d.id}\``),
          separator(),
          textDisplay(
            `**Server Name** ${d.name}\n` +
            `**Source Guild** \`${d.sourceGuildId}\`\n` +
            `**Created** <t:${ts}:F> (<t:${ts}:R>)\n` +
            `**File Size** \`${kb} KB\`\n` +
            `**Has Icon** ${d.iconBase64 ? '✅' : '❌'}  **Has Banner** ${d.bannerBase64 ? '✅' : '❌'}  **Has Splash** ${d.splashBase64 ? '✅' : '❌'}`
          ),
          separator(),
          textDisplay(
            `**Contents**\n` +
            `> 🎭 \`${s.roles}\` roles\n` +
            `> 📁 \`${s.categories}\` categories\n` +
            `> 💬 \`${s.text}\` text channels\n` +
            `> 🔊 \`${s.voice}\` voice channels\n` +
            `> 🎙️ \`${s.stage}\` stage channels\n` +
            `> 📋 \`${s.forum}\` forum channels\n` +
            `> 😀 \`${s.emojis}\` emojis\n` +
            `> 🖼️ \`${s.stickers}\` stickers`
          ),
          separator(),
          textDisplay(`📌 **Restore with:** \`uxrestore ${d.id}\``),
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
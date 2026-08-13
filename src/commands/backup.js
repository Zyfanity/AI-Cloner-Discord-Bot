const fs   = require('fs');
const path = require('path');
const { ComponentType } = require('discord.js');
const { serializeGuild } = require('../utils/serializer');
const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT, supportRow,
} = require('../utils/components');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  name: 'backup',
  aliases: ['bk'],
  description: 'Create a full backup of this server',

  async execute(message, _args, _client, BACKUP_DIR) {
    const guild = message.guild;

    const prompt = await message.reply(
      msgV2(
        container(COLOR.warn,
          textDisplay(
            `### 📦  Create Server Backup\n` +
            `You are about to back up **${guild.name}**.\n\n` +
            `This will capture:\n` +
            `> 🎭 Roles & permission bits\n` +
            `> 📁 Every channel + permission overwrites\n` +
            `> 😀 All emojis & stickers (images embedded)\n` +
            `> ⚙️ Server settings, icon & banner\n\n` +
            `*This may take 30–90 seconds depending on server size.*`
          ),
          separator(),
          actionRow(
            button('Start Backup', 'bk_yes', 3, '✅'),
            button('Cancel',       'bk_no',  2, '✖️'),
          ),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      )
    );

    const col = prompt.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 30_000, max: 1,
    });

    col.on('collect', async (i) => {
      await i.deferUpdate();

      if (i.customId === 'bk_no') {
        return prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ✖️  Backup Cancelled\nNo backup was created.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        );
      }

      let step = 'Initializing...';
      const setStep = (s) => { step = s; };

      const refreshProgress = async () => {
        await prompt.edit(
          msgV2(container(COLOR.brand,
            textDisplay(`### ⏳  Backup In Progress\n\`${step}\``),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      };

      const ticker = setInterval(refreshProgress, 5000);
      await refreshProgress();

      try {
        const data = await serializeGuild(guild, (s) => { step = s; });
        clearInterval(ticker);

        const filePath = path.join(BACKUP_DIR, `${data.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        const fileSizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);

        const s = data.stats;
        const ts = Math.floor(data.createdAt / 1000);

        await prompt.edit(
          msgV2(
            container(COLOR.success,
              textDisplay(
                `### ✅  Backup Complete\n` +
                `**${guild.name}** has been fully backed up.`
              ),
              separator(),
              textDisplay(
                `**🆔 Backup ID** \`${data.id}\`\n` +
                `**📅 Created** <t:${ts}:F> (<t:${ts}:R>)\n` +
                `**🗂️ File Size** \`${fileSizeKB} KB\``
              ),
              separator(),
              textDisplay(
                `**Stats**\n` +
                `> 🎭 \`${s.roles}\` roles\n` +
                `> 📁 \`${s.categories}\` categories • \`${s.text}\` text • \`${s.voice}\` voice • \`${s.stage}\` stage • \`${s.forum}\` forums\n` +
                `> 😀 \`${s.emojis}\` emojis • \`${s.stickers}\` stickers`
              ),
              separator(),
              textDisplay(`📌 **To restore:** \`uxrestore ${data.id}\``),
              separator(),
              actionRow(
                button('Support Server', null, 5, '🔗', 'https://discord.gg/y74cue9txv'),
              ),
              separator(),
              textDisplay(`-# ${FOOTER_TEXT}`),
            )
          )
        );

      } catch (err) {
        clearInterval(ticker);
        console.error('[backup]', err);
        await prompt.edit(
          msgV2(container(COLOR.error,
            textDisplay(`### ❌  Backup Failed\n\`\`\`${err.message}\`\`\``),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        );
      }
    });

    col.on('end', (collected) => {
      if (!collected.size) {
        prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ⏱️  Timed Out\nBackup confirmation expired.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      }
    });
  },
};
const fs   = require('fs');
const path = require('path');
const { ComponentType } = require('discord.js');
const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

module.exports = {
  name: 'backups',
  aliases: ['bklist', 'listbackups'],
  description: 'List all saved backups',

  async execute(message, _args, _client, BACKUP_DIR) {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));

    if (!files.length) {
      return message.reply(
        msgV2(container(COLOR.muted,
          textDisplay('### 📂  No Backups Found\nYou have no saved backups yet.\nUse `uxbackup` to create one.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const PAGE_SIZE = 8;
    let page = 0;

    const backups = files.map(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
        return d;
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);

    const totalPages = Math.ceil(backups.length / PAGE_SIZE);

    function buildPage(p) {
      const slice = backups.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
      const lines = slice.map((d, idx) => {
        const ts = Math.floor(d.createdAt / 1000);
        const s  = d.stats;
        return (
          `**${p * PAGE_SIZE + idx + 1}.** \`${d.id}\` — **${d.name}**\n` +
          `-# <t:${ts}:R>  •  🎭 ${s.roles}  📁 ${s.channels}  😀 ${s.emojis}`
        );
      }).join('\n\n');

      const row = [];
      if (totalPages > 1) {
        row.push(button('◀ Prev', 'bk_prev', 2, null, null));
        row.push(button(`${p + 1}/${totalPages}`, 'bk_page', 2, null, null));
        row.push(button('Next ▶', 'bk_next', 2, null, null));
      }

      const components = [
        container(COLOR.brand,
          textDisplay(`### 📦  Saved Backups  (${backups.length} total)\n${lines}`),
          separator(),
          ...(row.length ? [actionRow(...row), separator()] : []),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      ];

      return msgV2(...components);
    }

    const msg = await message.reply(buildPage(0));
    if (totalPages <= 1) return;

    const col = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 60_000,
    });

    col.on('collect', async (i) => {
      await i.deferUpdate();
      if (i.customId === 'bk_prev') page = Math.max(0, page - 1);
      if (i.customId === 'bk_next') page = Math.min(totalPages - 1, page + 1);
      await msg.edit(buildPage(page)).catch(() => {});
    });

    col.on('end', () => {
      msg.edit(buildPage(page)).catch(() => {});
    });
  },
};
const fs   = require('fs');
const path = require('path');
const { ComponentType } = require('discord.js');
const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

module.exports = {
  name: 'deletebackup',
  aliases: ['delbk', 'removebk'],
  description: 'Delete a saved backup file',

  async execute(message, args, _client, BACKUP_DIR) {
    const id = args[0];
    if (!id) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay('### ❌  Missing ID\n`uxdeletebackup <backupID>`'),
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
    const ts = Math.floor(d.createdAt / 1000);

    const prompt = await message.reply(
      msgV2(
        container(COLOR.warn,
          textDisplay(
            `### 🗑️  Delete Backup?\n` +
            `**\`${id}\`** — ${d.name}  (<t:${ts}:R>)\n\n` +
            `This backup file will be permanently deleted.`
          ),
          separator(),
          actionRow(
            button('Delete', 'del_yes', 4, '🗑️'),
            button('Cancel', 'del_no',  2, '✖️'),
          ),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      )
    );

    const col = prompt.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 20_000, max: 1,
    });

    col.on('collect', async (i) => {
      await i.deferUpdate();
      if (i.customId === 'del_no') {
        return prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ✖️  Cancelled\nBackup was not deleted.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        );
      }
      fs.unlinkSync(filePath);
      return prompt.edit(
        msgV2(container(COLOR.success,
          textDisplay(`### ✅  Backup Deleted\nBackup \`${id}\` (${d.name}) has been removed.`),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    });

    col.on('end', (c) => {
      if (!c.size) {
        prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ⏱️  Timed Out\nDeletion cancelled.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      }
    });
  },
};
const { ComponentType } = require('discord.js');
const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

const PREFIX = process.env.PREFIX || 'ux';

const PAGES = [
  {
    label: '🏠 Overview',
    content: () =>
      `### 🤖  Zenix Development — Help\n` +
      `Full server backup, restore & cloner bot.\n` +
      `Prefix: \`${PREFIX}\`\n\n` +
      `**Categories**\n` +
      `> 📦  Backup commands\n` +
      `> ♻️  Restore & Clone commands\n` +
      `> ⚙️  Utility commands\n` +
      `> 💎  Credits & Support\n\n` +
      `*Use the buttons below to navigate.*`,
  },
  {
    label: '📦 Backup',
    content: () =>
      `### 📦  Backup Commands\n\n` +
      `**\`${PREFIX}backup\`**\n` +
      `> Creates a full backup of the current server.\n` +
      `> Captures roles, channels, permissions, emojis, stickers, icon & banner.\n\n` +
      `**\`${PREFIX}backups\`**\n` +
      `> Lists all saved backup files (paginated).\n\n` +
      `**\`${PREFIX}backupinfo <id>\`**\n` +
      `> Shows detailed info about a specific backup.\n\n` +
      `**\`${PREFIX}deletebackup <id>\`**\n` +
      `> Permanently deletes a backup file.\n\n` +
      `-# All commands require **Administrator** permission.`,
  },
  {
    label: '♻️ Restore',
    content: () =>
      `### ♻️  Restore & Clone Commands\n\n` +
      `**\`${PREFIX}restore <backupID>\`**\n` +
      `> Restores a saved backup onto the current server.\n` +
      `> ⚠️ Wipes all existing roles, channels & emojis first.\n\n` +
      `**\`${PREFIX}clone <serverID>\`**\n` +
      `> Clones another server (bot must be in it) into this one.\n` +
      `> Clones roles, channels, overwrites, emojis, settings, icon & banner.\n` +
      `> ⚠️ Wipes all existing data in the target server first.\n\n` +
      `-# Both commands have a confirmation prompt before executing.`,
  },
  {
    label: '⚙️ Utility',
    content: () =>
      `### ⚙️  Utility Commands\n\n` +
      `**\`${PREFIX}help\`**\n` +
      `> Shows this help menu.\n\n` +
      `**\`${PREFIX}credits\`**\n` +
      `> Shows bot credits & support info.\n\n` +
      `**\`${PREFIX}ping\`**\n` +
      `> Shows bot latency.\n\n` +
      `-# Prefix: \`${PREFIX}\`  |  All admin-only.`,
  },
  {
    label: '💎 Credits',
    content: () =>
      `### 💎  Credits & Info\n\n` +
      `**Bot:** Zenix Backup & Cloner\n` +
      `**Developer:** Zenix Development\n` +
      `**Version:** 2.0.0\n` +
      `**Library:** discord.js v14\n` +
      `**UI:** Components V2\n\n` +
      `**Support Server**\n` +
      `> Join us at [dsc.gg/zenix](https://dsc.gg/zenix)\n\n` +
      `-# © 2026 Zenix Development. All rights reserved.`,
  },
];

function buildPage(p) {
  return msgV2(
    container(COLOR.brand,
      textDisplay(PAGES[p].content()),
      separator(),
      actionRow(
        ...PAGES.map((pg, idx) =>
          button(pg.label, `help_tab_${idx}`, idx === p ? 1 : 2)
        ),
      ),
      actionRow(
        button('◀  Prev', 'help_prev', 2),
        button('Next  ▶', 'help_next', 2),
      ),
      separator(),
      actionRow(
        button('Support Server', null, 5, '🔗', 'https://dsc.gg/zenix'),
      ),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
    )
  );
}

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'Shows the help menu',

  async execute(message) {
    let page = 0;
    const msg = await message.reply(buildPage(page));

    const col = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 120_000,
    });

    col.on('collect', async (i) => {
      await i.deferUpdate();
      if (i.customId === 'help_prev') page = (page - 1 + PAGES.length) % PAGES.length;
      else if (i.customId === 'help_next') page = (page + 1) % PAGES.length;
      else if (i.customId.startsWith('help_tab_')) page = parseInt(i.customId.split('_')[2]);
      await msg.edit(buildPage(page)).catch(() => {});
    });
  },
};

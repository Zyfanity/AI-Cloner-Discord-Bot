const fs   = require('fs');
const path = require('path');
const { ComponentType, ChannelType } = require('discord.js');
const {
  msgV2, container, textDisplay, separator, actionRow,
  button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

const CREATABLE = new Set([0, 2, 4, 5, 13, 15]);
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildOverwrites(overwrites, roleIdMap, guild) {
  return overwrites.map(o => {
    const id = roleIdMap.get(o.id)?.id || (o.id === guild.id ? guild.roles.everyone.id : null);
    if (!id) return null;
    return { id, type: o.type, allow: BigInt(o.allow), deny: BigInt(o.deny) };
  }).filter(Boolean);
}

module.exports = {
  name: 'restore',
  aliases: ['rs'],
  description: 'Restore a server backup',

  async execute(message, args, client, BACKUP_DIR) {
    const guild    = message.guild;
    const backupId = args[0];

    if (!backupId) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay('### ❌  Missing Backup ID\n`uxrestore <backupID>` — use `uxbackups` to list saved backups.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const filePath = path.join(BACKUP_DIR, `${backupId}.json`);
    if (!fs.existsSync(filePath)) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay(`### ❌  Backup Not Found\nNo backup with ID \`${backupId}\` exists.\nUse \`uxbackups\` to list available backups.`),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const s    = data.stats;
    const ts   = Math.floor(data.createdAt / 1000);

    const prompt = await message.reply(
      msgV2(
        container(COLOR.warn,
          textDisplay(
            `### ⚠️  Confirm Server Restore\n` +
            `Restoring backup \`${backupId}\` onto **${guild.name}**.\n\n` +
            `**Backup info:**\n` +
            `> 📛 Name: **${data.name}**\n` +
            `> 📅 Created: <t:${ts}:R>\n` +
            `> 🎭 \`${s.roles}\` roles • 📁 \`${s.channels}\` channels • 😀 \`${s.emojis}\` emojis`
          ),
          separator(),
          textDisplay(
            `**This will permanently:**\n` +
            `> 🗑️ Delete ALL existing roles (except managed & @everyone)\n` +
            `> 🗑️ Delete ALL existing channels\n` +
            `> 🗑️ Delete ALL existing emojis\n` +
            `> ✨ Recreate everything from the backup\n\n` +
            `⚠️ **This cannot be undone.**`
          ),
          separator(),
          actionRow(
            button('Restore Now', 'rs_yes', 4, '♻️'),
            button('Cancel',      'rs_no',  2, '✖️'),
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

      if (i.customId === 'rs_no') {
        return prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ✖️  Restore Cancelled\nNo changes were made.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        );
      }

      const setStep = async (step) => {
        await prompt.edit(
          msgV2(container(COLOR.brand,
            textDisplay(`### ♻️  Restoring...\n${step}`),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      };

      try {
        await setStep('`[1/6]` Applying server settings...');
        const sp = {
          name: data.name,
          verificationLevel: data.verificationLevel,
          defaultMessageNotifications: data.defaultMessageNotifications,
          explicitContentFilter: data.explicitContentFilter,
          preferredLocale: data.preferredLocale,
          premiumProgressBarEnabled: data.premiumProgressBarEnabled,
        };
        if (data.iconBase64)   sp.icon   = data.iconBase64;
        if (data.bannerBase64) sp.banner = data.bannerBase64;
        if (data.splashBase64) sp.splash = data.splashBase64;
        await guild.edit(sp).catch(() => {});

        await setStep('`[2/6]` Removing existing roles...');
        const botRoleId = guild.roles.botRoleFor(client.user)?.id;
        const delRoles  = guild.roles.cache.filter(r => !r.managed && r.id !== guild.id && r.id !== botRoleId);
        for (const [, r] of delRoles) { await r.delete('Restore').catch(() => {}); await sleep(350); }

        await setStep('`[3/6]` Creating roles...');
        const roleMap = new Map();
        await guild.roles.everyone.setPermissions(BigInt(data.everyonePermissions)).catch(() => {});
        const sortedRoles = [...data.roles]
          .filter(r => !r.isEveryone && !r.managed)
          .sort((a, b) => b.position - a.position);

        for (const rd of sortedRoles) {
          try {
            const created = await guild.roles.create({
              name: rd.name, color: rd.color || null,
              hoist: rd.hoist, mentionable: rd.mentionable,
              permissions: BigInt(rd.permissions),
              reason: `Umbrax restore ${backupId}`,
            });
            roleMap.set(rd.id, created);
            await sleep(350);
          } catch {}
        }

        await setStep('`[4/6]` Clearing existing channels...');
        await guild.channels.fetch();
        for (const [, ch] of guild.channels.cache) { await ch.delete('Restore').catch(() => {}); await sleep(250); }

        await setStep('`[5/6]` Creating channels...');
        const chanMap = new Map();

        const cats = data.channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
        for (const cat of cats) {
          try {
            const ow = buildOverwrites(cat.permissionOverwrites, roleMap, guild);
            const created = await guild.channels.create({
              name: cat.name, type: ChannelType.GuildCategory,
              position: cat.position, permissionOverwrites: ow,
              reason: `Umbrax restore`,
            });
            chanMap.set(cat.id, created);
            await sleep(300);
          } catch {}
        }

        const others = data.channels.filter(c => c.type !== 4).sort((a, b) => a.position - b.position);
        for (const ch of others) {
          if (!CREATABLE.has(ch.type)) continue;
          try {
            const parent = ch.parentId ? chanMap.get(ch.parentId) : null;
            const ow     = buildOverwrites(ch.permissionOverwrites, roleMap, guild);
            const opts   = {
              name: ch.name, type: ch.type, position: ch.position,
              permissionOverwrites: ow, reason: 'Umbrax restore',
            };
            if (parent) opts.parent = parent;
            if (ch.topic)               opts.topic               = ch.topic;
            if (ch.nsfw)                opts.nsfw                = ch.nsfw;
            if (ch.rateLimitPerUser)    opts.rateLimitPerUser    = ch.rateLimitPerUser;
            if (ch.defaultAutoArchiveDuration) opts.defaultAutoArchiveDuration = ch.defaultAutoArchiveDuration;
            if (ch.type === 2 || ch.type === 13) {
              if (ch.bitrate)   opts.bitrate   = Math.min(ch.bitrate, guild.maximumBitrate);
              if (ch.userLimit) opts.userLimit = ch.userLimit;
              if (ch.rtcRegion !== null && ch.rtcRegion !== undefined) opts.rtcRegion = ch.rtcRegion;
            }
            const created = await guild.channels.create(opts);
            chanMap.set(ch.id, created);
            await sleep(300);
          } catch {}
        }

        await guild.edit({
          afkChannel:   data.afkChannelId    ? chanMap.get(data.afkChannelId)    || null : null,
          afkTimeout:   data.afkTimeout,
          systemChannel: data.systemChannelId ? chanMap.get(data.systemChannelId) || null : null,
        }).catch(() => {});

        await setStep('`[6/6]` Restoring emojis...');
        await guild.emojis.fetch();
        for (const [, e] of guild.emojis.cache) { await e.delete('Restore').catch(() => {}); }
        for (const em of data.emojis) {
          const src = em.base64 || em.url;
          if (!src) continue;
          await guild.emojis.create({ attachment: src, name: em.name, reason: `Umbrax restore` }).catch(() => {});
          await sleep(500);
        }

        await prompt.edit(
          msgV2(
            container(COLOR.success,
              textDisplay(
                `### ✅  Restore Complete\n` +
                `**${data.name}** has been fully restored from backup \`${backupId}\`.`
              ),
              separator(),
              textDisplay(
                `> 🎭 \`${roleMap.size}\` roles restored\n` +
                `> 📁 \`${chanMap.size}\` channels restored\n` +
                `> 😀 \`${data.emojis.length}\` emojis restored`
              ),
              separator(),
              actionRow(button('Support Server', null, 5, '🔗', 'https://discord.gg/y74cue9txv')),
              separator(),
              textDisplay(`-# ${FOOTER_TEXT}`),
            )
          )
        ).catch(() => {});

      } catch (err) {
        console.error('[restore]', err);
        await prompt.edit(
          msgV2(container(COLOR.error,
            textDisplay(`### ❌  Restore Failed\n\`\`\`${err.message}\`\`\``),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      }
    });

    col.on('end', (c) => {
      if (!c.size) {
        prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ⏱️  Timed Out\nRestore confirmation expired.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      }
    });
  },
};
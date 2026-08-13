const { ComponentType, ChannelType } = require('discord.js');
const { serializeGuild } = require('../utils/serializer');
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
  name: 'clone',
  aliases: ['cl'],
  description: 'Clone another server into this one',

  async execute(message, args, client, BACKUP_DIR) {
    const sourceId    = args[0];
    const targetGuild = message.guild;

    if (!sourceId) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay('### ❌  Missing Server ID\n`uxclone <serverID>` — the bot must be in both servers.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    if (sourceId === targetGuild.id) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay('### ❌  Same Server\nYou cannot clone a server into itself.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const sourceGuild = client.guilds.cache.get(sourceId);
    if (!sourceGuild) {
      return message.reply(
        msgV2(container(COLOR.error,
          textDisplay(`### ❌  Server Not Found\nBot is not in server \`${sourceId}\`.\nInvite the bot to the source server first.`),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        ))
      );
    }

    const prompt = await message.reply(
      msgV2(
        container(COLOR.warn,
          textDisplay(
            `### 🔁  Confirm Server Clone\n` +
            `Cloning **${sourceGuild.name}** → **${targetGuild.name}**\n\n` +
            `**This will permanently:**\n` +
            `> 🗑️ Wipe all roles, channels & emojis in **${targetGuild.name}**\n` +
            `> ✨ Clone everything from **${sourceGuild.name}**\n` +
            `> ‣ Roles, permissions, channels, overwrites, emojis, settings, icon & banner\n\n` +
            `⚠️ **This cannot be undone.**`
          ),
          separator(),
          textDisplay(
            `**Source:** \`${sourceGuild.name}\` (\`${sourceGuild.id}\`)\n` +
            `**Target:** \`${targetGuild.name}\` (\`${targetGuild.id}\`)`
          ),
          separator(),
          actionRow(
            button('Clone Now', 'cl_yes', 4, '🔁'),
            button('Cancel',    'cl_no',  2, '✖️'),
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

      if (i.customId === 'cl_no') {
        return prompt.edit(
          msgV2(container(COLOR.muted,
            textDisplay('### ✖️  Clone Cancelled\nNo changes were made.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        );
      }

      const setStep = async (step) => {
        await prompt.edit(
          msgV2(container(COLOR.brand,
            textDisplay(`### 🔁  Cloning...\n${step}`),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      };

      try {
        await setStep('`[1/7]` Reading source server...');
        const data = await serializeGuild(sourceGuild, (s) => setStep(`\`[1/7]\` Reading: ${s}`));

        await setStep('`[2/7]` Applying server settings...');
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
        await targetGuild.edit(sp).catch(() => {});

        await setStep('`[3/7]` Removing existing roles...');
        const botRoleId = targetGuild.roles.botRoleFor(client.user)?.id;
        const delRoles  = targetGuild.roles.cache.filter(r => !r.managed && r.id !== targetGuild.id && r.id !== botRoleId);
        for (const [, r] of delRoles) { await r.delete('Clone').catch(() => {}); await sleep(350); }

        await setStep('`[4/7]` Creating roles...');
        const roleMap = new Map();
        await targetGuild.roles.everyone.setPermissions(BigInt(data.everyonePermissions)).catch(() => {});
        const sortedRoles = [...data.roles].filter(r => !r.isEveryone && !r.managed).sort((a, b) => b.position - a.position);
        for (const rd of sortedRoles) {
          try {
            const created = await targetGuild.roles.create({
              name: rd.name, color: rd.color || null,
              hoist: rd.hoist, mentionable: rd.mentionable,
              permissions: BigInt(rd.permissions),
              reason: `Umbrax clone from ${sourceId}`,
            });
            roleMap.set(rd.id, created);
            await sleep(350);
          } catch {}
        }

        await setStep('`[5/7]` Clearing existing channels...');
        await targetGuild.channels.fetch();
        for (const [, ch] of targetGuild.channels.cache) { await ch.delete('Clone').catch(() => {}); await sleep(250); }

        await setStep('`[6/7]` Creating channels...');
        const chanMap = new Map();

        const cats = data.channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
        for (const cat of cats) {
          try {
            const ow = buildOverwrites(cat.permissionOverwrites, roleMap, targetGuild);
            const created = await targetGuild.channels.create({
              name: cat.name, type: ChannelType.GuildCategory,
              position: cat.position, permissionOverwrites: ow, reason: 'Umbrax clone',
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
            const ow     = buildOverwrites(ch.permissionOverwrites, roleMap, targetGuild);
            const opts   = {
              name: ch.name, type: ch.type, position: ch.position,
              permissionOverwrites: ow, reason: 'Umbrax clone',
            };
            if (parent) opts.parent = parent;
            if (ch.topic)            opts.topic            = ch.topic;
            if (ch.nsfw)             opts.nsfw             = ch.nsfw;
            if (ch.rateLimitPerUser) opts.rateLimitPerUser = ch.rateLimitPerUser;
            if (ch.defaultAutoArchiveDuration) opts.defaultAutoArchiveDuration = ch.defaultAutoArchiveDuration;
            if (ch.type === 2 || ch.type === 13) {
              if (ch.bitrate)   opts.bitrate   = Math.min(ch.bitrate, targetGuild.maximumBitrate);
              if (ch.userLimit) opts.userLimit = ch.userLimit;
              if (ch.rtcRegion !== null && ch.rtcRegion !== undefined) opts.rtcRegion = ch.rtcRegion;
            }
            const created = await targetGuild.channels.create(opts);
            chanMap.set(ch.id, created);
            await sleep(300);
          } catch {}
        }

        await targetGuild.edit({
          afkChannel:    data.afkChannelId    ? chanMap.get(data.afkChannelId)    || null : null,
          afkTimeout:    data.afkTimeout,
          systemChannel: data.systemChannelId ? chanMap.get(data.systemChannelId) || null : null,
        }).catch(() => {});

        await setStep('`[7/7]` Cloning emojis...');
        await targetGuild.emojis.fetch();
        for (const [, e] of targetGuild.emojis.cache) { await e.delete('Clone').catch(() => {}); }
        for (const em of data.emojis) {
          const src = em.base64 || em.url;
          if (!src) continue;
          await targetGuild.emojis.create({ attachment: src, name: em.name, reason: 'Umbrax clone' }).catch(() => {});
          await sleep(500);
        }

        await prompt.edit(
          msgV2(
            container(COLOR.success,
              textDisplay(
                `### ✅  Clone Complete\n` +
                `**${sourceGuild.name}** has been fully cloned into **${targetGuild.name}**.`
              ),
              separator(),
              textDisplay(
                `> 🎭 \`${roleMap.size}\` roles cloned\n` +
                `> 📁 \`${chanMap.size}\` channels cloned\n` +
                `> 😀 \`${data.emojis.length}\` emojis cloned`
              ),
              separator(),
              actionRow(button('Support Server', null, 5, '🔗', 'https://discord.gg/y74cue9txv')),
              separator(),
              textDisplay(`-# ${FOOTER_TEXT}`),
            )
          )
        ).catch(() => {});

      } catch (err) {
        console.error('[clone]', err);
        await prompt.edit(
          msgV2(container(COLOR.error,
            textDisplay(`### ❌  Clone Failed\n\`\`\`${err.message}\`\`\``),
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
            textDisplay('### ⏱️  Timed Out\nClone confirmation expired.'),
            separator(),
            textDisplay(`-# ${FOOTER_TEXT}`),
          ))
        ).catch(() => {});
      }
    });
  },
};
const https = require('https');
const http  = require('http');

function downloadAsBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let mime = 'image/png';
        if (url.includes('.gif'))  mime = 'image/gif';
        if (url.includes('.webp')) mime = 'image/webp';
        if (url.includes('.jpg') || url.includes('.jpeg')) mime = 'image/jpeg';
        resolve(`data:${mime};base64,${buf.toString('base64')}`);
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

function genId() {
  return Math.random().toString(36).substring(2, 10);
}

async function serializeGuild(guild, onProgress) {
  const report = (s) => onProgress && onProgress(s);

  await guild.members.fetch().catch(() => {});
  await guild.channels.fetch().catch(() => {});
  await guild.roles.fetch().catch(() => {});
  await guild.emojis.fetch().catch(() => {});
  await guild.stickers.fetch().catch(() => {});

  report('Capturing roles...');
  const roles = guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .map(r => ({
      id: r.id,
      name: r.name,
      color: r.hexColor === '#000000' ? null : r.hexColor,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
      managed: r.managed,
      isEveryone: r.id === guild.id,
      iconURL: r.iconURL({ size: 64 }) || null,
    }));

  report('Capturing channels & permission overwrites...');
  const channels = [];
  const sorted = [...guild.channels.cache.values()].sort((a, b) => a.rawPosition - b.rawPosition);

  for (const ch of sorted) {
    const overwrites = ch.permissionOverwrites?.cache.map(o => ({
      id:    o.id,
      type:  o.type,
      allow: o.allow.bitfield.toString(),
      deny:  o.deny.bitfield.toString(),
    })) || [];

    channels.push({
      id: ch.id, name: ch.name, type: ch.type,
      position: ch.rawPosition,
      parentId: ch.parentId || null,
      permissionOverwrites: overwrites,
      nsfw: ch.nsfw || false,
      topic: ch.topic || null,
      bitrate: ch.bitrate || null,
      userLimit: ch.userLimit || null,
      rateLimitPerUser: ch.rateLimitPerUser || null,
      rtcRegion: ch.rtcRegion || null,
      defaultAutoArchiveDuration: ch.defaultAutoArchiveDuration || null,
    });
  }

  report('Capturing emojis (downloading images)...');
  const emojis = [];
  for (const [, e] of guild.emojis.cache) {
    const url = e.imageURL({ size: 128 });
    const base64 = await downloadAsBase64(url);
    emojis.push({
      id: e.id, name: e.name, animated: e.animated,
      url, base64,
      roles: e.roles?.cache.map(r => r.id) || [],
    });
  }

  report('Capturing stickers...');
  const stickers = [];
  for (const [, s] of guild.stickers.cache) {
    stickers.push({
      id: s.id, name: s.name,
      description: s.description || '',
      tags: s.tags || '', format: s.format, url: s.url,
    });
  }

  report('Downloading server assets...');
  const iconURL   = guild.iconURL({ size: 256, extension: 'png' });
  const bannerURL = guild.bannerURL?.({ size: 1024, extension: 'png' });
  const splashURL = guild.splashURL?.({ size: 1024, extension: 'png' });

  const [iconBase64, bannerBase64, splashBase64] = await Promise.all([
    downloadAsBase64(iconURL),
    downloadAsBase64(bannerURL),
    downloadAsBase64(splashURL),
  ]);

  return {
    id: genId(),
    name: guild.name,
    description: guild.description || null,
    createdAt: Date.now(),
    sourceGuildId: guild.id,
    iconURL, iconBase64,
    bannerURL: bannerURL || null, bannerBase64,
    splashURL: splashURL || null, splashBase64,
    verificationLevel: guild.verificationLevel,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    explicitContentFilter: guild.explicitContentFilter,
    afkTimeout: guild.afkTimeout,
    afkChannelId: guild.afkChannelId,
    systemChannelId: guild.systemChannelId,
    systemChannelFlags: guild.systemChannelFlags?.bitfield || 0,
    preferredLocale: guild.preferredLocale,
    premiumProgressBarEnabled: guild.premiumProgressBarEnabled,
    everyonePermissions: guild.roles.everyone.permissions.bitfield.toString(),
    roles, channels, emojis, stickers,
    stats: {
      roles:      roles.filter(r => !r.isEveryone && !r.managed).length,
      channels:   channels.length,
      categories: channels.filter(c => c.type === 4).length,
      text:       channels.filter(c => c.type === 0).length,
      voice:      channels.filter(c => c.type === 2).length,
      forum:      channels.filter(c => c.type === 15).length,
      stage:      channels.filter(c => c.type === 13).length,
      emojis:     emojis.length,
      stickers:   stickers.length,
    },
  };
}

module.exports = { serializeGuild, downloadAsBase64, genId };
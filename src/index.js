require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, ActivityType } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const PREFIX     = process.env.PREFIX     || 'ux';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildPresences,
     GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [Partials.Channel,Partials.Message,],
});

client.commands = new Collection();
const cmdDir = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  client.commands.set(cmd.name, cmd);
  if (cmd.aliases) cmd.aliases.forEach(a => client.commands.set(a, cmd));
  console.log(`  ✔ Loaded command: ${cmd.name}`);
}

client.once('ready', () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   Umbrax Development — Bot Online    ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  Tag     : ${client.user.tag.padEnd(26)}║`);
  console.log(`║  Prefix  : ${PREFIX.padEnd(26)}║`);
  console.log(`║  Guilds  : ${String(client.guilds.cache.size).padEnd(26)}║`);
  console.log(`║  Support : discord.gg/y74cue9txv     ║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  const activities = [
    { name: 'Umbrax Development', type: ActivityType.Playing },
    { name: `${PREFIX}help | Umbrax`, type: ActivityType.Watching },
    { name: 'discord.gg/y74cue9txv', type: ActivityType.Watching },
    { name: 'your server backups 🔒', type: ActivityType.Watching },
  ];

  let actIdx = 0;
  const setActivity = () => {
    const a = activities[actIdx % activities.length];
    client.user.setPresence({
      status: 'online',
      activities: [{ name: a.name, type: a.type }],
    });
    actIdx++;
  };

  setActivity();
  setInterval(setActivity, 15_000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot)                          return;
  if (!message.guild)                              return;
  if (!message.content.startsWith(PREFIX))        return;

  const args    = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();
  if (!cmdName) return;

  const cmd = client.commands.get(cmdName);
  if (!cmd) return;

  if (!message.member.permissions.has('Administrator')) {
    const { msgV2, container, textDisplay, separator, COLOR, FOOTER_TEXT } = require('./utils/components');
    return message.reply(
      msgV2(container(COLOR.error,
        textDisplay('### ❌  No Permission\nYou need **Administrator** to use this bot.'),
        separator(),
        textDisplay(`-# ${FOOTER_TEXT}`),
      ))
    );
  }

  try {
    await cmd.execute(message, args, client, BACKUP_DIR);
  } catch (err) {
    console.error(`[cmd:${cmdName}]`, err);
    const { msgV2, container, textDisplay, separator, COLOR, FOOTER_TEXT } = require('./utils/components');
    message.reply(
      msgV2(container(COLOR.error,
        textDisplay(`### ❌  Unexpected Error\n\`\`\`${err.message}\`\`\``),
        separator(),
        textDisplay(`-# ${FOOTER_TEXT}`),
      ))
    ).catch(() => {});
  }
});

process.on('unhandledRejection', err => console.error('[unhandledRejection]', err));
process.on('uncaughtException',  err => console.error('[uncaughtException]', err));

client.login(process.env.BOT_TOKEN);
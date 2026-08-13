const Groq = require('groq-sdk');
const {
  msgV2, container, textDisplay, separator,
  actionRow, button, COLOR, FOOTER_TEXT,
} = require('../utils/components');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const QUESTIONS = [
  { key: 'serverName',    q: '**1/7 · Server Name**\nWhat should the server be called?' },
  { key: 'purpose',       q: '**2/7 · Purpose**\nWhat is this server for? *(e.g. gaming community, study group, business)*' },
  { key: 'audience',      q: '**3/7 · Audience**\nWho will join? *(e.g. teens, developers, anime fans)*' },
  { key: 'vibe',          q: '**4/7 · Vibe / Theme**\nDescribe the vibe or theme. *(e.g. chill & friendly, professional, dark fantasy)*' },
  { key: 'features',      q: '**5/7 · Key Features**\nWhat features do you need? *(e.g. ticketing, music, leveling, NSFW, giveaways)*' },
  { key: 'channelCount',  q: '**6/7 · Channel Count**\nHow many channels roughly? *(e.g. minimal ~10, medium ~25, detailed ~40+)*' },
  { key: 'extraNotes',    q: '**7/7 · Extra Notes**\nAnything else? Role names, colour scheme, special requirements. *(or type `skip`)*' },
];

async function dm(user, payload) {
  try {
    const ch = await user.createDM();
    return ch.send(payload);
  } catch {
    return null;
  }
}

async function dmText(user, title, desc, color = COLOR.brand) {
  return dm(user, msgV2(
    container(color,
      textDisplay(`### ${title}\n${desc}`),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
    )
  ));
}

async function generateStructure(answers) {
  const prompt = `You are a Discord server architect. Generate a complete, detailed Discord server structure in valid JSON only.

User requirements:
- Server name: ${answers.serverName}
- Purpose: ${answers.purpose}
- Target audience: ${answers.audience}
- Vibe/theme: ${answers.vibe}
- Desired features: ${answers.features}
- Approximate channel count: ${answers.channelCount}
- Extra notes: ${answers.extraNotes}

Return ONLY a JSON object with this exact schema (no markdown, no explanation):
{
  "serverName": "string",
  "description": "string (2-3 sentence server description)",
  "roles": [
    { "name": "string", "color": "#RRGGBB", "hoist": boolean, "mentionable": boolean, "reason": "string" }
  ],
  "categories": [
    {
      "name": "string",
      "channels": [
        { "name": "string", "type": "text|voice|forum|announcement", "topic": "string", "slowmode": number, "nsfw": boolean }
      ]
    }
  ],
  "rules": ["string"],
  "welcomeMessage": "string",
  "boostPerks": ["string"],
  "suggestedBots": [{ "name": "string", "purpose": "string" }]
}`;

  const res = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const raw = res.choices[0]?.message?.content?.trim() || '';
  const clean = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

async function buildServer(guild, structure, user) {
  const log = async (title, desc, color = COLOR.brand) =>
    dmText(user, title, desc, color);

  await log('⚙️ Starting Build', `Renaming server to **${structure.serverName}**...`);
  await guild.setName(structure.serverName).catch(() => {});

  await log('🗑️ Clearing Roles', 'Removing existing roles...');
  const botMember = guild.members.me;
  for (const [, role] of guild.roles.cache) {
    if (role.id === guild.id) continue;                         
    if (botMember.roles.cache.has(role.id)) continue;         
    if (role.position >= botMember.roles.highest.position) continue;
    await role.delete().catch(() => {});
  }

  await log('✨ Creating Roles', `Building **${structure.roles.length}** roles...`);
  for (const r of structure.roles) {
    await guild.roles.create({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      reason: 'Umbrax Build',
    }).catch(() => {});
  }

  await log('🗑️ Clearing Channels', 'Removing existing channels...');
  for (const [, ch] of guild.channels.cache) {
    await ch.delete().catch(() => {});
  }

  const totalCats = structure.categories.length;
  for (let ci = 0; ci < totalCats; ci++) {
    const cat = structure.categories[ci];
    await log(
      `📂 Building Category ${ci + 1}/${totalCats}`,
      `Creating **${cat.name}** with **${cat.channels.length}** channels...`
    );

    const category = await guild.channels.create({
      name: cat.name,
      type: 4,
      reason: 'Umbrax Build',
    }).catch(() => null);

    for (const ch of cat.channels) {
      const typeMap = { text: 0, voice: 2, announcement: 5, forum: 15 };
      await guild.channels.create({
        name: ch.name,
        type: typeMap[ch.type] ?? 0,
        parent: category?.id,
        topic: ch.topic || '',
        rateLimitPerUser: ch.slowmode || 0,
        nsfw: ch.nsfw || false,
        reason: 'Umbrax Build',
      }).catch(() => {});
    }
  }

  const roleList   = structure.roles.map(r => `• ${r.name}`).join('\n');
  const botList    = structure.suggestedBots.map(b => `• **${b.name}** — ${b.purpose}`).join('\n');
  const ruleList   = structure.rules.map((r, i) => `${i + 1}. ${r}`).join('\n');

  await dm(user, msgV2(
    container(COLOR.success,
      textDisplay(
        `### ✅  Build Complete!\n` +
        `**${structure.serverName}** has been fully built.\n\n` +
        `**📋 Description**\n${structure.description}\n\n` +
        `**👑 Roles Created (${structure.roles.length})**\n${roleList}\n\n` +
        `**📜 Server Rules**\n${ruleList}\n\n` +
        `**🎉 Welcome Message**\n${structure.welcomeMessage}\n\n` +
        `**🤖 Suggested Bots**\n${botList}\n\n` +
        `**💎 Boost Perks**\n${structure.boostPerks.map(p => `• ${p}`).join('\n')}`
      ),
      separator(),
      actionRow(
        button('Support Server', null, 5, '🔗', 'https://discord.gg/y74cue9txv'),
      ),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
    )
  ));
}

module.exports = {
  name: 'build',
  aliases: ['serverbuild', 'aibuild'],
  description: 'AI-powered server builder using Groq',

  async execute(message, args, client) {
    const { guild, author } = message;

    if (!message.member.permissions.has('Administrator')) {
      return message.reply(msgV2(
        container(COLOR.error,
          textDisplay('### ❌  No Permission\nYou need **Administrator** to use this command.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      ));
    }

    if (!process.env.GROQ_API_KEY) {
      return message.reply(msgV2(
        container(COLOR.error,
          textDisplay('### ❌  Missing API Key\n`GROQ_API_KEY` is not set in your `.env` file.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      ));
    }

    let dmChannel;
    try {
      dmChannel = await author.createDM();
    } catch {
      return message.reply(msgV2(
        container(COLOR.error,
          textDisplay('### ❌  DMs Closed\nPlease enable DMs from server members so I can guide you through the build.'),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      ));
    }

    await message.reply(msgV2(
      container(COLOR.brand,
        textDisplay(`### 🤖  AI Server Builder\nCheck your DMs! I'll guide you through **${QUESTIONS.length} quick questions** to design your server.`),
        separator(),
        textDisplay(`-# ${FOOTER_TEXT}`),
      )
    ));

    const answers = {};
    const filter  = m => m.author.id === author.id;

    for (const question of QUESTIONS) {
      await dmChannel.send(msgV2(
        container(COLOR.brand,
          textDisplay(question.q),
          separator(),
          textDisplay(`-# ${FOOTER_TEXT}`),
        )
      ));

      let collected;
      try {
        const res = await dmChannel.awaitMessages({ filter, max: 1, time: 120_000, errors: ['time'] });
        collected = res.first().content.trim();
      } catch {
        await dmText(author, '⏰ Timed Out', 'You took too long to respond. Please run `uxbuild` again.', COLOR.error);
        return;
      }

      answers[question.key] = collected.toLowerCase() === 'skip' ? 'None specified' : collected;
    }

    await dmChannel.send(msgV2(
      container(COLOR.warn,
        textDisplay(
          `### ⚠️  Confirm Build\n` +
          `I'm about to **completely rebuild** this server:\n\n` +
          `> 🗑️ All existing roles & channels will be **deleted**\n` +
          `> ✨ New structure generated by AI will be **applied**\n\n` +
          `**Server:** ${guild.name}\n\n` +
          `Type \`confirm\` to proceed or \`cancel\` to abort.`
        ),
        separator(),
        textDisplay(`-# ${FOOTER_TEXT}`),
      )
    ));

    let confirm;
    try {
      const res = await dmChannel.awaitMessages({ filter, max: 1, time: 60_000, errors: ['time'] });
      confirm = res.first().content.trim().toLowerCase();
    } catch {
      await dmText(author, '⏰ Timed Out', 'Confirmation timed out. Build cancelled.', COLOR.error);
      return;
    }

    if (confirm !== 'confirm') {
      await dmText(author, '🚫 Build Cancelled', 'No changes were made to the server.', COLOR.warn);
      return;
    }

    await dmText(author, '🧠 Generating Structure', 'Sending your answers to Groq AI... This may take a few seconds.');

    let structure;
    try {
      structure = await generateStructure(answers);
    } catch (err) {
      console.error('[build:groq]', err);
      await dmText(author, '❌ AI Error', `Failed to generate server structure.\n\`\`\`${err.message}\`\`\``, COLOR.error);
      return;
    }

    await dmText(author, '🔨 Building Server', 'AI structure ready! Starting build now. Updates will appear here...');

    try {
      await buildServer(guild, structure, author);
    } catch (err) {
      console.error('[build:exec]', err);
      await dmText(author, '❌ Build Failed', `Something went wrong during the build.\n\`\`\`${err.message}\`\`\``, COLOR.error);
    }
  },
};
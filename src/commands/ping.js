const {
  msgV2, container, textDisplay, separator, COLOR, FOOTER_TEXT,
} = require('../utils/components');

module.exports = {
  name: 'ping',
  aliases: ['latency'],
  description: 'Shows bot latency',

  async execute(message, _args, client) {
    const sent = await message.reply(
      msgV2(container(COLOR.brand,
        textDisplay('### 🏓  Pinging...'),
        separator(),
        textDisplay(`-# ${FOOTER_TEXT}`),
      ))
    );

    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    const ws        = client.ws.ping;
    const color     = roundtrip < 100 ? COLOR.success : roundtrip < 250 ? COLOR.warn : COLOR.error;

    await sent.edit(
      msgV2(container(color,
        textDisplay(
          `### 🏓  Pong!\n` +
          `**Roundtrip** \`${roundtrip}ms\`\n` +
          `**WebSocket** \`${ws}ms\``
        ),
        separator(),
        textDisplay(`-# ${FOOTER_TEXT}`),
      ))
    );
  },
};
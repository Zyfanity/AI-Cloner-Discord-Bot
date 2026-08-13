const { MessageFlags } = require('discord.js');

const COLOR = {
  brand:   0x6C5CE7,
  success: 0x00B894,
  error:   0xFF4757,
  warn:    0xFFA502,
  muted:   0x2D3436,
};


function textDisplay(content) {
  return { type: 10, content };
}

function separator(divider = true, spacing = 1) {
  return { type: 14, divider, spacing };
}

function button(label, customId, style = 1, emoji = null, url = null) {
  const b = { type: 2, label, style };
  if (customId) b.custom_id = customId;
  if (url) b.url = url;
  if (emoji) b.emoji = typeof emoji === 'string' ? { name: emoji } : emoji;
  return b;
}

function actionRow(...buttons) {
  return { type: 1, components: buttons };
}

function section(textContent, thumbnailUrl = null) {
  const s = {
    type: 9,
    components: [textDisplay(textContent)],
  };
  if (thumbnailUrl) {
    s.accessory = {
      type: 11, 
      media: { url: thumbnailUrl },
    };
  }
  return s;
}

function mediaGallery(items) {
  return {
    type: 12,
    items: items.map(i => ({ media: { url: i.url }, description: i.description || '' })),
  };
}

/**
 * @param {number} color  
 * @param {Array}  inner 
 */
function container(color, ...inner) {
  return {
    type: 17,
    accent_color: color,
    components: inner,
  };
}


const FOOTER_TEXT = '**Umbrax Development** • [Support Server](https://discord.gg/y74cue9txv)';


function msgV2(...components) {
  return {
    flags: MessageFlags.IsComponentsV2 ?? (1 << 15),
    components,
  };
}


function infoMsg(title, desc, extraComponents = []) {
  return msgV2(
    container(COLOR.brand,
      textDisplay(`### ${title}\n${desc}`),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
      ...extraComponents,
    )
  );
}

function successMsg(title, desc, extraComponents = []) {
  return msgV2(
    container(COLOR.success,
      textDisplay(`### ✅  ${title}\n${desc}`),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
      ...extraComponents,
    )
  );
}

function errorMsg(title, desc) {
  return msgV2(
    container(COLOR.error,
      textDisplay(`### ❌  ${title}\n${desc}`),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
    )
  );
}

function warnMsg(title, desc, extraComponents = []) {
  return msgV2(
    container(COLOR.warn,
      textDisplay(`### ⚠️  ${title}\n${desc}`),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
      ...extraComponents,
    )
  );
}

function loadingMsg(step) {
  return msgV2(
    container(COLOR.brand,
      textDisplay(`### ⏳  Processing...\n${step}`),
      separator(),
      textDisplay(`-# ${FOOTER_TEXT}`),
    )
  );
}

function supportRow() {
  return actionRow(
    button('Support Server', null, 5, '🔗', 'https://discord.gg/y74cue9txv'),
  );
}

module.exports = {
  COLOR, textDisplay, separator, button, actionRow,
  section, mediaGallery, container, msgV2,
  infoMsg, successMsg, errorMsg, warnMsg, loadingMsg,
  supportRow, FOOTER_TEXT,
};
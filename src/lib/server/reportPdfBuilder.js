import {
  REPORT_TEMPLATE_BODY_RENDER_METRICS,
  buildTemplateRenderBlocks,
  clampTemplateBlankLines,
  createEmptyTemplateForm,
  getTemplateConsecutiveBlankBoost,
  getTemplateParagraphGap,
  mapTemplateToForm,
  renderTemplateText,
} from "@/lib/shared/reportTemplates";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const PAGE_MARGIN = 20;
const PAGE_GAP = 16;

const COLUMN_WIDTH = (PAGE_WIDTH - (PAGE_MARGIN * 2) - PAGE_GAP) / 2;
const BLOCK_WIDTH = COLUMN_WIDTH;
const BLOCK_HEIGHT = PAGE_HEIGHT - (PAGE_MARGIN * 2);
const BLOCK_PADDING_X = 20;
const BLOCK_PADDING_Y = 16;

const LEFT_BLOCK_X = PAGE_MARGIN;
const RIGHT_BLOCK_X = PAGE_MARGIN + COLUMN_WIDTH + PAGE_GAP;
const BLOCK_Y = PAGE_MARGIN;

const HEADER_HEIGHT = 104;
const FOOTER_HEIGHT = 66;

function sanitizePdfText(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u2022/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ");
}

function escapePdfText(value) {
  const normalized = sanitizePdfText(value);
  const bytes = Buffer.from(normalized, "latin1");

  return Array.from(bytes)
    .map((byte) => {
      if (byte === 40 || byte === 41 || byte === 92) {
        return `\\${String.fromCharCode(byte)}`;
      }

      if (byte < 32 || byte > 126) {
        return `\\${byte.toString(8).padStart(3, "0")}`;
      }

      return String.fromCharCode(byte);
    })
    .join("");
}

function getSpaceWidthFactor(fontSize = 10) {
  return Math.max(2.8, fontSize * 0.31);
}

function getCharacterWidthFactor(char, { bold = false } = {}) {
  const value = String(char || "");

  if (!value || value === " ") return 0.31;
  if (/[ilIjtfr1\.,;:'`!|]/.test(value)) return bold ? 0.25 : 0.23;
  if (/[mwMW@#%&QGÓÔÕÚÁÀÃÂÉÊÍÇ]/.test(value)) return bold ? 0.9 : 0.84;
  if (/[A-Z0-9]/.test(value)) return bold ? 0.72 : 0.68;
  if (/[a-záàãâéêíóôõúç]/i.test(value)) return bold ? 0.6 : 0.56;
  if (/[\(\)\[\]{}<>\/\\\-_=+]/.test(value)) return bold ? 0.38 : 0.35;
  return bold ? 0.58 : 0.54;
}

function estimateLineWidth(text, fontSize = 10, style = {}) {
  const sanitized = sanitizePdfText(text);
  let width = 0;

  for (const char of sanitized) {
    width += char === " " ? getSpaceWidthFactor(fontSize) : getCharacterWidthFactor(char, style) * fontSize;
  }

  return width;
}

function drawRect(commands, x, y, width, height, { strokeGray = null, fillGray = null, lineWidth = 1 } = {}) {
  if (fillGray != null) {
    commands.push(`${Number(fillGray).toFixed(3)} g`);
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
    commands.push("0 g");
  }

  if (strokeGray != null) {
    commands.push(`${Number(lineWidth).toFixed(2)} w`);
    commands.push(`${Number(strokeGray).toFixed(3)} G`);
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
    commands.push("0 G");
    commands.push("1 w");
  }
}

function drawSeparator(commands, x, y, width, gray = 0.83) {
  commands.push(`${gray.toFixed(3)} G`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} m ${(x + width).toFixed(2)} ${y.toFixed(2)} l S`);
  commands.push("0 G");
}

function resolvePdfFont(style = {}) {
  if (style.bold && style.italic) return "F4";
  if (style.bold) return "F2";
  if (style.italic) return "F3";
  return "F1";
}

function drawText(commands, x, y, text, { font = "F1", fontSize = 10 } = {}) {
  commands.push("0 g");
  commands.push(
    `BT /${font} ${fontSize} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`
  );
}

function drawImage(commands, imageName, x, y, width, height) {
  if (!imageName || width <= 0 || height <= 0) return;
  commands.push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${imageName} Do Q`);
}

function decodeJpegDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;

  try {
    return Buffer.from(match[2], "base64");
  } catch (_) {
    return null;
  }
}

function getJpegDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;

    const size = buffer.readUInt16BE(offset + 2);
    if (size < 2) break;

    const isSofMarker = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isSofMarker && offset + 9 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + size;
  }

  return null;
}

function prepareLogoImage(dataUrl) {
  const buffer = decodeJpegDataUrl(dataUrl);
  if (!buffer) return null;

  const dimensions = getJpegDimensions(buffer);
  if (!dimensions?.width || !dimensions?.height) return null;

  return {
    name: "Im1",
    buffer,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function tokenizeSegments(segments = []) {
  const tokens = [];

  segments.forEach((segment) => {
    const text = sanitizePdfText(segment?.text || "");
    if (!text) return;

    const parts = text.split(/(\s+)/).filter(Boolean);
    parts.forEach((part) => {
      const isSpace = /^\s+$/.test(part);
      tokens.push({
        text: isSpace ? " " : part,
        isSpace,
        bold: Boolean(segment?.bold),
        italic: Boolean(segment?.italic),
        underline: Boolean(segment?.underline),
        fontSize: Number(segment?.fontSize || 11) || 11,
      });
    });
  });

  return tokens;
}

function trimLineTokens(tokens = []) {
  let start = 0;
  let end = tokens.length;

  while (start < end && tokens[start]?.isSpace) start += 1;
  while (end > start && tokens[end - 1]?.isSpace) end -= 1;

  return tokens.slice(start, end);
}

function tokenWidth(token = {}) {
  const fontSize = Number(token?.fontSize || 10);
  if (token?.isSpace) return getSpaceWidthFactor(fontSize);
  return estimateLineWidth(token?.text || "", fontSize, token);
}

function splitTokenToFit(token = {}, width) {
  if (!token || token.isSpace) return [token];
  if (tokenWidth(token) <= width) return [token];

  const characters = [...String(token.text || "")];
  const parts = [];
  let current = "";

  characters.forEach((character) => {
    const nextValue = `${current}${character}`;
    if (current && estimateLineWidth(nextValue, token.fontSize, token) > width) {
      parts.push({ ...token, text: current, isSpace: false });
      current = character;
      return;
    }
    current = nextValue;
  });

  if (current) {
    parts.push({ ...token, text: current, isSpace: false });
  }

  return parts.length ? parts : [token];
}

function expandTokensToFit(tokens = [], width) {
  return tokens.flatMap((token) => splitTokenToFit(token, width));
}

function finalizeWrappedLine(lines, currentTokens) {
  const trimmed = trimLineTokens(currentTokens);
  if (trimmed.length) lines.push(trimmed);
}

function wrapTokens(tokens = [], width, maxLines = 999) {
  const lines = [];
  let current = [];
  let currentWidth = 0;

  const preparedTokens = expandTokensToFit(tokens, width);

  preparedTokens.forEach((token) => {
    const widthToken = tokenWidth(token);

    if (token.isSpace && !current.length) {
      return;
    }

    if (!current.length || currentWidth + widthToken <= width) {
      current.push(token);
      currentWidth += widthToken;
      return;
    }

    finalizeWrappedLine(lines, current);
    current = token.isSpace ? [] : [token];
    currentWidth = token.isSpace ? 0 : widthToken;
  });

  finalizeWrappedLine(lines, current);

  if (lines.length <= maxLines) return lines;

  const limited = lines.slice(0, maxLines);
  const lastLine = limited[limited.length - 1] || [];
  const lastTokenIndex = [...lastLine].reverse().findIndex((token) => !token.isSpace);

  if (lastTokenIndex >= 0) {
    const realIndex = lastLine.length - 1 - lastTokenIndex;
    const token = lastLine[realIndex];
    token.text = `${String(token.text || "").replace(/\s+$/g, "")}…`;
  } else {
    lastLine.push({ text: "…", isSpace: false, bold: false, italic: false, underline: false, fontSize: 11 });
  }

  return limited;
}

function sumLineWidth(tokens = []) {
  return tokens.reduce((total, token) => total + tokenWidth(token), 0);
}

function lineFontSize(tokens = [], fallback = 11) {
  return tokens.reduce((max, token) => Math.max(max, Number(token?.fontSize || 0) || 0), fallback);
}

function drawStyledLine(commands, x, y, width, tokens, { align = "left", justify = false } = {}) {
  const cleanTokens = trimLineTokens(tokens);
  if (!cleanTokens.length) return;

  const lineWidth = sumLineWidth(cleanTokens);
  let cursorX = x;

  if (align === "right") {
    cursorX = x + width - lineWidth;
  } else if (align === "center") {
    cursorX = x + ((width - lineWidth) / 2);
  }

  const spaceTokens = justify ? cleanTokens.filter((token) => token.isSpace).length : 0;
  const baseExtraSpace = justify && spaceTokens > 0 ? (width - lineWidth) / spaceTokens : 0;
  const safeExtraSpace = Math.max(0, Math.min(baseExtraSpace, 2.4));
  const shouldJustify = justify && spaceTokens > 2 && lineWidth >= width * 0.78 && safeExtraSpace > 0;

  cleanTokens.forEach((token) => {
    const currentWidth = tokenWidth(token);
    if (token.isSpace) {
      cursorX += currentWidth + (shouldJustify ? safeExtraSpace : 0);
      return;
    }

    const font = resolvePdfFont(token);
    drawText(commands, cursorX, y, token.text, {
      font,
      fontSize: token.fontSize,
    });

    if (token.underline) {
      const underlineY = y - 1.6;
      drawSeparator(commands, cursorX, underlineY, currentWidth, 0.2);
    }

    cursorX += currentWidth;
  });
}


function fitPlainLineFontSize(text, width, preferredFontSize = 8.2, minFontSize = 6.8) {
  let fontSize = Number(preferredFontSize || 8.2);

  while (fontSize > minFontSize && estimateLineWidth(text, fontSize, {}) > width) {
    fontSize = Number((fontSize - 0.2).toFixed(2));
  }

  return Math.max(minFontSize, fontSize);
}

function wrapPlainParagraph(text, width, preferredFontSize = 8.2) {
  const sanitized = sanitizePdfText(text || "").trim();
  if (!sanitized) {
    return [];
  }

  const words = sanitized.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const lines = [];
  let current = "";

  words.forEach((word) => {
    const nextValue = current ? `${current} ${word}` : word;
    const testFontSize = fitPlainLineFontSize(nextValue, width, preferredFontSize);

    if (!current || estimateLineWidth(nextValue, testFontSize, {}) <= width) {
      current = nextValue;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawPlainTextBlock(
  commands,
  x,
  yTop,
  width,
  text,
  { align = "center", preferredFontSize = 8.2, minFontSize = 6.8, lineHeightFactor = 1.32, maxHeight = 52 } = {}
) {
  const paragraphs = sanitizePdfText(text || "")
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const bottomY = yTop - maxHeight;
  let cursorY = yTop;
  let truncated = false;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (truncated) return;

    const wrappedLines = wrapPlainParagraph(paragraph, width, preferredFontSize);
    if (!wrappedLines.length) {
      return;
    }

    wrappedLines.forEach((line, lineIndex) => {
      if (truncated) return;

      const fontSize = fitPlainLineFontSize(line, width, preferredFontSize, minFontSize);
      const lineHeight = Math.max(9.2, fontSize * lineHeightFactor);

      if (cursorY - lineHeight < bottomY) {
        truncated = true;
        return;
      }

      const lineWidth = estimateLineWidth(line, fontSize, {});
      let drawX = x;

      if (align === "center") {
        drawX = x + Math.max(0, (width - lineWidth) / 2);
      } else if (align === "right") {
        drawX = x + Math.max(0, width - lineWidth);
      }

      drawText(commands, drawX, cursorY, line, {
        font: "F1",
        fontSize,
      });

      cursorY -= lineHeight;
    });

    if (!truncated && paragraphIndex < paragraphs.length - 1) {
      cursorY -= 4;
    }
  });

  return {
    cursorY,
    truncated,
  };
}



function segmentsToPlainText(segments = []) {
  return sanitizePdfText(
    (Array.isArray(segments) ? segments : [])
      .map((segment) => String(segment?.text || ""))
      .join("")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function drawFooterBlocks(
  commands,
  x,
  yTop,
  width,
  blocks = [],
  {
    maxHeight = 56,
    defaultFontSize = 8.2,
    blankGap = 4,
    blockGap = 2,
    ruleGap = 7,
  } = {}
) {
  const bottomY = yTop - maxHeight;
  let cursorY = yTop;
  let truncated = false;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    if (cursorY <= bottomY + 4) {
      truncated = true;
      break;
    }

    if (block?.type === "blank") {
      const previousBlock = blockIndex > 0 ? blocks[blockIndex - 1] : null;
      const nextBlock = blockIndex < blocks.length - 1 ? blocks[blockIndex + 1] : null;
      const paragraphGap = Math.max(blankGap, defaultFontSize * 1.18);
      const consecutiveBlankBoost =
        previousBlock?.type === "blank" || nextBlock?.type === "blank"
          ? Math.max(2, defaultFontSize * 0.28)
          : 0;

      cursorY -= paragraphGap + consecutiveBlankBoost;
      continue;
    }

    if (block?.type === "rule") {
      drawSeparator(commands, x, cursorY - 2, width, 0.82);
      cursorY -= ruleGap;
      continue;
    }

    const plainText = segmentsToPlainText(block?.segments || []);
    if (!plainText) {
      cursorY -= blankGap;
      continue;
    }

    const result = drawPlainTextBlock(commands, x, cursorY, width, plainText, {
      align: block?.align || "center",
      preferredFontSize: Number(block?.fontSize || defaultFontSize) || defaultFontSize,
      minFontSize: 6.8,
      lineHeightFactor: 1.26,
      maxHeight: Math.max(10, cursorY - bottomY),
    });

    cursorY = result.cursorY - blockGap;
    truncated = Boolean(result.truncated);
    if (truncated) break;
  }

  return {
    cursorY,
    truncated,
  };
}

function drawTemplateBlocks(
  commands,
  x,
  yTop,
  width,
  blocks = [],
  {
    maxHeight = 120,
    defaultFontSize = 11,
    defaultLineHeight = 1.38,
    blankGap = 14,
    blockGap = 4,
    ruleGap = 10,
    consecutiveBlankBoost = null,
  } = {}
) {
  const bottomY = yTop - maxHeight;
  let cursorY = yTop;
  let truncated = false;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    if (cursorY <= bottomY + 4) {
      truncated = true;
      break;
    }

    if (block?.type === "blank") {
      const previousBlock = blockIndex > 0 ? blocks[blockIndex - 1] : null;
      const nextBlock = blockIndex < blocks.length - 1 ? blocks[blockIndex + 1] : null;
      const paragraphGap = getTemplateParagraphGap({
        blankGap,
        fontSize: defaultFontSize,
      });
      const blankClusterBoost =
        previousBlock?.type === "blank" || nextBlock?.type === "blank"
          ? getTemplateConsecutiveBlankBoost({
              consecutiveBlankBoost,
              fontSize: defaultFontSize,
            })
          : 0;

      cursorY -= paragraphGap + blankClusterBoost;
      continue;
    }

    if (block?.type === "rule") {
      drawSeparator(commands, x, cursorY - 3, width, 0.78);
      cursorY -= ruleGap;
      continue;
    }

    const lines = wrapTokens(tokenizeSegments(block?.segments || []), width, 999);
    if (!lines.length) {
      cursorY -= blankGap;
      continue;
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const lineTokens = lines[lineIndex];
      const maxFontSize = lineFontSize(lineTokens, block?.fontSize || defaultFontSize);
      const lineHeight = Math.max(10, maxFontSize * defaultLineHeight);

      if (cursorY - lineHeight < bottomY) {
        truncated = true;
        break;
      }

      drawStyledLine(commands, x, cursorY, width, lineTokens, {
        align: block?.align || "left",
        justify: block?.align === "justify" && lineIndex < lines.length - 1,
      });

      cursorY -= lineHeight;
    }

    if (truncated) break;
    cursorY -= blockGap;
  }

  return {
    cursorY,
    truncated,
  };
}

function formatDateTime(date) {
  try {
    return new Date(date || Date.now()).toLocaleString("pt-BR");
  } catch (_) {
    return "";
  }
}

function defaultTemplate() {
  return createEmptyTemplateForm();
}

function getTemplate(selectedTemplate) {
  if (!selectedTemplate) return defaultTemplate();
  return mapTemplateToForm(selectedTemplate);
}

function renderTemplateArea(text, record, context, fallback = "", options = {}) {
  const maxBlankLines = Math.max(1, Number(options?.maxBlankLines || 1));
  const rendered = clampTemplateBlankLines(
    renderTemplateText(text || fallback || "", record, context),
    maxBlankLines
  ).trim();

  return rendered || String(fallback || "").trim();
}

function buildRecordCommands(record, indexOnPage, absoluteIndex, total, context) {
  const commands = [];
  const template = context.template;
  const blockX = indexOnPage === 0 ? LEFT_BLOCK_X : RIGHT_BLOCK_X;
  const innerX = blockX + BLOCK_PADDING_X;
  const innerWidth = BLOCK_WIDTH - (BLOCK_PADDING_X * 2);
  const blockTopY = BLOCK_Y + BLOCK_HEIGHT;
  const headerBottomY = BLOCK_Y + BLOCK_HEIGHT - HEADER_HEIGHT;
  const footerTopY = BLOCK_Y + FOOTER_HEIGHT;

  drawRect(commands, blockX, BLOCK_Y, BLOCK_WIDTH, BLOCK_HEIGHT, {
    fillGray: 1,
    strokeGray: 0.8,
    lineWidth: 0.9,
  });

  const baseContext = {
    ...context,
    recordIndex: absoluteIndex,
    recordCount: total,
    templateName: template?.name || "Padrão",
  };

  const headerText = renderTemplateArea(template?.headerTemplate, record, baseContext, "RELATÓRIO CLÍNICO");
  const bodyText = renderTemplateArea(
    template?.bodyTemplate,
    record,
    baseContext,
    [
      "Paciente: {{paciente}}",
      "Profissional: {{profissional}}",
      "Data/Hora: {{data_agendada}}",
      "",
      "{{categoria_titulo}}",
      "{{categoria_conteudo}}",
    ].join("\n"),
    {
      maxBlankLines: REPORT_TEMPLATE_BODY_RENDER_METRICS.maxBlankLines,
    }
  );
  const footerText = renderTemplateArea(template?.footerTemplate, record, baseContext, "{{data_geracao}}");

  const headerBlocks = buildTemplateRenderBlocks(headerText, {}, {}, { fontSize: 10.2, align: "left" });
  const bodyBlocks = buildTemplateRenderBlocks(bodyText, {}, {}, { fontSize: 10.0, align: "left" });
  const logoImage = context.logoImage || null;
  let logoHeight = 0;
  if (logoImage?.width && logoImage?.height) {
    const maxLogoWidth = Math.min(108, innerWidth * 0.42);
    const maxLogoHeight = 32;
    const logoScale = Math.min(maxLogoWidth / logoImage.width, maxLogoHeight / logoImage.height);
    const logoWidth = Math.max(1, logoImage.width * logoScale);
    logoHeight = Math.max(1, logoImage.height * logoScale);
    const logoY = blockTopY - BLOCK_PADDING_Y - logoHeight;
    drawImage(commands, logoImage.name, innerX, logoY, logoWidth, logoHeight);
  }

  const headerStartY = blockTopY - BLOCK_PADDING_Y - 6 - (logoHeight ? logoHeight + 10 : 0);
  drawTemplateBlocks(commands, innerX, headerStartY, innerWidth, headerBlocks, {
    maxHeight: HEADER_HEIGHT - 18 - (logoHeight ? logoHeight + 10 : 0),
    defaultFontSize: 9.8,
    defaultLineHeight: 1.18,
    blankGap: 5,
    blockGap: 1.5,
    ruleGap: 7,
  });

  drawSeparator(commands, innerX, headerBottomY + 8, innerWidth, 0.8);

  const bodyTopY = headerBottomY - 12;
  const bodyBottomY = footerTopY + 18;
  const bodyAvailableHeight = bodyTopY - bodyBottomY;

  drawTemplateBlocks(commands, innerX, bodyTopY, innerWidth, bodyBlocks, {
    maxHeight: bodyAvailableHeight,
    defaultFontSize: REPORT_TEMPLATE_BODY_RENDER_METRICS.fontSize,
    defaultLineHeight: REPORT_TEMPLATE_BODY_RENDER_METRICS.lineHeight,
    blankGap: REPORT_TEMPLATE_BODY_RENDER_METRICS.blankGap,
    blockGap: REPORT_TEMPLATE_BODY_RENDER_METRICS.blockGap,
    ruleGap: REPORT_TEMPLATE_BODY_RENDER_METRICS.ruleGap,
    consecutiveBlankBoost: REPORT_TEMPLATE_BODY_RENDER_METRICS.consecutiveBlankBoost,
  });

  const footerBlocks = buildTemplateRenderBlocks(footerText, {}, {}, { fontSize: 7.8, align: "center" });

  drawSeparator(commands, innerX, footerTopY + 28, innerWidth, 0.84);

  drawFooterBlocks(commands, innerX, footerTopY + 18, innerWidth, footerBlocks, {
    maxHeight: 42,
    defaultFontSize: 7.8,
    blankGap: 3,
    blockGap: 1,
    ruleGap: 6,
  });

  return commands;
}

function createPdfDocument(pageCommands = [], { logoImage = null } = {}) {
  const objects = [];

  const addObject = (content) => {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "ascii");
    objects.push(buffer);
    return objects.length;
  };

  const catalogId = addObject("<<>>");
  const pagesId = addObject("<<>>");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const fontItalicId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");
  const fontBoldItalicId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>");

  const imageId = logoImage?.buffer
    ? addObject(
        Buffer.concat([
          Buffer.from(
            `<< /Type /XObject /Subtype /Image /Width ${logoImage.width} /Height ${logoImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoImage.buffer.length} >>\nstream\n`,
            "ascii"
          ),
          logoImage.buffer,
          Buffer.from("\nendstream", "ascii"),
        ])
      )
    : null;

  const pageIds = [];

  pageCommands.forEach((commands) => {
    const stream = Buffer.from(`${commands.join("\n")}\n`, "ascii");
    const contentId = addObject(
      Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"),
        stream,
        Buffer.from("endstream", "ascii"),
      ])
    );

    const xObjectPart = imageId ? ` /XObject << /Im1 ${imageId} 0 R >>` : "";
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontItalicId} 0 R /F4 ${fontBoldItalicId} 0 R >>${xObjectPart} >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, "ascii");
  objects[pagesId - 1] = Buffer.from(
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
    "ascii"
  );

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const chunks = [header];
  const offsets = [0];
  let cursor = header.length;

  objects.forEach((objectBuffer, index) => {
    offsets[index + 1] = cursor;
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, "ascii");
    const suffix = Buffer.from("\nendobj\n", "ascii");
    chunks.push(prefix, objectBuffer, suffix);
    cursor += prefix.length + objectBuffer.length + suffix.length;
  });

  const xrefOffset = cursor;
  const xrefLines = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (let index = 1; index <= objects.length; index += 1) {
    xrefLines.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(`${xrefLines.join("\n")}\n${trailer}`, "latin1"));

  return Buffer.concat(chunks);
}

export function buildReportPdf({ rows = [], selectedCategory = 1, selectedTemplate = null, generatedAt = new Date() }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    throw new Error("Nenhuma linha pronta para gerar PDF.");
  }

  const template = getTemplate(selectedTemplate);
  const logoImage = prepareLogoImage(template?.headerLogoDataUrl || "");
  const pages = [];

  for (let index = 0; index < safeRows.length; index += 2) {
    const group = safeRows.slice(index, index + 2);
    const commands = [
      "1 1 1 rg",
      `0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`,
      "0 G",
      "0 g",
      "0.90 G",
      `${(PAGE_WIDTH / 2).toFixed(2)} ${PAGE_MARGIN.toFixed(2)} m ${(PAGE_WIDTH / 2).toFixed(2)} ${(PAGE_HEIGHT - PAGE_MARGIN).toFixed(2)} l S`,
      "0 G",
    ];

    group.forEach((record, groupIndex) => {
      commands.push(
        ...buildRecordCommands(record, groupIndex, index + groupIndex, safeRows.length, {
          template,
          selectedCategory,
          generatedAt,
          templateName: template?.name || "Padrão",
          logoImage,
        })
      );
    });

    pages.push(commands);
  }

  return createPdfDocument(pages, { logoImage });
}

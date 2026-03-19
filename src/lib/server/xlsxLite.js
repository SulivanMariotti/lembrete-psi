import { inflateRawSync } from "node:zlib";

function readUInt16LE(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readUInt32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32LE(buffer, offset) === signature) {
      return offset;
    }
  }

  throw new Error("ZIP inválido: diretório central não encontrado.");
}

function extractZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = readUInt16LE(buffer, eocdOffset + 10);
  const centralDirectorySize = readUInt32LE(buffer, eocdOffset + 12);
  const centralDirectoryOffset = readUInt32LE(buffer, eocdOffset + 16);

  if (!totalEntries || centralDirectorySize <= 0) {
    throw new Error("ZIP inválido: sem arquivos internos.");
  }

  const files = new Map();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    const signature = readUInt32LE(buffer, cursor);
    if (signature !== 0x02014b50) {
      throw new Error("ZIP inválido: cabeçalho do diretório central corrompido.");
    }

    const flags = readUInt16LE(buffer, cursor + 8);
    const compressionMethod = readUInt16LE(buffer, cursor + 10);
    const compressedSize = readUInt32LE(buffer, cursor + 20);
    const uncompressedSize = readUInt32LE(buffer, cursor + 24);
    const fileNameLength = readUInt16LE(buffer, cursor + 28);
    const extraFieldLength = readUInt16LE(buffer, cursor + 30);
    const fileCommentLength = readUInt16LE(buffer, cursor + 32);
    const localHeaderOffset = readUInt32LE(buffer, cursor + 42);

    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    const fileName = buffer.subarray(fileNameStart, fileNameEnd).toString("utf8");

    cursor = fileNameEnd + extraFieldLength + fileCommentLength;

    if (fileName.endsWith("/")) {
      continue;
    }

    if (flags & 0x0001) {
      throw new Error(`ZIP inválido: entrada criptografada não suportada (${fileName}).`);
    }

    const localSignature = readUInt32LE(buffer, localHeaderOffset);
    if (localSignature !== 0x04034b50) {
      throw new Error(`ZIP inválido: cabeçalho local ausente (${fileName}).`);
    }

    const localFileNameLength = readUInt16LE(buffer, localHeaderOffset + 26);
    const localExtraFieldLength = readUInt16LE(buffer, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const dataEnd = dataStart + compressedSize;
    const compressedData = buffer.subarray(dataStart, dataEnd);

    let data;
    if (compressionMethod === 0) {
      data = compressedData;
    } else if (compressionMethod === 8) {
      data = inflateRawSync(compressedData);
    } else {
      throw new Error(`Compressão ZIP não suportada (${compressionMethod}) em ${fileName}.`);
    }

    if (uncompressedSize && data.length !== uncompressedSize) {
      throw new Error(`Arquivo interno corrompido (${fileName}).`);
    }

    files.set(fileName, data);
  }

  return files;
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readXmlFile(files, path) {
  const file = files.get(path);
  if (!file) return "";
  return file.toString("utf8");
}

function parseWorkbook(fileMap) {
  const workbookXml = readXmlFile(fileMap, "xl/workbook.xml");
  const relsXml = readXmlFile(fileMap, "xl/_rels/workbook.xml.rels");

  const relationById = new Map();
  for (const match of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g)) {
    relationById.set(match[1], match[2]);
  }

  const sheets = [];
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g)) {
    const name = xmlDecode(match[1]);
    const relationId = match[2];
    const target = relationById.get(relationId);
    if (!target) continue;

    const normalizedTarget = target.startsWith("xl/") ? target : `xl/${target.replace(/^\.\//, "")}`;
    sheets.push({ name, path: normalizedTarget });
  }

  return sheets;
}

function parseSharedStrings(fileMap) {
  const sharedXml = readXmlFile(fileMap, "xl/sharedStrings.xml");
  if (!sharedXml) return [];

  const values = [];
  for (const siMatch of sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const content = siMatch[1];
    const textParts = [];

    for (const tMatch of content.matchAll(/<t(?:\s+xml:space="preserve")?>([\s\S]*?)<\/t>/g)) {
      textParts.push(xmlDecode(tMatch[1]));
    }

    values.push(textParts.join(""));
  }

  return values;
}

function extractCellValue(cellXml, sharedStrings) {
  const typeMatch = cellXml.match(/\bt="([^"]+)"/);
  const type = typeMatch ? typeMatch[1] : "";

  if (type === "inlineStr") {
    const textParts = [];
    for (const tMatch of cellXml.matchAll(/<t(?:\s+xml:space="preserve")?>([\s\S]*?)<\/t>/g)) {
      textParts.push(xmlDecode(tMatch[1]));
    }
    return textParts.join("");
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  if (!valueMatch) return "";

  const rawValue = xmlDecode(valueMatch[1]);

  if (type === "s") {
    const index = Number(rawValue);
    return Number.isInteger(index) ? String(sharedStrings[index] || "") : "";
  }

  return rawValue;
}

function getColumnLabel(cellRef = "") {
  const match = String(cellRef).match(/([A-Z]+)/i);
  return match ? match[1].toUpperCase() : "";
}

function columnToNumber(label = "") {
  let value = 0;
  for (const char of String(label).toUpperCase()) {
    value = (value * 26) + (char.charCodeAt(0) - 64);
  }
  return value;
}

function parseWorksheet(fileMap, path, sharedStrings) {
  const worksheetXml = readXmlFile(fileMap, path);
  if (!worksheetXml) {
    throw new Error("Worksheet não encontrada no arquivo.");
  }

  const rows = [];

  for (const rowMatch of worksheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowXml = rowMatch[1];
    const cells = [];

    for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1] || "";
      const cellRefMatch = attrs.match(/\br="([^"]+)"/);
      const cellRef = cellRefMatch ? cellRefMatch[1] : "";
      const column = getColumnLabel(cellRef);
      const value = extractCellValue(`<c ${attrs}>${cellMatch[2]}</c>`, sharedStrings);

      cells.push({
        column,
        columnNumber: columnToNumber(column),
        value,
      });
    }

    cells.sort((a, b) => a.columnNumber - b.columnNumber);
    rows.push(cells.map((cell) => cell.value));
  }

  return rows;
}

export function parseXlsxBuffer(buffer, options = {}) {
  const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const workbookFiles = extractZipEntries(fileBuffer);
  const sharedStrings = parseSharedStrings(workbookFiles);
  const sheets = parseWorkbook(workbookFiles);

  if (!sheets.length) {
    throw new Error("Workbook sem abas legíveis.");
  }

  const sheetIndex = Number(options.sheetIndex || 0);
  const sheet = sheets[sheetIndex] || sheets[0];
  const rows = parseWorksheet(workbookFiles, sheet.path, sharedStrings);

  return {
    sheetName: sheet.name,
    rows,
    sheetCount: sheets.length,
  };
}

import React from "react";
import { Text } from "react-native";

export const BLOCK_TYPOGRAPHY: Record<
  string,
  { fontFamily: string; fontSize: number; lineHeight: number; color: string; includeFontPadding: boolean }
> = {
  title: { fontFamily: "Outfit_700Bold", fontSize: 24, lineHeight: 30, color: "#111111", includeFontPadding: false },
  heading: { fontFamily: "Outfit_700Bold", fontSize: 20, lineHeight: 26, color: "#1C1C1E", includeFontPadding: false },
  subheading: { fontFamily: "Outfit_600SemiBold", fontSize: 17, lineHeight: 23, color: "#27272A", includeFontPadding: false },
  paragraph: { fontFamily: "Outfit_400Regular", fontSize: 16, lineHeight: 24, color: "#27272A", includeFontPadding: false },
  todo: { fontFamily: "Outfit_400Regular", fontSize: 16, lineHeight: 24, color: "#27272A", includeFontPadding: false },
  bullet: { fontFamily: "Outfit_400Regular", fontSize: 16, lineHeight: 24, color: "#27272A", includeFontPadding: false },
  numbered: { fontFamily: "Outfit_400Regular", fontSize: 16, lineHeight: 24, color: "#27272A", includeFontPadding: false },
};

export type BlockType = "paragraph" | "title" | "heading" | "subheading" | "todo" | "bullet" | "numbered";

export interface FormatRange {
  type: "bold" | "italic" | "underline" | "strikethrough";
  start: number;
  length: number;
}

export interface NoteLine {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

let lineIdCounter = 0;
export function generateLineId(): string {
  lineIdCounter += 1;
  return `l-${Date.now()}-${lineIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseFormattedText(rawText: string) {
  let text = "";
  const formats: FormatRange[] = [];
  if (!rawText) return { text: "", formats };

  const parts = rawText.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|<u>[^<]+<\/u>)/g);

  for (const part of parts) {
    if (!part) continue;
    let type: "bold" | "italic" | "underline" | "strikethrough" | null = null;
    let content = part;

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      type = "bold";
      content = part.slice(2, -2);
    } else if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      type = "strikethrough";
      content = part.slice(2, -2);
    } else if (part.startsWith("<u>") && part.endsWith("</u>") && part.length >= 7) {
      type = "underline";
      content = part.slice(3, -4);
    } else if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      type = "italic";
      content = part.slice(1, -1);
    }

    if (type) {
      formats.push({ type, start: text.length, length: content.length });
    }
    text += content;
  }

  return { text, formats };
}

export function splitIntoFormattedChunks(text: string, formats?: FormatRange[]) {
  if (!formats || formats.length === 0) {
    return text ? [{ text, formats: new Set<string>() }] : [];
  }

  const charFormats = Array.from({ length: text.length }, () => new Set<string>());
  for (const f of formats) {
    for (let i = f.start; i < Math.min(f.start + f.length, text.length); i++) {
      charFormats[i].add(f.type);
    }
  }

  const chunks: { text: string; formats: Set<string> }[] = [];
  let currentText = "";
  let currentFormats = new Set<string>();

  for (let i = 0; i <= text.length; i++) {
    const formatsAtI = i < text.length ? charFormats[i] : new Set<string>();

    let changed = false;
    if (formatsAtI.size !== currentFormats.size) {
      changed = true;
    } else {
      for (const f of currentFormats) {
        if (!formatsAtI.has(f)) {
          changed = true;
          break;
        }
      }
    }

    if (changed || i === text.length) {
      if (currentText.length > 0) chunks.push({ text: currentText, formats: currentFormats });
      if (i < text.length) {
        currentText = text[i];
        currentFormats = formatsAtI;
      }
    } else {
      if (i < text.length) currentText += text[i];
    }
  }

  return chunks;
}

export function formatRangesToMarkdown(text: string, formats?: FormatRange[]): string {
  if (!formats || formats.length === 0) return text;

  const chunks = splitIntoFormattedChunks(text, formats);
  let result = "";
  for (const chunk of chunks) {
    let chunkStr = chunk.text;
    if (chunk.formats.has("bold")) chunkStr = `**${chunkStr}**`;
    if (chunk.formats.has("italic")) chunkStr = `*${chunkStr}*`;
    if (chunk.formats.has("underline")) chunkStr = `<u>${chunkStr}</u>`;
    if (chunk.formats.has("strikethrough")) chunkStr = `~~${chunkStr}~~`;
    result += chunkStr;
  }
  return result;
}

export function renderRichText(text: string, formats: FormatRange[], baseStyle: any) {
  if (!formats || formats.length === 0) return text || "";

  const chunks = splitIntoFormattedChunks(text, formats);
  return chunks.map((chunk, i) => {
    const style: any = { ...baseStyle };
    if (chunk.formats.has("bold")) {
      style.fontFamily = "Outfit_700Bold";
    }
    if (chunk.formats.has("italic")) style.fontStyle = "italic";
    const decs = [];
    if (chunk.formats.has("underline")) decs.push("underline");
    if (chunk.formats.has("strikethrough")) decs.push("line-through");
    if (decs.length > 0) style.textDecorationLine = decs.join(" ");
    return (
      <Text allowFontScaling={false} key={i} style={style}>
        {chunk.text}
      </Text>
    );
  });
}

export function parseMarkdownToLines(raw: string): NoteLine[] {
  if (!raw) return [{ id: generateLineId(), type: "paragraph", text: "" }];
  return raw.split("\n").map((line, idx) => {
    const id = generateLineId();
    const trimmed = line.trim();
    let type: BlockType = "paragraph";
    let text = line;
    let checked: boolean | undefined = undefined;

    if (trimmed.startsWith("# ")) {
      type = "title";
      text = line.slice(line.indexOf("# ") + 2);
    } else if (trimmed.startsWith("## ")) {
      type = "heading";
      text = line.slice(line.indexOf("## ") + 3);
    } else if (trimmed.startsWith("### ")) {
      type = "subheading";
      text = line.slice(line.indexOf("### ") + 4);
    } else {
      const todoMatch = line.match(/^(\s*)([•\-\*–—]\s*)?\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        type = "todo";
        text = todoMatch[4];
        checked = todoMatch[3].toLowerCase() === "x";
      } else {
        const bulletMatch = line.match(/^(\s*)[•\-\*–—]\s+(.*)$/);
        if (bulletMatch) {
          type = "bullet";
          text = bulletMatch[2];
        } else {
          const numMatch = line.match(/^(\s*)\d+[\.\)]\s+(.*)$/);
          if (numMatch) {
            type = "numbered";
            text = numMatch[2];
          }
        }
      }
    }

    return { id, type, text, checked };
  });
}

export function cleanLinesToMarkdown(lines: NoteLine[]): string {
  if (!lines || lines.length === 0) return "";
  return lines
    .map((l, idx) => {
      const text = l.text || "";
      if (l.type === "title") return `# ${text}`;
      if (l.type === "heading") return `## ${text}`;
      if (l.type === "subheading") return `### ${text}`;
      if (l.type === "todo") return `[${l.checked ? "x" : " "}] ${text}`;
      if (l.type === "bullet") return `• ${text}`;
      if (l.type === "numbered") return `${idx + 1}. ${text}`;
      return text;
    })
    .join("\n");
}

export function getLinePrefix(line: NoteLine, idx: number): string {
  if (!line) return "";
  if (line.type === "todo") return line.checked ? "☑ " : "☐ ";
  if (line.type === "bullet") return "• ";
  if (line.type === "numbered") return `${idx + 1}. `;
  return "";
}

export function parseLinePrefix(raw: string = ""): { cleanText: string; isTodo: boolean; checked: boolean; isBullet: boolean; isNumbered: boolean } {
  const safe = raw || "";
  if (safe.startsWith("☑ ")) {
    return { cleanText: safe.slice(2), isTodo: true, checked: true, isBullet: false, isNumbered: false };
  }
  if (safe.startsWith("☐ ")) {
    return { cleanText: safe.slice(2), isTodo: true, checked: false, isBullet: false, isNumbered: false };
  }
  if (safe.startsWith("• ")) {
    return { cleanText: safe.slice(2), isTodo: false, checked: false, isBullet: true, isNumbered: false };
  }
  const numMatch = safe.match(/^\d+\.\s+/);
  if (numMatch) {
    return { cleanText: safe.slice(numMatch[0].length), isTodo: false, checked: false, isBullet: false, isNumbered: true };
  }
  return { cleanText: safe, isTodo: false, checked: false, isBullet: false, isNumbered: false };
}

export function reconcileLineText(newClean: string = "", prevRawText: string = ""): string {
  const safeClean = newClean || "";
  const safePrev = prevRawText || "";
  const { text: prevClean, formats: prevFormats } = parseFormattedText(safePrev);
  if (prevFormats.length === 0) return safeClean;
  if (safeClean === prevClean) return safePrev;

  let commonPrefix = 0;
  while (
    commonPrefix < prevClean.length &&
    commonPrefix < safeClean.length &&
    prevClean[commonPrefix] === safeClean[commonPrefix]
  ) {
    commonPrefix++;
  }

  let prevSuffix = prevClean.length - 1;
  let newSuffix = safeClean.length - 1;
  while (
    prevSuffix >= commonPrefix &&
    newSuffix >= commonPrefix &&
    prevClean[prevSuffix] === safeClean[newSuffix]
  ) {
    prevSuffix--;
    newSuffix--;
  }

  const lengthDelta = safeClean.length - prevClean.length;

  const adjustedFormats: FormatRange[] = [];
  for (const f of prevFormats) {
    const fEnd = f.start + f.length;

    if (fEnd <= commonPrefix) {
      adjustedFormats.push(f);
    } else if (f.start > prevSuffix) {
      adjustedFormats.push({
        ...f,
        start: Math.max(0, f.start + lengthDelta),
      });
    } else if (f.start <= commonPrefix && fEnd > prevSuffix) {
      const newLen = f.length + lengthDelta;
      if (newLen > 0) {
        adjustedFormats.push({
          ...f,
          length: newLen,
        });
      }
    }
  }

  return formatRangesToMarkdown(safeClean, adjustedFormats);
}

export function reconcileEditorLines(newRawLines: string[], prevLines: NoteLine[]): NoteLine[] {
  const safePrev = prevLines && prevLines.length > 0 ? prevLines : [{ id: generateLineId(), type: "paragraph" as BlockType, text: "" }];
  const safeRaw = newRawLines && newRawLines.length > 0 ? newRawLines : [""];
  let result: NoteLine[] = [];

  if (safeRaw.length === safePrev.length) {
    result = safePrev.map((prev, i) => {
      const p = parseLinePrefix(safeRaw[i] ?? "");
      let type = prev.type;
      let checked = prev.checked;
      if (p.isTodo) {
        type = "todo";
        checked = p.checked;
      } else if (p.isBullet) {
        type = "bullet";
      } else if (p.isNumbered) {
        type = "numbered";
      } else if (prev.type === "todo" || prev.type === "bullet" || prev.type === "numbered") {
        type = "paragraph";
        checked = false;
      }
      return {
        ...prev,
        id: prev.id || generateLineId(),
        type,
        checked,
        text: reconcileLineText(p.cleanText, prev.text),
      };
    });
  } else if (safeRaw.length > safePrev.length) {
    const diff = safeRaw.length - safePrev.length;
    let splitIdx = 0;
    while (
      splitIdx < safePrev.length &&
      parseLinePrefix(safeRaw[splitIdx] ?? "").cleanText === safePrev[splitIdx]?.text
    ) {
      splitIdx++;
    }

    const prevAtSplit = safePrev[splitIdx];
    const inheritType: BlockType =
      prevAtSplit?.type === "todo" && (prevAtSplit.text || "").trim().length > 0
        ? "todo"
        : prevAtSplit?.type === "bullet"
        ? "bullet"
        : "paragraph";

    for (let i = 0; i < splitIdx; i++) {
      result.push(safePrev[i]);
    }

    const p0 = parseLinePrefix(safeRaw[splitIdx] ?? "");
    result.push({
      ...(safePrev[splitIdx] || { id: generateLineId(), type: "paragraph" }),
      text: reconcileLineText(p0.cleanText, safePrev[splitIdx]?.text || ""),
    });

    for (let i = 1; i <= diff; i++) {
      const pNew = parseLinePrefix(safeRaw[splitIdx + i] ?? "");
      result.push({
        id: generateLineId(),
        type: pNew.isTodo ? "todo" : pNew.isBullet ? "bullet" : inheritType,
        text: pNew.cleanText,
        checked: pNew.checked || false,
      });
    }

    for (let i = splitIdx + 1; i < safePrev.length; i++) {
      const pRem = parseLinePrefix(safeRaw[i + diff] ?? "");
      result.push({
        ...safePrev[i],
        text: reconcileLineText(pRem.cleanText, safePrev[i]?.text || ""),
      });
    }
  } else {
    const diff = safePrev.length - safeRaw.length;
    let delIdx = 0;
    while (
      delIdx < safeRaw.length &&
      parseLinePrefix(safeRaw[delIdx] ?? "").cleanText === safePrev[delIdx]?.text
    ) {
      delIdx++;
    }

    for (let i = 0; i < delIdx; i++) {
      result.push(safePrev[i]);
    }

    for (let i = delIdx; i < safeRaw.length; i++) {
      const old = safePrev[i + diff] || safePrev[i] || { id: generateLineId(), type: "paragraph" as BlockType };
      const p = parseLinePrefix(safeRaw[i] ?? "");
      result.push({
        id: old.id || generateLineId(),
        type: p.isTodo ? "todo" : p.isBullet ? "bullet" : p.isNumbered ? "numbered" : old.type || "paragraph",
        text: reconcileLineText(p.cleanText, old.text || ""),
        checked: p.checked !== undefined ? p.checked : old.checked,
      });
    }
  }

  // Deduplicate IDs to ensure unique keys for React rendering
  const seenIds = new Set<string>();
  return result.map((item) => {
    if (!item.id || seenIds.has(item.id)) {
      const uniqueId = generateLineId();
      seenIds.add(uniqueId);
      return { ...item, id: uniqueId };
    }
    seenIds.add(item.id);
    return item;
  });
}

export function toggleInlineFormatInLines(
  lines: NoteLine[],
  selStart: number,
  selEnd: number,
  formatType: "bold" | "italic" | "underline" | "strikethrough"
): { updatedLines: NoteLine[]; newSelStart: number; newSelEnd: number } {
  if (!lines || lines.length === 0) {
    return { updatedLines: lines || [], newSelStart: selStart, newSelEnd: selEnd };
  }

  const minSel = Math.min(selStart, selEnd);
  const maxSel = Math.max(selStart, selEnd);

  let currentOffset = 0;
  const lineDetails = lines.map((line, idx) => {
    const prefix = getLinePrefix(line, idx);
    const { text: cleanText, formats } = parseFormattedText(line.text || "");
    const lineScreenStart = currentOffset;
    const textScreenStart = lineScreenStart + prefix.length;
    const lineScreenEnd = textScreenStart + cleanText.length;
    const nextOffset = lineScreenEnd + (idx < lines.length - 1 ? 1 : 0);
    currentOffset = nextOffset;

    return {
      line,
      prefix,
      cleanText,
      formats,
      lineScreenStart,
      textScreenStart,
      lineScreenEnd,
    };
  });

  // If collapsed cursor, find current word boundaries to format
  let effectiveMin = minSel;
  let effectiveMax = maxSel;

  if (effectiveMin === effectiveMax) {
    for (const item of lineDetails) {
      if (effectiveMin >= item.textScreenStart && effectiveMin <= item.lineScreenEnd) {
        const localPos = effectiveMin - item.textScreenStart;
        const text = item.cleanText;
        let wStart = localPos;
        let wEnd = localPos;
        while (wStart > 0 && /\S/.test(text[wStart - 1])) {
          wStart--;
        }
        while (wEnd < text.length && /\S/.test(text[wEnd])) {
          wEnd++;
        }
        if (wStart < wEnd) {
          effectiveMin = item.textScreenStart + wStart;
          effectiveMax = item.textScreenStart + wEnd;
        }
        break;
      }
    }
  }

  if (effectiveMin === effectiveMax) {
    return { updatedLines: lines, newSelStart: selStart, newSelEnd: selEnd };
  }

  let allSelectedHaveFormat = true;
  let hasAnyOverlap = false;

  for (const item of lineDetails) {
    const overlapStart = Math.max(item.textScreenStart, effectiveMin);
    const overlapEnd = Math.min(item.lineScreenEnd, effectiveMax);

    if (overlapStart < overlapEnd) {
      hasAnyOverlap = true;
      const localStart = overlapStart - item.textScreenStart;
      const localEnd = overlapEnd - item.textScreenStart;

      for (let c = localStart; c < localEnd; c++) {
        const hasF = item.formats.some(f => f.type === formatType && c >= f.start && c < f.start + f.length);
        if (!hasF) {
          allSelectedHaveFormat = false;
          break;
        }
      }
      if (!allSelectedHaveFormat) break;
    }
  }

  if (!hasAnyOverlap) {
    return { updatedLines: lines, newSelStart: selStart, newSelEnd: selEnd };
  }

  const shouldAdd = !allSelectedHaveFormat;

  const updatedLines = lineDetails.map((item) => {
    const overlapStart = Math.max(item.textScreenStart, effectiveMin);
    const overlapEnd = Math.min(item.lineScreenEnd, effectiveMax);

    if (overlapStart >= overlapEnd) {
      return item.line;
    }

    const localStart = overlapStart - item.textScreenStart;
    const localEnd = overlapEnd - item.textScreenStart;

    const charFormats = Array.from({ length: item.cleanText.length }, () => new Set<string>());
    for (const f of item.formats) {
      for (let i = f.start; i < Math.min(f.start + f.length, item.cleanText.length); i++) {
        charFormats[i].add(f.type);
      }
    }

    for (let i = localStart; i < localEnd; i++) {
      if (shouldAdd) {
        charFormats[i].add(formatType);
      } else {
        charFormats[i].delete(formatType);
      }
    }

    const newRanges: FormatRange[] = [];
    const types: ("bold" | "italic" | "underline" | "strikethrough")[] = ["bold", "italic", "underline", "strikethrough"];

    for (const t of types) {
      let rStart = -1;
      for (let i = 0; i <= item.cleanText.length; i++) {
        const hasT = i < item.cleanText.length && charFormats[i].has(t);
        if (hasT && rStart === -1) {
          rStart = i;
        } else if (!hasT && rStart !== -1) {
          newRanges.push({ type: t, start: rStart, length: i - rStart });
          rStart = -1;
        }
      }
    }

    const newText = formatRangesToMarkdown(item.cleanText, newRanges);
    return {
      ...item.line,
      text: newText,
    };
  });

  return { updatedLines, newSelStart: effectiveMin, newSelEnd: effectiveMax };
}

export function getActiveFormatsAtSelection(
  lines: NoteLine[],
  selStart: number,
  selEnd: number
): {
  activeLineIdx: number;
  styleName: string;
  activeFormats: { bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean };
} {
  const safeLines = lines && lines.length > 0 ? lines : [{ id: generateLineId(), type: "paragraph" as BlockType, text: "" }];
  const minSel = Math.min(selStart, selEnd);
  let currentOffset = 0;
  let targetLineIdx = 0;
  let localPos = 0;

  for (let i = 0; i < safeLines.length; i++) {
    const line = safeLines[i];
    const prefix = getLinePrefix(line, i);
    const { text: cleanText } = parseFormattedText(line.text || "");
    const lineLen = prefix.length + cleanText.length + (i < safeLines.length - 1 ? 1 : 0);

    if (minSel >= currentOffset && minSel <= currentOffset + lineLen) {
      targetLineIdx = i;
      localPos = Math.max(0, minSel - (currentOffset + prefix.length));
      break;
    }
    currentOffset += lineLen;
  }

  const activeLine = safeLines[targetLineIdx] || safeLines[0];
  const styleName =
    activeLine?.type === "title"
      ? "Title"
      : activeLine?.type === "heading"
      ? "Heading"
      : activeLine?.type === "subheading"
      ? "Subheading"
      : "Body";

  const { formats } = parseFormattedText(activeLine?.text || "");
  const activeFormats = {
    bold: formats.some(f => f.type === "bold" && localPos >= f.start && localPos <= f.start + f.length),
    italic: formats.some(f => f.type === "italic" && localPos >= f.start && localPos <= f.start + f.length),
    underline: formats.some(f => f.type === "underline" && localPos >= f.start && localPos <= f.start + f.length),
    strikethrough: formats.some(f => f.type === "strikethrough" && localPos >= f.start && localPos <= f.start + f.length),
  };

  return { activeLineIdx: targetLineIdx, styleName, activeFormats };
}

export function renderCleanEditorLines(lines: NoteLine[]) {
  if (!lines || lines.length === 0) return null;
  const total = lines.length;

  return lines.map((line, idx) => {
    const isLast = idx === total - 1;
    const fontStyle = BLOCK_TYPOGRAPHY[line.type] || BLOCK_TYPOGRAPHY.paragraph;

    let prefix = "";
    if (line.type === "todo") {
      prefix = line.checked ? "☑ " : "☐ ";
    } else if (line.type === "bullet") {
      prefix = "• ";
    } else if (line.type === "numbered") {
      prefix = `${idx + 1}. `;
    }

    const { text: cleanText, formats } = parseFormattedText(line.text || "");

    return (
      <Text key={line.id || `line-${idx}`} style={fontStyle}>
        {prefix !== "" ? (
          <Text style={{ color: "#E5A93C", fontFamily: "Outfit_700Bold", fontSize: fontStyle.fontSize }}>
            {prefix}
          </Text>
        ) : null}
        {line.type === "todo" && line.checked ? (
          <Text style={{ textDecorationLine: "line-through", color: "#8E8E93" }}>
            {cleanText}
          </Text>
        ) : (
          renderRichText(cleanText, formats, fontStyle)
        )}
        {!isLast ? "\n" : null}
      </Text>
    );
  });
}


function looksLikeCode(text) {
  const value = text.trim();
  return /^(?:const|let|var|import|export|function|class|return|await)\b/.test(value)
    || /^<\/?[A-Za-z][\s/>]/.test(value)
    || /^(?:git|npm|npx|node)\s/.test(value)
    || /^[\w$.]+\([^\n]*\);?$/.test(value);
}

export function splitQuizBlocks(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const parts = normalized.split(/(```[^\n]*\n[\s\S]*?```)/g);
  const blocks = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    const fencedCode = /^```[^\n]*\n([\s\S]*?)```$/.exec(part);
    if (fencedCode) {
      blocks.push({ type: "code", content: fencedCode[1].trimEnd() });
      continue;
    }

    for (const paragraph of part.split(/\n\s*\n/)) {
      const content = paragraph.trim();
      if (content) blocks.push({ type: looksLikeCode(content) ? "code" : "text", content });
    }
  }

  return blocks;
}

export function splitInlineQuizText(text) {
  return text.split(/(`[^`\n]+`)/g).filter(Boolean).map((part) => (
    part.startsWith("`") && part.endsWith("`")
      ? { type: "code", content: part.slice(1, -1) }
      : { type: "text", content: part }
  ));
}

export function isCodeOnlyQuizText(text) {
  return looksLikeCode(text.replace(/^`|`$/g, ""));
}

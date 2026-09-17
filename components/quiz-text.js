import { isCodeOnlyQuizText, splitInlineQuizText, splitQuizBlocks } from "@/lib/ai/quiz-text-parser";

function InlineText({ text }) {
  if (isCodeOnlyQuizText(text)) {
    return <code>{text.replace(/^`|`$/g, "")}</code>;
  }

  return splitInlineQuizText(text).map((part, index) => (
    part.type === "code"
      ? <code key={index}>{part.content}</code>
      : <span key={index}>{part.content}</span>
  ));
}

export default function QuizText({ text, inline = false }) {
  if (inline) {
    return <span className="quiz-inline-text"><InlineText text={text} /></span>;
  }

  return (
    <div className="quiz-text">
      {splitQuizBlocks(text).map((block, index) => (
        block.type === "code"
          ? <pre key={index}><code>{block.content}</code></pre>
          : <p key={index}><InlineText text={block.content} /></p>
      ))}
    </div>
  );
}

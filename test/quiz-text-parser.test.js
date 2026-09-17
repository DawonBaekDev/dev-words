import assert from "node:assert/strict";
import test from "node:test";
import { isCodeOnlyQuizText, splitInlineQuizText, splitQuizBlocks } from "../lib/ai/quiz-text-parser.js";

test("기존 퀴즈 질문의 줄바꿈된 코드를 별도 코드 블록으로 구분한다", () => {
  const blocks = splitQuizBlocks(
    "버튼을 누르면 어떻게 되나요?\n\nconst [count, setCount] = useState(0);\n<button onClick={() => setCount(count + 1)}>{count}</button>"
  );
  assert.deepEqual(blocks, [
    { type: "text", content: "버튼을 누르면 어떻게 되나요?" },
    { type: "code", content: "const [count, setCount] = useState(0);\n<button onClick={() => setCount(count + 1)}>{count}</button>" },
  ]);
});

test("새 퀴즈의 코드 울타리와 인라인 코드를 구분한다", () => {
  const blocks = splitQuizBlocks("다음 코드를 보세요.\n\n```javascript\nconst value = 1;\n```\n\n결과는 무엇인가요?");
  assert.deepEqual(blocks.map((block) => block.type), ["text", "code", "text"]);
  assert.equal(blocks[1].content, "const value = 1;");
  assert.deepEqual(splitInlineQuizText("`category` 값을 읽습니다."), [
    { type: "code", content: "category" },
    { type: "text", content: " 값을 읽습니다." },
  ]);
  assert.equal(isCodeOnlyQuizText('url.searchParams.get("category")'), true);
  assert.equal(isCodeOnlyQuizText("쿼리 문자열의 값을 읽습니다."), false);
});

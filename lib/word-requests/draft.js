import "server-only";
import { beginAiRun, endAiRun } from "@/lib/ai/data";
import { generateAiWord } from "@/lib/ai/word";
import { saveRequestDraft } from "./data";

export async function prepareRequestDraft({ requestId, userId, requestedWord, normalizedWord }) {
  let runId = "";
  let draft = null;
  let message = "자동생성 실패. 관리자 확인요망";
  try {
    const run = await beginAiRun({ userId, type: "word" });
    if (run.started) {
      runId = run.runId;
      draft = await generateAiWord(requestedWord);
      message = "해당 카드를 등록할까요?";
    }
  } catch (error) {
    console.error("요청 단어 초안 생성 실패:", error);
  } finally {
    if (runId) await endAiRun(runId);
  }
  await saveRequestDraft(requestId, normalizedWord, draft, message);
}

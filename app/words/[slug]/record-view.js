"use client";

import { useEffect } from "react";
import { recordView } from "@/app/activity-actions";

export default function RecordView({ slug }) {
  useEffect(() => {
    // 실제 상세 화면을 연 경우만 기록합니다. 링크의 사전 로딩은 기록하지 않습니다.
    recordView(slug).catch(() => {});
  }, [slug]);
  return null;
}

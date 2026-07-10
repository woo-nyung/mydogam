"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // 개발 모드에서는 등록하지 않음: dev 서버의 JS 청크는 프로덕션과 달리
    // content hash로 고정되지 않아서, sw.js의 cache-first 전략이 코드를
    // 수정해도 브라우저가 예전 번들을 계속 쓰게 만들어 hydration mismatch를 유발함.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}

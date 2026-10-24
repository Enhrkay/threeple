"use client";

import {
  useEffect,
} from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      "serviceWorker" in
      navigator
    ) {
      navigator.serviceWorker
        .register(
          "/sw.js"
        )
        .catch(
          (error) => {
            console.error(
              "THREEPLE_SERVICE_WORKER_REGISTER_FAILED",
              error
            );
          }
        );
    }
  }, []);

  return null;
}


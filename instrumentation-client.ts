import { initBotId } from "botid/client/core";

const canUseWebCrypto =
  typeof window !== "undefined" &&
  globalThis.isSecureContext &&
  Boolean(globalThis.crypto?.subtle);

if (canUseWebCrypto) {
  initBotId({
    protect: [
      {
        path: "/api/chat",
        method: "POST",
      },
    ],
  });
}

import { computed, effect, signal } from "@preact/signals";
import { IS_BROWSER } from "$fresh/runtime.ts";

export const expires = signal(-1);
const now = signal(Date.now());

if (IS_BROWSER) {
  setInterval(
    () => now.value = Date.now(),
    50,
  );
}

export const expiresIn = computed(() =>
  Math.max(0, (expires.value - now.value) / 1000).toFixed(1)
);

export const isExpired = computed(() =>
  expires.value !== -1 && Number(expiresIn.value) <= 0
);

if (IS_BROWSER) {
  effect(() => isExpired.value && location.reload());
}

export const isAboutToExpire = computed(() => Number(expiresIn.value) < 60);
export const isAboutToExpireStr = computed(() =>
  isAboutToExpire.value ? "yes" : "no"
);

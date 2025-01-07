import { signal } from "@preact/signals";
import { ping } from "@/client/ping.ts";

export default function PingButtonComponent() {
  const isPinging = signal(false);

  async function doPing() {
    try {
      isPinging.value = true;
      await ping();
    } catch (error) {
      console.error("Failed to ping", error);
    } finally {
      isPinging.value = false;
    }
  }

  return (
    <button onClick={doPing} disabled={isPinging}>
      {isPinging.value ? "Updating session" : "I'm still here"}
    </button>
  );
}

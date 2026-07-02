"use client";

import { useEffect, useRef } from "react";

// Convertit une clé VAPID base64url → Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(userId: string | null | undefined) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (registeredRef.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    registeredRef.current = true;

    (async () => {
      try {
        // 1. Enregistrer le service worker
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        // 2. Demander la permission (sans bloquer l'UX si déjà accordée)
        const currentPerm = Notification.permission;
        let permission = currentPerm;

        if (currentPerm === "default") {
          // Petite attente pour ne pas popup immédiatement à l'ouverture
          await new Promise((r) => setTimeout(r, 3000));
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") return;

        // 3. S'abonner aux push
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const existing = await reg.pushManager.getSubscription();
        const subscription =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          }));

        // 4. Sauvegarder la subscription côté serveur
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
        });
      } catch (err) {
        // Silencieux — les push sont un bonus, pas un feature critique
        console.warn("[push] Setup failed:", err);
      }
    })();
  }, [userId]);
}

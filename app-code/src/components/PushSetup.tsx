"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/lib/usePushNotifications";

export function PushSetup() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  usePushNotifications(userId);

  return null; // Ce composant ne rend rien visuellement
}

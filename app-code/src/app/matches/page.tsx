"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type MatchRow = {
  id: string;
  user_a_uid: string;
  user_b_uid: string;
  clothing_a_id: number | string;
  clothing_b_id: number | string;
  created_at?: string;
};
type ClothingLite = { id: number | string; image_url?: string; title?: string };

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [clothingMap, setClothingMap] = useState<Record<string, ClothingLite>>({});
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMe(user.id);

      try {
        const { data: rows } = await supabase
          .from("matches")
          .select("*")
          .or(`user_a_uid.eq.${user.id},user_b_uid.eq.${user.id}`)
          .order("created_at", { ascending: false });

        const list = (rows as MatchRow[]) ?? [];
        setMatches(list);

        const ids = Array.from(new Set(list.flatMap((m) => [m.clothing_a_id, m.clothing_b_id])));
        if (ids.length > 0) {
          const { data: clothes } = await supabase
            .from("clothing").select("id, image_url, title").in("id", ids);
          const map: Record<string, ClothingLite> = {};
          (clothes as ClothingLite[] ?? []).forEach((c) => { map[String(c.id)] = c; });
          setClothingMap(map);
        }
      } catch (e) {
        console.error("matches error:", e);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header unifié — même que home/wallet */}
      <div style={{
        position: "relative", background: "#3c2f22",
        height: "calc(112px + env(safe-area-inset-top))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: 14,
      }}>
        <div style={{ position: "relative", width: 150, height: 44 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        <HeaderActions />
      </div>

      <div style={{ padding: "20px 18px 120px" }}>
        <h1 style={{ margin: "0 0 18px", textAlign: "center", fontSize: 28, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>My matches</h1>
        {loading ? (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 40, fontWeight: 600 }}>Loading…</p>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
            <p style={{ color: "#2D1A0A", opacity: 0.65, fontSize: 15, lineHeight: 1.5 }}>No matches yet.<br />Swipe clothes to find some!</p>
            <button onClick={() => router.push("/home")} style={{ marginTop: 20, height: 52, padding: "0 26px", borderRadius: 26, background: "#FFC543", border: "none", color: "#2D1A0A", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Go swipe
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {matches.map((m) => {
              const mineIsA = m.user_a_uid === me;
              const myCloth = clothingMap[String(mineIsA ? m.clothing_a_id : m.clothing_b_id)];
              const theirCloth = clothingMap[String(mineIsA ? m.clothing_b_id : m.clothing_a_id)];
              return (
                <div key={m.id} style={{ background: "#E8E4DC", borderRadius: 20, padding: 16 }}>
                  {/* Photos + texte */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <Thumb src={myCloth?.image_url} />
                    <span style={{ color: "#FFC543", fontSize: 22, fontWeight: 800 }}>⇄</span>
                    <Thumb src={theirCloth?.image_url} />
                    <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
                      <p style={{ margin: 0, fontWeight: 800, color: "#2D1A0A", fontSize: 15 }}>It&apos;s a match!</p>
                      <p style={{ margin: "3px 0 0", color: "#2D1A0A", opacity: 0.6, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {theirCloth?.title ?? "Item"}
                      </p>
                    </div>
                  </div>
                  {/* Bouton message */}
                  <button
                    onClick={() => router.push(`/chat/${m.id}`)}
                    style={{ width: "100%", height: 48, borderRadius: 26, background: "#FFC543", border: "none", color: "#2D1A0A", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
                  >
                    Send a message
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Thumb({ src }: { src?: string }) {
  return (
    <div style={{ position: "relative", width: 60, height: 60, borderRadius: 12, overflow: "hidden", background: "#d8d2c4", flexShrink: 0 }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 24, height: 24, opacity: 0.4 }}>
              <Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} />
            </div>
          </div>}
    </div>
  );
}

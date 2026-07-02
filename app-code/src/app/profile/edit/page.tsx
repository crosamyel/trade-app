"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MAX_BIO = 100;
const MAX_USERNAME = 20;

type CropArea = { x: number; y: number; width: number; height: number };

async function getCroppedImage(imageSrc: string, pixelCrop: CropArea): Promise<Blob | null> {
  const image = new window.Image();
  image.src = imageSrc;
  await new Promise<void>(r => { image.onload = () => r(); });
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 400, 400);
  return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

export default function EditProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setCurrentUserId(user.id);
      try {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (prof?.username) setUsername(prof.username);
        if (prof?.full_name) setFullName(prof.full_name);
        if (prof?.city) setCity(prof.city);
        if (prof?.bio) setBio(prof.bio);
        if (prof?.avatar_url) setAvatarUrl(prof.avatar_url);
      } catch { /* profiles unavailable */ }
    }
    init();
  }, [router]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(f);
  }

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels || !currentUserId) return;
    setShowCropper(false);
    setCropSrc(null);
    setUploadingAvatar(true);
    try {
      const blob = await getCroppedImage(cropSrc, croppedAreaPixels);
      if (!blob) { setToast("Crop failed — try again"); setUploadingAvatar(false); return; }
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", currentUserId);
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.error) {
        setToast("Upload failed: " + (data.error ?? "unknown error"));
      } else {
        setAvatarUrl(data.url);
        setToast("Photo updated ✓");
      }
    } catch {
      setToast("Upload error — try again");
    }
    setUploadingAvatar(false);
  }

  function handleUsername(val: string) {
    setUsername(val.replace(/\s/g, "").slice(0, MAX_USERNAME));
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    console.log("[profile/edit] saving for user:", user.id, { username, fullName, city, bio });
    const { error } = await supabase
      .from("profiles")
      .update({ username: username || null, full_name: fullName || null, city, bio })
      .eq("id", user.id);
    console.log("[profile/edit] update result:", error ?? "success");
    if (error) {
      setToast("Error saving — please try again");
      setSaving(false);
      return;
    }
    setToast("Profile updated ✓");
    setTimeout(() => { window.location.replace("/profile"); }, 900);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 28, left: "50%", transform: "translateX(-50%)", background: "#3c2f22", color: "#FFC543", fontWeight: 800, fontSize: 15, padding: "12px 24px", borderRadius: 30, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap", animation: "toastIn 0.22s ease-out both" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22", flexShrink: 0,
        height: "calc(68px + max(env(safe-area-inset-top, 0px), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top, 0px), 44px)", paddingLeft: 18, paddingRight: 18, paddingBottom: 16,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ color: "#FFC543", fontWeight: 800, fontSize: 22 }}>Edit profile</span>
      </div>

      <div style={{ flex: 1, padding: "26px 20px", paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))", overflowY: "auto" }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#FFC543", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(255,197,67,0.45)", marginBottom: 12 }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontSize: 38, fontWeight: 800 }}>{username?.[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
          <button
            onClick={() => avatarRef.current?.click()}
            disabled={uploadingAvatar}
            style={{ background: "none", border: "1.5px solid #b89b6e", borderRadius: 20, padding: "7px 20px", fontSize: 13, fontWeight: 700, color: "#3c2f22", cursor: uploadingAvatar ? "wait" : "pointer", opacity: uploadingAvatar ? 0.6 : 1 }}
          >
            {uploadingAvatar ? "Uploading…" : "Change photo"}
          </button>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </div>

        {/* Username */}
        <label style={lbl}>Username <span style={{ color: "#9b8f7a", fontWeight: 500 }}>(no spaces, max {MAX_USERNAME})</span></label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#9b8f7a", fontSize: 15, fontWeight: 600 }}>@</span>
          <input value={username} onChange={(e) => handleUsername(e.target.value)} placeholder="yourname" style={{ ...inp, paddingLeft: 30 }} />
        </div>

        {/* Full name */}
        <label style={{ ...lbl, marginTop: 20 }}>Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Sam Crokaert" style={inp} />

        {/* City */}
        <label style={{ ...lbl, marginTop: 20 }}>Your city</label>
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Brussels" style={inp} />

        {/* Bio */}
        <label style={{ ...lbl, marginTop: 20 }}>Your bio</label>
        <div style={{ position: "relative" }}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            placeholder="e.g. I would like to trade clothes, what do you got?"
            rows={4}
            style={{ ...inp, height: "auto", padding: "14px 18px 26px", resize: "none", lineHeight: 1.5 }}
          />
          <span style={{ position: "absolute", right: 14, bottom: 10, fontSize: 12, color: "rgba(45,26,10,0.5)" }}>{bio.length}/{MAX_BIO}</span>
        </div>

        <button
          className="btn-cta"
          onClick={save}
          disabled={saving}
          style={{ marginTop: 28, width: "100%", height: 54, borderRadius: 27, border: "none", background: "#2D1A0A", color: "#FFC543", fontWeight: 800, fontSize: 17, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Crop Modal */}
      {showCropper && cropSrc && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 500, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ background: "#111", padding: "max(16px, calc(env(safe-area-inset-top,0px) + 10px)) 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Adjust your photo</span>
            <button
              onClick={() => { setShowCropper(false); setCropSrc(null); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, padding: "6px 14px", borderRadius: 16, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>

          {/* Cropper */}
          <div style={{ flex: 1, position: "relative" }}>
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom + confirm */}
          <div style={{ background: "#111", padding: "16px 24px calc(24px + env(safe-area-inset-bottom,0px))", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 16, lineHeight: 1 }}>−</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#FFC543" }}
              />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 16, lineHeight: 1 }}>+</span>
            </div>
            <button
              onClick={handleCropConfirm}
              style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 17, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,197,67,0.4)" }}
            >
              Use this photo ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: 14, fontWeight: 700, color: "#2D1A0A", marginBottom: 8,
};
const inp: React.CSSProperties = {
  display: "block", width: "100%", height: 50, background: "#E8E4DC", border: "none", borderRadius: 16,
  padding: "0 18px", fontSize: 15, color: "#2D1A0A", outline: "none", boxSizing: "border-box",
  fontFamily: FONT,
};

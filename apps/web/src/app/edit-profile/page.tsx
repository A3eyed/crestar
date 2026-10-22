// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import { Camera, ChevronRight, AlertCircle } from "lucide-react";

const FIELD_CONFIG = {
  name: { label: "Name", maxLength: 30, placeholder: "Add your name" },
  username: { label: "Username", maxLength: 24, placeholder: "Add username" },
  bio: {
    label: "Bio",
    maxLength: 80,
    placeholder: "Add a bio to your profile",
    multiline: true,
  },
};

export default function EditProfilePage() {
  const { data: user, loading: userLoading, refetch } = useUser();
  const [upload, { loading: uploading }] = useUpload();
  const saveCompletedRef = useRef(false);

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    profileImage: null,
  });
  const [originalData, setOriginalData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = "/account/signin?callbackUrl=/edit-profile";
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (!saveCompletedRef.current && user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/update?_t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setProfileData(data.user);
          const img =
            data.user.profile_image || user?.profile_image || user?.image || null;
          const initial = {
            username: data.user.username || user?.username || "",
            displayName:
              data.user.display_name || data.user.name || user?.name || "",
            bio: data.user.bio || "",
            profileImage: img,
          };
          setFormData(initial);
          setOriginalData(initial);
          return;
        }
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
    }

    if (user) {
      const fallback = {
        username: user.username || "",
        displayName: user.display_name || user.name || "",
        bio: user.bio || "",
        profileImage: user.profile_image || user.image || null,
      };
      setFormData(fallback);
      setOriginalData(fallback);
    }
  };

  const flashStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2200);
  };

  const persistProfileImage = async (url) => {
    const response = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ profileImage: url }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.detail || "Could not save photo");
    }
    return data;
  };

  const persistNameAndBio = async ({ displayName, bio }) => {
    const response = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ displayName, bio }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.detail || "Could not save profile");
    }
    return data;
  };

  const persistUsername = async (username) => {
    const cleaned = String(username || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase();

    if (cleaned.length < 2) {
      throw new Error("Username must be at least 2 characters.");
    }
    if (!/^[a-z0-9_.]{2,24}$/.test(cleaned)) {
      throw new Error(
        "Username can only use letters, numbers, periods, and underscores.",
      );
    }

    if (profileData?.canChangeUsernameIn > 0) {
      throw new Error(
        `You can change your username again in ${profileData.canChangeUsernameIn} days.`,
      );
    }

    const usernameRes = await fetch("/api/profile/update-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: cleaned }),
    });
    const usernameData = await usernameRes.json().catch(() => ({}));
    if (!usernameRes.ok) {
      throw new Error(
        usernameData.error || usernameData.detail || "Failed to update username",
      );
    }
    return { ...usernameData, username: cleaned };
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);

    if (!file.type.startsWith("image/") && file.type !== "") {
      setErrorMsg("Please choose an image file (JPEG, PNG, WebP, or HEIC).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Image must be under 10MB.");
      return;
    }

    setStatusMsg("Uploading photo...");
    const { url, error } = await upload({ file, folder: "avatars" });
    if (error || !url) {
      setErrorMsg(error || "Upload failed. Please try again.");
      setStatusMsg(null);
      return;
    }

    setFormData((prev) => ({ ...prev, profileImage: url }));

    try {
      setStatusMsg("Saving photo...");
      await persistProfileImage(url);
      setOriginalData((prev) => (prev ? { ...prev, profileImage: url } : prev));
      await refetch?.();
      flashStatus("Photo updated.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Photo uploaded but could not be saved.");
      setStatusMsg(null);
    }
  };

  const openEditModal = (field) => {
    setErrorMsg(null);
    let value = "";
    if (field === "name") value = formData.displayName;
    else if (field === "username") value = formData.username;
    else if (field === "bio") value = formData.bio;
    setEditValue(value);
    setEditingField(field);
  };

  const closeEditModal = () => {
    if (fieldSaving) return;
    setEditingField(null);
    setEditValue("");
  };

  /**
   * TikTok-style: Done on a field screen validates + writes to the server,
   * then returns to the edit profile list. No separate top-level Save required.
   */
  const saveFieldEdit = async () => {
    if (!editingField || fieldSaving) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const field = editingField;

    // Username
    if (field === "username") {
      const next = editValue.toLowerCase().replace(/[^a-z0-9._]/g, "");
      if (next === (originalData?.username || "")) {
        closeEditModal();
        return;
      }
      setFieldSaving(true);
      try {
        await persistUsername(next);
        setFormData((prev) => ({ ...prev, username: next }));
        setOriginalData((prev) => (prev ? { ...prev, username: next } : prev));
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                username: next,
                canChangeUsernameIn: 30,
                username_last_changed: new Date().toISOString(),
              }
            : prev,
        );
        await refetch?.();
        setEditingField(null);
        setEditValue("");
        flashStatus("Username updated.");
      } catch (err) {
        setErrorMsg(err.message || "Could not update username");
      } finally {
        setFieldSaving(false);
      }
      return;
    }

    // Name
    if (field === "name") {
      const next = String(editValue || "").trim().slice(0, 30);
      if (next === (originalData?.displayName || "")) {
        closeEditModal();
        return;
      }
      setFieldSaving(true);
      try {
        await persistNameAndBio({ displayName: next, bio: formData.bio });
        setFormData((prev) => ({ ...prev, displayName: next }));
        setOriginalData((prev) => (prev ? { ...prev, displayName: next } : prev));
        await refetch?.();
        setEditingField(null);
        setEditValue("");
        flashStatus("Name updated.");
      } catch (err) {
        setErrorMsg(err.message || "Could not update name");
      } finally {
        setFieldSaving(false);
      }
      return;
    }

    // Bio
    if (field === "bio") {
      const next = String(editValue || "").slice(0, 80);
      if (next === (originalData?.bio || "")) {
        closeEditModal();
        return;
      }
      setFieldSaving(true);
      try {
        await persistNameAndBio({
          displayName: formData.displayName,
          bio: next,
        });
        setFormData((prev) => ({ ...prev, bio: next }));
        setOriginalData((prev) => (prev ? { ...prev, bio: next } : prev));
        await refetch?.();
        setEditingField(null);
        setEditValue("");
        flashStatus("Bio updated.");
      } catch (err) {
        setErrorMsg(err.message || "Could not update bio");
      } finally {
        setFieldSaving(false);
      }
    }
  };

  /** Optional bulk save — keeps parity if user still taps top Save */
  const handleSave = async () => {
    setErrorMsg(null);
    setStatusMsg(null);

    const nameChanged =
      formData.displayName !== (originalData?.displayName || "");
    const bioChanged = formData.bio !== (originalData?.bio || "");
    const usernameChanged =
      formData.username.trim() !== (originalData?.username || "").trim();

    if (!nameChanged && !bioChanged && !usernameChanged) {
      window.location.href = "/profile";
      return;
    }

    setIsSubmitting(true);
    try {
      if (nameChanged || bioChanged) {
        await persistNameAndBio({
          displayName: formData.displayName,
          bio: formData.bio,
        });
      }

      if (usernameChanged && formData.username.trim().length >= 2) {
        await persistUsername(formData.username.trim());
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                username: formData.username.trim(),
                canChangeUsernameIn: 30,
              }
            : prev,
        );
      }

      saveCompletedRef.current = true;
      await refetch();
      window.location.href = `/profile?updated=${Date.now()}`;
    } catch (error) {
      console.error("Update profile error:", error);
      setErrorMsg(error.message || "Could not save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldConfig = editingField ? FIELD_CONFIG[editingField] : null;

  const fields = [
    {
      id: "name",
      label: "Name",
      value: formData.displayName,
      displayValue: formData.displayName || "Add name",
      isEmpty: !formData.displayName,
    },
    {
      id: "username",
      label: "Username",
      value: formData.username,
      displayValue: formData.username ? `@${formData.username}` : "Add username",
      isEmpty: !formData.username,
      subtitle:
        profileData?.canChangeUsernameIn > 0
          ? `Can change in ${profileData.canChangeUsernameIn}d`
          : null,
    },
    {
      id: "bio",
      label: "Bio",
      value: formData.bio,
      displayValue: formData.bio || "Add a bio",
      isEmpty: !formData.bio,
    },
  ];

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (window.location.href = "/profile")}
            className="text-white text-base hover:opacity-70 transition-opacity"
          >
            Cancel
          </button>
          <h1 className="text-white text-lg font-semibold">Edit profile</h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || uploading || fieldSaving}
            className="text-base font-semibold text-white hover:opacity-70 transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? "Saving" : "Done"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        {(errorMsg || statusMsg) && (
          <div
            className={`mx-4 mt-3 px-3 py-2.5 rounded-lg text-sm ${
              errorMsg
                ? "bg-red-500/15 text-red-300 border border-red-500/30"
                : "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
            }`}
          >
            {errorMsg || statusMsg}
          </div>
        )}

        <label className="block py-7 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
            onChange={handleImagePick}
            disabled={uploading || isSubmitting || fieldSaving}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt=""
                    className="w-full h-full object-cover"
                    key={formData.profileImage}
                  />
                ) : (
                  <span className="text-white text-4xl font-bold">
                    {(formData.displayName || user?.name || user?.email)
                      ?.charAt(0)
                      .toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-white/10 border-2 border-black flex items-center justify-center">
                <Camera size={16} color="white" />
              </div>
            </div>
            <p className="text-white/60 text-sm">
              {uploading ? "Uploading..." : "Change photo"}
            </p>
          </div>
        </label>

        <div>
          {fields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => openEditModal(field.id)}
              className="w-full flex items-center px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <span className="text-white text-base font-normal w-24">{field.label}</span>
              <div className="flex-1 mr-2 text-left">
                <p className={`text-base ${field.isEmpty ? "text-white/40" : "text-white"}`}>
                  {field.displayValue}
                </p>
                {field.subtitle && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle size={12} color="#F59E0B" />
                    <span className="text-[#F59E0B] text-xs">{field.subtitle}</span>
                  </div>
                )}
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
            </button>
          ))}
        </div>

        <div className="px-4 pt-6">
          <p className="text-white/40 text-sm text-center leading-relaxed">
            Changes save when you tap Done on each field. Username can be changed once every 30
            days. Public link: crestarhq.com/{formData.username || "yourname"}
          </p>
        </div>
      </div>

      {editingField !== null && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="sticky top-0 z-50 bg-black border-b border-white/10">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={fieldSaving}
                className="text-white text-base hover:opacity-70 disabled:opacity-40"
              >
                Cancel
              </button>
              <h1 className="text-white text-lg font-semibold">{fieldConfig?.label || ""}</h1>
              <button
                type="button"
                onClick={saveFieldEdit}
                disabled={fieldSaving}
                className="text-white text-base font-semibold hover:opacity-70 disabled:opacity-40"
              >
                {fieldSaving ? "Saving" : "Done"}
              </button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto p-4">
            {errorMsg && editingField && (
              <div className="mb-3 px-3 py-2.5 rounded-lg text-sm bg-red-500/15 text-red-300 border border-red-500/30">
                {errorMsg}
              </div>
            )}

            {editingField === "username" && (
              <div className="flex items-center border-b border-white pb-1">
                <span className="text-white/60 text-lg mr-1">@</span>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) =>
                    setEditValue(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                  }
                  placeholder={fieldConfig?.placeholder}
                  autoFocus
                  maxLength={fieldConfig?.maxLength}
                  disabled={fieldSaving}
                  className="flex-1 bg-transparent text-white text-lg py-3 outline-none placeholder:text-white/30"
                />
              </div>
            )}
            {editingField === "name" && (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={fieldConfig?.placeholder}
                autoFocus
                maxLength={fieldConfig?.maxLength}
                disabled={fieldSaving}
                className="w-full bg-transparent text-white text-lg border-b border-white py-3 outline-none placeholder:text-white/30"
              />
            )}
            {editingField === "bio" && (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={fieldConfig?.placeholder}
                autoFocus
                maxLength={fieldConfig?.maxLength}
                rows={4}
                disabled={fieldSaving}
                className="w-full bg-transparent text-white text-lg border-b border-white py-3 outline-none resize-none placeholder:text-white/30"
              />
            )}
            <p className="text-white/40 text-xs mt-2 text-right">
              {editValue.length}/{fieldConfig?.maxLength || 0}
            </p>
            {editingField === "username" && (
              <div className="mt-5">
                <p className="text-white/60 text-sm leading-relaxed">
                  Letters, numbers, periods, underscores. You can change your username once every 30
                  days.
                </p>
                {profileData?.canChangeUsernameIn > 0 && (
                  <div className="flex items-start gap-2 mt-3 bg-[#F59E0B]/10 p-3 rounded-lg border border-[#F59E0B]/20">
                    <AlertCircle size={16} color="#F59E0B" className="mt-0.5" />
                    <p className="text-[#F59E0B] text-sm flex-1">
                      You can change your username again in {profileData.canChangeUsernameIn} days
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

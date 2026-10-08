// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import { ArrowLeft, Camera, ChevronRight, AlertCircle, X } from "lucide-react";

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
  const { data: user, refetch } = useUser();
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
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!saveCompletedRef.current) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile/update");
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setProfileData(data.user);
          const initial = {
            username: data.user.username || user?.username || "",
            displayName:
              data.user.display_name || data.user.name || user?.name || "",
            bio: data.user.bio || "",
            profileImage: data.user.profile_image || null,
          };
          setFormData(initial);
          setOriginalData(initial);
          return;
        }
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
    }

    // Fallback: populate from the cached user object when API fails
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

  const hasChanges =
    originalData &&
    (formData.displayName !== originalData.displayName ||
      formData.username !== originalData.username ||
      formData.bio !== originalData.bio ||
      formData.profileImage !== originalData.profileImage);

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url, error } = await upload({ file });
    if (error) {
      alert("Upload Failed: " + error);
      return;
    }
    setFormData((prev) => ({ ...prev, profileImage: url }));
  };

  const openEditModal = (field) => {
    let value = "";
    if (field === "name") value = formData.displayName;
    else if (field === "username") value = formData.username;
    else if (field === "bio") value = formData.bio;

    setEditValue(value);
    setEditingField(field);
  };

  const closeEditModal = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveFieldEdit = () => {
    if (editingField === "name") {
      setFormData((prev) => ({ ...prev, displayName: editValue }));
    } else if (editingField === "username") {
      setFormData((prev) => ({ ...prev, username: editValue.toLowerCase() }));
    } else if (editingField === "bio") {
      setFormData((prev) => ({ ...prev, bio: editValue }));
    }
    closeEditModal();
  };

  const handleSave = async () => {
    if (!hasChanges) {
      window.history.back();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.displayName,
          bio: formData.bio,
          profileImage: formData.profileImage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      const usernameChanged =
        formData.username !== (originalData?.username || "");
      if (usernameChanged && formData.username.trim().length >= 2) {
        if (profileData?.canChangeUsernameIn > 0) {
          alert(
            `You can change your username again in ${profileData.canChangeUsernameIn} days.`,
          );
          setIsSubmitting(false);
          return;
        }

        const usernameRes = await fetch("/api/profile/update-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: formData.username }),
        });
        const usernameData = await usernameRes.json();
        if (!usernameRes.ok) {
          throw new Error(usernameData.error || "Failed to update username");
        }
      }

      saveCompletedRef.current = true;
      await refetch();
      window.location.href = "/profile";
    } catch (error) {
      console.error("Update profile error:", error);
      alert(error.message);
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
      displayValue: formData.username
        ? `@${formData.username}`
        : "Add username",
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-white/10 backdrop-blur-xl bg-opacity-95">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="text-white text-base hover:opacity-70 transition-opacity"
          >
            Cancel
          </button>

          <h1 className="text-white text-lg font-semibold">Edit profile</h1>

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className={`text-base font-semibold transition-opacity ${
              hasChanges ? "text-white" : "text-white/40"
            } ${isSubmitting ? "opacity-50" : "hover:opacity-70"}`}
          >
            {isSubmitting ? "Saving" : "Save"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto pb-24">
        {/* Profile Photo Section */}
        <label className="block py-7 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleImagePick}
            disabled={uploading}
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

        {/* Field Rows */}
        <div>
          {fields.map((field) => (
            <button
              key={field.id}
              onClick={() => openEditModal(field.id)}
              className="w-full flex items-center px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <span className="text-white text-base font-normal w-24">
                {field.label}
              </span>

              <div className="flex-1 mr-2 text-left">
                <p
                  className={`text-base ${
                    field.isEmpty ? "text-white/40" : "text-white"
                  }`}
                >
                  {field.displayValue}
                </p>
                {field.subtitle && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle size={12} color="#F59E0B" />
                    <span className="text-[#F59E0B] text-xs">
                      {field.subtitle}
                    </span>
                  </div>
                )}
              </div>

              <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
            </button>
          ))}
        </div>

        {/* Helpful info */}
        <div className="px-4 pt-6">
          <p className="text-white/40 text-sm text-center leading-relaxed">
            Your profile info is visible to everyone on Crestar. Changes to your
            name and bio take effect immediately.
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {editingField !== null && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Modal Header */}
          <div className="sticky top-0 z-50 bg-black border-b border-white/10">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={closeEditModal}
                className="text-white text-base hover:opacity-70 transition-opacity"
              >
                Cancel
              </button>

              <h1 className="text-white text-lg font-semibold">
                {fieldConfig?.label || ""}
              </h1>

              <button
                onClick={saveFieldEdit}
                className="text-white text-base font-semibold hover:opacity-70 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto p-4">
            {/* Username field with @ prefix */}
            {editingField === "username" && (
              <div className="flex items-center border-b border-white pb-1">
                <span className="text-white/60 text-lg mr-1">@</span>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) =>
                    setEditValue(
                      e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                    )
                  }
                  placeholder={fieldConfig?.placeholder}
                  autoFocus
                  maxLength={fieldConfig?.maxLength}
                  className="flex-1 bg-transparent text-white text-lg py-3 outline-none placeholder:text-white/30"
                />
              </div>
            )}

            {/* Name field */}
            {editingField === "name" && (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={fieldConfig?.placeholder}
                autoFocus
                maxLength={fieldConfig?.maxLength}
                className="w-full bg-transparent text-white text-lg border-b border-white py-3 outline-none placeholder:text-white/30"
              />
            )}

            {/* Bio field */}
            {editingField === "bio" && (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={fieldConfig?.placeholder}
                autoFocus
                maxLength={fieldConfig?.maxLength}
                rows={4}
                className="w-full bg-transparent text-white text-lg border-b border-white py-3 outline-none resize-none placeholder:text-white/30"
              />
            )}

            {/* Character count */}
            <p className="text-white/40 text-xs mt-2 text-right">
              {editValue.length}/{fieldConfig?.maxLength || 0}
            </p>

            {/* Username-specific help text */}
            {editingField === "username" && (
              <div className="mt-5">
                <p className="text-white/60 text-sm leading-relaxed">
                  Usernames can contain letters, numbers, periods, and
                  underscores. Usernames can only be changed once every 30 days.
                </p>
                {profileData?.canChangeUsernameIn > 0 && (
                  <div className="flex items-start gap-2 mt-3 bg-[#F59E0B]/10 p-3 rounded-lg border border-[#F59E0B]/20">
                    <AlertCircle size={16} color="#F59E0B" className="mt-0.5" />
                    <p className="text-[#F59E0B] text-sm flex-1">
                      You can change your username again in{" "}
                      {profileData.canChangeUsernameIn} days
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

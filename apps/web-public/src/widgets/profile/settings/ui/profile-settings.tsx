/**
 * @module widgets/profile/settings
 * @description Современная страница настроек профиля с AI-стилем UI/UX
 */

"use client";

import React, { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Camera,
  Check,
  Download,
  Eye,
  EyeOff,
  FileDown,
  Globe,
  Key,
  Facebook,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Phone,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User,
  UserCircle,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { useProfileOptionsQuery } from "@features/profile/complete-profile-info";
import { parseUtcIso, toUtcIsoString } from "@shared/lib/date";
import {
  useBodyScrollLock,
  useChangePasswordMutation,
  useConfirmEmailChangeMutation,
  useCurrentUserQuery,
  useDeleteAvatarMutation,
  useDeleteUserMutation,
  useEscapeKey,
  useRequestEmailChangeMutation,
  useSessionsQuery,
  useTerminateAllSessionsMutation,
  useTerminateSessionMutation,
  useUpdateUserMutation,
  useUploadAvatarMutation,
} from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import {
  cn,
  formatDateOfBirthForInput,
  getUserDisplayName,
  parseFullName,
  resolveAvatarUrl,
} from "@shared/lib/utils";
import {
  Button,
  Checkbox,
  CodeInput,
  Input,
  Label,
  PasswordStrength,
  Portal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@shared/ui";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@widgets/profile/layout";
import { ProfilePageHeader } from "@widgets/profile/page-header";

type SettingsTab = "profile" | "security" | "notifications" | "privacy";

const notifySuccess = (title: string, description?: string): void => {
  toast.success(title, { description });
};

const notifyError = (title: string, description?: string): void => {
  toast.error(title, { description });
};

/**
 * Определяет ОС и устройство по User-Agent
 */
function parseOS(
  ua: string,
  t: ReturnType<typeof useT>
): { os: string; device: string } {
  if (ua.includes("Windows")) {
    return { os: "Windows", device: t("public.profile.settingsPanel.devices.computer") };
  }
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) {
    return { os: "macOS", device: "Mac" };
  }
  if (ua.includes("Linux") && !ua.includes("Android")) {
    return { os: "Linux", device: t("public.profile.settingsPanel.devices.computer") };
  }
  if (ua.includes("Android")) {
    return { os: "Android", device: t("public.profile.settingsPanel.devices.smartphone") };
  }
  if (ua.includes("iPhone")) {
    return { os: "iOS", device: "iPhone" };
  }
  if (ua.includes("iPad")) {
    return { os: "iPadOS", device: "iPad" };
  }
  return {
    os: t("public.profile.settingsPanel.devices.os"),
    device: t("public.profile.settingsPanel.devices.unknownDevice"),
  };
}

/**
 * Определяет браузер по User-Agent
 */
function parseBrowser(ua: string, t: ReturnType<typeof useT>): string {
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return t("public.profile.settingsPanel.devices.browser");
}

/**
 * Парсинг User-Agent строки для получения информации об устройстве
 */
function parseUserAgent(
  ua: string,
  t: ReturnType<typeof useT>
): {
  device: string;
  browser: string;
  os: string;
} {
  const { os, device } = parseOS(ua, t);
  const browser = parseBrowser(ua, t);
  return { device, browser, os };
}

interface TabItem {
  id: SettingsTab;
  labelKey: string;
  icon: typeof Settings;
  descriptionKey: string;
}

const tabs: TabItem[] = [
  {
    id: "profile",
    labelKey: "public.profile.settingsPanel.tabs.profile",
    icon: User,
    descriptionKey: "public.profile.settingsPanel.tabs.profileDescription",
  },
  {
    id: "security",
    labelKey: "public.profile.settingsPanel.tabs.security",
    icon: Shield,
    descriptionKey: "public.profile.settingsPanel.tabs.securityDescription",
  },
  {
    id: "notifications",
    labelKey: "public.profile.settingsPanel.tabs.notifications",
    icon: Bell,
    descriptionKey: "public.profile.settingsPanel.tabs.notificationsDescription",
  },
  {
    id: "privacy",
    labelKey: "public.profile.settingsPanel.tabs.privacy",
    icon: Globe,
    descriptionKey: "public.profile.settingsPanel.tabs.privacyDescription",
  },
];

export function ProfileSettingsSection(): React.ReactNode {
  const t = useT();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { isLoading } = useCurrentUserQuery();

  if (isLoading) {
    return <SettingsSkeletonLoader />;
  }

  const tabItems: ProfileTabItem<SettingsTab>[] = tabs.map((tab) => ({
    id: tab.id,
    label: t(tab.labelKey),
    icon: tab.icon,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <ProfilePageHeader
        icon={Settings}
        eyebrow={t("public.profile.settingsPanel.badge")}
        title={t("public.profile.settingsPanel.title")}
        description={t("public.profile.settingsPanel.description")}
        bottom={
          <ProfileTabs<SettingsTab>
            items={tabItems}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel={t("public.profile.settingsPanel.tabsAria") ?? undefined}
          />
        }
      />

      <main className="min-w-0">
        <div
          key={activeTab}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6"
        >
          {activeTab === "profile" && (
            <ProfileTab onSuccess={notifySuccess} onError={notifyError} />
          )}
          {activeTab === "security" && (
            <SecurityTab onSuccess={notifySuccess} onError={notifyError} />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab onSuccess={notifySuccess} />
          )}
          {activeTab === "privacy" && <PrivacyTab onSuccess={notifySuccess} />}
        </div>
      </main>
    </div>
  );
}

/* ========== Skeleton Loader ========== */
function SettingsSkeletonLoader(): React.ReactNode {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded-lg bg-bone-300" />
        <div className="h-8 w-64 rounded-lg bg-bone-300" />
        <div className="h-4 w-96 rounded-lg bg-bone-300" />
      </div>
      <div className="flex gap-6">
        <div className="h-96 w-72 rounded-xl bg-bone-300" />
        <div className="h-96 flex-1 rounded-4xl bg-bone-300" />
      </div>
    </div>
  );
}

/* ========== Profile Tab ========== */
interface ProfileTabProps {
  onSuccess: (title: string, description?: string) => void;
  onError: (title: string, description?: string) => void;
}

function getInitialProfileFormData(
  user: ReturnType<typeof useCurrentUserQuery>["data"]
) {
  const parsed =
    user?.firstName != null && user?.lastName != null
      ? { firstName: user.firstName ?? "", lastName: user.lastName ?? "" }
      : parseFullName(user?.name ?? "");
  return {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    location: user?.location ?? "",
    linkedinUrl: user?.linkedinUrl ?? "",
    instagramUrl: user?.instagramUrl ?? "",
    facebookUrl: user?.facebookUrl ?? "",
    websiteUrl: user?.websiteUrl ?? "",
    gender: user?.gender ?? undefined,
    dateOfBirth: user?.dateOfBirth
      ? formatDateOfBirthForInput(user.dateOfBirth)
      : "",
    region: user?.region ?? "",
    languages: user?.languages ?? [],
    profileStatus: user?.profileStatus ?? undefined,
    workOrStudyPlace: user?.workOrStudyPlace ?? "",
    skills: user?.skills ?? [],
    specialization: user?.specialization ?? undefined,
    shortBio: user?.shortBio ?? "",
  };
}

type ProfileFormData = ReturnType<typeof getInitialProfileFormData>;

/** Синхронизирует состояние формы с данными user (при загрузке/обновлении). */
function useProfileFormData(
  user: ReturnType<typeof useCurrentUserQuery>["data"]
): [ProfileFormData, React.Dispatch<React.SetStateAction<ProfileFormData>>] {
  const [formData, setFormData] = useState<ProfileFormData>(() =>
    getInitialProfileFormData(user)
  );
  // eslint-disable-next-line no-restricted-syntax -- инкапсулировано в кастомный хук для синхронизации формы с user
  useEffect(() => {
    if (user) {
      setFormData(getInitialProfileFormData(user));
    }
  }, [user]);
  return [formData, setFormData];
}


function ProfileTab({ onSuccess, onError }: ProfileTabProps): React.ReactNode {
  const t = useT();
  const { data: user } = useCurrentUserQuery();
  const { data: profileOptions } = useProfileOptionsQuery();
  const [formData, setFormData] = useProfileFormData(user);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const avatar = resolveAvatarUrl(user?.avatarUrl);

  const updateMutation = useUpdateUserMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const deleteAvatarMutation = useDeleteAvatarMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsEditing(true);
  };

  const handleSelectChange =
    (field: keyof ProfileFormData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value || undefined }));
      setIsEditing(true);
    };

  const handleLanguagesToggle = (code: string) => {
    setFormData((prev) => {
      const current = prev.languages ?? [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { ...prev, languages: next };
    });
    setIsEditing(true);
  };

  const handleSkillToggle = (code: string) => {
    setFormData((prev) => {
      const current = prev.skills ?? [];
      let next: string[];
      if (current.includes(code)) {
        next = current.filter((c) => c !== code);
      } else if (current.length < 3) {
        next = [...current, code];
      } else {
        next = [...current.slice(1), code];
      }
      return { ...prev, skills: next };
    });
    setIsEditing(true);
  };

  const handleSubmit = () => {
    const { email: _email, ...rest } = formData;
    updateMutation.mutate(
      {
        firstName: rest.firstName || undefined,
        lastName: rest.lastName || undefined,
        phone: rest.phone || undefined,
        location: rest.location || undefined,
        linkedinUrl: rest.linkedinUrl || undefined,
        instagramUrl: rest.instagramUrl || undefined,
        facebookUrl: rest.facebookUrl || undefined,
        websiteUrl: rest.websiteUrl || undefined,
        gender: rest.gender,
        dateOfBirth: rest.dateOfBirth
          ? toUtcIsoString(rest.dateOfBirth)
          : undefined,
        region: rest.region || undefined,
        languages: rest.languages?.length ? rest.languages : undefined,
        profileStatus: rest.profileStatus,
        workOrStudyPlace: rest.workOrStudyPlace || undefined,
        skills: rest.skills?.length ? rest.skills : undefined,
        specialization: rest.specialization,
        shortBio: rest.shortBio || undefined,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          onSuccess(
            t("public.profile.settingsPanel.toasts.profileUpdated"),
            t("public.profile.settingsPanel.toasts.profileUpdatedDescription")
          );
        },
        onError: () => {
          onError(
            t("public.profile.settingsPanel.toasts.updateError"),
            t("public.profile.settingsPanel.toasts.updateErrorDescription")
          );
        },
      }
    );
  };

  const handleCancel = (): void => {
    setFormData(getInitialProfileFormData(user));
    setIsEditing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUploadAvatar(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadAvatar(file);
    }
  };

  const handleUploadAvatar = (file: File) => {
    // Проверка типа файла
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      onError(
        t("public.profile.settingsPanel.toasts.invalidImageFormat"),
        t("public.profile.settingsPanel.toasts.supportedImageFormats")
      );
      return;
    }
    // Проверка размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError(
        t("public.profile.settingsPanel.toasts.fileTooLarge"),
        t("public.profile.settingsPanel.toasts.maxFileSize")
      );
      return;
    }
    uploadAvatarMutation.mutate(file, {
      onSuccess: () => {
        onSuccess(
          t("public.profile.settingsPanel.toasts.photoUploaded"),
          t("public.profile.settingsPanel.toasts.avatarUpdated")
        );
      },
      onError: (error) => {
        onError(t("public.profile.settingsPanel.toasts.uploadError"), error.message);
      },
    });
  };

  const handleDeleteAvatar = () => {
    deleteAvatarMutation.mutate(undefined, {
      onSuccess: () => {
        onSuccess(
          t("public.profile.settingsPanel.toasts.photoDeleted"),
          t("public.profile.settingsPanel.toasts.avatarDeleted")
        );
      },
      onError: (error) => {
        onError(t("public.profile.settingsPanel.toasts.deleteError"), error.message);
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Avatar Section with Drag & Drop */}
      <section className="overflow-hidden rounded-xl border border-bone-300/60 bg-bone-50 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Avatar with enhanced styling */}
          <div
            className={cn(
              "relative transition-all duration-300",
              isDragging && "scale-105 ring-4 ring-ember-200 ring-offset-4"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {avatar ? (
              <Image
                src={avatar}
                alt={getUserDisplayName(user)}
                width={120}
                height={120}
                className="h-28 w-28 rounded-xl border-4 border-bone-50 object-cover shadow-xl ring-2 ring-ember-50"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-bone-300/60 bg-bone-200 text-ink-100">
                <User
                  className="h-14 w-14 text-bone-50 drop-shadow-lg"
                  aria-hidden
                />
              </div>
            )}
            <button
              type="button"
              className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-bone-50 bg-ember-400 text-bone-50 shadow-md transition-colors hover:bg-ember-500"
              aria-label={t("public.profile.settingsPanel.profile.changePhoto")}
            >
              <Camera className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-ink-400">
              {t("public.profile.settingsPanel.profile.photoTitle")}
            </h3>
            <p className="mt-1 text-sm text-ink-100">
              {t("public.profile.settingsPanel.profile.photoDescription")}
            </p>
            <p className="mt-0.5 text-xs text-ink-100">
              {t("public.profile.settingsPanel.profile.photoHint")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="primary"
                size="sm"
                leftIcon={
                  uploadAvatarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden />
                  )
                }
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
              >
                {uploadAvatarMutation.isPending
                  ? t("public.profile.settingsPanel.actions.uploading")
                  : t("public.profile.settingsPanel.actions.upload")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAvatar}
                disabled={deleteAvatarMutation.isPending || !user?.avatarUrl}
              >
                {deleteAvatarMutation.isPending
                  ? t("public.profile.settingsPanel.actions.deleting")
                  : t("actions.delete")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Info Form */}
      <section className="space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink-400">
            <UserCircle className="h-5 w-5 text-ember-400" aria-hidden />
            {t("public.profile.settingsPanel.profile.personalInfo")}
          </h3>
          <p className="mt-1 text-sm text-ink-100">
            {t("public.profile.settingsPanel.profile.personalInfoDescription")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <EnhancedFormField
            label={t("public.profile.settingsPanel.fields.firstName")}
            icon={User}
            placeholder={t("public.profile.settingsPanel.placeholders.firstName")}
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
          />
          <EnhancedFormField
            label={t("public.profile.settingsPanel.fields.lastName")}
            icon={User}
            placeholder={t("public.profile.settingsPanel.placeholders.lastName")}
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
          />

          <div className="group sm:col-span-2">
            <Label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
              <Mail className="h-4 w-4 text-ink-50" aria-hidden />
              {t("public.profile.settingsPanel.fields.email")}
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={formData.email}
                disabled
                className="flex-1"
              />
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowChangeEmail(true)}
                className="shrink-0"
              >
                {t("actions.edit")}
              </Button>
            </div>
          </div>

          <EnhancedFormField
            label={t("public.profile.settingsPanel.fields.phone")}
            icon={Phone}
            type="tel"
            placeholder="+998 90 123 45 67"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
          />

          <EnhancedFormField
            label={t("public.profile.settingsPanel.fields.city")}
            icon={Globe}
            placeholder={t("public.profile.settingsPanel.placeholders.city")}
            name="location"
            value={formData.location}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-400">
            <LinkIcon className="h-4 w-4 text-ember-400" aria-hidden />
            {t("public.profile.settingsPanel.profile.socials")}
            <span className="text-xs font-normal text-ink-50">
              {t("public.profile.settingsPanel.optional")}
            </span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <EnhancedFormField
              label="LinkedIn"
              icon={Linkedin}
              type="url"
              placeholder="https://linkedin.com/in/username"
              name="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={handleInputChange}
            />
            <EnhancedFormField
              label="Instagram"
              icon={Instagram}
              type="url"
              placeholder="https://instagram.com/username"
              name="instagramUrl"
              value={formData.instagramUrl}
              onChange={handleInputChange}
            />
            <EnhancedFormField
              label="Facebook"
              icon={Facebook}
              type="url"
              placeholder="https://facebook.com/username"
              name="facebookUrl"
              value={formData.facebookUrl}
              onChange={handleInputChange}
            />
            <EnhancedFormField
              label={t("public.profile.settingsPanel.fields.website")}
              icon={Globe}
              type="url"
              placeholder="https://example.com"
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Доп. информация (поля из popup «Заполните доп. поля») */}
        {profileOptions && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-400">
              <Calendar className="h-4 w-4 text-ember-400" aria-hidden />
              {t("public.profile.settingsPanel.profile.additionalInfo")}
              <span className="text-xs font-normal text-ink-50">
                {t("public.profile.settingsPanel.optional")}
              </span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.gender")}
                </Label>
                <Select
                  value={formData.gender ?? ""}
                  onValueChange={handleSelectChange("gender")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder={t("public.profile.settingsPanel.placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {profileOptions.genders.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.birthDate")}
                </Label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.region")}
                </Label>
                <Select
                  value={formData.region ?? ""}
                  onValueChange={handleSelectChange("region")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder={t("public.profile.settingsPanel.placeholders.region")} />
                  </SelectTrigger>
                  <SelectContent>
                    {profileOptions.regions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.languages")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {profileOptions.languages.map((lang) => {
                    // Бэк хранит RU-метки. Автонимы оставляем (Русский / O'zbek /
                    // English / Türkmen ...) — переводим только "Другой".
                    const displayLabel =
                      lang.code === "other"
                        ? t("public.profile.complete.languages.other")
                        : lang.label;
                    return (
                      <Label
                        key={lang.code}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-bone-300 bg-bone-50 px-4 py-2.5 text-sm transition hover:border-bone-400"
                      >
                        <Checkbox
                          checked={
                            formData.languages?.includes(lang.code) ?? false
                          }
                          onCheckedChange={() =>
                            handleLanguagesToggle(lang.code)
                          }
                        />
                        <span className="text-ink-300">{displayLabel}</span>
                      </Label>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.status")}
                </Label>
                <Select
                  value={formData.profileStatus ?? ""}
                  onValueChange={handleSelectChange("profileStatus")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder={t("public.profile.settingsPanel.placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {profileOptions.profileStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.workOrStudy")}
                </Label>
                <Input
                  type="text"
                  name="workOrStudyPlace"
                  value={formData.workOrStudyPlace}
                  onChange={handleInputChange}
                  placeholder={t("public.profile.settingsPanel.placeholders.workOrStudy")}
                />
              </div>
              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.skills")}
                </span>
                <p className="mb-2 text-xs text-ink-100">
                  {t("public.profile.settingsPanel.profile.skillsSelected", {
                    count: formData.skills?.length ?? 0,
                    max: 3,
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {profileOptions.skills.map((skill) => (
                    <Label
                      key={skill.code}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-bone-300 bg-bone-50 px-4 py-2.5 text-sm transition hover:border-bone-400"
                    >
                      <Checkbox
                        checked={formData.skills?.includes(skill.code) ?? false}
                        onCheckedChange={() => handleSkillToggle(skill.code)}
                      />
                      <span className="text-ink-300">{skill.label}</span>
                    </Label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.specialization")}
                </Label>
                <Select
                  value={formData.specialization ?? ""}
                  onValueChange={handleSelectChange("specialization")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder={t("public.profile.settingsPanel.placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {profileOptions.specializations.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.shortBio")}
                </Label>
                <Textarea
                  name="shortBio"
                  rows={3}
                  maxLength={150}
                  value={formData.shortBio}
                  onChange={handleInputChange}
                  placeholder={t("public.profile.settingsPanel.placeholders.shortBio")}
                  className="resize-none"
                />
                <p className="mt-1 text-xs text-ink-100">
                  {formData.shortBio?.length ?? 0} / 150
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons with enhanced styling */}
        <div className="flex justify-end gap-3 border-t border-bone-300/50 pt-6">
          {isEditing && (
            <Button
              variant="outline"
              size="md"
              onClick={handleCancel}
              className="border-bone-400 hover:bg-bone-100"
            >
              {t("actions.cancel")}
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!isEditing}
            isLoading={updateMutation.isPending}
            isSuccess={updateMutation.isSuccess}
            loadingLabel={t("public.profile.settingsPanel.actions.saving")}
            successLabel={t("actions.saved")}
            leftIcon={
              !updateMutation.isPending && !updateMutation.isSuccess ? (
                <Check className="h-4 w-4" />
              ) : undefined
            }
            className="shadow-lg shadow-ember-400/30 transition-all hover:shadow-xl hover:shadow-ember-400/40"
          >
            {t("public.profile.settingsPanel.actions.saveChanges")}
          </Button>
        </div>
      </section>

      {/* Change Email Modal */}
      {showChangeEmail && (
        <ChangeEmailModal
          currentEmail={user?.email || ""}
          onClose={() => setShowChangeEmail(false)}
          onSuccess={(newEmail) => {
            setFormData((prev) => ({ ...prev, email: newEmail }));
            onSuccess(
              t("public.profile.settingsPanel.toasts.emailChanged"),
              t("public.profile.settingsPanel.toasts.newEmail", { email: newEmail })
            );
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

/* ========== Security Tab ========== */
interface SessionsListProps {
  sessions:
    | Array<{
        id: string;
        userAgent: string;
        ipAddress: string;
        lastUsedAt: string;
        isCurrent: boolean;
      }>
    | undefined;
  isLoading: boolean;
  terminateSessionMutation: ReturnType<typeof useTerminateSessionMutation>;
  onSuccess: (title: string, description?: string) => void;
  onError: (title: string, description?: string) => void;
}

/**
 * Компонент для отображения списка сессий
 */
function SessionsList({
  sessions,
  isLoading,
  terminateSessionMutation,
  onSuccess,
  onError,
}: SessionsListProps): React.ReactNode {
  const t = useT();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-bone-300 bg-bone-50 p-5">
          <Loader2 className="h-5 w-5 animate-spin text-ember-400" />
          <span className="text-sm text-ink-100">
            {t("public.profile.settingsPanel.security.loadingSessions")}
          </span>
        </div>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="space-y-3">
        <EnhancedSessionItem
          device={t("public.profile.settingsPanel.security.currentDevice")}
          location={t("public.profile.settingsPanel.security.detecting")}
          browser={t("public.profile.settingsPanel.devices.browser")}
          isCurrentDevice
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const parsed = parseUserAgent(session.userAgent, t);
        const handleTerminate = !session.isCurrent
          ? (): void => {
              terminateSessionMutation.mutate(session.id, {
                onSuccess: () => {
                  onSuccess(t("public.profile.settingsPanel.toasts.sessionEnded"));
                },
                onError: (error) => {
                  onError(t("common.error"), error.message);
                },
              });
            }
          : undefined;

        return (
          <EnhancedSessionItem
            key={session.id}
            device={parsed.device}
            location={session.ipAddress}
            browser={`${parsed.browser} • ${parsed.os}`}
            lastActive={session.lastUsedAt}
            isCurrentDevice={session.isCurrent}
            onTerminate={handleTerminate}
            isTerminating={terminateSessionMutation.isPending}
          />
        );
      })}
    </div>
  );
}

interface SecurityTabProps {
  onSuccess: (title: string, description?: string) => void;
  onError: (title: string, description?: string) => void;
}


function SecurityTab({
  onSuccess,
  onError,
}: SecurityTabProps): React.ReactNode {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const deleteMutation = useDeleteUserMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const { data: sessions, isLoading: isLoadingSessions } = useSessionsQuery();
  const terminateSessionMutation = useTerminateSessionMutation();
  const terminateAllMutation = useTerminateAllSessionsMutation();

  const handleChangePassword = (): void => {
    if (newPassword !== confirmPassword) {
      onError(
        t("validation.passwordsDoNotMatch"),
        t("public.profile.settingsPanel.security.passwordMismatchHint")
      );
      return;
    }
    changePasswordMutation.mutate(
      {
        currentPassword,
        newPassword,
        confirmPassword,
      },
      {
        onSuccess: () => {
          onSuccess(
            t("public.profile.settingsPanel.toasts.passwordChanged"),
            t("public.profile.settingsPanel.toasts.passwordChangedDescription")
          );
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (error) => {
          onError(t("public.profile.settingsPanel.toasts.passwordChangeError"), error.message);
        },
      }
    );
  };

  const handleDeleteAccount = (): void => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        router.push(withLocalePath("/", locale));
      },
    });
  };

  const handleTerminateAllSessions = (): void => {
    terminateAllMutation.mutate(undefined, {
      onSuccess: () => {
        onSuccess(
          t("public.profile.settingsPanel.toasts.sessionsEnded"),
          t("public.profile.settingsPanel.toasts.sessionsEndedDescription")
        );
      },
      onError: (error) => {
        onError(t("common.error"), error.message);
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Change Password Section */}
      <section className="space-y-6 rounded-xl border border-bone-300/60 bg-bone-50 p-5 sm:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink-400">
            <Lock className="h-5 w-5 text-ember-400" aria-hidden />
            {t("public.profile.settingsPanel.security.changePassword")}
          </h3>
          <p className="mt-1 text-sm text-ink-100">
            {t("public.profile.settingsPanel.security.changePasswordDescription")}
          </p>
        </div>

        <div className="space-y-4">
          <EnhancedPasswordField
            label={t("public.profile.settingsPanel.fields.currentPassword")}
            placeholder={t("public.profile.settingsPanel.placeholders.currentPassword")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
          />

          <EnhancedPasswordField
            label={t("public.profile.settingsPanel.fields.newPassword")}
            placeholder={t("public.profile.settingsPanel.placeholders.newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            show={showNewPassword}
            onToggle={() => setShowNewPassword(!showNewPassword)}
          />

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="rounded-xl border border-forest-100/50 bg-bone-50/70 p-4">
              <PasswordStrength password={newPassword} showRequirements />
            </div>
          )}

          <EnhancedPasswordField
            label={t("public.profile.settingsPanel.fields.confirmPassword")}
            placeholder={t("public.profile.settingsPanel.placeholders.confirmPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleChangePassword}
          disabled={
            !currentPassword ||
            !newPassword ||
            !confirmPassword ||
            changePasswordMutation.isPending
          }
          leftIcon={
            changePasswordMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Key className="h-4 w-4" aria-hidden />
            )
          }
        >
          {changePasswordMutation.isPending
            ? t("public.profile.settingsPanel.actions.saving")
            : t("public.profile.settingsPanel.security.changePassword")}
        </Button>
      </section>

      <hr className="border-bone-300" />

      {/* 2FA Section */}
      <section className="space-y-4 rounded-xl border border-bone-300/60 bg-bone-50 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink-400">
              <Shield className="h-5 w-5 text-ember-400" aria-hidden />
              {t("public.profile.settingsPanel.security.twoFactor")}
            </h3>
            <p className="mt-1 text-sm text-ink-100">
              {t("public.profile.settingsPanel.security.twoFactorDescription")}
            </p>
          </div>
          <EnhancedToggleSwitch defaultChecked={false} />
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-bone-300 bg-bone-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
            <Smartphone className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink-400">Authenticator App</p>
            <p className="text-xs text-ink-100">
              {t("public.profile.settingsPanel.security.authenticatorApps")}
            </p>
          </div>
          <Button variant="outline" size="sm">
            {t("public.profile.settingsPanel.actions.configure")}
          </Button>
        </div>
      </section>

      <hr className="border-bone-300" />

      {/* Active Sessions */}
      <section className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink-400">
            <Smartphone className="h-5 w-5 text-ember-400" aria-hidden />
            {t("public.profile.settingsPanel.security.activeSessions")}
          </h3>
          <p className="mt-1 text-sm text-ink-100">
            {t("public.profile.settingsPanel.security.activeSessionsDescription")}
          </p>
        </div>

        <SessionsList
          sessions={sessions}
          isLoading={isLoadingSessions}
          terminateSessionMutation={terminateSessionMutation}
          onSuccess={onSuccess}
          onError={onError}
        />

        {sessions && sessions.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<LogOut className="h-4 w-4" aria-hidden />}
            onClick={handleTerminateAllSessions}
            disabled={terminateAllMutation.isPending}
          >
            {terminateAllMutation.isPending
              ? t("public.profile.settingsPanel.actions.ending")
              : t("public.profile.settingsPanel.security.endOtherSessions")}
          </Button>
        )}
      </section>

      <hr className="border-bone-300" />

      {/* Danger Zone */}
      <section className="space-y-4 rounded-xl border border-[var(--danger-soft)] bg-bone-50 p-5 sm:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--danger)]">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            {t("public.profile.settingsPanel.security.dangerZone")}
          </h3>
          <p className="mt-1 text-sm text-ink-100">
            {t("public.profile.settingsPanel.security.dangerZoneDescription")}
          </p>
        </div>

        <div className="flex items-start gap-4 rounded-lg border border-[var(--danger-soft)] bg-bone-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
            <Trash2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-ink-400">
              {t("public.profile.settingsPanel.security.deleteAccount")}
            </h4>
            <p className="mt-1 text-sm text-ink-100">
              {t("public.profile.settingsPanel.security.deleteAccountDescription")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t("public.profile.settingsPanel.security.deleteAccount")}
            </Button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

/* ========== Notifications Tab ========== */
interface NotificationsTabProps {
  onSuccess: (title: string) => void;
}

function NotificationsTab({
  onSuccess,
}: NotificationsTabProps): React.ReactNode {
  const t = useT();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [newsletter, setNewsletter] = useState(true);

  const handleSave = () => {
    onSuccess(t("public.profile.settingsPanel.toasts.settingsSaved"));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-ink-400">
          <Bell className="h-5 w-5 text-ember-400" aria-hidden />
          {t("public.profile.settingsPanel.notifications.title")}
        </h3>
        <p className="mt-1 text-sm text-ink-100">
          {t("public.profile.settingsPanel.notifications.description")}
        </p>
      </div>

      <div className="space-y-4">
        <NotificationOption
          icon={Mail}
          title={t("public.profile.settingsPanel.notifications.email")}
          description={t("public.profile.settingsPanel.notifications.emailDescription")}
          checked={emailNotifications}
          onChange={setEmailNotifications}
        />

        <NotificationOption
          icon={Bell}
          title={t("public.profile.settingsPanel.notifications.push")}
          description={t("public.profile.settingsPanel.notifications.pushDescription")}
          checked={pushNotifications}
          onChange={setPushNotifications}
        />

        <NotificationOption
          icon={Bell}
          title={t("public.profile.settingsPanel.notifications.reminders")}
          description={t("public.profile.settingsPanel.notifications.remindersDescription")}
          checked={eventReminders}
          onChange={setEventReminders}
        />

        <NotificationOption
          icon={Mail}
          title={t("public.profile.settingsPanel.notifications.newsletter")}
          description={t("public.profile.settingsPanel.notifications.newsletterDescription")}
          checked={newsletter}
          onChange={setNewsletter}
        />
      </div>

      <div className="border-t border-bone-300/50 pt-6">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          leftIcon={<Check className="h-4 w-4" aria-hidden />}
          className="shadow-lg shadow-ember-400/30"
        >
          {t("public.profile.settingsPanel.actions.saveSettings")}
        </Button>
      </div>
    </div>
  );
}

/* ========== Privacy Tab ========== */
interface PrivacyTabProps {
  onSuccess: (title: string) => void;
}

function PrivacyTab({ onSuccess }: PrivacyTabProps): React.ReactNode {
  const t = useT();
  const [profileVisibility, setProfileVisibility] = useState<
    "public" | "private"
  >("public");
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const handleSave = () => {
    onSuccess(t("public.profile.settingsPanel.toasts.privacyUpdated"));
  };

  const handleExportData = () => {
    onSuccess(t("public.profile.settingsPanel.toasts.exportStarted"));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-ink-400">
          <Globe className="h-5 w-5 text-ember-400" aria-hidden />
          {t("public.profile.settingsPanel.privacy.title")}
        </h3>
        <p className="mt-1 text-sm text-ink-100">
          {t("public.profile.settingsPanel.privacy.description")}
        </p>
      </div>

      {/* Profile Visibility */}
      <section className="space-y-4 rounded-xl border border-bone-300/60 bg-bone-50 p-5 sm:p-6">
        <h4 className="font-semibold text-ink-400">
          {t("public.profile.settingsPanel.privacy.profileVisibility")}
        </h4>
        <div className="space-y-3">
          <Label className="flex cursor-pointer items-center gap-4 rounded-lg border border-bone-300 bg-bone-50 p-4 transition-colors hover:border-ember-200">
            <input
              type="radio"
              name="visibility"
              checked={profileVisibility === "public"}
              onChange={() => setProfileVisibility("public")}
              className="h-5 w-5 cursor-pointer accent-ember-400"
            />
            <div className="flex-1">
              <p className="font-medium text-ink-400">
                {t("public.profile.settingsPanel.privacy.public")}
              </p>
              <p className="text-sm text-ink-100">
                {t("public.profile.settingsPanel.privacy.publicDescription")}
              </p>
            </div>
          </Label>

          <Label className="flex cursor-pointer items-center gap-4 rounded-lg border border-bone-300 bg-bone-50 p-4 transition-colors hover:border-ember-200">
            <input
              type="radio"
              name="visibility"
              checked={profileVisibility === "private"}
              onChange={() => setProfileVisibility("private")}
              className="h-5 w-5 cursor-pointer accent-ember-400"
            />
            <div className="flex-1">
              <p className="font-medium text-ink-400">
                {t("public.profile.settingsPanel.privacy.private")}
              </p>
              <p className="text-sm text-ink-100">
                {t("public.profile.settingsPanel.privacy.privateDescription")}
              </p>
            </div>
          </Label>
        </div>
      </section>

      {/* Contact Information Visibility */}
      <section className="space-y-4">
        <h4 className="font-semibold text-ink-400">
          {t("public.profile.settingsPanel.privacy.contactVisibility")}
        </h4>
        <NotificationOption
          icon={Mail}
          title={t("public.profile.settingsPanel.privacy.showEmail")}
          description={t("public.profile.settingsPanel.privacy.showEmailDescription")}
          checked={showEmail}
          onChange={setShowEmail}
        />
        <NotificationOption
          icon={Phone}
          title={t("public.profile.settingsPanel.privacy.showPhone")}
          description={t("public.profile.settingsPanel.privacy.showPhoneDescription")}
          checked={showPhone}
          onChange={setShowPhone}
        />
      </section>

      {/* Data Export */}
      <section className="space-y-4 rounded-xl border border-bone-300/60 bg-bone-50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-ember-400 to-ember-400 shadow-lg">
            <FileDown className="h-6 w-6 text-bone-50" aria-hidden />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-ink-400">
              {t("public.profile.settingsPanel.privacy.exportData")}
            </h4>
            <p className="mt-1 text-sm text-ink-100">
              {t("public.profile.settingsPanel.privacy.exportDataDescription")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              leftIcon={<Download className="h-4 w-4" aria-hidden />}
              onClick={handleExportData}
            >
              {t("public.profile.settingsPanel.privacy.exportDataAction")}
            </Button>
          </div>
        </div>
      </section>

      <div className="border-t border-bone-300/50 pt-6">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          leftIcon={<Check className="h-4 w-4" aria-hidden />}
          className="shadow-lg shadow-ember-400/30"
        >
          {t("public.profile.settingsPanel.actions.saveSettings")}
        </Button>
      </div>
    </div>
  );
}

/* ========== Helper Components ========== */

interface EnhancedFormFieldProps {
  label: string;
  icon: typeof User;
  placeholder: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  disabled?: boolean;
  hint?: string;
}

function EnhancedFormField({
  label,
  icon: Icon,
  placeholder,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  hint,
}: EnhancedFormFieldProps): React.ReactNode {
  return (
    <div className="group">
      <Label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
        <Icon
          className="h-4 w-4 text-ink-50 transition-colors group-focus-within:text-ember-400"
          aria-hidden
        />
        {label}
      </Label>
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
      {hint && <p className="mt-1.5 text-xs text-ink-50">{hint}</p>}
    </div>
  );
}

interface EnhancedPasswordFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
}

function EnhancedPasswordField({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
}: EnhancedPasswordFieldProps): React.ReactNode {
  const t = useT();

  return (
    <div className="group">
      <Label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-200">
        <Lock
          className="h-4 w-4 text-ink-50 transition-colors group-focus-within:text-ember-400"
          aria-hidden
        />
        {label}
      </Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="pr-12"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-50 transition hover:text-ink-100"
          aria-label={
            show
              ? t("public.auth.hidePassword")
              : t("public.auth.showPassword")
          }
        >
          {show ? (
            <EyeOff className="h-5 w-5" aria-hidden />
          ) : (
            <Eye className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

interface EnhancedToggleSwitchProps {
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

function EnhancedToggleSwitch({
  defaultChecked = false,
  onChange,
}: EnhancedToggleSwitchProps): React.ReactNode {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={handleToggle}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-all duration-300",
        isChecked
          ? "bg-linear-to-r from-ember-400 to-ember-300 shadow-lg shadow-ember-400/30"
          : "bg-bone-300"
      )}
    >
      <span
        className={cn(
          "absolute left-1 top-1 h-5 w-5 rounded-full bg-bone-50 shadow-md transition-all duration-300",
          isChecked && "translate-x-5"
        )}
      />
    </button>
  );
}

interface NotificationOptionProps {
  icon: typeof Bell;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationOption({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: NotificationOptionProps): React.ReactNode {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-bone-300 bg-bone-50 p-5 shadow-sm transition-all hover:border-ember-100 hover:shadow-md">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-all",
          checked
            ? "bg-linear-to-br from-ember-400 to-ember-300 shadow-lg shadow-ember-400/20"
            : "bg-bone-200"
        )}
      >
        <Icon
          className={cn("h-6 w-6", checked ? "text-bone-50" : "text-ink-50")}
          aria-hidden
        />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-ink-400">{title}</p>
        <p className="text-sm text-ink-100">{description}</p>
      </div>
      <EnhancedToggleSwitch defaultChecked={checked} onChange={onChange} />
    </div>
  );
}

interface EnhancedSessionItemProps {
  device: string;
  location: string;
  browser: string;
  isCurrentDevice: boolean;
  lastActive?: string;
  onTerminate?: () => void;
  isTerminating?: boolean;
}

function EnhancedSessionItem({
  device,
  location,
  browser,
  isCurrentDevice,
  lastActive,
  onTerminate,
  isTerminating,
}: EnhancedSessionItemProps): React.ReactNode {
  const locale = useLocale();
  const t = useT();
  const formatLastActive = (dateString?: string): string => {
    if (!dateString) return "";
    const date = parseUtcIso(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("public.profile.settingsPanel.time.justNow");
    if (diffMins < 60) {
      return t("public.profile.settingsPanel.time.minutesAgo", { count: diffMins });
    }
    if (diffHours < 24) {
      return t("public.profile.settingsPanel.time.hoursAgo", { count: diffHours });
    }
    if (diffDays < 7) {
      return t("public.profile.settingsPanel.time.daysAgo", { count: diffDays });
    }
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: undefined,
    }).format(date);
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-bone-300 bg-linear-to-r from-bone-50 to-bone-100/30 p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ember-50 bg-linear-to-br from-ember-50 to-bone-50">
        <Smartphone className="h-6 w-6 text-ember-400" aria-hidden />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-ink-400">{device}</p>
          {isCurrentDevice && (
            <span className="rounded-full bg-linear-to-r from-forest-500 to-forest-400 px-2.5 py-1 text-[10px] font-semibold text-bone-50 shadow-md">
              {t("public.profile.settingsPanel.security.current")}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-100">
          {browser} • {location}
          {lastActive &&
            !isCurrentDevice &&
            ` • ${formatLastActive(lastActive)}`}
        </p>
      </div>
      {!isCurrentDevice && onTerminate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onTerminate}
          disabled={isTerminating}
        >
          {isTerminating
            ? t("public.profile.settingsPanel.actions.signingOut")
            : t("public.navigation.logout")}
        </Button>
      )}
    </div>
  );
}

/* ========== Change Email Modal ========== */
interface ChangeEmailModalProps {
  currentEmail: string;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
  onError: (title: string, description?: string) => void;
}

type ChangeEmailStep = "request" | "confirm";


function ChangeEmailModal({
  currentEmail,
  onClose,
  onSuccess,
  onError,
}: ChangeEmailModalProps): React.ReactNode {
  const t = useT();
  const [step, setStep] = useState<ChangeEmailStep>("request");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [localError, setLocalError] = useState("");

  const requestMutation = useRequestEmailChangeMutation();
  const confirmMutation = useConfirmEmailChangeMutation();

  useBodyScrollLock({ enabled: true });
  useEscapeKey({ enabled: true, onEscape: onClose });

  const handleRequestChange = (): void => {
    if (!newEmail || !currentPassword) {
      onError(t("public.profile.settingsPanel.validation.fillAllFields"));
      return;
    }

    if (newEmail === currentEmail) {
      onError(t("public.profile.settingsPanel.validation.sameEmail"));
      return;
    }

    requestMutation.mutate(
      { newEmail, password: currentPassword },
      {
        onSuccess: () => {
          setStep("confirm");
        },
        onError: (error) => {
          onError(t("common.error"), error.message);
        },
      }
    );
  };

  const handleConfirmChange = (): void => {
    const codeString = code.join("");
    if (codeString.length !== 6) {
      setLocalError(t("public.auth.enterSixDigits"));
      return;
    }

    setLocalError("");
    confirmMutation.mutate(
      { code: codeString, newEmail },
      {
        onSuccess: (response) => {
          onSuccess(response.newEmail);
          onClose();
        },
        onError: (error) => {
          setLocalError(error.message);
        },
      }
    );
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-400/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-email-title"
      >
        <div
          className="relative w-full max-w-md animate-in zoom-in-95 rounded-xl border border-bone-300 bg-bone-50 p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-ink-50 transition hover:bg-bone-200 hover:text-ink-100"
            aria-label={t("actions.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-ember-400 to-ember-300 shadow-xl shadow-ember-400/30">
              <Mail className="h-8 w-8 text-bone-50" aria-hidden />
            </div>
            <h3
              id="change-email-title"
              className="mt-4 text-xl font-bold text-ink-400"
            >
              {step === "request"
                ? t("public.profile.settingsPanel.email.changeTitle")
                : t("public.profile.settingsPanel.email.confirmTitle")}
            </h3>
            <p className="mt-2 text-sm text-ink-100">
              {step === "request"
                ? t("public.profile.settingsPanel.email.changeDescription")
                : `${t("public.auth.codeSentTo")} ${newEmail}`}
            </p>
          </div>

          {step === "request" ? (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.currentEmail")}
                </Label>
                <Input
                  type="email"
                  value={currentEmail}
                  disabled
                />
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.newEmail")}
                </Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                />
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold text-ink-200">
                  {t("public.profile.settingsPanel.fields.currentPassword")}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("public.profile.settingsPanel.placeholders.password")}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-50 hover:text-ink-100"
                    aria-label={
                      showPassword
                        ? t("public.auth.hidePassword")
                        : t("public.auth.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="mt-4 w-full shadow-lg shadow-ember-400/30"
                onClick={handleRequestChange}
                disabled={
                  requestMutation.isPending || !newEmail || !currentPassword
                }
              >
                {requestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("public.auth.sending")}
                  </>
                ) : (
                  t("public.auth.sendCode")
                )}
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex justify-center">
                <CodeInput
                  code={code}
                  onChange={(newCode) => {
                    setCode(newCode);
                    setLocalError("");
                  }}
                  error={localError}
                />
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full shadow-lg shadow-ember-400/30"
                onClick={handleConfirmChange}
                disabled={
                  confirmMutation.isPending || code.join("").length !== 6
                }
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("public.profile.settingsPanel.actions.confirming")}
                  </>
                ) : (
                  t("actions.confirm")
                )}
              </Button>

              <button
                type="button"
                onClick={() => setStep("request")}
                className="w-full text-center text-sm text-ink-100 hover:text-ember-500"
              >
                {t("public.profile.settingsPanel.email.backToChange")}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

interface DeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function DeleteConfirmModal({
  onConfirm,
  onCancel,
  isLoading,
}: DeleteConfirmModalProps): React.ReactNode {
  const t = useT();
  const [confirmText, setConfirmText] = useState("");
  const confirmationWord = t("public.profile.settingsPanel.delete.confirmationWord");
  const isConfirmValid = confirmText === confirmationWord;

  // Блокируем скролл body и добавляем обработчик ESC
  useBodyScrollLock({ enabled: true });
  useEscapeKey({ enabled: true, onEscape: onCancel });

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-400/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div
          className="relative w-full max-w-md animate-in zoom-in-95 rounded-xl border-2 border-[var(--danger-soft)] bg-bone-50 p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-full p-2 text-ink-50 transition hover:bg-bone-200 hover:text-ink-100"
            aria-label={t("actions.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-[var(--danger)] to-ember-400 shadow-xl shadow-[var(--danger)]/30">
              <AlertTriangle className="h-10 w-10 text-bone-50" aria-hidden />
            </div>
            <h3
              id="delete-modal-title"
              className="mt-6 text-2xl font-bold text-ink-400"
            >
              {t("public.profile.settingsPanel.delete.title")}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-100">
              {t("public.profile.settingsPanel.delete.description")}
            </p>
          </div>

          <div className="mt-6">
            <Label className="text-sm font-semibold text-ink-200">
              {t("public.profile.settingsPanel.delete.typePrefix")}{" "}
              <span className="font-bold text-[var(--danger)]">{confirmationWord}</span>{" "}
              {t("public.profile.settingsPanel.delete.typeSuffix")}
            </Label>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-3 font-medium focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12),0_1px_2px_rgba(0,0,0,0.04)]"
              placeholder={t("public.profile.settingsPanel.delete.placeholder", {
                word: confirmationWord,
              })}
            />
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={onCancel}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1 bg-linear-to-r from-[var(--danger)] to-[var(--danger)] shadow-lg shadow-[var(--danger)]/30 hover:shadow-xl hover:shadow-[var(--danger)]/40"
              onClick={onConfirm}
              disabled={!isConfirmValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("public.profile.settingsPanel.actions.deleting")}
                </>
              ) : (
                t("public.profile.settingsPanel.security.deleteAccount")
              )}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

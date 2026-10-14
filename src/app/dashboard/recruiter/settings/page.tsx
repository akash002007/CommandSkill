"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Shield,
  Bell,
  Building,
  Lock,
  User,
  Key,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  LogOut,
  ArrowLeftRight,
  Moon,
  Sun,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function RecruiterSettingsPage() {
  const router = useRouter();
  const { user, switchRole, logout } = useAuth();
  const { success, info } = useToast();

  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "security">("account");

  // Account State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification toggles
  const [notifyApps, setNotifyApps] = useState(true);
  const [notifyShortlist, setNotifyShortlist] = useState(true);
  const [notifyInterviews, setNotifyInterviews] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      info("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      info("Passwords do not match.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    success("Security credentials updated successfully!");
  };

  const handleToggle2FA = () => {
    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    if (next) {
      success("Two-factor authentication (2FA) enabled.");
    } else {
      info("Two-factor authentication disabled.");
    }
  };

  const handleRoleSwitch = async () => {
    const res = await switchRole("student");
    window.location.href = res?.redirectUrl || "/dashboard";
  };

  return (
    <RoleGuard allowedRole="recruiter">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Workspace Preferences</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Recruiter Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage account security, hiring notification alerts, and organization preferences.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          {[
            { id: "account", label: "Account & Profile", icon: User },
            { id: "security", label: "Security & 2FA", icon: Lock },
            { id: "notifications", label: "Hiring Alerts", icon: Bell },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Account */}
        {activeTab === "account" && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span>Employer Account Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Logged in as:</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{user?.name}</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Work Email:</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{user?.email}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/dashboard/recruiter/profile")}
                >
                  Go to Recruiter Profile &rarr;
                </Button>
              </div>
            </div>

            {/* Quick Perspective Switching Card */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                <span>Role Switcher (Student / Recruiter)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Switch instantly between the Recruiter Suite and the Student Workspace preview.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  onClick={handleRoleSwitch}
                  className="cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-2" />
                  Switch to Student Workspace
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <form onSubmit={handleSavePassword} className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                <span>Change Password</span>
              </h3>
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="gradient" size="sm">
                  Update Password
                </Button>
              </div>
            </form>

            <div className="p-6 rounded-2xl border border-border bg-card flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>Two-Factor Authentication (2FA)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Protect your recruiting dashboard with biometric or authenticator app prompts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggle2FA}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  twoFactorEnabled ? "bg-blue-600" : "bg-muted border border-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    twoFactorEnabled ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Notifications */}
        {activeTab === "notifications" && (
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" />
              <span>Hiring Activity Notifications</span>
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "New Student Applications",
                  desc: "Get notified when a verified student submits an application to your listing.",
                  state: notifyApps,
                  setter: setNotifyApps,
                },
                {
                  label: "Shortlisted Candidate Updates",
                  desc: "Alerts when a bookmarked student updates their resume, CGPA, or skills.",
                  state: notifyShortlist,
                  setter: setNotifyShortlist,
                },
                {
                  label: "Interview Reminders & Confirms",
                  desc: "Calendar reminders 1 hour before scheduled candidate evaluations.",
                  state: notifyInterviews,
                  setter: setNotifyInterviews,
                },
                {
                  label: "Direct Candidate Messages",
                  desc: "Instant alerts when an applicant replies to your outreach message.",
                  state: notifyMessages,
                  setter: setNotifyMessages,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => item.setter(!item.state)}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      item.state ? "bg-blue-600" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        item.state ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={() => success("Notification preferences updated!")}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

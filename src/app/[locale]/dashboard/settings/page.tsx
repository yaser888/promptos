"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";

const settingsSections = [
  { id: "profile", title: "Profile", icon: User, description: "Manage your personal information" },
  { id: "notifications", title: "Notifications", icon: Bell, description: "Configure how you receive notifications" },
  { id: "security", title: "Security", icon: Shield, description: "Password and authentication settings" },
  { id: "appearance", title: "Appearance", icon: Palette, description: "Customize your experience" },
  { id: "language", title: "Language & Region", icon: Globe, description: "Set your preferred language and timezone" },
  { id: "devices", title: "Devices", icon: Smartphone, description: "Manage connected devices" },
];

interface MeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setUser(data.user);
      setForm({ name: data.user.name || "", email: data.user.email || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save profile");
      }
      const data = await res.json();
      setUser((prev) => (prev ? { ...prev, ...data.user } : prev));
      setNotice("Profile updated successfully");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-charcoal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card glass className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-charcoal-300 mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchProfile}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-100">Settings</h1>
        <p className="text-charcoal-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {notice && (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-900/60 px-4 py-2.5 text-sm text-charcoal-300">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-1">
          {settingsSections.map((section) => (
            <div
              key={section.id}
              className="flex items-start gap-3 w-full px-3 py-2.5 text-sm rounded-lg text-charcoal-400 hover:bg-charcoal-800/50 transition-all text-start"
            >
              <section.icon className="h-4 w-4 mt-0.5" />
              <div>
                <p className="text-charcoal-300">{section.title}</p>
                <p className="text-xs text-charcoal-600 mt-0.5">{section.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card glass>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="Role"
                  value={user?.role || ""}
                  disabled
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <div className="pt-2">
                <Button variant="primary" loading={saving} onClick={saveProfile}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card glass>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-charcoal-500">
                Password management requires an authentication provider (Clerk keys). In demo mode, authentication is handled by the demo session.
              </p>
              <div className="pt-1">
                <Button variant="secondary" onClick={() => setNotice("Password change requires Clerk authentication keys to be configured.")}>
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

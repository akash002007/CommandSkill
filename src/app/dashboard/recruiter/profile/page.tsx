"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Building,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Globe,
  Edit,
  ShieldCheck,
  Award,
  Calendar,
  Layers,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { RecruiterProfile } from "@/types";

export default function RecruiterProfilePage() {
  const { user, updateRecruiterProfile } = useAuth();
  const { recruiterInternships, recruiterInterviews, recruiterCompany } = useData();
  const { success } = useToast();

  const recruiter = user as RecruiterProfile;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit fields
  const [name, setName] = useState(recruiter?.name || "Barun");
  const [title, setTitle] = useState(recruiter?.title || "University Talent Lead");
  const [department, setDepartment] = useState(recruiter?.department || "University Talent & Early Career");
  const [phone, setPhone] = useState(recruiter?.phone || "+1 (415) 890-2134");
  const [location, setLocation] = useState(recruiter?.location || "San Francisco, CA");
  const [bio, setBio] = useState(
    recruiter?.bio ||
      "Hiring exceptional student engineers, product designers, and distributed systems builders for Stripe's 2026 Summer Internship cohort."
  );

  const handleOpenEdit = () => {
    setName(recruiter?.name || "");
    setTitle(recruiter?.title || "");
    setDepartment(recruiter?.department || "");
    setPhone(recruiter?.phone || "");
    setLocation(recruiter?.location || "");
    setBio(recruiter?.bio || "");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateRecruiterProfile({
      name,
      title,
      department,
      phone,
      location,
      bio,
    });
    setIsEditModalOpen(false);
    success("Recruiter profile updated successfully!");
  };

  return (
    <RoleGuard allowedRole="recruiter">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <Avatar
                src={recruiter?.avatar}
                name={recruiter?.name || "Barun"}
                size="xl"
                className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-blue-500/20"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                    {recruiter?.name || "Barun"}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-blue-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {recruiter?.verificationStatus || "Recruiter Verified"}
                  </span>
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {recruiter?.title || "University Talent Lead"} &bull; {recruiter?.department || "Early Career Programs"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-3">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-blue-500" />
                    {recruiter?.company || "Stripe"}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {recruiter?.location || "San Francisco, CA"}
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </div>

          {/* Bio */}
          {recruiter?.bio && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed p-4 rounded-2xl bg-muted/40 border border-border/60">
              {recruiter.bio}
            </p>
          )}

          {/* Hiring Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
              <div className="text-lg sm:text-2xl font-extrabold text-foreground">
                {recruiterInternships.filter((i) => i.status === "Active").length}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Active Listings
              </div>
            </div>
            <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
              <div className="text-lg sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {recruiter?.candidatesReviewed || 1420}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Candidates Reviewed
              </div>
            </div>
            <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
              <div className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {recruiterInterviews.length}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Interviews Scheduled
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Organization Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <span>Contact Credentials</span>
            </h3>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <span className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Work Email:
                </span>
                <span className="font-semibold text-foreground">{recruiter?.email || "barun@stripe.com"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <span className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  Phone Number:
                </span>
                <span className="font-semibold text-foreground">{recruiter?.phone || "+1 (415) 890-2134"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  Department:
                </span>
                <span className="font-semibold text-foreground">{recruiter?.department || "University Talent"}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-500" />
                <span>Associated Company</span>
              </h3>
              <Link
                href="/dashboard/recruiter/company"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View Profile <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <span>Organization:</span>
                <span className="font-semibold text-foreground">{recruiterCompany.name}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <span>Industry:</span>
                <span className="font-semibold text-foreground">{recruiterCompany.industry}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <span>Company Size:</span>
                <span className="font-semibold text-foreground">{recruiterCompany.companySize}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Recruiter Profile"
          description="Update your personal recruiter and contact details."
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Job Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Input
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Bio & Hiring Mission
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}

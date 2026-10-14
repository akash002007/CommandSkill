"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Send,
  Users2,
  GitPullRequest,
  User,
  Bell,
  Link2,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Shield,
  GraduationCap,
  PlusCircle,
  BarChart3,
  Building2,
  Search,
  Bookmark,
  Video,
  Settings,
  Flag,
  FileText,
  Users,
  Sun,
  Moon,
  Laptop,
  ArrowLeftRight,
  Dna,
  UserCheck,
  Layers,
  Award,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useTheme } from "@/context/ThemeContext";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { isStudentVerified } from "@/lib/student-access-policy";
import { useSidebar } from "@/context/SidebarContext";

export interface CommandSkillSidebarProps {
  role?: UserRole;
  className?: string;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  badgeVariant?: "purple" | "emerald" | "blue" | "lavender" | "rose";
}

interface NavGroup {
  groupLabel?: string;
  collapsible?: boolean;
  collapseKey?: string;
  items: NavItem[];
}

export function CommandSkillSidebar({
  role: overrideRole,
  className,
  isMobileDrawerOpen: propIsMobileDrawerOpen,
  onCloseMobileDrawer: propOnCloseMobileDrawer,
  isCollapsed: propIsCollapsed,
  onToggleCollapse: propOnToggleCollapse,
}: CommandSkillSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role: authRole, logout, switchRole } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const sidebarCtx = useSidebar();

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : sidebarCtx.isSidebarCollapsed;
  const toggleCollapse = propOnToggleCollapse || sidebarCtx.toggleSidebarCollapse;
  const isMobileDrawerOpen = propIsMobileDrawerOpen !== undefined ? propIsMobileDrawerOpen : sidebarCtx.isMobileDrawerOpen;
  const onCloseMobileDrawer = propOnCloseMobileDrawer || sidebarCtx.closeMobileDrawer;

  const rawRole = (overrideRole || authRole || "STUDENT").toUpperCase();
  const activeRole: UserRole = (rawRole === "ADMIN" ? "PLATFORM_ADMIN" : rawRole) as UserRole;
  
  // Map roles to the 4 visual Workspaces
  const isCollegeWorkspace = ["COLLEGE_ADMIN", "COLLEGE_PLACEMENT_OFFICER"].includes(activeRole) || pathname.startsWith("/college") || pathname.startsWith("/dashboard/college");
  const isAdminWorkspace = !isCollegeWorkspace && ["ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN", "VERIFICATION_OFFICER"].includes(activeRole);
  const isRecruiterWorkspace = !isCollegeWorkspace && !isAdminWorkspace && (["RECRUITER", "COMPANY_ADMIN"].includes(activeRole) || pathname.startsWith("/dashboard/recruiter"));
  const isStudentWorkspace = !isCollegeWorkspace && !isAdminWorkspace && !isRecruiterWorkspace;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Load saved group collapse states on mount
  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem("commandskill_sidebar_groups_collapsed");
      if (savedGroups !== null) {
        setCollapsedGroups(JSON.parse(savedGroups));
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("commandskill_sidebar_groups_collapsed", JSON.stringify(next));
      } catch {
        // Ignore localStorage error
      }
      return next;
    });
  };

  const {
    unreadNotificationsCount,
    applications,
    conversations,
    recruiterInternships,
    recruiterApplicants,
    recruiterConversations,
    unreadRecruiterNotificationsCount,
    recruiterStudents,
  } = useData();

  // Student metrics
  const unreadMessagesCount = conversations.filter((c) => c.lastMessage.isUnread).length;
  const activeApplicationsCount = applications.filter(
    (a) => a.status !== "Rejected" && a.status !== "Selected"
  ).length;

  // Recruiter metrics
  const unreadRecruiterMessagesCount = recruiterConversations.filter(
    (c) => c.lastMessage.isUnread
  ).length;
  const pendingApplicantsCount = recruiterApplicants.filter(
    (a) => a.status === "Applied" || a.status === "Under Review"
  ).length;
  const activeRecruiterListingsCount = recruiterInternships.filter(
    (i) => i.status === "Active"
  ).length;
  const shortlistedStudentsCount = recruiterStudents.filter((s) => s.isShortlisted).length;

  // Role Navigation Configurations with Groups
  const isVerified = isStudentVerified(user);

  const studentNavGroups: NavGroup[] = [
    {
      groupLabel: "RECRUITMENT PORTAL",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        {
          label: "Recruitment Drives",
          href: "/dashboard/drives",
          icon: Briefcase,
          badge: isVerified ? "Open" : "🔒 Locked",
          badgeVariant: isVerified ? "purple" : "rose",
        },
        {
          label: "My Applications",
          href: "/dashboard/applications",
          icon: GitPullRequest,
          badge: isVerified
            ? activeApplicationsCount > 0
              ? `${activeApplicationsCount} Active`
              : null
            : "🔒 Locked",
          badgeVariant: isVerified ? "blue" : "rose",
        },
        {
          label: "Assessments",
          href: "/dashboard/assessments",
          icon: FileText,
        },
        {
          label: "Interviews",
          href: "/dashboard/interviews",
          icon: Video,
        },
        {
          label: "Results & Merit",
          href: "/dashboard/results",
          icon: Award,
        },
        {
          label: "Internships",
          href: "/dashboard/internships",
          icon: Layers,
          badge: isVerified ? null : "🔒 Locked",
          badgeVariant: "rose",
        },
      ],
    },
    {
      groupLabel: "PROFILE & COMMUNITY",
      items: [
        {
          label: "Career DNA",
          href: "/dashboard/career-dna",
          icon: Dna,
          badge: isVerified ? null : "🔒 Locked",
          badgeVariant: "rose",
        },
        {
          label: "Documents",
          href: "/dashboard/documents",
          icon: FileCheck,
          badge: isVerified ? "Verified" : "Allowed",
          badgeVariant: "emerald",
        },
        { label: "Communities", href: "/dashboard/communities", icon: Users2 },
        {
          label: "Profile",
          href: "/dashboard/profile",
          icon: User,
          badge: "85%",
          badgeVariant: "lavender",
        },
      ],
    },
    {
      groupLabel: "SYSTEM",
      items: [
        {
          label: "My Reports",
          href: "/dashboard/reports",
          icon: Flag,
        },
        {
          label: "Notifications",
          href: "/dashboard/notifications",
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
          badgeVariant: "rose",
        },
        {
          label: "Connected Accounts",
          href: "/dashboard/connected-accounts",
          icon: Link2,
          badge: isVerified ? null : "🔒 Locked",
          badgeVariant: "rose",
        },
      ],
    },
  ];

  const recruiterNavGroups: NavGroup[] = [
    {
      groupLabel: "RECRUITMENT WORKFLOW",
      items: [
        { label: "Overview", href: "/dashboard/recruiter", icon: LayoutDashboard },
        {
          label: "Recruitment Drives",
          href: "/dashboard/recruiter/drives",
          icon: Briefcase,
          badge: activeRecruiterListingsCount > 0 ? `${activeRecruiterListingsCount} Active` : null,
          badgeVariant: "blue",
        },
        {
          label: "Applications",
          href: "/dashboard/recruiter/applications",
          icon: GitPullRequest,
          badge: pendingApplicantsCount > 0 ? `${pendingApplicantsCount}` : null,
          badgeVariant: "emerald",
        },
        {
          label: "Screening & Eligibility",
          href: "/dashboard/recruiter/screening",
          icon: UserCheck,
        },
        {
          label: "Selection Pipeline",
          href: "/dashboard/recruiter/selection",
          icon: Layers,
        },
        {
          label: "Assessments",
          href: "/dashboard/recruiter/assessments",
          icon: FileText,
          badge: "Proctored",
          badgeVariant: "purple",
        },
        {
          label: "Interviews",
          href: "/dashboard/recruiter/interviews",
          icon: Video,
        },
        {
          label: "Results & Merit",
          href: "/dashboard/recruiter/results",
          icon: Award,
          badge: "Published",
          badgeVariant: "purple",
        },
      ],
    },
    {
      groupLabel: "TALENT & SOURCING",
      collapsible: true,
      collapseKey: "talent_and_sourcing",
      items: [
        {
          label: "Talent Discovery",
          href: "/dashboard/recruiter/students",
          icon: Search,
          badge: shortlistedStudentsCount > 0 ? `${shortlistedStudentsCount} Saved` : null,
          badgeVariant: "lavender",
        },
        {
          label: "Internships",
          href: "/dashboard/recruiter/internships",
          icon: Briefcase,
          badge: activeRecruiterListingsCount > 0 ? `${activeRecruiterListingsCount} Active` : null,
          badgeVariant: "blue",
        },
        ...( ["RECRUITER", "COMPANY_ADMIN"].includes(activeRole) ? [{
          label: "Post Internship",
          href: "/dashboard/recruiter/post-internship",
          icon: PlusCircle,
          badge: "New",
          badgeVariant: "purple" as const,
        }] : []),
        {
          label: "Shortlisted",
          href: "/dashboard/recruiter/shortlisted",
          icon: Bookmark,
        },
      ],
    },
    {
      groupLabel: "GOVERNANCE & SYSTEM",
      items: [
        { label: "Trust & Safety", href: "/dashboard/recruiter/trust-safety", icon: Shield },
        { label: "Analytics", href: "/dashboard/recruiter/analytics", icon: BarChart3 },
        { label: "Audit Trail", href: "/dashboard/recruiter/audit-logs", icon: FileText },
        { label: "Company Profile", href: "/dashboard/recruiter/company", icon: Building2 },
        {
          label: "Notifications",
          href: "/dashboard/recruiter/notifications",
          icon: Bell,
          badge: unreadRecruiterNotificationsCount > 0 ? unreadRecruiterNotificationsCount : null,
          badgeVariant: "rose",
        },
        { label: "Settings", href: "/dashboard/recruiter/settings", icon: Settings },
      ],
    },
  ];

  const adminNavGroups: NavGroup[] = [
    {
      groupLabel: "OPERATIONS & CONTROL",
      items: [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "User Management", href: "/admin/users", icon: Users },
        { label: "Companies", href: "/admin/companies", icon: Building2 },
        { label: "Recruiters", href: "/admin/recruiters", icon: Briefcase },
        { label: "Students", href: "/admin/students", icon: GraduationCap },
      ],
    },
    {
      groupLabel: "INSTITUTIONAL ECOSYSTEM",
      items: [
        {
          label: "College Management",
          href: "/admin/colleges",
          icon: Building2,
          badge: "Network",
          badgeVariant: "purple",
        },
        {
          label: "College Approvals",
          href: "/admin/college-approvals",
          icon: Shield,
          badge: "Review",
          badgeVariant: "rose",
        },
        {
          label: "Institutional Analytics",
          href: "/admin/college-analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      groupLabel: "RECRUITMENT & TRUST",
      items: [
        {
          label: "Verification Queue",
          href: "/admin/verification",
          icon: Shield,
          badge: "Live",
          badgeVariant: "purple",
        },
        { label: "Recruitment Drives", href: "/admin/internships", icon: Layers },
        { label: "Applications", href: "/admin/applications", icon: GitPullRequest },
        {
          label: "Interviews & Schedules",
          href: "/admin/schedules",
          icon: Video,
          badge: "Ops",
          badgeVariant: "purple",
        },
      ],
    },
    {
      groupLabel: "🛡️ TRUST & SAFETY",
      items: [
        { label: "Overview", href: "/admin/trust-safety", icon: Shield },
        {
          label: "Reports Queue",
          href: "/admin/trust-safety/reports",
          icon: Flag,
          badge: "Queue",
          badgeVariant: "rose",
        },
        { label: "Investigations", href: "/admin/trust-safety/investigations", icon: Search },
        { label: "Restricted Entities", href: "/admin/trust-safety/restricted", icon: AlertTriangle },
        { label: "Enforcement", href: "/admin/trust-safety/enforcement", icon: CheckCircle2 },
        { label: "T&S Audit Logs", href: "/admin/trust-safety/audit-logs", icon: FileText },
      ],
    },
    {
      groupLabel: "COMPLIANCE & SYSTEM",
      items: [
        { label: "System Audit Logs", href: "/admin/audit-logs", icon: FileText },
        { label: "Platform Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  const collegeNavGroups: NavGroup[] = [
    {
      groupLabel: "COLLEGE",
      items: [
        { label: "Overview", href: "/college/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      groupLabel: "PLACEMENT INTELLIGENCE",
      items: [
        {
          label: "Placement Overview",
          href: "/college/dashboard",
          icon: BarChart3,
          badge: "Live",
          badgeVariant: "purple",
        },
        {
          label: "Applications",
          href: "/college/applications",
          icon: GitPullRequest,
        },
        {
          label: "Interviews",
          href: "/college/interviews",
          icon: Video,
        },
        {
          label: "Selections & Offers",
          href: "/college/results",
          icon: Award,
          badge: "Merit",
          badgeVariant: "emerald",
        },
        {
          label: "Assessments",
          href: "/college/assessments",
          icon: FileText,
        },
      ],
    },
    {
      groupLabel: "ANALYTICS",
      items: [
        { label: "Companies", href: "/college/recruiters", icon: Building2 },
        { label: "Departments", href: "/college/departments", icon: Layers },
        {
          label: "Skills & Career DNA",
          href: "/college/career-dna",
          icon: Dna,
          badge: "Skills Gap",
          badgeVariant: "lavender",
        },
        { label: "Trends & Velocity", href: "/college/analytics", icon: TrendingUp },
      ],
    },
    {
      groupLabel: "REPORTS",
      items: [
        { label: "Placement Reports", href: "/college/reports", icon: FileCheck },
      ],
    },
    {
      groupLabel: "INSTITUTION",
      items: [
        { label: "Student Verification", href: "/college/verification", icon: Shield, badge: "KYC", badgeVariant: "emerald" },
        { label: "College Profile", href: "/college/profile", icon: User },
        { label: "Placement Policies", href: "/college/settings", icon: Settings },
      ],
    },
  ];

  const navGroups =
    isCollegeWorkspace
      ? collegeNavGroups
      : isAdminWorkspace
      ? adminNavGroups
      : isRecruiterWorkspace
      ? recruiterNavGroups
      : studentNavGroups;

  const brandHref =
    isCollegeWorkspace
      ? "/college/dashboard"
      : isAdminWorkspace
      ? "/admin"
      : isRecruiterWorkspace
      ? "/dashboard/recruiter"
      : "/dashboard";

  const brandRoleSubtitle =
    isCollegeWorkspace
      ? "Placement Intelligence"
      : isAdminWorkspace
      ? "Admin Console"
      : isRecruiterWorkspace
      ? "Recruiter Workspace"
      : "Student Workspace";

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const handleRoleSwitch = async () => {
    let nextRole: UserRole = "STUDENT";
    if (isStudentWorkspace) nextRole = "RECRUITER";
    else if (isRecruiterWorkspace) nextRole = "COLLEGE_ADMIN";
    else if (isCollegeWorkspace) nextRole = "PLATFORM_ADMIN";
    else nextRole = "STUDENT";

    const res = await switchRole(nextRole);
    if (res?.redirectUrl) {
      window.location.href = res.redirectUrl;
    } else {
      const fallback =
        nextRole === "PLATFORM_ADMIN"
          ? "/admin"
          : nextRole === "COLLEGE_ADMIN"
          ? "/college/dashboard"
          : nextRole === "RECRUITER"
          ? "/dashboard/recruiter"
          : "/dashboard";
      window.location.href = fallback;
    }
  };

  const isLinkActive = (href: string) => {
    if (href === "/dashboard" || href === "/dashboard/recruiter" || href === "/admin" || href === "/college/dashboard") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between overflow-hidden">
      {/* Top Section: Brand Header & Collapse Toggle */}
      <div>
        <div
          className={cn(
            "h-16 px-4 flex items-center bg-card border-b border-border/80 transition-all",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link href={brandHref} className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <span className="font-black text-sm tracking-tight text-white select-none">CS</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-extrabold tracking-tight text-foreground">
                  CommandSkill
                </span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mt-0.5 w-max">
                  {brandRoleSubtitle === "Admin Console"
                    ? "ADMIN"
                    : brandRoleSubtitle === "Recruiter Workspace"
                    ? "RECRUITER"
                    : brandRoleSubtitle === "Placement Intelligence"
                    ? "COLLEGE"
                    : "STUDENT"}
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors hidden lg:flex"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger Button */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center pt-2">
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Middle Section: Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group, gIdx) => {
          const isGroupCollapsed = Boolean(
            group.collapsible && group.collapseKey && collapsedGroups[group.collapseKey]
          );

          return (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && group.groupLabel && (
                group.collapsible && group.collapseKey ? (
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.collapseKey!)}
                    className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 hover:text-foreground px-3 pt-1 pb-0.5 transition-colors cursor-pointer group"
                    title={isGroupCollapsed ? `Expand ${group.groupLabel}` : `Collapse ${group.groupLabel}`}
                  >
                    <span>{group.groupLabel}</span>
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200",
                        !isGroupCollapsed ? "rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 px-3 pt-1 pb-0.5">
                    {group.groupLabel}
                  </p>
                )
              )}

              {/* Group Items: Collapsed check */}
              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isLinkActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (onCloseMobileDrawer) onCloseMobileDrawer();
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 h-10 rounded-xl text-xs font-semibold transition-all group relative",
                          active
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25 font-bold dark:bg-foreground dark:text-background dark:shadow-none"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                            active ? "text-white dark:text-background" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />

                        {!isCollapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge !== undefined && item.badge !== null && (
                              <Badge
                                variant={item.badgeVariant || "purple"}
                                size="sm"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 font-bold shrink-0",
                                  active && "bg-white/20 text-white border-transparent dark:bg-background dark:text-foreground"
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}

                        {/* Collapsed Badge Dot Indicator */}
                        {isCollapsed && item.badge !== undefined && item.badge !== null && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-600" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Theme Switcher & Compact Profile Card */}
      <div className="p-3 border-t border-border/80 bg-card space-y-2.5">
        {/* Unified Appearance / Theme Switcher */}
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Appearance</span>
              <span className="text-[10px] text-muted-foreground font-medium capitalize">{theme}</span>
            </div>

            <div className="grid grid-cols-3 p-1 rounded-lg bg-muted/70 border border-border/50 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "py-1.5 rounded-md flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer",
                  theme === "light"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Light mode"
                aria-label="Light mode"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="text-[11px]">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={cn(
                  "py-1.5 rounded-md flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer",
                  theme === "system"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="System theme"
                aria-label="System theme"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="text-[11px]">System</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "py-1.5 rounded-md flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer",
                  theme === "dark"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Dark mode"
                aria-label="Dark mode"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="text-[11px]">Dark</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (theme === "light") setTheme("dark");
                else if (theme === "dark") setTheme("system");
                else setTheme("light");
              }}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer border border-transparent hover:border-border/60"
              title={`Theme: ${theme}. Click to change.`}
              aria-label={`Current theme: ${theme}. Click to switch theme.`}
            >
              {theme === "light" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : theme === "dark" ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Laptop className="w-4 h-4 text-foreground" />
              )}
            </button>
          </div>
        )}

        {/* Compact Profile Card */}
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <div
            className={cn(
              "flex items-center gap-2.5",
              isCollapsed && "justify-center"
            )}
          >
            <Avatar src={user?.avatar} name={user?.name || "User"} size="sm" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-xs text-foreground truncate">
                  {user?.name || "CommandSkill User"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-medium">
                  {isCollegeWorkspace
                    ? "Placement Director"
                    : isAdminWorkspace
                    ? "Trust & Safety Admin"
                    : isRecruiterWorkspace
                    ? "University Recruiter"
                    : "Verified Student"}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
              <button
                onClick={handleRoleSwitch}
                className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Switch Workspace Demo Role"
              >
                <ArrowLeftRight className="w-3 h-3 text-blue-500" />
                <span>Switch Role</span>
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors cursor-pointer"
                title="Sign out of CommandSkill"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={cn(
          "hidden lg:block h-screen h-[100dvh] sticky top-0 border-r border-border/80 bg-card/95 backdrop-blur-md z-40 transition-all duration-200 shrink-0",
          isCollapsed ? "w-[72px]" : "w-[280px]",
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileDrawer}
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full bg-card/95 backdrop-blur-md border-r border-border shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// Re-export as Sidebar for complete backward compatibility with all imports
export const Sidebar = CommandSkillSidebar;

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  MessageSquare,
  Command,
  CheckCircle2,
  Briefcase,
  User,
  SlidersHorizontal,
  X,
  ExternalLink,
  PlusCircle,
  Users2,
  Building2,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getTimeAwareGreeting, cn } from "@/lib/utils";

export function TopBar() {
  const router = useRouter();
  const { user, role } = useAuth();
  const pathname = usePathname();
  const normRole = (role || "STUDENT").toUpperCase();
  const isRecruiter = ["RECRUITER", "COMPANY_ADMIN"].includes(normRole);

  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    recruiterNotifications,
    unreadRecruiterNotificationsCount,
    markRecruiterNotificationAsRead,
    conversations,
    recruiterConversations,
  } = useData();

  const unreadMessagesTotal = isRecruiter
    ? recruiterConversations.filter((c) => c.lastMessage.isUnread).length
    : conversations.filter((c) => c.lastMessage.isUnread).length;

  const [greeting, setGreeting] = useState("Hello");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setGreeting(getTimeAwareGreeting(new Date()));
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const activeNotifications = isRecruiter ? recruiterNotifications : notifications;
  const activeUnreadCount =
    isRecruiter ? unreadRecruiterNotificationsCount : unreadNotificationsCount;
  const recentNotifications = activeNotifications.slice(0, 4);

  const notificationsPageUrl =
    isRecruiter ? "/dashboard/recruiter/notifications" : "/dashboard/notifications";
  const calendarPageUrl =
    isRecruiter ? "/dashboard/recruiter/calendar" : "/dashboard/calendar";
  const profilePageUrl =
    isRecruiter ? "/dashboard/recruiter/company" : "/dashboard/profile";

  return (
    <header className="fixed top-0 left-sidebar-width right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-gutter-desktop flex items-center justify-between gap-space-base">
      {/* Left: Dynamic Greeting Snippet & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-foreground">
            {greeting},{" "}
            <span className="text-blue-600 dark:text-blue-400">
              {user?.name ? user.name.split(" ")[0] : isRecruiter ? "Barun" : "Student"}
            </span>
          </span>
        </div>
        <Badge
          variant={isRecruiter ? "gradient" : "lavender"}
          size="sm"
          className="hidden sm:inline-flex font-semibold text-[11px]"
        >
          {isRecruiter ? "Stripe University Talent" : "Open to Summer '26"}
        </Badge>
      </div>

      {/* Right: Search, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Modern Global Search Bar Trigger */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden md:flex items-center relative w-full sm:w-64 md:w-80 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          aria-label="Search internships, skills, peers (Press ⌘K or Ctrl+K to open)"
        >
          <Search className="absolute left-3 w-[18px] h-[18px] text-outline z-10" />
          <div className="w-full pl-9 pr-16 py-1.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-lg text-body-sm font-body-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-left h-9 flex items-center">
            <span className="truncate text-outline">
              {isRecruiter ? "Search candidates, skills, jobs..." : "Search jobs, companies, skills, drives..."}
            </span>
          </div>
          <kbd className="absolute right-2 px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-outline">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-border/60"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Global Messages Entry Point (Navigates to full-screen page) */}
        <Link
          href={isRecruiter ? "/dashboard/recruiter/messages" : "/dashboard/messages"}
          className={cn(
            "relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-border/60 group",
            pathname.includes("/messages") && "bg-muted text-foreground font-semibold"
          )}
          aria-label="Messages"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadMessagesTotal > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card shadow-xs animate-in fade-in zoom-in duration-200">
              {unreadMessagesTotal > 99 ? "99+" : unreadMessagesTotal}
            </span>
          )}
        </Link>
        <Link
          href={calendarPageUrl}
          className={cn(
            "relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            pathname.includes("/calendar") && "bg-muted text-foreground font-semibold"
          )}
          aria-label="Calendar"
          title="Calendar"
        >
          <Calendar className="w-4 h-4" />
        </Link>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {activeUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotifOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      {isRecruiter ? "Hiring Alerts" : "Notifications"}
                    </h4>
                    {activeUnreadCount > 0 && (
                      <Badge variant="rose" size="sm">
                        {activeUnreadCount} new
                      </Badge>
                    )}
                  </div>
                  <Link
                    href={notificationsPageUrl}
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    View all
                  </Link>
                </div>

                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (isRecruiter) {
                          markRecruiterNotificationAsRead(notif.id);
                        } else {
                          markNotificationAsRead(notif.id);
                        }
                        if (notif.actionUrl) router.push(notif.actionUrl);
                        setIsNotifOpen(false);
                      }}
                      className={`p-3.5 text-xs hover:bg-muted/60 transition-colors cursor-pointer flex gap-3 ${
                        !notif.isRead ? "bg-blue-500/5 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-foreground">{notif.title}</div>
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.description}
                        </p>
                        <div className="text-[10px] text-muted-foreground/80">{notif.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar Mini */}
        <Link href={profilePageUrl} className="flex items-center">
          <Avatar
            src={user?.avatar}
            name={user?.name || (isRecruiter ? "Barun" : "Student")}
            size="sm"
            isOnline={true}
          />
        </Link>
      </div>

      {/* Global Quick Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl z-10 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isRecruiter
                    ? "Type to search candidate talent, posted roles, applications..."
                    : "Type to search internships, skills, applications, communities..."
                }
                className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 text-xs text-muted-foreground max-h-72 overflow-y-auto space-y-2">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2">
                Quick Navigation
              </div>

              {role === "recruiter" ? (
                <>
                  <button
                    onClick={() => {
                      router.push("/dashboard/recruiter/students");
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className="w-4 h-4 text-blue-500" />
                      <span>Search Student Talent Directory (Stanford, MIT, Berkeley)</span>
                    </div>
                    <Badge variant="purple" size="sm">
                      8+ Profiles
                    </Badge>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/dashboard/recruiter/applications");
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <span>Review Candidate Pipeline &amp; Statuses</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Pipeline</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/dashboard/recruiter/post-internship");
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlusCircle className="w-4 h-4 text-emerald-500" />
                      <span>Post a New Summer 2026 Internship</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Form</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      router.push("/dashboard/internships");
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                      <span>Browse Software Engineering Internships</span>
                    </div>
                    <Badge variant="purple" size="sm">
                      96% Matches
                    </Badge>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/dashboard/applications");
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <span>Track Application Statuses</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Tracker</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/dashboard/profile");
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-emerald-500" />
                      <span>Manage Proof-of-Work Projects &amp; Resume</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">85% Complete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

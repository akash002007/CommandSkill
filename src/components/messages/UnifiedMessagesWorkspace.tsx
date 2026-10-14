"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Search,
  CheckCheck,
  ArrowLeft,
  Paperclip,
  MoreVertical,
  Briefcase,
  GraduationCap,
  Shield,
  Clock,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  User,
  Info,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";
import { Conversation, Message } from "@/types";

interface UnifiedMessagesWorkspaceProps {
  forcedRole?: "STUDENT" | "RECRUITER" | "ADMIN";
}

export function UnifiedMessagesWorkspace({ forcedRole }: UnifiedMessagesWorkspaceProps) {
  const router = useRouter();
  const { user, role } = useAuth();
  const {
    conversations: studentConvs,
    recruiterConversations,
    sendMessage: sendStudentMessage,
    sendRecruiterMessage,
    activeConversationId: activeStudentConvId,
    setActiveConversationId: setActiveStudentConvId,
    activeRecruiterConversationId,
    setActiveRecruiterConversationId,
  } = useData();

  const currentRole = (forcedRole || role || "STUDENT").toUpperCase();
  const isRecruiter = ["RECRUITER", "COMPANY_ADMIN", "HIRING_MANAGER"].includes(currentRole);
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(currentRole);

  // Unified conversation state
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Admin local conversation state (for Trust & Safety moderation and user cases)
  const [adminConversations, setAdminConversations] = useState<Conversation[]>([
    {
      id: "admin_conv_1",
      participant: {
        id: "student_02",
        name: "Priya Sharma (Student Verification)",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        role: "UC Berkeley • Case #VER-4892",
        companyOrCollege: "UC Berkeley",
        isOnline: true,
        type: "peer",
      },
      lastMessage: {
        text: "I have uploaded my updated official university enrollment certificate.",
        timestamp: "12m ago",
        isUnread: true,
      },
      messages: [
        {
          id: "msg_adm_1",
          conversationId: "admin_conv_1",
          senderId: "student_02",
          senderName: "Priya Sharma",
          senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
          content: "Hello Trust & Safety team! My college email domain was recently migrated. I have re-uploaded my official enrollment certificate for the CommandSkill verified badge.",
          timestamp: "12m ago",
          isSelf: false,
        },
      ],
    },
    {
      id: "admin_conv_2",
      participant: {
        id: "recruiter_01",
        name: "Barun (Stripe Recruiter Partner)",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        role: "Lead Recruiter • Enterprise Stripe",
        companyOrCollege: "Stripe University Talent",
        isOnline: true,
        type: "recruiter",
      },
      lastMessage: {
        text: "Thank you for confirming the corporate domain verification for Stripe!",
        timestamp: "1h ago",
        isUnread: false,
      },
      messages: [
        {
          id: "msg_adm_2_1",
          conversationId: "admin_conv_2",
          senderId: "recruiter_01",
          senderName: "Barun",
          senderAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
          content: "Hi CommandSkill Trust & Safety! We are ramping up our 2026 University Drives. Could you verify our recruitment drive quotas for CalHacks participants?",
          timestamp: "Yesterday, 3:00 PM",
          isSelf: false,
        },
        {
          id: "msg_adm_2_2",
          conversationId: "admin_conv_2",
          senderId: "admin_user",
          senderName: "CommandSkill Trust & Safety",
          senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          content: "Hi Barun! Your enterprise quota has been elevated to 500 candidate fast-track screenings. All set!",
          timestamp: "Yesterday, 4:15 PM",
          isSelf: true,
        },
      ],
    },
  ]);
  const [activeAdminConvId, setActiveAdminConvId] = useState<string>("admin_conv_1");

  // Determine conversation list & active selection according to authenticated role
  const displayConversations: Conversation[] = isAdmin
    ? adminConversations
    : isRecruiter
    ? recruiterConversations
    : studentConvs;

  const currentActiveId = isAdmin
    ? activeAdminConvId
    : isRecruiter
    ? activeRecruiterConversationId
    : activeStudentConvId;

  const activeConversation =
    displayConversations.find((c) => c.id === currentActiveId) ||
    displayConversations[0] ||
    null;

  // Filter conversations
  const filteredConversations = displayConversations.filter((conv) => {
    const matchesSearch =
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participant.companyOrCollege.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participant.role.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "unread") {
      return matchesSearch && conv.lastMessage.isUnread;
    }
    return matchesSearch;
  });

  const unreadCountTotal = displayConversations.filter((c) => c.lastMessage.isUnread).length;

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const handleSelectConversation = (id: string) => {
    if (isAdmin) {
      setActiveAdminConvId(id);
      // Mark as read in admin state
      setAdminConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, lastMessage: { ...c.lastMessage, isUnread: false } } : c
        )
      );
    } else if (isRecruiter) {
      setActiveRecruiterConversationId(id);
    } else {
      setActiveStudentConvId(id);
    }
    setIsMobileChatOpen(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation) return;

    const text = messageInput.trim();
    setMessageInput("");

    if (isAdmin) {
      const newMsg: Message = {
        id: `msg_adm_${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: "admin_user",
        senderName: user?.name || "CommandSkill Admin",
        senderAvatar: user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        content: text,
        timestamp: "Just now",
        isSelf: true,
      };

      setAdminConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              lastMessage: {
                text,
                timestamp: "Just now",
                isUnread: false,
              },
              messages: [...c.messages, newMsg],
            };
          }
          return c;
        })
      );
    } else if (isRecruiter) {
      sendRecruiterMessage(activeConversation.id, text);
    } else {
      sendStudentMessage(activeConversation.id, text);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-4.25rem)] flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden bg-background">
      {/* Workspace Header Bar */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/10 dark:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Messages
              </h1>
              {unreadCountTotal > 0 && (
                <Badge variant="rose" size="sm" className="font-bold">
                  {unreadCountTotal} unread
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {isAdmin
                ? "Platform-wide Trust & Safety communications and user verification support"
                : isRecruiter
                ? "Direct candidate messaging, interview scheduling, and talent coordination"
                : "Real-time communication with hiring managers, recruiters, and university mentors"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isAdmin ? "rose" : isRecruiter ? "gradient" : "lavender"}
            size="sm"
            className="text-[11px] font-bold px-2.5 py-1"
          >
            {isAdmin ? "Trust & Safety Workspace" : isRecruiter ? "Recruiter Portal" : "CommandSkill"}
          </Badge>
        </div>
      </div>

      {/* Main Messages Workspace Grid */}
      <div className="flex-1 min-h-0 pt-3 sm:pt-4 grid grid-cols-12 gap-3 sm:gap-4">
        {/* Left Column: Conversations List (12 cols on mobile, 4-5 cols on desktop) */}
        <div
          className={cn(
            "col-span-12 md:col-span-4 lg:col-span-4 flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-xs",
            isMobileChatOpen ? "hidden md:flex" : "flex"
          )}
        >
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-border space-y-3 bg-muted/20">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations, names..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "flex-1 py-1 px-2.5 text-xs font-semibold rounded-lg transition-all",
                  activeTab === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Chats ({displayConversations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "flex-1 py-1 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1",
                  activeTab === "unread"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Unread
                {unreadCountTotal > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                    {unreadCountTotal}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const isUnread = conv.lastMessage.isUnread;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "p-3.5 flex items-start gap-3 cursor-pointer transition-all duration-150 relative group",
                      isSelected
                        ? "bg-purple-500/10 dark:bg-purple-950/20 border-l-4 border-purple-600"
                        : "hover:bg-muted/50 border-l-4 border-transparent"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={conv.participant.avatar}
                        name={conv.participant.name}
                        size="md"
                        isOnline={conv.participant.isOnline}
                      />
                      {isUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-purple-600 ring-2 ring-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={cn(
                            "text-xs truncate",
                            isUnread || isSelected ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                          )}
                        >
                          {conv.participant.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {conv.lastMessage.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate mb-1">
                        {conv.participant.companyOrCollege} • {conv.participant.role}
                      </p>

                      <p
                        className={cn(
                          "text-xs truncate line-clamp-1",
                          isUnread
                            ? "text-purple-600 dark:text-purple-400 font-semibold"
                            : "text-muted-foreground"
                        )}
                      >
                        {conv.lastMessage.text}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-xs font-semibold text-foreground">No conversations found</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {searchQuery ? "Try searching for another name or keyword" : "You have no active message threads"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Columns: Active Chat Area & Details Drawer */}
        <div
          className={cn(
            "col-span-12 md:col-span-8 lg:col-span-8 flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-xs",
            !isMobileChatOpen ? "hidden md:flex" : "flex"
          )}
        >
          {activeConversation ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button to return to list */}
                  <button
                    type="button"
                    onClick={() => setIsMobileChatOpen(false)}
                    className="md:hidden p-1.5 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Avatar
                    src={activeConversation.participant.avatar}
                    name={activeConversation.participant.name}
                    size="md"
                    isOnline={activeConversation.participant.isOnline}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-sm text-foreground truncate">
                        {activeConversation.participant.name}
                      </h2>
                      <Badge
                        variant={
                          activeConversation.participant.type === "recruiter"
                            ? "blue"
                            : activeConversation.participant.type === "mentor"
                            ? "purple"
                            : "secondary"
                        }
                        size="sm"
                        className="text-[10px]"
                      >
                        {activeConversation.participant.type === "recruiter"
                          ? "Recruiter"
                          : activeConversation.participant.type === "mentor"
                          ? "Mentor"
                          : "Student / Candidate"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeConversation.participant.companyOrCollege} • {activeConversation.participant.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={activeConversation.participant.isOnline ? "emerald" : "secondary"}
                    size="sm"
                    className="hidden sm:inline-flex text-[10px]"
                  >
                    {activeConversation.participant.isOnline ? "Active Now" : "Offline"}
                  </Badge>

                  <button
                    type="button"
                    onClick={() => setShowRightDrawer((prev) => !prev)}
                    className={cn(
                      "hidden lg:flex p-2 rounded-xl text-muted-foreground hover:text-foreground border border-border/80 transition-colors",
                      showRightDrawer ? "bg-muted" : "bg-card"
                    )}
                    title="Toggle context drawer"
                    aria-label="Toggle details panel"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Body & Context Pane Container */}
              <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Message Bubble History */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-muted/10 flex flex-col">
                  {/* Context notice badge */}
                  <div className="flex justify-center my-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border text-[11px] text-muted-foreground">
                      <Shield className="w-3 h-3 text-purple-500" />
                      Encrypted and verified direct messaging via CommandSkill Trust Layer
                    </span>
                  </div>

                  {activeConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] sm:max-w-[70%]",
                        msg.isSelf ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs",
                          msg.isSelf
                            ? "bg-purple-600 text-white rounded-tr-none font-normal"
                            : "bg-card border border-border text-foreground rounded-tl-none font-normal"
                        )}
                      >
                        {msg.content}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                        <span>{msg.timestamp}</span>
                        {msg.isSelf && <CheckCheck className="w-3.5 h-3.5 text-purple-500" />}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Optional Right Details Drawer (Context Panel) */}
                {showRightDrawer && (
                  <div className="hidden lg:flex w-72 flex-col border-l border-border bg-card p-4 space-y-4 overflow-y-auto">
                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                      <User className="w-4 h-4 text-purple-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Profile Context
                      </h3>
                    </div>

                    <div className="text-center pb-2">
                      <Avatar
                        src={activeConversation.participant.avatar}
                        name={activeConversation.participant.name}
                        size="lg"
                        className="mx-auto mb-2.5"
                      />
                      <h4 className="font-bold text-sm text-foreground">
                        {activeConversation.participant.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeConversation.participant.role}
                      </p>
                      <Badge variant="lavender" size="sm" className="mt-2">
                        {activeConversation.participant.companyOrCollege}
                      </Badge>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border/80 text-xs">
                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Verification Status
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CommandSkill Verified Identity
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Connection Type
                        </span>
                        <p className="text-foreground font-medium mt-0.5 capitalize">
                          {activeConversation.participant.type === "recruiter"
                            ? "Enterprise Recruiter Partner"
                            : activeConversation.participant.type === "mentor"
                            ? "Alumni Career Mentor"
                            : "Candidate / University Peer"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Safety & Moderation
                        </span>
                        <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
                          All communications adhere to CommandSkill Community Guidelines and Recruitment Privacy policies.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-border bg-card flex items-center gap-2"
              >
                <button
                  type="button"
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Attach file (mocked)"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Reply to ${activeConversation.participant.name.split(" ")[0]}...`}
                  className="flex-1 h-10 px-4 rounded-xl bg-muted/60 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />

                <Button
                  type="submit"
                  variant="gradient"
                  size="sm"
                  disabled={!messageInput.trim()}
                  className="h-10 px-4 shrink-0 font-semibold"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  <span>Send</span>
                </Button>
              </form>
            </>
          ) : (
            /* Empty State when no thread is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Your Messages</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
                Stay connected with students, recruiters, and platform users. Select a conversation from the list to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

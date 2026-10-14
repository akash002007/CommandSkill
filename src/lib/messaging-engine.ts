import fs from "fs";
import path from "path";
import { Conversation, Message } from "@/types";
import { initialMockConversations } from "@/data/mock-messages";
import { initialMockRecruiterConversations } from "@/data/mock-recruiter-data";

export interface ParticipantRoleContext {
  userId: string;
  role: "STUDENT" | "RECRUITER" | "COMPANY_ADMIN" | "ADMIN" | "SUPER_ADMIN" | "PLATFORM_ADMIN";
}

export interface UnifiedConversationItem extends Conversation {
  allowedRoles: string[]; // ["STUDENT", "RECRUITER", "ADMIN"]
  unreadCounts: Record<string, number>; // userId or role -> unread count
  tags?: string[];
}

const MESSAGES_DB_FILE = path.join(process.cwd(), ".data", "messaging-store-db.json");

interface MessagingStoreState {
  conversations: Map<string, UnifiedConversationItem>;
}

declare global {
  // eslint-disable-next-line no-var
  var __COMMANDSKILL_MESSAGING_STORE__: MessagingStoreState | undefined;
}

// Default initial admin conversations for platform safety and support
const initialAdminConversations: UnifiedConversationItem[] = [
  {
    id: "admin_conv_1",
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"],
    unreadCounts: { admin: 1 },
    tags: ["Verification", "Identity"],
    participant: {
      id: "student_02",
      name: "Priya Sharma (Student ID Verification)",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      role: "UC Berkeley • Verification Case #4892",
      companyOrCollege: "UC Berkeley",
      isOnline: true,
      type: "peer",
    },
    lastMessage: {
      text: "I have uploaded my updated official university enrollment certificate. Please verify.",
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
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"],
    unreadCounts: { admin: 0 },
    tags: ["Recruiter", "Compliance"],
    participant: {
      id: "recruiter_01",
      name: "Barun (Stripe Hiring Partner)",
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
      {
        id: "msg_adm_2_3",
        conversationId: "admin_conv_2",
        senderId: "recruiter_01",
        senderName: "Barun",
        senderAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        content: "Thank you for confirming the corporate domain verification for Stripe!",
        timestamp: "1h ago",
        isSelf: false,
      },
    ],
  },
];

function seedDefaultConversations(): Map<string, UnifiedConversationItem> {
  const map = new Map<string, UnifiedConversationItem>();

  // 1. Seed Student Conversations
  initialMockConversations.forEach((c) => {
    map.set(c.id, {
      ...c,
      allowedRoles: ["STUDENT"],
      unreadCounts: {
        student: c.lastMessage.isUnread ? 1 : 0,
      },
    });
  });

  // 2. Seed Recruiter Conversations
  initialMockRecruiterConversations.forEach((c) => {
    map.set(c.id, {
      ...c,
      allowedRoles: ["RECRUITER", "COMPANY_ADMIN"],
      unreadCounts: {
        recruiter: c.lastMessage.isUnread ? 1 : 0,
      },
    });
  });

  // 3. Seed Admin Conversations
  initialAdminConversations.forEach((c) => {
    map.set(c.id, c);
  });

  return map;
}

function getStore(): MessagingStoreState {
  if (global.__COMMANDSKILL_MESSAGING_STORE__) {
    return global.__COMMANDSKILL_MESSAGING_STORE__;
  }

  const state: MessagingStoreState = {
    conversations: new Map<string, UnifiedConversationItem>(),
  };

  try {
    if (fs.existsSync(MESSAGES_DB_FILE)) {
      const raw = fs.readFileSync(MESSAGES_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.conversations)) {
        parsed.conversations.forEach((c: UnifiedConversationItem) => {
          state.conversations.set(c.id, c);
        });
      }
    }
  } catch (err) {
    console.error("[MessagingStore] Failed to load disk state, using fallback memory seed:", err);
  }

  if (state.conversations.size === 0) {
    state.conversations = seedDefaultConversations();
    saveStoreToDisk(state);
  }

  global.__COMMANDSKILL_MESSAGING_STORE__ = state;
  return state;
}

function saveStoreToDisk(state: MessagingStoreState) {
  try {
    const dir = path.dirname(MESSAGES_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      conversations: Array.from(state.conversations.values()),
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(MESSAGES_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[MessagingStore] Failed to write disk state:", err);
  }
}

/**
 * Normalizes user roles for permission checks
 */
export function normalizeUserRole(role?: string): "STUDENT" | "RECRUITER" | "ADMIN" {
  const upper = (role || "").toUpperCase();
  if (["RECRUITER", "COMPANY_ADMIN", "HIRING_MANAGER"].includes(upper)) {
    return "RECRUITER";
  }
  if (["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(upper)) {
    return "ADMIN";
  }
  return "STUDENT";
}

/**
 * Returns all conversations the given role is authorized to view.
 */
export function getConversationsForRole(roleStr?: string): UnifiedConversationItem[] {
  const store = getStore();
  const normRole = normalizeUserRole(roleStr);

  const results: UnifiedConversationItem[] = [];
  for (const conv of store.conversations.values()) {
    const isAllowed = conv.allowedRoles.some((r) => {
      const nr = normalizeUserRole(r);
      return nr === normRole;
    });

    if (isAllowed) {
      results.push(conv);
    }
  }

  return results;
}

/**
 * Returns total unread count for the given role.
 */
export function getUnreadCountForRole(roleStr?: string): number {
  const conversations = getConversationsForRole(roleStr);
  const normRole = normalizeUserRole(roleStr).toLowerCase();

  return conversations.reduce((acc, conv) => {
    const roleUnread = conv.unreadCounts?.[normRole];
    if (typeof roleUnread === "number" && roleUnread > 0) {
      return acc + roleUnread;
    }
    return conv.lastMessage?.isUnread ? acc + 1 : acc;
  }, 0);
}

/**
 * Returns a conversation by ID only if the role is authorized to access it (IDOR protection).
 */
export function getConversationById(id: string, roleStr?: string): UnifiedConversationItem | null {
  const store = getStore();
  const conv = store.conversations.get(id);
  if (!conv) return null;

  const normRole = normalizeUserRole(roleStr);
  const isAllowed = conv.allowedRoles.some((r) => normalizeUserRole(r) === normRole);
  if (!isAllowed) {
    return null; // IDOR protected: unauthorized
  }

  return conv;
}

/**
 * Marks a conversation as read for the given user role.
 */
export function markConversationAsRead(id: string, roleStr?: string): boolean {
  const store = getStore();
  const conv = getConversationById(id, roleStr);
  if (!conv) return false;

  const normRole = normalizeUserRole(roleStr).toLowerCase();
  conv.unreadCounts[normRole] = 0;
  conv.lastMessage.isUnread = false;

  saveStoreToDisk(store);
  return true;
}

/**
 * Posts a new message into a conversation with strict server-side validation and authorization.
 */
export function postMessage(
  conversationId: string,
  content: string,
  user: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }
): { success: boolean; message?: Message; error?: string } {
  const store = getStore();
  const conv = getConversationById(conversationId, user.role);
  if (!conv) {
    return { success: false, error: "Conversation not found or unauthorized" };
  }

  const cleanContent = content?.trim();
  if (!cleanContent) {
    return { success: false, error: "Message content cannot be empty" };
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newMsg: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId: user.id,
    senderName: user.name,
    senderAvatar:
      user.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    content: cleanContent,
    timestamp: timeString,
    isSelf: true,
  };

  conv.messages.push(newMsg);
  conv.lastMessage = {
    text: cleanContent,
    timestamp: "Just now",
    isUnread: false,
  };

  // Trigger simulated participant reply if this is interactive demo
  const senderNorm = normalizeUserRole(user.role);
  if (senderNorm === "STUDENT") {
    conv.unreadCounts["recruiter"] = (conv.unreadCounts["recruiter"] || 0) + 1;
  } else if (senderNorm === "RECRUITER") {
    conv.unreadCounts["student"] = (conv.unreadCounts["student"] || 0) + 1;
  }

  saveStoreToDisk(store);
  return { success: true, message: newMsg };
}

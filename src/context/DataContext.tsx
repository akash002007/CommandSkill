"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Internship,
  Application,
  ApplicationStatus,
  Conversation,
  Community,
  NotificationItem,
  Project,
  RecruiterInternship,
  RecruiterInternshipStatus,
  RecruiterApplicant,
  RecruiterStudentCandidate,
  CompanyInfo,
  RecruiterNotificationItem,
  RecruiterInterview,
} from "@/types";
import { mockInternships } from "@/data/mock-internships";
import { initialMockApplications } from "@/data/mock-applications";
import { initialMockConversations } from "@/data/mock-messages";
import { initialMockCommunities } from "@/data/mock-communities";
import { initialMockNotifications } from "@/data/mock-notifications";
import { defaultStudentUser } from "@/data/mock-users";
import {
  initialMockRecruiterInternships,
  initialMockRecruiterApplicants,
  initialMockRecruiterStudents,
  initialMockRecruiterConversations,
  initialMockRecruiterNotifications,
  initialMockCompanyInfo,
  initialMockRecruiterInterviews,
} from "@/data/mock-recruiter-data";
import { useToast } from "./ToastContext";

interface DataContextType {
  // Student State
  internships: Internship[];
  savedInternshipIds: string[];
  toggleSaveInternship: (id: string) => void;
  isInternshipSaved: (id: string) => boolean;

  applications: Application[];
  applyToInternship: (internship: Internship, note?: string) => boolean;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
  hasAppliedToInternship: (internshipId: string) => boolean;

  conversations: Conversation[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  sendMessage: (conversationId: string, text: string) => void;

  communities: Community[];
  toggleJoinCommunity: (communityId: string) => void;
  upvotePost: (communityId: string, postId: string) => void;
  createPost: (communityId: string, title: string, content: string, tags: string[]) => void;

  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  projects: Project[];
  addProject: (project: Omit<Project, "id">) => void;
  removeProject: (projectId: string) => void;

  // Recruiter State
  recruiterInternships: RecruiterInternship[];
  addRecruiterInternship: (
    internship: Omit<
      RecruiterInternship,
      "id" | "applicationsCount" | "shortlistedCount" | "viewsCount" | "postedDate" | "status"
    >
  ) => void;
  updateRecruiterInternshipStatus: (id: string, status: RecruiterInternshipStatus) => void;
  updateRecruiterInternship: (id: string, updates: Partial<RecruiterInternship>) => void;

  recruiterApplicants: RecruiterApplicant[];
  updateApplicantStatus: (applicantId: string, status: ApplicationStatus) => void;
  addApplicantNote: (applicantId: string, note: string) => void;

  recruiterStudents: RecruiterStudentCandidate[];
  toggleShortlistCandidate: (studentId: string) => void;

  recruiterConversations: Conversation[];
  activeRecruiterConversationId: string;
  setActiveRecruiterConversationId: (id: string) => void;
  sendRecruiterMessage: (conversationId: string, text: string) => void;
  startRecruiterConversation: (candidate: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    college: string;
  }) => string;

  recruiterCompany: CompanyInfo;
  updateCompanyProfile: (updates: Partial<CompanyInfo>) => void;

  recruiterNotifications: RecruiterNotificationItem[];
  unreadRecruiterNotificationsCount: number;
  markRecruiterNotificationAsRead: (id: string) => void;
  markAllRecruiterNotificationsAsRead: () => void;

  recruiterInterviews: RecruiterInterview[];
  scheduleInterview: (
    interview: Omit<RecruiterInterview, "id" | "createdAt" | "status">
  ) => void;
  rescheduleInterview: (id: string, newDate: string, newTime: string) => void;
  cancelInterview: (id: string, reason?: string) => void;
  completeInterview: (id: string, feedback?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { success, info } = useToast();

  // Student states
  const [internships, setInternships] = useState<Internship[]>(mockInternships);
  const [savedInternshipIds, setSavedInternshipIds] = useState<string[]>(["intern_1", "intern_5"]);
  const [applications, setApplications] = useState<Application[]>(initialMockApplications);
  const [conversations, setConversations] = useState<Conversation[]>(initialMockConversations);
  const [activeConversationId, setActiveConversationId] = useState<string>("conv_1");
  const [communities, setCommunities] = useState<Community[]>(initialMockCommunities);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialMockNotifications);
  const [projects, setProjects] = useState<Project[]>(defaultStudentUser.projects);

  // Recruiter states
  const [recruiterInternships, setRecruiterInternships] = useState<RecruiterInternship[]>(
    initialMockRecruiterInternships
  );
  const [recruiterApplicants, setRecruiterApplicants] = useState<RecruiterApplicant[]>(
    initialMockRecruiterApplicants
  );
  const [recruiterStudents, setRecruiterStudents] = useState<RecruiterStudentCandidate[]>(
    initialMockRecruiterStudents
  );
  const [recruiterConversations, setRecruiterConversations] = useState<Conversation[]>(
    initialMockRecruiterConversations
  );
  const [activeRecruiterConversationId, setActiveRecruiterConversationId] = useState<string>("rec_conv_1");
  const [recruiterCompany, setRecruiterCompany] = useState<CompanyInfo>(initialMockCompanyInfo);
  const [recruiterNotifications, setRecruiterNotifications] = useState<RecruiterNotificationItem[]>(
    initialMockRecruiterNotifications
  );
  const [recruiterInterviews, setRecruiterInterviews] = useState<RecruiterInterview[]>(
    initialMockRecruiterInterviews
  );

  // Sync to local storage where helpful
  useEffect(() => {
    try {
      const storedSaved = localStorage.getItem("commandskill_saved_internships");
      if (storedSaved) {
        setSavedInternshipIds(JSON.parse(storedSaved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Student Methods
  const toggleSaveInternship = (id: string) => {
    setSavedInternshipIds((prev) => {
      const isSaved = prev.includes(id);
      const updated = isSaved ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("commandskill_saved_internships", JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (isSaved) {
        info("Removed from saved internships");
      } else {
        success("Saved to your bookmarks");
      }
      return updated;
    });
  };

  const isInternshipSaved = (id: string) => savedInternshipIds.includes(id);

  const hasAppliedToInternship = (internshipId: string) => {
    return applications.some((app) => app.internshipId === internshipId);
  };

  const applyToInternship = (internship: Internship, note?: string): boolean => {
    if (hasAppliedToInternship(internship.id)) {
      info("You have already submitted an application for this position");
      return false;
    }

    const newApp: Application = {
      id: `app_${Date.now()}`,
      internshipId: internship.id,
      company: internship.company,
      companyLogo: internship.companyLogo,
      role: internship.title,
      appliedDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Applied",
      location: internship.location,
      workType: internship.workType,
      stipend: internship.stipend,
      nextStep: "Application submitted via CommandSkill Fast-Track",
      notes: note || undefined,
    };

    setApplications((prev) => [newApp, ...prev]);

    // Also push a notification
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      type: "application",
      title: `Applied to ${internship.company}`,
      description: `Your application for ${internship.title} has been logged in your tracker.`,
      timestamp: "Just now",
      isRead: false,
      actionUrl: "/dashboard/applications",
    };
    setNotifications((prev) => [newNotif, ...prev]);

    success(`Successfully applied to ${internship.company}!`);
    return true;
  };

  const updateApplicationStatus = (appId: string, status: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status } : app))
    );
    success(`Application updated to ${status}`);
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: "student_01",
      senderName: "Alex Rivera",
      senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      content: text.trim(),
      timestamp: "Just now",
      isSelf: true,
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: {
              text: text.trim(),
              timestamp: "Just now",
              isUnread: false,
            },
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      })
    );

    setTimeout(() => {
      const activeConv = conversations.find((c) => c.id === conversationId);
      if (!activeConv) return;

      let replyText = "Thanks for the message! Let's connect soon.";
      if (activeConv.participant.type === "recruiter") {
        replyText = "Thanks for reaching out, Alex! I've flagged your portfolio for our engineering hiring manager. Talk soon!";
      } else if (activeConv.participant.type === "mentor") {
        replyText = "Great point. Keep iterating on your project demos and focus on system architecture trade-offs!";
      } else {
        replyText = "Awesome, let's sync up on Discord later today!";
      }

      const replyMsg = {
        id: `msg_reply_${Date.now()}`,
        conversationId,
        senderId: activeConv.participant.id,
        senderName: activeConv.participant.name,
        senderAvatar: activeConv.participant.avatar,
        content: replyText,
        timestamp: "Just now",
        isSelf: false,
      };

      setConversations((currentConvs) =>
        currentConvs.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: {
                text: replyText,
                timestamp: "Just now",
                isUnread: true,
              },
              messages: [...conv.messages, replyMsg],
            };
          }
          return conv;
        })
      );
    }, 1200);
  };

  const toggleJoinCommunity = (communityId: string) => {
    setCommunities((prev) =>
      prev.map((comm) => {
        if (comm.id === communityId) {
          const nextState = !comm.isJoined;
          if (nextState) {
            success(`Joined ${comm.name}`);
          } else {
            info(`Left ${comm.name}`);
          }
          return {
            ...comm,
            isJoined: nextState,
            membersCount: nextState ? comm.membersCount + 1 : comm.membersCount - 1,
          };
        }
        return comm;
      })
    );
  };

  const upvotePost = (communityId: string, postId: string) => {
    setCommunities((prev) =>
      prev.map((comm) => {
        if (comm.id === communityId) {
          return {
            ...comm,
            posts: comm.posts.map((p) => {
              if (p.id === postId) {
                const nextUpvoted = !p.hasUpvoted;
                return {
                  ...p,
                  hasUpvoted: nextUpvoted,
                  upvotes: nextUpvoted ? p.upvotes + 1 : p.upvotes - 1,
                };
              }
              return p;
            }),
          };
        }
        return comm;
      })
    );
  };

  const createPost = (
    communityId: string,
    title: string,
    content: string,
    tags: string[]
  ) => {
    const newPost = {
      id: `post_${Date.now()}`,
      author: {
        name: "Alex Rivera",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        headline: "CS Junior @ Stanford",
      },
      title,
      content,
      timestamp: "Just now",
      upvotes: 1,
      hasUpvoted: true,
      commentCount: 0,
      tags,
    };

    setCommunities((prev) =>
      prev.map((comm) => {
        if (comm.id === communityId) {
          return {
            ...comm,
            activeDiscussions: comm.activeDiscussions + 1,
            posts: [newPost, ...comm.posts],
          };
        }
        return comm;
      })
    );

    success("Post published to community!");
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    success("All notifications marked as read");
  };

  const clearNotifications = () => {
    setNotifications([]);
    info("Notifications cleared");
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const addProject = (proj: Omit<Project, "id">) => {
    const newProject: Project = {
      ...proj,
      id: `proj_${Date.now()}`,
    };
    setProjects((prev) => [newProject, ...prev]);
    success("Project added to profile!");
  };

  const removeProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    info("Project removed from profile");
  };

  // Recruiter Methods
  const addRecruiterInternship = (
    internship: Omit<
      RecruiterInternship,
      "id" | "applicationsCount" | "shortlistedCount" | "viewsCount" | "postedDate" | "status"
    >
  ) => {
    const newId = `rec_intern_${Date.now()}`;
    const newListing: RecruiterInternship = {
      ...internship,
      id: newId,
      applicationsCount: 0,
      shortlistedCount: 0,
      viewsCount: 1,
      postedDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Active",
    };

    setRecruiterInternships((prev) => [newListing, ...prev]);

    // Also make it available in the global student internships directory
    const newStudentInternship: Internship = {
      id: newId,
      title: internship.title,
      company: recruiterCompany.name,
      companyLogo: recruiterCompany.logo,
      companyDescription: recruiterCompany.description,
      location: internship.location,
      workType: internship.workType,
      stipend: internship.stipend,
      duration: internship.duration,
      deadline: internship.deadline,
      postedDate: "Just now",
      department: internship.department,
      requiredSkills: internship.requiredSkills,
      matchPercentage: 95,
      matchReasons: {
        matchingSkills: internship.requiredSkills.slice(0, 3),
        academicMatch: `Strong alignment with ${
          Array.isArray(internship.branchRequirements)
            ? internship.branchRequirements.join(", ")
            : internship.branchRequirements
        }`,
        projectSynergy: "High synergy with modern web and systems projects",
      },
      description: internship.description,
      responsibilities: internship.responsibilities,
      requirements: [
        Array.isArray(internship.degreeRequirements)
          ? internship.degreeRequirements.join(", ")
          : internship.degreeRequirements,
        Array.isArray(internship.branchRequirements)
          ? internship.branchRequirements.join(", ")
          : internship.branchRequirements,
        `Min CGPA: ${internship.minCgpa}`,
        internship.experienceRequirements || "Technical projects demonstration",
      ],
      perks: recruiterCompany.perks,
      applicantsCount: 0,
      featured: true,
    };
    setInternships((prev) => [newStudentInternship, ...prev]);

    // Add notification
    const newNotif: RecruiterNotificationItem = {
      id: `rec_notif_${Date.now()}`,
      type: "internship",
      title: "New Internship Published",
      description: `"${internship.title}" is now active and live for students to apply.`,
      timestamp: "Just now",
      isRead: false,
      actionUrl: "/dashboard/recruiter/internships",
    };
    setRecruiterNotifications((prev) => [newNotif, ...prev]);

    success(`Internship "${internship.title}" published successfully!`);
  };

  const updateRecruiterInternshipStatus = (id: string, status: RecruiterInternshipStatus) => {
    setRecruiterInternships((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    success(`Internship status updated to ${status}`);
  };

  const updateRecruiterInternship = (id: string, updates: Partial<RecruiterInternship>) => {
    setRecruiterInternships((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    success("Internship details updated");
  };

  const updateApplicantStatus = (applicantId: string, status: ApplicationStatus) => {
    setRecruiterApplicants((prev) =>
      prev.map((app) => (app.id === applicantId ? { ...app, status } : app))
    );
    success(`Candidate status updated to ${status}`);
  };

  const addApplicantNote = (applicantId: string, note: string) => {
    setRecruiterApplicants((prev) =>
      prev.map((app) => (app.id === applicantId ? { ...app, notes: note } : app))
    );
    success("Note added to candidate profile");
  };

  const toggleShortlistCandidate = (studentId: string) => {
    setRecruiterStudents((prev) =>
      prev.map((cand) => {
        if (cand.id === studentId) {
          const nextVal = !cand.isShortlisted;
          if (nextVal) {
            success(`${cand.name} added to your shortlisted candidates`);
          } else {
            info(`${cand.name} removed from shortlist`);
          }
          return { ...cand, isShortlisted: nextVal };
        }
        return cand;
      })
    );
  };

  const sendRecruiterMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;

    const newMsg = {
      id: `msg_rec_${Date.now()}`,
      conversationId,
      senderId: "recruiter_01",
      senderName: "Barun",
      senderAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      content: text.trim(),
      timestamp: "Just now",
      isSelf: true,
    };

    setRecruiterConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: {
              text: text.trim(),
              timestamp: "Just now",
              isUnread: false,
            },
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      })
    );

    // Simulated candidate response
    setTimeout(() => {
      const activeConv = recruiterConversations.find((c) => c.id === conversationId);
      if (!activeConv) return;

      const replyMsg = {
        id: `msg_reply_c_${Date.now()}`,
        conversationId,
        senderId: activeConv.participant.id,
        senderName: activeConv.participant.name,
        senderAvatar: activeConv.participant.avatar,
        content: `Hi Barun! Thanks for the update. Looking forward to our next steps!`,
        timestamp: "Just now",
        isSelf: false,
      };

      setRecruiterConversations((currentConvs) =>
        currentConvs.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: {
                text: replyMsg.content,
                timestamp: "Just now",
                isUnread: true,
              },
              messages: [...conv.messages, replyMsg],
            };
          }
          return conv;
        })
      );
    }, 1500);
  };

  const startRecruiterConversation = (candidate: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    college: string;
  }): string => {
    const existing = recruiterConversations.find(
      (c) => c.participant.id === candidate.id || c.participant.name === candidate.name
    );

    if (existing) {
      setActiveRecruiterConversationId(existing.id);
      return existing.id;
    }

    const newConvId = `rec_conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      participant: {
        id: candidate.id,
        name: candidate.name,
        avatar: candidate.avatar,
        role: `${candidate.college} • ${candidate.role}`,
        companyOrCollege: candidate.college,
        isOnline: true,
        type: "peer",
      },
      lastMessage: {
        text: "Conversation started",
        timestamp: "Just now",
        isUnread: false,
      },
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          conversationId: newConvId,
          senderId: "recruiter_01",
          senderName: "Barun",
          senderAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
          content: `Hi ${candidate.name}! I noticed your impressive background on CommandSkill and wanted to reach out regarding our 2026 internship openings at Stripe.`,
          timestamp: "Just now",
          isSelf: true,
        },
      ],
    };

    setRecruiterConversations((prev) => [newConv, ...prev]);
    setActiveRecruiterConversationId(newConvId);
    return newConvId;
  };

  const updateCompanyProfile = (updates: Partial<CompanyInfo>) => {
    setRecruiterCompany((prev) => ({ ...prev, ...updates }));
    success("Company profile updated successfully!");
  };

  const markRecruiterNotificationAsRead = (id: string) => {
    setRecruiterNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllRecruiterNotificationsAsRead = () => {
    setRecruiterNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    success("All recruiter notifications marked as read");
  };

  const unreadRecruiterNotificationsCount = recruiterNotifications.filter((n) => !n.isRead).length;

  const scheduleInterview = (
    data: Omit<RecruiterInterview, "id" | "createdAt" | "status">
  ) => {
    const newInterview: RecruiterInterview = {
      ...data,
      id: `interview_${Date.now()}`,
      status: "Scheduled",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setRecruiterInterviews((prev) => [newInterview, ...prev]);

    // Also update applicant status if matched
    setRecruiterApplicants((prev) =>
      prev.map((app) =>
        app.studentId === data.candidateId ? { ...app, status: "Interview" } : app
      )
    );

    // Push recruiter notification
    setRecruiterNotifications((prev) => [
      {
        id: `rec_notif_${Date.now()}`,
        type: "interview",
        title: "Interview Scheduled",
        description: `${data.type} round confirmed with ${data.candidateName} for ${data.date} at ${data.time}.`,
        timestamp: "Just now",
        isRead: false,
        actionUrl: "/dashboard/recruiter/interviews",
      },
      ...prev,
    ]);

    // Push student notification
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        type: "application",
        title: "Interview Invitation Received!",
        description: `Stripe has scheduled your ${data.type} interview for ${data.internshipTitle} on ${data.date} at ${data.time}.`,
        timestamp: "Just now",
        isRead: false,
        actionUrl: "/dashboard/applications",
      },
      ...prev,
    ]);

    success(`Interview successfully scheduled with ${data.candidateName}!`);
  };

  const rescheduleInterview = (id: string, newDate: string, newTime: string) => {
    setRecruiterInterviews((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, date: newDate, time: newTime, status: "Rescheduled" } : int
      )
    );
    success("Interview rescheduled successfully!");
  };

  const cancelInterview = (id: string, reason?: string) => {
    setRecruiterInterviews((prev) =>
      prev.map((int) =>
        int.id === id
          ? {
              ...int,
              status: "Cancelled",
              notes: reason ? `${int.notes ? int.notes + " | " : ""}Cancelled: ${reason}` : int.notes,
            }
          : int
      )
    );
    info("Interview has been marked as cancelled.");
  };

  const completeInterview = (id: string, feedback?: string) => {
    setRecruiterInterviews((prev) =>
      prev.map((int) =>
        int.id === id
          ? { ...int, status: "Completed", feedback: feedback || int.feedback }
          : int
      )
    );
    success("Interview marked as completed!");
  };

  return (
    <DataContext.Provider
      value={{
        // Student
        internships,
        savedInternshipIds,
        toggleSaveInternship,
        isInternshipSaved,
        applications,
        applyToInternship,
        updateApplicationStatus,
        hasAppliedToInternship,
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        communities,
        toggleJoinCommunity,
        upvotePost,
        createPost,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        projects,
        addProject,
        removeProject,

        // Recruiter
        recruiterInternships,
        addRecruiterInternship,
        updateRecruiterInternshipStatus,
        updateRecruiterInternship,
        recruiterApplicants,
        updateApplicantStatus,
        addApplicantNote,
        recruiterStudents,
        toggleShortlistCandidate,
        recruiterConversations,
        activeRecruiterConversationId,
        setActiveRecruiterConversationId,
        sendRecruiterMessage,
        startRecruiterConversation,
        recruiterCompany,
        updateCompanyProfile,
        recruiterNotifications,
        unreadRecruiterNotificationsCount,
        markRecruiterNotificationAsRead,
        markAllRecruiterNotificationsAsRead,
        recruiterInterviews,
        scheduleInterview,
        rescheduleInterview,
        cancelInterview,
        completeInterview,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}


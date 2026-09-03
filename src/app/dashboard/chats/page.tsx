"use client";

import { Suspense } from "react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Send, Paperclip, Mic, Video,
  Calendar, FileText, CheckCircle, Globe,
  Loader2, MessageCircle, Phone, X, Square,
  Play, Pause, File as FileIcon, Users, Handshake,
  ShieldCheck, AlertTriangle, TrendingUp,
  Clock, ChevronDown, Info, Zap, Sparkles,
  Edit2, Trash2, Copy, Flag, Check, Download, AlertCircle, FileCheck, Shield, Lock,
  MoreVertical, MoreHorizontal, Briefcase, ChevronRight, Bot, Headphones, Eye, EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { useSubscription } from "@/hooks/useSubscription";
import TierBadge from "@/components/TierBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import DocumentWatermarkViewer from "@/components/DocumentWatermarkViewer";
import { useCall } from "@/context/CallContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_tier: string;
  trust_score: number;
  role?: string;
  is_scam?: boolean;
  is_banned?: boolean;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  delivery_status?: string;
  is_read?: boolean;
  is_edited?: boolean;
  is_deleted?: boolean;
  profiles: Profile;
};

type Conversation = {
  id: string;
  otherUser: Profile;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
  dealStage?: string | null;
  projectName?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function isImageFile(name: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

const DEAL_STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nda: { label: "NDA Stage", color: "text-blue-400", bg: "bg-blue-900/20" },
  term_sheet: { label: "Term Sheet", color: "text-purple-400", bg: "bg-purple-900/20" },
  agreement: { label: "Agreement", color: "text-[#C9A84C]", bg: "bg-[#C9A84C10]" },
  closed: { label: "Deal Closed", color: "text-emerald-400", bg: "bg-emerald-900/20" },
};

const TIER_COLORS: Record<string, string> = {
  premium: "text-[#C9A84C]",
  pro: "text-blue-400",
  free: "text-[#5C5A70]",
};

// ─── Main Component ───────────────────────────────────────────────────────────

function ChatsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { features } = useSubscription();

  const {
    recording, audioBlob, duration,
    startRecording, stopRecording, cancelRecording, resetAudio,
  } = useVoiceRecorder();

  // Auth
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    full_name: string;
    role?: string;
    avatar_url?: string | null;
    subscription_tier?: string;
    is_anonymous?: boolean;
  } | null>(null);
  const [togglingAnon, setTogglingAnon] = useState(false);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    searchParams.get("conversationId") || null
  );

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Moderation
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  // Upgrade
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);

  // Calling & Modals
  const { startCall } = useCall();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showDealInfo, setShowDealInfo] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "", agenda: "", date: "", time: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Message Actions
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState("Spam or scam");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // NDA Signing Modal
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [selectedNdaMsg, setSelectedNdaMsg] = useState<Message | null>(null);
  const [ndaForm, setNdaForm] = useState({
    legalName: "",
    title: "Authorized Signer",
    companyName: "",
    agreed: false,
  });
  const [signingNda, setSigningNda] = useState(false);
  const [watermarkModal, setWatermarkModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: "",
  });

  // Mobile
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    searchParams.get("conversationId") ? "chat" : "list"
  );

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeConversationId);
  const isConciergeConvo = activeConvo?.otherUser?.role === "admin" || activeConvo?.otherUser?.full_name?.toLowerCase().includes("concierge");
  const isTalentConvo = !isConciergeConvo && (currentUser?.role === "talent" || activeConvo?.otherUser?.role === "talent");
  const dealStageInfo = (!isTalentConvo && !isConciergeConvo && activeConvo?.dealStage)
    ? DEAL_STAGE_CONFIG[activeConvo.dealStage]
    : null;

  // Clean Conversation Switching Helper
  const selectConversation = (targetId: string) => {
    setMobileView("chat");
    if (activeConversationId === targetId) return;

    // Save draft for previous conversation
    if (activeConversationId) {
      setDrafts((prev) => ({
        ...prev,
        [activeConversationId]: input,
      }));
    }

    // Switch active conversation and view
    setActiveConversationId(targetId);

    // Load draft for target conversation or start completely fresh
    setInput(drafts[targetId] || "");

    // Clear previous banners, moderation warnings, and upgrade modals
    setUpgradePrompt(null);
    setModerationWarning(null);
    setBlockedMessage(null);
    setPendingContent(null);
    cancelRecording();
    resetAudio();
  };

  const handleOpenConcierge = async () => {
    if (!currentUser) return;
    try {
      // Find admin profile or fallback profile
      let { data: adminUser } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (!adminUser) {
        const { data: firstUser } = await supabase
          .from("profiles")
          .select("id, full_name")
          .neq("id", currentUser.id)
          .limit(1)
          .maybeSingle();
        adminUser = firstUser;
      }

      if (adminUser && adminUser.id !== currentUser.id) {
        const res = await fetch("/api/conversations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            otherUserId: adminUser.id,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.conversationId) {
            await fetchConversations(currentUser.id);
            selectConversation(json.conversationId);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Concierge conversation init error:", e);
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConversationId && currentUser) {
      markRead();
      setConversations((prev) =>
        prev.map((c) => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)
      );
    }
  }, [activeConversationId, currentUser]);

  // ─── Realtime ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`msgs:${activeConversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from("messages")
          .select(`*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier, trust_score)`)
          .eq("id", payload.new.id)
          .single();

        if (data) {
          setMessages((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data]);
          if (data.sender_id !== currentUser?.id) markRead();
          setConversations((prev) =>
            prev.map((c) => c.id === activeConversationId
              ? { ...c, lastMessage: data.content, lastMessageTime: data.created_at }
              : c)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, currentUser, supabase]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchConversations = async (userId: string) => {
    setLoadingConvos(true);
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      const { conversations: data } = await res.json();
      setConversations(data || []);
      return data || [];
    } catch (e) {
      console.error("Error fetching conversations:", e);
      return [];
    } finally {
      setLoadingConvos(false);
    }
  };

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, subscription_tier, is_anonymous")
      .eq("id", user.id)
      .single();
    if (profile) {
      setCurrentUser(profile);
      await fetchConversations(profile.id);
    }
  };

  const toggleAnonymous = async () => {
    if (!currentUser) return;
    if (currentUser.subscription_tier !== "premium" && !features.canBrowseAnonymously) {
      router.push("/dashboard/upgrade");
      return;
    }
    const newStatus = !currentUser.is_anonymous;
    setTogglingAnon(true);
    setCurrentUser((prev) => (prev ? { ...prev, is_anonymous: newStatus } : prev));
    try {
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          updates: { is_anonymous: newStatus },
        }),
      });
      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    } catch (e) {
      console.error("Error toggling anonymous mode:", e);
    } finally {
      setTogglingAnon(false);
    }
  };

  // Handle URL query parameters to auto-start/open conversations
  useEffect(() => {
    if (!currentUser) return;

    const targetUserId = searchParams.get("user") || searchParams.get("userId");
    const targetConversationId = searchParams.get("conversationId");

    const openTargetConversation = async () => {
      if (targetUserId && targetUserId !== currentUser.id) {
        try {
          const res = await fetch("/api/conversations/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id, otherUserId: targetUserId }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.conversationId) {
              await fetchConversations(currentUser.id);
              selectConversation(data.conversationId);
            }
          }
        } catch (err) {
          console.error("Error starting conversation from url params:", err);
        }
      } else if (targetConversationId) {
        selectConversation(targetConversationId);
      }
    };

    openTargetConversation();
  }, [searchParams, currentUser]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const userIdParam = currentUser?.id ? `&userId=${currentUser.id}` : "";
    const res = await fetch(`/api/messages?conversationId=${conversationId}${userIdParam}`);
    const { messages: data } = await res.json();
    setMessages(data || []);
    setLoadingMessages(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeConversationId) fetchMessages(activeConversationId);
  }, [activeConversationId, fetchMessages]);

  const markRead = async () => {
    if (!activeConversationId || !currentUser) return;
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, userId: currentUser.id }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("messages-read", { detail: { conversationId: activeConversationId } }));
      }
    } catch {}
  };

  // ─── Moderation ───────────────────────────────────────────────────────────

  const moderateContent = async (content: string): Promise<boolean> => {
    const res = await fetch("/api/messages/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();

    if (data.flagged && !data.warningOnly) {
      setBlockedMessage(data.reason);
      return false; // block send
    }

    if (data.flagged && data.warningOnly) {
      setModerationWarning(data.reason);
      setPendingContent(content);
      return false; // pause, ask user to confirm
    }

    return true; // allow
  };

  const sendAfterWarning = async () => {
    if (!pendingContent) return;
    setModerationWarning(null);
    await doSend(pendingContent);
    setPendingContent(null);
  };

  // ─── Send message ─────────────────────────────────────────────────────────

  const doSend = async (content: string) => {
    if (!activeConversationId || !currentUser) return;
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          senderId: currentUser.id,
          content,
          messageType: "text",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.message) {
          setMessages((prev) => {
            let next = prev.find((m) => m.id === data.message.id) ? prev : [...prev, data.message];
            if (data.botMessage && !next.find((m) => m.id === data.botMessage.id)) {
              next = [...next, data.botMessage];
            }
            return next;
          });
        } else {
          await fetchMessages(activeConversationId);
        }
        await fetchConversations(currentUser.id);
      } else {
        if (data.upgradeRequired) {
          setUpgradePrompt(data.error);
          setInput(content);
        }
        if (data.flagged || data.moderated) {
          setBlockedMessage(data.reason || data.error);
        }
      }
    } catch (err) {
      console.error("Message dispatch exception:", err);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");

    const allowed = await moderateContent(content);
    if (!allowed) return;

    await doSend(content);
  };

  // ─── File upload ──────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !currentUser) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", activeConversationId);
      formData.append("senderId", currentUser.id);
      const res = await fetch("/api/messages/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => (prev.find((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
    } catch (err) {
      console.error("File upload error:", err);
      alert("File upload failed. Please try again.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Voice note ───────────────────────────────────────────────────────────

  const sendVoiceNote = async () => {
    if (!audioBlob || !activeConversationId || !currentUser) return;
    setUploadingFile(true);
    try {
      const mime = audioBlob.type || "audio/webm";
      const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
      const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mime });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", activeConversationId);
      formData.append("senderId", currentUser.id);
      const res = await fetch("/api/messages/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => (prev.find((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
      resetAudio();
    } catch (err) {
      console.error("Voice note send error:", err);
      alert("Failed to send voice note. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  // ─── NDA Request ──────────────────────────────────────────────────────────

  const handleNDA = async () => {
    if (!activeConversationId || !currentUser) return;
    try {
      const res = await fetch("/api/messages/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          senderId: currentUser.id,
          senderName: currentUser.full_name,
          recipientId: activeConvo?.otherUser?.id,
          recipientName: activeConvo?.otherUser?.full_name,
          projectName: activeConvo?.projectName || "Investment Deal",
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => (prev.find((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
    } catch (err) {
      console.error("Failed to request NDA:", err);
    }
  };

  // ─── NDA Review & Sign ───────────────────────────────────────────────────

  const openSignNdaModal = (msg: Message) => {
    setSelectedNdaMsg(msg);
    setNdaForm({
      legalName: currentUser?.full_name || "",
      title: "Authorized Signer",
      companyName: "",
      agreed: false,
    });
    setShowNdaModal(true);
  };

  const submitNdaSignature = async () => {
    if (!selectedNdaMsg || !currentUser || !ndaForm.legalName.trim() || !ndaForm.agreed) return;
    setSigningNda(true);
    try {
      const res = await fetch("/api/messages/nda/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: selectedNdaMsg.id,
          conversationId: activeConversationId,
          signerId: currentUser.id,
          signerName: ndaForm.legalName.trim(),
          signerTitle: ndaForm.title.trim(),
          companyName: ndaForm.companyName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === selectedNdaMsg.id ? { ...m, content: JSON.stringify(data.signedPayload) } : m
          )
        );
        setShowNdaModal(false);
        setSelectedNdaMsg(null);
      } else {
        alert(data.error || "Failed to sign NDA");
      }
    } catch (err) {
      console.error("NDA sign error:", err);
      alert("Failed to submit NDA signature.");
    } finally {
      setSigningNda(false);
    }
  };

  // ─── Message Actions (Edit, Delete, Copy, Report) ─────────────────────────

  const startEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditInput(msg.content);
    setActiveMenuMessageId(null);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditInput("");
  };

  const saveEditMessage = async () => {
    if (!editingMessageId || !editInput.trim() || !currentUser) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: editingMessageId,
          senderId: currentUser.id,
          content: editInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId ? { ...m, content: data.message.content, is_edited: true } : m
          )
        );
        setEditingMessageId(null);
        setEditInput("");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Edit message error:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (msg: Message) => {
    setMessageToDelete(msg);
    setDeleteConfirmModalOpen(true);
    setActiveMenuMessageId(null);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !currentUser) return;
    const msgId = messageToDelete.id;
    setDeletingMessageId(msgId);
    try {
      const res = await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msgId,
          senderId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: "This message was deleted", is_deleted: true, file_url: undefined }
              : m
          )
        );
        setDeleteConfirmModalOpen(false);
        setMessageToDelete(null);
      }
    } catch (err) {
      console.error("Delete message error:", err);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const copyMessage = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(msgId);
    setActiveMenuMessageId(null);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const openReportModal = (msg: Message) => {
    setReportingMessage(msg);
    setReportReason("Spam or scam");
    setReportDetails("");
    setReportModalOpen(true);
    setActiveMenuMessageId(null);
  };

  const submitReport = async () => {
    if (!reportingMessage || !currentUser) return;
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/messages/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: currentUser.id,
          reportedUserId: reportingMessage.sender_id,
          conversationId: activeConversationId,
          messageId: reportingMessage.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Report submitted successfully. Our safety team will review it.");
        setReportModalOpen(false);
        setReportingMessage(null);
      }
    } catch (err) {
      console.error("Report submission error:", err);
      alert("Failed to submit report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  // ─── Meeting ──────────────────────────────────────────────────────────────

  const handleScheduleMeeting = async () => {
    if (!meetingForm.title || !meetingForm.date || !meetingForm.time) return;
    const scheduledAt = new Date(`${meetingForm.date}T${meetingForm.time}`).toISOString();
    await fetch("/api/meetings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversationId,
        organizerId: currentUser?.id,
        participantId: activeConvo?.otherUser?.id,
        title: meetingForm.title,
        agenda: meetingForm.agenda,
        scheduledAt,
        timezone: meetingForm.timezone,
      }),
    });
    setShowMeetingModal(false);
    setMeetingForm({ title: "", agenda: "", date: "", time: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  };

  // ─── Call Handlers (Delegates to Global CallProvider) ──────────────────────

  const handleStartCall = (videoEnabled: boolean) => {
    if (!activeConversationId || !currentUser || !activeConvo?.otherUser) return;
    void startCall({
      recipientId: activeConvo.otherUser.id,
      recipientName: activeConvo.otherUser.full_name,
      recipientAvatar: activeConvo.otherUser.avatar_url,
      isVideo: videoEnabled,
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-[#0A0A0F] flex flex-col overflow-hidden">

      {/* TOP BAR */}
      <header className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} bg-[#0A0A0F] border-b border-[#1A1A2E] px-4 py-3 items-center justify-between gap-3 shrink-0 z-20`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => router.push(
              currentUser?.role === "talent" 
                ? "/dashboard/talent" 
                : currentUser?.role === "builder" 
                ? "/dashboard/builder" 
                : "/dashboard/investor"
            )}
            className="p-1.5 -ml-1 rounded-lg hover:bg-[#1A1A2E] text-[#8E8CA0] hover:text-[#F0EEE8] transition shrink-0"
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <img
            src="/logo-icon.png"
            alt="REACH"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0 object-contain shadow-sm shadow-[#C9A84C]/20 cursor-pointer"
            onClick={() => router.push(
              currentUser?.role === "talent" 
                ? "/dashboard/talent" 
                : currentUser?.role === "builder" 
                ? "/dashboard/builder" 
                : "/dashboard/investor"
            )}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold text-[#F0EEE8] leading-tight truncate flex items-center gap-1.5">
              <span>R<span className="text-[#C9A84C]">EACH</span></span>
              <span className="text-[#3A3A52] text-xs hidden sm:inline">·</span>
              <span className="text-xs font-medium text-[#A8A6B8] hidden sm:inline">
                {currentUser?.role === "talent" ? "Messages & Hiring" : "Deal Room"}
              </span>
            </h1>
            <p className="text-[#6B6A7A] text-[11px] hidden sm:block truncate mt-0.5">
              {currentUser?.role === "talent" ? "Recruiter Channels · Direct Hiring" : "Secure · Monitored · Compliant Deal Room"}
            </p>
          </div>
        </div>

        {/* Anonymous Mode Switch for Investors */}
        {currentUser?.role === "investor" && (
          <button
            type="button"
            onClick={toggleAnonymous}
            disabled={togglingAnon}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer shrink-0 ${
              currentUser.is_anonymous
                ? "bg-[#C9A84C]/20 border-[#C9A84C]/60 text-[#C9A84C] shadow-[0_0_12px_rgba(201,168,76,0.25)] hover:bg-[#C9A84C]/25"
                : "bg-[#1A1A2E] border-[#3A3A52] text-[#8E8CA0] hover:text-[#F5F3ED] hover:border-[#5C5A70]"
            }`}
            title={
              currentUser.subscription_tier !== "premium" && !features.canBrowseAnonymously
                ? "Upgrade to Premium to chat anonymously"
                : currentUser.is_anonymous
                ? "Anonymous Chat Active: Profile hidden from founders. Click to turn off."
                : "Click to enable Anonymous Chat"
            }
          >
            {currentUser.is_anonymous ? <EyeOff size={13} className="text-[#C9A84C]" /> : <Eye size={13} />}
            <span className="whitespace-nowrap text-xs font-semibold">
              {currentUser.is_anonymous ? "Anonymous ON" : "Anonymous OFF"}
            </span>
            {currentUser.subscription_tier !== "premium" && !features.canBrowseAnonymously && (
              <span className="text-[8px] tracking-wider bg-[#C9A84C] text-[#0A0A0F] font-black px-1.5 py-0.2 rounded uppercase">
                PRO
              </span>
            )}
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full shrink-0">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-semibold">Protected</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* CONVERSATION LIST */}
        <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex flex-col w-full md:w-72 border-r border-[#1A1A2E] shrink-0 overflow-hidden bg-[#0D0D16]`}>

          {/* List header */}
          <div className="px-4 py-3 border-b border-[#1A1A2E]">
            <div className="text-[#F0EEE8] text-sm font-medium">Conversations</div>
            <div className="text-[#6B6A7A] text-xs mt-0.5">
              {conversations.length} active
            </div>
          </div>

          {/* Community shortcut */}
          <button
            onClick={() => router.push("/dashboard/community")}
            className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A2E] hover:bg-[#1A1A2E] transition text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#C9A84C15] border border-[#C9A84C25] flex items-center justify-center shrink-0">
              <Users size={16} className="text-[#C9A84C]" />
            </div>
            <div>
              <div className="text-[#F0EEE8] text-xs font-medium">REACH Community</div>
              <div className="text-[#6B6A7A] text-xs">
                {currentUser?.role === "talent" ? "Networking & opportunities" : "Global deal discussions"}
              </div>
            </div>
          </button>

          {/* Dedicated VIP Support Channel for Pro Users */}
          {((currentUser?.subscription_tier === 'pro' || currentUser?.subscription_tier === 'premium') || currentUser?.role === 'talent') && (
            <button
              type="button"
              onClick={handleOpenConcierge}
              className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-[#1A1A2E] hover:bg-[#1A1A2E] transition text-left bg-gradient-to-r from-[#C9A84C08] to-transparent"
            >
              <div className="w-9 h-9 rounded-lg bg-[#C9A84C20] border border-[#C9A84C40] flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-[#C9A84C]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#F0EEE8] text-xs font-semibold truncate">Priority VIP Support</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#C9A84C] text-[#0A0A0F]">PRO</span>
                </div>
                <div className="text-[#6B6A7A] text-[11px] truncate">Dedicated concierge channel</div>
              </div>
            </button>
          )}

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Pinned REACH Live Concierge Bot Hotline */}
            <button
              onClick={handleOpenConcierge}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#C9A84C]/15 to-[#1A1A2E] border border-[#C9A84C]/40 hover:border-[#C9A84C] transition text-left cursor-pointer shadow-lg shadow-[#C9A84C]/5"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0F0F1A] border border-[#C9A84C]/50 flex items-center justify-center shrink-0 p-1.5 overflow-hidden shadow-md shadow-[#C9A84C]/10">
                <img
                  src="/logo-icon.png"
                  alt="REACH Concierge AI"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#F5F3ED] truncate">REACH Live Concierge</h4>
                  <span className="text-[9px] uppercase font-bold text-[#C9A84C] bg-[#C9A84C]/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Sparkles size={10} /> 24/7 Bot
                  </span>
                </div>
                <p className="text-[11px] text-[#A8A6B8] truncate mt-0.5">Click for instant AI platform support</p>
              </div>
            </button>
            {loadingConvos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="text-[#C9A84C] animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 gap-2">
                <MessageCircle size={24} className="text-[#1A1A2E]" />
                <p className="text-[#6B6A7A] text-xs text-center">
                  {currentUser?.role === "talent"
                    ? "No conversations yet. Apply to jobs or reach out to hiring managers directly."
                    : "No conversations yet. Start by messaging a founder or investor from their profile."}
                </p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[#1A1A2E] text-left transition w-full ${
                    activeConversationId === c.id
                      ? "bg-[#C9A84C08] border-l-2 border-l-[#C9A84C]"
                      : "hover:bg-[#1A1A2E]"
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0 relative">
                    {c.otherUser?.avatar_url ? (
                      <img src={c.otherUser.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      getInitials(c.otherUser?.full_name || "?")
                    )}
                    {c.otherUser?.is_verified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0D0D16] flex items-center justify-center">
                        <CheckCircle size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#F0EEE8] text-xs font-medium truncate">
                          {c.otherUser?.full_name}
                        </span>
                        <VerifiedBadge tier={c.otherUser?.subscription_tier} isVerified={c.otherUser?.is_verified} size={13} />
                      </div>
                      {c.lastMessageTime && (
                        <span className="text-[#3A3A52] text-xs shrink-0">
                          {timeAgo(c.lastMessageTime)}
                        </span>
                      )}
                    </div>

                    {/* Badge: Talent recruitment vs Investment deal stage */}
                    {c.otherUser?.role === "talent" || currentUser?.role === "talent" ? (
                      <div className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded mb-0.5 bg-[#C9A84C15] text-[#C9A84C]">
                        <Briefcase size={9} className="text-[#C9A84C]" />
                        <span className="text-xs text-[#C9A84C]">
                          {c.otherUser?.role === "talent" ? "Candidate" : "Hiring Team"}
                        </span>
                      </div>
                    ) : c.dealStage && DEAL_STAGE_CONFIG[c.dealStage] ? (
                      <div className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded mb-0.5 ${DEAL_STAGE_CONFIG[c.dealStage].bg}`}>
                        <Handshake size={9} className={DEAL_STAGE_CONFIG[c.dealStage].color} />
                        <span className={`text-xs ${DEAL_STAGE_CONFIG[c.dealStage].color}`}>
                          {DEAL_STAGE_CONFIG[c.dealStage].label}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between">
                      <p className="text-[#6B6A7A] text-xs truncate max-w-[140px]">
                        {c.lastMessage || "Start the conversation"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 bg-[#C9A84C] rounded-full text-[#0A0A0F] text-xs flex items-center justify-center font-medium shrink-0 ml-1">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden w-full h-full`}>

          {activeConvo ? (
            <>
              {/* CHAT HEADER */}
              <div className="bg-[#0D0D16] border-b border-[#1A1A2E] flex flex-col shrink-0">

                {/* Main header row */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <button 
                      className="md:hidden p-1.5 -ml-1 text-[#A8A6B8] hover:text-[#F5F3ED] hover:bg-[#1A1A2E] rounded-lg transition" 
                      onClick={() => setMobileView("list")}
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    {/* Avatar */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F0F1A] border border-[#C9A84C]/50 flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden shadow-md">
                      {isConciergeConvo ? (
                        <img
                          src="/logo-icon.png"
                          alt="REACH Concierge AI"
                          className="w-full h-full object-contain"
                        />
                      ) : activeConvo.otherUser?.avatar_url ? (
                        <img src={activeConvo.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(activeConvo.otherUser?.full_name || "?")
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#F0EEE8] text-sm font-semibold truncate">
                          {isConciergeConvo ? "REACH Live Concierge" : activeConvo.otherUser?.full_name}
                        </span>
                        {!isConciergeConvo && (
                          <VerifiedBadge 
                            tier={activeConvo.otherUser?.subscription_tier} 
                            isVerified={activeConvo.otherUser?.is_verified} 
                            isScam={activeConvo.otherUser?.is_scam}
                            isBanned={activeConvo.otherUser?.is_banned}
                            size={14} 
                          />
                        )}
                        {isConciergeConvo && (
                          <span className="text-[9px] uppercase font-bold text-[#C9A84C] bg-[#C9A84C]/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles size={10} /> 24/7 Bot
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#5C5A70] truncate">
                        {isConciergeConvo ? (
                          <span className="text-[#C9A84C] font-medium">Automated Support & FAQ Guidance</span>
                        ) : activeConvo.otherUser?.is_scam ? (
                          <span className="text-red-400 font-extrabold flex items-center gap-1">
                            <AlertTriangle size={10} /> FRAUD / SCAM ALERT
                          </span>
                        ) : isTalentConvo ? (
                          <span className="flex items-center gap-1 text-[#C9A84C] font-medium">
                            <Briefcase size={10} />
                            {activeConvo.otherUser?.role === "talent" ? "Job Candidate" : "Hiring Manager"}
                          </span>
                        ) : activeConvo.otherUser?.trust_score > 0 ? (
                          <span>⭐ {activeConvo.otherUser.trust_score.toFixed(1)} trust</span>
                        ) : (
                          <span className="capitalize">{activeConvo.otherUser?.role || "Member"}</span>
                        )}
                        {!isConciergeConvo && (
                          <>
                            <span className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[#5C5A70]">
                              <Globe size={9} /> {isTalentConvo ? "Hiring Channel" : "Monitored"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Call and info buttons (Hidden for Concierge Bot) */}
                  {!isConciergeConvo && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentUser?.role === "investor" && (
                        <button
                          type="button"
                          onClick={toggleAnonymous}
                          disabled={togglingAnon}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer shrink-0 ${
                            currentUser.is_anonymous
                              ? "bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]"
                              : "border-[#2A2A3E] bg-[#141424] hover:bg-[#1A1A2E] text-[#8E8CA0] hover:text-[#F5F3ED]"
                          }`}
                          title={
                            currentUser.is_anonymous
                              ? "Anonymous Mode is ON. Click to toggle OFF."
                              : "Anonymous Mode is OFF. Click to toggle ON."
                          }
                        >
                          {currentUser.is_anonymous ? <EyeOff size={13} className="text-[#C9A84C]" /> : <Eye size={13} />}
                          <span className="hidden sm:inline text-[11px]">
                            {currentUser.is_anonymous ? "Anonymous ON" : "Anonymous OFF"}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => handleStartCall(false)}
                        className="w-8 h-8 flex items-center justify-center border border-[#2A2A3E] bg-[#141424] hover:bg-[#1A1A2E] text-[#A8A6B8] hover:text-[#C9A84C] rounded-lg transition"
                        title={isTalentConvo ? "Voice interview call" : "Voice call"}
                      >
                        <Phone size={14} />
                      </button>
                      <button
                        onClick={() => handleStartCall(true)}
                        className="w-8 h-8 flex items-center justify-center border border-[#2A2A3E] bg-[#141424] hover:bg-[#1A1A2E] text-[#A8A6B8] hover:text-[#C9A84C] rounded-lg transition"
                        title={isTalentConvo ? "Video interview call" : "Video call"}
                      >
                        <Video size={14} />
                      </button>
                      <button
                        onClick={() => setShowDealInfo(!showDealInfo)}
                        className={`w-8 h-8 flex items-center justify-center border rounded-lg transition ${
                          showDealInfo
                            ? "bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]"
                            : "border-[#2A2A3E] bg-[#141424] hover:bg-[#1A1A2E] text-[#A8A6B8] hover:text-[#F5F3ED]"
                        }`}
                        title={isTalentConvo ? "Hiring & Role Info" : "Deal info"}
                      >
                        {isTalentConvo ? <Briefcase size={14} /> : <Info size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-bar: Concierge support channel vs Talent channel vs Deal stage */}
                {isConciergeConvo ? (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-[#1A1A2E] bg-[#C9A84C08]">
                    <div className="flex items-center gap-2">
                      <Bot size={13} className="text-[#C9A84C]" />
                      <span className="text-xs font-medium text-[#C9A84C]">
                        REACH 24/7 Platform Assistant & FAQ Guidance Channel
                      </span>
                    </div>
                  </div>
                ) : isTalentConvo ? (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-[#1A1A2E] bg-[#C9A84C08]">
                    <div className="flex items-center gap-2">
                      <Briefcase size={13} className="text-[#C9A84C]" />
                      <span className="text-xs font-medium text-[#C9A84C]">
                        Talent & Recruitment Channel
                      </span>
                      {activeConvo.projectName && (
                        <span className="text-[#6B6A7A] text-xs">· {activeConvo.projectName}</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(currentUser?.role === "talent" ? "/dashboard/talent/applications" : "/dashboard/jobs/manage")}
                      className="text-xs text-[#C9A84C] hover:underline flex items-center gap-1 font-medium"
                    >
                      {currentUser?.role === "talent" ? "My Applications" : "Manage Jobs"} <ChevronRight size={11} />
                    </button>
                  </div>
                ) : dealStageInfo ? (
                  <div className={`flex items-center justify-between px-4 py-2 border-t border-[#1A1A2E] ${dealStageInfo.bg}`}>
                    <div className="flex items-center gap-2">
                      <Handshake size={13} className={dealStageInfo.color} />
                      <span className={`text-xs font-medium ${dealStageInfo.color}`}>
                        {dealStageInfo.label}
                      </span>
                      {activeConvo.projectName && (
                        <span className="text-[#6B6A7A] text-xs">· {activeConvo.projectName}</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/deals")}
                      className={`text-xs ${dealStageInfo.color} hover:underline flex items-center gap-1`}
                    >
                      View pipeline <TrendingUp size={10} />
                    </button>
                  </div>
                ) : null}

                {/* Active Anonymity Notice Banner for Investors */}
                {currentUser?.role === "investor" && currentUser?.is_anonymous && (
                  <div className="flex items-center justify-between px-4 py-2 bg-[#C9A84C]/10 border-t border-[#C9A84C]/25 text-xs text-[#C9A84C]">
                    <div className="flex items-center gap-2 min-w-0">
                      <EyeOff size={13} className="text-[#C9A84C] shrink-0" />
                      <span className="truncate">
                        <strong>Anonymous Mode Active:</strong> Founders see your messages from &ldquo;Anonymous Investor&rdquo;.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleAnonymous}
                      disabled={togglingAnon}
                      className="text-[11px] underline hover:text-[#F5F3ED] font-semibold shrink-0 ml-3 cursor-pointer"
                    >
                      Turn Off
                    </button>
                  </div>
                )}

                {/* Policy banner */}
                <div className="flex items-center gap-2 px-4 py-1.5 border-t border-[#1A1A2E] bg-[#0A0A0F]">
                  <ShieldCheck size={11} className="text-[#3A3A52] flex-shrink-0" />
                  <span className="text-[#3A3A52] text-xs">
                    {isTalentConvo
                      ? "Professional hiring channel. Share resumes, schedule screening calls, and collaborate safely."
                      : "All messages are monitored for compliance. Do not share personal contact details."}
                  </span>
                </div>
              </div>

              {/* CONTEXT INFO PANEL */}
              {showDealInfo && (
                isTalentConvo ? (
                  <div className="bg-[#0D0D16] border-b border-[#1A1A2E] px-4 py-3 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                        <FileText size={14} className="text-[#C9A84C] mx-auto mb-1" />
                        <div className="text-[#C9A84C] text-xs font-medium">Resume & CV</div>
                        <div className="text-[#6B6A7A] text-xs">In-App View</div>
                      </div>
                      <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                        <Calendar size={14} className="text-blue-400 mx-auto mb-1" />
                        <div className="text-blue-400 text-xs font-medium">Interview</div>
                        <div className="text-[#6B6A7A] text-xs">Direct Call</div>
                      </div>
                      <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                        <Briefcase size={14} className="text-emerald-400 mx-auto mb-1" />
                        <div className="text-emerald-400 text-xs font-medium">Pipeline</div>
                        <div className="text-[#6B6A7A] text-xs">Active Hiring</div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(currentUser?.role === "talent" ? "/dashboard/talent" : "/dashboard/jobs/manage")}
                      className="w-full mt-3 flex items-center justify-center gap-2 border border-[#C9A84C30] text-[#C9A84C] text-xs py-2 rounded-lg hover:bg-[#C9A84C08] transition"
                    >
                      <Briefcase size={13} />
                      {currentUser?.role === "talent" ? "Explore More Job Openings" : "Manage Job Postings"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#0D0D16] border-b border-[#1A1A2E] px-4 py-3 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                        <ShieldCheck size={14} className="text-emerald-400 mx-auto mb-1" />
                        <div className="text-emerald-400 text-xs font-medium">NDA</div>
                        <div className="text-[#6B6A7A] text-xs">Requested</div>
                      </div>
                      <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                        <Handshake size={14} className="text-[#C9A84C] mx-auto mb-1" />
                        <div className={`text-xs font-medium ${dealStageInfo?.color || "text-[#6B6A7A]"}`}>
                          {dealStageInfo?.label || "No active deal"}
                        </div>
                        <div className="text-[#6B6A7A] text-xs">Stage</div>
                      </div>
                      <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                        <TrendingUp size={14} className="text-[#C9A84C] mx-auto mb-1" />
                        <div className="text-[#C9A84C] text-xs font-medium">{activeConvo.otherUser?.trust_score?.toFixed(1) || "—"}</div>
                        <div className="text-[#6B6A7A] text-xs">Trust score</div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/deals")}
                      className="w-full mt-3 flex items-center justify-center gap-2 border border-[#C9A84C30] text-[#C9A84C] text-xs py-2 rounded-lg hover:bg-[#C9A84C08] transition"
                    >
                      <Handshake size={13} />
                      Open deal pipeline
                    </button>
                  </div>
                )
              )}

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-[#0A0A0F]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="text-[#C9A84C] animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center">
                      {isTalentConvo ? (
                        <Briefcase size={20} className="text-[#C9A84C]" />
                      ) : (
                        <Handshake size={20} className="text-[#C9A84C]" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[#F0EEE8] text-sm font-medium mb-1">
                        {isTalentConvo ? "Hiring channel opened" : "Deal room opened"}
                      </p>
                      <p className="text-[#6B6A7A] text-xs max-w-xs leading-relaxed">
                        {isTalentConvo
                          ? "Connect directly regarding job opportunities, portfolio work, technical questions, and interviews."
                          : "This is a secure, monitored deal room. Introduce yourself professionally and state your interest."}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full max-w-xs">
                      {(isTalentConvo
                        ? currentUser?.role === "talent"
                          ? [
                              "Hi! I'm interested in the job opening and would love to connect.",
                              "I've attached my latest resume and portfolio for your review.",
                              "I am available this week if you'd like to schedule a quick chat.",
                            ]
                          : [
                              "Hi! We reviewed your profile and application for the role.",
                              "Are you available for a brief introductory interview this week?",
                              "Could you share more details about your relevant experience?",
                            ]
                        : [
                            "I've reviewed your project and I'm interested in learning more.",
                            "Could you share more details about your traction?",
                            "I'd like to request an NDA before we proceed.",
                          ]
                      ).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setInput(suggestion)}
                          className="text-xs text-left px-3 py-2 bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg text-[#9998A8] hover:border-[#C9A84C30] hover:text-[#F0EEE8] transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const isNda =
                      msg.message_type === "nda" ||
                      msg.content?.includes("NDA REQUEST") ||
                      msg.content?.startsWith('{"type":"nda_request"');
                    const isSystem = msg.message_type === "system" && !isNda;
                    const isFile = msg.message_type === "file" || !!msg.file_url;
                    const isVoice =
                      msg.message_type === "audio" ||
                      (isFile &&
                        (/\.(webm|mp3|wav|ogg|m4a|aac)$/i.test(msg.file_name || "") ||
                          msg.file_name?.startsWith("voice-")));
                    const isImage =
                      msg.message_type === "image" ||
                      (isFile && (isImageFile(msg.file_name || "") || isImageFile(msg.file_url || "")));
                    const isDeleted = msg.is_deleted || msg.content === "This message was deleted";

                    // 1. NDA Card Renderer
                    if (isNda) {
                      let ndaData: any = null;
                      try {
                        ndaData = JSON.parse(msg.content);
                      } catch {
                        ndaData = {
                          type: "nda_request",
                          senderName: msg.profiles?.full_name || "Founder",
                          status: msg.content?.includes("Signed") ? "signed" : "pending",
                        };
                      }

                      const isSigned = ndaData.status === "signed";

                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} my-2`}>
                          {!isMe && (
                            <span className="text-[#6B6A7A] text-xs mb-1 ml-1 font-medium">
                              {msg.profiles?.full_name}
                            </span>
                          )}

                          <div
                            className={`w-full max-w-md rounded-2xl p-4.5 border transition shadow-lg ${
                              isSigned
                                ? "bg-[#0D1F17] border-emerald-500/40 text-[#F5F3ED]"
                                : "bg-[#141424] border-[#C9A84C]/40 text-[#F5F3ED]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                    isSigned ? "bg-emerald-500/20 text-emerald-400" : "bg-[#C9A84C]/20 text-[#C9A84C]"
                                  }`}
                                >
                                  {isSigned ? <FileCheck size={18} /> : <Shield size={18} />}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold tracking-tight text-[#F5F3ED]">
                                    Mutual Non-Disclosure Agreement
                                  </h4>
                                  <p className="text-[11px] text-[#A8A6B8]">
                                    {isSigned
                                      ? `Executed on ${new Date(ndaData.signedAt || msg.created_at).toLocaleDateString()}`
                                      : `Requested by ${ndaData.senderName || "Founder"}`}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                                  isSigned
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                }`}
                              >
                                {isSigned ? "Active" : "Pending"}
                              </span>
                            </div>

                            <p className="text-xs text-[#A8A6B8] leading-relaxed mb-3">
                              {isSigned
                                ? `Legally signed by ${ndaData.signerName}${
                                    ndaData.companyName ? ` (${ndaData.companyName})` : ""
                                  }. All confidential materials and metrics shared in this deal room are legally protected.`
                                : `Please review and digitally sign the Mutual NDA to access confidential metrics, pitch decks, and proprietary financial discussions.`}
                            </p>

                            {!isSigned && (
                              <div className="pt-2 border-t border-[#3A3A52]/40">
                                {isMe ? (
                                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[#C9A84C] bg-[#C9A84C]/10 rounded-xl font-medium border border-[#C9A84C]/20">
                                    <Clock size={13} />
                                    <span>Waiting for recipient signature</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openSignNdaModal(msg)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition"
                                  >
                                    <FileCheck size={15} />
                                    <span>Review & Sign NDA</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#5C5A70]">
                            <span>{formatTime(msg.created_at)}</span>
                            {isMe && <span>✓✓</span>}
                          </div>
                        </div>
                      );
                    }

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1.5">
                          <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl px-4 py-2.5 max-w-md text-xs text-[#9998A8] text-center leading-relaxed shadow-sm">
                            <ShieldCheck size={13} className="text-[#C9A84C] inline mr-1.5" />
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`group relative flex flex-col ${isMe ? "items-end" : "items-start"} my-1.5`}
                      >
                        {!isMe && (
                          <span className="text-[#6B6A7A] text-xs mb-1 ml-1 font-medium">
                            {msg.profiles?.full_name}
                          </span>
                        )}

                        {/* Message Row with 3-Dots Button */}
                        <div
                          className={`relative flex items-center gap-1.5 ${
                            isMe ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          {/* Message content container */}
                          <div className="relative max-w-[78%] sm:max-w-xs md:max-w-md">
                            {isDeleted ? (
                              <div className="px-3.5 py-2 rounded-xl text-xs italic bg-[#141424] border border-[#2A2A3E] text-[#6B6A7A] flex items-center gap-1.5">
                                <Trash2 size={12} />
                                <span>This message was deleted</span>
                              </div>
                            ) : editingMessageId === msg.id ? (
                              <div className="bg-[#1A1A2E] border border-[#C9A84C]/50 rounded-xl p-2.5 w-72 space-y-2">
                                <textarea
                                  value={editInput}
                                  onChange={(e) => setEditInput(e.target.value)}
                                  className="w-full bg-[#0F0F1A] text-[#F5F3ED] text-xs p-2 rounded-lg outline-none border border-[#3A3A52] focus:border-[#C9A84C] resize-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={cancelEditMessage}
                                    className="px-2.5 py-1 rounded text-xs text-[#A8A6B8] hover:bg-[#2A2A3E]"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={saveEditMessage}
                                    disabled={savingEdit}
                                    className="px-3 py-1 rounded text-xs bg-[#C9A84C] text-[#0A0A0F] font-bold hover:opacity-90"
                                  >
                                    {savingEdit ? "Saving…" : "Save"}
                                  </button>
                                </div>
                              </div>
                            ) : isImage ? (
                              <div className="relative group/img">
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block overflow-hidden rounded-2xl border border-[#2A2A3E] bg-[#0A0A0F] hover:opacity-95 transition shadow-md"
                                >
                                  <img
                                    src={msg.file_url}
                                    alt={msg.file_name || "Attachment"}
                                    className="max-w-[210px] sm:max-w-[260px] md:max-w-xs max-h-60 sm:max-h-72 w-auto h-auto object-contain rounded-2xl block"
                                  />
                                </a>
                                {!isDeleted && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuMessageId((prev) => (prev === msg.id ? null : msg.id));
                                    }}
                                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/85 text-white rounded-full flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition z-10"
                                    title="Image options"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                )}
                              </div>
                            ) : isVoice ? (
                              <div
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl max-w-xs shadow-md ${
                                  isMe
                                    ? "bg-gradient-to-br from-[#C9A84C] to-[#A8882E] text-[#0A0A0F]"
                                    : "bg-[#1A1A2E] border border-[#2A2A3E] text-[#F5F3ED]"
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    if (playingAudio === msg.id) {
                                      audioRef.current?.pause();
                                      setPlayingAudio(null);
                                    } else {
                                      if (audioRef.current && msg.file_url) {
                                        audioRef.current.src = msg.file_url;
                                        audioRef.current
                                          .play()
                                          .catch((e) => console.error("Audio playback error:", e));
                                        setPlayingAudio(msg.id);
                                        audioRef.current.onended = () => setPlayingAudio(null);
                                      }
                                    }
                                  }}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition shrink-0 ${
                                    isMe
                                      ? "bg-[#00000025] hover:bg-[#00000035]"
                                      : "bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30 text-[#C9A84C]"
                                  }`}
                                >
                                  {playingAudio === msg.id ? (
                                    <Pause size={15} className={isMe ? "text-[#0A0A0F]" : "text-[#C9A84C]"} />
                                  ) : (
                                    <Play size={15} className={isMe ? "text-[#0A0A0F]" : "text-[#C9A84C]"} />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold">Voice note</span>
                                    {playingAudio === msg.id && (
                                      <span className="text-[10px] animate-pulse">Playing…</span>
                                    )}
                                  </div>
                                  <div
                                    className={`h-1 rounded-full mt-1.5 overflow-hidden ${
                                      isMe ? "bg-[#00000020]" : "bg-[#C9A84C]/20"
                                    }`}
                                  >
                                    <div
                                      className={`h-full ${
                                        isMe ? "bg-[#0A0A0F]" : "bg-[#C9A84C]"
                                      } ${
                                        playingAudio === msg.id
                                          ? "w-full animate-pulse transition-all duration-3000"
                                          : "w-1/3"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : isFile ? (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl max-w-xs border transition shadow-md ${
                                  isMe
                                    ? "bg-gradient-to-br from-[#C9A84C] to-[#A8882E] border-transparent text-[#0A0A0F]"
                                    : "bg-[#1A1A2E] border-[#2A2A3E] text-[#F5F3ED] hover:border-[#3A3A52]"
                                }`}
                              >
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isMe ? "bg-[#00000020]" : "bg-[#C9A84C]/20 text-[#C9A84C]"
                                  }`}
                                >
                                  <FileIcon size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold truncate">
                                    {msg.file_name || msg.content}
                                  </div>
                                  <div className="text-[10px] flex items-center gap-1 opacity-80 mt-0.5">
                                    <Download size={10} /> Tap to download
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                  isMe
                                    ? "bg-gradient-to-br from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] font-medium"
                                    : "bg-[#1A1A2E] border border-[#2A2A3E] text-[#F5F3ED]"
                                }`}
                              >
                                {msg.content}
                              </div>
                            )}
                          </div>

                          {/* 3-Dots Action Button & Dropdown Menu */}
                          {!isDeleted && editingMessageId !== msg.id && (
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMessageId((prev) => (prev === msg.id ? null : msg.id));
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[#5C5A70] hover:text-[#F5F3ED] hover:bg-[#1A1A2E] active:scale-95 transition"
                                title="Options"
                              >
                                <MoreHorizontal size={15} />
                              </button>

                              {/* Floating Menu Popup */}
                              {activeMenuMessageId === msg.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuMessageId(null);
                                    }}
                                  />
                                  <div
                                    className={`absolute ${
                                      isMe ? "left-0" : "right-0"
                                    } bottom-full mb-1.5 bg-[#12121E] border border-[#2E2E44] rounded-2xl p-1.5 shadow-2xl z-30 min-w-[145px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md`}
                                  >
                                    <button
                                      onClick={() => copyMessage(msg.content, msg.id)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#D8D6E2] hover:text-[#F5F3ED] hover:bg-[#1E1E32] rounded-xl transition text-left"
                                    >
                                      {copyFeedback === msg.id ? (
                                        <Check size={14} className="text-emerald-400" />
                                      ) : (
                                        <Copy size={14} className="text-[#A8A6B8]" />
                                      )}
                                      <span>{copyFeedback === msg.id ? "Copied!" : "Copy"}</span>
                                    </button>

                                    {isMe && !isFile && !isVoice && !isNda && (
                                      <button
                                        onClick={() => startEditMessage(msg)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#D8D6E2] hover:text-[#C9A84C] hover:bg-[#1E1E32] rounded-xl transition text-left"
                                      >
                                        <Edit2 size={14} className="text-[#A8A6B8]" />
                                        <span>Edit</span>
                                      </button>
                                    )}

                                    {isMe && (
                                      <button
                                        onClick={() => openDeleteModal(msg)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition text-left font-medium"
                                      >
                                        <Trash2 size={14} className="text-red-400" />
                                        <span>Delete</span>
                                      </button>
                                    )}

                                    {!isMe && (
                                      <button
                                        onClick={() => openReportModal(msg)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition text-left font-medium"
                                      >
                                        <Flag size={14} className="text-red-400" />
                                        <span>Report</span>
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#5C5A70]">
                          <span>{formatTime(msg.created_at)}</span>
                          {msg.is_edited && <span className="text-[10px] text-[#6B6A7A]">(edited)</span>}
                          {isMe && (
                            <span
                              className={`text-xs ${
                                msg.delivery_status === "read" || msg.is_read
                                  ? "text-[#C9A84C]"
                                  : "text-[#5C5A70]"
                              }`}
                            >
                              {msg.delivery_status === "read" || msg.is_read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
                <audio ref={audioRef} className="hidden" />
              </div>

              {/* MODERATION ALERTS */}

              {/* Hard block */}
              {blockedMessage && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-900/20 border-t border-red-900/30 flex-shrink-0">
                  <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 text-xs font-medium mb-0.5">Message blocked</p>
                    <p className="text-red-300 text-xs leading-relaxed">{blockedMessage}</p>
                  </div>
                  <button onClick={() => setBlockedMessage(null)}>
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
              )}

              {/* Warning + confirm */}
              {moderationWarning && (
                <div className="flex items-start gap-3 px-4 py-3 bg-yellow-900/20 border-t border-yellow-900/30 flex-shrink-0">
                  <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 text-xs font-medium mb-0.5">Platform policy reminder</p>
                    <p className="text-yellow-300 text-xs leading-relaxed mb-2">{moderationWarning}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={sendAfterWarning}
                        className="text-xs px-3 py-1 bg-yellow-900/30 border border-yellow-800 text-yellow-400 rounded-lg"
                      >
                        Send anyway
                      </button>
                      <button
                        onClick={() => { setModerationWarning(null); setPendingContent(null); }}
                        className="text-xs px-3 py-1 bg-[#1A1A2E] border border-[#2A2A3E] text-[#9998A8] rounded-lg"
                      >
                        Edit message
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upgrade prompt */}
              {upgradePrompt && (
                <div className="flex items-center gap-3 px-4 py-3 bg-[#C9A84C08] border-t border-[#C9A84C20] flex-shrink-0">
                  <Zap size={15} className="text-[#C9A84C] flex-shrink-0" />
                  <p className="text-[#C9A84C] text-xs flex-1">{upgradePrompt}</p>
                  <button
                    onClick={() => router.push("/dashboard/upgrade")}
                    className="text-xs font-medium bg-[#C9A84C] text-[#0A0A0F] px-3 py-1.5 rounded-lg flex-shrink-0"
                  >
                    Upgrade
                  </button>
                  <button onClick={() => setUpgradePrompt(null)}>
                    <X size={14} className="text-[#6B6A7A]" />
                  </button>
                </div>
              )}

              {/* VOICE RECORDING */}
              {recording && (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[#1A1A2E] bg-red-900/10 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs flex-1">
                    Recording… {formatDuration(duration)}
                  </span>
                  <button onClick={cancelRecording} className="text-[#6B6A7A] hover:text-[#9998A8]">
                    <X size={16} />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <Square size={12} className="text-white fill-white" />
                  </button>
                </div>
              )}

              {/* VOICE NOTE PREVIEW */}
              {audioBlob && !recording && (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[#1A1A2E] bg-[#0D0D16] flex-shrink-0">
                  <Mic size={14} className="text-[#C9A84C]" />
                  <span className="text-[#9998A8] text-xs flex-1">
                    Voice note ready — {formatDuration(duration)}
                  </span>
                  <button onClick={cancelRecording} className="text-[#6B6A7A] hover:text-[#9998A8] mr-1">
                    <X size={14} />
                  </button>
                  <button
                    onClick={sendVoiceNote}
                    className="text-xs font-medium bg-[#C9A84C] text-[#0A0A0F] px-4 py-1.5 rounded-lg"
                  >
                    Send
                  </button>
                </div>
              )}

              {/* PRE-MESSAGE QUICK CHIPS FOR CONCIERGE BOT */}
              {isConciergeConvo && (
                <div className="flex items-center gap-2 px-4 py-2 border-t border-[#1A1A2E] bg-[#0A0A0F] overflow-x-auto shrink-0 scrollbar-none">
                  <span className="text-[10px] uppercase font-bold text-[#C9A84C] shrink-0 flex items-center gap-1">
                    <Sparkles size={10} /> Quick Ask:
                  </span>
                  {[
                    "How do I verify my account?",
                    "How do I post a job or search talent?",
                    "How does the deal pipeline work?",
                    "What are the Pro subscription perks?",
                  ].map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => void doSend(promptText)}
                      className="text-xs text-[#A8A6B8] hover:text-[#C9A84C] bg-[#1A1A2E] border border-[#2A2A3E] hover:border-[#C9A84C]/50 px-3 py-1.5 rounded-full shrink-0 transition whitespace-nowrap cursor-pointer"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              )}

              {/* BOTTOM BAR */}
              {!recording && !audioBlob && (
                <>
                  {/* Action row */}
                  <div className="flex items-center gap-2 px-4 py-2 border-t border-[#1A1A2E] bg-[#0D0D16] overflow-x-auto flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6B6A7A] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] hover:text-[#9998A8] transition"
                    >
                      {uploadingFile ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                      {uploadingFile ? "Uploading…" : isTalentConvo ? "Attach Resume / File" : "Document"}
                    </button>

                    {/* Investment vs Recruitment Actions */}
                    {!isTalentConvo && (
                      <button
                        onClick={handleNDA}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6B6A7A] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] hover:text-[#9998A8] transition"
                      >
                        <ShieldCheck size={11} />
                        Request NDA
                      </button>
                    )}

                    {features.canScheduleMeetings || isTalentConvo ? (
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6B6A7A] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] hover:text-[#9998A8] transition"
                      >
                        <Calendar size={11} />
                        {isTalentConvo ? "Schedule interview" : "Schedule meeting"}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/dashboard/upgrade")}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#3A3A52] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] transition"
                      >
                        <Calendar size={11} />
                        Meeting
                        <Zap size={9} className="text-[#C9A84C]" />
                      </button>
                    )}

                    {isTalentConvo ? (
                      <button
                        onClick={() => router.push(currentUser?.role === "talent" ? "/dashboard/talent/applications" : "/dashboard/jobs/manage")}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#C9A84C] border border-[#C9A84C25] px-2.5 py-1.5 rounded-lg hover:bg-[#C9A84C08] transition font-medium"
                      >
                        <Briefcase size={11} />
                        {currentUser?.role === "talent" ? "Applications" : "Manage Jobs"}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/dashboard/deals")}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#C9A84C] border border-[#C9A84C25] px-2.5 py-1.5 rounded-lg hover:bg-[#C9A84C08] transition"
                      >
                        <Handshake size={11} />
                        Deal pipeline
                      </button>
                    )}
                  </div>

                  {/* Message input row */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-[#1A1A2E] bg-[#0D0D16] flex-shrink-0">
                    <div className="flex-1 flex items-center gap-2 bg-[#0A0A0F] border border-[#1A1A2E] rounded-xl px-3 py-2.5 focus-within:border-[#C9A84C30] transition">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          if (blockedMessage) setBlockedMessage(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder="Type a professional message…"
                        className="flex-1 bg-transparent text-[#F0EEE8] text-sm outline-none placeholder-[#3A3A52]"
                      />
                    </div>

                    {input.trim() ? (
                      <button
                        onClick={sendMessage}
                        disabled={sending}
                        className="w-10 h-10 bg-gradient-to-br from-[#C9A84C] to-[#A8882E] rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-90 transition shadow-lg"
                        style={{ boxShadow: "0 4px 16px rgba(201,168,76,0.3)" }}
                      >
                        {sending
                          ? <Loader2 size={15} className="text-[#0A0A0F] animate-spin" />
                          : <Send size={15} className="text-[#0A0A0F]" />
                        }
                      </button>
                    ) : features.canMessageFirst ? (
                      <button
                        onMouseDown={startRecording}
                        className="w-10 h-10 bg-[#0A0A0F] border border-[#1A1A2E] rounded-xl flex items-center justify-center flex-shrink-0 hover:border-[#C9A84C30] transition"
                        title="Hold to record voice note"
                      >
                        <Mic size={15} className="text-[#6B6A7A]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/dashboard/upgrade")}
                        className="w-10 h-10 bg-[#0A0A0F] border border-[#1A1A2E] rounded-xl flex items-center justify-center flex-shrink-0 hover:border-[#C9A84C30] transition"
                        title="Upgrade for voice notes"
                      >
                        <Mic size={15} className="text-[#2A2A3E]" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            // Empty state
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0A0A0F]">
              <div className="w-16 h-16 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center">
                {currentUser?.role === "talent" ? (
                  <Briefcase size={28} className="text-[#C9A84C]" />
                ) : (
                  <Handshake size={28} className="text-[#C9A84C]" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[#F0EEE8] text-sm font-medium mb-1">
                  {currentUser?.role === "talent" ? "Select a conversation" : "Select a deal room"}
                </p>
                <p className="text-[#6B6A7A] text-xs max-w-xs leading-relaxed">
                  {currentUser?.role === "talent"
                    ? "Choose a conversation from the left to view hiring details and message the employer"
                    : "Choose a conversation from the left to open a secure deal room"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MEETING / INTERVIEW MODAL */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-[#0D0D16] border border-[#2A2A3E] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#F0EEE8] text-base font-medium">
                  {isTalentConvo ? "Schedule Job Interview" : "Schedule meeting"}
                </h3>
                <p className="text-[#6B6A7A] text-xs mt-0.5">with {activeConvo?.otherUser?.full_name}</p>
              </div>
              <button onClick={() => setShowMeetingModal(false)}>
                <X size={16} className="text-[#6B6A7A]" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder={isTalentConvo ? "Interview title (e.g. Technical Screening) *" : "Meeting title *"}
                className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition placeholder-[#3A3A52]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition"
                />
                <input
                  type="time"
                  value={meetingForm.time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition"
                />
              </div>
              <textarea
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                rows={2}
                placeholder={isTalentConvo ? "Interview topics, role overview & notes (optional)" : "Agenda (optional)"}
                className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition placeholder-[#3A3A52] resize-none"
              />
              <button
                onClick={handleScheduleMeeting}
                disabled={!meetingForm.title || !meetingForm.date || !meetingForm.time}
                className={`w-full font-medium text-sm py-3 rounded-xl transition ${
                  meetingForm.title && meetingForm.date && meetingForm.time
                    ? "bg-gradient-to-r from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] hover:opacity-90"
                    : "bg-[#1A1A2E] text-[#3A3A52] cursor-not-allowed"
                }`}
              >
                {isTalentConvo ? "Confirm & Send Interview Invite" : "Schedule meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NDA SIGNING MODAL */}
      {showNdaModal && selectedNdaMsg && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#0D0D16] border border-[#3A3A52] rounded-3xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#1A1A2E] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F5F3ED]">Mutual Non-Disclosure Agreement</h3>
                  <p className="text-xs text-[#A8A6B8] mt-0.5">Legally Binding Bilateral Confidentiality Terms</p>
                </div>
              </div>
              <button onClick={() => setShowNdaModal(false)} className="text-[#6B6A7A] hover:text-[#F5F3ED] p-1">
                <X size={18} />
              </button>
            </div>

            {/* Terms Agreement Scroll Box */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3.5 text-xs text-[#A8A6B8] leading-relaxed bg-[#0A0A0F] p-4 rounded-2xl border border-[#1A1A2E] max-h-56">
              <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">1. Confidential Information</h4>
              <p>
                "Confidential Information" includes all proprietary business metrics, financials, pitch decks, cap tables, intellectual property, technical architecture, and deal terms shared within this deal room.
              </p>

              <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">2. Obligations & Duty of Care</h4>
              <p>
                Each party agrees to hold Confidential Information in strict confidence, using the same degree of care as for their own proprietary assets, and shall not disclose or exploit such information without prior written consent.
              </p>

              <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">3. Term & Survival</h4>
              <p>
                This Agreement and its confidentiality covenants shall remain in effect for a period of two (2) years from the date of execution.
              </p>

              <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">4. Electronic Signature & Enforceability</h4>
              <p>
                The parties agree that electronic signatures submitted through this interface constitute valid, binding, and enforceable legal execution under applicable electronic transactions law.
              </p>
            </div>

            {/* Signer Form */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Full Legal Name *</label>
                  <input
                    type="text"
                    value={ndaForm.legalName}
                    onChange={(e) => setNdaForm({ ...ndaForm, legalName: e.target.value })}
                    placeholder="e.g. Johnathan Doe"
                    className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-[#F5F3ED] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#C9A84C] transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Title / Capacity</label>
                  <input
                    type="text"
                    value={ndaForm.title}
                    onChange={(e) => setNdaForm({ ...ndaForm, title: e.target.value })}
                    placeholder="e.g. Managing Partner / Angel Investor"
                    className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-[#F5F3ED] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#C9A84C] transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Company / Entity (Optional)</label>
                <input
                  type="text"
                  value={ndaForm.companyName}
                  onChange={(e) => setNdaForm({ ...ndaForm, companyName: e.target.value })}
                  placeholder="e.g. Apex Ventures LLC"
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-[#F5F3ED] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#C9A84C] transition"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#D8D6E2] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={ndaForm.agreed}
                  onChange={(e) => setNdaForm({ ...ndaForm, agreed: e.target.checked })}
                  className="mt-0.5 rounded border-[#3A3A52] text-[#C9A84C] focus:ring-0 focus:outline-none accent-[#C9A84C]"
                />
                <span>
                  I acknowledge that I have reviewed the Mutual NDA and confirm my agreement to be legally bound by these terms.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNdaModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#2A2A3E] text-xs font-semibold text-[#A8A6B8] hover:bg-[#1A1A2E] transition"
              >
                Cancel
              </button>
              <button
                onClick={submitNdaSignature}
                disabled={signingNda || !ndaForm.legalName.trim() || !ndaForm.agreed}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  ndaForm.legalName.trim() && ndaForm.agreed && !signingNda
                    ? "bg-gradient-to-r from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] shadow-lg shadow-[#C9A84C]/20 hover:opacity-90 active:scale-95"
                    : "bg-[#1A1A2E] text-[#5C5A70] cursor-not-allowed"
                }`}
              >
                {signingNda ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={15} />}
                <span>{signingNda ? "Executing NDA…" : "Sign & Execute NDA"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MESSAGE MODAL */}
      {reportModalOpen && reportingMessage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#0D0D16] border border-[#2A2A3E] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A1A2E] pb-3">
              <div className="flex items-center gap-2">
                <Flag size={18} className="text-red-400" />
                <h3 className="text-base font-bold text-[#F5F3ED]">Report Message</h3>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="text-[#6B6A7A] hover:text-[#F5F3ED]">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#A8A6B8]">
              Help us keep conversations safe and compliant. Select a reason for reporting this message:
            </p>

            <div className="space-y-2">
              {[
                "Spam or scam",
                "Harassment or abusive conduct",
                "Off-platform payment solicitation",
                "Suspicious financial or investment claims",
                "Impersonation or fake profile",
                "Other violation",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    reportReason === reason
                      ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#F5F3ED]"
                      : "bg-[#0A0A0F] border-[#1A1A2E] text-[#A8A6B8] hover:border-[#2A2A3E]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-[#C9A84C]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider mb-1 block">
                Additional Details (Optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                placeholder="Provide any context for our moderation team…"
                className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F5F3ED] text-xs rounded-xl p-3 outline-none focus:border-[#C9A84C] transition resize-none placeholder-[#3A3A52]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A3E] text-xs text-[#A8A6B8] hover:bg-[#1A1A2E]"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={submittingReport}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {submittingReport ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
                <span>Submit Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PREMIUM DELETE CONFIRMATION MODAL */}
      {deleteConfirmModalOpen && messageToDelete && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#0D0D16] border border-red-500/30 rounded-3xl p-6 sm:p-7 w-full max-w-sm space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 size={26} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#F5F3ED]">Delete Message?</h3>
              <p className="text-xs text-[#A8A6B8] mt-1 leading-relaxed">
                This message will be removed from the conversation for all participants. This action cannot be undone.
              </p>
            </div>

            <div className="p-3 bg-[#07070C] rounded-xl border border-[#1A1A2E] text-left">
              <p className="text-xs text-[#6B6A7A] line-clamp-2 italic">
                "{messageToDelete.content || messageToDelete.file_name}"
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setDeleteConfirmModalOpen(false);
                  setMessageToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A3E] text-xs font-semibold text-[#A8A6B8] hover:bg-[#1A1A2E] transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                disabled={deletingMessageId === messageToDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 transition active:scale-95"
              >
                {deletingMessageId === messageToDelete.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>{deletingMessageId === messageToDelete.id ? "Deleting…" : "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confidential Document Watermark & NDA Viewer */}
      <DocumentWatermarkViewer
        isOpen={watermarkModal.isOpen}
        onClose={() => setWatermarkModal({ isOpen: false, url: "", title: "" })}
        documentUrl={watermarkModal.url}
        documentTitle={watermarkModal.title || "Confidential Document"}
        userName={currentUser?.full_name || "REACH Member"}
      />
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
      </div>
    }>
      <ChatsInner />
    </Suspense>
  );
}
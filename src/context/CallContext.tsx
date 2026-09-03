"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Phone, Video, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RTC_CONFIG, getLocalMediaStream, stopMediaStream } from "@/lib/webrtc";
import ActiveCallOverlay from "@/components/ActiveCallOverlay";

type CallStatus = "idle" | "ringing_outgoing" | "ringing_incoming" | "connected";

interface CallInfo {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  isVideo: boolean;
  offer?: RTCSessionDescriptionInit;
}

interface CallContextType {
  callStatus: CallStatus;
  callInfo: CallInfo | null;
  startCall: (params: {
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string | null;
    isVideo: boolean;
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: () => void;
  toggleAudio: () => boolean;
  toggleVideo: () => boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const supabase = useRef(createClient()).current;

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null>(null);

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const roomChannelRef = useRef<any>(null);

  // 1. Fetch current logged-in user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", user.id)
          .single();

        setCurrentUser({
          id: user.id,
          full_name: profile?.full_name || user.email?.split("@")[0] || "User",
          avatar_url: profile?.avatar_url,
        });
      } catch (err) {
        console.warn("CallProvider user load notice:", err);
      }
    }
    void loadUser();
  }, [supabase]);

  // Clean up all call resources safely
  const cleanUpCall = useCallback(() => {
    pendingIceCandidatesRef.current = [];
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
    }
    if (roomChannelRef.current) {
      try {
        supabase.removeChannel(roomChannelRef.current);
      } catch {}
      roomChannelRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    setCallInfo(null);
  }, [supabase]);

  // 2. Listen globally for incoming call invitations on personal user channel
  useEffect(() => {
    if (!currentUser?.id) return;

    const userSignalChannel = supabase
      .channel(`user_signal_${currentUser.id}`)
      .on("broadcast", { event: "incoming_call_invite" }, ({ payload }) => {
        // If already in a call, ignore or auto-decline
        if (peerConnectionRef.current || callStatus !== "idle") {
          return;
        }

        setCallInfo({
          callId: payload.callId,
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar,
          recipientId: currentUser.id,
          recipientName: currentUser.full_name,
          recipientAvatar: currentUser.avatar_url,
          isVideo: Boolean(payload.isVideo),
          offer: payload.offer,
        });
        setCallStatus("ringing_incoming");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(userSignalChannel);
    };
  }, [currentUser, callStatus, supabase]);

  // 3. Connect to Shared Room Channel for Active Signaling (Offer, Answer, ICE, End)
  const subscribeToRoom = useCallback(
    (callId: string, currentUserId: string) => {
      if (roomChannelRef.current) {
        supabase.removeChannel(roomChannelRef.current);
      }

      const room = supabase
        .channel(`call_room_${callId}`)
        .on("broadcast", { event: "call_accepted" }, async ({ payload }) => {
          if (payload?.senderId === currentUserId) {
            return; // Ignore self-broadcast
          }

          const pc = peerConnectionRef.current;
          if (!pc || !payload?.answer) return;

          // An incoming answer can only be applied when local description is an offer (signalingState: 'have-local-offer')
          if (pc.signalingState !== "have-local-offer") {
            console.warn(
              `Ignoring call_accepted event: RTCPeerConnection is in '${pc.signalingState}' state, expected 'have-local-offer'.`
            );
            return;
          }

          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            );
            setCallStatus("connected");

            // Flush buffered ICE candidates
            while (pendingIceCandidatesRef.current.length > 0) {
              const candidate = pendingIceCandidatesRef.current.shift();
              if (candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (iceErr) {
                  console.warn("Failed to add buffered ICE candidate on caller:", iceErr);
                }
              }
            }
          } catch (err) {
            console.error("Error applying answer on caller:", err);
          }
        })
        .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
          if (
            payload?.senderId !== currentUserId &&
            payload?.candidate
          ) {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            // If remote description is ready, add candidate immediately; otherwise buffer
            if (pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(payload.candidate)
                );
              } catch (err) {
                console.warn("ICE candidate add warning:", err);
              }
            } else {
              pendingIceCandidatesRef.current.push(payload.candidate);
            }
          }
        })
        .on("broadcast", { event: "call_ended" }, () => {
          cleanUpCall();
        })
        .subscribe();

      roomChannelRef.current = room;
      return room;
    },
    [supabase, cleanUpCall]
  );

  // 4. Start Outgoing Call
  const startCall = useCallback(
    async ({
      recipientId,
      recipientName,
      recipientAvatar,
      isVideo,
    }: {
      recipientId: string;
      recipientName: string;
      recipientAvatar?: string | null;
      isVideo: boolean;
    }) => {
      if (!currentUser?.id) return;
      cleanUpCall();

      const callId = `call_${Date.now()}_${currentUser.id.slice(0, 6)}_${recipientId.slice(0, 6)}`;

      try {
        const stream = await getLocalMediaStream(isVideo);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Explicit transceivers to force bidirectional audio/video negotiation
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
          if (isVideo) {
            pc.addTransceiver("video", { direction: "sendrecv" });
          }
        } catch (transceiverErr) {
          console.warn("Transceiver notice:", transceiverErr);
        }

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          } else if (event.track) {
            setRemoteStream((prev) => {
              const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
              if (!next.getTracks().some((t) => t.id === event.track.id)) {
                next.addTrack(event.track);
              }
              return next;
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setCallStatus("connected");
          }
        };

        const room = subscribeToRoom(callId, currentUser.id);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            room.send({
              type: "broadcast",
              event: "ice_candidate",
              payload: { candidate: event.candidate.toJSON(), senderId: currentUser.id },
            });
          }
        };

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(offer);

        setCallInfo({
          callId,
          callerId: currentUser.id,
          callerName: currentUser.full_name,
          callerAvatar: currentUser.avatar_url,
          recipientId,
          recipientName,
          recipientAvatar,
          isVideo,
          offer,
        });
        setCallStatus("ringing_outgoing");

        // Send invite to recipient's personal signal channel
        const recipientChannel = supabase.channel(`user_signal_${recipientId}`);
        recipientChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            recipientChannel.send({
              type: "broadcast",
              event: "incoming_call_invite",
              payload: {
                callId,
                callerId: currentUser.id,
                callerName: currentUser.full_name,
                callerAvatar: currentUser.avatar_url,
                isVideo,
                offer,
              },
            });
          }
        });
      } catch (err) {
        console.error("Failed to initiate call:", err);
        cleanUpCall();
        alert("Could not access microphone/camera. Please grant permissions and retry.");
      }
    },
    [currentUser, supabase, cleanUpCall, subscribeToRoom]
  );

  // 5. Accept Incoming Call
  const acceptCall = useCallback(async () => {
    if (!callInfo?.offer || !callInfo?.callId || !currentUser?.id) return;

    try {
      const stream = await getLocalMediaStream(callInfo.isVideo);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Explicit transceivers to force bidirectional audio/video negotiation
      try {
        pc.addTransceiver("audio", { direction: "sendrecv" });
        if (callInfo.isVideo) {
          pc.addTransceiver("video", { direction: "sendrecv" });
        }
      } catch (transceiverErr) {
        console.warn("Transceiver notice:", transceiverErr);
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else if (event.track) {
          setRemoteStream((prev) => {
            const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
            if (!next.getTracks().some((t) => t.id === event.track.id)) {
              next.addTrack(event.track);
            }
            return next;
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setCallStatus("connected");
        }
      };

      const room = subscribeToRoom(callInfo.callId, currentUser.id);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          room.send({
            type: "broadcast",
            event: "ice_candidate",
            payload: { candidate: event.candidate.toJSON(), senderId: currentUser.id },
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callInfo.offer));

      // Flush any buffered ICE candidates on recipient
      while (pendingIceCandidatesRef.current.length > 0) {
        const candidate = pendingIceCandidatesRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (iceErr) {
            console.warn("Failed to add buffered ICE candidate on recipient:", iceErr);
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setCallStatus("connected");

      // Broadcast answer to room (including senderId to avoid self-processing)
      room.send({
        type: "broadcast",
        event: "call_accepted",
        payload: { answer, senderId: currentUser.id },
      });
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanUpCall();
      alert("Could not access microphone/camera to answer call.");
    }
  }, [callInfo, currentUser, cleanUpCall, subscribeToRoom]);

  // 6. End or Decline Call (Affects Both Users)
  const endCall = useCallback(() => {
    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "call_ended",
          payload: {},
        });
      } catch {}
    } else if (callInfo?.recipientId || callInfo?.callerId) {
      // If still in ringing phase before room was active
      const otherId =
        callInfo.callerId === currentUser?.id ? callInfo.recipientId : callInfo.callerId;
      const chan = supabase.channel(`user_signal_${otherId}`);
      chan.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          chan.send({ type: "broadcast", event: "call_ended", payload: {} });
        }
      });
    }

    // Small delay before destroying local state to ensure packet is dispatched over WebSocket
    setTimeout(() => {
      cleanUpCall();
    }, 100);
  }, [callInfo, currentUser?.id, supabase, cleanUpCall]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callInfo,
        startCall,
        acceptCall,
        endCall,
        toggleAudio,
        toggleVideo,
      }}
    >
      {children}

      {/* ─── GLOBAL OUTGOING RINGING MODAL ───────────────────────────────── */}
      {callStatus === "ringing_outgoing" && callInfo && (
        <div className="fixed inset-0 z-[100] bg-[#0A0A0F]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full bg-[#C9A84C]/10 border-2 border-[#C9A84C]/40 animate-ping absolute inset-0" />
            <div className="w-28 h-28 rounded-full bg-[#1A1A2E] border-2 border-[#C9A84C] flex items-center justify-center text-3xl font-bold text-[#C9A84C] relative overflow-hidden shadow-2xl shadow-[#C9A84C]/20">
              {callInfo.recipientAvatar ? (
                <img src={callInfo.recipientAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(callInfo.recipientName || "?")
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#F5F3ED] mb-1">
            Calling {callInfo.recipientName}…
          </h2>
          <p className="text-xs text-[#A8A6B8] mb-8 flex items-center gap-1.5 font-medium">
            {callInfo.isVideo ? <Video size={14} className="text-[#C9A84C]" /> : <Phone size={14} className="text-[#C9A84C]" />}
            Outgoing {callInfo.isVideo ? "Video" : "Voice"} Call · Ringing
          </p>
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-900/40 active:scale-95 transition cursor-pointer"
            title="Cancel Call"
          >
            <Phone size={24} className="rotate-[135deg]" />
          </button>
        </div>
      )}

      {/* ─── GLOBAL INCOMING RINGING MODAL ───────────────────────────────── */}
      {callStatus === "ringing_incoming" && callInfo && (
        <div className="fixed inset-0 z-[100] bg-[#0A0A0F]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 animate-ping absolute inset-0" />
            <div className="w-28 h-28 rounded-full bg-[#1A1A2E] border-2 border-emerald-500 flex items-center justify-center text-3xl font-bold text-emerald-400 relative overflow-hidden shadow-2xl shadow-emerald-500/20">
              {callInfo.callerAvatar ? (
                <img src={callInfo.callerAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(callInfo.callerName || "?")
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#F5F3ED] mb-1">
            {callInfo.callerName} is calling…
          </h2>
          <p className="text-xs text-[#A8A6B8] mb-8 flex items-center gap-1.5 font-medium">
            {callInfo.isVideo ? <Video size={14} className="text-emerald-400" /> : <Phone size={14} className="text-emerald-400" />}
            Incoming {callInfo.isVideo ? "Video" : "Voice"} Call
          </p>
          <div className="flex items-center gap-8">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-900/40 active:scale-95 transition cursor-pointer"
              title="Decline Call"
            >
              <Phone size={24} className="rotate-[135deg]" />
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-900/40 active:scale-95 transition cursor-pointer animate-bounce"
              title="Answer Call"
            >
              <Phone size={24} />
            </button>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CONNECTED ACTIVE CALL OVERLAY ───────────────────────── */}
      {callStatus === "connected" && callInfo && (
        <ActiveCallOverlay
          callerName={
            callInfo.callerId === currentUser?.id
              ? callInfo.recipientName || "REACH Member"
              : callInfo.callerName || "REACH Member"
          }
          callerAvatar={
            callInfo.callerId === currentUser?.id
              ? callInfo.recipientAvatar
              : callInfo.callerAvatar
          }
          isVideo={Boolean(callInfo.isVideo)}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
        />
      )}
    </CallContext.Provider>
  );
}

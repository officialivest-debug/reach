"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";

type ActiveCallOverlayProps = {
  callerName: string;
  callerAvatar?: string | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleAudio: () => boolean; // returns new audio enabled state
  onToggleVideo: () => boolean; // returns new video enabled state
};

export default function ActiveCallOverlay({
  callerName,
  callerAvatar,
  isVideo,
  localStream,
  remoteStream,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
}: ActiveCallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Live Call Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Attach Local Stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach Remote Stream & Trigger Playback
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video autoPlay notice:", err);
        });
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((err) => {
          console.warn("Remote audio autoPlay notice:", err);
        });
      }
    }
  }, [remoteStream]);

  const handleToggleMic = () => {
    const isEnabled = onToggleAudio();
    setIsAudioMuted(!isEnabled);
  };

  const handleToggleCam = () => {
    const isEnabled = onToggleVideo();
    setIsVideoOff(!isEnabled);
  };

  const handleToggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerMuted;
    }
    setIsSpeakerMuted(!isSpeakerMuted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07070C] flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-300">
      {/* Invisible Audio Element for Voice Stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Bar: Call Status & Timer */}
      <div className="w-full flex items-center justify-between max-w-4xl z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Encrypted P2P Call
          </span>
        </div>

        <div className="px-3.5 py-1 rounded-full bg-[#1A1A2E]/80 border border-[#3A3A52] text-xs font-mono text-[#F5F3ED] font-semibold">
          {formatTimer(callDuration)}
        </div>

        {isVideo && (
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 rounded-xl bg-[#1A1A2E]/80 border border-[#3A3A52] text-[#A8A6B8] hover:text-white transition"
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      {/* Center Stage */}
      <div className="relative w-full flex-1 max-w-4xl my-4 rounded-3xl overflow-hidden bg-[#0F0F1A] border border-[#2A2A3E] flex items-center justify-center shadow-2xl">
        {isVideo ? (
          <>
            {/* Remote Fullscreen Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Remote Video Fallback if Video Stream not active yet */}
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F0F1A] z-0">
                <div className="w-28 h-28 rounded-full bg-[#1A1A2E] border-2 border-[#C9A84C]/50 flex items-center justify-center text-3xl font-bold text-[#C9A84C] shadow-2xl mb-3 overflow-hidden">
                  {callerAvatar ? (
                    <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    callerName?.[0] || "?"
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#F5F3ED]">{callerName}</h3>
                <p className="text-xs text-[#8E8CA0] mt-1">Connecting video feed…</p>
              </div>
            )}

            {/* Floating Picture-in-Picture Local Camera */}
            <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-black/80 border-2 border-[#3A3A52] shadow-2xl z-10">
              {isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#5C5A70] text-xs gap-1 bg-[#141422]">
                  <VideoOff size={18} />
                  <span>Camera Off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
            </div>
          </>
        ) : (
          /* Voice Call Audio Screen (WhatsApp Style) */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
              <div className="w-36 h-36 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 animate-ping absolute inset-0 pointer-events-none" />
              <div className="w-36 h-36 rounded-full bg-[#1A1A2E] border-2 border-[#C9A84C] flex items-center justify-center text-4xl font-bold text-[#C9A84C] shadow-2xl shadow-[#C9A84C]/25 overflow-hidden">
                {callerAvatar ? (
                  <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  callerName?.[0] || "?"
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#F5F3ED] mb-1">{callerName}</h2>
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span>●</span> Connected Voice Call
            </p>
          </div>
        )}
      </div>

      {/* Bottom Calling Control Bar */}
      <div className="w-full max-w-md flex items-center justify-center gap-4 sm:gap-6 bg-[#141422]/90 backdrop-blur-md p-4 rounded-3xl border border-[#3A3A52] shadow-2xl z-20">
        {/* Mute Mic */}
        <button
          type="button"
          onClick={handleToggleMic}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition cursor-pointer ${
            isAudioMuted
              ? "bg-red-500/20 border border-red-500 text-red-400"
              : "bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] hover:border-[#C9A84C]"
          }`}
          title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Video Camera Toggle */}
        <button
          type="button"
          onClick={handleToggleCam}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition cursor-pointer ${
            isVideoOff
              ? "bg-red-500/20 border border-red-500 text-red-400"
              : "bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] hover:border-[#C9A84C]"
          }`}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Speaker / Mute Output */}
        <button
          type="button"
          onClick={handleToggleSpeaker}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition cursor-pointer ${
            isSpeakerMuted
              ? "bg-amber-500/20 border border-amber-500 text-amber-400"
              : "bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] hover:border-[#C9A84C]"
          }`}
          title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
        >
          {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* End Call Button (Red Hangup) */}
        <button
          type="button"
          onClick={onEndCall}
          className="w-13 h-13 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/40 transition active:scale-95 cursor-pointer"
          title="End Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

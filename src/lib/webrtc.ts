/**
 * Native WebRTC Calling Helper & Robust STUN/TURN Configuration
 * Provides enterprise-grade NAT traversal for cross-network and mobile carrier calls.
 */

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // High-availability Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Cloudflare STUN
    { urls: "stun:stun.cloudflare.com:3478" },
    // Matrix STUN
    { urls: "stun:stun.matrix.org:3478" },
    // Twilio Global STUN
    { urls: "stun:global.stun.twilio.com:3478" },
    // OpenRelay Public TURN fallback (for Symmetric NAT & carrier firewalls)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

export async function getLocalMediaStream(isVideo: boolean): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: isVideo
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 60 },
        }
      : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (isVideo) {
      console.warn("Camera access failed, falling back to audio stream:", err);
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    }
    throw err;
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {}
  });
}

"use client";

import React, { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Camera,
  Mic,
  Monitor,
  Maximize2,
  Wifi,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  Award,
  Lock,
  RefreshCw,
  Eye,
  Radio,
  XCircle,
  CameraOff,
  MicOff,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { useToast } from "@/context/ToastContext";
import {
  AssessmentAttempt,
  AssessmentSnapshotQuestion,
  IntegrityEventType,
} from "@/types";

export default function CandidateTakeAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [assessment, setAssessment] = useState<any>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Environment & Hardware Check State
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStreaming, setIsCameraStreaming] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMicLoading, setIsMicLoading] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const lastViolationMapRef = useRef<Record<string, number>>({});

  // Dedicated Hardware Media Stream Refs (Guarantees fresh access during callbacks and unmount)
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const examVideoRef = useRef<HTMLVideoElement | null>(null);

  // Exam Execution State
  const [isExamActive, setIsExamActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "ERROR">("SAVED");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Integrity & Violation State
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  // Submit Modal & Result
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<AssessmentAttempt | null>(null);

  // =========================================================================
  // CENTRALIZED IDEMPOTENT MEDIA CLEANUP SERVICE
  // =========================================================================
  const cleanupExamSession = useCallback(() => {
    // 1. Explicitly stop all camera video tracks
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Failed stopping camera track:", e);
          }
        });
        cameraStreamRef.current = null;
      }
    } catch (err) {
      console.error("Error during camera stream cleanup:", err);
    }

    // 2. Explicitly stop all microphone audio tracks
    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Failed stopping microphone track:", e);
          }
        });
        micStreamRef.current = null;
      }
    } catch (err) {
      console.error("Error during microphone stream cleanup:", err);
    }

    // 3. Explicitly stop all screen share capture tracks
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Failed stopping screen track:", e);
          }
        });
        screenStreamRef.current = null;
      }
    } catch (err) {
      console.error("Error during screen stream cleanup:", err);
    }

    // 4. Safely request fullscreen exit if active
    try {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.warn("Safe ignore: exitFullscreen error on session cleanup", err);
        });
      }
    } catch (err) {
      console.error("Error attempting exitFullscreen:", err);
    }

    if (videoPreviewRef.current) {
      try {
        videoPreviewRef.current.srcObject = null;
      } catch (e) {
        console.warn("Error detaching videoPreviewRef:", e);
      }
    }
    if (examVideoRef.current) {
      try {
        examVideoRef.current.srcObject = null;
      } catch (e) {
        console.warn("Error detaching examVideoRef:", e);
      }
    }

    setCameraReady(false);
    setIsCameraStreaming(false);
    setCameraError(null);
    setIsCameraLoading(false);
    setMicReady(false);
    setMicError(null);
    setIsMicLoading(false);
    setScreenReady(false);
    setIsFullscreenActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupExamSession();
    };
  }, [cleanupExamSession]);

  // Initial Assessment Fetch & Attempt Recovery
  useEffect(() => {
    fetchAssessmentInfo();
  }, [resolvedParams.id]);

  const fetchAssessmentInfo = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/student/assessments/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setAssessment(data.assessment);

        if (data.attempt) {
          setAttempt(data.attempt);
          if (data.attempt.answers) {
            const loadedAns: Record<string, any> = {};
            Object.values(data.attempt.answers).forEach((a: any) => {
              loadedAns[a.questionId] = a.answer;
            });
            setAnswers(loadedAns);
          }

          if (data.attempt.status === "ACTIVE") {
            setIsExamActive(true);
            const now = Date.now();
            const expires = new Date(data.attempt.expiresAt).getTime();
            setRemainingSeconds(Math.max(0, Math.floor((expires - now) / 1000)));
          } else if (data.attempt.status === "PAUSED") {
            setIsExamActive(true);
            setIsPaused(true);
            setPauseReason(data.attempt.pauseReason || "Proctoring connection interrupted.");
            const now = Date.now();
            const expires = new Date(data.attempt.expiresAt).getTime();
            setRemainingSeconds(Math.max(0, Math.floor((expires - now) / 1000)));
          } else if (data.attempt.status === "SUBMITTED" || data.attempt.status === "AUTO_SUBMITTED") {
            setSubmissionResult(data.attempt);
            cleanupExamSession();
          } else if (data.attempt.status === "TERMINATED") {
            setIsTerminated(true);
            setTerminationReason(data.attempt.terminationReason || "Violation limit reached.");
            cleanupExamSession();
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error || "Assessment not found or unauthorized.";
        setLoadError(errMsg);
        toastError(errMsg);
      }
    } catch (err) {
      console.error(err);
      const errMsg = "Failed to load assessment. Please check your connection.";
      setLoadError(errMsg);
      toastError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown Timer synced with Server-side Expiration
  useEffect(() => {
    if (!isExamActive || !attempt?.expiresAt || isTerminated || submissionResult) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(attempt.expiresAt!).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setRemainingSeconds(diff);

      if (diff === 0) {
        clearInterval(interval);
        handleAutoSubmitTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamActive, attempt?.expiresAt, isTerminated, submissionResult]);

  // =========================================================================
  // BROWSER NAVIGATION & ACCIDENTAL EXIT GUARDS
  // =========================================================================
  useEffect(() => {
    if (!isExamActive || submissionResult || isTerminated) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Assessment is currently in progress. Leaving will record an integrity event.";
      return "Assessment is currently in progress. Leaving will record an integrity event.";
    };

    const handlePopState = (e: PopStateEvent) => {
      // Prevent going back, push current URL back onto history
      window.history.pushState(null, "", window.location.href);
      logIntegritySignal("WINDOW_BLUR", "Candidate attempted browser back navigation during active exam");
      setWarningMessage("Navigation is disabled during the assessment. Use the examination controls.");
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isExamActive, submissionResult, isTerminated]);

  // =========================================================================
  // INTEGRITY SIGNAL LISTENERS (TAB SWITCH, WINDOW BLUR, FULLSCREEN EXIT)
  // =========================================================================
  useEffect(() => {
    if (!isExamActive || isTerminated || submissionResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logIntegritySignal("TAB_SWITCH", "Candidate switched tabs or minimized exam window");
      }
    };

    const handleBlur = () => {
      logIntegritySignal("WINDOW_BLUR", "Assessment window lost focus");
    };

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreenActive(isFs);

      if (!isFs) {
        // Fullscreen was exited
        const isFullscreenMandatory =
          assessment?.proctoringConfig?.fullscreenRequired !== false ||
          assessment?.proctoringMode === "PROCTORED";

        if (isFullscreenMandatory) {
          setIsPaused(true);
          setPauseReason("Fullscreen mode was exited. Return to fullscreen to continue.");
          logIntegritySignal("FULLSCREEN_EXIT", "Candidate exited fullscreen examination mode");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isExamActive, isTerminated, submissionResult, assessment, attempt?.id]);

  // =========================================================================
  // AUTHORITATIVE DEDUPLICATED INTEGRITY VIOLATION SERVICE
  // =========================================================================
  const logIntegritySignal = useCallback(
    async (eventType: IntegrityEventType, reason: string) => {
      if (!attempt || !isExamActive || isTerminated) return;

      // Deduplicate continuous repeated signals of the same eventType within 5 seconds
      const now = Date.now();
      const lastLogged = lastViolationMapRef.current[eventType];
      if (lastLogged && now - lastLogged < 5000) {
        return;
      }
      lastViolationMapRef.current[eventType] = now;

      try {
        const res = await fetch(`/api/student/assessments/${resolvedParams.id}/integrity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.id,
            eventType,
            severity: "HIGH",
            metadata: { reason },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setViolationCount(data.violationCount);

          if (data.actionTaken === "TERMINATE" || data.attemptStatus === "TERMINATED") {
            setIsTerminated(true);
            setIsExamActive(false);
            setTerminationReason("Assessment terminated due to repeated proctoring violations.");
            cleanupExamSession();
          } else if (data.actionTaken === "PAUSE" || data.attemptStatus === "PAUSED") {
            setIsPaused(true);
            setPauseReason(reason);
          } else if (data.actionTaken === "REQUIRE_RECOVERY") {
            setIsPaused(false);
            setPauseReason("");
          } else if (data.actionTaken === "WARNING" || data.actionTaken === "FINAL_WARNING") {
            setWarningMessage(
              `${data.actionTaken === "FINAL_WARNING" ? "FINAL WARNING" : "INTEGRITY WARNING"}: ${reason}. (Violation ${data.violationCount} recorded)`
            );
          }
        }
      } catch (err) {
        console.error("Failed to log integrity event:", err);
      }
    },
    [attempt, isExamActive, isTerminated, resolvedParams.id, cleanupExamSession]
  );

  // =========================================================================
  // HARDWARE STREAM BINDING & PLAYBACK SERVICE
  // =========================================================================
  const attachStreamToVideo = useCallback(
    (videoEl: HTMLVideoElement | null, stream: MediaStream | null, onStreamingChange?: (active: boolean) => void) => {
      if (!videoEl) return;

      if (!stream) {
        try {
          videoEl.srcObject = null;
        } catch (e) {
          /* ignore */
        }
        onStreamingChange?.(false);
        return;
      }

      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }

      // Explicitly set DOM properties for bullet-proof autoplay across browsers
      videoEl.defaultMuted = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.autoplay = true;

      const verifyPlayback = () => {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              const checkFrames = () => {
                if (
                  videoEl &&
                  videoEl.videoWidth > 0 &&
                  videoEl.videoHeight > 0 &&
                  !videoEl.paused &&
                  !videoEl.ended &&
                  videoEl.readyState >= 2
                ) {
                  onStreamingChange?.(true);
                } else if (videoEl && !videoEl.paused && !videoEl.ended) {
                  requestAnimationFrame(checkFrames);
                }
              };
              checkFrames();
            })
            .catch((err) => {
              console.warn("Camera preview playback deferred or blocked:", err);
              onStreamingChange?.(false);
            });
        }
      };

      videoEl.onloadedmetadata = () => {
        verifyPlayback();
      };

      videoEl.onplaying = () => {
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          onStreamingChange?.(true);
        }
      };

      videoEl.onpause = () => {
        onStreamingChange?.(false);
      };

      videoEl.onwaiting = () => {
        onStreamingChange?.(false);
      };

      if (videoEl.readyState >= 1) {
        verifyPlayback();
      }
    },
    []
  );

  // Callback ref for Pre-Flight Video Preview Element (Attaches stream immediately upon DOM mount)
  const setVideoPreviewRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoPreviewRef.current = node;
      if (node && cameraStreamRef.current) {
        attachStreamToVideo(node, cameraStreamRef.current, setIsCameraStreaming);
      }
    },
    [attachStreamToVideo]
  );

  // Callback ref for in-exam proctoring video preview element
  const setExamVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      examVideoRef.current = node;
      if (node && cameraStreamRef.current) {
        attachStreamToVideo(node, cameraStreamRef.current);
      }
    },
    [attachStreamToVideo]
  );

  // Synchronize video element srcObject when cameraReady or isExamActive state changes
  useEffect(() => {
    if (cameraReady && cameraStreamRef.current) {
      if (videoPreviewRef.current) {
        attachStreamToVideo(videoPreviewRef.current, cameraStreamRef.current, setIsCameraStreaming);
      }
      if (examVideoRef.current) {
        attachStreamToVideo(examVideoRef.current, cameraStreamRef.current);
      }
    }
  }, [cameraReady, isExamActive, attachStreamToVideo]);

  // =========================================================================
  // PERMISSION REVOCATION & HARDWARE TERMINATION HANDLERS
  // =========================================================================
  const handleCameraRevoked = useCallback(
    (reason = "Camera access was disconnected or revoked.") => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            /* ignore */
          }
        });
        cameraStreamRef.current = null;
      }
      if (videoPreviewRef.current) {
        try {
          videoPreviewRef.current.srcObject = null;
        } catch (e) {
          /* ignore */
        }
      }
      if (examVideoRef.current) {
        try {
          examVideoRef.current.srcObject = null;
        } catch (e) {
          /* ignore */
        }
      }

      setCameraReady(false);
      setIsCameraStreaming(false);
      setCameraError(reason);

      if (isExamActive && !isTerminated && !submissionResult) {
        setIsPaused(true);
        setPauseReason(reason);
        logIntegritySignal("CAMERA_STOPPED", reason);
      }
    },
    [isExamActive, isTerminated, submissionResult, logIntegritySignal]
  );

  const handleMicRevoked = useCallback(
    (reason = "Microphone access was disconnected or revoked.") => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            /* ignore */
          }
        });
        micStreamRef.current = null;
      }

      setMicReady(false);
      setMicError(reason);

      if (isExamActive && !isTerminated && !submissionResult) {
        setIsPaused(true);
        setPauseReason(reason);
        logIntegritySignal("MICROPHONE_STOPPED", reason);
      }
    },
    [isExamActive, isTerminated, submissionResult, logIntegritySignal]
  );

  // Monitor browser address-bar permission toggles dynamically
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;

    let cameraStatus: PermissionStatus | null = null;
    let micStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        cameraStatus = status;
        status.onchange = () => {
          if (status.state === "denied") {
            handleCameraRevoked("Camera permission was revoked in browser settings.");
          }
        };
      })
      .catch(() => {
        // Query unsupported in some browser configurations
      });

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        micStatus = status;
        status.onchange = () => {
          if (status.state === "denied") {
            handleMicRevoked("Microphone permission was revoked in browser settings.");
          }
        };
      })
      .catch(() => {
        // Query unsupported in some browser configurations
      });

    return () => {
      if (cameraStatus) cameraStatus.onchange = null;
      if (micStatus) micStatus.onchange = null;
    };
  }, [handleCameraRevoked, handleMicRevoked]);

  // =========================================================================
  // HARDWARE REQUEST HANDLERS
  // =========================================================================
  const requestCamera = async (): Promise<boolean> => {
    setIsCameraLoading(true);
    setCameraError(null);

    // Reuse existing active stream if already live and valid
    const existing = cameraStreamRef.current;
    if (existing) {
      const activeVideoTrack = existing.getVideoTracks().find((t) => t.readyState === "live" && t.enabled);
      if (activeVideoTrack) {
        setCameraReady(true);
        setIsCameraLoading(false);
        if (videoPreviewRef.current) {
          attachStreamToVideo(videoPreviewRef.current, existing, setIsCameraStreaming);
        }
        return true;
      }
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Webcam access is not supported by this browser.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
      } catch (constraintErr: any) {
        if (constraintErr?.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          throw constraintErr;
        }
      }

      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        throw new Error("No active video tracks found in camera stream.");
      }

      const videoTrack = videoTracks[0];

      videoTrack.onended = () => {
        handleCameraRevoked("Webcam device was disconnected or permission revoked.");
      };

      videoTrack.onmute = () => {
        setIsCameraStreaming(false);
      };

      videoTrack.onunmute = () => {
        if (videoTrack.readyState === "live") {
          setIsCameraStreaming(true);
        }
      };

      cameraStreamRef.current = stream;
      setCameraReady(true);
      setCameraError(null);

      if (videoPreviewRef.current) {
        attachStreamToVideo(videoPreviewRef.current, stream, setIsCameraStreaming);
      }

      return true;
    } catch (err: any) {
      console.error("[requestCamera] Camera access failure:", err);
      let errMsg = "Camera permission was denied. Please allow camera access in your browser settings.";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        errMsg = "Camera permission was denied. Please grant camera permission in your browser address bar and try again.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        errMsg = "No camera was detected. Please connect a working webcam to your device.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        errMsg = "Camera is currently in use by another application or tab. Please close other camera apps and retry.";
      } else if (err?.message) {
        errMsg = err.message;
      }

      setCameraReady(false);
      setIsCameraStreaming(false);
      setCameraError(errMsg);
      toastError(errMsg);
      return false;
    } finally {
      setIsCameraLoading(false);
    }
  };

  const requestMicrophone = async (): Promise<boolean> => {
    setIsMicLoading(true);
    setMicError(null);

    // Reuse existing active stream if already live
    const existing = micStreamRef.current;
    if (existing) {
      const activeAudioTrack = existing.getAudioTracks().find((t) => t.readyState === "live" && t.enabled);
      if (activeAudioTrack) {
        setMicReady(true);
        setIsMicLoading(false);
        return true;
      }
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error("No active audio tracks found in microphone stream.");
      }

      const audioTrack = audioTracks[0];

      audioTrack.onended = () => {
        handleMicRevoked("Microphone device was disconnected or permission revoked.");
      };

      audioTrack.onmute = () => {
        setMicReady(false);
      };

      audioTrack.onunmute = () => {
        if (audioTrack.readyState === "live") {
          setMicReady(true);
        }
      };

      micStreamRef.current = stream;
      setMicReady(true);
      setMicError(null);
      return true;
    } catch (err: any) {
      console.error("[requestMicrophone] Mic access failure:", err);
      let errMsg = "Microphone permission was denied. Please allow microphone access in your browser settings.";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        errMsg = "Microphone permission was denied. Please grant microphone permission in your browser address bar.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        errMsg = "No microphone was detected. Please connect a working microphone.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        errMsg = "Microphone is in use by another application. Please close other audio apps and retry.";
      } else if (err?.message) {
        errMsg = err.message;
      }

      setMicReady(false);
      setMicError(errMsg);
      toastError(errMsg);
      return false;
    } finally {
      setIsMicLoading(false);
    }
  };

  const requestScreenShare = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = stream;
      setScreenReady(true);

      stream.getVideoTracks()[0].onended = () => {
        setScreenReady(false);
        if (isExamActive && !isTerminated && !submissionResult) {
          setIsPaused(true);
          setPauseReason("Screen share was terminated. Entire screen share is required.");
          logIntegritySignal("SCREEN_SHARE_STOPPED", "Screen sharing stream ended");
        }
      };
      return true;
    } catch (err) {
      toastError("Screen sharing denied. You must share your entire screen.");
      return false;
    }
  };

  const requestFullscreen = async (): Promise<boolean> => {
    try {
      if (document.fullscreenElement) {
        setIsFullscreenActive(true);
        setFullscreenReady(true);
        return true;
      }
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreenActive(true);
        setFullscreenReady(true);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Fullscreen request rejected or denied:", err);
      return false;
    }
  };

  const isProctored =
    assessment?.proctoringMode === "PROCTORED" ||
    assessment?.proctoringConfig?.cameraRequired ||
    assessment?.proctoringConfig?.microphoneRequired ||
    assessment?.proctoringConfig?.entireScreenRequired ||
    assessment?.proctoringConfig?.fullscreenRequired;

  const isEnvironmentReady =
    (!assessment?.proctoringConfig?.cameraRequired || cameraReady) &&
    (!assessment?.proctoringConfig?.microphoneRequired || micReady) &&
    (!assessment?.proctoringConfig?.entireScreenRequired || screenReady) &&
    consentGiven;

  // =========================================================================
  // START SECURE EXAM (FULLSCREEN MANDATORY ENFORCEMENT)
  // =========================================================================
  const handleStartExam = async () => {
    if (!isEnvironmentReady) {
      toastError("Please complete all mandatory hardware checks and accept consent terms.");
      return;
    }

    // If proctored or fullscreen required, enforce fullscreen entrance before starting
    const requireFullscreen =
      assessment?.proctoringConfig?.fullscreenRequired !== false || isProctored;

    if (requireFullscreen) {
      const enteredFs = await requestFullscreen();
      if (!enteredFs && !document.fullscreenElement) {
        toastError("Fullscreen is required for this assessment. Please allow fullscreen mode to enter Secure Exam Mode.");
        return;
      }
    }

    try {
      const res = await fetch(`/api/student/assessments/${resolvedParams.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setAttempt(data.attempt);
        setIsExamActive(true);
        setIsFullscreenActive(Boolean(document.fullscreenElement));
        const now = Date.now();
        const expires = new Date(data.attempt.expiresAt).getTime();
        setRemainingSeconds(Math.max(0, Math.floor((expires - now) / 1000)));
        success("Secure Exam Mode initiated. Distraction-free testing active.");
      } else {
        const err = await res.json();
        toastError(err.error || "Failed to start assessment session.");
      }
    } catch (err) {
      console.error(err);
      toastError("Error starting assessment session.");
    }
  };

  // Save Answers with Autosave indicator
  const handleSelectAnswer = async (questionId: string, value: any) => {
    if (!attempt || !isExamActive || isTerminated || isPaused) return;

    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);
    setSaveStatus("SAVING");

    try {
      const res = await fetch(`/api/student/assessments/${resolvedParams.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          questionId,
          answer: value,
        }),
      });

      if (res.ok) {
        setSaveStatus("SAVED");
      } else {
        setSaveStatus("ERROR");
      }
    } catch {
      setSaveStatus("ERROR");
    }
  };

  // Submission Handler with Centralized Cleanup
  const handleSubmitExam = async () => {
    if (!attempt || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/student/assessments/${resolvedParams.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionResult(data.attempt);
        setIsExamActive(false);
        setIsSubmitModalOpen(false);
        success("Assessment submitted and evaluated successfully!");

        // Centralized cleanup: stop all camera/mic/screen streams & exit fullscreen
        cleanupExamSession();
      } else {
        const err = await res.json();
        toastError(err.error || "Failed to submit assessment.");
      }
    } catch (err) {
      console.error(err);
      toastError("Error during assessment submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-Submit on Expiration with Centralized Cleanup
  const handleAutoSubmitTimeout = async () => {
    if (!attempt || submissionResult) return;
    try {
      const res = await fetch(`/api/student/assessments/${resolvedParams.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.id, isAutoTimeout: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionResult(data.attempt);
        setIsExamActive(false);
        info("Time expired! Your assessment was automatically finalized and submitted.");
        cleanupExamSession();
      }
    } catch (err) {
      console.error("Auto submit failed:", err);
      cleanupExamSession();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRole="student">
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-muted-foreground">Initializing CommandSkill Secure Assessment Engine...</p>
        </div>
      </RoleGuard>
    );
  }

  if (!assessment) {
    return (
      <RoleGuard allowedRole="student">
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
          <Card className="p-8 border-border bg-card max-w-md w-full text-center space-y-6 shadow-2xl rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Assessment Unavailable</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {loadError || "The assessment you requested could not be located or you are not authorized to access it."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => fetchAssessmentInfo()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
              <Link href="/dashboard/assessments">
                <Button variant="gradient" size="sm">
                  Back to Assessments
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  const questions: AssessmentSnapshotQuestion[] = assessment.questions || [];
  const currentQ = questions[currentQIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <RoleGuard allowedRole="student">
      {/* 
        =======================================================================
        VIEW 1: SUBMISSION SUCCESS SCREEN (Media Stopped, Clean Normal Interface)
        =======================================================================
      */}
      {submissionResult ? (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
          <Card className="p-8 border-border bg-card max-w-2xl w-full text-center space-y-6 shadow-2xl rounded-3xl">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${
                submissionResult.passed
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              }`}
            >
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                Assessment Submitted Successfully
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your examination answers and integrity session logs have been securely finalized on the server. All proctoring camera, microphone, and screen-sharing captures have been terminated.
              </p>
            </div>

            {assessment.candidateRules?.showResultImmediately ? (
              <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-muted-foreground">Evaluated Score:</span>
                  <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                    {submissionResult.totalScore} / {submissionResult.maxScore}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-muted-foreground">Percentage:</span>
                  <span className="text-xl font-extrabold text-foreground">{submissionResult.percentage}%</span>
                </div>

                <div className="flex justify-between items-center text-sm pt-3 border-t border-border">
                  <span className="font-bold text-muted-foreground">Passing Benchmark:</span>
                  <Badge variant={submissionResult.passed ? "emerald" : "rose"} size="sm" className="font-bold px-3 py-1">
                    {submissionResult.passed ? "BENCHMARK MET ✓" : "DID NOT MEET BENCHMARK"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300">
                The recruiter has configured assessment scores to be announced along with the recruitment drive shortlist.
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/dashboard/assessments/${resolvedParams.id}/result`}>
                <Button variant="gradient" size="md">
                  View Official Result & Scorecard
                </Button>
              </Link>
              <Link href="/dashboard/assessments">
                <Button variant="outline" size="md">
                  Return to Assessments
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      ) : isTerminated ? (
        /* 
          =======================================================================
          VIEW 2: TERMINATION SCREEN (Media Stopped, Clean Status)
          =======================================================================
        */
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
          <Card className="p-8 border-rose-500/40 bg-card max-w-xl w-full text-center space-y-6 shadow-2xl rounded-3xl">
            <div className="w-18 h-18 rounded-3xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">Assessment Session Terminated</h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                {terminationReason ||
                  "The assessment was terminated because the configured examination integrity policy was triggered. Your session has been securely finalized."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              All proctoring feeds have been ceased and recorded to the candidate audit log.
            </div>

            <Link href="/dashboard/assessments">
              <Button variant="outline" size="md">
                Return to Assessments Hub
              </Button>
            </Link>
          </Card>
        </div>
      ) : !isExamActive ? (
        /* 
          =======================================================================
          VIEW 3: PRE-EXAM HARDWARE & FULLSCREEN PRE-FLIGHT CHECK
          =======================================================================
        */
        <div className="min-h-screen w-full p-4 sm:p-6 lg:p-10 flex flex-col justify-center items-center">
          <div className="w-full max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/assessments">
                <Button variant="ghost" size="sm" className="p-2 h-auto rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={isProctored ? "purple" : "outline"} size="sm" className="font-bold">
                    {isProctored ? "SECURE PROCTORED EXAM" : "STANDARD ASSESSMENT"}
                  </Badge>
                </div>
                <h1 className="text-2xl font-black text-foreground mt-1">{assessment.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {assessment.companyName} • {assessment.durationMinutes} Minutes • {questions.length} Questions
                </p>
              </div>
            </div>

            <Card className="p-6 sm:p-8 border-border bg-card space-y-6 shadow-xl rounded-3xl">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Pre-Flight Hardware & Proctoring Verification
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This examination runs inside a dedicated, full-screen secure exam mode. Please confirm your hardware readiness and consent to begin.
                </p>
              </div>

              {/* Hardware Checks */}
              <div className="space-y-3">
                {/* Camera Check */}
                <div className="p-4 rounded-2xl border border-border bg-background flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">Webcam Stream</h4>
                        <p className="text-xs text-muted-foreground">
                          {assessment?.proctoringConfig?.cameraRequired ? "Mandatory for proctoring" : "Optional verification"}
                        </p>
                      </div>
                    </div>

                    {cameraReady ? (
                      <Badge variant="emerald" size="sm" className="gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={requestCamera} disabled={isCameraLoading}>
                        {isCameraLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          "Enable Camera"
                        )}
                      </Button>
                    )}
                  </div>

                  {cameraError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span>{cameraError}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={requestCamera} className="h-6 text-xs px-2 text-rose-600 hover:text-rose-700">
                        Retry
                      </Button>
                    </div>
                  )}
                </div>

                {/* Microphone Check */}
                <div className="p-4 rounded-2xl border border-border bg-background flex flex-col gap-3 overflow-hidden">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5 shrink-0" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">Microphone Audio</h4>
                        <p className="text-xs text-muted-foreground">
                          {assessment?.proctoringConfig?.microphoneRequired ? "Mandatory for proctoring" : "Optional audio verification"}
                        </p>
                      </div>
                    </div>

                    {micReady ? (
                      <Badge variant="emerald" size="sm" className="gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={requestMicrophone} disabled={isMicLoading}>
                        {isMicLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          "Enable Mic"
                        )}
                      </Button>
                    )}
                  </div>

                  {micError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2 overflow-hidden">
                      <MicOff className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="break-words">{micError}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={requestMicrophone}
                        className="h-6 text-xs px-2 text-rose-600 hover:text-rose-700 shrink-0"
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </div>

                {/* Screen Share Check */}
                {assessment?.proctoringConfig?.entireScreenRequired && (
                  <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">Entire Desktop Screen Share</h4>
                        <p className="text-xs text-muted-foreground">You must select &apos;Entire Screen&apos; when prompted</p>
                      </div>
                    </div>

                    {screenReady ? (
                      <Badge variant="emerald" size="sm" className="gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={requestScreenShare}>
                        Share Screen
                      </Button>
                    )}
                  </div>
                )}

                {/* Fullscreen Requirement Pill */}
                <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Browser Fullscreen Enforcement</h4>
                      <p className="text-xs text-muted-foreground">Entered automatically upon launching examination</p>
                    </div>
                  </div>
                  <Badge variant="purple" size="sm" className="font-bold">
                    Mandatory
                  </Badge>
                </div>
              </div>

              {/* Webcam Live Preview (Stable Mounted Container) */}
              <div className="w-48 h-32 rounded-2xl bg-zinc-950/90 dark:bg-black border border-border mx-auto relative overflow-hidden shadow-inner flex items-center justify-center">
                <video
                  ref={setVideoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
                    cameraReady && isCameraStreaming ? "opacity-100" : "opacity-0"
                  }`}
                />
                {/* Active Live Indicator Badge */}
                {cameraReady && isCameraStreaming && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] text-white font-bold backdrop-blur-sm border border-white/10 shadow-sm pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Webcam Active
                  </span>
                )}
                {/* Loading / Connecting state */}
                {isCameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-xs text-white text-xs gap-2 p-3 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="font-medium text-[11px]">Connecting camera feed...</span>
                  </div>
                )}
                {/* Error / Revocation state */}
                {!isCameraLoading && cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-rose-300 text-xs gap-1.5 p-3 text-center">
                    <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-0.5">
                      <CameraOff className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <span className="font-bold text-rose-400 text-[11px]">Camera Disconnected</span>
                    <span className="text-[10px] text-rose-200/80 line-clamp-2 max-w-[170px]">
                      {cameraError}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={requestCamera}
                      className="h-5 text-[10px] px-2 mt-0.5 text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30"
                    >
                      Retry
                    </Button>
                  </div>
                )}
                {/* Idle / Uninitialized state */}
                {!cameraReady && !isCameraLoading && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground text-xs gap-1.5 p-3 text-center">
                    <div className="w-8 h-8 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Camera preview will appear here
                    </span>
                  </div>
                )}
              </div>

              {/* Privacy & Consent Agreement */}
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-2.5">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Secure Exam Mode Terms & Integrity Declaration
                </h4>
                <p className="leading-relaxed">
                  When you enter Secure Exam Mode, the assessment will take over your browser viewport in full screen. Exiting full screen, switching browser tabs, minimizing the window, or disconnecting camera/screen tracks will record an integrity event. The session will automatically terminate if maximum violation limits are exceeded.
                </p>
                <label className="flex items-center gap-2.5 pt-2 cursor-pointer font-bold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                  <span>I acknowledge the proctoring rules and agree to enter Secure Exam Mode.</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="gradient"
                  size="md"
                  disabled={!isEnvironmentReady}
                  onClick={handleStartExam}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Enter Secure Exam Mode
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* 
          =======================================================================
          VIEW 4: DEDICATED FULL-SCREEN SECURE EXAM MODE
          (100vw, 100vh, Pure Viewport Takeover, Zero CommandSkill Chrome)
          =======================================================================
        */
        <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col justify-between overflow-hidden select-none">
          {/* 
            =====================================================================
            1. EXAM HEADER
            =====================================================================
          */}
          <header className="h-16 px-4 sm:px-8 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 shadow-sm z-30">
            {/* Left: Branding & Assessment Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600 shrink-0" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-purple-600 hidden sm:inline">
                  Secure Assessment
                </span>
              </div>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <h1 className="text-sm font-black text-foreground truncate max-w-xs sm:max-w-md">
                {assessment.title}
              </h1>
            </div>

            {/* Center: Question Progress & Autosave indicator */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className="font-extrabold text-foreground">
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {saveStatus === "SAVING" ? (
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving answer...
                  </span>
                ) : (
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> All changes saved
                  </span>
                )}
              </span>
            </div>

            {/* Right: Timer & Submit Button */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-black ${
                  remainingSeconds < 300
                    ? "bg-rose-500/20 text-rose-600 border border-rose-500/30 animate-pulse"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>

              <Button
                variant="gradient"
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Exam
              </Button>
            </div>
          </header>

          {/* Warning Banner if violation triggered */}
          {warningMessage && (
            <div className="px-6 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 font-bold animate-pulse shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{warningMessage}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setWarningMessage(null)} className="h-6 text-xs px-2">
                Dismiss
              </Button>
            </div>
          )}

          {/* 
            =====================================================================
            2. EXAM WORKSPACE & QUESTION PALETTE NAVIGATOR
            =====================================================================
          */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
            {/* Left: Question Workspace */}
            <Card className="p-6 sm:p-8 border-border bg-card lg:col-span-3 flex flex-col justify-between shadow-md rounded-3xl min-h-[460px]">
              {currentQ && (
                <div className="space-y-6">
                  {/* Question Header & Controls */}
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-purple-600 dark:text-purple-400">
                        QUESTION {currentQIndex + 1}
                      </span>
                      <Badge variant="secondary" size="sm" className="font-bold">
                        {currentQ.marks} Marks
                      </Badge>
                      {currentQ.negativeMarks > 0 && (
                        <Badge variant="rose" size="sm" className="font-bold">
                          -{currentQ.negativeMarks} Neg
                        </Badge>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(markedForReview[currentQ.id])}
                        onChange={(e) =>
                          setMarkedForReview({
                            ...markedForReview,
                            [currentQ.id]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                      <span>Mark for review</span>
                    </label>
                  </div>

                  {/* Question Text */}
                  <h2 className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
                    {currentQ.questionText}
                  </h2>

                  {/* Question Options */}
                  {currentQ.type === "SHORT_ANSWER" ? (
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Enter your answer:
                      </label>
                      <input
                        type="text"
                        value={answers[currentQ.id] || ""}
                        onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                        placeholder="Type concise answer here..."
                        className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {currentQ.options?.map((opt, oIdx) => {
                        const isMulti = currentQ.type === "MULTIPLE_CHOICE";
                        const currentVal = answers[currentQ.id];
                        const isSelected = isMulti
                          ? Array.isArray(currentVal) && currentVal.includes(opt)
                          : currentVal === opt;

                        return (
                          <div
                            key={oIdx}
                            onClick={() => {
                              if (isMulti) {
                                const existingArr: string[] = Array.isArray(currentVal) ? [...currentVal] : [];
                                if (existingArr.includes(opt)) {
                                  handleSelectAnswer(
                                    currentQ.id,
                                    existingArr.filter((item) => item !== opt)
                                  );
                                } else {
                                  handleSelectAnswer(currentQ.id, [...existingArr, opt]);
                                }
                              } else {
                                handleSelectAnswer(currentQ.id, opt);
                              }
                            }}
                            className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? "border-purple-600 bg-purple-500/10 text-purple-900 dark:text-purple-100 font-bold shadow-sm"
                                : "border-border bg-background hover:bg-muted/40 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <span className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-xs font-black shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="text-sm">{opt}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Question Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAnswer(currentQ.id, "")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Choice
                </Button>

                {currentQIndex < questions.length - 1 ? (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Save & Next
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => setIsSubmitModalOpen(true)}
                  >
                    Review & Submit
                  </Button>
                )}
              </div>
            </Card>

            {/* Right: Question Palette Navigator & Live Proctoring Camera Feed */}
            <Card className="p-5 border-border bg-card space-y-5 shadow-md rounded-3xl h-fit">
              {/* In-Exam Live Proctoring Webcam View */}
              {cameraReady && (
                <div className="w-full h-32 rounded-2xl bg-black overflow-hidden border border-border relative shadow-inner">
                  <video
                    ref={setExamVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover -scale-x-100"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      v.play().catch((err) => console.warn("Exam video play warn:", err));
                    }}
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/75 text-[10px] text-white font-bold backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Proctoring Active</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider">
                  Question Palette
                </h3>
                <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                  {answeredCount}/{questions.length} Answered
                </span>
              </div>

              {/* Palette Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.id]);
                  const isReview = Boolean(markedForReview[q.id]);
                  const isCurrent = currentQIndex === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                        isCurrent
                          ? "ring-2 ring-purple-600 font-black scale-105"
                          : ""
                      } ${
                        isReview
                          ? "bg-amber-500/20 text-amber-600 border border-amber-500/40"
                          : isAnswered
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Palette Legend */}
              <div className="space-y-2 pt-3 border-t border-border text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                    <span>Answered</span>
                  </div>
                  <strong className="text-foreground">{answeredCount}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-muted shrink-0" />
                    <span>Unanswered</span>
                  </div>
                  <strong className="text-foreground">{questions.length - answeredCount}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500 shrink-0" />
                    <span>Marked for Review</span>
                  </div>
                  <strong className="text-foreground">
                    {Object.values(markedForReview).filter(Boolean).length}
                  </strong>
                </div>
              </div>
            </Card>
          </main>

          {/* 
            =====================================================================
            3. EXAM PROCTORING STATUS BAR (Bottom Persistent Status)
            =====================================================================
          */}
          <footer className="h-12 px-6 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-between text-xs shrink-0 z-30">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Camera Indicator */}
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${cameraReady ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
                <span className="text-muted-foreground hidden sm:inline">Camera:</span>
                <span className={cameraReady ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                  {cameraReady ? "Active" : "Off"}
                </span>
              </div>

              {/* Mic Indicator */}
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${micReady ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
                <span className="text-muted-foreground hidden sm:inline">Microphone:</span>
                <span className={micReady ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                  {micReady ? "Active" : "Off"}
                </span>
              </div>

              {/* Screen Indicator */}
              {assessment?.proctoringConfig?.entireScreenRequired && (
                <div className="flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${screenReady ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
                  <span className="text-muted-foreground hidden sm:inline">Screen:</span>
                  <span className={screenReady ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                    {screenReady ? "Active" : "Off"}
                  </span>
                </div>
              )}

              {/* Fullscreen Indicator */}
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${isFullscreenActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span className="text-muted-foreground hidden sm:inline">Fullscreen:</span>
                <span className={isFullscreenActive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                  {isFullscreenActive ? "Active" : "Lost"}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground hidden md:flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Browser-based Secure Examination Mode Active</span>
            </div>
          </footer>

          {/* 
            =====================================================================
            4. PROCTORING PAUSE & RECOVERY OVERLAY (BLOCKS CANDIDATE)
            =====================================================================
          */}
          {isPaused && (
            <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
              <Card className="p-8 border-amber-500/40 bg-card max-w-lg w-full text-center space-y-5 shadow-2xl rounded-3xl">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-black text-foreground">Assessment Paused</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    {pauseReason || "Fullscreen mode was exited or a mandatory proctoring feed was interrupted."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  You cannot continue answering questions until all mandatory conditions are restored.
                </div>

                <div className="pt-2 flex justify-center">
                  <Button
                    variant="gradient"
                    size="md"
                    onClick={async () => {
                      try {
                        let fsOk = true;
                        if (!document.fullscreenElement) {
                          fsOk = await requestFullscreen();
                        }

                        let camOk = true;
                        if (assessment?.proctoringConfig?.cameraRequired && !cameraReady) {
                          camOk = await requestCamera();
                        }

                        let micOk = true;
                        if (assessment?.proctoringConfig?.microphoneRequired && !micReady) {
                          micOk = await requestMicrophone();
                        }

                        let screenOk = true;
                        if (assessment?.proctoringConfig?.entireScreenRequired && !screenReady) {
                          screenOk = await requestScreenShare();
                        }

                        if (!fsOk || !camOk || !micOk || !screenOk) {
                          toastError("Please satisfy all mandatory hardware and fullscreen requirements to resume.");
                          return;
                        }

                        // Inform server of session recovery
                        await logIntegritySignal("SESSION_RECONNECTED", "Candidate restored required proctoring environment");
                        setIsPaused(false);
                        setPauseReason("");
                        success("Environment verified. Examination resumed.");
                      } catch (err) {
                        toastError("Please satisfy all mandatory hardware and fullscreen requirements to resume.");
                      }
                    }}
                  >
                    Restore Fullscreen & Resume Exam
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* 
            =====================================================================
            5. FINAL SUBMISSION MODAL CONFIRMATION
            =====================================================================
          */}
          <Modal
            isOpen={isSubmitModalOpen}
            onClose={() => setIsSubmitModalOpen(false)}
            title="Final Assessment Submission"
            description="Please review your progress before finalizing your answers."
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Questions:</span>
                  <strong className="text-foreground">{questions.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Answered:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unanswered:</span>
                  <strong className="text-rose-500">{questions.length - answeredCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marked for Review:</span>
                  <strong className="text-amber-500">
                    {Object.values(markedForReview).filter(Boolean).length}
                  </strong>
                </div>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed">
                Upon submitting, your answers will be securely locked and evaluated on the server. Camera, microphone, and screen captures will immediately stop, and fullscreen will be exited.
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
                  Return to Exam
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Finalizing & Submitting..." : "Confirm & Submit Now"}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </RoleGuard>
  );
}

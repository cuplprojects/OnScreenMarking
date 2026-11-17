import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  RotateCcw,
  Loader,
  Type,
  X,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Check,
  Lock,
  AlertTriangle,
  Clock
} from "lucide-react";
import PDFAnnotator from "../components/PDFAnnotator";
import sectionService from "../services/sectionService";
import markingService from "../services/markingService";
import paperService from "../services/paperService";
import userService from "../services/userService";
import apiCall from "../services/api";
import { useAuth } from "../context/AuthContext";
import message from "../services/messageService";
import { MarkingStatus } from "../constants/enums";
import { decryptId, encryptId } from "../utils/encryption";

// Helper to extract landmarks from an image URL or base64
const extractImageLandmarks = async (imageSrc, landmarker) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const results = landmarker.detect(canvas);
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          resolve(results.faceLandmarks[0]);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error("Landmarker static detect error:", e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
};

// Helper to compare two sets of facial landmarks by calculating average Euclidean distance
const compareFaces = (face1, face2) => {
  if (!face1 || !face2 || face1.length === 0 || face2.length === 0) return 1.0;
  
  // Normalize face1 (registered)
  let minX1 = 1, maxX1 = 0, minY1 = 1, maxY1 = 0;
  for (const lm of face1) {
    if (lm.x < minX1) minX1 = lm.x;
    if (lm.x > maxX1) maxX1 = lm.x;
    if (lm.y < minY1) minY1 = lm.y;
    if (lm.y > maxY1) maxY1 = lm.y;
  }
  const w1 = maxX1 - minX1 || 1;
  const h1 = maxY1 - minY1 || 1;
  const cx1 = (minX1 + maxX1) / 2;
  const cy1 = (minY1 + maxY1) / 2;

  // Normalize face2 (live frame)
  let minX2 = 1, maxX2 = 0, minY2 = 1, maxY2 = 0;
  for (const lm of face2) {
    if (lm.x < minX2) minX2 = lm.x;
    if (lm.x > maxX2) maxX2 = lm.x;
    if (lm.y < minY2) minY2 = lm.y;
    if (lm.y > maxY2) maxY2 = lm.y;
  }
  const w2 = maxX2 - minX2 || 1;
  const h2 = maxY2 - minY2 || 1;
  const cx2 = (minX2 + maxX2) / 2;
  const cy2 = (minY2 + maxY2) / 2;

  // Compute mean distance between normalized coordinates
  let sumDist = 0;
  const len = Math.min(face1.length, face2.length);
  for (let i = 0; i < len; i++) {
    const nX1 = (face1[i].x - cx1) / w1;
    const nY1 = (face1[i].y - cy1) / h1;
    const nX2 = (face2[i].x - cx2) / w2;
    const nY2 = (face2[i].y - cy2) / h2;

    const dx = nX1 - nX2;
    const dy = nY1 - nY2;
    sumDist += Math.sqrt(dx * dx + dy * dy);
  }
  return sumDist / len;
};

// Modular Subcomponents
import { MarkingLoadingView, MarkingErrorView, ProctorWarningBanner, SecurityOverlays } from "../components/examiner/MarkingStatusViews";
import { MarkingHeader, formatCountdown } from "../components/examiner/MarkingHeader";
import { QuestionPaperViewer } from "../components/examiner/QuestionPaperViewer";
import { QuestionPalette } from "../components/examiner/QuestionPalette";
import { MarkingActions, RemarksSection } from "../components/examiner/MarkingActions";
import { RemarksModal, GroupSwitchModal } from "../components/examiner/Modals";
import { LiveCameraPip } from "../components/examiner/LiveCameraPip";

const ExaminerMarking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  
  const { scriptId: routeScriptId } = useParams();
  
  // Get parameters from route param /marking/:scriptId, location state, or URL search params (decrypts if encrypted)
  const queryParams = new URLSearchParams(location.search);
  const rawScriptId = routeScriptId || location.state?.scriptId || queryParams.get('scriptId');
  const scriptId = rawScriptId ? decryptId(rawScriptId) : null;
  const rawPaperId = location.state?.paperId || queryParams.get('paperId');
  const [paperId, setPaperId] = useState(rawPaperId ? decryptId(rawPaperId) : null);
  const rawProjectPaperId = location.state?.projectPaperId || queryParams.get('projectPaperId');
  const [projectPaperId, setProjectPaperId] = useState(rawProjectPaperId ? decryptId(rawProjectPaperId) : null);
  const rawBatchId = location.state?.batchId || queryParams.get('batchId');
  const [batchId, setBatchId] = useState(rawBatchId ? decryptId(rawBatchId) : null);
  const rawAllocationId = location.state?.allocationId || queryParams.get('allocationId');
  const [allocationId, setAllocationId] = useState(rawAllocationId ? decryptId(rawAllocationId) : null);
  // Derive examiner strictly from verified session user
  const examinerId = user?.id;
  const [studentName, setStudentName] = useState(location.state?.studentName || queryParams.get('studentName'));
  const [rollNo, setRollNo] = useState(location.state?.rollNo || queryParams.get('rollNo'));
  const [subject, setSubject] = useState(location.state?.subject || queryParams.get('subject'));
  const [cleanPdfUrl, setCleanPdfUrl] = useState(location.state?.cleanPdfUrl || queryParams.get('cleanPdfUrl'));
  // Avoid accepting arbitrary external URLs from query parameters
  const [rawQpPdfUrl, setRawQpPdfUrl] = useState(location.state?.questionPaperPdfUrl || null);
  
  const isAdmin = userType === 'admin' || userType === 'superadmin';
  const isCoordinator = userType === 'coordinator';
  const isReadOnly = location.state?.readOnly === true || 
                     queryParams.get('readOnly') === 'true' || 
                     isAdmin || 
                     isCoordinator;

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const pdfUrl = scriptId ? `${apiBaseUrl}/Scripts/${scriptId}/pdf` : null;

  const [sections, setSections] = useState([]);
  const [paperInfo, setPaperInfo] = useState(null);
  const [fetchedQpUrl, setFetchedQpUrl] = useState("");
  const effectiveQpPdfUrl = rawQpPdfUrl || fetchedQpUrl || paperInfo?.questionPaperPdfUrl || paperInfo?.pdfUrl || "";

  const [expandedSections, setExpandedSections] = useState({});
  const [questionMarks, setQuestionMarks] = useState({});
  const [totalObtained, setTotalObtained] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [proctorWarning, setProctorWarning] = useState("");
  const landmarkerRef = useRef(null);
  const [isLandmarkerLoaded, setIsLandmarkerLoaded] = useState(false);
  const registeredLandmarksRef = useRef(null);
  const consecutiveMismatchesRef = useRef(0);
  const [sectionAttemptCounts, setSectionAttemptCounts] = useState({}); // Track attempted questions per section
  const [submitted, setSubmitted] = useState(false);
  const [markingStatus, setMarkingStatus] = useState(null); // Track status from markings table
  // Marking is locked/submitted if status in markings table is 'submitted'
  const isMarkingSubmitted = markingStatus === MarkingStatus.SUBMITTED || submitted; 
  const isEffectiveReadOnly = isReadOnly || isMarkingSubmitted; 
  const [saving, setSaving] = useState(false);
  const [groupSwitchModal, setGroupSwitchModal] = useState(null);

  // TimePerCopy timer state
  const [timePerCopyMinutes, setTimePerCopyMinutes] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [markingStartedAt, setMarkingStartedAt] = useState(null);

  // TimePerCopy countdown timer effect
  useEffect(() => {
    if (!timePerCopyMinutes || timePerCopyMinutes <= 0 || isMarkingSubmitted || !scriptId) {
      setRemainingSeconds(0);
      return;
    }

    const storageKey = `marking_timer_start_${scriptId}`;
    let startTimeEpoch = sessionStorage.getItem(storageKey);
    if (!startTimeEpoch) {
      if (markingStartedAt) {
        startTimeEpoch = new Date(markingStartedAt).getTime().toString();
      } else {
        startTimeEpoch = Date.now().toString();
      }
      sessionStorage.setItem(storageKey, startTimeEpoch);
    }

    const computeRemaining = () => {
      const startMs = parseInt(sessionStorage.getItem(storageKey) || startTimeEpoch, 10);
      const elapsedSec = Math.floor((Date.now() - startMs) / 1000);
      const requiredTotalSec = timePerCopyMinutes * 60;
      const left = Math.max(0, requiredTotalSec - elapsedSec);
      setRemainingSeconds(left);
      return left;
    };

    computeRemaining();
    const interval = setInterval(() => {
      const left = computeRemaining();
      if (left <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timePerCopyMinutes, isMarkingSubmitted, scriptId, markingStartedAt]);
  const [annotations, setAnnotations] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); 
  const [showQpModal, setShowQpModal] = useState(false);
  const [isQpCollapsed, setIsQpCollapsed] = useState(true);
  const [qpWidth, setQpWidth] = useState(320);
  const qpDragRef = useRef(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const annotatorRef = useRef(null);

  // QP panel drag-to-resize handlers
  const handleQpDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = qpWidth;

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(600, Math.max(200, startWidth + delta));
      setQpWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Security Print & Screenshot Prevention
  useEffect(() => {
    const handleContextMenu = (e) => {
      // Allow right-click on the PDF canvas or annotator container so examiners can allot marks
      if (
        e.target.tagName === 'CANVAS' || 
        e.target.closest('canvas') ||
        e.target.closest('[data-annotator-container="true"]')
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      // Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        message.warning("Printing is disabled on this secure marking page.");
        return;
      }
      // Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return;
      }
      // F12 or Ctrl+Shift+I / Cmd+Opt+I
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        return;
      }
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.key === 'PrtScn' || e.keyCode === 44) {
        e.preventDefault();
        
        // Show solid black security mask immediately to prevent OS screenshot capture
        const mask = document.getElementById("secure-screenshot-mask");
        if (mask) {
          mask.style.display = 'flex';
        }
        
        // Clear clipboard
        try {
          navigator.clipboard.writeText("");
        } catch (err) {}
        
        message.error("Screenshots are strictly prohibited on this secure marking page.");
        
        // Restore visibility after a delay
        setTimeout(() => {
          if (mask) {
            mask.style.display = 'none';
          }
        }, 1000);
        return;
      }
    };

    const handleKeyUp = (e) => {
      // PrintScreen key (in Chrome, PrintScreen triggers keyup but not keydown)
      if (e.key === 'PrintScreen' || e.key === 'PrtScn' || e.keyCode === 44) {
        e.preventDefault();
        
        // Show solid black security mask immediately to prevent OS screenshot capture
        const mask = document.getElementById("secure-screenshot-mask");
        if (mask) {
          mask.style.display = 'flex';
        }
        
        // Clear clipboard
        try {
          navigator.clipboard.writeText("");
        } catch (err) {}
        
        message.error("Screenshots are strictly prohibited on this secure marking page.");
        
        // Restore visibility after a delay
        setTimeout(() => {
          if (mask) {
            mask.style.display = 'none';
          }
        }, 1000);
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      message.warning("Copying text is disabled for security reasons.");
    };

    const handleVisibilityChange = () => {
      // Only trigger blur protection if the page is actually hidden (tab switch, minimize, etc.)
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
        // Wipe clipboard on refocus
        try {
          navigator.clipboard.writeText("");
        } catch (err) {}
      }
    };

    // Keep blur/focus for legacy support but make them less aggressive
    const handleBlur = () => {
      // Use a longer timeout and only trigger if page is actually hidden
      setTimeout(() => {
        if (document.hidden) {
          setIsBlurred(true);
        }
      }, 300);
    };

    const handleFocus = () => {
      if (!document.hidden) {
        setIsBlurred(false);
      }
      // Immediately wipe clipboard on refocus (in case an OS screenshot utility was opened)
      try {
        navigator.clipboard.writeText("");
      } catch (err) {}
    };

    const style = document.createElement("style");
    style.id = "secure-marking-print-block";
    style.innerHTML = `
      @media print {
        body {
          display: none !important;
        }
        html {
          display: none !important;
        }
      }
      .secure-marking-container {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("cut", handleCopy);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      const printStyle = document.getElementById("secure-marking-print-block");
      if (printStyle) printStyle.remove();
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("cut", handleCopy);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const startWebcam = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.warn("Camera access denied or failed:", err);
      }
    };

    startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [loading]);

  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef.current]); 

  // Dynamic continuous proctoring facial matching
  useEffect(() => {
    if (loading || !stream) return;

    let intervalId = null;
    let localLandmarker = null;

    const setupProctoring = async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8"
        );
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        localLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numFaces: 2
        });

        landmarkerRef.current = localLandmarker;
        setIsLandmarkerLoaded(true);

        let profileImageBase64 = user?.profileImage;
        if (!profileImageBase64 && examinerId) {
          try {
            const fetchedUser = await userService.getUserById(examinerId);
            if (fetchedUser && fetchedUser.profileImage) {
              profileImageBase64 = fetchedUser.profileImage;
            }
          } catch (e) {
            console.error("OSM Proctoring: Failed to fetch user profile image:", e);
          }
        }

        if (profileImageBase64) {
          const landmarks = await extractImageLandmarks(profileImageBase64, localLandmarker);
          if (landmarks) {
            registeredLandmarksRef.current = landmarks;
          }
        }

        const runVerificationCheck = () => {
          if (!videoRef.current || !landmarkerRef.current) {
            return;
          }
          const video = videoRef.current;
          if (video.readyState < 2) {
            return;
          }

          try {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = 160;
            tempCanvas.height = 120;
            const ctx = tempCanvas.getContext("2d");
            if (!ctx) return;

            // Draw current video frame directly to canvas in standard orientation to match registered profile photo
            ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            const results = landmarkerRef.current.detect(tempCanvas);
            const facesCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

            let currentCheckWarning = "";

            if (facesCount === 0) {
              currentCheckWarning = "No Face";
            } else if (facesCount > 1) {
              currentCheckWarning = "Multiple Faces";
            } else {
              const currentLandmarks = results.faceLandmarks[0];
              if (registeredLandmarksRef.current) {
                const distance = compareFaces(registeredLandmarksRef.current, currentLandmarks);
                if (distance > 0.15) {
                  currentCheckWarning = "Mismatch";
                }
              }
            }

            if (currentCheckWarning !== "") {
              consecutiveMismatchesRef.current = (consecutiveMismatchesRef.current || 0) + 1;
              if (consecutiveMismatchesRef.current >= 3) {
                setProctorWarning((prevWarning) => {
                  if (prevWarning !== currentCheckWarning) {
                    return currentCheckWarning;
                  }
                  return prevWarning;
                });
              }
            } else {
              consecutiveMismatchesRef.current = 0;
              setProctorWarning("");
            }
          } catch (err) {
            console.error("OSM Proctoring Check Error:", err);
          }
        };

        // Trigger initial fast check after 4 seconds
        setTimeout(runVerificationCheck, 4000);

        // Run matching every 5 seconds
        intervalId = setInterval(runVerificationCheck, 5000);
      } catch (err) {
        console.error("OSM Proctoring Setup failed:", err);
      }
    };

    setupProctoring();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (localLandmarker) {
        try {
          localLandmarker.close();
        } catch (e) {}
      }
    };
  }, [loading, stream]); 
  // Load script details and verify access on mount / scriptId change
  useEffect(() => {
    if (!scriptId) {
      setError('No script selected. Please select a script from the Scripts page.');
      setLoading(false);
      return;
    }

    const loadScriptData = async () => {
      try {
        setLoading(true);
        const scriptData = await apiCall(`/scripts/${scriptId}`);
        if (scriptData) {
          if (scriptData.paperId) setPaperId(scriptData.paperId);
          if (scriptData.projectPaperId) setProjectPaperId(scriptData.projectPaperId);
          if (scriptData.batchId) setBatchId(scriptData.batchId);
          if (scriptData.maxMarks) {
            setPaperInfo(prev => ({ ...(prev || {}), maxMarks: scriptData.maxMarks }));
          }
          const allocId = scriptData.allocationId || scriptData.AllocationId;
          if (allocId) setAllocationId(allocId);
          if (scriptData.studentName || scriptData.rollNumber) {
            setStudentName(scriptData.studentName || scriptData.rollNumber);
          }
          if (scriptData.rollNumber) setRollNo(scriptData.rollNumber);
          if (scriptData.subjectName) setSubject(scriptData.subjectName);
          if (scriptData.questionPaperPdfUrl) setRawQpPdfUrl(scriptData.questionPaperPdfUrl);
          if (scriptData.cleanPdfUrl) setCleanPdfUrl(scriptData.cleanPdfUrl);
        }
      } catch (err) {
        console.error("Failed to load script details:", err);
        const errMsg = err.response?.data?.message || err.message || "Access Denied: You are not authorized to view or evaluate this script.";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    loadScriptData();
  }, [scriptId]);

  useEffect(() => {
    if (!paperId) {
      if (!scriptId) {
        setError('No paper selected. Please select a script from the Scripts page.');
        setLoading(false);
      }
      return;
    }
    fetchPaperData();
  }, [paperId]);

  const loadExistingQuestionMarks = async (mId, defaultMarks) => {
    try {
      let marksToLoad = null;
      
      // 1. Try to fetch draft marks from Redis
      try {
        const draftRes = await markingService.getDraftMarks(scriptId, examinerId);
        if (draftRes && draftRes.draftData) {
          marksToLoad = draftRes.draftData;
        }
      } catch (e) {
        console.warn("Failed to load draft marks from Redis:", e);
      }

      // 2. If no draft, fetch saved marks from DB
      if (!marksToLoad) {
        const savedMarks = await markingService.getQuestionMarks(mId);
        if (savedMarks && savedMarks.length > 0) {
          // Convert array format to object format for state
          marksToLoad = { ...defaultMarks };
          savedMarks.forEach(sm => {
            const qKey = sm.questionMasterId || sm.questionId;
            if (marksToLoad[qKey]) {
              marksToLoad[qKey] = {
                ...marksToLoad[qKey],
                marksAwarded: sm.marksAwarded,
                isSkipped: sm.isSkipped,
                remarks: sm.remarks || "",
                isAttempted: sm.isAttempted
              };
            }
          });
        }
      }

      // 3. Apply the loaded marks
      if (marksToLoad) {
        // Ensure default structure is maintained in case draft is partial
        const updated = { ...defaultMarks };
        Object.keys(marksToLoad).forEach(qId => {
          const matchKey = Object.keys(updated).find(k => String(k) === String(qId)) || qId;
          if (updated[matchKey]) {
             updated[matchKey] = { ...updated[matchKey], ...marksToLoad[qId] };
          }
        });
        setQuestionMarks(updated);
        calculateTotal(updated);
      }
    } catch (err) {
      console.error("Failed to load existing question marks:", err);
    }
  };

  const createMarkingSession = async () => {
    try {
      // 1. For Admin, Coordinator, or Read-Only mode: retrieve existing marking without creating new draft session
      if (isAdmin || isCoordinator || isEffectiveReadOnly) {
        if (scriptId) {
          try {
            const existingMarking = await markingService.getMarkingByScript(scriptId);
            if (existingMarking?.id) {
              setMarkingId(existingMarking.id);
              if (existingMarking.remarks) setRemarks(existingMarking.remarks);
              if (existingMarking.timePerCopyMinutes) setTimePerCopyMinutes(existingMarking.timePerCopyMinutes);
              if (existingMarking.startedAt) setMarkingStartedAt(existingMarking.startedAt);
              const mStatus = existingMarking.status?.toLowerCase();
              if (mStatus) {
                setMarkingStatus(mStatus);
                if (mStatus === MarkingStatus.SUBMITTED) setSubmitted(true);
              }
              return existingMarking.id;
            }
          } catch (e) {
            console.warn("Read-only viewer: no existing marking found.", e);
          }
        }
        return null;
      }

      let currentAllocId = allocationId;
      if (!currentAllocId && scriptId) {
        try {
          const allocRes = await apiCall(`/allocations/script/${scriptId}`);
          const fetchedAllocId = allocRes?.allocationId || allocRes?.AllocationId;
          if (fetchedAllocId) {
            currentAllocId = fetchedAllocId;
            setAllocationId(currentAllocId);
          }
        } catch (allocErr) {
          console.warn("Failed to fetch script allocation:", allocErr);
        }
      }

      if (!currentAllocId || !examinerId) {
        setError('Missing allocation or examiner information');
        return;
      }

      // Fetch marking status from markings table
      if (scriptId) {
        try {
          const existingMarking = await markingService.getMarkingByScript(scriptId);
          if (existingMarking?.status) {
            const mStatus = existingMarking.status?.toLowerCase();
            setMarkingStatus(mStatus);
            if (mStatus === MarkingStatus.SUBMITTED) {
              setSubmitted(true);
            }
          }
          if (existingMarking?.timePerCopyMinutes) {
            setTimePerCopyMinutes(existingMarking.timePerCopyMinutes);
          }
          if (existingMarking?.startedAt) {
            setMarkingStartedAt(existingMarking.startedAt);
          }
        } catch (err) {
          // No prior marking
        }
      }

      // Create a new marking session (or retrieve existing) from markings table
      const markingResponse = await markingService.createMarking(
        currentAllocId,
        examinerId,
        0, // Initial total marks
        remarks
      );

      if (markingResponse && markingResponse.id) {
        setMarkingId(markingResponse.id);
        if (markingResponse.remarks) {
          setRemarks(markingResponse.remarks);
        }
        if (markingResponse.timePerCopyMinutes) {
          setTimePerCopyMinutes(markingResponse.timePerCopyMinutes);
        }
        if (markingResponse.startedAt) {
          setMarkingStartedAt(markingResponse.startedAt);
        }
        const mStatus = markingResponse.status?.toLowerCase();
        if (mStatus) {
          setMarkingStatus(mStatus);
          if (mStatus === MarkingStatus.SUBMITTED) {
            setSubmitted(true);
          }
        }
        return markingResponse.id;
      }
    } catch (err) {
      console.error('Failed to create marking session:', err);
      setError('Failed to create marking session. Please try again.');
    }
  };

  const fetchPaperData = async () => {
    try {
      setLoading(true);
      // Fetch paper details to get questionPaperPdfUrl
      if (paperId) {
        try {
          const fullPaper = await paperService.getPaperById(paperId);
          if (fullPaper) {
            setPaperInfo(fullPaper);
            if (fullPaper.questionPaperPdfUrl) {
              setFetchedQpUrl(fullPaper.questionPaperPdfUrl);
            }
          }
        } catch (qpErr) {
          console.warn("Failed to fetch full paper by ID:", qpErr);
        }
      }

      // Fetch ProjectPaperSections using batchId, projectPaperId, or scriptId
      let data = null;
      let effectiveProjectPaperId = projectPaperId;
      let effectiveBatchId = batchId;

      if ((!effectiveProjectPaperId || !effectiveBatchId) && scriptId) {
        try {
          const scriptData = await apiCall(`/scripts/${scriptId}`);
          if (!effectiveProjectPaperId && scriptData?.projectPaperId) {
            effectiveProjectPaperId = scriptData.projectPaperId;
            setProjectPaperId(effectiveProjectPaperId);
          }
          if (!effectiveBatchId && scriptData?.batchId) {
            effectiveBatchId = scriptData.batchId;
            setBatchId(effectiveBatchId);
          }
          if (scriptData?.maxMarks) {
            setPaperInfo(prev => ({ ...(prev || {}), maxMarks: scriptData.maxMarks }));
          }
        } catch (scriptErr) {
          console.warn("Failed to fetch script to get projectPaperId/batchId:", scriptErr);
        }
      }

      if (effectiveBatchId || effectiveProjectPaperId || scriptId) {
        try {
          data = await sectionService.getProjectPaperSections({
            projectPaperId: effectiveProjectPaperId,
            batchId: effectiveBatchId,
            scriptId: scriptId
          });
        } catch (secErr) {
          console.warn("Failed to fetch sections by batchId/projectPaperId:", secErr);
        }
      }

      // Fallback: filter by paperId if we still have no data
      const getSectionsList = (res) => Array.isArray(res) ? res : (res?.sections || []);
      if (!data || getSectionsList(data).length === 0) {
        try {
          data = await sectionService.getProjectPaperSections({ paperId, batchId: effectiveBatchId, scriptId });
        } catch (fallbackErr) {
          console.warn("Fallback section fetch also failed:", fallbackErr);
        }
      }

      // Normalize data shape: handle both envelope { projectPaper, sections } and array
      const rawSections = getSectionsList(data);
      const paperInfoObj = data?.projectPaper || rawSections[0]?.projectPaper;
      const resolvedMaxMarks = data?.totalPaperMarks || paperInfoObj?.maxMarks || rawSections[0]?.totalPaperMarks;

      if (rawSections && rawSections.length > 0) {
        const normalizedData = rawSections.map(section => ({
          ...section,
          questions: (section.questions || []).map(q => ({
            ...q,
            sectionId: section.id // ensure sectionId links back to the section
          }))
        }));

        setSections(normalizedData);

        // Extract paper info and max marks
        if (paperInfoObj) {
          setPaperInfo(prev => ({ ...(prev || {}), ...paperInfoObj, maxMarks: resolvedMaxMarks || prev?.maxMarks }));
        } else if (resolvedMaxMarks) {
          setPaperInfo(prev => ({ ...(prev || {}), maxMarks: resolvedMaxMarks }));
        }

        const expanded = {};
        const marks = {};
        const attemptCounts = {};

        normalizedData.forEach((section) => {
          expanded[section.id] = true; // All sections open by default
          attemptCounts[section.id] = 0; // Initialize attempt count for section
          section.questions?.forEach((q) => {
            marks[q.questionId] = {
              marksAwarded: 0,
              isSkipped: false,
              remarks: "",
              isAttempted: false,
              maxMarks: q.marks,
              questionNo: q.questionNo
            };
          });
        });

        setExpandedSections(expanded);
        setQuestionMarks(marks);
        setSectionAttemptCounts(attemptCounts);

        // Auto-select first question so annotation tool is immediately enabled
        const firstQ = normalizedData[0]?.questions?.[0];
        if (firstQ) {
          setSelectedQuestion((prev) => prev || firstQ.questionId);
        }

        // Create marking session after loading sections
        const mId = await createMarkingSession();
        if (mId) {
          await loadExistingQuestionMarks(mId, marks);
        }
      }
    } catch (err) {
      setError("Failed to fetch paper data. Please check connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotationsChange = (newAnnotations) => {
    setAnnotations(newAnnotations);
    
    // SYNC LOGIC: Map marks from annotations back to the question Palette
    setQuestionMarks(prev => {
      const updated = { ...prev };
      
      // Reset marks for all questions to recalculate from annotations
      Object.keys(updated).forEach(id => {
        updated[id].marksAwarded = 0;
        updated[id].isAttempted = false;
        updated[id].isSkipped = false;
      });

      // Sum marks from annotations for each question
      newAnnotations.forEach(anno => {
        if (anno.questionId && anno.marks !== undefined) {
          const q = findQuestionByNo(anno.questionId);
          if (q && updated[q.questionId]) {
            const section = sections.find(s => s.id === q.sectionId);
            
            // If question is marked as skipped, set the flag
            if (anno.isSkipped) {
              updated[q.questionId].isSkipped = true;
              updated[q.questionId].marksAwarded = 0;
              updated[q.questionId].isAttempted = false;
            } else {
              // Enforce optional group mutual exclusivity restriction
              if (anno.marks > 0 && q.optionalGroupCode && q.optionalGroupCode.trim()) {
                const grp = q.optionalGroupCode.trim().toUpperCase();
                const conflicting = (section?.questions || []).find(sq => 
                  String(sq.questionId) !== String(q.questionId) &&
                  sq.optionalGroupCode &&
                  sq.optionalGroupCode.trim().toUpperCase() === grp &&
                  ((Number(updated[sq.questionId]?.marksAwarded) > 0) || updated[sq.questionId]?.isAttempted) &&
                  !updated[sq.questionId]?.isSkipped
                );
                if (conflicting) {
                  setError(`Cannot award marks to Question ${q.questionNo}: Question ${conflicting.questionNo} in Group '${grp}' already has marks.`);
                  setTimeout(() => setError(''), 4000);
                  return;
                }
              }

              // Enforce maxQuestionsToAttempt restriction
              const currentMarks = updated[q.questionId];
              const isCurrentlyAttempted = currentMarks?.isAttempted || currentMarks?.marksAwarded > 0;
              const willAttempt = anno.marks > 0;
              
              if (willAttempt && !isCurrentlyAttempted && section && section.maxQuestionsToAttempt > 0) {
                const attemptedCount = section.questions?.filter(sq => {
                  const m = updated[sq.questionId];
                  return m?.isAttempted || m?.marksAwarded > 0;
                }).length || 0;
                
                if (attemptedCount >= section.maxQuestionsToAttempt) {
                  setError(`Cannot attempt more than ${section.maxQuestionsToAttempt} questions in ${section.name}. Capped marks at 0.`);
                  setTimeout(() => setError(''), 4000);
                  return;
                }
              }

              updated[q.questionId].marksAwarded += anno.marks;
              updated[q.questionId].isAttempted = true;
              
              // Cap at max marks for the question
              if (updated[q.questionId].marksAwarded > q.marks) {
                updated[q.questionId].marksAwarded = q.marks;
              }
            }
          }
        }
      });

      // Ensure section-wise total marks are not exceeded
      sections.forEach(sec => {
        let secSum = 0;
        const secQuestions = sec.questions || [];
        
        // Sum marks awarded for this section
        secQuestions.forEach(q => {
          if (updated[q.questionId]) {
            secSum += updated[q.questionId].marksAwarded || 0;
          }
        });

        if (secSum > sec.totalMarks) {
          let excess = secSum - sec.totalMarks;
          
          // Iterate backwards to reduce the excess from attempted questions
          for (let i = secQuestions.length - 1; i >= 0; i--) {
            const q = secQuestions[i];
            if (updated[q.questionId] && updated[q.questionId].marksAwarded > 0) {
              const currentVal = updated[q.questionId].marksAwarded;
              if (currentVal >= excess) {
                updated[q.questionId].marksAwarded = currentVal - excess;
                excess = 0;
                break;
              } else {
                updated[q.questionId].marksAwarded = 0;
                excess -= currentVal;
              }
            }
          }
          setError(`Marks in ${sec.name} capped to not cross section total of ${sec.totalMarks}.`);
          setTimeout(() => setError(''), 4000);
        }
      });

      calculateTotal(updated);
      return updated;
    });
  };

  const findQuestionByNo = (qNo) => {
    for (const section of sections) {
      const q = section.questions?.find((q) => String(q.questionNo) === String(qNo));
      if (q) return q;
    }
    return null;
  };

  const findQuestionById = (qId) => {
    if (!qId) return null;
    for (const section of sections) {
      const q = section.questions?.find((q) => String(q.questionId) === String(qId));
      if (q) return q;
    }
    return null;
  };

  const getConflictingGroupQuestion = (targetQ) => {
    if (!targetQ || !targetQ.optionalGroupCode || !targetQ.optionalGroupCode.trim()) return null;
    const targetGroup = targetQ.optionalGroupCode.trim().toUpperCase();
    
    // Find the section this question belongs to
    const sec = sections.find(s => s.id === targetQ.sectionId);
    if (!sec || !sec.questions) return null;

    for (const sq of sec.questions) {
      if (String(sq.questionId) === String(targetQ.questionId)) continue;
      if (sq.optionalGroupCode && sq.optionalGroupCode.trim().toUpperCase() === targetGroup) {
        const sm = questionMarks[sq.questionId];
        const isAttemptedWithMarks = ((Number(sm?.marksAwarded) > 0) || sm?.isAttempted) && !sm?.isSkipped;
        if (isAttemptedWithMarks) {
          return sq;
        }
      }
    }
    return null;
  };

  const getQuestionBlockedReason = (qNo) => {
    const q = findQuestionByNo(qNo);
    if (!q) return null;

    // A question that already has marks or is attempted can always be edited or cleared
    const m = questionMarks[q.questionId];
    const isAlreadyAttempted = ((Number(m?.marksAwarded) > 0) || m?.isAttempted) && !m?.isSkipped;
    if (isAlreadyAttempted) {
      return null;
    }

    // 1. Check optional group mutual exclusivity conflict
    const conflictingQ = getConflictingGroupQuestion(q);
    if (conflictingQ) {
      const groupCode = q.optionalGroupCode.trim().toUpperCase();
      return `Question ${q.questionNo} belongs to Optional Group '${groupCode}'. Question ${conflictingQ.questionNo} is already awarded marks in this group. Only 1 question can be attempted in Group '${groupCode}'.`;
    }

    // 2. Check section attempt limit
    const sec = sections.find(s => s.id === q.sectionId);
    if (sec && sec.maxQuestionsToAttempt && sec.maxQuestionsToAttempt > 0) {
      const attemptedCount = (sec.questions || []).filter(sq => {
        const sm = questionMarks[sq.questionId];
        return (sm?.isAttempted || (Number(sm?.marksAwarded) > 0)) && !sm?.isSkipped;
      }).length;
      if (attemptedCount >= sec.maxQuestionsToAttempt) {
        return `Section '${sec.name}' maximum attempt limit (${sec.maxQuestionsToAttempt} questions) reached.`;
      }
    }

    return null;
  };

  const canAttemptQuestion = (qNo) => {
    return !getQuestionBlockedReason(qNo);
  };

  const handleConfirmGroupSwitch = (targetQ, conflictingQ) => {
    // 1. Clear marks for conflicting question from questionMarks state
    setQuestionMarks(prev => {
      const updated = {
        ...prev,
        [conflictingQ.questionId]: {
          ...prev[conflictingQ.questionId],
          marksAwarded: 0,
          isAttempted: false,
          isSkipped: false
        }
      };
      calculateTotal(updated);
      return updated;
    });

    // 2. Remove conflicting question annotation from annotator canvas and storage
    annotatorRef.current?.clearQuestionMarks?.(conflictingQ.questionNo);

    // 3. Select target question
    setSelectedQuestion(targetQ.questionId);

    // 4. Open mark allotment modal for target question
    setTimeout(() => {
      annotatorRef.current?.openMarkModalForQuestion?.(targetQ.questionNo);
    }, 120);

    message.success(`Cleared marks from Question ${conflictingQ.questionNo}. Now evaluating Question ${targetQ.questionNo}.`);
  };

  const calculateTotal = (marks) => {
    let total = 0;
    Object.values(marks).forEach((mark) => {
      if (!mark.isSkipped) {
        total += mark.marksAwarded || 0;
      }
    });
    setTotalObtained(total);
  };

  const getSectionMarks = (sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return 0;

    return section.questions?.reduce((sum, q) => {
      const mark = questionMarks[q.questionId];
      return sum + (mark && !mark.isSkipped ? mark.marksAwarded || 0 : 0);
    }, 0) || 0;
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleMarkChange = (questionId, value) => {
    const question = findQuestionById(questionId);
    if (!question) return;

    let numValue = Math.max(0, Math.min(value, question.marks));
    
    // Find the section this question belongs to
    const section = sections.find(s => s.id === question.sectionId);
    if (!section) return;

    // Calculate current section total excluding this question
    const sectionOtherQuestionsTotal = section.questions?.reduce((sum, q) => {
      if (q.questionId === questionId) return sum;
      const mark = questionMarks[q.questionId];
      return sum + (mark && !mark.isSkipped ? mark.marksAwarded || 0 : 0);
    }, 0) || 0;

    if (sectionOtherQuestionsTotal + numValue > section.totalMarks) {
      numValue = Math.max(0, section.totalMarks - sectionOtherQuestionsTotal);
      setError(`Marks in ${section.name} cannot exceed section total of ${section.totalMarks}. Capped marks at ${numValue}.`);
      setTimeout(() => setError(''), 4000);
    }

    // Check optional group mutual exclusivity
    if (question.optionalGroupCode && question.optionalGroupCode.trim() && numValue > 0) {
      const grp = question.optionalGroupCode.trim().toUpperCase();
      const conflicting = section.questions?.find(sq => 
        String(sq.questionId) !== String(question.questionId) &&
        sq.optionalGroupCode &&
        sq.optionalGroupCode.trim().toUpperCase() === grp &&
        ((Number(questionMarks[sq.questionId]?.marksAwarded) > 0) || questionMarks[sq.questionId]?.isAttempted) &&
        !questionMarks[sq.questionId]?.isSkipped
      );
      if (conflicting) {
        setError(`Cannot award marks to Question ${question.questionNo}: Question ${conflicting.questionNo} in Group '${grp}' already has marks.`);
        setTimeout(() => setError(''), 4000);
        return;
      }
    }

    // Check if marking this question would exceed maxQuestionsToAttempt
    const currentMarks = questionMarks[questionId];
    const isCurrentlyAttempted = currentMarks?.isAttempted || currentMarks?.marksAwarded > 0;
    const isNewAttempt = numValue > 0 && !isCurrentlyAttempted;

    if (isNewAttempt && section.maxQuestionsToAttempt > 0) {
      // Count how many questions in this section are already attempted
      const attemptedCount = section.questions?.filter(q => {
        const marks = questionMarks[q.questionId];
        return marks?.isAttempted || marks?.marksAwarded > 0;
      }).length || 0;

      if (attemptedCount >= section.maxQuestionsToAttempt) {
        setError(`Cannot mark more than ${section.maxQuestionsToAttempt} questions in ${section.name}. Capped marks at 0.`);
        setTimeout(() => setError(''), 3000);
        numValue = 0;
      }
    }

    setQuestionMarks((prev) => {
      const updated = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          marksAwarded: numValue,
          isAttempted: value !== "" && !isNaN(value),
        },
      };
      calculateTotal(updated);
      
      // Sync marks from right panel directly back into the annotations
      if (scriptId) {
        const saved = sessionStorage.getItem(`annotations_${scriptId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const updatedAnnos = parsed.map(anno => {
              if (String(anno.questionId) === String(question.questionNo) && (anno.marks !== undefined || anno.isSkipped)) {
                return {
                  ...anno,
                  marks: numValue,
                  isSkipped: false,
                  type: numValue > 0 ? 'tick' : 'cross',
                  color: numValue > 0 ? '#00AA00' : '#FF0000'
                };
              }
              return anno;
            });
            sessionStorage.setItem(`annotations_${scriptId}`, JSON.stringify(updatedAnnos));
            
            // Trigger instant sync to redraw the canvas
            annotatorRef.current?.syncAnnotations();
          } catch (e) {
            console.error("Error syncing right panel change with annotations:", e);
          }
        }
      }

      return updated;
    });
  };

  const handleSkipQuestion = (questionId) => {
    setQuestionMarks((prev) => {
      const updated = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          isSkipped: !prev[questionId]?.isSkipped,
          marksAwarded: !prev[questionId]?.isSkipped ? 0 : prev[questionId]?.marksAwarded,
        },
      };
      calculateTotal(updated);
      return updated;
    });
  };

  const handleNextQuestion = () => {
    if (!selectedQuestion) return;
    
    // Find flat list of all questions to find the next one
    const allQuestions = sections.flatMap(s => s.questions || []);
    const currentIndex = allQuestions.findIndex(q => q.questionId === selectedQuestion);
    
    if (currentIndex !== -1 && currentIndex < allQuestions.length - 1) {
      setSelectedQuestion(allQuestions[currentIndex + 1].questionId);
    }
  };

  const buildQuestionMarksPayload = () => {
    return Object.entries(questionMarks).map(([qId, mark]) => {
      const questionId = parseInt(qId);
      const question = findQuestionById(questionId);
      const section = question ? sections.find(s => s.id === question.sectionId) : null;
      
      // Check if this section has a maximum attempt limit and we have reached it
      let limitReached = false;
      if (section && section.maxQuestionsToAttempt > 0) {
        const attemptedCount = section.questions?.filter(q => {
          const m = questionMarks[q.questionId];
          return m && (m.isAttempted || m.marksAwarded > 0);
        }).length || 0;
        
        limitReached = attemptedCount >= section.maxQuestionsToAttempt;
      }

      const isAttempted = mark.isAttempted || mark.marksAwarded > 0;
      // Auto skip if the question is unattempted AND the section's maximum attempt limit is reached
      const isSkipped = mark.isSkipped || (!isAttempted && limitReached);

      return {
        questionMasterId: questionId,
        questionId: questionId,
        scriptId: scriptId ? parseInt(scriptId) : null,
        questionNo: mark.questionNo,
        marksAwarded: mark.marksAwarded || 0,
        isSkipped: isSkipped,
        isAttempted: isAttempted,
        remarks: mark.remarks || "",
      };
    });
  };

  const showStatus = (type, msg) => {
    setSaveStatus({ type, msg });
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Auto-save draft marks (only for active examiner in editable mode)
  useEffect(() => {
    if (!loading && !isEffectiveReadOnly && !isAdmin && !isCoordinator && Object.keys(questionMarks).length > 0) {
      const timer = setTimeout(async () => {
        try {
          await markingService.saveDraftMarks(scriptId, examinerId, questionMarks);
        } catch (err) {
          console.warn("Failed to auto-save draft marks:", err);
        }
      }, 1500); // 1.5 second debounce

      return () => clearTimeout(timer);
    }
  }, [questionMarks, loading, submitted, scriptId, examinerId, isEffectiveReadOnly, isAdmin, isCoordinator]);

  const handleSaveMarks = async () => {
    if (isEffectiveReadOnly || isAdmin || isCoordinator) {
      showStatus("warning", "You are in read-only mode and cannot save marks.");
      return;
    }
    if (remainingSeconds > 0) {
      showStatus("warning", `Save is disabled. You must spend at least ${timePerCopyMinutes} minutes evaluating this copy (${formatCountdown(remainingSeconds)} remaining).`);
      return;
    }
    if (!markingId) {
      showStatus("error", "No active marking session. Cannot persist marks.");
      return;
    }
    try {
      setSaving(true);
      
      // Compile evaluated PDF copy with annotations intact and upload
      let evaluatedUrl = "";
      if (annotatorRef.current?.generateEvaluatedPdf) {
        evaluatedUrl = await annotatorRef.current.generateEvaluatedPdf(markingId);
      }

      // Persist draft total, remarks and evaluated copy path
      await markingService.updateMarking(markingId, totalObtained, remarks, evaluatedUrl);
      
      const payload = buildQuestionMarksPayload();
      await markingService.saveQuestionMarks(markingId, payload);
      showStatus("success", "Draft saved — marks & evaluated PDF stored successfully.");
    } catch (err) {
      showStatus("error", "Error saving marks: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };
 
  const handleSubmitMarking = async () => {
    if (isEffectiveReadOnly || isAdmin || isCoordinator) {
      showStatus("warning", "You are in read-only mode and cannot submit marks.");
      return;
    }
    if (remainingSeconds > 0) {
      showStatus("warning", `Submit is disabled. You must spend at least ${timePerCopyMinutes} minutes evaluating this copy (${formatCountdown(remainingSeconds)} remaining).`);
      return;
    }
    const totalPages = annotatorRef.current?.getTotalPages ? annotatorRef.current.getTotalPages() : 0;

    // Page coverage check: skip page 1 (index 0), all other pages must have at least one annotation
    if (totalPages > 1) {
      const unmarkedPages = [];
      for (let p = 1; p < totalPages; p++) { // start from index 1 = Page 2
        const hasPageMarking = annotations.some(anno => (anno.page === undefined ? 0 : anno.page) === p);
        if (!hasPageMarking) {
          unmarkedPages.push(p + 1); // display as 1-indexed page number
        }
      }
      if (unmarkedPages.length > 0) {
        showStatus(
          'error',
          `All pages (except Page 1) must have a marking before submitting! Unannotated page(s): ${unmarkedPages.map(n => `Page ${n}`).join(', ')}`
        );
        return;
      }
    }

    // Section-wise question attempt check considering MaxQuestionsToAttempt
    const pendingSectionRequirements = [];

    sections.forEach(sec => {
      const secQuestions = sec.questions || [];
      const attemptedCount = secQuestions.filter(q => {
        const m = questionMarks[q.questionId];
        return m && (m.isAttempted || (m.marksAwarded && m.marksAwarded > 0)) && !m.isSkipped;
      }).length;

      if (sec.maxQuestionsToAttempt > 0) {
        // If candidate attempted maxQuestionsToAttempt (e.g. 3 in Section C), section is satisfied!
        if (attemptedCount >= sec.maxQuestionsToAttempt) {
          return;
        }

        const unreviewedQuestions = secQuestions.filter(q => {
          const m = questionMarks[q.questionId];
          if (!m) return true;
          return !m.isAttempted && !(m.marksAwarded > 0) && !m.isSkipped;
        });

        if (unreviewedQuestions.length > 0) {
          pendingSectionRequirements.push(
            `${sec.name} (${attemptedCount}/${sec.maxQuestionsToAttempt} attempted, pending: ${unreviewedQuestions.map(q => `Q${q.questionNo}`).join(', ')})`
          );
        }
      } else {
        const unreviewedQuestions = secQuestions
          .filter(q => !q.isOptional)
          .filter(q => {
            const m = questionMarks[q.questionId];
            if (!m) return true;
            return !m.isAttempted && !(m.marksAwarded > 0) && !m.isSkipped;
          });

        if (unreviewedQuestions.length > 0) {
          pendingSectionRequirements.push(
            `${sec.name} pending: ${unreviewedQuestions.map(q => `Q${q.questionNo}`).join(', ')}`
          );
        }
      }
    });

    if (pendingSectionRequirements.length > 0) {
      showStatus(
        'error',
        `All section requirements must be completed before submitting: ${pendingSectionRequirements.join('; ')}`
      );
      return;
    }

    if (!markingId) {
      showStatus('error', 'No active marking session. Cannot submit.');
      return;
    }
 
    try {
      setSaving(true);
      
      // Compile evaluated PDF copy with annotations intact and upload
      let evaluatedUrl = '';
      if (annotatorRef.current?.generateEvaluatedPdf) {
        evaluatedUrl = await annotatorRef.current.generateEvaluatedPdf(markingId);
      }

      // Persist final marks, remarks, and evaluated copy path
      await markingService.updateMarking(markingId, totalObtained, remarks, evaluatedUrl);

      // Save question marks
      const payload = buildQuestionMarksPayload();
      await markingService.saveQuestionMarks(markingId, payload);
      
      // Submit the marking
      await markingService.submitMarking(markingId);
      setSubmitted(true);
      setMarkingStatus(MarkingStatus.SUBMITTED);
      
      // Refresh updated marking status from markings table
      try {
        const updatedMarking = await markingService.getMarking(markingId);
        if (updatedMarking?.status) {
          const status = updatedMarking.status?.toLowerCase();
          setMarkingStatus(status);
        }
      } catch (err) {
        console.error('Failed to refresh marking status after submit:', err);
      }
      
      showStatus('success', `Submitted! Total: ${totalObtained} / ${paperInfo?.maxMarks || 100}`);
    } catch (err) {
      showStatus('error', 'Submission failed: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };


  const totalQuestionsCount = Object.keys(questionMarks).length;
  const allQuestionsDefined = totalQuestionsCount > 0;

  // Calculate total pages from annotatorRef (safe fallback: if no PDF loaded, treat as 0 pages)
  const totalAnnotatorPages = annotatorRef.current?.getTotalPages ? annotatorRef.current.getTotalPages() : 0;

  // Check pages from index 1 onwards (skip page 1 = index 0) for annotation coverage
  const unmarkedPageNumbers = totalAnnotatorPages > 1
    ? Array.from({ length: totalAnnotatorPages - 1 }, (_, i) => i + 1) // indices 1, 2, 3...
        .filter(p => !annotations.some(anno => (anno.page === undefined ? 0 : anno.page) === p))
        .map(p => p + 1) // convert to 1-indexed for display (index 1 → "Page 2", etc.)
    : [];

  // All pages (except page 1) must have at least one annotation
  const allPagesAnnotated = totalAnnotatorPages <= 1 || unmarkedPageNumbers.length === 0;

  // Section-wise attempt validation considering MaxQuestionsToAttempt
  const pendingSectionRequirements = [];

  sections.forEach(sec => {
    const secQuestions = sec.questions || [];
    const attemptedCount = secQuestions.filter(q => {
      const m = questionMarks[q.questionId];
      return m && (m.isAttempted || (m.marksAwarded && m.marksAwarded > 0)) && !m.isSkipped;
    }).length;

    if (sec.maxQuestionsToAttempt > 0) {
      // If candidate attempted maxQuestionsToAttempt (e.g. 3 in Section C), section is complete!
      if (attemptedCount >= sec.maxQuestionsToAttempt) {
        return;
      }

      const unreviewedQuestions = secQuestions.filter(q => {
        const m = questionMarks[q.questionId];
        if (!m) return true;
        return !m.isAttempted && !(m.marksAwarded > 0) && !m.isSkipped;
      });

      if (unreviewedQuestions.length > 0) {
        pendingSectionRequirements.push(
          `${sec.name}: ${attemptedCount}/${sec.maxQuestionsToAttempt} attempted (${unreviewedQuestions.map(q => `Q${q.questionNo}`).join(', ')} pending)`
        );
      }
    } else {
      const unreviewedQuestions = secQuestions
        .filter(q => !q.isOptional)
        .filter(q => {
          const m = questionMarks[q.questionId];
          if (!m) return true;
          return !m.isAttempted && !(m.marksAwarded > 0) && !m.isSkipped;
        });

      if (unreviewedQuestions.length > 0) {
        pendingSectionRequirements.push(
          `${sec.name} pending: ${unreviewedQuestions.map(q => `Q${q.questionNo}`).join(', ')}`
        );
      }
    }
  });

  const allSectionsSatisfied = pendingSectionRequirements.length === 0;

  // Build tooltip reason — show the most blocking reason first
  const submitDisabledReason = isMarkingSubmitted
    ? 'This script has been submitted and is locked'
    : remainingSeconds > 0
    ? `Required evaluation time of ${timePerCopyMinutes} minutes is active. Save and Submit are locked for ${formatCountdown(remainingSeconds)}.`
    : !allSectionsSatisfied
    ? `Section requirements pending before submitting: ${pendingSectionRequirements.join('; ')}`
    : !allPagesAnnotated
    ? `All pages (except Page 1) must have at least one annotation before submitting. Unannotated page(s): ${unmarkedPageNumbers.map(n => `Page ${n}`).join(', ')}`
    : saving
    ? 'Saving in progress...'
    : isEffectiveReadOnly
    ? 'This submission is read-only'
    : '';

  const isSubmitDisabled = isMarkingSubmitted || isEffectiveReadOnly || saving || !allPagesAnnotated || !allSectionsSatisfied || remainingSeconds > 0;


  if (loading) {
    return <MarkingLoadingView />;
  }

  if (error) {
    return <MarkingErrorView error={error} onBack={() => navigate(-1)} />;
  }

  return (
    <div className="bg-gray-50 h-[100dvh] flex flex-col overflow-hidden secure-marking-container relative">
      <SecurityOverlays isBlurred={isBlurred} />

      <MarkingHeader
        paperInfo={paperInfo}
        isMarkingSubmitted={isMarkingSubmitted}
        timePerCopyMinutes={timePerCopyMinutes}
        remainingSeconds={remainingSeconds}
        totalObtained={totalObtained}
        saving={saving}
        isSubmitDisabled={isSubmitDisabled}
        submitDisabledReason={submitDisabledReason}
        onSubmitMarking={handleSubmitMarking}
        onNavigateBack={() => navigate('/scripts')}
      />

      {/* Read-Only Status Banners */}
      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-amber-900 text-xs font-semibold z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span><strong>Admin Inspection View:</strong> You have read-only access to view this script and evaluation marks. Marking updates and modifications are restricted.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">Read-Only</span>
        </div>
      )}
      {isCoordinator && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-blue-900 text-xs font-semibold z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span><strong>Coordinator View:</strong> You have read-only access to inspect this script. Only the allocated examiner may allot or update marks.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-200 text-blue-900 border border-blue-300">Read-Only</span>
        </div>
      )}
      {!isAdmin && !isCoordinator && isMarkingSubmitted && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-emerald-900 text-xs font-semibold z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span><strong>Submitted Evaluation:</strong> This script marking has been submitted and locked. Marks are displayed in read-only mode.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">Submitted</span>
        </div>
      )}

      <ProctorWarningBanner proctorWarning={proctorWarning} />

      <main className="flex-1 p-3 flex flex-row gap-3 overflow-hidden relative">
        <QuestionPaperViewer
          effectiveQpPdfUrl={effectiveQpPdfUrl}
          isQpCollapsed={isQpCollapsed}
          qpWidth={qpWidth}
          qpDragRef={qpDragRef}
          onCollapse={() => setIsQpCollapsed(true)}
          onDragStart={handleQpDragStart}
        />

        <section className="flex-1 relative bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col min-w-0 transition-all">
          <PDFAnnotator 
            ref={annotatorRef}
            onAnnotationsChange={handleAnnotationsChange}
            currentQuestionId={selectedQuestion ? findQuestionById(selectedQuestion)?.questionNo : null}
            maxMarks={selectedQuestion ? findQuestionById(selectedQuestion)?.marks : 0}
            onNextQuestion={handleNextQuestion}
            sections={sections}
            pdfUrl={pdfUrl}
            scriptId={scriptId}
            readOnly={isEffectiveReadOnly}
            showAnnotationTools={!isMarkingSubmitted}
            canAttemptQuestion={canAttemptQuestion}
            getQuestionBlockedReason={getQuestionBlockedReason}
            questionMarks={questionMarks}
            onToggleQp={() => {
              if (!effectiveQpPdfUrl) {
                message.info("Question paper PDF is not available for this paper.");
                return;
              }
              setIsQpCollapsed(!isQpCollapsed);
            }}
            isQpOpen={!isQpCollapsed && !!effectiveQpPdfUrl}
          />
        </section>

        <aside className="w-56 shrink-0 flex flex-col gap-2.5 max-h-full self-start overflow-hidden">
          <MarkingActions
            isMarkingSubmitted={isMarkingSubmitted}
            isEffectiveReadOnly={isEffectiveReadOnly}
            remainingSeconds={remainingSeconds}
            timePerCopyMinutes={timePerCopyMinutes}
            onSaveMarks={handleSaveMarks}
          />

          <QuestionPalette
            sections={sections}
            expandedSections={expandedSections}
            questionMarks={questionMarks}
            selectedQuestion={selectedQuestion}
            isEffectiveReadOnly={isEffectiveReadOnly}
            getSectionMarks={getSectionMarks}
            getConflictingGroupQuestion={getConflictingGroupQuestion}
            onToggleSection={toggleSection}
            onSelectQuestion={(q) => {
              setSelectedQuestion(q.questionId);
              if (isEffectiveReadOnly) {
                annotatorRef.current?.navigateToQuestionPage?.(q.questionNo);
              } else {
                annotatorRef.current?.openMarkModalForQuestion?.(q.questionNo);
              }
            }}
            onGroupSwitch={(modalInfo) => setGroupSwitchModal(modalInfo)}
          />

          <RemarksSection
            remarks={remarks}
            onOpenRemarksModal={() => setShowRemarksModal(true)}
          />
        </aside>
      </main>

      <RemarksModal
        isOpen={showRemarksModal}
        remarks={remarks}
        onClose={() => setShowRemarksModal(false)}
        onSave={(newRemarks) => setRemarks(newRemarks)}
      />

      {saveStatus && (
        <div className={`fixed bottom-6 right-6 px-6 py-2.5 rounded-lg shadow-lg font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
          saveStatus.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {saveStatus.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p>{saveStatus.msg}</p>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white py-2.5 rounded-lg shadow-lg font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-300 md:px-6 px-4">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <LiveCameraPip videoRef={videoRef} proctorWarning={proctorWarning} />

      <GroupSwitchModal
        modalData={groupSwitchModal}
        questionMarks={questionMarks}
        onConfirmSwitch={handleConfirmGroupSwitch}
        onClose={() => setGroupSwitchModal(null)}
      />
    </div>
  );
};

export default ExaminerMarking;


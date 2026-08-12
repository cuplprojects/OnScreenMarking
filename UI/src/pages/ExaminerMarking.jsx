import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Barcode
} from "lucide-react";
import PDFAnnotator from "../components/PDFAnnotator";
import sectionService from "../services/sectionService";
import markingService from "../services/markingService";
import userService from "../services/userService";
import { useAuth } from "../context/AuthContext";
import message from "../services/messageService";

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

const ExaminerMarking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get parameters from location state or URL params (fallback to URL params on refresh)
  const queryParams = new URLSearchParams(location.search);
  const paperId = location.state?.paperId || queryParams.get('paperId');
  const scriptId = location.state?.scriptId || queryParams.get('scriptId');
  const allocationId = location.state?.allocationId || queryParams.get('allocationId');
  const examinerId = location.state?.examinerId || queryParams.get('examinerId') || user?.id;
  const studentName = location.state?.studentName || queryParams.get('studentName');
  const rollNo = location.state?.rollNo || queryParams.get('rollNo');
  const subject = location.state?.subject || queryParams.get('subject');
  const cleanPdfUrl = location.state?.cleanPdfUrl || queryParams.get('cleanPdfUrl');
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const pdfUrl = scriptId ? `${apiBaseUrl}/Scripts/${scriptId}/pdf` : null;

  const [sections, setSections] = useState([]);
  const [paperInfo, setPaperInfo] = useState(null);
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
  const [saving, setSaving] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); 
  const [showQpModal, setShowQpModal] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const annotatorRef = useRef(null);

  // Security Print & Screenshot Prevention
  useEffect(() => {
    const handleContextMenu = (e) => {
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

    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
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

        let profileImageBase64 = localStorage.getItem("profileImage") || user?.profileImage;
        if (!profileImageBase64 && examinerId) {
          try {
            console.log(`OSM Proctoring: Profile image not found locally. Fetching details for user: ${examinerId}...`);
            const fetchedUser = await userService.getUserById(examinerId);
            if (fetchedUser && fetchedUser.profileImage) {
              profileImageBase64 = fetchedUser.profileImage;
              localStorage.setItem("profileImage", profileImageBase64);
              console.log("OSM Proctoring: Successfully fetched and cached profile image from DB.");
            } else {
              console.warn("OSM Proctoring: Fetched user does not have a profile image.");
            }
          } catch (e) {
            console.error("OSM Proctoring: Failed to fetch user profile image:", e);
          }
        }

        if (profileImageBase64) {
          console.log("OSM Proctoring: Profile image found. Extracting registered landmarks...");
          const landmarks = await extractImageLandmarks(profileImageBase64, localLandmarker);
          if (landmarks) {
            registeredLandmarksRef.current = landmarks;
            console.log("OSM Proctoring: Registered profile landmarks cached successfully!");
          } else {
            console.error("OSM Proctoring: Failed to extract landmarks from registered profile image.");
          }
        } else {
          console.error("OSM Proctoring: No registered profile image available in local storage, user context, or database!");
        }

        const runVerificationCheck = () => {
          if (!videoRef.current || !landmarkerRef.current) {
            console.log("OSM Proctoring check skipped: Video ref or landmarker not initialized.");
            return;
          }
          const video = videoRef.current;
          if (video.readyState < 2) {
            console.log("OSM Proctoring check skipped: Video is not ready yet.");
            return;
          }

          console.log("OSM Proctoring: Executing periodic face matching check...");

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

            console.log(`OSM Proctoring: Detected ${facesCount} face(s) in frame.`);

            let currentCheckWarning = "";

            if (facesCount === 0) {
              currentCheckWarning = "No Face";
            } else if (facesCount > 1) {
              currentCheckWarning = "Multiple Faces";
            } else {
              const currentLandmarks = results.faceLandmarks[0];
              if (registeredLandmarksRef.current) {
                const distance = compareFaces(registeredLandmarksRef.current, currentLandmarks);
                console.log(`OSM Proctoring: Face match distance: ${distance.toFixed(4)} (Threshold: 0.15)`);
                
                if (distance > 0.15) {
                  currentCheckWarning = "Mismatch";
                }
              } else {
                console.warn("OSM Proctoring: Registered landmarks missing, defaulting to presence check.");
              }
            }

            if (currentCheckWarning !== "") {
              consecutiveMismatchesRef.current = (consecutiveMismatchesRef.current || 0) + 1;
              console.warn(`OSM Proctoring: Check failed (${currentCheckWarning}). Consecutive failures: ${consecutiveMismatchesRef.current}/3`);
              
              if (consecutiveMismatchesRef.current >= 3) {
                setProctorWarning((prevWarning) => {
                  if (prevWarning !== currentCheckWarning) {
                    return currentCheckWarning;
                  }
                  return prevWarning;
                });
              }
            } else {
              if (consecutiveMismatchesRef.current > 0) {
                console.log("OSM Proctoring: Verification succeeded, resetting failure counter.");
              }
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
  useEffect(() => {
    if (!paperId) {
      setError('No paper selected. Please select a script from the Scripts page.');
      setLoading(false);
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
            if (marksToLoad[sm.questionId]) {
              marksToLoad[sm.questionId] = {
                ...marksToLoad[sm.questionId],
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
          if (updated[qId]) {
             updated[qId] = { ...updated[qId], ...marksToLoad[qId] };
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
      if (!allocationId || !examinerId) {
        setError('Missing allocation or examiner information');
        return;
      }

      // Create a new marking session (or retrieve existing)
      const markingResponse = await markingService.createMarking(
        allocationId,
        examinerId,
        0, // Initial total marks
        remarks
      );

      if (markingResponse && markingResponse.id) {
        setMarkingId(markingResponse.id);
        if (markingResponse.remarks) {
          setRemarks(markingResponse.remarks);
        }
        if (markingResponse.status === "submitted") {
          setSubmitted(true);
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
      // Use dynamic paperId instead of hardcoded 2
      const data = await sectionService.getAllSections(paperId);
      
      if (data && data.length > 0) {
        setSections(data);
        // Extract paper info from the first section's paper object
        if (data[0].paper) {
          setPaperInfo(data[0].paper);
        }

        const expanded = {};
        const marks = {};
        const attemptCounts = {};
        
        data.forEach((section, index) => {
          expanded[section.id] = index === 0; // Only expand the first section by default
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
    for (const section of sections) {
      const q = section.questions?.find((q) => q.questionId === qId);
      if (q) return q;
    }
    return null;
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
    setExpandedSections((prev) => {
      const isCurrentlyExpanded = prev[sectionId];
      const nextExpanded = {};
      if (!isCurrentlyExpanded) {
        nextExpanded[sectionId] = true;
      }
      return nextExpanded;
    });
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
        const saved = localStorage.getItem(`annotations_${scriptId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const updatedAnnos = parsed.map(anno => {
              if (anno.questionId === question.questionNo) {
                return {
                  ...anno,
                  marks: numValue,
                  type: numValue > 0 ? 'tick' : 'cross',
                  color: numValue > 0 ? '#00AA00' : '#FF0000'
                };
              }
              return anno;
            });
            localStorage.setItem(`annotations_${scriptId}`, JSON.stringify(updatedAnnos));
            
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
        questionId: questionId,
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

  // Auto-save draft marks
  useEffect(() => {
    if (!loading && !submitted && Object.keys(questionMarks).length > 0) {
      const timer = setTimeout(async () => {
        try {
          await markingService.saveDraftMarks(scriptId, examinerId, questionMarks);
        } catch (err) {
          console.warn("Failed to auto-save draft marks:", err);
        }
      }, 1500); // 1.5 second debounce

      return () => clearTimeout(timer);
    }
  }, [questionMarks, loading, submitted, scriptId, examinerId]);

  const handleSaveMarks = async () => {
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
    if (totalObtained === 0) {
      showStatus("error", "Cannot submit with zero total marks. Please annotate/mark questions.");
      return;
    }
    if (!markingId) {
      showStatus("error", "No active marking session. Cannot submit.");
      return;
    }
 
    try {
      setSaving(true);
      
      // Compile evaluated PDF copy with annotations intact and upload
      let evaluatedUrl = "";
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
      showStatus("success", `Submitted! Total: ${totalObtained} / ${paperInfo?.maxMarks || 100}`);
    } catch (err) {
      showStatus("error", "Submission failed: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const totalQuestionsCount = Object.keys(questionMarks).length;
  const allQuestionsDefined = totalQuestionsCount > 0;

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-bold animate-pulse">Initializing Marking Interface...</p>
      </div>
    );
  }

  if (error && !sections.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-gray-600 font-bold text-center mb-6">{error}</p>
        <button
          onClick={() => navigate('/scripts')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Scripts
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-hidden secure-marking-container relative">
      {/* SECURITY BLUR OVERLAY */}
      {isBlurred && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-center p-6 select-none pointer-events-auto">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 mb-6 shadow-lg animate-pulse">
            <AlertCircle size={44} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Screen Capture Protection Active</h2>
          <p className="text-slate-450 text-sm max-w-md font-semibold leading-relaxed">
            Screenshots and window switching are strictly restricted. Please refocus your browser window to resume marking.
          </p>
        </div>
      )}

      {/* SCREENSHOT KEY OPAQUE OVERLAY */}
      <div 
        id="secure-screenshot-mask" 
        className="fixed inset-0 bg-slate-950 z-[99999] hidden flex-col items-center justify-center text-center p-6 select-none pointer-events-auto"
      >
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 mb-6 shadow-lg animate-pulse">
          <AlertCircle size={44} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Screen Capture Prohibited</h2>
        <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed">
          The PrintScreen key is disabled. Screen captures are strictly prohibited on this secure marking page.
        </p>
      </div>

      {/* HEADER */}
      <header className="bg-white text-gray-900 shadow-md px-6 py-4 flex justify-between items-center z-50 border-b border-gray-200">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/scripts')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Scripts"
          >
            <ChevronLeft className="text-gray-600" size={24} />
          </button>
          
          <div className="border-r border-gray-300 pr-6">
            <h1 className="text-2xl font-bold text-gray-900">
              OSM <span className="text-blue-600">Marking</span>
            </h1>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Answer Sheet Evaluation</p>
          </div>

          <div className="hidden md:block bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Paper</p>
            <p className="font-semibold text-sm text-gray-900">
              {paperInfo?.paperName || "Paper"} <span className="text-gray-400">({paperInfo?.paperCode || ""})</span>
            </p>
          </div>

          <div className="hidden md:block bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Max Marks</p>
            <p className="font-bold text-lg text-gray-900">{paperInfo?.maxMarks || "100"}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-blue-50 px-6 py-3 rounded-lg border border-blue-200 flex flex-col items-center">
            <p className="text-xs uppercase font-semibold text-blue-600 mb-1">Total Score</p>
            <p className="text-3xl font-bold text-blue-900">
              {totalObtained.toFixed(1)} <span className="text-sm font-normal text-blue-600">/ {paperInfo?.maxMarks || 100}</span>
            </p>
          </div>
          
          <button
            onClick={handleSubmitMarking}
            disabled={submitted || saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold uppercase text-sm transition-colors shadow-md cursor-pointer disabled:cursor-not-allowed"
            title="Submit evaluation"
          >
            {saving ? "Saving..." : "Submit"}
          </button>
        </div>
      </header>

      {/* PROCTOR WARNING BANNER */}
      {proctorWarning && (
        <div className="bg-red-600 text-white text-xs font-bold py-2.5 px-6 flex items-center justify-between border-b border-red-700 animate-pulse select-none z-50 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>
              <strong>PROCTOR ALERT:</strong> {
                proctorWarning === "No Face"
                  ? "No face detected in the live camera feed. Please ensure your face is fully visible and looking at the screen."
                  : proctorWarning === "Multiple Faces"
                  ? "Multiple people detected in frame. Proctoring rules permit only the assigned examiner to mark papers."
                  : "Identity verification mismatch. The person in front of the camera does not match the registered profile picture."
              }
            </span>
          </div>
          <span className="text-[10px] bg-red-700/80 px-2 py-0.5 rounded border border-red-500/20 uppercase font-extrabold tracking-wider">Action Required</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">
        {/* LEFT: ANNOTATOR AREA */}
        <section className="col-span-9 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">          <PDFAnnotator 
            ref={annotatorRef}
            onAnnotationsChange={handleAnnotationsChange}
            currentQuestionId={selectedQuestion ? findQuestionById(selectedQuestion)?.questionNo : null}
            maxMarks={selectedQuestion ? findQuestionById(selectedQuestion)?.marks : 0}
            onNextQuestion={handleNextQuestion}
            sections={sections}
            pdfUrl={pdfUrl}
            scriptId={scriptId}
            readOnly={submitted}
          />
        </section>
 
        {/* RIGHT: MARKING PANEL */}
        <aside className="col-span-3 flex flex-col gap-4 overflow-hidden">
          {/* CONTROL CENTER */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleSaveMarks}
                disabled={submitted}
                className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:bg-gray-100 disabled:text-gray-400 font-semibold py-2 rounded-lg shadow-sm transition-colors text-xs uppercase disabled:cursor-not-allowed"
              >
                <Save size={16} /> Save
              </button>
              <button 
                onClick={() => {if(window.confirm("Reset all marks?")) window.location.reload();}}
                disabled={submitted}
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 font-semibold py-2 rounded-lg shadow-sm transition-colors text-xs uppercase disabled:cursor-not-allowed"
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
            {paperInfo?.questionPaperPdfUrl && (
              <button 
                onClick={() => setShowQpModal(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all text-xs uppercase cursor-pointer"
              >
                <FileText size={16} /> View Question Paper
              </button>
            )}
          </div>

          {/* QUESTION PALETTE */}
          <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col overflow-hidden shadow-md">
            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-400" />
                <h3 className="font-semibold text-xs uppercase tracking-wide">Questions</h3>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium uppercase">Active</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-3">
              {sections.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
                  <AlertCircle size={40} className="mb-2 opacity-30" />
                  <p className="text-xs font-medium uppercase">No sections loaded</p>
                </div>
              )}

              {sections.map((sec) => {
                const attemptedCount = sec.questions?.filter(q => {
                  const marks = questionMarks[q.questionId];
                  return marks?.isAttempted || marks?.marksAwarded > 0;
                }).length || 0;

                return (
                <div key={sec.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div 
                    onClick={() => toggleSection(sec.id)}
                    className="flex justify-between items-center bg-gray-100 p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-gray-900 uppercase">{sec.name}</span>
                      {sec.maxQuestionsToAttempt > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Max Questions: {attemptedCount}/{sec.maxQuestionsToAttempt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        {getSectionMarks(sec.id)} / {sec.totalMarks}
                      </span>
                      {expandedSections[sec.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {expandedSections[sec.id] && (
                    <div className="p-2 grid grid-cols-1 gap-2">
                      {sec.questions?.map((q) => {
                        const m = questionMarks[q.questionId] || {};
                        const isSelected = selectedQuestion === q.questionId;
                        const isMarked = m.marksAwarded > 0 || m.isAttempted;
                        
                        return (
                          <div 
                            key={q.questionId}
                            onClick={() => setSelectedQuestion(q.questionId)}
                            className={`group flex items-center justify-between p-2 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-100" 
                                : "bg-white border-gray-200 hover:border-blue-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                                isMarked 
                                  ? "bg-green-100 text-green-700 border border-green-300" 
                                  : isSelected ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                              }`}>
                                {q.questionNo}
                              </div>
                              <div className="leading-tight">
                                <p className={`text-xs font-semibold mb-0.5 ${isSelected ? "text-blue-900" : "text-gray-500"}`}>
                                  Max: {q.marks}
                                </p>
                                {m.isSkipped && (
                                  <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded font-semibold">Skipped</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.5"
                                value={m.marksAwarded || ""}
                                onChange={(e) => handleMarkChange(q.questionId, parseFloat(e.target.value) || 0)}
                                disabled={submitted}
                                className={`w-16 text-center font-semibold rounded-lg border-2 py-1 text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isSelected 
                                    ? "bg-white text-blue-900 border-blue-400 focus:ring-2 ring-blue-300" 
                                    : "bg-gray-50 text-gray-900 border-gray-300 focus:border-blue-400"
                                } ${isMarked && !isSelected ? "border-green-300 bg-green-50" : ""}`}
                                placeholder="0"
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSkipQuestion(q.questionId); }}
                                disabled={submitted}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                  m.isSkipped 
                                    ? "bg-red-100 text-red-600" 
                                    : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                }`}
                                title="Skip question"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* REMARKS */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-md">
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <Type size={16} className="text-blue-600" />
              <h3 className="font-semibold text-xs uppercase tracking-wide">Remarks</h3>
            </div>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter examiner feedback..."
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              rows="3"
            />
          </div>
        </aside>
      </main>

      {/* STATUS TOAST */}
      {saveStatus && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
          saveStatus.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {saveStatus.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p>{saveStatus.msg}</p>
        </div>
      )}

      {/* ERROR FEEDBACK */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}
      {/* LIVE CAMERA CAPTURE PIP */}
      <div className={`fixed bottom-6 left-6 z-40 bg-gray-900 border-2 ${proctorWarning ? 'border-red-600 animate-pulse scale-105 shadow-red-500/40' : 'border-blue-500 shadow-blue-500/10'} rounded-2xl overflow-hidden shadow-2xl w-44 h-32 flex flex-col group hover:scale-105 transition-all`}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover bg-gray-800"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className={`absolute top-2 left-2 ${proctorWarning ? 'bg-red-600/90' : 'bg-blue-600/90'} text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm`}>
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
          {proctorWarning ? "PROCTOR ALERT" : "PROCTOR ACTIVE"}
        </div>
        
        {/* Semi-transparent Backdrop Warning on PIP Window */}
        {proctorWarning && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center select-none animate-fade-in z-20">
            <span className="text-lg">⚠️</span>
            <h4 className="font-extrabold text-red-200 text-[10px] leading-tight mt-1 uppercase tracking-wider">
              {proctorWarning === "No Face" 
                ? "No Face" 
                : proctorWarning === "Multiple Faces"
                ? "Multiple People!"
                : "Mismatch!"}
            </h4>
            <p className="text-[8px] text-red-300 mt-0.5 leading-tight">
              {proctorWarning === "No Face"
                ? "Please look at camera feed."
                : proctorWarning === "Multiple Faces"
                ? "Only one person permitted."
                : "Identity does not match."}
            </p>
          </div>
        )}
      </div>

      {/* QUESTION PAPER MODAL */}
      {showQpModal && paperInfo?.questionPaperPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Question Paper: {paperInfo.paperName} ({paperInfo.paperCode})
                </h3>
              </div>
              <button 
                onClick={() => setShowQpModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe 
                src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${paperInfo.questionPaperPdfUrl}`}
                className="w-full h-full border-0"
                title="Question Paper"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExaminerMarking;
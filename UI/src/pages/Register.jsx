import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  X,
  CheckCircle,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Building,
  BookOpen,
  AlertCircle,
  Loader,
} from "lucide-react";
import authService from "../services/authService";
import universityService from "../services/universityService";
import subjectService from "../services/subjectService";
import message from '../services/messageService';

// Helper to calculate average brightness of canvas image data (0-255)
const calculateBrightness = (canvas) => {
  if (!canvas) return 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 120;
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let colorSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
      colorSum += avg;
    }
    return colorSum / (canvas.width * canvas.height);
  } catch (e) {
    return 120;
  }
};

// Helper to calculate sharpness (0-15+) using horizontal/vertical difference
const calculateSharpness = (canvas) => {
  if (!canvas) return 10;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 10;
  try {
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalGradient = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const i = (y * width + x) * 4;
        const currentGray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        const iRight = (y * width + (x + 1)) * 4;
        const rightGray = 0.299 * data[iRight] + 0.587 * data[iRight + 1] + 0.114 * data[iRight + 2];
        
        const iBottom = (((y + 1) * width) + x) * 4;
        const bottomGray = 0.299 * data[iBottom] + 0.587 * data[iBottom + 1] + 0.114 * data[iBottom + 2];

        const dx = rightGray - currentGray;
        const dy = bottomGray - currentGray;

        totalGradient += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }
    return count > 0 ? (totalGradient / count) : 10;
  } catch (e) {
    return 10;
  }
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [registered, setRegistered] = useState(false);

  const [universities, setUniversities] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    userType: "examiner", // Always examiner
    universityId: "",
    fname: "",
    empId: "",
    aadharNo: "",
    panNo: "",
    collegeId: "",
    subjectId1: "",
    subjectId2: "",
    subjectId3: "",
    experience: "",
    phone: "",
    address: "",
    profileImage: "",
  });

  const [videoStream, setVideoStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const landmarkerRef = useRef(null);
  const detectorRef = useRef(null);
  const activeLoopRef = useRef(false);
  const eyesClosedRef = useRef(false);
  const blinkCountRef = useRef(0);
  const hasMultipleFacesRef = useRef(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [isLandmarkerLoaded, setIsLandmarkerLoaded] = useState(false);
  const [lastActionText, setLastActionText] = useState("Align Face");
  const [hasMultipleFaces, setHasMultipleFaces] = useState(false);

  const [faceValidation, setFaceValidation] = useState({
    hasFace: false,
    isCentered: false,
    isProperDistance: false,
    isFacingForward: false,
    isGoodLighting: false,
    isSharp: false,
  });

  const offscreenCanvasRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastPixelValidationRef = useRef({ isGoodLighting: false, isSharp: false });
  const stableFramesRef = useRef(0);

  // Load universities on mount
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const data = await universityService.getAllUniversities();
        setUniversities(data);
      } catch (err) {
        console.error("Failed to fetch universities:", err);
        message.error(
          "Failed to fetch university details. Please check if the API is running.",
        );
      }
    };
    fetchUniversities();
  }, []);

  // Load subjects when university changes
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!formData.universityId) {
        setSubjects([]);
        return;
      }
      try {
        const data = await subjectService.getSubjectByUniversity(
          formData.universityId,
        );
        setSubjects(data);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      }
    };
    fetchSubjects();
  }, [formData.universityId]);

  const stopCamera = () => {
    activeLoopRef.current = false;
    blinkCountRef.current = 0;
    setBlinkCount(0);
    eyesClosedRef.current = false;
    setLastActionText("Align Face");
    hasMultipleFacesRef.current = false;
    setHasMultipleFaces(false);
    stableFramesRef.current = 0;
    setFaceValidation({
      hasFace: false,
      isCentered: false,
      isProperDistance: false,
      isFacingForward: false,
      isGoodLighting: false,
      isSharp: false,
    });

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
      setShowCamera(false);
    }
  };

  const capturePhoto = (force = false) => {
    if (!force) {
      // If landmark/quality validation has loaded and has errors, do not allow manual capture
      const allChecksPassed = faceValidation.isCentered && 
                              faceValidation.isProperDistance && 
                              faceValidation.isFacingForward && 
                              faceValidation.isGoodLighting && 
                              faceValidation.isSharp;
                              
      if (isLandmarkerLoaded && !allChecksPassed && !hasMultipleFacesRef.current) {
        let errorMsg = "Cannot capture photo: ";
        if (!faceValidation.hasFace) errorMsg += "No face detected.";
        else if (!faceValidation.isCentered) errorMsg += "Face is not centered.";
        else if (!faceValidation.isProperDistance) errorMsg += "Distance is not proper.";
        else if (!faceValidation.isFacingForward) errorMsg += "Please look straight and hold level.";
        else if (!faceValidation.isGoodLighting) errorMsg += "Poor lighting conditions.";
        else if (!faceValidation.isSharp) errorMsg += "Image is blurry. Hold still.";
        
        message.error(errorMsg);
        return;
      }
    }

    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      // Mirror the image drawn on the canvas so it matches the mirrored preview
      context.translate(canvasRef.current.width, 0);
      context.scale(-1, 1);
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      // Reset transformation matrix
      context.setTransform(1, 0, 0, 1, 0, 0);

      const imageData = canvasRef.current.toDataURL("image/jpeg");
      setFormData(prev => ({ ...prev, profileImage: imageData }));
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      
      setBlinkCount(0);
      blinkCountRef.current = 0;
      eyesClosedRef.current = false;
      setLastActionText("Align Face");
      hasMultipleFacesRef.current = false;
      setHasMultipleFaces(false);
      stableFramesRef.current = 0;
      setFaceValidation({
        hasFace: false,
        isCentered: false,
        isProperDistance: false,
        isFacingForward: false,
        isGoodLighting: false,
        isSharp: false,
      });

      // Initialize offscreen canvas for fast pixel data checks
      if (!offscreenCanvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 120;
        offscreenCanvasRef.current = canvas;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoStream(stream);
      setShowCamera(true);

      if (!landmarkerRef.current || !detectorRef.current) {
        setIsLandmarkerLoaded(false);
        try {
          const { FaceLandmarker, ObjectDetector, FilesetResolver } = await import(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8"
          );
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
          );

          if (!landmarkerRef.current) {
            const landmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              outputFaceBlendshapes: true,
              numFaces: 2 // Detect up to 2 faces for safety warning
            });
            landmarkerRef.current = landmarker;
          }

          if (!detectorRef.current) {
            const detector = await ObjectDetector.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              scoreThreshold: 0.3
            });
            detectorRef.current = detector;
          }

          setIsLandmarkerLoaded(true);
        } catch (mErr) {
          console.error("Failed to load MediaPipe tasks, auto-capture disabled:", mErr);
          setIsLandmarkerLoaded(false);
        }
      } else {
        setIsLandmarkerLoaded(true);
      }
    } catch (err) {
      setError(
        "Unable to access camera. Please allow camera permissions or upload an image.",
      );
    }
  };

  const detectLoop = async () => {
    if (!activeLoopRef.current || !landmarkerRef.current || !videoRef.current) return;

    try {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        const facesCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

        let peopleCount = 0;
        if (detectorRef.current) {
          const detectResults = detectorRef.current.detectForVideo(video, performance.now());
          if (detectResults.detections) {
            peopleCount = detectResults.detections.filter((d) =>
              d.categories.some((c) => c.categoryName === "person" && c.score > 0.4)
            ).length;
          }
        }

        if (facesCount > 1 || peopleCount > 1) {
          if (!hasMultipleFacesRef.current) {
            hasMultipleFacesRef.current = true;
            setHasMultipleFaces(true);
          }
          setLastActionText(facesCount > 1 ? "Multiple Faces!" : "Multiple People!");
          eyesClosedRef.current = false;
          setFaceValidation({
            hasFace: true,
            isCentered: false,
            isProperDistance: false,
            isFacingForward: false,
            isGoodLighting: false,
            isSharp: false,
          });
        } else if (facesCount === 0) {
          if (hasMultipleFacesRef.current) {
            hasMultipleFacesRef.current = false;
            setHasMultipleFaces(false);
          }
          setLastActionText("No Face Detected");
          eyesClosedRef.current = false;
          setFaceValidation({
            hasFace: false,
            isCentered: false,
            isProperDistance: false,
            isFacingForward: false,
            isGoodLighting: false,
            isSharp: false,
          });
        } else {
          if (hasMultipleFacesRef.current) {
            hasMultipleFacesRef.current = false;
            setHasMultipleFaces(false);
          }

          const landmarks = results.faceLandmarks[0];

          // 1. Calculate Face Bounding Box
          let minX = 1, maxX = 0, minY = 1, maxY = 0;
          for (const lm of landmarks) {
            if (lm.x < minX) minX = lm.x;
            if (lm.x > maxX) maxX = lm.x;
            if (lm.y < minY) minY = lm.y;
            if (lm.y > maxY) maxY = lm.y;
          }

          // 2. Centering Check (face center within middle boundaries)
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const isCentered = Math.abs(centerX - 0.5) < 0.15 && Math.abs(centerY - 0.5) < 0.20;

          // 3. Distance Check (width of face is 22% to 60% of frame)
          const faceWidth = maxX - minX;
          const isProperDistance = faceWidth >= 0.22 && faceWidth <= 0.60;

          // 4. Facing Forward (yaw, pitch, roll) Checks
          const nose = landmarks[4];
          const yawRatio = (nose.x - minX) / (maxX - minX);
          const pitchRatio = (nose.y - minY) / (maxY - minY);
          const isYawFacing = yawRatio >= 0.38 && yawRatio <= 0.62;
          const isPitchFacing = pitchRatio >= 0.40 && pitchRatio <= 0.65;

          const eyeLeft = landmarks[33];
          const eyeRight = landmarks[263];
          const rollAngle = Math.atan2(eyeRight.y - eyeLeft.y, eyeRight.x - eyeLeft.x) * (180 / Math.PI);
          const isRollFacing = Math.abs(rollAngle) <= 15;

          const isFacingForward = isYawFacing && isPitchFacing && isRollFacing;

          // 5. Throttled lighting and sharpness checks to protect performance
          frameCountRef.current += 1;
          let isGoodLighting = lastPixelValidationRef.current.isGoodLighting;
          let isSharp = lastPixelValidationRef.current.isSharp;

          if (frameCountRef.current % 10 === 0 && offscreenCanvasRef.current) {
            const canvas = offscreenCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              const brightness = calculateBrightness(canvas);
              const sharpness = calculateSharpness(canvas);

              isGoodLighting = brightness >= 60 && brightness <= 220;
              isSharp = sharpness >= 4.5;

              lastPixelValidationRef.current = { isGoodLighting, isSharp };
            }
          }

          setFaceValidation({
            hasFace: true,
            isCentered,
            isProperDistance,
            isFacingForward,
            isGoodLighting,
            isSharp,
          });

          const allChecksPassed = isCentered && isProperDistance && isFacingForward && isGoodLighting && isSharp;

          // Blink tracking logic for liveness-based hands-free auto-capture
          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const blendshapes = results.faceBlendshapes[0].categories;
            const eyeBlinkLeft = blendshapes.find((b) => b.categoryName === "eyeBlinkLeft")?.score || 0;
            const eyeBlinkRight = blendshapes.find((b) => b.categoryName === "eyeBlinkRight")?.score || 0;

            if (eyeBlinkLeft > 0.45 && eyeBlinkRight > 0.45) {
              if (!eyesClosedRef.current) {
                eyesClosedRef.current = true;
                setLastActionText("Blink!");
              }
            } else if (eyeBlinkLeft < 0.20 && eyeBlinkRight < 0.20) {
              if (eyesClosedRef.current) {
                eyesClosedRef.current = false;
                
                if (allChecksPassed) {
                  blinkCountRef.current += 1;
                  setBlinkCount(blinkCountRef.current);
                  setLastActionText(`Blink ${blinkCountRef.current} detected!`);

                  if (blinkCountRef.current >= 2) {
                    setLastActionText("Capturing...");
                    activeLoopRef.current = false;
                    // 250ms delay ensures their eyes are open when the camera snaps the photo!
                    setTimeout(() => {
                      capturePhoto(true);
                    }, 250);
                    return;
                  }
                } else {
                  if (!isCentered) setLastActionText("Please center your face");
                  else if (!isProperDistance) setLastActionText(faceWidth < 0.22 ? "Please move closer" : "Please move back");
                  else if (!isFacingForward) setLastActionText("Please look straight at camera");
                  else if (!isGoodLighting) setLastActionText("Improve lighting to capture");
                  else if (!isSharp) setLastActionText("Hold still (image blurry)");
                }
              }
            }
          }

          if (!eyesClosedRef.current && blinkCountRef.current < 2) {
            if (!isCentered) {
              setLastActionText("Center Face");
            } else if (!isProperDistance) {
              setLastActionText(faceWidth < 0.22 ? "Move Closer" : "Move Back");
            } else if (!isFacingForward) {
              setLastActionText(Math.abs(rollAngle) > 15 ? "Keep Head Straight" : "Look Straight");
            } else if (!isGoodLighting) {
              setLastActionText("Check Lighting");
            } else if (!isSharp) {
              setLastActionText("Hold Still");
            } else {
              setLastActionText(`Blink twice to capture (${blinkCountRef.current}/2)`);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in face landmark detection loop:", err);
    }

    if (activeLoopRef.current) {
      requestAnimationFrame(detectLoop);
    }
  };

  // Bind video stream and start detection loop when camera is active and video element is mounted
  useEffect(() => {
    if (showCamera && videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      if (isLandmarkerLoaded && landmarkerRef.current) {
        activeLoopRef.current = true;
        requestAnimationFrame(detectLoop);
      }
    }
    return () => {
      activeLoopRef.current = false;
    };
  }, [showCamera, videoStream, isLandmarkerLoaded]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.universityId
    ) {
      setError("Please fill in all required fields marked with *");
      return;
    }

    // Email regex validation
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Phone regex validation
    const phoneRegex = /^[0-9]{10}$/;

    // Strong password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (formData.phone && !phoneRegex.test(formData.phone)) {
      setError("Phone number must contain exactly 10 numeric digits.");
      return;
    }

    if (!passwordRegex.test(formData.password)) {
      setError(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
      );
      return;
    }
    if (!formData.profileImage) {
      setError("Please capture or upload a profile picture.");
      return;
    }

    if (!formData.subjectId1) {
      setError("Primary Subject Area is required.");
      return;
    }

    if (formData.aadharNo && !/^[0-9]{12}$/.test(formData.aadharNo)) {
      setError("Aadhar number must contain exactly 12 numeric digits.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        userType: "examiner",
        universityId: parseInt(formData.universityId, 10),
        fname: formData.fname || formData.name,
        empId: formData.empId ? parseInt(formData.empId, 10) : null,
        aadharNo: formData.aadharNo || "",
        panNo: formData.panNo || "",
        collegeId: formData.collegeId ? parseInt(formData.collegeId, 10) : null,
        subjectId1: parseInt(formData.subjectId1, 10),
        subjectId2: formData.subjectId2 ? parseInt(formData.subjectId2, 10) : null,
        subjectId3: formData.subjectId3 ? parseInt(formData.subjectId3, 10) : null,
        experience: formData.experience || "",
        phone: formData.phone,
        address: formData.address,
        profileImage: formData.profileImage,
      };

      await authService.register(payload);
      setRegistered(true);
    } catch (err) {
      setError(
        err.message ||
          "Registration failed. The email might already be registered.",
      );
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500 shadow-md">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration Successful
          </h1>
          <p className="text-gray-700 text-lg font-medium mb-4">
            Awaiting Approval
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-8 text-left text-sm text-blue-800 leading-relaxed">
            <p className="font-semibold mb-2">Next Steps:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Your registration has been forwarded to the University
                Coordinator.
              </li>
              <li>
                Once the coordinator approves your account, you will receive
                activation status.
              </li>
              <li>You can then log in using your email and password.</li>
            </ul>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BookOpen className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Examiner Self Registration
          </h1>
          <p className="text-gray-600 mt-2">
            Join as an On-Screen Marking Examiner
          </p>
        </div>

        

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* University Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              University *
            </label>
            <div className="relative">
              <Building
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <select
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all appearance-none"
                value={formData.universityId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    universityId: e.target.value,
                    subjectId1: "",
                    subjectId2: "",
                    subjectId3: "",
                  })
                }
                disabled={loading}
              >
                <option value="">Select University</option>
                {universities.map((uni) => (
                  <option key={uni.universityId} value={uni.universityId}>
                    {uni.universityName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employee ID
              </label>
              <div className="relative">
                <Building
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="number"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="12345"
                  value={formData.empId}
                  onChange={(e) =>
                    setFormData({ ...formData, empId: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {/* College ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                College ID
              </label>
              <div className="relative">
                <Building
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="number"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="67890"
                  value={formData.collegeId}
                  onChange={(e) =>
                    setFormData({ ...formData, collegeId: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Aadhar Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Aadhar Number (12 Digits)
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  maxLength={12}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="123456789012"
                  value={formData.aadharNo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, aadharNo: val });
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* PAN Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PAN Number
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all uppercase"
                  placeholder="ABCDE1234F"
                  value={formData.panNo}
                  onChange={(e) =>
                    setFormData({ ...formData, panNo: e.target.value.toUpperCase() })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Experience */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Evaluation Experience (Years)
              </label>
              <div className="relative">
                <BookOpen
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="e.g. 5 Years"
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData({ ...formData, experience: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {/* Primary Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Primary Subject Area *
              </label>
              <div className="relative">
                <BookOpen
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all appearance-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={formData.subjectId1}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectId1: e.target.value })
                  }
                  disabled={loading || !formData.universityId}
                >
                  <option value="">Select Primary Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.subjectId} value={sub.subjectId}>
                      {sub.subName} ({sub.subCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Secondary Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Secondary Subject Area (Optional)
              </label>
              <div className="relative">
                <BookOpen
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all appearance-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={formData.subjectId2}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectId2: e.target.value })
                  }
                  disabled={loading || !formData.universityId}
                >
                  <option value="">Select Secondary Subject</option>
                  {subjects
                    .filter((sub) => sub.subjectId.toString() !== formData.subjectId1)
                    .map((sub) => (
                      <option key={sub.subjectId} value={sub.subjectId}>
                        {sub.subName} ({sub.subCode})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Tertiary Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tertiary Subject Area (Optional)
              </label>
              <div className="relative">
                <BookOpen
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all appearance-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={formData.subjectId3}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectId3: e.target.value })
                  }
                  disabled={loading || !formData.universityId}
                >
                  <option value="">Select Tertiary Subject</option>
                  {subjects
                    .filter(
                      (sub) =>
                        sub.subjectId.toString() !== formData.subjectId1 &&
                        sub.subjectId.toString() !== formData.subjectId2
                    )
                    .map((sub) => (
                      <option key={sub.subjectId} value={sub.subjectId}>
                        {sub.subName} ({sub.subCode})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="Prof. John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="john.doe@university.edu"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Create Password *
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="tel"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, phone: value });
                  }}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <textarea
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                placeholder="Department of CS, Building 3, CBC Campus"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          {/* Profile Picture Camera Module */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <label className="block text-gray-800 font-bold mb-3">
              Profile Verification Photo *
            </label>

            {showCamera ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Camera view screen */}
                  <div className="md:col-span-3 relative rounded-xl overflow-hidden bg-black shadow-inner border border-gray-300 flex items-center justify-center" style={{ minHeight: '260px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ minHeight: '260px', transform: 'scaleX(-1)' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480" />
                    
                    {/* Smart Auto-Capture Status Overlay */}
                    <div className="absolute top-3 left-3 right-3 bg-slate-900/90  text-white py-2 px-3 rounded-lg flex items-center justify-between text-xs border border-white/10 shadow-lg select-none z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isLandmarkerLoaded 
                            ? (hasMultipleFaces 
                                ? 'bg-red-500 animate-pulse' 
                                : (faceValidation.isCentered && faceValidation.isProperDistance && faceValidation.isFacingForward && faceValidation.isGoodLighting && faceValidation.isSharp 
                                   ? 'bg-green-500 animate-pulse' 
                                   : 'bg-yellow-500 animate-pulse')) 
                            : 'bg-amber-500 animate-pulse'
                        }`} />
                        <span className="font-semibold text-gray-100">
                          {isLandmarkerLoaded 
                            ? (hasMultipleFaces ? 'Multiple people detected!' : `Blink twice to auto-capture (${blinkCount}/2)`) 
                            : 'Loading smart auto-capture...'}
                        </span>
                      </div>
                      {isLandmarkerLoaded && (
                        <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${
                          hasMultipleFaces 
                            ? "bg-red-500/20 text-red-300 border-red-500/30"
                            : lastActionText === "Blink!" 
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-ping" 
                            : lastActionText.startsWith("Blink") 
                            ? "bg-green-500/20 text-green-300 border-green-500/30" 
                            : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        }`}>
                          {hasMultipleFaces ? "Warning" : lastActionText}
                        </span>
                      )}
                    </div>

                    {/* Multi-Face Block Overlay */}
                    {hasMultipleFaces && (
                      <div className="absolute inset-0 bg-red-950/85  flex flex-col items-center justify-center p-4 text-center select-none animate-fade-in z-20">
                        <span className="text-3xl mb-2">⚠️</span>
                        <h4 className="font-extrabold text-red-200 text-sm">Multiple People Detected!</h4>
                        <p className="text-xs text-red-300 mt-1 max-w-[200px]">
                          Please ensure only one person is in the camera frame to proceed.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quality Checklist Panel */}
                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        Quality Checklist
                      </h5>
                      
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                          <span className="text-gray-600">Face Detected</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            faceValidation.hasFace 
                              ? "bg-green-50 text-green-700" 
                              : "bg-red-50 text-red-700"
                          }`}>
                            {faceValidation.hasFace ? "Yes" : "No"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                          <span className="text-gray-600">Centered Alignment</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            !faceValidation.hasFace ? "bg-gray-100 text-gray-400" :
                            faceValidation.isCentered 
                              ? "bg-green-50 text-green-700" 
                              : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {!faceValidation.hasFace ? "Waiting" : faceValidation.isCentered ? "Good" : "Adjust"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                          <span className="text-gray-600">Proper Distance</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            !faceValidation.hasFace ? "bg-gray-100 text-gray-400" :
                            faceValidation.isProperDistance 
                              ? "bg-green-50 text-green-700" 
                              : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {!faceValidation.hasFace ? "Waiting" : faceValidation.isProperDistance ? "Good" : "Adjust"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                          <span className="text-gray-600">Facing Straight</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            !faceValidation.hasFace ? "bg-gray-100 text-gray-400" :
                            faceValidation.isFacingForward 
                              ? "bg-green-50 text-green-700" 
                              : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {!faceValidation.hasFace ? "Waiting" : faceValidation.isFacingForward ? "Good" : "Adjust"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                          <span className="text-gray-600">Good Lighting</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            !faceValidation.hasFace ? "bg-gray-100 text-gray-400" :
                            faceValidation.isGoodLighting 
                              ? "bg-green-50 text-green-700" 
                              : "bg-red-50 text-red-700"
                          }`}>
                            {!faceValidation.hasFace ? "Waiting" : faceValidation.isGoodLighting ? "Good" : "Check Light"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                          <span className="text-gray-600">Sharp & Clear</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            !faceValidation.hasFace ? "bg-gray-100 text-gray-400" :
                            faceValidation.isSharp 
                              ? "bg-green-50 text-green-700" 
                              : "bg-red-50 text-red-700"
                          }`}>
                            {!faceValidation.hasFace ? "Waiting" : faceValidation.isSharp ? "Sharp" : "Blurry"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 leading-tight mt-3 bg-gray-50 p-2 rounded">
                      💡 Ensure you are in a well-lit room, facing forward, and hold still for auto-capture.
                    </div>
                  </div>
                   <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                  >
                    Cancel Camera
                  </button>
                </div>
                </div>
              </div>
            ) : formData.profileImage ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-gray-300 shadow-md max-w-sm mx-auto">
                  <img
                    src={formData.profileImage}
                    alt="Captured Profile"
                    className="w-full object-cover rounded-xl"
                    style={{ maxHeight: "200px" }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, profileImage: "" })
                    }
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg transition"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Retake photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-white hover:bg-gray-50 transition cursor-pointer">
                <Camera className="text-gray-400 mb-3" size={36} />
                <p className="text-sm text-gray-600 font-semibold mb-2">
                  Capture or upload verification picture
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Required for coordinator validation
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-2"
                  >
                    <Camera size={16} />
                    Use Webcam
                  </button>
                  <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold border border-gray-300 transition cursor-pointer flex items-center">
                    Upload File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Submitting Registration...
                </>
              ) : (
                "Register Account"
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl border border-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

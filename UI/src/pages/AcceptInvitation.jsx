import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, X, CheckCircle, Mail, Lock, User, Phone, MapPin, Building, BookOpen, AlertCircle, Loader } from 'lucide-react';
import authService from '../services/authService';
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

const AcceptInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loadingDetails, setLoadingDetails] = useState(true);
  const [invitationDetails, setInvitationDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    profileImage: '',
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

  // Fetch invitation details on mount
  useEffect(() => {
    const fetchDetails = async () => {
      if (!token) {
        message.error('Invitation token is missing from the URL. Please verify your invitation link.');
        setLoadingDetails(false);
        return;
      }

      try {
        const details = await authService.getInvitationDetails(token);
        setInvitationDetails(details);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        message.error(err.message || 'The invitation link is invalid, expired, or has already been used.');
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [token]);

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
      const context = canvasRef.current.getContext('2d');
      // Mirror the image drawn on the canvas so it matches the mirrored preview
      context.translate(canvasRef.current.width, 0);
      context.scale(-1, 1);
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      // Reset transformation matrix
      context.setTransform(1, 0, 0, 1, 0, 0);

      const imageData = canvasRef.current.toDataURL('image/jpeg');
      setFormData(prev => ({ ...prev, profileImage: imageData }));
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia && !navigator?.getUserMedia && !navigator?.webkitGetUserMedia && !navigator?.mozGetUserMedia) {
        const msg = "Camera access is not supported in this browser or requires a secure HTTPS/localhost connection.";
        setError(msg);
        message.error(msg);
        return;
      }

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
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        offscreenCanvasRef.current = canvas;
      }

      let stream = null;

      // 1. Try with standard resolution
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          });
        }
      } catch (e1) {
        console.warn("Standard constraints failed, trying basic video:true", e1);
      }

      // 2. Fallback to basic { video: true } if constraint failed
      if (!stream && navigator?.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e2) {
          console.warn("Basic getUserMedia failed, querying all videoinput devices...", e2);
        }
      }

      // 3. Try enumerating all videoinput devices and attempt connecting to each one
      if (!stream && navigator?.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === "videoinput");
          for (const dev of videoDevices) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: dev.deviceId } }
              });
              if (stream) {
                console.log("Connected to camera device:", dev.label || dev.deviceId);
                break;
              }
            } catch (devErr) {
              console.warn("Failed to open camera device:", dev.label || dev.deviceId, devErr);
            }
          }
        } catch (enumErr) {
          console.warn("Device enumeration failed:", enumErr);
        }
      }

      // 4. Fallback to legacy browser vendor APIs
      if (!stream) {
        const legacyGUM = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (legacyGUM) {
          stream = await new Promise((resolve, reject) => {
            legacyGUM.call(navigator, { video: true }, resolve, reject);
          });
        } else {
          throw new Error("Unable to obtain video stream from any available camera device.");
        }
      }

      setVideoStream(stream);
      setShowCamera(true);
      setError("");

      if (!landmarkerRef.current || !detectorRef.current) {
        setIsLandmarkerLoaded(false);
        try {
          const { FaceLandmarker, ObjectDetector, FilesetResolver } = await import(
            /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8"
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
          console.warn("MediaPipe smart validation unavailable, manual snapshot enabled:", mErr);
          setIsLandmarkerLoaded(false);
        }
      } else {
        setIsLandmarkerLoaded(true);
      }
    } catch (err) {
      console.error("Camera access error details:", err);
      let errMsg = "Unable to access camera. Please check permissions or upload an image file.";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errMsg = "Camera permission was blocked. Click the camera/lock icon in your browser URL bar and choose 'Allow', then click 'Use Webcam' again.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errMsg = "No webcam device was found on your computer. Please connect a webcam or use the 'Upload File' button.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errMsg = "Your webcam is currently being used by another program (e.g. Teams, Zoom, or another browser window). Please close that program and try again.";
      } else if (err.name === "SecurityError" || (typeof window !== 'undefined' && !window.isSecureContext)) {
        errMsg = "Camera access requires HTTPS or localhost. Please access this portal via localhost or HTTPS.";
      } else if (err.message) {
        errMsg = err.message;
      }
      
      setError(errMsg);
      message.error(errMsg);
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
      videoRef.current.play().catch((e) => {
        console.warn("Video auto-play warning:", e);
      });
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
    

    if (!formData.name || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.profileImage) {
      setError('Please capture or upload a profile picture.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        token: token,
        name: formData.name,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        profileImage: formData.profileImage
      };

      const data = await authService.acceptInvitation(payload);

      // Store token and user info (Log user in instantly!)
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('userType', data.user.userType);
      sessionStorage.setItem('userName', data.user.name);
      sessionStorage.setItem('userId', data.user.id);
      sessionStorage.setItem('userEmail', data.user.email);
      sessionStorage.setItem('profileImage', data.user.profileImage || '');
      if (data.user.universityId) {
        sessionStorage.setItem('universityId', data.user.universityId);
      }
      if (data.user.subjectId1) {
        sessionStorage.setItem('subjectId1', data.user.subjectId1);
      }

      message.success(true);
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error completing account setup. Please try again.');
      console.error('Accept invitation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-sm w-full">
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-700 font-semibold">Verifying invitation token...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-200">
            <AlertCircle className="text-red-600" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition shadow-md"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500 shadow-md">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Aboard!</h1>
          <p className="text-gray-600 mb-4">Your Examiner account is now active.</p>
          <p className="text-xs text-blue-600 font-semibold animate-pulse">Logging you in and redirecting...</p>
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Setup Examiner Account</h1>
          <p className="text-gray-600 mt-2">Activate your account with CBC On-Screen Marking Portal</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Invitation Summary Banner */}
        {invitationDetails && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-100 rounded-xl p-5 mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Invitation Context</p>
              <h3 className="text-lg font-bold text-gray-950 mt-1">{invitationDetails.universityName}</h3>
              <p className="text-sm text-gray-600 font-medium">Department: {invitationDetails.departmentName}</p>
            </div>
            <div className="bg-white border border-blue-200 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
              <Mail size={16} />
              {invitationDetails.email}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="Prof. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Choose Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
              <textarea
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 outline-none transition-all"
                placeholder="Department of CS, Building 3, CBC Campus"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Profile Picture Camera Module */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <label className="block text-gray-800 font-bold mb-3">Profile Verification Photo *</label>

            {showCamera ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Camera view screen */}
                  <div className="md:col-span-3 relative rounded-xl overflow-hidden bg-black shadow-inner border border-gray-300 flex items-center justify-center" style={{ minHeight: '260px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
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
                        <span className="text-3xl mb-2">âš ï¸</span>
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
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => capturePhoto(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Take Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : formData.profileImage ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-gray-300 shadow-md max-w-sm mx-auto">
                  <img
                    src={formData.profileImage}
                    alt="Captured Profile"
                    className="w-full object-cover rounded-xl"
                    style={{ maxHeight: '200px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, profileImage: '' })}
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
                <p className="text-sm text-gray-600 font-semibold mb-2">Capture or upload verification picture</p>
                <p className="text-xs text-gray-400 mb-4">Required for coordinator validation</p>
                
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
                  Saving Profile...
                </>
              ) : (
                'Activate Account'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
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

export default AcceptInvitation;

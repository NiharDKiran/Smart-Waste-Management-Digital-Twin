import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Scan, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  ArrowRight,
  Info,
  Camera,
  Video,
  VideoOff,
  Eye,
  Zap
} from 'lucide-react';
import { Bin, DetectionResponse, api } from '../api';

interface VisionViewProps {
  bins: Bin[];
  initialBinId?: number;
  onTwinUpdated: () => void;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

// Preset samples with realistic drawn items to guarantee high-accuracy detections
const PRESET_SAMPLES = [
  {
    id: 'food',
    name: 'Organic Food Waste (Banana)',
    category: 'Wet Waste',
    color: '#2D6A4F',
    bg: '#E8F5EE',
    desc: 'Organic fruit scraps for composting biodigester',
    draw: (ctx: CanvasRenderingContext2D) => {
      // Draw yellow banana shape
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      ctx.ellipse(200, 130, 80, 25, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D4A373';
      ctx.lineWidth = 3;
      ctx.stroke();
    },
    iconText: '🍌',
  },
  {
    id: 'bottle',
    name: 'Beverage Bottle',
    category: 'Recyclable',
    color: '#2980B9',
    bg: '#EBF5FB',
    desc: 'Clear PET plastic drinking water bottle',
    draw: (ctx: CanvasRenderingContext2D) => {
      // Draw blue bottle
      ctx.fillStyle = '#90E0EF';
      ctx.fillRect(175, 70, 50, 130);
      ctx.fillStyle = '#0077B6';
      ctx.fillRect(185, 45, 30, 25);
    },
    iconText: '🧴',
  },
  {
    id: 'cup',
    name: 'Disposable Cup',
    category: 'Recyclable',
    color: '#2980B9',
    bg: '#EBF5FB',
    desc: 'Paper or plastic coffee cup',
    draw: (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(170, 60);
      ctx.lineTo(230, 60);
      ctx.lineTo(215, 170);
      ctx.lineTo(185, 170);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#64748B';
      ctx.stroke();
    },
    iconText: '🥤',
  },
  {
    id: 'battery',
    name: 'E-Waste / Battery Pack',
    category: 'Hazardous',
    color: '#C0392B',
    bg: '#FDEDEC',
    desc: 'Discarded lithium cell or electronics',
    draw: (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#4A5568';
      ctx.fillRect(160, 70, 80, 110);
      ctx.fillStyle = '#C0392B';
      ctx.fillRect(180, 50, 40, 20);
    },
    iconText: '🔋',
  },
];

function createPresetFile(sample: typeof PRESET_SAMPLES[0]): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = sample.bg;
    ctx.fillRect(0, 0, 400, 300);

    ctx.strokeStyle = sample.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 376, 276);

    sample.draw(ctx);

    ctx.fillStyle = '#2C2520';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sample.name, 200, 225);

    ctx.fillStyle = sample.color;
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(`Target Segregation: ${sample.category}`, 200, 250);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${sample.id}-sample.png`, { type: 'image/png' });
        resolve(file);
      }
    }, 'image/png');
  });
}

export const VisionView: React.FC<VisionViewProps> = ({
  bins,
  initialBinId,
  onTwinUpdated,
  showToast,
}) => {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetBinId, setTargetBinId] = useState<number | undefined>(initialBinId || (bins[0]?.id ?? 1));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [useGeminiVision, setUseGeminiVision] = useState(true);
  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResponse | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const continuousIntervalRef = useRef<number | null>(null);

  // Stop camera when switching mode or unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Enumerate available video input devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
    }
  }, [selectedDeviceId]);

  // Callback ref: immediately attaches stream and starts playing as soon as <video> mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.defaultMuted = true;
      node.muted = true;
      node.playsInline = true;
      node.play().catch((err) => {
        console.warn('Camera video.play() note:', err);
      });
    }
  }, []);

  // Also sync stream whenever cameraActive toggles
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(console.warn);
    }
  }, [cameraActive]);

  const startCamera = async (targetDeviceId?: string) => {
    setCameraError(null);
    const devId = targetDeviceId || selectedDeviceId;

    // Constraint cascade from specific device down to simplest raw video
    const constraintSets: MediaStreamConstraints[] = [];
    if (devId) {
      constraintSets.push({
        video: { deviceId: { exact: devId } },
        audio: false,
      });
      constraintSets.push({
        video: { deviceId: { ideal: devId } },
        audio: false,
      });
    }
    constraintSets.push(
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: true, audio: false }
    );

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintSets) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream && stream.getVideoTracks().length > 0) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          break;
        }
      }
    }

    if (!stream) {
      const errName = lastError?.name ?? 'UnknownError';
      let message = 'Unable to access webcam. Please check camera permissions or use Upload.';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        message = 'Camera permission denied. Click the lock/camera icon in your browser address bar to allow camera access, then retry.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        message = 'No camera device detected on this system. You can test detection with the Upload mode.';
      } else if (errName === 'NotReadableError') {
        message = 'Camera is currently locked or in use by another application. Close other camera apps and retry.';
      }
      console.error('Camera initialization error:', lastError);
      setCameraError(message);
      showToast('Camera access failed — ' + (lastError?.name ?? 'check permissions'), 'error');
      return;
    }

    // Stop old tracks before switching
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = stream;

    // Direct attach to video if element is already mounted
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(console.warn);
    }

    setCameraActive(true);
    refreshDevices();
    showToast('Live camera feed active.', 'success');
  };

  const stopCamera = () => {
    if (continuousIntervalRef.current) {
      clearInterval(continuousIntervalRef.current);
      continuousIntervalRef.current = null;
    }
    setIsContinuousScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleModeSwitch = (newMode: 'upload' | 'camera') => {
    setMode(newMode);
    if (newMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Capture frame from live video feed with async frame-ready wait
  const captureVideoFrame = async (): Promise<File | null> => {
    if (!videoRef.current || !streamRef.current) return null;
    const video = videoRef.current;

    // If video frame dimensions are not yet available, wait up to 800ms
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const check = setInterval(() => {
          attempts++;
          if ((video.videoWidth > 0 && video.videoHeight > 0) || attempts >= 8) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `live-frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.90);
    });
  };

  const handleCaptureAndDetect = async () => {
    const file = await captureVideoFrame();
    if (!file) {
      showToast('No video frame available to capture.', 'warning');
      return;
    }
    await executeInference(file);
  };

  const executeInference = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const response = await api.detect(file, targetBinId, useGeminiVision);
      setDetectionResult(response);
      showToast(response.message || 'Detection complete!', 'success');
      onTwinUpdated();

      // If bounding boxes present, draw on overlay canvas
      if (overlayCanvasRef.current && videoRef.current) {
        drawBoundingBoxes(response.detections);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.detail || 'Vision detection failed. Check server connection.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const drawBoundingBoxes = (detections: any[]) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      if (det.bbox && det.bbox.length === 4) {
        const [x1, y1, x2, y2] = det.bbox;
        const width = x2 - x1;
        const height = y2 - y1;

        const color = det.waste_class === 'wet'
          ? '#2D6A4F'
          : det.waste_class === 'recyclable'
          ? '#2980B9'
          : det.waste_class === 'hazardous'
          ? '#E63946'
          : '#B8A99A';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, width, height);

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - 22, ctx.measureText(det.raw_label).width + 50, 22);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`${det.raw_label} (${Math.round(det.confidence * 100)}%)`, x1 + 5, y1 - 6);
      }
    });
  };

  // Toggle continuous auto-scan in live camera mode
  const toggleContinuousScan = () => {
    if (isContinuousScanning) {
      if (continuousIntervalRef.current) {
        clearInterval(continuousIntervalRef.current);
        continuousIntervalRef.current = null;
      }
      setIsContinuousScanning(false);
      showToast('Continuous live detection paused.', 'warning');
    } else {
      setIsContinuousScanning(true);
      showToast('Continuous detection activated (scanning every 2.5s).', 'success');
      continuousIntervalRef.current = window.setInterval(async () => {
        const frame = await captureVideoFrame();
        if (frame) {
          executeInference(frame);
        }
      }, 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Only JPEG, PNG, or WebP images are allowed.', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size exceeds 5MB limit.', 'error');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setDetectionResult(null);
    }
  };

  const handleSelectPreset = async (sample: typeof PRESET_SAMPLES[0]) => {
    const file = await createPresetFile(sample);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDetectionResult(null);
  };

  const handleRunDetection = () => {
    if (mode === 'camera') {
      handleCaptureAndDetect();
    } else {
      if (!selectedFile) {
        showToast('Please select or upload an image first.', 'warning');
        return;
      }
      executeInference(selectedFile);
    }
  };

  const chosenBin = bins.find((b) => b.id === targetBinId);
  const chosenBinPct = chosenBin 
    ? (chosenBin.capacity_liters > 0 ? (chosenBin.fill_level / chosenBin.capacity_liters) * 100 : chosenBin.fill_level)
    : 0;

  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">Computer Vision Classifier (YOLOv8 + Gemini Vision)</h1>
          <p className="view-description">
            Live camera detection &amp; image classifier for waste segregation (Wet, Dry, Recyclable, Hazardous). Integrates live stream telemetry directly into digital twin nodes.
          </p>
        </div>
      </div>

      <div className="vision-grid">
        {/* Left Column: Image Input & Live Camera */}
        <div className="vision-input-col">
          <div className="panel-card">
            <div className="panel-card-header">
              <div className="panel-card-title">
                {mode === 'camera' ? <Camera size={18} /> : <Upload size={18} />}
                <span>{mode === 'camera' ? 'Live Camera Feed' : 'Upload Waste Photo'}</span>
              </div>

              {/* Segmented Control */}
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${mode === 'upload' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('upload')}
                >
                  <Upload size={13} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${mode === 'camera' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('camera')}
                >
                  <Camera size={13} />
                  <span>Live Camera</span>
                </button>
              </div>
            </div>

            <div className="panel-card-body">
              {mode === 'camera' ? (
                <>
                  {availableDevices.length > 1 && (
                    <div className="camera-device-bar">
                      <span>Video Device:</span>
                      <select
                        className="camera-device-select"
                        value={selectedDeviceId}
                        onChange={(e) => {
                          setSelectedDeviceId(e.target.value);
                          startCamera(e.target.value);
                        }}
                      >
                        {availableDevices.map((dev, idx) => (
                          <option key={dev.deviceId || idx} value={dev.deviceId}>
                            {dev.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Live Camera Stream View */}
                  <div className="camera-view-box">
                    {cameraActive ? (
                      <>
                        <video
                          ref={setVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="camera-video-stream"
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            v.play().catch(console.warn);
                            if (overlayCanvasRef.current) {
                              overlayCanvasRef.current.width = v.videoWidth || 640;
                              overlayCanvasRef.current.height = v.videoHeight || 480;
                            }
                          }}
                          onCanPlay={(e) => {
                            e.currentTarget.play().catch(console.warn);
                          }}
                        />
                        <canvas
                          ref={overlayCanvasRef}
                          className="camera-overlay-canvas"
                        />
                        <div className="camera-live-badge">
                          <span className="pulse-dot"></span>
                          LIVE WEBCAM
                        </div>
                      </>
                    ) : (
                    <div className="camera-inactive-placeholder">
                      {cameraError ? (
                        <>
                          <AlertCircle size={40} style={{ color: 'var(--color-error)', margin: '0 auto 12px' }} />
                          <p style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.8rem', marginBottom: 8 }}>Camera Error</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', maxWidth: 260, margin: '0 auto 16px', lineHeight: 1.5 }}>{cameraError}</p>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => { setCameraError(null); startCamera(); }}
                            >
                              <Camera size={14} />
                              <span>Retry Camera</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleModeSwitch('upload')}
                            >
                              <Upload size={14} />
                              <span>Use Upload Instead</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <VideoOff size={36} style={{ opacity: 0.5, margin: '0 auto 12px' }} />
                          <p style={{ fontSize: '0.8rem', marginBottom: 16 }}>Click below to activate your webcam</p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => startCamera()}
                          >
                            <Camera size={14} />
                            <span>Activate Camera</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
              ) : (
                /* Drop area */
                <div
                  className={`upload-dropzone ${previewUrl ? 'has-preview' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {previewUrl ? (
                    <div className="preview-container">
                      <img src={previewUrl} alt="Waste preview" className="waste-preview-img" />
                      <div className="preview-overlay">
                        <RefreshCw size={18} />
                        <span>Click to replace image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="dropzone-placeholder">
                      <div className="dropzone-icon">
                        <Scan size={36} />
                      </div>
                      <div className="dropzone-prompt">
                        <strong>Click to upload</strong> or drag &amp; drop
                      </div>
                      <div className="dropzone-sub">
                        Supports JPEG, PNG, WebP up to 5MB
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Action Buttons */}
              {mode === 'camera' && cameraActive && (
                <div className="camera-controls-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={toggleContinuousScan}
                  >
                    <RefreshCw size={13} className={isContinuousScanning ? 'icon-spin' : ''} />
                    <span>{isContinuousScanning ? 'Pause Auto-Scan' : 'Continuous Auto-Scan'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCaptureAndDetect}
                    disabled={isAnalyzing}
                  >
                    <Eye size={13} />
                    <span>Scan Frame</span>
                  </button>
                </div>
              )}

              {/* High Accuracy AI Vision Toggle */}
              <div className="ai-vision-toggle-card">
                <div className="ai-vision-info">
                  <Zap size={18} className="ai-vision-icon" />
                  <div>
                    <div className="ai-vision-title">Gemini Multi-Modal AI Vision</div>
                    <div className="ai-vision-subtitle">Zero-shot categorization for complex items &amp; packaging</div>
                  </div>
                </div>
                <label className="switch-toggle" title="Toggle Gemini Vision">
                  <input
                    type="checkbox"
                    checked={useGeminiVision}
                    onChange={(e) => setUseGeminiVision(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {/* Preset rapid test samples */}
              {mode === 'upload' && (
                <div className="sample-presets-block mt-3">
                  <div className="sample-presets-label">
                    <Sparkles size={14} />
                    <span>Quick test reference samples:</span>
                  </div>
                  <div className="presets-row">
                    {PRESET_SAMPLES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        className="preset-chip"
                        onClick={() => handleSelectPreset(sample)}
                      >
                        <span className="preset-chip-icon">{sample.iconText}</span>
                        <span className="preset-chip-name">{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Closed-loop bin assignment */}
              <div className="bin-target-selector mt-3">
                <label className="selector-label">
                  <Trash2 size={14} />
                  <span>Sync Detection with Digital Twin Receptacle:</span>
                </label>
                <select
                  value={targetBinId}
                  onChange={(e) => setTargetBinId(Number(e.target.value))}
                  className="filter-select w-full"
                >
                  {bins.map((bin) => {
                    const fill = bin.capacity_liters > 0
                      ? Math.round((bin.fill_level / bin.capacity_liters) * 100)
                      : Math.round(bin.fill_level);
                    return (
                      <option key={bin.id} value={bin.id}>
                        {bin.name} ({bin.zone_name}) &bull; Fill: {Math.min(100, fill)}%
                      </option>
                    );
                  })}
                </select>
                <div className="selector-hint">
                  Updates this receptacle's telemetry, waste proportions, and contamination score.
                </div>
              </div>

              <div className="action-button-row mt-3">
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full"
                  onClick={handleRunDetection}
                  disabled={(mode === 'upload' && !selectedFile) || (mode === 'camera' && !cameraActive) || isAnalyzing}
                >
                  <Scan size={18} className={isAnalyzing ? 'icon-spin' : ''} />
                  <span>{isAnalyzing ? 'Running Inference...' : mode === 'camera' ? 'Capture & Update Twin' : 'Classify & Update Twin'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detection Results & Closed-Loop Telemetry Impact */}
        <div className="vision-result-col">
          <div className="panel-card h-full">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <Scan size={16} />
                <span>Inference Telemetry Output</span>
              </div>
              {detectionResult && (
                <span className="badge-pill badge-primary">Model: Pretrained YOLOv8</span>
              )}
            </div>

            <div className="panel-card-body">
              {!detectionResult ? (
                <div className="empty-state-large">
                  <Scan size={48} className="empty-state-icon" />
                  <h3>Awaiting Image Analysis</h3>
                  <p>
                    Select an image or choose one of the quick test presets to evaluate YOLOv8 object detection, label mapping, and closed-loop twin updates.
                  </p>
                </div>
              ) : (
                <div className="detection-results-wrapper">
                  {/* Status Banner */}
                  <div className="alert-banner alert-success">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Closed-Loop Success:</strong> {detectionResult.message}
                    </div>
                  </div>

                  {/* Primary classification card */}
                  {detectionResult.detections.map((det, idx) => {
                    const isRecyclable = det.waste_class === 'recyclable';
                    const isWet = det.waste_class === 'wet';
                    const isHazardous = det.waste_class === 'hazardous';

                    const badgeColor = isWet
                      ? 'var(--color-primary-500)'
                      : isRecyclable
                      ? '#2980B9'
                      : isHazardous
                      ? 'var(--color-error)'
                      : '#B8A99A';

                    return (
                      <div key={idx} className="classification-card">
                        <div className="class-card-header">
                          <div>
                            <span className="class-label-tag font-mono">
                              Raw YOLO Label: "{det.raw_label}"
                            </span>
                            <div className="class-major-title" style={{ color: badgeColor }}>
                              {det.waste_class.toUpperCase()} WASTE
                            </div>
                          </div>
                          <div className="confidence-pill font-mono">
                            {Math.round(det.confidence * 100)}% Confidence
                          </div>
                        </div>

                        <p className="class-card-description">{det.description}</p>

                        <div className="disposal-instructions">
                          <div className="instruction-title">
                            <Info size={14} />
                            <span>Recommended Sorting & Handling</span>
                          </div>
                          <p className="instruction-text">
                            {isWet && 'Deposit in green compost receptacles. Transport to campus biodigester / organic composting yard.'}
                            {isRecyclable && 'Place in blue dry/recycling bin. Ensure container is rinsed of food residues to prevent batch contamination.'}
                            {isHazardous && 'Segregate immediately in red containment locker. Requires specialized hazardous waste handling.'}
                            {!isWet && !isRecyclable && !isHazardous && 'Dispose in general non-recyclable dry waste stream for scheduled municipal transfer.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Twin State Impact Box */}
                  {chosenBin && (
                    <div className="twin-impact-box">
                      <div className="impact-box-title">
                        <Trash2 size={14} />
                        <span>Updated Digital Twin Node: {chosenBin.name}</span>
                      </div>
                      <div className="impact-box-grid">
                        <div>
                          <div className="impact-label">New Fill Level</div>
                          <div className="impact-val font-mono">
                            {chosenBinPct.toFixed(1)}% ({chosenBin.fill_level.toFixed(1)}L / {chosenBin.capacity_liters}L)
                          </div>
                        </div>
                        <div>
                          <div className="impact-label">Contamination Index</div>
                          <div className="impact-val font-mono">{Math.round(chosenBin.contamination_score * 100)}%</div>
                        </div>
                        <div>
                          <div className="impact-label">Hours Until Overflow</div>
                          <div className="impact-val font-mono">{chosenBin.hours_until_overflow ?? '>48'}h</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Architecture Closed-Loop Flowchart */}
                  <div className="closed-loop-diagram">
                    <div className="diagram-step">
                      <span className="step-num">1</span>
                      <span className="step-text">Image Ingestion</span>
                    </div>
                    <ArrowRight size={14} className="diagram-arrow" />
                    <div className="diagram-step">
                      <span className="step-num">2</span>
                      <span className="step-text">YOLOv8 Inference</span>
                    </div>
                    <ArrowRight size={14} className="diagram-arrow" />
                    <div className="diagram-step">
                      <span className="step-num">3</span>
                      <span className="step-text">Twin Node Sync</span>
                    </div>
                    <ArrowRight size={14} className="diagram-arrow" />
                    <div className="diagram-step">
                      <span className="step-num">4</span>
                      <span className="step-text">Risk Re-eval</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

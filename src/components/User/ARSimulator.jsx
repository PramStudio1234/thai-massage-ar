import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { samplePose } from '../Anatomy';
import { targetPoint, evaluateMotion, evaluateHandMotion, massageState, emptyMetrics, advanceTimer, scoreMetrics, createResult } from '../../lib/tracking';
import { sampleHandMotion, drawHandOverlay, drawHandMarker, demoHand } from '../../lib/handOverlay';
import { handDetections, updateFocusedHands, focusedMotionState } from '../../lib/handFocus';
import { motionInfo, defaultNodes } from '../../lib/domain';
import LoadingIndicator from '../LoadingIndicator';
import { videoProjection, projectPoint, drawTargetOverlay } from '../../lib/targetOverlay';
import { targetProfile, targetSide, targetGuidance, updateTargetTrack, adjustTarget, targetAdjustment } from '../../lib/anatomicalTargets';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Home, 
  Eye, 
  Camera, 
  MousePointer2, 
  Check, 
  ScanLine, 
  AlertTriangle, 
  Clock3, 
  ShieldCheck, 
  MoveVertical, 
  RotateCw, 
  Activity, 
  ChevronLeft, 
  Hand,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

const getStatusMessage = (status, node) => {
  if (status === 'no-body') return `📹 ยังไม่เห็น${node?.name || 'บริเวณที่เลือก'}ชัด · ${targetGuidance(node || {})}`;
  if (status === 'calibrating') return '🎯 แตะตำแหน่งบนร่างกายที่ต้องการให้เป็นศูนย์กลางวง · เวลาหยุด';
  if (status === 'no-hand') return '✋ ให้กล้องเห็นมือ แล้วเคลื่อนไหวตามลูกศร';
  if (status === 'need-two-hands') return '✋ โหมด 2 มือ · ต้องเห็นมือที่โฟกัสทั้งสองข้าง · เวลาหยุด';
  if (status === 'paused') return '⏸️ หยุดชั่วคราว';
  if (status === 'valid') {
    return '✓ ตรวจพบมือ · ทิศทางผ่าน · กำลังนับเวลา';
  }
  if (status === 'counter-clockwise') return '⚠️ กำลังคลึงทวนเข็มนาฬิกา กรุณาคลึงตามเข็มนาฬิกา · เวลาหยุด';
  if (status === 'direction') {
    if (node?.motion === 'circular') return '⚠️ กรุณาคลึงวนตามเข็มนาฬิกาเท่านั้น · เวลาหยุด';
    if (node?.motion === 'vertical') return '⚠️ กรุณาลูบตามแนวยาวของกล้ามเนื้อ · เวลาหยุด';
    return '⚠️ ทิศทางไม่ถูกต้อง · เวลาหยุด';
  }
  if (status === 'still') return '✋ ตรวจพบมือแล้ว · เริ่มวนตามลูกศรเพื่อให้นับเวลา';
  return '⚡ เคลื่อนไหวมือที่จุดเป้าหมายเพื่อเริ่มฝึก';
};

export default function ARSimulator({ category, onBackToDashboard, onFinishSession }) {
  const { currentUser, settings } = usePlatform();

  // Selected Nodes for this session
  const nodes = useMemo(() => (category.nodes || defaultNodes).filter(n =>
    n.region === (category.region || 'upper') && (!category.part || n.name === category.part)), [category.nodes, category.region, category.part]);

  const [mode, setMode] = useState(category?.mode || 'camera'); // 'camera' or 'demo'
  const [autoDemo, setAutoDemo] = useState(false);
  const [index, setIndex] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const activeNode = nodes[index] || nodes[0] || defaultNodes[0];
  const totalSeconds = activeNode.seconds;

  // Simulator Controls
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState(mode === 'camera' ? 'no-body' : 'no-hand');
  const [infrared, setInfrared] = useState(true);
  const [loading, setLoading] = useState(mode === 'camera');
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(mode === 'demo' ? Math.min(totalSeconds, 8) : totalSeconds);
  const [targetReady, setTargetReady] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState('');
  const [handCount, setHandCount] = useState(0);
  const [handFocusCount, setHandFocusCount] = useState(category.handFocusCount === 2 ? 2 : 1);

  // Canvas & Video Refs
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const historyRef = useRef([]);
  const handFocusTracksRef = useRef([]);
  const poseRef = useRef(samplePose);
  const poseDetectedAtRef = useRef(0);
  const completionTimerRef = useRef(null);
  const handsRef = useRef([]);
  const handsDetectedAtRef = useRef(0);
  const lastHandSampleRef = useRef(0);
  const lastAxisRef = useRef({ x: 0, y: 1 });
  const targetTracksRef = useRef({});
  const targetAdjustmentsRef = useRef({});
  const baseTargetsRef = useRef({});
  const metricsRef = useRef(emptyMetrics());
  const stateRef = useRef({
    index: 0,
    valid: 0,
    paused: false,
    auto: false,
    done: false,
    hadContact: false,
    phase: 0
  });
  const startTimeRef = useRef(performance.now());
  const lastPointerRef = useRef(0);
  const modelsRef = useRef(null);

  stateRef.current.paused = paused;
  stateRef.current.auto = autoDemo;
  stateRef.current.calibrating = calibrating;

  useEffect(() => {
    targetTracksRef.current = {};
    targetAdjustmentsRef.current = {};
    baseTargetsRef.current = {};
    historyRef.current = [];
    handFocusTracksRef.current = [];
    clearTimeout(completionTimerRef.current);
    stateRef.current = { index: 0, valid: 0, paused: false, auto: false, done: false, hadContact: false, motionAccepted: false, phase: 0 };
    metricsRef.current = emptyMetrics();
    startTimeRef.current = performance.now();
    setIndex(0);
    setPaused(false);
    setAutoDemo(false);
    setStatus('no-hand');
    setError('');
    setRemaining(mode === 'demo' ? Math.min(nodes[0]?.seconds || 15, 8) : nodes[0]?.seconds || 15);
    lastHandSampleRef.current = 0;
    lastAxisRef.current = { x: 0, y: 1 };
    setHandCount(0);
    setTargetReady(false);
    setCalibrating(false);
    setCalibrationMessage('');
  }, [mode, nodes]);

  useEffect(() => { setCalibrating(false); setCalibrationMessage(''); }, [index]);

  // 1. Initialize Camera and MediaPipe Tasks Vision if in camera mode
  useEffect(() => {
    let stopped = false;
    let stream = null;
    let taskPose = null;
    let taskHand = null;

    if (mode === 'demo' || !nodes.length) {
      setLoading(false);
      return;
    }
    poseDetectedAtRef.current = 0;
    handsRef.current = [];

    async function initVision() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง กรุณาเปิดผ่าน HTTPS หรือ localhost');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false
        });

        if (stopped) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn('Video play warning:', e);
          }
        }

        // Dynamically load MediaPipe Tasks Vision bundle from jsDelivr
        const libraryUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs';
        const vision = await import(/* @vite-ignore */ libraryUrl);
        if (stopped) return;

        const files = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
        );

        const common = { runningMode: 'VIDEO', minTrackingConfidence: 0.5 };

        taskPose = await vision.PoseLandmarker.createFromOptions(files, {
          ...common,
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
          }
        });

        if (stopped) {
          taskPose?.close();
          return;
        }

        taskHand = await vision.HandLandmarker.createFromOptions(files, {
          ...common,
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
          }
        });

        if (stopped) {
          taskPose?.close();
          taskHand?.close();
          return;
        }

        modelsRef.current = { pose: taskPose, hand: taskHand };
        setLoading(false);
        startTimeRef.current = performance.now();
      } catch (err) {
        console.warn('MediaPipe camera/model init warning:', err);
        stream?.getTracks().forEach(t => t.stop());
        taskPose?.close();
        taskHand?.close();
        modelsRef.current = null;
        if (!stopped) {
          setLoading(false);
          setError(
            err.name === 'NotAllowedError'
              ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณากดอนุญาตกล้องในเบราว์เซอร์'
              : 'ไม่พบกล้องหรือเชื่อมต่อโมเดลไม่สำเร็จ คุณสามารถใช้โหมดสาธิต (Mouse Demo) แทนได้'
          );
        }
      }
    }

    initVision();

    return () => {
      stopped = true;
      stream?.getTracks().forEach(t => t.stop());
      taskPose?.close();
      taskHand?.close();
      modelsRef.current = null;
    };
  }, [mode]);

  // 2. Main High-Precision Tracking & Rendering Loop
  useEffect(() => {
    let frame = 0;
    let last = 0;
    let lastDetection = 0;
    let lastPoseDetection = 0;
    let lastVideo = -1;
    startTimeRef.current = performance.now();

    function draw(time) {
      const dt = last ? Math.min(time - last, 500) : 0;
      last = time;
      const s = stateRef.current;
      const c = canvasRef.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx || s.done) return;

      const node = nodes[s.index];
      if (!node) return;
      const screenRatio = c.clientWidth / Math.max(1, c.clientHeight);

      // Prioritize hand frames; body targets need fewer updates than motion direction.
      if (mode === 'camera' && modelsRef.current && videoRef.current && time - lastDetection > 60 && videoRef.current.currentTime !== lastVideo) {
        try {
          const handRes = modelsRef.current.hand.detectForVideo(videoRef.current, time);
          handsRef.current = handDetections(handRes);
          handsDetectedAtRef.current = time;
        } catch (e) {
          // A failed frame expires below; pose errors must not block hand tracking.
        }
        if (time - lastPoseDetection > 220) {
        try {
          const poseRes = modelsRef.current.pose.detectForVideo(videoRef.current, time);
          if (poseRes.landmarks?.[0] && poseRes.landmarks[0].length > 0) {
            poseRef.current = poseRes.landmarks[0];
            poseDetectedAtRef.current = time;
            const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight || 1;
            for (const n of nodes) {
              const position = targetPoint(n, poseRef.current, true, { strict: true, aspectRatio });
              targetTracksRef.current[n.id] = updateTargetTrack(targetTracksRef.current[n.id], position, time);
            }
          } else {
            poseDetectedAtRef.current = 0;
            targetTracksRef.current = {};
          }
        } catch (e) {
          // Retain body landmarks only within the freshness limit below.
        }
        lastPoseDetection = time;
        }
        lastVideo = videoRef.current.currentTime;
        lastDetection = time;
      }

      // Camera targets must come from the selected visible body region, never demo coordinates.
      const bodyTracked = mode === 'demo' || poseDetectedAtRef.current > 0 && time - poseDetectedAtRef.current < 600;
      const activePose = mode === 'demo' ? samplePose : bodyTracked ? poseRef.current : [];
      const projection = mode === 'camera' ? videoProjection(c.clientWidth, c.clientHeight, videoRef.current?.videoWidth, videoRef.current?.videoHeight) : videoProjection(0, 0, 0, 0);
      const displayedTargets = nodes.map(n => {
        const track = targetTracksRef.current[n.id];
        const raw = mode === 'demo' ? targetPoint(n, samplePose, false)
          : bodyTracked && track?.ready && time - track.time < 600 ? track.point : null;
        const base = mode === 'camera' ? projectPoint(raw, projection) : raw;
        baseTargetsRef.current[n.id] = base;
        const corrected = mode === 'camera' ? adjustTarget(base, targetAdjustmentsRef.current[n.id], screenRatio) : base;
        // Corrections outside the actual video rectangle do not establish a target.
        return corrected && corrected.x >= projection.ox && corrected.x <= 1 - projection.ox
          && corrected.y >= projection.oy && corrected.y <= 1 - projection.oy ? corrected : null;
      });
      const target = displayedTargets[s.index];
      const targetTracked = Boolean(target);
      setTargetReady(targetTracked);
      let point = undefined;

      // Auto Demo simulated hand movement if enabled
      if (mode === 'demo' && s.auto && target && !s.paused) {
        s.phase += (dt / 1000) * 2.5;
        const phase = s.phase;
        const rad = 0.024;
        point = {
          x: target.x + (node.motion === 'vertical' ? 0 : Math.cos(phase) * rad),
          y: target.y + (node.motion === 'pulse' ? 0 : Math.sin(phase) * rad * screenRatio),
          time
        };
        if (node.motion === 'pulse') point.x = target.x + Math.sin(phase) * rad;
        historyRef.current.push(point);
        lastPointerRef.current = time;
      }

      const liveHands = mode === 'camera' && time - handsDetectedAtRef.current <= 500 ? handsRef.current : [];
      if (mode === 'camera' && (handsDetectedAtRef.current !== lastHandSampleRef.current || !liveHands.length)) {
        const sampleTime = handsDetectedAtRef.current;
        handFocusTracksRef.current = updateFocusedHands(handFocusTracksRef.current, liveHands,
          { count: handFocusCount, target, projection, ratio: screenRatio, time: sampleTime });
        for (const track of handFocusTracksRef.current) {
          if (!track) continue;
          if (track.visible) {
            track.histories ||= {};
            sampleHandMotion(track.histories, track.landmarks, projection, screenRatio, sampleTime);
          } else {
            track.histories = {};
            track.accepted = false;
          }
        }
        lastHandSampleRef.current = sampleTime;
      }
      const focusedHands = mode === 'camera' ? handFocusTracksRef.current.filter(track => track?.visible) : [];

      // Keep enough actual samples to recognize motion on slower cameras.
      historyRef.current = historyRef.current.filter(h => time - h.time <= 2200).slice(-100);
      point = mode === 'camera' ? focusedHands[0] ? projectPoint({ ...focusedHands[0].landmarks[9], x: 1 - focusedHands[0].landmarks[9].x }, projection) : undefined
        : historyRef.current[historyRef.current.length - 1];

      if (mode === 'demo' && point && time - lastPointerRef.current > 180) {
        historyRef.current = [];
        point = undefined;
      }

      // Evaluate Motion & Direction
      const profile = targetProfile(node);
      const a = activePose[profile.axis[0]];
      const b = activePose[profile.axis[1]];
      const axis = a && b ? { x: (mode === 'camera' ? -1 : 1) * (b.x - a.x) * projection.sx, y: (b.y - a.y) * projection.sy } : { x: 0, y: 1 };
      if (a && b && Math.hypot(axis.x, axis.y) > .01) lastAxisRef.current = { x: axis.x, y: axis.y / screenRatio };

      for (const track of focusedHands) {
        track.evaluated = evaluateHandMotion(track.histories, node, lastAxisRef.current);
        const result = massageState(track.evaluated, true, track.accepted, s.paused, s.calibrating);
        track.accepted = result.accepted;
        track.state = result.state;
      }
      const evaluated = mode === 'camera' ? {
        state: focusedMotionState(focusedHands.map(track => track.state), handFocusCount, s.paused, s.calibrating),
        speed: focusedHands.length ? focusedHands.reduce((sum, track) => sum + track.evaluated.speed, 0) / focusedHands.length : 0,
      } : point ? evaluateMotion(
            historyRef.current.map(p => ({ ...p, y: p.y / screenRatio })),
            target,
            node,
            lastAxisRef.current
          )
        : { state: 'no-hand', speed: 0 };

      const demoHandCount = point ? s.auto ? handFocusCount : 1 : 0;
      const motion = mode === 'camera' ? { state: evaluated.state, accepted: evaluated.state === 'valid' }
        : demoHandCount < handFocusCount && point ? { state: s.paused ? 'paused' : 'need-two-hands', accepted: false }
        : massageState(evaluated, Boolean(point), s.motionAccepted, s.paused, s.calibrating);
      const current = motion.state;
      s.motionAccepted = motion.accepted;
      setHandCount(mode === 'camera' ? focusedHands.length : demoHandCount);

      // Continuity measures tracking loss, never distance from the guide marker.
      const hasTrackedHand = mode === 'camera' ? focusedHands.length === handFocusCount : demoHandCount === handFocusCount;

      // Telemetry recording & Strict Timer Countdown
      if (!s.paused && !s.calibrating && !loading && !error) {
        metricsRef.current.observedMs += dt;
        if (s.hadContact && !hasTrackedHand) {
          metricsRef.current.exits++;
          sound.playWarning();
        }
        s.hadContact = hasTrackedHand;
        if (hasTrackedHand && evaluated.speed >= 0.002) {
          metricsRef.current.contactMs += dt;
          if (evaluated.state === 'valid') metricsRef.current.directionMs += dt;
        }

        // Advance timer only when valid
        if (current === 'valid') {
          const totalMs = (mode === 'demo' ? Math.min(node.seconds, 8) : node.seconds) * 1000;
          const tick = advanceTimer(s.valid, dt, totalMs, current, s.paused);
          const add = tick.elapsed - s.valid;
          s.valid = tick.elapsed;
          metricsRef.current.validMs += add;
          if (metricsRef.current.speeds.length < 9000) metricsRef.current.speeds.push(evaluated.speed);

          // Node Complete!
          if (s.valid >= totalMs) {
            s.index++;
            s.valid = 0;
            s.hadContact = false;
            s.motionAccepted = false;
            lastHandSampleRef.current = 0;
            historyRef.current = [];
            handFocusTracksRef.current.forEach(track => { if (track) { track.histories = {}; track.accepted = false; } });
            sound.playNodeComplete();

            try {
              confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
            } catch (e) {}

            // All Nodes Complete!
            if (s.index >= nodes.length) {
              s.done = true;
              sound.playSessionComplete();
              try {
                confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
              } catch (e) {}

              const finalResult = createResult({
                metrics: metricsRef.current,
                region: nodes[0].region,
                part: nodes[0].name,
                duration: Math.max(1, (time - startTimeRef.current) / 1000),
                nodes: nodes.length,
                mode: mode,
                userId: currentUser?.id || 'usr_real',
                userName: currentUser?.name || 'ผู้เรียน'
              });
              finalResult.handFocusCount = handFocusCount;

              s.index = nodes.length - 1;
              s.valid = totalMs;
              completionTimerRef.current = setTimeout(() => onFinishSession({
                category,
                slipCount: metricsRef.current.exits,
                directionErrors: Math.round(metricsRef.current.exits * 0.8),
                elapsedSeconds: Math.round((time - startTimeRef.current) / 1000),
                scores: finalResult,
                result: finalResult
              }), 700);
            }
            setIndex(s.index);
          }
        }
      }

      setStatus(current);
      const active = nodes[s.index];
      const curTotal = mode === 'demo' ? Math.min(active.seconds, 8) : active.seconds;
      setRemaining(Math.max(0, curTotal - s.valid / 1000));

      // ---------------- CANVAS DRAWING ----------------
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.round(rect.width * dpr) || c.height !== Math.round(rect.height * dpr)) {
        c.width = Math.round(rect.width * dpr);
        c.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const w = rect.width;
      const h = rect.height;

      // Draw Anatomical Body Wireframe & Thai Meridian Lines in Demo Mode
      if (mode === 'demo') {
        const p = samplePose;

        // 1. Thai Meridian Sen Sib Lines (เส้นประธานสิบตามหลักแพทย์แผนไทย)
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        if (p[0] && p[11] && p[12]) {
          const midShoulderX = (p[11].x + p[12].x) / 2 * w;
          const midShoulderY = (p[11].y + p[12].y) / 2 * h;
          ctx.beginPath();
          ctx.moveTo(p[0].x * w, p[0].y * h);
          ctx.lineTo(midShoulderX, midShoulderY);
          if (p[23] && p[24]) {
            const midHipX = (p[23].x + p[24].x) / 2 * w;
            const midHipY = (p[23].y + p[24].y) / 2 * h;
            ctx.lineTo(midHipX, midHipY);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 2. Anatomical Wireframe
        ctx.strokeStyle = 'rgba(134, 187, 163, 0.45)';
        ctx.lineWidth = 2;
        for (const [i, j] of [
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
          [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28]
        ]) {
          if (p[i] && p[j]) {
            ctx.beginPath();
            ctx.moveTo(p[i].x * w, p[i].y * h);
            ctx.lineTo(p[j].x * w, p[j].y * h);
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.ellipse(0.5 * w, 0.16 * h, 0.045 * w, 0.065 * h, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // A thin guide connects the hand to the selected point without implying a radius lock.
      if (target && point) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(point.x * w, point.y * h);
        ctx.lineTo(target.x * w, target.y * h);
        ctx.stroke();
        ctx.restore();

      }

      // MediaPipe Body Skeleton & Thai Sen Sib Lines for Camera Mode
      if (mode === 'camera' && bodyTracked && poseRef.current && poseRef.current.length > 0) {
        ctx.save();
        const p = poseRef.current.map(point => projectPoint(point, projection));

        // 1. Thai Sen Sib Meridian Energy Lines (เส้นประธานสิบตามหลักแพทย์แผนไทย)
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.50)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);

        // เส้นอิทา-ปิงคลา (แนวคอ-ศีรษะ-กระดูกสันหลัง)
        if (p[0] && p[11] && p[12]) {
          const midShoulderX = ((1 - p[11].x) + (1 - p[12].x)) / 2 * w;
          const midShoulderY = (p[11].y + p[12].y) / 2 * h;
          ctx.beginPath();
          ctx.moveTo((1 - p[0].x) * w, p[0].y * h);
          ctx.lineTo(midShoulderX, midShoulderY);
          if (p[23] && p[24]) {
            const midHipX = ((1 - p[23].x) + (1 - p[24].x)) / 2 * w;
            const midHipY = (p[23].y + p[24].y) / 2 * h;
            ctx.lineTo(midHipX, midHipY);
          }
          ctx.stroke();
        }

        // เส้นกาลทารี (แนวแขนและขา)
        for (const [i, j] of [
          [11, 13], [13, 15], [12, 14], [14, 16],
          [23, 25], [25, 27], [24, 26], [26, 28]
        ]) {
          if (p[i] && p[j]) {
            ctx.beginPath();
            ctx.moveTo((1 - p[i].x) * w, p[i].y * h);
            ctx.lineTo((1 - p[j].x) * w, p[j].y * h);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);

        // 2. MediaPipe Anatomical Pose Skeleton (33 Landmarks)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2;
        for (const [i, j] of [
          [0, 11], [0, 12],
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
          [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28]
        ]) {
          const visI = p[i]?.visibility !== undefined ? p[i].visibility : 1;
          const visJ = p[j]?.visibility !== undefined ? p[j].visibility : 1;
          if (p[i] && p[j] && visI > 0.12 && visJ > 0.12) {
            ctx.beginPath();
            ctx.moveTo((1 - p[i].x) * w, p[i].y * h);
            ctx.lineTo((1 - p[j].x) * w, p[j].y * h);
            ctx.stroke();
          }
        }

        // Landmark Joint Nodes
        for (const idx of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
          const vis = p[idx]?.visibility !== undefined ? p[idx].visibility : 1;
          if (p[idx] && vis > 0.12) {
            ctx.beginPath();
            ctx.arc((1 - p[idx].x) * w, p[idx].y * h, idx === 0 ? 4 : 3, 0, Math.PI * 2);
            ctx.fillStyle = idx === 0 ? '#38bdf8' : '#38bdf8';
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // MediaPipe Hand Skeleton & Landmarks Drawing for Camera Mode
      if (mode === 'camera') {
        for (const track of focusedHands) drawHandOverlay(ctx, [track.landmarks.map(p => projectPoint({ ...p, x: 1 - p.x }, projection))], w, h, track.state === 'valid');
      }
      if (mode === 'demo' && s.auto && point) drawHandOverlay(ctx, [demoHand(point, screenRatio)], w, h, current === 'valid');
      const secondDemoPoint = mode === 'demo' && s.auto && point && handFocusCount === 2
        ? { x: point.x + (target.x > .5 ? -.14 : .14), y: point.y } : null;
      if (secondDemoPoint) drawHandOverlay(ctx, [demoHand(secondDemoPoint, screenRatio)], w, h, current === 'valid');

      // Draw target markers last, above the body/hand wireframes and laser beams.
      drawTargetOverlay(ctx, {
        targets: nodes.map((n, i) => {
          const position = displayedTargets[i];
          const profile = targetProfile(n);
          const a = activePose[profile.axis[0]], b = activePose[profile.axis[1]];
          const axis = a && b ? { x: (mode === 'camera' ? -1 : 1) * (b.x - a.x) * projection.sx * w, y: (b.y - a.y) * projection.sy * h } : { x: 0, y: 1 };
          return { node: { ...n, axis, sideLabel: targetSide(n) }, point: position };
        }),
        activeIndex: s.index, progress: Math.min(1, s.valid / (curTotal * 1000)),
        width: w, height: h, time, tracked: targetTracked,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
      // Orange identifies the detected hand, independently of the red body guide.
      if (mode === 'camera') {
        focusedHands.forEach(track => {
          const hand = track.landmarks;
          const key = Number.isInteger(track.evaluated.key) ? track.evaluated.key : 9;
          const marker = projectPoint({ ...hand[key], x: 1 - hand[key].x }, projection);
          const trail = (track.histories[key] || []).filter(p => time - p.time < 600).map(p => ({ x: p.x, y: p.y * screenRatio }));
          const label = `มือ ${track.slot + 1} · ${track.state === 'valid' ? current === 'valid' ? 'กำลังนับ' : 'ทิศทางผ่าน' : ['direction', 'counter-clockwise'].includes(track.state) ? 'ผิดทิศ' : track.state === 'paused' ? 'พัก' : 'รอการเคลื่อน'}`;
          drawHandMarker(ctx, marker, w, h, { trail, counting: track.state === 'valid', label });
        });
      } else if (point) {
        drawHandMarker(ctx, point, w, h, { trail: historyRef.current.filter(p => time - p.time < 600), counting: current === 'valid', demo: true });
        if (secondDemoPoint) drawHandMarker(ctx, secondDemoPoint, w, h, { demo: true, label: 'มือจำลอง 2' });
      }
      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); clearTimeout(completionTimerRef.current); };
  }, [nodes, mode, loading, error, onFinishSession, category, resetVersion, handFocusCount]);

  const resetCurrent = () => {
    sound.playClick();
    clearTimeout(completionTimerRef.current);
    stateRef.current = {
      index: 0,
      valid: 0,
      paused: false,
      auto: false,
      done: false,
      hadContact: false,
      motionAccepted: false,
      phase: 0
    };
    historyRef.current = [];
    handFocusTracksRef.current = [];
    lastHandSampleRef.current = 0;
    setHandCount(0);
    setCalibrating(false);
    setCalibrationMessage('');
    metricsRef.current = emptyMetrics();
    startTimeRef.current = performance.now();
    setIndex(0);
    setPaused(false);
    setAutoDemo(false);
    setStatus('no-hand');
    const firstSeconds = nodes[0]?.seconds || 15;
    setRemaining(mode === 'demo' ? Math.min(firstSeconds, 8) : firstSeconds);
    setResetVersion(value => value + 1);
  };

  const chooseHandFocus = (count = handFocusCount) => {
    handFocusTracksRef.current = [];
    historyRef.current = [];
    lastHandSampleRef.current = 0;
    stateRef.current.motionAccepted = false;
    stateRef.current.hadContact = false;
    setHandCount(0);
    setHandFocusCount(count);
    setStatus(paused ? 'paused' : 'no-hand');
  };

  if (!nodes.length) return <div className="workspace-panel p-6 m-4">
    <p>ยังไม่มีจุดฝึกสำหรับบริเวณที่เลือก กรุณาเลือกบทเรียนอีกครั้ง</p>
    <button type="button" className="jelly-button mt-4 px-4 py-2" onClick={onBackToDashboard}>เปลี่ยนบทเรียน</button>
  </div>;
  const MotionIcon = activeNode.motion === 'circular' ? RotateCw : activeNode.motion === 'vertical' ? MoveVertical : Activity;
  const progressSeconds = mode === 'demo' ? Math.min(totalSeconds, 8) : totalSeconds;
  const progressRatio = Math.max(0, Math.min(1, (progressSeconds - remaining) / Math.max(1, progressSeconds)));

  return (
    <div className="workspace-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 space-y-3 animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="workspace-heading flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-emerald-200 pb-2.5">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-sky-700 uppercase font-mono mb-0.5">
            AR TRAINING STUDIO / {mode === 'camera' ? 'LIVE CAMERA TRACKING' : 'INTERACTIVE DEMO'}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            ฝึกนวดบริเวณ{activeNode.name} ({activeNode.english})
          </h1>
          <p className="text-xs text-slate-600">
            {category.nameTh || 'ร่างกายท่อนบน'} · ทั้งหมด {nodes.length} ตำแหน่ง
          </p>
        </div>

        <button
          onClick={() => { sound.playClick(); onBackToDashboard(); }}
          className="jelly-button jelly-button-secondary px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-50 text-slate-600 hover:text-slate-900 border border-emerald-200 text-xs font-medium flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <ChevronLeft size={15} />
          <span>เปลี่ยนบทเรียน</span>
        </button>
      </div>

      {/* Main Split Layout: Camera Viewport (Left) + Information Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        
        {/* Left Column (8 cols): Camera / AR Canvas Surface */}
        <div className="lg:col-span-8 space-y-3">
          <div className="workspace-panel p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">จำนวนมือที่โฟกัส</span>
              <div className="flex items-center gap-2" role="group" aria-label="จำนวนมือที่โฟกัส">
                {[1, 2].map(count => <button key={count} type="button" aria-pressed={handFocusCount === count}
                  onClick={() => chooseHandFocus(count)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${handFocusCount === count ? 'bg-pink-100 border-pink-400 text-pink-800 shadow-sm' : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-pink-50'}`}>
                  โฟกัส {count} มือ
                </button>)}
                {mode === 'camera' && <button type="button" onClick={() => chooseHandFocus()} className="text-xs text-sky-700 underline px-2 py-2">เลือกมือใหม่</button>}
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {handFocusCount === 1 ? 'ติดตามมือใกล้จุดฝึกเพียงข้างเดียว อีกมือไม่ส่งผลต่อเวลา หากมือที่เลือกหาย เวลาจะหยุด'
                : 'ติดตามสองมือแยกกัน ต้องเห็นทั้งสองมือและผ่านทิศทางทั้งคู่จึงนับเวลา'}
              {mode === 'camera' ? ' · ยกมือที่ต้องการใกล้จุดฝึก แล้วกด “เลือกมือใหม่” หากเลือกไม่ตรง'
                : handFocusCount === 2 ? ' · เมาส์จำลองได้หนึ่งมือ กด “ดูตัวอย่างการเคลื่อนไหว” เพื่อดูสองมือจำลอง' : ''}
            </p>
          </div>
          
          <div className="camera-surface aspect-[4/3] max-h-[62vh] w-full relative">
            
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className={`w-full h-full object-contain transform -scale-x-100 block absolute inset-0 z-0 ${
                infrared ? 'infrared' : ''
              }`}
            />

            {/* Interactive Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full z-10"
              aria-label="จุดเป้าหมายนวดสีแดง ลูกศรแสดงทิศทาง และวงติดตามมือสีส้ม"
              onPointerDown={(e) => {
                if (mode === 'camera' && stateRef.current.calibrating) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const n = nodes[stateRef.current.index];
                  const base = baseTargetsRef.current[n.id];
                  if (!base || !targetReady) return;
                  const selected = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
                  const ratio = rect.width / rect.height;
                  if (Math.hypot(selected.x - base.x, (selected.y - base.y) / ratio) > .15) {
                    setCalibrationMessage('เลือกใกล้บริเวณที่กำลังฝึก หากจุดอยู่ไกล ให้จัดกล้องใหม่');
                    return;
                  }
                  targetAdjustmentsRef.current[n.id] = targetAdjustment(base, selected, ratio);
                  historyRef.current = [];
                  handFocusTracksRef.current.forEach(track => { if (track) { track.histories = {}; track.accepted = false; } });
                  stateRef.current.hadContact = false;
                  stateRef.current.motionAccepted = false;
                  setCalibrating(false);
                  setCalibrationMessage('ปรับจุดแล้ว · ตำแหน่งจะขยับตามบริเวณร่างกายที่เลือก');
                  return;
                }
                if (mode !== 'demo' || autoDemo) return;
                const r = e.currentTarget.getBoundingClientRect();
                const time = performance.now();
                historyRef.current.push({
                  x: (e.clientX - r.left) / r.width,
                  y: (e.clientY - r.top) / r.height,
                  time
                });
                lastPointerRef.current = time;
              }}
              onPointerMove={(e) => {
                if (mode !== 'demo' || autoDemo) return;
                const r = e.currentTarget.getBoundingClientRect();
                const time = performance.now();
                historyRef.current.push({
                  x: (e.clientX - r.left) / r.width,
                  y: (e.clientY - r.top) / r.height,
                  time
                });
                lastPointerRef.current = time;
              }}
              onPointerLeave={() => {
                if (mode === 'demo' && !autoDemo) {
                  historyRef.current = [];
                  lastPointerRef.current = 0;
                }
              }}
            />

            {/* HUD Overlay Top */}
            <div className="camera-overlay-top">
              <span className="flex items-center space-x-1.5 font-mono">
                <ScanLine size={15} />
                <span>{mode === 'demo' ? 'โหมดสาธิต · DEMO' : 'กล้องจริง · LIVE'}</span>
              </span>
              <span className="font-mono">
                {index + 1} / {nodes.length} POINTS
              </span>
            </div>
            <div className={`absolute top-12 left-3 z-20 rounded-lg px-3 py-1.5 text-xs font-semibold border ${handCount > 0 ? 'bg-slate-950/85 border-cyan-300 text-cyan-200' : 'bg-slate-950/85 border-slate-500 text-white'}`} role="status" aria-live="polite">
              {mode === 'demo' ? `✋ มือจำลอง ${handCount}/${handFocusCount} · ${handCount ? 'กำลังติดตาม' : 'รอการเคลื่อน'}`
                : handCount > 0 ? `✋ โฟกัส ${handCount}/${handFocusCount} มือ · วงส้มติดตามมือ` : '✋ ไม่พบมือที่โฟกัส · เวลาหยุด'}
            </div>

            {/* Technical Corner Reticles */}
            <div className="corner top-left" />
            <div className="corner top-right" />
            <div className="corner bottom-left" />
            <div className="corner bottom-right" />

            {/* Loading / Error Overlays */}
            {loading && (
              <div className="absolute inset-0 bg-[#091812]/90 z-30 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <LoadingIndicator size="large" tone="white" label="กำลังเตรียมกล้องและโมเดล MediaPipe" />
                <h3 className="text-base font-bold text-white">กำลังเตรียมกล้องและโมเดล MediaPipe</h3>
                <p className="text-xs text-slate-300 max-w-xs">
                  ระบบกำลังโหลดโมเดล Pose Full และ Hand Landmarker
                </p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 bg-[#120808]/90 z-30 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Camera size={36} className="text-amber-400" />
                <h3 className="text-base font-bold text-white">ยังเปิดกล้องไม่ได้</h3>
                <p className="text-xs text-slate-300 max-w-sm">{error}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => { setError(''); setLoading(true); }}
                    className="jelly-button px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    ลองอีกครั้ง
                  </button>
                  <button
                    onClick={() => { setError(''); setLoading(false); setMode('demo'); }}
                    className="jelly-button px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    สลับไปใช้โหมดสาธิต (Interactive Mouse / Demo)
                  </button>
                </div>
              </div>
            )}

            {/* Floating Tracking Status Pill */}
            <div className={`tracking-status ${status === 'valid' ? 'valid' : ''}`}>
              <span className="status-indicator" />
              <span>{getStatusMessage(status, activeNode)}</span>
            </div>

          </div>

          {/* Session Controls Under Camera */}
          <div className="workspace-panel p-4 rounded-2xl bg-white border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { sound.playClick(); setPaused(p => !p); }}
                className="jelly-button px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                {paused ? <Play size={15} className="fill-current" /> : <Pause size={15} />}
                <span>{paused ? 'ฝึกต่อ (Resume)' : 'หยุดชั่วคราว (Pause)'}</span>
              </button>

              <button
                onClick={resetCurrent}
                className="jelly-button jelly-button-secondary jelly-button-icon p-2 rounded-xl bg-emerald-50 hover:bg-emerald-50 text-slate-600 hover:text-slate-900 border border-emerald-200 text-xs transition-all"
                title="เริ่มใหม่"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={() => { sound.playClick(); onBackToDashboard(); }}
                className="jelly-button jelly-button-secondary jelly-button-icon p-2 rounded-xl bg-emerald-50 hover:bg-emerald-50 text-slate-600 hover:text-slate-900 border border-emerald-200 text-xs transition-all"
                title="กลับหน้าหลัก"
              >
                <Home size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {mode === 'camera' && (
                <>
                  <button type="button" disabled={!targetReady || loading || !!error}
                    className="jelly-button jelly-button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                    aria-pressed={calibrating}
                    onClick={() => { historyRef.current = []; handFocusTracksRef.current.forEach(track => { if (track) { track.histories = {}; track.accepted = false; } }); stateRef.current.motionAccepted = false; setCalibrating(v => !v); setCalibrationMessage(''); }}>
                    {calibrating ? 'ยกเลิกปรับจุด' : 'ปรับจุดให้ตรงร่างกาย'}
                  </button>
                  <button type="button" className="text-sky-700 underline text-xs"
                    onClick={() => { delete targetAdjustmentsRef.current[activeNode.id]; historyRef.current = []; handFocusTracksRef.current.forEach(track => { if (track) { track.histories = {}; track.accepted = false; } }); stateRef.current.motionAccepted = false; setCalibrating(false); setCalibrationMessage('คืนตำแหน่งที่ตรวจจับแล้ว'); }}>
                    คืนตำแหน่งอัตโนมัติ
                  </button>
                </>
              )}
              {/* Toggle Mode Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setMode(m => {
                    const next = m === 'camera' ? 'demo' : 'camera';
                    if (next === 'demo') {
                      setLoading(false);
                      setError('');
                    } else {
                      setLoading(true);
                    }
                    return next;
                  });
                }}
                className="jelly-button jelly-button-secondary px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-50 text-sky-700 border border-emerald-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                {mode === 'camera' ? <MousePointer2 size={14} /> : <Camera size={14} />}
                <span>{mode === 'camera' ? 'สลับเป็นโหมดเมาส์ (Demo)' : 'สลับเป็นกล้องจริง (AR)'}</span>
              </button>

              {mode === 'demo' ? (
                <button
                  className="jelly-button jelly-button-secondary px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  onClick={() => {
                    sound.playClick();
                    historyRef.current = [];
                    setAutoDemo(a => !a);
                  }}
                >
                  <Sparkles size={14} />
                  <span>{autoDemo ? 'ใช้เมาส์ฝึกเอง' : 'ดูตัวอย่างการเคลื่อนไหว'}</span>
                </button>
              ) : (
                <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infrared}
                    onChange={(e) => setInfrared(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>ฟิลเตอร์อินฟราเรด</span>
                </label>
              )}
            </div>

          </div>

          {/* Hint bar */}
          {mode === 'camera' && (
            <div className="workspace-panel p-3 text-xs text-slate-700 space-y-1" role="status">
              <p className="font-semibold">{activeNode.name} · {targetSide(activeNode)}</p>
              <p>{targetGuidance(activeNode)}</p>
              {!targetReady && <p className="font-semibold text-amber-700">ยังไม่เห็นจุดอ้างอิงชัด จัดกล้องเพื่อให้วงแนะนำกลับมาแสดง การตรวจทิศทางมือทำงานแยกจากวงแนะนำ</p>}
              <p className="text-slate-500">จุดจากกล้องเป็นตำแหน่งประมาณของบริเวณที่เลือก ตรวจด้านหน้า/หลังให้ตรงก่อนนวด หากคลาดเคลื่อน ใช้ “ปรับจุดให้ตรงร่างกาย”</p>
              {calibrating && <p className="font-semibold text-pink-700">แตะจุดบนร่างกายในภาพเพื่อปรับศูนย์กลางวง เวลาฝึกหยุดระหว่างปรับ</p>}
              {calibrationMessage && <p className="text-sky-700">{calibrationMessage}</p>}
            </div>
          )}
          <div className="flex items-center space-x-2 text-xs text-slate-600 px-1">
            <Hand size={16} className="text-sky-700 shrink-0" />
            <span>
              {mode === 'demo'
                ? 'ขยับเมาส์วน/ขึ้นลงตามลูกศร หรือคลิก "ดูตัวอย่างการเคลื่อนไหว" เพื่อดูการฝึกอัตโนมัติ'
                : 'ยกมือเข้าใกล้จุดเป้าหมาย ให้เห็นมือและบริเวณที่ฝึกชัดเจนผ่านกล้อง'}
              <span className="text-slate-500 ml-1">(วงส้ม: มือที่ตรวจพบ · รอยส้ม: การเคลื่อนมือ · แดง: จุดนวด · เขียว: สำเร็จ · ไม่บังคับรัศมี)</span>
            </span>
          </div>

        </div>

        {/* Right Column (4 cols): Information Panel & Conic Timer Ring */}
        <div className="lg:col-span-4 space-y-3">
          
          <div className="workspace-panel p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-3.5">
            
            {/* Target Title Card */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-700 font-bold block mb-1">
                CURRENT TARGET · จุดที่กำลังฝึก
              </span>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-mono font-bold text-sky-700 text-xs shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {activeNode.name} · {targetSide(activeNode)}
                  </h3>
                  <small className="text-[11px] text-slate-600 font-mono">
                    {activeNode.english}
                  </small>
                </div>
              </div>

              {/* Muscle Focus Card */}
              {activeNode.muscle && (
                <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 font-medium block text-[9px]">กล้ามเนื้อที่โฟกัส:</span>
                    <span className="font-bold text-slate-800 text-[11px]">{activeNode.muscle}</span>
                  </div>
                </div>
              )}
            </div>

            {/* SENSA Conic Timer Ring */}
            <div className="flex flex-col items-center justify-center py-1">
              <div
                className="timer-ring-container shadow-lg"
                style={{
                  background: `conic-gradient(${
                    remaining <= totalSeconds / 2 ? '#f59e0b' : '#10b981'
                  } ${progressRatio * 360}deg, #163628 0deg)`
                }}
              >
                <div className="timer-ring-inner">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {Math.ceil(remaining).toString().padStart(2, '0')}
                  </span>
                  <small className="text-[10px] text-sky-700 font-medium">{paused ? 'หยุดชั่วคราว · กดฝึกต่อ' : 'วินาทีที่เหลือ'}</small>
                </div>
              </div>
            </div>

            {/* Motion Technique Guide */}
            <div className="workspace-panel p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-sky-800 shrink-0">
                  <MotionIcon size={22} />
                </div>
                <div>
                  <b className="text-xs font-bold text-slate-900 block">
                    {motionInfo[activeNode.motion]?.name || 'นวดคลึงวน'}
                  </b>
                  <small className="text-[11px] text-slate-600 font-mono">
                    {motionInfo[activeNode.motion]?.english}
                  </small>
                </div>
              </div>

              {/* Technique Guidance */}
              <p className="text-xs text-slate-700 leading-relaxed font-normal pt-1 border-t border-emerald-200/60">
                {activeNode.techniqueGuide || motionInfo[activeNode.motion]?.instruction}
              </p>

              {activeNode.motion === 'circular' && (
                <div className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-semibold">
                  <RotateCw size={12} className="shrink-0" />
                  <span>ต้องวนตามเข็มนาฬิกาเท่านั้น (วนทวนเข็มเวลาจะหยุด)</span>
                </div>
              )}
            </div>

            {/* Target Points Checklist */}
            <div className="space-y-2 border-t border-emerald-200 pt-4">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                ลำดับจุดฝึก ({nodes.length} ตำแหน่ง):
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {nodes.map((n, i) => {
                  const isDone = i < index;
                  const isCurrent = i === index;

                  return (
                    <div
                      key={n.id}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-emerald-50 text-sky-700 border border-emerald-600/50 font-semibold'
                          : isDone
                            ? 'bg-emerald-50 text-sky-700/80 border border-emerald-200'
                            : 'bg-emerald-50 text-slate-500 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isDone ? 'bg-emerald-500 text-slate-950 font-bold' : isCurrent ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-emerald-50 text-slate-600'
                        }`}>
                          {isDone ? <Check size={11} /> : i + 1}
                        </span>
                        <span>{n.name} · {targetSide(n)}</span>
                      </div>
                      <small className="font-mono text-[10px]">
                        {isDone ? 'สำเร็จ' : isCurrent ? 'กำลังฝึก' : `${n.seconds} วิ`}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer timer alert explanation */}
            <div className="text-[11px] text-slate-600 flex items-start space-x-1.5 pt-2 border-t border-emerald-200">
              <Clock3 size={14} className="text-sky-700 shrink-0 mt-0.5" />
              <span>เริ่มนับเมื่อตรวจพบมือเคลื่อนตามลูกศร เวลาหยุดเมื่อตรวจไม่พบมือหรือทิศทางผิด ไม่จำกัดรัศมี และหยุดได้ด้วยปุ่ม Pause</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

// The REAL pose detector (layer 1): Google's MediaPipe PoseLandmarker
// (33 landmarks, the same model native apps use) running as WebAssembly
// inside a WebView, analysing the live camera feed frame by frame.
//
// Why a WebView? Expo Go cannot run native pose detection (that needs a
// development build). WebAssembly runs the genuine model in Expo Go today:
// real camera frames, real inference, ~10-15 fps. The native dev build is
// the later upgrade for 30 fps — the hooks below never change either way.
//
// The page reports landmarks to React with:
//   postMessage({ type: 'pose', landmarks: [...33 {x,y,z,visibility}] | null, w, h })
// and errors with: postMessage({ type: 'error', message })

// MediaPipe drawing connections (landmark index pairs) for the on-canvas
// skeleton, mirroring src/camera/landmarks.js SKELETON_CONNECTIONS.
var CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [0, 11], [0, 12],
];

export function buildPoseHtml() {
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>html,body{margin:0;padding:0;background:#000;overflow:hidden;height:100%}',
    'video,c{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}</style></head><body>',
    '<video id="v" playsinline autoplay muted></video>',
    '<canvas id="c"></canvas>',
    '<script type="module">',
    'var MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";',
    'var WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";',
    'var LIB = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";',
    'var CONN = ' + JSON.stringify(CONNECTIONS) + ';',
    'function send(obj) { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }',
    'function fail(msg) { send({ type: "error", message: msg }); }',
    'var outline = null;',
    'window.setOutline = function (o) { outline = o; };',
    'async function init() {',
    '  try {',
    '    var vision = await import(LIB);',
    '    var fileset = await vision.FilesetResolver.forVisionTasks(WASM);',
    '    var landmarker = null;',
    '    try {',
    '      landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {',
    '        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },',
    '        runningMode: "VIDEO", numPoses: 1 });',
    '    } catch (e) {',
    '      landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {',
    '        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },',
    '        runningMode: "VIDEO", numPoses: 1 });',
    '    }',
    '    var stream = await navigator.mediaDevices.getUserMedia({',
    '      video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } }, audio: false });',
    '    var v = document.getElementById("v");',
    '    var c = document.getElementById("c");',
    '    var ctx = c.getContext("2d");',
    '    v.srcObject = stream;',
    '    await v.play();',
    '    send({ type: "ready", w: v.videoWidth, h: v.videoHeight });',
    '    var lastSent = 0;',
    '    function loop() {',
    '      var now = performance.now();',
    '      if (v.readyState >= 2 && v.videoWidth > 0) {',
    '        if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }',
    '        var res = landmarker.detectForVideo(v, Math.round(now));',
    '        ctx.clearRect(0, 0, c.width, c.height);',
    '        var lms = res && res.landmarks && res.landmarks.length ? res.landmarks[0] : null;',
    '        if (lms) {',
    '          drawSkeleton(lms, c, ctx);',
    '          if (now - lastSent > 90) { lastSent = now; send({ type: "pose", landmarks: lms, w: v.videoWidth, h: v.videoHeight }); }',
    '        } else if (now - lastSent > 500) { lastSent = now; send({ type: "pose", landmarks: null, w: v.videoWidth, h: v.videoHeight }); }',
    '        if (outline && outline.visible) drawOutline(outline, c, ctx);',
    '      }',
    '      requestAnimationFrame(loop);',
    '    }',
    '    requestAnimationFrame(loop);',
    '  } catch (err) {',
    '    fail("Pose engine: " + (err && err.message ? err.message : String(err)));',
    '  }',
    '}',
    'function drawSkeleton(lms, c, ctx) {',
    '  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(77,232,255,0.9)";',
    '  for (var i = 0; i < CONN.length; i++) {',
    '    var a = lms[CONN[i][0]], b = lms[CONN[i][1]];',
    '    if (!a || !b) continue;',
    '    ctx.beginPath(); ctx.moveTo(a.x * c.width, a.y * c.height); ctx.lineTo(b.x * c.width, b.y * c.height); ctx.stroke();',
    '  }',
    '  ctx.fillStyle = "#7dff9b";',
    '  for (var j = 0; j < lms.length; j++) {',
    '    if ((lms[j].visibility === undefined ? 1 : lms[j].visibility) > 0.5) {',
    '      ctx.beginPath(); ctx.arc(lms[j].x * c.width, lms[j].y * c.height, 3, 0, 7); ctx.fill();',
    '    }',
    '  }',
    '}',
    'function drawOutline(o, c, ctx) {',
    '  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(47,123,255,0.85)";',
    '  for (var i = 0; i < o.connections.length; i++) {',
    '    var pa = o.points[o.connections[i][0]], pb = o.points[o.connections[i][1]];',
    '    if (!pa || !pb) continue;',
    '    ctx.beginPath(); ctx.moveTo(pa.x * c.width, pa.y * c.height); ctx.lineTo(pb.x * c.width, pb.y * c.height); ctx.stroke();',
    '  }',
    '  ctx.beginPath();',
    '  ctx.ellipse(o.head.cx * c.width, o.head.cy * c.height, o.head.rx * c.width, o.head.ry * c.height, 0, 0, 7);',
    '  ctx.stroke();',
    '}',
    'init();',
    '</script></body></html>',
  ].join('\n');
}

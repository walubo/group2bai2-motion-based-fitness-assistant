// Landmark indexes follow the MediaPipe Pose model (33 landmarks).
// Coordinates are normalized: x and y are 0..1 across the camera frame.

export const LANDMARK_COUNT = 33;

export const LM = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Body parts the System must see before a workout can start.
// "soft" parts (small and noisy) use a lower visibility threshold.
export const BODY_PARTS = {
  head: { label: 'head', points: [LM.NOSE, LM.LEFT_EYE, LM.RIGHT_EYE] },
  torso: {
    label: 'torso',
    points: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
  },
  leftArm: { label: 'left arm', points: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST] },
  rightArm: { label: 'right arm', points: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST] },
  leftHand: { label: 'left hand', points: [LM.LEFT_WRIST, LM.LEFT_INDEX], soft: true },
  rightHand: { label: 'right hand', points: [LM.RIGHT_WRIST, LM.RIGHT_INDEX], soft: true },
  leftLeg: { label: 'left leg', points: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE] },
  rightLeg: { label: 'right leg', points: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE] },
  leftFoot: { label: 'left foot', points: [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX], soft: true },
  rightFoot: { label: 'right foot', points: [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX], soft: true },
};

// Joints compared against the T-pose outline.
export const KEY_JOINTS = [
  LM.NOSE,
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW,
  LM.RIGHT_ELBOW,
  LM.LEFT_WRIST,
  LM.RIGHT_WRIST,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
  LM.LEFT_KNEE,
  LM.RIGHT_KNEE,
  LM.LEFT_ANKLE,
  LM.RIGHT_ANKLE,
];

// Lines the UI can draw to show the skeleton / outline.
export const SKELETON_CONNECTIONS = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
];

// Some libraries return mirrored coordinates (selfie view) without swapping
// left/right labels. This map lets the outline check work either way.
export const MIRROR_INDEX = {
  [LM.LEFT_SHOULDER]: LM.RIGHT_SHOULDER,
  [LM.RIGHT_SHOULDER]: LM.LEFT_SHOULDER,
  [LM.LEFT_ELBOW]: LM.RIGHT_ELBOW,
  [LM.RIGHT_ELBOW]: LM.LEFT_ELBOW,
  [LM.LEFT_WRIST]: LM.RIGHT_WRIST,
  [LM.RIGHT_WRIST]: LM.LEFT_WRIST,
  [LM.LEFT_HIP]: LM.RIGHT_HIP,
  [LM.RIGHT_HIP]: LM.LEFT_HIP,
  [LM.LEFT_KNEE]: LM.RIGHT_KNEE,
  [LM.RIGHT_KNEE]: LM.LEFT_KNEE,
  [LM.LEFT_ANKLE]: LM.RIGHT_ANKLE,
  [LM.RIGHT_ANKLE]: LM.LEFT_ANKLE,
};

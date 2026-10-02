// TEMPORARY screen: live front camera + T-pose outline + System status.
//
// Real body detection needs a development build and a pose library (not Expo Go).
// Until then, the buttons at the bottom SIMULATE what the System would detect,
// so you can see how the scan reacts. The camera preview and outline are real.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';
import useTPoseCalibration from '../hooks/useTPoseCalibration';
import { KEY_JOINTS, LM, SKELETON_CONNECTIONS } from '../camera/landmarks';
import { makeTPose, withArmsDown, withBentKnees, withMissing } from '../camera/mockPose';

const CYAN = '#4de8ff';
const GREEN = '#7dff9b';
const RED = '#ff5c7a';
const PURPLE = '#a855f7';

const MODES = [
  { key: 'none', label: 'No detection' },
  { key: 'perfect', label: 'Perfect T-pose' },
  { key: 'armsDown', label: 'Arms down' },
  { key: 'bentKnees', label: 'Bent knees' },
  { key: 'feetHidden', label: 'Feet hidden' },
  { key: 'tooFar', label: 'Too far' },
];

const STATUS_LABEL = {
  WAITING: 'WAITING FOR HUNTER',
  ADJUSTING: 'ADJUST YOUR POSE',
  HOLDING: 'HOLD STILL',
  CALIBRATED: 'CALIBRATION COMPLETE',
};

export default function TPoseScanScreen({ onBack }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState('none');

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 9 / 16;

  const poses = useMemo(() => {
    const perfect = makeTPose(aspect);
    return {
      none: null,
      perfect,
      armsDown: withArmsDown(perfect, aspect),
      bentKnees: withBentKnees(perfect, aspect),
      feetHidden: withMissing(perfect, [
        LM.LEFT_ANKLE,
        LM.RIGHT_ANKLE,
        LM.LEFT_HEEL,
        LM.RIGHT_HEEL,
        LM.LEFT_FOOT_INDEX,
        LM.RIGHT_FOOT_INDEX,
      ]),
      tooFar: makeTPose(aspect, { scale: 0.6 }),
    };
  }, [aspect]);

  const landmarks = poses[mode];
  const scan = useTPoseCalibration(landmarks, { aspect });

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>The System needs camera access to scan you, Hunter.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const W = size.width;
  const H = size.height;
  const tpl = scan.template;
  const locked = scan.status === 'HOLDING' || scan.status === 'CALIBRATED';
  const outlineColor = locked ? GREEN : CYAN;

  return (
    <View style={styles.screen} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      {W > 0 && (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          {tpl.connections.map(([a, b]) => (
            <Line
              key={`o-${a}-${b}`}
              x1={tpl.points[a].x * W}
              y1={tpl.points[a].y * H}
              x2={tpl.points[b].x * W}
              y2={tpl.points[b].y * H}
              stroke={outlineColor}
              strokeWidth={3}
              strokeOpacity={0.85}
            />
          ))}
          <Ellipse
            cx={tpl.head.x * W}
            cy={tpl.head.y * H}
            rx={tpl.head.rx * W}
            ry={tpl.head.ry * H}
            stroke={outlineColor}
            strokeWidth={3}
            strokeOpacity={0.85}
            fill="none"
          />

          {landmarks &&
            SKELETON_CONNECTIONS.map(([a, b]) => (
              <Line
                key={`s-${a}-${b}`}
                x1={landmarks[a].x * W}
                y1={landmarks[a].y * H}
                x2={landmarks[b].x * W}
                y2={landmarks[b].y * H}
                stroke={PURPLE}
                strokeWidth={2}
              />
            ))}
          {landmarks &&
            KEY_JOINTS.map((i) => (
              <Circle
                key={`j-${i}`}
                cx={landmarks[i].x * W}
                cy={landmarks[i].y * H}
                r={7}
                fill={scan.fit && scan.fit.perJoint[i] && scan.fit.perJoint[i].ok ? GREEN : RED}
              />
            ))}
        </Svg>
      )}

      <View style={styles.top}>
        <Text style={styles.title}>SYSTEM SCAN: T-POSE</Text>
        <Text style={styles.status}>{STATUS_LABEL[scan.status]}</Text>
        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: `${Math.round(scan.progress * 100)}%` }]} />
        </View>
        <Text style={styles.message}>{scan.message}</Text>
        {scan.calibration && <Text style={styles.saved}>Body profile saved.</Text>}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.note}>
          Live body detection needs a development build. For now, tap a button to simulate what the
          System detects.
        </Text>
        <View style={styles.row}>
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              style={[styles.chip, m.key === mode && styles.chipActive]}
              onPress={() => {
                scan.reset();
                setMode(m.key);
              }}
            >
              <Text style={styles.chipText}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={scan.reset}>
            <Text style={styles.buttonText}>Restart scan</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onBack}>
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#05080f', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16, paddingTop: 48, backgroundColor: 'rgba(5,8,15,0.7)' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 28, backgroundColor: 'rgba(5,8,15,0.7)', gap: 8 },
  title: { color: CYAN, fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  status: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  barOuter: { height: 8, backgroundColor: '#12203a', borderRadius: 4, marginVertical: 8 },
  barInner: { height: 8, backgroundColor: GREEN, borderRadius: 4 },
  message: { color: '#fff', fontSize: 15 },
  saved: { color: GREEN, marginTop: 4 },
  note: { color: '#a9b8d0', fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: CYAN, borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#0b3a4a' },
  chipText: { color: CYAN, fontSize: 13 },
  button: { borderColor: CYAN, borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 18 },
  buttonText: { color: CYAN, fontSize: 14 },
});

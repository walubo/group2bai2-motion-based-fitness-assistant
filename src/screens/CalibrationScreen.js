// SYSTEM SCAN: BODY CALIBRATION — new-design camera screen around the tested
// useTPoseCalibration hook. The Hunter fits the T-pose outline; when held the
// System locks their body profile. Real body detection needs a development
// build, so the buttons at the bottom simulate what the System detects.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';
import useTPoseCalibration from '../hooks/useTPoseCalibration';
import { KEY_JOINTS, LM, SKELETON_CONNECTIONS } from '../camera/landmarks';
import { makeTPose, withArmsDown, withBentKnees, withMissing } from '../camera/mockPose';
import { colors, spacing, fonts } from '../theme/theme';
import { GlowPressable, FadeSlideIn } from '../components/fx/SystemFX';

const SIM = [
  { key: 'none', label: 'No detection', make: () => null },
  { key: 'perfect', label: 'Perfect T-pose', make: (a) => makeTPose(a) },
  { key: 'armsDown', label: 'Arms down', make: (a) => withArmsDown(makeTPose(a), a) },
  { key: 'bentKnees', label: 'Bent knees', make: (a) => withBentKnees(makeTPose(a), a) },
  {
    key: 'feetHidden',
    label: 'Feet hidden',
    make: (a) =>
      withMissing(makeTPose(a), [LM.LEFT_ANKLE, LM.RIGHT_ANKLE, LM.LEFT_HEEL, LM.RIGHT_HEEL, LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX]),
  },
  { key: 'tooFar', label: 'Too far', make: (a) => makeTPose(a, { scale: 0.6 }) },
];

const STATUS_LABEL = {
  WAITING: 'WAITING FOR HUNTER',
  ADJUSTING: 'ADJUST YOUR POSE',
  HOLDING: 'HOLD STILL',
  CALIBRATED: 'BODY PROFILE LOCKED',
};

export default function CalibrationScreen({ onBack }) {
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
      feetHidden: SIM[4].make(aspect),
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
        <GlowPressable glowColor={colors.blueLight} onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>ALLOW CAMERA</Text>
        </GlowPressable>
        <GlowPressable glowColor={colors.mutedText} onPress={onBack} style={styles.button}>
          <Text style={[styles.buttonText, { color: colors.mutedText }]}>BACK</Text>
        </GlowPressable>
      </View>
    );
  }

  const W = size.width;
  const H = size.height;
  const tpl = scan.template;
  const locked = scan.status === 'HOLDING' || scan.status === 'CALIBRATED';
  const outlineColor = locked ? colors.success : colors.blue;

  return (
    <View style={styles.screen} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      {W > 0 && tpl && (
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
                stroke={colors.blueLight}
                strokeWidth={2}
                strokeOpacity={0.7}
              />
            ))}
          {landmarks &&
            KEY_JOINTS.map((i) => (
              <Circle
                key={`j-${i}`}
                cx={landmarks[i].x * W}
                cy={landmarks[i].y * H}
                r={6}
                fill={scan.fit && scan.fit.perJoint[i] && scan.fit.perJoint[i].ok ? colors.success : colors.danger}
              />
            ))}
        </Svg>
      )}

      <FadeSlideIn style={styles.hud}>
        <View style={styles.hudInner}>
          <Text style={styles.title}>SYSTEM SCAN</Text>
          <Text style={[styles.status, locked && { color: colors.success }]}>{STATUS_LABEL[scan.status]}</Text>
          <View style={styles.barOuter}>
            <View style={[styles.barInner, { transform: [{ scaleX: Math.min(1, scan.progress) }] }]} />
          </View>
          <Text style={styles.message}>{scan.message}</Text>
          {scan.calibration && <Text style={styles.locked}>{'> Body profile saved.'}</Text>}
        </View>
      </FadeSlideIn>

      <View style={styles.controls}>
        <Text style={styles.note}>
          Real detection needs a development build — tap a chip to simulate the Hunter.
        </Text>
        <View style={styles.chipRow}>
          {SIM.map((s) => (
            <Pressable
              key={s.key}
              style={[styles.chip, s.key === mode && styles.chipActive]}
              onPress={() => {
                scan.reset();
                setMode(s.key);
              }}
            >
              <Text style={styles.chipText}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <GlowPressable glowColor={colors.mutedText} onPress={scan.reset} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.mutedText }]}>RESTART SCAN</Text>
          </GlowPressable>
          <GlowPressable glowColor={colors.mutedText} onPress={onBack} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.mutedText }]}>BACK</Text>
          </GlowPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  hud: { position: 'absolute', top: 0, left: 0, right: 0 },
  hudInner: { padding: spacing.md, paddingTop: 52, backgroundColor: colors.panelTransparent, borderBottomWidth: 1, borderBottomColor: '#12203a' },
  title: { color: '#ffffff', fontFamily: fonts.heading, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  status: { color: '#ffffff', fontFamily: fonts.display, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  barOuter: { height: 8, backgroundColor: '#0a1630', borderRadius: 4, marginVertical: spacing.sm, overflow: 'hidden' },
  barInner: { height: 8, width: '100%', backgroundColor: colors.blue, borderRadius: 4, transform: [{ scaleX: 0 }] },
  message: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 13 },
  locked: { color: colors.success, fontFamily: fonts.heading, fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.panelTransparent,
    borderTopWidth: 1,
    borderTopColor: '#12203a',
  },
  note: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 11, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: colors.blue, borderWidth: 1, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 11 },
  chipActive: { backgroundColor: colors.blueDeep, borderColor: colors.blueLight },
  chipText: { color: colors.blueLight, fontFamily: fonts.heading, fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: { borderColor: '#12203a', borderWidth: 1, borderRadius: 8, backgroundColor: colors.panel, paddingVertical: 10, paddingHorizontal: 18 },
  buttonText: { fontFamily: fonts.heading, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  message2: { color: colors.mutedText, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
});

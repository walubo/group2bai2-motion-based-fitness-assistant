// Thin UI wrapper (layer 4): renders the WebView that runs the real pose
// engine, and forwards results to the screen. All pose maths stays in the
// hooks — this component only moves data across the WebView bridge.

import { memo, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildPoseHtml } from '../camera/webPoseEngine';

function PoseCameraWeb({ onPose, onError, outline = null, style }) {
  const webRef = useRef(null);
  const handlers = useRef({ onPose, onError });
  handlers.current = { onPose, onError };

  const handleMessage = (event) => {
    let data = null;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return; // ignore stray bridge messages
    }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'pose' && handlers.current.onPose) {
      handlers.current.onPose(data.landmarks || null, { width: data.w, height: data.h });
    } else if (data.type === 'error' && handlers.current.onError) {
      handlers.current.onError(data.message || 'Pose engine error');
    } else if (data.type === 'ready' && handlers.current.onPose) {
      handlers.current.onPose(undefined, { width: data.w, height: data.h }); // size report only
    }
  };

  // Push the T-pose outline (built by the screen from buildTemplate) into the
  // page whenever it changes; the page draws it under/over the skeleton.
  useEffect(() => {
    if (!webRef.current || !outline) return;
    webRef.current.injectJavaScript('window.setOutline(' + JSON.stringify(outline) + '); true;');
  }, [outline]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      // baseUrl gives the page a https://localhost origin — a "secure context",
      // which getUserMedia (camera) requires. Without it the camera API is
      // silently unavailable and the page stays black.
      source={{ html: buildPoseHtml(), baseUrl: 'https://localhost' }}
      style={style || StyleSheet.absoluteFill}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      onPermissionRequest={(event) => {
        event.request.grant(event.request.resources); // WebView asks to open the camera
      }}
      onMessage={handleMessage}
      onError={(e) =>
        handlers.current.onError &&
        handlers.current.onError(e.nativeEvent && e.nativeEvent.description ? e.nativeEvent.description : 'WebView error')
      }
    />
  );
}

export default memo(PoseCameraWeb);

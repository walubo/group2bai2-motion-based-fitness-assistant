// Reusable map component (pure display, layer 4): draws the Hunter's pin and
// route trail on OpenStreetMap tiles inside a WebView, so it works on ANY
// phone — no Google Play Services, no API key, no account. Only internet is
// required (to load the map tiles, like any online map).
//
// All GPS logic lives in useLocationTracking; this component only renders
// what it is given via props: routeCoordinates and location.

import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Leaflet + CARTO's dark basemap (OpenStreetMap data) to match the System look.
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; background: #05080f; }
    /* OpenStreetMap tiles are light; this filter flips them into a dark
       "System panel" map without any API key or paid provider. */
    .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9); }
    .leaflet-control-attribution {
      background: rgba(5,8,15,0.7) !important;
      color: #a9b8d0 !important;
      font-size: 9px;
    }
    .leaflet-control-attribution a { color: #4de8ff !important; }
    /* live pulsing Hunter pin */
    .hunter-pin-wrap { background: transparent; border: none; }
    .pin-dot {
      position: absolute; left: 5px; top: 5px; width: 12px; height: 12px;
      border-radius: 50%; background: #4de8ff; border: 2px solid #ffffff;
      box-shadow: 0 0 10px #4de8ff;
    }
    .pin-ring {
      position: absolute; width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid #4de8ff;
      animation: hunter-pulse 1.6s ease-out infinite;
    }
    @keyframes hunter-pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.7); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 16);
    // Primary OSM tile server with an automatic failover mirror: if the
    // primary rate-limits or times out, the whole map switches to the mirror
    // without the Hunter noticing.
    var tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    var tileErrors = 0;
    var switched = false;
    tileLayer.on('tileerror', function () {
      tileErrors += 1;
      if (tileErrors >= 3 && !switched) {
        switched = true;
        tileLayer.setUrl('https://tile.openstreetmap.de/{z}/{x}/{y}.png');
      }
    });

    // Trail: a soft glow underlay plus a solid line, so it reads on any map.
    var routeGlow = L.polyline([], { color: '#a855f7', weight: 13, opacity: 0.25 }).addTo(map);
    var route = L.polyline([], { color: '#a855f7', weight: 5, opacity: 1 }).addTo(map);
    var hunter = null; // the Hunter's live pulsing pin
    var userMoved = false; // set only by REAL user gestures
    var autoZoom = false; // guards zoomstart during our own animated zooms

    map.on('zoomstart', function () { if (!autoZoom) userMoved = true; });
    map.on('dragstart', function () { userMoved = true; });

    // center must be a Leaflet latlng array [lat, lng] — the React side
    // converts {latitude, longitude} objects before injecting.
    function ensurePin(center) {
      if (!hunter) {
        hunter = L.marker(center, {
          icon: L.divIcon({
            className: 'hunter-pin-wrap',
            html: '<div class="pin-ring"></div><div class="pin-dot"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }).addTo(map);
      } else {
        hunter.setLatLng(center);
      }
      return hunter;
    }

    // CENTER ON ME button: always snaps to the pin at street level and
    // returns the view to auto-follow.
    window.centerOnHunter = function (center) {
      if (!center) return;
      userMoved = false;
      ensurePin(center);
      autoZoom = true;
      map.setView(center, 17, { animate: true });
      setTimeout(function () { autoZoom = false; }, 500);
    };

    // The React side calls this every time new tracking data arrives.
    // points = [[lat, lng], ...] trail; center = [lat, lng] current position.
    window.updateMap = function (points, center) {
      route.setLatLngs(points);
      routeGlow.setLatLngs(points);
      if (!center) return;
      if (!hunter) {
        // First fix: create the pin and zoom to street level once.
        ensurePin(center);
        autoZoom = true;
        map.setView(center, 17, { animate: true });
        setTimeout(function () { autoZoom = false; }, 500);
      } else {
        ensurePin(center);
        // Follow by PANNING ONLY — the Hunter's zoom is never touched.
        if (!userMoved) map.panTo(center, { animate: true });
      }
    };
  </script>
</body>
</html>`;

export default function OsmMap({ routeCoordinates = [], location = null, centerSignal = 0, style }) {
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const dataRef = useRef({ route: [], loc: null });

  // A centerSignal change (from the CENTER ON ME button) re-centers + zooms,
  // creating the pin from the latest known position if it doesn't exist yet.
  useEffect(() => {
    if (!centerSignal || !webRef.current || !readyRef.current) return;
    const loc = dataRef.current.loc;
    if (!loc) return;
    const ctr = [loc.latitude, loc.longitude]; // Leaflet wants [lat, lng]
    webRef.current.injectJavaScript(
      'window.centerOnHunter(' + JSON.stringify(ctr) + '); true;'
    );
  }, [centerSignal]);

  // Sends the latest route + position into the WebView (no reload).
  // Coordinates are converted to Leaflet's [lat, lng] format here — the map
  // side never sees {latitude, longitude} objects.
  const push = useCallback(() => {
    if (!webRef.current || !readyRef.current) return;
    const { route, loc } = dataRef.current;
    const points = route.map((p) => [p.latitude, p.longitude]);
    const ctr = loc ? [loc.latitude, loc.longitude] : null;
    webRef.current.injectJavaScript(
      `window.updateMap(${JSON.stringify(points)}, ${JSON.stringify(ctr)}); true;`
    );
  }, []);

  useEffect(() => {
    dataRef.current = { route: routeCoordinates, loc: location };
    push();
  }, [routeCoordinates, location, push]);

  return (
    <View style={style || StyleSheet.absoluteFill}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: MAP_HTML }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => {
          readyRef.current = true;
          push(); // make sure the map shows data that arrived before it finished loading
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#05080f' },
});

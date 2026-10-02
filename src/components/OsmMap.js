// Reusable map component (pure display, layer 4): draws the Hunter's route on
// OpenStreetMap tiles inside a WebView, so it works on ANY phone — no Google
// Play Services, no API key, no Google account needed. Only internet is
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
    .leaflet-control-attribution {
      background: rgba(5,8,15,0.7) !important;
      color: #a9b8d0 !important;
      font-size: 9px;
    }
    .leaflet-control-attribution a { color: #4de8ff !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 16);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);

    var route = L.polyline([], { color: '#a855f7', weight: 4, opacity: 0.9 }).addTo(map);
    var hunter = null; // the Hunter's position marker, created on the first point

    // The React side calls this every time new tracking data arrives.
    window.updateMap = function (points, center) {
      route.setLatLngs(points);
      if (points.length) {
        var last = points[points.length - 1];
        if (!hunter) {
          hunter = L.circleMarker(last, {
            radius: 7, color: '#4de8ff', weight: 2, fillColor: '#4de8ff', fillOpacity: 1,
          }).addTo(map);
        } else {
          hunter.setLatLng(last);
        }
        if (center) map.setView(last, map.getZoom(), { animate: true });
      }
    };
  </script>
</body>
</html>`;

export default function OsmMap({ routeCoordinates = [], location = null, style }) {
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const dataRef = useRef({ route: [], loc: null });

  // Sends the latest route + position into the WebView (no reload).
  const push = useCallback(() => {
    if (!webRef.current || !readyRef.current) return;
    const { route, loc } = dataRef.current;
    webRef.current.injectJavaScript(
      `window.updateMap(${JSON.stringify(route)}, ${JSON.stringify(loc)}); true;`
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

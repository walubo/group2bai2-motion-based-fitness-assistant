// Layer 1/2 hook: GPS hardware + distance math for jogging/running quests.
// ALL location logic lives here — UI components only read the returned values.
//
// const { location, routeCoordinates, distanceKm, speedKmH, elapsedTimeSec,
//         permissionGranted, errorMsg, resetTracking } = useLocationTracking(isTracking);

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accuracy, hasServicesEnabledAsync, requestForegroundPermissionsAsync, watchPositionAsync,
} from 'expo-location';

// Haversine formula: straight-line distance between two lat/lng points, in km.
export function haversineKm(a, b) {
  const R = 6371; // Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function useLocationTracking(isTracking) {
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [routeCoordinates, setRouteCoordinates] = useState([]); // [{ latitude, longitude }, ...]
  const [distanceKm, setDistanceKm] = useState(0);
  const [speedKmH, setSpeedKmH] = useState(0);
  const [elapsedTimeSec, setElapsedTimeSec] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [servicesEnabled, setServicesEnabled] = useState(true); // phone-level Location toggle
  const [errorMsg, setErrorMsg] = useState(null);

  // Refs hold "moving" values so GPS updates do not need re-renders to be counted.
  const distanceRef = useRef(0);
  const lastPointRef = useRef(null); // last { latitude, longitude }
  const lastTimeRef = useRef(null); // timestamp of the last GPS point

  // Ask for permission once, when the screen first uses the hook.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status } = await requestForegroundPermissionsAsync();
        if (!alive) return;
        if (status === 'granted') {
          setPermissionGranted(true);
          // The phone's master Location toggle being OFF looks exactly like a
          // silent GPS from the app's point of view — check and say so.
          const services = await hasServicesEnabledAsync();
          if (alive) {
            setServicesEnabled(services);
            if (!services) setErrorMsg('Location is turned OFF on this phone. Enable it, then BEGIN QUEST again.');
          }
        } else {
          setErrorMsg('Location permission denied. The System cannot track you, Hunter.');
        }
      } catch (e) {
        if (alive) setErrorMsg(`Location error: ${e.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 1-second quest timer while tracking.
  useEffect(() => {
    if (!isTracking) return undefined;
    const id = setInterval(() => setElapsedTimeSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isTracking]);

  // Continuous GPS updates while tracking.
  useEffect(() => {
    if (!isTracking || !permissionGranted) return undefined;

    let sub = null;
    let cancelled = false;

    (async () => {
      // Re-check the master Location toggle every time tracking starts — the
      // Hunter may have switched it off since the permission was granted.
      const services = await hasServicesEnabledAsync();
      if (cancelled) return;
      setServicesEnabled(services);
      if (!services) {
        setErrorMsg('Location is turned OFF on this phone. Enable it, then BEGIN QUEST again.');
        return;
      }
      setErrorMsg(null);

      sub = await watchPositionAsync(
        { accuracy: Accuracy.High, distanceInterval: 5 }, // update roughly every 5 m
        (pos) => {
          const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setLocation(point);
          setRouteCoordinates((route) => [...route, point]);

          // Add the distance from the previous point to the total.
          const last = lastPointRef.current;
          if (last) distanceRef.current += haversineKm(last, point);
          lastPointRef.current = point;
          setDistanceKm(distanceRef.current);

          // Speed: prefer the GPS chip's own reading (m/s -> km/h);
          // fall back to distance/time of the last segment.
          if (typeof pos.coords.speed === 'number' && pos.coords.speed >= 0) {
            setSpeedKmH(pos.coords.speed * 3.6);
          } else {
            const now = pos.timestamp;
            const dtSec = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0;
            const segKm = last ? haversineKm(last, point) : 0;
            if (dtSec > 0) setSpeedKmH((segKm / dtSec) * 3600);
          }
          lastTimeRef.current = pos.timestamp;
        }
      );
      if (cancelled && sub) sub.remove();
    })();

    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [isTracking, permissionGranted]);

  // Clears the run data (used by RESET QUEST or when starting over).
  const resetTracking = useCallback(() => {
    distanceRef.current = 0;
    lastPointRef.current = null;
    lastTimeRef.current = null;
    setRouteCoordinates([]);
    setDistanceKm(0);
    setSpeedKmH(0);
    setElapsedTimeSec(0);
  }, []);

  return {
    location, // current position for the map marker
    routeCoordinates, // array for the map Polyline
    distanceKm, // cumulative distance, km
    speedKmH, // current speed, km/h
    elapsedTimeSec, // seconds tracked
    permissionGranted,
    servicesEnabled, // is the phone's master Location toggle ON?
    errorMsg,
    resetTracking,
  };
}

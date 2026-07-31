import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { HangoutEvent } from '@/types/event';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
};

export type ProjectedPoint = { id: string; x: number; y: number };

type Props = {
  events: HangoutEvent[];
  region: Region;
  onSelectEvent: (event: HangoutEvent) => void;
  deferMarkers?: boolean;
  onPointsProjected?: (points: ProjectedPoint[]) => void;
};

function zoomForDelta(latitudeDelta: number): number {
  const z = Math.round(Math.log2(360 / latitudeDelta)) - 1;
  return Math.min(Math.max(z, 3), 18);
}

function buildHtml(region: Region): string {
  const zoom = zoomForDelta(region.latitudeDelta);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eae7e1; }
    .cloud {
      display: inline-flex; align-items: center; gap: 5px;
      background: #ffffff; border: 1.5px solid #E0E1E6; border-radius: 22px;
      padding: 6px 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.22);
      font: 700 14px -apple-system, Roboto, sans-serif; color: #111; white-space: nowrap;
    }
    .cloud.open { border-color: #FF385C; }
    .cluster {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      background: #FF385C; color: #fff; border: 2px solid #fff; border-radius: 24px;
      min-width: 44px; height: 40px; padding: 0 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font: 700 15px -apple-system, Roboto, sans-serif;
    }
    @keyframes pop {
      0%   { transform: scale(0);    opacity: 0; }
      60%  { transform: scale(1.12); opacity: 1; }
      100% { transform: scale(1);    opacity: 1; }
    }
    .cloud, .cluster { animation: pop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    var post = function (msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    };

    var map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([${region.latitude}, ${region.longitude}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      iconCreateFunction: function (c) {
        var total = 0;
        c.getAllChildMarkers().forEach(function (m) { total += m.options.attendeeCount || 0; });
        return L.divIcon({ html: '<div class="cluster">🎉 ' + total + '</div>', className: '', iconSize: null });
      }
    });
    map.addLayer(cluster);

    window.setEvents = function (events) {
      cluster.clearLayers();
      events.forEach(function (ev) {
        if (ev.approximate) {
          L.circle([ev.latitude, ev.longitude], {
            radius: 350, color: '#FF385C', weight: 1,
            fillColor: '#FF385C', fillOpacity: 0.12,
          }).addTo(cluster);
        }
        var emoji = ev.openToStrangers ? '👋' : '🎉';
        var icon = L.divIcon({
          html: '<div class="cloud ' + (ev.openToStrangers ? 'open' : '') + '">' + emoji + ' ' + ev.attendeeCount + '</div>',
          className: '', iconSize: null, iconAnchor: [0, 0]
        });
        var marker = L.marker([ev.latitude, ev.longitude], { icon: icon, attendeeCount: ev.attendeeCount });
        marker.on('click', function () { post({ type: 'select', id: ev.id }); });
        cluster.addLayer(marker);
      });
    };

    window.projectPoints = function (events) {
      var pts = events.map(function (ev) {
        var p = map.latLngToContainerPoint([ev.latitude, ev.longitude]);
        return { id: ev.id, x: p.x, y: p.y };
      });
      post({ type: 'points', points: pts });
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

export function LeafletMap({
  events,
  region,
  onSelectEvent,
  deferMarkers = false,
  onPointsProjected,
}: Props) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const source = useMemo(() => ({ html: buildHtml(region) }), []);

  function pushEvents() {
    webRef.current?.injectJavaScript(`window.setEvents(${JSON.stringify(events)}); true;`);
  }

  function projectPoints() {
    webRef.current?.injectJavaScript(`window.projectPoints(${JSON.stringify(events)}); true;`);
  }

  useEffect(() => {
    if (!readyRef.current) return;
    if (onPointsProjected) projectPoints();
    if (!deferMarkers) pushEvents();
  });

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        readyRef.current = true;
        if (onPointsProjected) projectPoints();
        if (!deferMarkers) pushEvents();
      } else if (msg.type === 'points') {
        onPointsProjected?.(msg.points as ProjectedPoint[]);
      } else if (msg.type === 'select') {
        const event = events.find((ev) => ev.id === msg.id);
        if (event) onSelectEvent(event);
      }
    } catch {
    }
  }

  return (
    <WebView
      ref={webRef}
      style={styles.web}
      originWhitelist={['*']}
      source={source}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      androidLayerType="hardware"
    />
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: '#eae7e1',
  },
});

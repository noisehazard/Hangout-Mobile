import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type Point = { latitude: number; longitude: number };

type Props = {
  point: Point;
  onChange: (latitude: number, longitude: number) => void;
};

function buildHtml(point: Point): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;background:#eae7e1;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var post = function (m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
    var map = L.map('map', { zoomControl: false }).setView([${point.latitude}, ${point.longitude}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    var marker = L.marker([${point.latitude}, ${point.longitude}], { draggable: true }).addTo(map);
    marker.on('dragend', function () { var ll = marker.getLatLng(); post({ type: 'move', lat: ll.lat, lng: ll.lng }); });
    map.on('click', function (e) { marker.setLatLng(e.latlng); post({ type: 'move', lat: e.latlng.lat, lng: e.latlng.lng }); });
    window.setPoint = function (lat, lng) { marker.setLatLng([lat, lng]); map.panTo([lat, lng]); };
    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

export function LocationPickerMap({ point, onChange }: Props) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const source = useMemo(() => ({ html: buildHtml(point) }), []);

  useEffect(() => {
    if (readyRef.current) {
      webRef.current?.injectJavaScript(
        `window.setPoint(${point.latitude}, ${point.longitude}); true;`,
      );
    }
  }, [point.latitude, point.longitude]);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') readyRef.current = true;
      else if (msg.type === 'move') onChange(msg.lat, msg.lng);
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
      androidLayerType="hardware"
      startInLoadingState
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#eae7e1', minHeight: 200, borderRadius: 12, overflow: 'hidden' },
});

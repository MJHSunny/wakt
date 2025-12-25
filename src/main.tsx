
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { StatusBar } from '@capacitor/status-bar';

  // Draw app under the status bar and use light content for contrast
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  StatusBar.setStyle({ style: 'LIGHT' as any }).catch(() => {});
  // Make status bar transparent so headers show behind it
  StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});

  createRoot(document.getElementById("root")!).render(<App />);
  
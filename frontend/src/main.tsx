import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { registerNotificationServiceWorker } from "./lib/device-notifications.ts";

registerNotificationServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

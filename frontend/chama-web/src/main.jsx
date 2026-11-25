import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

console.log("URL loaded?", !!import.meta.env.VITE_SUPABASE_URL);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
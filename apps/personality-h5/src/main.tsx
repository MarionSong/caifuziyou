import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import "./ui/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("找不到页面根节点。");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

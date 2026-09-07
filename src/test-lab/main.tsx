import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TestLabApp } from "./TestLabApp";
import "./test-lab.css";

createRoot(document.getElementById("test-lab-root")!).render(<StrictMode><TestLabApp /></StrictMode>);

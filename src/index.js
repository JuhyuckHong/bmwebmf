import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ThemeProvider } from 'styled-components';

import theme from "theme"

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
        <ThemeProvider theme={theme}>
            <App />
        </ThemeProvider> 
    );

reportWebVitals();

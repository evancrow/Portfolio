import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App/App";
import reportWebVitals from "./Setup/reportWebVitals";
import { Helmet } from "react-helmet";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Helmet>
      <title>Evan Crow</title>
      <meta name="description" content="Software Engineer & Designer" />
      <meta property="og:title" content="Evan Crow" />
      <meta property="og:description" content="Software Engineer & Designer" />
      <link rel="icon" type="image/png" href="./static/Favicon.png" />
      <link rel="apple-touch-icon" href="./static/Favicon.png" />
      <link rel="stylesheet" href="https://use.typekit.net/cwc5yzo.css"></link>
      <link rel="stylesheet" href="https://use.typekit.net/vdt7wnc.css"></link>
    </Helmet>

    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

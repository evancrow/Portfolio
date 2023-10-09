import React from "react";
import "./App.css";
import Header from "../Header/Header";
import Home from "../Home/Home";
import { About } from "../About/About";
import { Work } from "../Work/Work";
import { Contact } from "../Contact/Contact";
import Footer from "../Footer/Footer";

function App() {
  return (
    <div className="App">
      <Header />
      <Home />
      <About />
      <Work />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;

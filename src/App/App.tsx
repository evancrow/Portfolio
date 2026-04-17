import "./App.css";
import Header from "../Components/Header/Header";
import Home from "../Home/Home";
import { About } from "../About/About";
import { Work } from "../Work/Work";
import { Projects } from "../Projects/Projects";
import { Contact } from "../Contact/Contact";
import Footer from "../Components/Footer/Footer";

function App() {
  return (
    <div className="App">
      <Header />
      <Home />
      <Work />
      <Projects />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;

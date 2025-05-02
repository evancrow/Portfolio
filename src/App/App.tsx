import "./App.css";
import Header from "../Components/Header/Header";
import Home from "../Home/Home";
import { About } from "../About/About";
import { Work } from "../Work/Work";
import { Contact } from "../Contact/Contact";
import Footer from "../Components/Footer/Footer";

function App() {
  return (
    <div className="App">
      <Header />
      <Home />
      <Work />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;

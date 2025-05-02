import "./Home.css";
import Copy from "./Copy/Copy";

function Home() {
  return (
    <div className="Home">
      {/* Primary blob */}
      <div className="blob blob1"></div>

      {/* Secondary blobs */}
      <div className="blob blob2"></div>
      <div className="blob blob3"></div>
      <div className="blob blob4"></div>

      {/* Sunset accent blobs */}
      <div className="blob blob5"></div>
      <div className="blob blob6"></div>

      <Copy />
    </div>
  );
}

export default Home;

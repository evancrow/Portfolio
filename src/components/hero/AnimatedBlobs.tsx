/**
   Five blurred colour fields behind the hero. Styles live in `app/blobs.css`
   because they are almost entirely @keyframes and bespoke radial gradients;
   Phase 2 replaces this system wholesale.
*/
export function AnimatedBlobs() {
  return (
    <div className="animated-blobs" aria-hidden="true">
      <div className="blob blob1" />
      <div className="blob blob2" />
      <div className="blob blob3" />
      <div className="blob blob4" />
      <div className="blob blob5" />
    </div>
  );
}

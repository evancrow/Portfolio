/**
   Hand-drawn squiggle between sections. Phase 2 removes these entirely.
   @param variant - "loop" sits under Work and Projects, "scribble" under About.
*/
export function SectionSpacer({
  variant = "loop",
}: {
  variant?: "loop" | "scribble";
}) {
  return (
    <div className="my-[50px] flex w-full flex-col items-center justify-center sm:my-[75px]">
      {variant === "loop" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="79"
          height="72"
          viewBox="0 0 79 72"
          fill="none"
          aria-hidden="true"
        >
          <path
            opacity="0.365565"
            d="M55.6125 71.6768C49.3367 5.43628 13.4366 58.285 1.5 36.7501C57.1509 16.9673 63.8397 73.9128 64.6842 68.5751C62.3129 15.5205 29.0442 12.2206 42.2187 54.5983C53.3661 52.2521 59.329 79.4606 76.5 67.2826C13.5003 65.7398 72.9431 4.71678 67.8817 0.963256"
            stroke="var(--color-stroke)"
            strokeWidth="1.5"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="70"
          height="77"
          viewBox="0 0 70 77"
          fill="none"
          aria-hidden="true"
        >
          <path
            opacity="0.705373"
            d="M68.6114 53.3709C30.4733 2.96096 61.308 75.995 25.0209 49.2673C11.8312 45.8046 4.60263 7.06366 18.6716 60.2355C31.7694 21.5774 46.1397 45.7039 30.3739 15.9867C24.0029 54.9268 10.7447 36.9712 1 11.9781C48.0744 61.2745 30.1137 46.6341 12.5614 76C20.7782 28.4399 63.9972 2.62164 16.0164 32.558C8.97353 32.8872 67.1552 46.4791 15.3167 1"
            stroke="var(--color-stroke)"
            strokeWidth="1.5"
          />
        </svg>
      )}
    </div>
  );
}

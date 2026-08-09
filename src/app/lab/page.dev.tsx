"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULTS, FlutedGlass, presets, type PresetName } from "@/components/fluted-glass";
import type {
  CurveConfig,
  GlassConfig,
  GlassShape,
  InteractionConfig,
  LightConfig,
  QualityConfig,
  ShapeKind,
} from "@/components/fluted-glass";

type LabConfig = {
  shapes: GlassShape[];
  glass: GlassConfig;
  light: LightConfig;
  interaction: InteractionConfig;
  quality: QualityConfig;
};

const TABS: PresetName[] = ["hero", "accent", "footer"];
const KINDS: ShapeKind[] = ["ellipse", "circle", "bar", "ring", "arc"];

/**
 * Stand-in layers for a preset that ships none. `accent` is the case: its colour is whichever award
 * currently holds the stage, so the shapes are built at the call site and the preset alone would
 * render an empty panel here. Two layers with different `pull`, so the stack still lags apart under
 * the cursor and there is something to point the shape sliders at.
 */
const SAMPLE_SHAPES: GlassShape[] = [
  {
    kind: "ellipse",
    x: 0.42,
    y: 0.55,
    w: 0.78,
    h: 0.66,
    color: "#5f74ec",
    opacity: 0.8,
    blur: 0.16,
    pull: 0.03,
    drift: { amp: 0.01, speed: 0.05 },
  },
  {
    kind: "ellipse",
    x: 0.66,
    y: 0.42,
    w: 0.44,
    h: 0.4,
    color: "#b48ff0",
    opacity: 0.55,
    blur: 0.1,
    pull: 0.09,
  },
];

/** The curve a panel gets when it is switched from flat to curved with nothing stashed. */
const SAMPLE_CURVE: CurveConfig = { drive: "scroll", scrollSource: "window" };

function fromPreset(name: PresetName): LabConfig {
  const p = presets[name] as Partial<LabConfig>;
  return structuredClone({
    shapes: p.shapes?.length ? p.shapes : SAMPLE_SHAPES,
    glass: p.glass ?? {},
    light: p.light ?? {},
    interaction: p.interaction ?? {},
    quality: p.quality ?? {},
  }) as LabConfig;
}

export default function Lab() {
  const [tab, setTab] = useState<PresetName>("hero");
  const [cfg, setCfg] = useState<LabConfig>(() => fromPreset("hero"));
  const [active, setActive] = useState(0);

  const selectTab = (name: PresetName) => {
    setTab(name);
    setCfg(fromPreset(name));
    setActive(0);
  };

  const patchGlass = (patch: Partial<GlassConfig>) =>
    setCfg((c) => ({ ...c, glass: { ...c.glass, ...patch } }));
  const patchCurve = (patch: Partial<CurveConfig>) =>
    setCfg((c) => ({
      ...c,
      glass: { ...c.glass, curve: { ...c.glass.curve, ...patch } },
    }));
  const patchLight = (patch: Partial<LightConfig>) =>
    setCfg((c) => ({ ...c, light: { ...c.light, ...patch } }));
  const patchInteraction = (patch: Partial<InteractionConfig>) =>
    setCfg((c) => ({ ...c, interaction: { ...c.interaction, ...patch } }));
  const patchShimmer = (patch: Partial<NonNullable<InteractionConfig["shimmer"]>>) =>
    setCfg((c) => ({
      ...c,
      interaction: {
        ...c.interaction,
        shimmer: { ...c.interaction.shimmer, ...patch },
      },
    }));
  const patchQuality = (patch: Partial<QualityConfig>) =>
    setCfg((c) => ({ ...c, quality: { ...c.quality, ...patch } }));
  const patchShape = (i: number, patch: Partial<GlassShape>) =>
    setCfg((c) => ({
      ...c,
      shapes: c.shapes.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));

  const isCurved = cfg.glass.curve != null;

  // Flattening the sheet drops the whole curve block, so the tuning is held here and handed back on
  // the way in. Without it, a glance at the flat version costs every curve value that was set.
  const stashedCurve = useRef<CurveConfig>(SAMPLE_CURVE);
  const setCurved = (curved: boolean) =>
    setCfg((c) => {
      if (c.glass.curve) stashedCurve.current = c.glass.curve;
      return {
        ...c,
        glass: { ...c.glass, curve: curved ? stashedCurve.current : undefined },
      };
    });

  const shape = cfg.shapes[active];

  const panel = (
    <FlutedGlass
      className="h-full w-full"
      shapes={cfg.shapes}
      glass={cfg.glass}
      light={cfg.light}
      interaction={cfg.interaction}
      quality={cfg.quality}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-[19rem] shrink-0 flex-col border-r border-hair">
        <div className="flex items-baseline justify-between border-b border-hair px-5 py-4 text-[10px] tracking-[0.16em] text-mute uppercase">
          <Link href="/" className="transition-colors hover:text-ink">
            Fluted glass
          </Link>
          <span>Playground</span>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-hair px-5 py-3">
          {TABS.map((name) => (
            <button
              key={name}
              onClick={() => selectTab(name)}
              className={`text-[11px] tracking-[0.12em] uppercase transition-colors ${
                tab === name ? "text-ink" : "text-mute hover:text-ink"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10">
          <Group label="Glass">
            <Choice
              label="sheet"
              value={isCurved ? "curved" : "flat"}
              options={["flat", "curved"]}
              onChange={(v) => setCurved(v === "curved")}
            />
            <Slider
              label="orientation"
              value={cfg.glass.orientation ?? DEFAULTS.glass.orientation}
              min={0}
              max={180}
              step={1}
              unit="deg"
              onChange={(v) => patchGlass({ orientation: v })}
            />
            <Slider
              label="flutes"
              value={cfg.glass.flutes ?? DEFAULTS.glass.flutes}
              min={0}
              max={90}
              step={1}
              onChange={(v) => patchGlass({ flutes: v })}
            />
            <Slider
              label="pitch"
              value={cfg.glass.pitch ?? DEFAULTS.glass.pitch}
              min={2}
              max={120}
              step={0.5}
              unit="px"
              onChange={(v) => patchGlass({ pitch: v, flutes: 0 })}
            />
            <Slider
              label="roundness"
              value={cfg.glass.roundness ?? DEFAULTS.glass.roundness}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchGlass({ roundness: v })}
            />
            <Slider
              label="ior"
              value={cfg.glass.ior ?? DEFAULTS.glass.ior}
              min={1}
              max={2}
              step={0.01}
              onChange={(v) => patchGlass({ ior: v })}
            />
            <Slider
              label="thickness"
              value={cfg.glass.thickness ?? DEFAULTS.glass.thickness}
              min={0}
              max={80}
              step={0.5}
              unit="px"
              onChange={(v) => patchGlass({ thickness: v })}
            />
            <Slider
              label="dispersion"
              value={cfg.glass.dispersion ?? DEFAULTS.glass.dispersion}
              min={0}
              max={0.2}
              step={0.002}
              onChange={(v) => patchGlass({ dispersion: v })}
            />
            <Slider
              label="blur"
              value={cfg.glass.blur ?? DEFAULTS.glass.blur}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchGlass({ blur: v })}
            />
            <Slider
              label="soften"
              value={cfg.glass.soften ?? DEFAULTS.glass.soften}
              min={0}
              max={0.6}
              step={0.01}
              onChange={(v) => patchGlass({ soften: v })}
            />
            <Slider
              label="variance"
              value={cfg.glass.variance ?? DEFAULTS.glass.variance}
              min={0}
              max={2}
              step={0.01}
              onChange={(v) => patchGlass({ variance: v })}
            />
            <Slider
              label="wick"
              value={cfg.glass.wick ?? DEFAULTS.glass.wick}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchGlass({ wick: v })}
            />
            <Slider
              label="seam"
              value={cfg.glass.seam ?? DEFAULTS.glass.seam}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchGlass({ seam: v })}
            />
            <Slider
              label="gather"
              value={cfg.glass.gather ?? DEFAULTS.glass.gather}
              min={0}
              max={3}
              step={0.02}
              onChange={(v) => patchGlass({ gather: v })}
            />
            <Slider
              label="presence"
              value={cfg.glass.presence ?? DEFAULTS.glass.presence}
              min={0}
              max={0.5}
              step={0.005}
              onChange={(v) => patchGlass({ presence: v })}
            />
            <Slider
              label="tintAmount"
              value={cfg.glass.tintAmount ?? DEFAULTS.glass.tintAmount}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchGlass({ tintAmount: v })}
            />
            <Color
              label="tint"
              value={cfg.glass.tint ?? DEFAULTS.glass.tint}
              onChange={(v) => patchGlass({ tint: v })}
            />
          </Group>

          {isCurved && (
            <Group label="Curve">
              <Choice
                label="drive"
                value={cfg.glass.curve?.drive ?? DEFAULTS.curve.drive}
                options={["scroll", "pointer", "ambient"]}
                onChange={(v) => patchCurve({ drive: v as NonNullable<CurveConfig["drive"]> })}
              />
              <Slider
                label="turnsPerViewport"
                value={cfg.glass.curve?.turnsPerViewport ?? DEFAULTS.curve.turnsPerViewport}
                min={0}
                max={1}
                step={0.01}
                unit="turn/vh"
                onChange={(v) => patchCurve({ turnsPerViewport: v })}
              />
              <Slider
                label="damping"
                value={cfg.glass.curve?.damping ?? DEFAULTS.curve.damping}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => patchCurve({ damping: v })}
              />
              <Slider
                label="rimAngle"
                value={cfg.glass.curve?.rimAngle ?? DEFAULTS.curve.rimAngle}
                min={40}
                max={89}
                step={0.5}
                unit="deg"
                onChange={(v) => patchCurve({ rimAngle: v })}
              />
              <Slider
                label="edgeFade"
                value={cfg.glass.curve?.edgeFade ?? DEFAULTS.curve.edgeFade}
                min={0}
                max={0.4}
                step={0.005}
                onChange={(v) => patchCurve({ edgeFade: v })}
              />
              <Slider
                label="speed"
                value={cfg.glass.curve?.speed ?? DEFAULTS.curve.speed}
                min={0}
                max={0.4}
                step={0.005}
                unit="turn/s"
                onChange={(v) => patchCurve({ speed: v })}
              />
              <Slider
                label="gain"
                value={cfg.glass.curve?.gain ?? DEFAULTS.curve.gain}
                min={0}
                max={2}
                step={0.01}
                onChange={(v) => patchCurve({ gain: v })}
              />
            </Group>
          )}

          <Group label="Light">
            <Slider
              label="angle"
              value={cfg.light.angle ?? DEFAULTS.light.angle}
              min={0}
              max={360}
              step={1}
              unit="deg"
              onChange={(v) => patchLight({ angle: v })}
            />
            <Slider
              label="intensity"
              value={cfg.light.intensity ?? DEFAULTS.light.intensity}
              min={0}
              max={1.5}
              step={0.01}
              onChange={(v) => patchLight({ intensity: v })}
            />
            <Slider
              label="sharpness"
              value={cfg.light.sharpness ?? DEFAULTS.light.sharpness}
              min={1}
              max={30}
              step={0.5}
              onChange={(v) => patchLight({ sharpness: v })}
            />
            <Slider
              label="ambient"
              value={cfg.light.ambient ?? DEFAULTS.light.ambient}
              min={0}
              max={0.4}
              step={0.005}
              onChange={(v) => patchLight({ ambient: v })}
            />
            <Slider
              label="specAlpha"
              value={cfg.light.specAlpha ?? DEFAULTS.light.specAlpha}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchLight({ specAlpha: v })}
            />
            <Slider
              label="caustic"
              value={cfg.light.caustic ?? DEFAULTS.light.caustic}
              min={0}
              max={1.5}
              step={0.01}
              onChange={(v) => patchLight({ caustic: v })}
            />
            <Color
              label="specColor"
              value={cfg.light.specColor ?? DEFAULTS.light.specColor}
              onChange={(v) => patchLight({ specColor: v })}
            />
          </Group>

          <Group label="Interaction">
            <Slider
              label="pull"
              value={cfg.interaction.pull ?? DEFAULTS.interaction.pull}
              min={0}
              max={0.6}
              step={0.005}
              onChange={(v) => patchInteraction({ pull: v })}
            />
            <Slider
              label="pullY"
              value={cfg.interaction.pullY ?? DEFAULTS.interaction.pullY}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchInteraction({ pullY: v })}
            />
            <Slider
              label="shimmer.radius"
              value={cfg.interaction.shimmer?.radius ?? DEFAULTS.shimmer.radius}
              min={20}
              max={320}
              step={5}
              unit="px"
              onChange={(v) => patchShimmer({ radius: v })}
            />
            <Slider
              label="shimmer.gain"
              value={cfg.interaction.shimmer?.gain ?? DEFAULTS.shimmer.gain}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => patchShimmer({ gain: v })}
            />
            <Choice
              label="shimmer.onPress"
              value={cfg.interaction.shimmer?.onPress ? "yes" : "no"}
              options={["no", "yes"]}
              onChange={(v) => patchShimmer({ onPress: v === "yes" })}
            />
            <Slider
              label="stiffness"
              value={cfg.interaction.stiffness ?? DEFAULTS.interaction.stiffness}
              min={10}
              max={300}
              step={1}
              onChange={(v) => patchInteraction({ stiffness: v })}
            />
            <Slider
              label="zeta"
              value={cfg.interaction.zeta ?? DEFAULTS.interaction.zeta}
              min={0.3}
              max={1.5}
              step={0.01}
              onChange={(v) => patchInteraction({ zeta: v })}
            />
            <Choice
              label="disabled"
              value={cfg.interaction.disabled ? "yes" : "no"}
              options={["no", "yes"]}
              onChange={(v) => patchInteraction({ disabled: v === "yes" })}
            />
          </Group>

          <Group label="Quality">
            <Slider
              label="maxDpr"
              value={cfg.quality.maxDpr ?? DEFAULTS.quality.maxDpr}
              min={1}
              max={3}
              step={0.5}
              onChange={(v) => patchQuality({ maxDpr: v })}
            />
            <Slider
              label="fieldScale"
              value={cfg.quality.fieldScale ?? DEFAULTS.quality.fieldScale}
              min={0.1}
              max={1}
              step={0.02}
              onChange={(v) => patchQuality({ fieldScale: v })}
            />
            <Choice
              label="taps"
              value={String(cfg.quality.taps ?? DEFAULTS.quality.taps)}
              options={["1", "3", "5"]}
              onChange={(v) => patchQuality({ taps: Number(v) as 1 | 3 | 5 })}
            />
            <Slider
              label="fieldSmoothing"
              value={cfg.quality.fieldSmoothing ?? DEFAULTS.quality.fieldSmoothing}
              min={0}
              max={4}
              step={0.1}
              onChange={(v) => patchQuality({ fieldSmoothing: v })}
            />
          </Group>

          {shape && (
            <Group label={`Layer ${active + 1} of ${cfg.shapes.length}`}>
              {cfg.shapes.length > 1 && (
                <Choice
                  label="editing"
                  value={String(active + 1)}
                  options={cfg.shapes.map((_, i) => String(i + 1))}
                  onChange={(v) => setActive(Number(v) - 1)}
                />
              )}
              <Choice
                label="kind"
                value={shape.kind ?? DEFAULTS.shape.kind}
                options={KINDS}
                onChange={(v) => patchShape(active, { kind: v as ShapeKind })}
              />
              <Slider
                label="x"
                value={shape.x}
                min={-0.5}
                max={1.5}
                step={0.01}
                onChange={(v) => patchShape(active, { x: v })}
              />
              <Slider
                label="y"
                value={shape.y}
                min={-0.5}
                max={1.6}
                step={0.01}
                onChange={(v) => patchShape(active, { y: v })}
              />
              <Slider
                label="w"
                value={shape.w}
                min={0.02}
                max={2}
                step={0.01}
                onChange={(v) => patchShape(active, { w: v })}
              />
              <Slider
                label="h"
                value={shape.h}
                min={0.02}
                max={2}
                step={0.01}
                onChange={(v) => patchShape(active, { h: v })}
              />
              <Slider
                label="rotate"
                value={shape.rotate ?? DEFAULTS.shape.rotate}
                min={-180}
                max={180}
                step={1}
                unit="deg"
                onChange={(v) => patchShape(active, { rotate: v })}
              />
              <Slider
                label="opacity"
                value={shape.opacity ?? DEFAULTS.shape.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => patchShape(active, { opacity: v })}
              />
              <Slider
                label="blur"
                value={shape.blur ?? DEFAULTS.shape.blur}
                min={0.005}
                max={0.5}
                step={0.005}
                onChange={(v) => patchShape(active, { blur: v })}
              />
              <Slider
                label="pull"
                value={shape.pull ?? cfg.interaction.pull ?? DEFAULTS.interaction.pull}
                min={0}
                max={0.6}
                step={0.005}
                onChange={(v) => patchShape(active, { pull: v })}
              />
              <Slider
                label="thickness"
                value={shape.thickness ?? DEFAULTS.shape.thickness}
                min={0.02}
                max={1}
                step={0.01}
                onChange={(v) => patchShape(active, { thickness: v })}
              />
              <Slider
                label="span"
                value={shape.span ?? DEFAULTS.shape.span}
                min={10}
                max={360}
                step={1}
                unit="deg"
                onChange={(v) => patchShape(active, { span: v })}
              />
              <Slider
                label="drift.amp"
                value={shape.drift?.amp ?? DEFAULTS.shape.drift.amp}
                min={0}
                max={0.08}
                step={0.001}
                onChange={(v) =>
                  patchShape(active, {
                    drift: {
                      amp: v,
                      speed: shape.drift?.speed ?? DEFAULTS.shape.drift.speed,
                    },
                  })
                }
              />
              <Slider
                label="drift.speed"
                value={shape.drift?.speed ?? DEFAULTS.shape.drift.speed}
                min={0}
                max={0.5}
                step={0.005}
                onChange={(v) =>
                  patchShape(active, {
                    drift: {
                      amp: shape.drift?.amp ?? DEFAULTS.shape.drift.amp,
                      speed: v,
                    },
                  })
                }
              />
              <Color
                label="color"
                value={shape.color}
                onChange={(v) => patchShape(active, { color: v })}
              />
            </Group>
          )}

          <Group label="Props">
            <ConfigBlock cfg={cfg} />
          </Group>
        </div>
      </aside>

      <div className="relative min-w-0 flex-1">{panel}</div>
    </div>
  );
}

/* --------------------------------------------------------------- controls */

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-b border-hair py-4 last:border-b-0">
      <h2 className="mb-2 text-[10px] tracking-[0.16em] text-mute uppercase">{label}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-baseline justify-between font-mono text-[10px] text-mute">
        <span>{label}</span>
        {value && <span className="text-ink">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function format(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Row label={label} value={`${format(value)}${unit ? ` ${unit}` : ""}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Row>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <Row label={label}>
      <div className="mt-1 flex gap-3">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`font-mono text-[10px] transition-colors ${
              value === o ? "text-ink underline underline-offset-4" : "text-mute hover:text-ink"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </Row>
  );
}

function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Row label={label} value={value}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-5 w-full cursor-pointer border border-hair bg-transparent"
      />
    </Row>
  );
}

function ConfigBlock({ cfg }: { cfg: LabConfig }) {
  const text = useMemo(() => JSON.stringify(cfg, null, 2), [cfg]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div>
      <button
        onClick={copy}
        className="mb-2 font-mono text-[10px] text-mute transition-colors hover:text-ink"
      >
        {copied ? "copied" : "copy"}
      </button>
      <pre className="max-h-64 overflow-auto border border-hair p-2 font-mono text-[9px] leading-[1.5] text-mute">
        {text}
      </pre>
    </div>
  );
}

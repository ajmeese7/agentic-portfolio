"use client";

import { useState } from "react";
import {
  type AsciiSettings,
  type CameraView,
  DEFAULT_SETTINGS,
  type Mood,
} from "./useTalkingHeadAscii";

interface AsciiControlsProps {
  settings: AsciiSettings;
  onChange: (next: AsciiSettings) => void;
}

const VIEWS: CameraView[] = ["head", "upper", "mid", "full"];
const MOODS: Mood[] = ["neutral", "happy", "angry", "sad", "fear", "disgust", "love", "sleep"];

export function AsciiControls({ settings, onChange }: AsciiControlsProps) {
  const [open, setOpen] = useState(true);

  const set = <K extends keyof AsciiSettings>(key: K, value: AsciiSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <aside className={`controls ${open ? "open" : "closed"}`} aria-label="ascii controls">
      <button type="button" className="controls-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "[ hide ]" : "[ controls ]"}
      </button>
      {open && (
        <div className="controls-body">
          <Select
            label="view"
            value={settings.view}
            options={VIEWS}
            onChange={(v) => set("view", v)}
          />
          <Slider
            label="distance"
            value={settings.cameraDistance}
            min={-2}
            max={6}
            step={0.1}
            onChange={(v) => set("cameraDistance", v)}
          />
          <Slider
            label="x"
            value={settings.cameraX}
            min={-1}
            max={1}
            step={0.05}
            onChange={(v) => set("cameraX", v)}
          />
          <Slider
            label="y"
            value={settings.cameraY}
            min={-1}
            max={1}
            step={0.05}
            onChange={(v) => set("cameraY", v)}
          />
          <Slider
            label="rotate"
            value={settings.cameraRotateY}
            min={-0.6}
            max={0.6}
            step={0.02}
            onChange={(v) => set("cameraRotateY", v)}
          />
          <Slider
            label="ambient"
            value={settings.lightAmbient}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) => set("lightAmbient", v)}
          />
          <Slider
            label="direct"
            value={settings.lightDirect}
            min={0}
            max={300}
            step={5}
            onChange={(v) => set("lightDirect", v)}
          />
          <Slider
            label="cell"
            value={settings.cellSize}
            min={6}
            max={40}
            step={1}
            onChange={(v) => set("cellSize", v)}
          />
          <Slider
            label="hover"
            value={settings.hoverRadius}
            min={0.05}
            max={0.4}
            step={0.01}
            onChange={(v) => set("hoverRadius", v)}
          />
          <Slider
            label="blend"
            value={settings.blend}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => set("blend", v)}
          />
          <Toggle label="invert" value={settings.invert} onChange={(v) => set("invert", v)} />
          <Select
            label="mood"
            value={settings.mood}
            options={MOODS}
            onChange={(v) => set("mood", v)}
          />
          <button
            type="button"
            className="controls-reset"
            onClick={() => onChange(DEFAULT_SETTINGS)}
          >
            reset
          </button>
        </div>
      )}
    </aside>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="control-row">
      <span className="control-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
      <span className="control-value">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}

function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="control-row">
      <span className="control-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <label className="control-row">
      <span className="control-label">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ justifySelf: "start" }}
      />
      <span className="control-value">{value ? "on" : "off"}</span>
    </label>
  );
}

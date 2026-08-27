"use client";

import { useState } from "react";
import { submitCardio } from "@/app/actions";
import { today } from "@/lib/date";
import Row from "@/app/components/Row";
import SubmitButton from "@/app/components/SubmitButton";
import type { CardioType } from "@/lib/types";

/** Row/swim are tracked in meters, not km (see lib/overload.ts) — the Distance field's label/step switches with the selected type. */
export default function LogCardioForm() {
  const [type, setType] = useState<CardioType>("RUN");
  const unit = type === "ROW" || type === "SWIM" ? "m" : "km";

  return (
    <form action={submitCardio}>
      <Row>
        <label htmlFor="type" className="text-lg font-bold opacity-70">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as CardioType)}
          className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
        >
          <option value="RUN">Run</option>
          <option value="BIKE">Bike</option>
          <option value="ROW">Row</option>
          <option value="SWIM">Swim</option>
        </select>
      </Row>
      <Row>
        <label htmlFor="cardio-date" className="text-lg font-bold opacity-70">
          Date
        </label>
        <input
          id="cardio-date"
          type="date"
          name="date"
          defaultValue={today()}
          max={today()}
          className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
        />
      </Row>
      <Row>
        <label htmlFor="distanceKm" className="text-lg font-bold opacity-70">
          Distance ({unit})
        </label>
        <input
          id="distanceKm"
          type="number"
          step={unit === "m" ? "1" : "0.1"}
          name="distanceKm"
          required
          className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
        />
      </Row>
      <Row>
        <label htmlFor="durationMin" className="text-lg font-bold opacity-70">
          Duration (min)
        </label>
        <input
          id="durationMin"
          type="number"
          step="1"
          name="durationMin"
          className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
        />
      </Row>
      <SubmitButton className="w-full mt-6 px-6 py-3.5 rounded-full bg-theme-accent text-theme-own text-base font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
        Log cardio
      </SubmitButton>
    </form>
  );
}

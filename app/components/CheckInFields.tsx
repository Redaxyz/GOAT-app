import Row from "@/app/components/Row";

export function DisplayRow({ label, value }: { label: string; value: string | number }) {
  return (
    <Row>
      <span className="text-lg font-bold opacity-70">{label}</span>
      <span className="text-lg font-extrabold">{value}</span>
    </Row>
  );
}

export function NumberRow({
  name,
  label,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  defaultValue?: number | string | null;
  step?: string;
}) {
  return (
    <Row>
      <label htmlFor={name} className="text-lg font-bold opacity-70">
        {label}
      </label>
      <input
        id={name}
        type="number"
        name={name}
        step={step}
        defaultValue={defaultValue ?? ""}
        className="w-28 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
      />
    </Row>
  );
}

export function YesNoRow({ name, label, value }: { name: string; label: string; value?: boolean | null }) {
  return (
    <Row>
      <span className="text-lg font-bold opacity-70">{label}</span>
      <div className="flex gap-2">
        <label className="px-4 py-1.5 rounded-full border-2 border-theme-accent/40 text-sm font-bold cursor-pointer has-[:checked]:bg-theme-accent has-[:checked]:text-theme-own has-[:checked]:border-theme-accent transition">
          <input type="radio" name={name} value="yes" defaultChecked={value === true} className="sr-only" />
          Yes
        </label>
        <label className="px-4 py-1.5 rounded-full border-2 border-theme-accent/40 text-sm font-bold cursor-pointer has-[:checked]:bg-theme-accent has-[:checked]:text-theme-own has-[:checked]:border-theme-accent transition">
          <input type="radio" name={name} value="no" defaultChecked={value !== true} className="sr-only" />
          No
        </label>
      </div>
    </Row>
  );
}

export function NotesRow({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <label htmlFor="notes" className="block text-lg font-bold opacity-70 mb-2">
        Notes
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={3}
        defaultValue={defaultValue ?? ""}
        className="w-full text-base font-semibold bg-transparent border-2 border-theme-accent/20 rounded-2xl px-3 py-2 focus:border-theme-accent outline-none"
      />
    </div>
  );
}

export function NotesDisplayRow({ value }: { value: string }) {
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <div className="text-lg font-bold opacity-70 mb-1">Notes</div>
      <div className="text-lg font-extrabold whitespace-pre-wrap">{value}</div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Modal from "./Modal";

export default function MatchOutcomeModal({ open, onClose, onSubmit, match }) {
  const [outcome, setOutcome] = useState("success");
  const [litterSize, setLitterSize] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setOutcome("success");
      setLitterSize("");
      setNotes("");
    }
  }, [open]);

  if (!match) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const numericLitter = litterSize === "" ? null : Number(litterSize);
    if ((numericLitter ?? 0) < 0 || (numericLitter !== null && !Number.isFinite(numericLitter))) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Please enter a valid litter size", type: "warning" },
        })
      );
      setBusy(false);
      return;
    }
    try {
      await onSubmit({
        matchId: match.id,
        outcome,
        verifiedDogId: match.myDog?.id,
        litterSize: numericLitter,
        notes,
      });
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Outcome recorded", type: "success" },
        })
      );
      onClose();
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: err.message || "Failed to record outcome", type: "error" },
        })
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} widthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Confirm breeding outcome</h2>
          <p className="text-sm text-slate-600 mt-1">
            Let the community know how the pairing between {match.myDog?.name} and{" "}
            {match.partnerDog?.name} went.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Outcome</label>
          <div className="flex gap-3">
            {[
              { value: "success", label: "Success" },
              { value: "failed", label: "No pregnancy" },
              { value: "no_show", label: "No show" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="outcome"
                  value={opt.value}
                  checked={outcome === opt.value}
                  onChange={() => setOutcome(opt.value)}
                  className="accent-blue-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="litter-size-input">
            Litter size (optional)
          </label>
          <input
            id="litter-size-input"
            type="number"
            min="0"
            value={litterSize}
            onChange={(e) => setLitterSize(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="outcome-notes">
            Notes (optional)
          </label>
          <textarea
            id="outcome-notes"
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share any helpful observations for future pairings"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !match.myDog?.id}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save outcome"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

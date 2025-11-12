import React from "react";
import {
  sizeOptions,
  coatTypeOptions,
  colorOptions,
  activityLevelOptions,
  sociabilityOptions,
  trainabilityOptions,
} from "../utils/traitOptions";

function Select({ label, value, onChange, options, placeholder = "Select..." }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        className="select-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Step3Traits({ data, updateField, errors = {} }) {
  return (
    <div className="step step-3">
      {/* Size and Weight */}
      <div className="form-row">
        <div style={{ flex: 1 }}>
          <Select
            label={`Size ${errors.size ? "*" : ""}`}
            value={data.size}
            onChange={(v) => updateField("size", v)}
            options={sizeOptions}
          />
          {errors.size && !/required/i.test(errors.size) && (
            <div className="field-error">{errors.size}</div>
          )}
        </div>
        <div className="field">
          <label>
            Weight (kg){errors.weight_kg && <span style={{ color: "#ef4444" }}> *</span>}
          </label>
          <input
            className="text-input"
            type="number"
            min="1.5"
            max="91"
            step="0.1"
            value={data.weight_kg || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return updateField("weight_kg", "");
              const n = parseFloat(v);
              if (!isNaN(n) && n >= 1.5 && n <= 91) {
                updateField("weight_kg", v);
              } else {
                // Allow user to keep typing but don't commit invalid out-of-range values
                updateField("weight_kg", v);
              }
            }}
            placeholder="Enter weight (1.5 - 91 kg)"
          />
          {errors.weight_kg && !/required/i.test(errors.weight_kg) && (
            <div className="field-error">{errors.weight_kg}</div>
          )}
          {!errors.weight_kg &&
            data.weight_kg &&
            (parseFloat(data.weight_kg) < 1.5 || parseFloat(data.weight_kg) > 91) && (
              <div className="field-error">Weight must be between 1.5 and 91 kg</div>
            )}
        </div>
      </div>

      {/* Coat and Color */}
      <div className="form-row">
        <div style={{ flex: 1 }}>
          <Select
            label={`Coat Type ${errors.coat_type ? "*" : ""}`}
            value={data.coat_type}
            onChange={(v) => updateField("coat_type", v)}
            options={coatTypeOptions}
          />
          {errors.coat_type && !/required/i.test(errors.coat_type) && (
            <div className="field-error">{errors.coat_type}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <Select
            label={`Color / Markings ${errors.color ? "*" : ""}`}
            value={data.color}
            onChange={(v) => updateField("color", v)}
            options={colorOptions}
          />
          {errors.color && !/required/i.test(errors.color) && (
            <div className="field-error">{errors.color}</div>
          )}
        </div>
      </div>

      {/* Behavioral Traits */}
      <div className="field">
        <Select
          label={`Activity Level ${errors.activity_level ? "*" : ""}`}
          value={data.activity_level}
          onChange={(v) => updateField("activity_level", v)}
          options={activityLevelOptions}
        />
        {errors.activity_level && !/required/i.test(errors.activity_level) && (
          <div className="field-error">{errors.activity_level}</div>
        )}
      </div>

      <div className="form-row">
        <div style={{ flex: 1 }}>
          <Select
            label={`Sociability ${errors.sociability ? "*" : ""}`}
            value={data.sociability}
            onChange={(v) => updateField("sociability", v)}
            options={sociabilityOptions}
          />
          {errors.sociability && !/required/i.test(errors.sociability) && (
            <div className="field-error">{errors.sociability}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <Select
            label={`Trainability ${errors.trainability ? "*" : ""}`}
            value={data.trainability}
            onChange={(v) => updateField("trainability", v)}
            options={trainabilityOptions}
          />
          {errors.trainability && !/required/i.test(errors.trainability) && (
            <div className="field-error">{errors.trainability}</div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";

export default function Step2Health({ data, updateCheckbox }) {
  return (
    <div className="step step-2">
      {/* Primary Health Certifications */}
      <div className="check-block">
        <h4 className="check-section-title">Primary Certifications</h4>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.pedigree_certified || false}
            onChange={updateCheckbox("pedigree_certified")}
          />{" "}
          Pedigree Certified
        </label>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.dna_tested || false}
            onChange={updateCheckbox("dna_tested")}
          />{" "}
          DNA Tested
        </label>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.vaccinated || false}
            onChange={updateCheckbox("vaccinated")}
          />{" "}
          Vaccinated
        </label>
      </div>

      {/* Optional Additional Health Tests */}
      <div className="check-block">
        <h4 className="check-section-title">
          Additional Health Tests (Optional)
        </h4>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.hip_elbow_tested || false}
            onChange={updateCheckbox("hip_elbow_tested")}
          />{" "}
          Hip/Elbow Dysplasia Test
        </label>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.heart_tested || false}
            onChange={updateCheckbox("heart_tested")}
          />{" "}
          Heart Clearance
        </label>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.eye_tested || false}
            onChange={updateCheckbox("eye_tested")}
          />{" "}
          Eye Clearance (CERF/OFA)
        </label>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.genetic_panel || false}
            onChange={updateCheckbox("genetic_panel")}
          />{" "}
          Genetic Disease Panel
        </label>
        <label className="check-item">
          <input
            type="checkbox"
            checked={data.thyroid_tested || false}
            onChange={updateCheckbox("thyroid_tested")}
          />{" "}
          Thyroid Function Test
        </label>
      </div>
    </div>
  );
}

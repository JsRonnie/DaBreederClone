import React, { useState, useMemo, useEffect } from "react";
import useFormData from "../hooks/useFormData";
import Step1DogInfo from "../stepComponents/Step1DogInfo";
import Step2Health from "../stepComponents/Step2Health";
import Step3Traits from "../stepComponents/Step3Traits";
import Step4Documents from "../stepComponents/Step4Documents";
import StepNavigation from "../stepComponents/StepNavigation";
import "../stepComponents/stepbystepUI.css";
import "./FindMatchPage.css";

const TOTAL_STEPS = 4;

export default function DogForm({ onSubmitted }) {
  const [step, setStep] = useState(1);
  const form = useFormData();

  // Apply modern background style when this component is mounted
  useEffect(() => {
    document.body.style.backgroundColor = "#f8fafc";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return form.data.name.trim() !== "" && form.data.gender !== "";
      case 2: // Traits & Physical Characteristics
        return form.data.size !== "";
      case 3: // Health & Verification (no required fields)
        return true;
      case 4: // documents optional
        return true;
      default:
        return true;
    }
  }, [step, form.data]);

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    const id = await form.submit();
    if (id) {
      // Modern success notification
      const successDiv = document.createElement("div");
      successDiv.innerHTML = `
				<div style="
					position: fixed;
					top: 20px;
					right: 20px;
					background: #10b981;
					color: white;
					padding: 1rem 1.5rem;
					border-radius: 8px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
					z-index: 1000;
					font-weight: 600;
				">
					✓ Dog registered successfully!
				</div>
			`;
      document.body.appendChild(successDiv);
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);

      form.reset();
      setStep(1);
      onSubmitted?.();
    }
  };

  let StepComponent;
  if (step === 1)
    StepComponent = (
      <Step1DogInfo
        data={form.data}
        updateField={form.updateField}
        updatePhoto={form.updatePhoto}
      />
    );
  else if (step === 2)
    StepComponent = (
      <Step3Traits data={form.data} updateField={form.updateField} />
    );
  else if (step === 3)
    StepComponent = (
      <Step2Health data={form.data} updateCheckbox={form.updateCheckbox} />
    );
  else
    StepComponent = (
      <Step4Documents
        data={form.data}
        updateDocuments={form.updateDocuments}
        removeDocument={form.removeDocument}
        onSubmit={submit}
      />
    );

  return (
    <div className="modern-form-container">
      <div className="modern-form-card">
        {/* Progress Indicator */}
        <div className="modern-progress-wrapper">
          <div className="modern-progress-header">
            <h2 className="modern-step-title">
              Step {step} of {TOTAL_STEPS}
            </h2>
            <div className="modern-progress-bar">
              <div
                className="modern-progress-fill"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            step === TOTAL_STEPS ? submit() : goNext();
          }}
        >
          <div className="modern-step-content">
            <div className="step-section-header">
              <h3 className="step-section-title">
                {step === 1 && "Basic Information"}
                {step === 2 && "Personality & Traits"}
                {step === 3 && "Health & Medical Records"}
                {step === 4 && "Documents & Final Review"}
              </h3>
              <p className="step-section-description">
                {step === 1 && "Tell us about your dog's basic details"}
                {step === 2 &&
                  "Help us understand your dog's personality and characteristics"}
                {step === 3 &&
                  "Share your dog's health information and medical history"}
                {step === 4 &&
                  "Upload documents and complete your dog's profile"}
              </p>
            </div>
            {StepComponent}
          </div>

          {/* Navigation */}
          <div className="modern-nav-bar">
            <button
              type="button"
              className={
                step === 1
                  ? "modern-btn-secondary disabled"
                  : "modern-btn-secondary"
              }
              disabled={step === 1}
              onClick={goPrev}
            >
              ← Previous
            </button>
            {step < TOTAL_STEPS && (
              <button
                type="button"
                className={
                  !canNext
                    ? "modern-btn-primary disabled"
                    : "modern-btn-primary"
                }
                disabled={!canNext}
                onClick={goNext}
              >
                Next Step →
              </button>
            )}
            {step === TOTAL_STEPS && (
              <button
                type="submit"
                className={
                  form.submitting
                    ? "modern-btn-primary disabled"
                    : "modern-btn-primary"
                }
                disabled={form.submitting}
              >
                {form.submitting ? "Submitting..." : "Complete Registration"}
              </button>
            )}
          </div>
        </form>

        {/* Error Display */}
        {form.error && (
          <div className="modern-error-message">
            <p>{form.error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

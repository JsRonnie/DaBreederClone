import React, { useState, useMemo, useEffect } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import useFormData from "../hooks/useFormData";
import Step1DogInfo from "../stepComponents/Step1DogInfo";
import Step2Health from "../stepComponents/Step2Health";
import Step3Traits from "../stepComponents/Step3Traits";
import Step4Documents from "../stepComponents/Step4Documents";
import StepNavigation from "../stepComponents/StepNavigation";
import "../stepComponents/stepbystepUI.css";
import "./AddDogForm.css"; // warm dog-lover theme for form
import { createCache } from "../lib/cache";
import { getCookie, setCookie, deleteCookie } from "../utils/cookies";

const TOTAL_STEPS = 4;

export default function DogForm({ onSubmitted }) {
  const [step, setStep] = useState(() => {
    try {
      const s = parseInt(getCookie("dogform_step") || "1", 10);
      return Number.isFinite(s) && s >= 1 && s <= TOTAL_STEPS ? s : 1;
    } catch {
      return 1;
    }
  });
  const form = useFormData();
  const formCache = React.useRef(
    createCache("dog-form", {
      storage: "localStorage",
      defaultTTL: 7 * 24 * 60 * 60 * 1000,
    })
  );

  // Apply modern background style when this component is mounted
  useEffect(() => {
    document.body.style.backgroundColor = "#f8fafc";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  // Restore cached form data on mount
  useEffect(() => {
    try {
      const saved = formCache.current.get("data");
      if (saved && typeof saved === "object") {
        form.setFormData(saved);
      }
    } catch {
      /* noop */
    }
    // Depend on the stable setter only to avoid rerunning every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.setFormData]);

  // Persist step and form data on changes (lightweight)
  useEffect(() => {
    try {
      setCookie("dogform_step", String(step), { days: 7 });
    } catch {
      /* noop */
    }
  }, [step]);

  useEffect(() => {
    try {
      // Avoid storing large File objects; strip filey fields before caching
      const { photo: _PHOTO, documents: _DOCS, ...rest } = form.data || {};
      formCache.current.set("data", rest);
    } catch {
      /* noop */
    }
  }, [form.data]);

  // Validation helpers for required steps
  const validateStep1 = (data) => {
    const errors = {};
    if (!data.name || !data.name.trim()) errors.name = "Dog name is required";
    if (!data.gender) errors.gender = "Gender is required";
    // Age (years only now) must be between 2 and 7
    if (!data.age_years) {
      errors.age_years = "Age (2-7 years) is required";
    } else {
      const yrs = parseInt(data.age_years, 10);
      if (isNaN(yrs) || yrs < 2 || yrs > 7) {
        errors.age_years = "Age must be a whole number between 2 and 7";
      }
    }
    if (!data.breed || !data.breed.trim()) errors.breed = "Breed is required";
    // Photo is now required
    if (!data.photo) errors.photo = "Dog photo is required";
    return errors;
  };

  const validateStep2 = (data) => {
    const errors = {};
    if (!data.size) errors.size = "Size is required";
    if (!data.weight_kg) {
      errors.weight_kg = "Weight is required";
    } else {
      const w = parseFloat(data.weight_kg);
      if (isNaN(w) || w < 1.5 || w > 91) {
        errors.weight_kg = "Weight must be between 1.5 and 91 kg";
      }
    }
    if (!data.coat_type) errors.coat_type = "Coat type is required";
    if (!data.color) errors.color = "Color/markings are required";
    if (!data.activity_level) errors.activity_level = "Activity level is required";
    if (!data.sociability) errors.sociability = "Sociability is required";
    if (!data.trainability) errors.trainability = "Trainability is required";
    return errors;
  };

  const stepErrors = useMemo(() => {
    if (step === 1) return validateStep1(form.data);
    if (step === 2) return validateStep2(form.data);
    return {};
  }, [step, form.data]);

  const canNext = useMemo(() => {
    if (step === 1 || step === 2) return Object.keys(stepErrors).length === 0;
    return true;
  }, [step, stepErrors]);

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    const id = await form.submit();
    if (id) {
      // Warm-themed success notification
      const successDiv = document.createElement("div");
      successDiv.className = "success-toast";
      successDiv.innerHTML = `✓ Dog registered successfully!`;
      document.body.appendChild(successDiv);
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);

      form.reset();
      setStep(1);
      try {
        formCache.current.delete("data");
        deleteCookie("dogform_step");
      } catch {
        /* noop */
      }
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
        errors={stepErrors}
      />
    );
  else if (step === 2)
    StepComponent = (
      <Step3Traits data={form.data} updateField={form.updateField} errors={stepErrors} />
    );
  else if (step === 3)
    StepComponent = <Step2Health data={form.data} updateCheckbox={form.updateCheckbox} />;
  else
    StepComponent = (
      <Step4Documents
        data={form.data}
        updateDocuments={form.updateDocuments}
        removeDocument={form.removeDocument}
        onSubmit={submit}
        isSubmitting={form.submitting}
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
                {step === 2 && "Help us understand your dog's personality and characteristics"}
                {step === 3 && "Share your dog's health information and medical history"}
                {step === 4 && "Upload documents and complete your dog's profile"}
              </p>
            </div>
            {StepComponent}
          </div>

          {/* Navigation */}
          <div className="modern-nav-bar">
            <button
              type="button"
              className={step === 1 ? "modern-btn-secondary disabled" : "modern-btn-secondary"}
              disabled={step === 1}
              onClick={goPrev}
            >
              <span className="inline-flex items-center gap-2">
                <FaArrowLeft />
                Previous
              </span>
            </button>
            {step < TOTAL_STEPS && (
              <button
                type="button"
                className={!canNext ? "modern-btn-primary disabled" : "modern-btn-primary"}
                disabled={!canNext}
                onClick={goNext}
              >
                <span className="inline-flex items-center gap-2">
                  Next Step <FaArrowRight />
                </span>
              </button>
            )}
            {step === TOTAL_STEPS && (
              <button
                type="submit"
                className={form.submitting ? "modern-btn-primary disabled" : "modern-btn-primary"}
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

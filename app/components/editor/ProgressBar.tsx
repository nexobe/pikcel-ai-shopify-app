// Progress Bar Component for Multi-Step Wizard
import { memo } from "react";

interface Step {
  label: string;
  description?: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
}

export const ProgressBar = memo(({ steps, currentStep }: ProgressBarProps) => {
  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Progress indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
          position: "relative",
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.label}
            style={{
              flex: 1,
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Step number circle */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor:
                  index <= currentStep ? "#008060" : "#E1E3E5",
                color: index <= currentStep ? "#fff" : "#6D7175",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                fontSize: "0.875rem",
                marginBottom: "0.5rem",
                transition: "all 0.3s ease",
                boxShadow: index === currentStep ? "0 0 0 4px rgba(0, 128, 96, 0.2)" : "none",
              }}
            >
              {index < currentStep ? "✓" : index + 1}
            </div>

            {/* Step label */}
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: index === currentStep ? "600" : "400",
                color: index <= currentStep ? "#202223" : "#6D7175",
                transition: "all 0.3s ease",
              }}
            >
              {step.label}
            </div>

            {/* Step description (optional) */}
            {step.description && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6D7175",
                  marginTop: "0.25rem",
                }}
              >
                {step.description}
              </div>
            )}

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  left: "calc(50% + 20px)",
                  width: "calc(100% - 40px)",
                  height: "2px",
                  backgroundColor: index < currentStep ? "#008060" : "#E1E3E5",
                  zIndex: 0,
                  transition: "all 0.3s ease",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress percentage bar */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#E1E3E5",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            height: "100%",
            backgroundColor: "#008060",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Step info */}
      <div
        style={{
          marginTop: "1rem",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6D7175",
        }}
      >
        Step {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

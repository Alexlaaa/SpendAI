import React from "react";
import { PasswordValidations } from "@/hooks/usePasswordValidation";

interface PasswordRequirementsProps {
  validations: PasswordValidations;
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ validations }) => {
  return (
    <div className="text-sm mt-2">
      <p>Password requirements:</p>
      <ul className="list-disc ml-4">
        <li className={validations.minLength ? "text-green-600" : "text-red-600"}>
          Minimum 8 characters
        </li>
        <li className={validations.hasAlpha ? "text-green-600" : "text-red-600"}>
          Contains alphabetic characters (a-z, A-Z)
        </li>
        <li className={validations.hasUpperLower ? "text-green-600" : "text-red-600"}>
          Contains both uppercase and lowercase letters
        </li>
        <li className={validations.hasNumber ? "text-green-600" : "text-red-600"}>
          Contains numbers (0-9)
        </li>
        <li className={validations.hasSymbol ? "text-green-600" : "text-red-600"}>
          Contains at least 1 symbol (!@#$%^&* etc.)
        </li>
      </ul>
    </div>
  );
};

export default PasswordRequirements;

'use client'

import { useState } from "react";

export interface PasswordValidations {
  minLength: boolean;
  hasNumber: boolean;
  hasAlpha: boolean;
  hasSymbol: boolean;
  hasUpperLower: boolean;
}

export const usePasswordValidation = () => {
  const [passwordValidations, setPasswordValidations] = useState<PasswordValidations>({
    minLength: false,
    hasNumber: false,
    hasAlpha: false,
    hasSymbol: false,
    hasUpperLower: false,
  });

  const validatePassword = (password: string) => {
    const validations = {
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasAlpha: /[a-zA-Z]/.test(password),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasUpperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    };
    setPasswordValidations(validations);
    return Object.values(validations).every(Boolean);
  };

  return { passwordValidations, validatePassword };
};

import { AUTH_LIMITS } from '../constants/auth';
import type { Registration } from '../types/account';

export type FormErrors = Partial<Record<keyof Registration, string>>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > AUTH_LIMITS.maxEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Informe um e-mail válido.';
  }
}

export function validateName(nome: string): string | undefined {
  if (nome.trim().length < AUTH_LIMITS.minName || nome.trim().length > AUTH_LIMITS.maxName) {
    return 'O nome deve ter entre 2 e 80 caracteres.';
  }
}

export function validateLogin(values: Pick<Registration, 'email' | 'password'>): FormErrors {
  const errors: FormErrors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = 'Informe sua senha.';
  return errors;
}

export function validateRegistration(values: Registration): FormErrors {
  const errors = validateLogin(values);
  const nameError = validateName(values.nome);
  if (nameError) errors.nome = nameError;
  if (values.password.length < AUTH_LIMITS.minPassword || values.password.length > AUTH_LIMITS.maxPassword) {
    errors.password = 'Use uma senha com 8 a 128 caracteres.';
  }
  if (values.password !== values.confirmation) errors.confirmation = 'As senhas precisam ser iguais.';
  return errors;
}

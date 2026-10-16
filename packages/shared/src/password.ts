/** Évaluation simple de la robustesse d'un mot de passe (indicateur visuel, pas une règle). */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (classes >= 2) score++;
  if (classes >= 3 && password.length >= 12) score++;
  if (/^(.)\1+$/.test(password) || new Set(password).size < 4) score = Math.min(score, 1);
  if (password.length < 10) score = Math.min(score, 1);
  return Math.max(1, Math.min(4, score)) as PasswordStrength;
}

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: '',
  1: 'Faible',
  2: 'Correct',
  3: 'Solide',
  4: 'Redoutable',
};

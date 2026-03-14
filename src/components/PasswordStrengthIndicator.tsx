import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const results = useMemo(() => rules.map(r => ({ ...r, passed: r.test(password) })), [password]);
  const strength = results.filter(r => r.passed).length;
  const percent = (strength / rules.length) * 100;

  const color = strength <= 1 ? "bg-destructive" : strength <= 3 ? "bg-yellow-500" : "bg-primary";
  const label = strength <= 1 ? "Weak" : strength <= 3 ? "Fair" : strength === 4 ? "Good" : "Strong";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <ul className="space-y-1">
        {results.map(r => (
          <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.passed ? "text-primary" : "text-muted-foreground"}`}>
            {r.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const isPasswordStrong = (password: string) => rules.every(r => r.test(password));

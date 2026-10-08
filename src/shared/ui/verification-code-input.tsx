import { useI18n } from "../../i18n/I18nProvider";
import { onboardingTranslator } from "../../i18n/onboardingMessages";
import { OTPField } from "@base-ui/react/otp-field";

type VerificationCodeInputProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/** Base UI OTP Field provides native paste, autofill, arrow keys and backspace. */
export function VerificationCodeInput({ id, value, onValueChange, disabled, invalid, describedBy }: VerificationCodeInputProps) {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  return <OTPField.Root
    aria-describedby={describedBy}
    className="onboarding-code-field"
    data-has-error={invalid || undefined}
    disabled={disabled}
    id={id}
    length={6}
    onValueChange={onValueChange}
    value={value}
  >
    {Array.from({ length: 6 }, (_, index) => <OTPField.Input
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-label={index === 0 ? undefined : t("验证码第 {position} 位", { position: index + 1 })}
      className="onboarding-code-digit"
      data-autofocus={index === 0 ? "true" : undefined}
      key={index}
      placeholder="·"
    />)}
  </OTPField.Root>;
}

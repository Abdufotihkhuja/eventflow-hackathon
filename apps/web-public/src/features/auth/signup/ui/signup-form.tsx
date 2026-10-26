"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiError } from "@shared/lib/apiClient";
import {
  workspaceBillingIntentPath,
  type SignupPlanKey,
} from "@shared/lib/billing-intent";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { Form } from "@shared/ui/form";

import {
  createOrganizerSignupSchema,
  createUserSignupSchema,
  useSignupMutation,
  type AccountTypeSelection,
  type OrganizerSignupFormData,
  type UserSignupFormData,
} from "../model";

import { AccountTypeStep } from "./steps/account-type-step";
import { CredentialsStep } from "./steps/credentials-step";
import { DetailsStep } from "./steps/details-step";

import type { AccountType } from "@shared/api/authService";

const ORGANIZER_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://app.localhost";

/**
 * Превращает технические ошибки API в понятный пользователю текст.
 * 429 / ThrottlerException — частый кейс на регистрации (rate limit).
 */
function resolveSignupErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  const isRateLimited =
    (error instanceof ApiError && error.status === 429) ||
    (error instanceof Error &&
      /throttler|too many requests/i.test(error.message));
  if (isRateLimited) {
    return t("public.auth.tooManyRequests");
  }
  // 409: the email is taken. Most of these are people who signed up earlier and
  // try again instead of logging in, so point them to login and password reset
  // rather than showing the raw server message.
  if (error instanceof ApiError && error.status === 409) {
    return t("public.auth.emailAlreadyRegistered");
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return t("public.auth.registrationError");
}

interface SharedDefaults {
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}

interface UserExtras {
  firstName: string;
  lastName: string;
}

interface OrganizerExtras {
  organizationName: string;
  description: string;
}

const EMPTY_SHARED: SharedDefaults = {
  email: "",
  password: "",
  passwordConfirm: "",
  acceptTerms: false,
};

const EMPTY_USER_EXTRAS: UserExtras = { firstName: "", lastName: "" };
const EMPTY_ORG_EXTRAS: OrganizerExtras = {
  organizationName: "",
  description: "",
};

interface SignupFormProps {
  /**
   * Paid plan preselected by a /pricing CTA (P-7). Organizer-only context:
   * carried through the wizard (and verify-email) so the final cabinet
   * redirect lands on /settings/billing with the request dialog preselected.
   */
  plan?: SignupPlanKey | null;
  /** Account type selected by a trusted entry point, such as workspace login. */
  initialAccountType?: AccountTypeSelection;
}

export const SignupForm = ({
  plan = null,
  initialAccountType = null,
}: SignupFormProps): React.JSX.Element => {
  const [accountType, setAccountType] =
    useState<AccountTypeSelection>(initialAccountType);
  const sharedRef = useRef<SharedDefaults>(EMPTY_SHARED);
  const userExtrasRef = useRef<UserExtras>(EMPTY_USER_EXTRAS);
  const orgExtrasRef = useRef<OrganizerExtras>(EMPTY_ORG_EXTRAS);

  const handleSelect = (type: AccountType): void => {
    setAccountType(type);
  };

  const handleChangeAccountTypeFromUser = (
    snapshot: UserSignupFormData
  ): void => {
    sharedRef.current = {
      email: snapshot.email ?? "",
      password: snapshot.password ?? "",
      passwordConfirm: snapshot.passwordConfirm ?? "",
      acceptTerms: snapshot.acceptTerms ?? false,
    };
    userExtrasRef.current = {
      firstName: snapshot.firstName ?? "",
      lastName: snapshot.lastName ?? "",
    };
    setAccountType(null);
  };

  const handleChangeAccountTypeFromOrganizer = (
    snapshot: OrganizerSignupFormData
  ): void => {
    sharedRef.current = {
      email: snapshot.email ?? "",
      password: snapshot.password ?? "",
      passwordConfirm: snapshot.passwordConfirm ?? "",
      acceptTerms: snapshot.acceptTerms ?? false,
    };
    orgExtrasRef.current = {
      organizationName: snapshot.organizationName ?? "",
      description: snapshot.description ?? "",
    };
    setAccountType(null);
  };

  if (accountType === null) {
    return (
      <AccountTypeStep
        selected={null}
        onSelect={handleSelect}
      />
    );
  }

  return accountType === "user" ? (
    <UserSignupWizard
      key="user-wizard"
      sharedDefaults={sharedRef.current}
      extrasDefaults={userExtrasRef.current}
      onChangeAccountType={handleChangeAccountTypeFromUser}
    />
  ) : (
    <OrganizerSignupWizard
      key="organizer-wizard"
      sharedDefaults={sharedRef.current}
      extrasDefaults={orgExtrasRef.current}
      plan={plan}
      onChangeAccountType={handleChangeAccountTypeFromOrganizer}
    />
  );
};

// ============================================================================
// User wizard
// ============================================================================

const USER_DETAILS_FIELDS = ["firstName", "lastName", "email"] as const;

interface UserWizardProps {
  sharedDefaults: SharedDefaults;
  extrasDefaults: UserExtras;
  onChangeAccountType: (snapshot: UserSignupFormData) => void;
}

const UserSignupWizard = ({
  sharedDefaults,
  extrasDefaults,
  onChangeAccountType,
}: UserWizardProps): React.JSX.Element => {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const signupMutation = useSignupMutation();

  const methods = useForm<UserSignupFormData>({
    resolver: zodResolver(createUserSignupSchema(t)),
    mode: "onSubmit",
    defaultValues: {
      accountType: "user",
      firstName: extrasDefaults.firstName,
      lastName: extrasDefaults.lastName,
      email: sharedDefaults.email,
      password: sharedDefaults.password,
      passwordConfirm: sharedDefaults.passwordConfirm,
      acceptTerms: sharedDefaults.acceptTerms,
    },
  });

  const isLoading =
    methods.formState.isSubmitting || signupMutation.isPending;
  const rootError = methods.formState.errors.root?.message;

  const advance = async (): Promise<void> => {
    const ok = await methods.trigger([...USER_DETAILS_FIELDS]);
    if (ok) setStep(2);
  };

  const submit = methods.handleSubmit((data) => {
    signupMutation.mutate(data, {
      onSuccess: (response) => {
        if (response.emailVerificationRequired) {
          router.push(
            withLocalePath(
              `/verify-email?email=${encodeURIComponent(data.email)}`,
              locale
            )
          );
        } else {
          router.push(withLocalePath("/", locale));
        }
      },
      onError: (error) => {
        methods.setError("root", {
          message: resolveSignupErrorMessage(error, t),
        });
      },
    });
  });

  const handleChangeType = (): void => {
    onChangeAccountType(methods.getValues());
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (step === 1) {
      void advance();
    } else {
      void submit();
    }
  };

  return (
    <Form {...methods}>
      <form onSubmit={onFormSubmit} noValidate>
        <input
          type="hidden"
          {...methods.register("accountType")}
          value="user"
        />
        {step === 1 ? (
          <DetailsStep
            accountType="user"
            isLoading={isLoading}
            onBack={handleChangeType}
            onChangeAccountType={handleChangeType}
            onContinue={() => void advance()}
          />
        ) : (
          <CredentialsStep
            accountType="user"
            isLoading={isLoading}
            rootError={rootError}
            onBack={() => setStep(1)}
            onChangeAccountType={handleChangeType}
          />
        )}
      </form>
    </Form>
  );
};

// ============================================================================
// Organizer wizard
// ============================================================================

const ORGANIZER_DETAILS_FIELDS = [
  "organizationName",
  "email",
  "description",
] as const;

interface OrganizerWizardProps {
  sharedDefaults: SharedDefaults;
  extrasDefaults: OrganizerExtras;
  /** Paid plan preselected by a /pricing CTA (P-7); null — plain signup. */
  plan: SignupPlanKey | null;
  onChangeAccountType: (snapshot: OrganizerSignupFormData) => void;
}

const OrganizerSignupWizard = ({
  sharedDefaults,
  extrasDefaults,
  plan,
  onChangeAccountType,
}: OrganizerWizardProps): React.JSX.Element => {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const signupMutation = useSignupMutation();

  const methods = useForm<OrganizerSignupFormData>({
    resolver: zodResolver(createOrganizerSignupSchema(t)),
    mode: "onSubmit",
    defaultValues: {
      accountType: "organizer",
      organizationName: extrasDefaults.organizationName,
      email: sharedDefaults.email,
      password: sharedDefaults.password,
      passwordConfirm: sharedDefaults.passwordConfirm,
      description: extrasDefaults.description,
      acceptTerms: sharedDefaults.acceptTerms,
    },
  });

  const isLoading =
    methods.formState.isSubmitting || signupMutation.isPending;
  const rootError = methods.formState.errors.root?.message;

  const advance = async (): Promise<void> => {
    const ok = await methods.trigger([...ORGANIZER_DETAILS_FIELDS]);
    if (ok) setStep(2);
  };

  const submit = methods.handleSubmit((data) => {
    signupMutation.mutate(data, {
      onSuccess: (response) => {
        if (response.emailVerificationRequired) {
          // P-7: carry the /pricing plan context through the verification step.
          const planParam = plan ? `&plan=${plan}` : "";
          router.push(
            withLocalePath(
              `/verify-email?email=${encodeURIComponent(data.email)}&type=organizer${planParam}`,
              locale
            )
          );
        } else {
          // P-7: land on the cabinet billing page with the plan preselected.
          window.location.assign(
            plan
              ? `${ORGANIZER_APP_URL}${workspaceBillingIntentPath(plan)}`
              : ORGANIZER_APP_URL
          );
        }
      },
      onError: (error) => {
        methods.setError("root", {
          message: resolveSignupErrorMessage(error, t),
        });
      },
    });
  });

  const handleChangeType = (): void => {
    onChangeAccountType(methods.getValues());
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (step === 1) {
      void advance();
    } else {
      void submit();
    }
  };

  return (
    <Form {...methods}>
      <form onSubmit={onFormSubmit} noValidate>
        <input
          type="hidden"
          {...methods.register("accountType")}
          value="organizer"
        />
        {step === 1 ? (
          <DetailsStep
            accountType="organizer"
            isLoading={isLoading}
            onBack={handleChangeType}
            onChangeAccountType={handleChangeType}
            onContinue={() => void advance()}
          />
        ) : (
          <CredentialsStep
            accountType="organizer"
            isLoading={isLoading}
            rootError={rootError}
            onBack={() => setStep(1)}
            onChangeAccountType={handleChangeType}
          />
        )}
      </form>
    </Form>
  );
};

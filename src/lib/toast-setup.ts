import { toast } from "sonner";

const AUTH_TOKEN_MESSAGES = [
  "no se proporcionó token de autenticación",
  "no se encontró el token de autenticación",
];

const shouldSuppressToast = (message: unknown) => {
  if (typeof message !== "string") return false;
  const normalized = message.trim().toLowerCase();
  return AUTH_TOKEN_MESSAGES.some((text) => normalized.includes(text));
};

const wrapToastMethod = <T extends (...args: any[]) => any>(method: T): T => {
  return ((...args: any[]) => {
    if (shouldSuppressToast(args[0])) {
      return null;
    }
    return method(...args);
  }) as T;
};

toast.error = wrapToastMethod(toast.error);
toast.warning = wrapToastMethod(toast.warning);
toast.info = wrapToastMethod(toast.info);

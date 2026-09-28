export type MatchPaymentMethod = "YAPE" | "PLIN";

export function mobileCheckoutStatus(
  method: MatchPaymentMethod | null,
  accepted: boolean,
) {
  if (!method && !accepted) {
    return {
      ready: false,
      message: "Elige Yape o Plin y acepta la cuota y la política.",
    };
  }
  if (!method) {
    return { ready: false, message: "Elige Yape o Plin para continuar." };
  }
  if (!accepted) {
    return {
      ready: false,
      message: "Acepta la cuota y la política para continuar.",
    };
  }
  return { ready: true, message: "Listo para reservar tu cupo." };
}

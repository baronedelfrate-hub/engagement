// Limite de conta (cheque especial / conta garantida): saldo negativo significa que o limite está em uso.
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const usoDoLimite = (saldo, limite) => {
  const s = arred(saldo);
  const l = Math.max(0, arred(limite));
  const usado = s < 0 ? arred(-s) : 0;
  return {
    saldo: s,
    limite: l,
    usando: usado > 0,
    usado: l > 0 ? Math.min(usado, l) : usado,       // quanto do limite está em uso
    excedido: arred(Math.max(0, usado - l)),         // quanto passou do limite (ou ficou negativo sem limite cadastrado)
    estourou: usado > l,
    restante: arred(Math.max(0, l - usado)),         // limite ainda livre
    percentual: l > 0 ? Math.round((Math.min(usado, l) / l) * 1000) / 10 : null,
    disponivel: arred(s + l)                         // saldo + limite = quanto dá para gastar
  };
};

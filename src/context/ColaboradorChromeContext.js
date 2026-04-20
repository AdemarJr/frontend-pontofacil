import { createContext, useContext } from 'react';

/** Esconde header + tab bar do app colaborador (câmera, sucesso, erro em tela cheia). */
export const ColaboradorChromeContext = createContext({
  setChromeHidden: () => {},
});

export function useColaboradorChrome() {
  return useContext(ColaboradorChromeContext);
}

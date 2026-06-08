// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tenantService } from '../services/api';
import { featuresPadrao, isFolhaHabilitada } from '../utils/features';

const AuthContext = createContext(null);

async function buscarFeaturesAtualizadas() {
  try {
    const { data } = await tenantService.getFeatures();
    if (data && typeof data.payrollModuleEnabled !== 'undefined') {
      return data;
    }
  } catch {
    // endpoint novo pode não existir em backend antigo
  }
  try {
    const { data } = await tenantService.meu();
    return data?.features ?? featuresPadrao(data?.id);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarUsuario = useCallback((partial) => {
    setUsuario((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        ...partial,
        tenant: partial.tenant
          ? { ...(prev.tenant || {}), ...partial.tenant }
          : prev.tenant,
      };
      localStorage.setItem('usuario', JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshTenantFeatures = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    const dados = localStorage.getItem('usuario');
    if (!token || !dados) return null;
    let parsed;
    try {
      parsed = JSON.parse(dados);
    } catch {
      return null;
    }
    if (parsed.role !== 'ADMIN' || !parsed.tenant?.id) return null;

    const features = await buscarFeaturesAtualizadas();
    if (!features) return null;

    atualizarUsuario({ tenant: { features } });
    return features;
  }, [atualizarUsuario]);

  const login = useCallback(async (dadosUsuario, accessToken, refreshToken) => {
    let features = dadosUsuario.tenant?.features ?? featuresPadrao(dadosUsuario.tenant?.id);

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    const usuarioInicial = {
      ...dadosUsuario,
      tenant: dadosUsuario.tenant
        ? { ...dadosUsuario.tenant, features }
        : dadosUsuario.tenant,
    };
    localStorage.setItem('usuario', JSON.stringify(usuarioInicial));
    setUsuario(usuarioInicial);

    if (dadosUsuario.role === 'ADMIN' && dadosUsuario.tenant?.id) {
      const atualizado = await buscarFeaturesAtualizadas();
      if (atualizado) {
        features = atualizado;
        atualizarUsuario({ tenant: { features } });
      }
    }

    return { ...usuarioInicial, tenant: { ...usuarioInicial.tenant, features } };
  }, [atualizarUsuario]);

  function logout() {
    localStorage.clear();
    setUsuario(null);
  }

  useEffect(() => {
    const dados = localStorage.getItem('usuario');
    const token = localStorage.getItem('accessToken');
    if (!dados || !token) {
      setCarregando(false);
      return undefined;
    }
    setUsuario(JSON.parse(dados));
    let ativo = true;
    refreshTenantFeatures().finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [refreshTenantFeatures]);

  const isSuperAdmin = usuario?.role === 'SUPER_ADMIN';
  const isAdmin = usuario?.role === 'ADMIN' || isSuperAdmin;
  const tenantId = usuario?.tenant?.id;
  const folhaHabilitada = isFolhaHabilitada(usuario?.tenant?.features);

  return (
    <AuthContext.Provider value={{
      usuario,
      login,
      logout,
      atualizarUsuario,
      refreshTenantFeatures,
      isSuperAdmin,
      isAdmin,
      tenantId,
      folhaHabilitada,
      carregando,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

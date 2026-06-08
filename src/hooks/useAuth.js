// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tenantService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  function login(dadosUsuario, accessToken, refreshToken) {
    const usuarioNorm = {
      ...dadosUsuario,
      tenant: dadosUsuario.tenant
        ? {
            ...dadosUsuario.tenant,
            features: dadosUsuario.tenant.features ?? { payrollModuleEnabled: false },
          }
        : dadosUsuario.tenant,
    };
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('usuario', JSON.stringify(usuarioNorm));
    setUsuario(usuarioNorm);
  }

  function logout() {
    localStorage.clear();
    setUsuario(null);
  }

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
    try {
      const { data } = await tenantService.meu();
      const features = data?.features ?? { payrollModuleEnabled: false };
      atualizarUsuario({ tenant: { features } });
      return features;
    } catch {
      return null;
    }
  }, [atualizarUsuario]);

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

  return (
    <AuthContext.Provider value={{ usuario, login, logout, atualizarUsuario, refreshTenantFeatures, isSuperAdmin, isAdmin, tenantId, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

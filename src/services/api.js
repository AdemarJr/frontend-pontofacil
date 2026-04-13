// src/services/api.js
import axios from 'axios';

/**
 * Base da API: deve apontar para o prefixo `/api` do backend (Express monta tudo em `/api/...`).
 * Aceita tanto `https://host/api` quanto só `https://host` (acrescenta `/api` no fim).
 */
function normalizeApiBaseUrl(raw) {
  const fallback = 'http://localhost:3001/api';
  if (!raw || typeof raw !== 'string') return fallback;
  let base = raw.trim().replace(/\/+$/, '');
  if (!base.endsWith('/api')) base = `${base}/api`;
  return base;
}

const API_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Injeta token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh automático de token ao receber 401
let refreshando = false;
let filaEspera = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;

      if (refreshando) {
        return new Promise((resolve, reject) => {
          filaEspera.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      refreshando = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        filaEspera.forEach((p) => p.resolve(data.accessToken));
        filaEspera = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (err) {
        filaEspera.forEach((p) => p.reject(err));
        filaEspera = [];
        localStorage.clear();
        window.location.href = '/login';
      } finally {
        refreshando = false;
      }
    }
    return Promise.reject(error);
  }
);

// ---- AUTH ----
export const authService = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  loginPin: (pin, tenantId, deviceId) => api.post('/auth/login-pin', { pin, tenantId, deviceId }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (body) => api.post('/auth/forgot-password', body),
  resetPassword: (body) => api.post('/auth/reset-password', body),
};

// ---- PONTO ----
export const pontoService = {
  registrar: (dados) => api.post('/ponto/registrar', dados),
  listar: (params) => api.get('/ponto', { params }),
  ultimoPonto: (usuarioId) => api.get(`/ponto/ultimo/${usuarioId}`),
};

// ---- COMPROVANTES DE AUSÊNCIA (atestado / falta) ----
export const comprovanteAusenciaService = {
  criar: (dados) => api.post('/comprovantes-ausencia', dados, { timeout: 120000 }),
  minhas: () => api.get('/comprovantes-ausencia/minhas', { timeout: 60000 }),
  listar: (params) => api.get('/comprovantes-ausencia', { params, timeout: 60000 }),
  obter: (id) => api.get(`/comprovantes-ausencia/${id}`, { timeout: 60000 }),
  decidir: (id, dados) => api.put(`/comprovantes-ausencia/${id}/decidir`, dados),
};

// ---- USUÁRIOS ----
export const usuarioService = {
  listar: () => api.get('/usuarios'),
  buscar: (id) => api.get(`/usuarios/${id}`),
  obterPin: (id) => api.get(`/usuarios/${id}/pin`),
  criar: (dados) => api.post('/usuarios', dados),
  atualizar: (id, dados) => api.put(`/usuarios/${id}`, dados),
  remover: (id) => api.delete(`/usuarios/${id}`),
  excluirDefinitivo: (id) => api.delete(`/usuarios/${id}/definitivo`),
};

// ---- ESCALAS (jornada) ----
export const escalaService = {
  listar: (usuarioId) => api.get('/escalas', { params: { usuarioId } }),
  criar: (dados) => api.post('/escalas', dados),
  atualizar: (id, dados) => api.put(`/escalas/${id}`, dados),
  remover: (id) => api.delete(`/escalas/${id}`),
  minha: () => api.get('/escalas/minha'),
  resumo: () => api.get('/escalas/resumo'),
};

// ---- LOCAIS DE REGISTRO (cerca virtual múltipla) ----
export const localRegistroService = {
  listar: () => api.get('/locais-registro'),
  criar: (dados) => api.post('/locais-registro', dados),
  atualizar: (id, dados) => api.put(`/locais-registro/${id}`, dados),
  remover: (id) => api.delete(`/locais-registro/${id}`),
};

// ---- RELATÓRIOS ----
export const relatorioService = {
  espelhoPonto: (params) => api.get('/relatorios/espelho', { params }),
  bancoHorasResumo: (params) => api.get('/relatorios/banco-horas', { params }),
  resumoDia: () => api.get('/relatorios/resumo-dia'),
  ajustarPonto: (dados) => api.post('/relatorios/ajuste', dados),
  inserirPontoManual: (dados) => api.post('/relatorios/inserir', dados),
  /**
   * Exporta espelho com colunas para contador (regras básicas no servidor).
   * format: csv | xlsx | pdf
   */
  downloadEspelhoExport: async ({ mes, ano, usuarioId, format }) => {
    try {
      const res = await api.get('/relatorios/espelho/export', {
        params: {
          mes,
          ano,
          format,
          ...(usuarioId ? { usuarioId } : {}),
        },
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'];
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      let filename = `espelho_ponto_${mes}_${ano}.${ext}`;
      if (disposition && /filename=/i.test(disposition)) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
        if (m && m[1]) filename = decodeURIComponent(m[1].trim());
      }
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const data = err.response?.data;
      if (data instanceof Blob) {
        const text = await data.text();
        try {
          const j = JSON.parse(text);
          throw new Error(j.error || 'Erro ao exportar');
        } catch (e) {
          if (e instanceof SyntaxError) throw new Error(text || 'Erro ao exportar');
          throw e;
        }
      }
      throw err;
    }
  },
};

// ---- TENANT ----
export const tenantService = {
  meu: () => api.get('/tenants/meu'),
  atualizar: (dados) => api.put('/tenants/meu', dados),
  info: (tenantId) => api.get(`/tenants/${tenantId}/info`),
};

// ---- SUPER ADMIN ----
export const superAdminService = {
  listarTenants: () => api.get('/super-admin/tenants'),
  criarTenant: (dados) => api.post('/super-admin/tenants', dados),
  criarAdminTenant: (tenantId, dados) => api.post(`/super-admin/tenants/${tenantId}/admin`, dados),
  resetSenhaAdminTenant: (tenantId, adminId) =>
    api.post(`/super-admin/tenants/${tenantId}/admin/${adminId}/reset-senha`),
  atualizarTenant: (id, dados) => api.put(`/super-admin/tenants/${id}`, dados),
  atualizarStatus: (id, status) => api.put(`/super-admin/tenants/${id}/status`, { status }),
  limparRegistrosTenant: (tenantId, confirmarNomeFantasia) =>
    api.post(`/super-admin/tenants/${tenantId}/limpar-registros`, { confirmarNomeFantasia }),
  stats: () => api.get('/super-admin/stats'),
};

export default api;

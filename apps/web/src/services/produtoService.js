import { storage } from '@/lib/storage';

const COLLECTION = 'PRODUTOS';

export const produtoService = {
  list: async (filters = {}) => {
    try {
      let items = storage.get(COLLECTION);
      
      // Apply filtering
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        items = items.filter(item => 
          (item.nome && item.nome.toLowerCase().includes(searchLower)) ||
          (item.codigo_interno && item.codigo_interno.toLowerCase().includes(searchLower)) ||
          (item.codigo_barras && item.codigo_barras.includes(searchLower))
        );
      }
      
      if (filters.tipo && filters.tipo !== 'all') {
        items = items.filter(item => item.tipo === filters.tipo);
      }
      
      if (filters.status && filters.status !== 'all') {
        items = items.filter(item => item.status === filters.status);
      }

      if (filters.categoria && filters.categoria !== 'all') {
        items = items.filter(item => item.categoria === filters.categoria);
      }
      
      // Pagination logic could be here, but for localStorage we usually return filtered set
      // and paginate in UI or simulate it here.
      
      return { success: true, data: items };
    } catch (error) {
      console.error("Error listing products:", error);
      return { success: false, error: "Erro ao listar produtos" };
    }
  },

  getById: async (id) => {
    try {
      const item = storage.getById(COLLECTION, id);
      if (!item) return { success: false, error: "Produto não encontrado" };
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: "Erro ao buscar produto" };
    }
  },

  create: async (data) => {
    try {
      // Uniqueness checks
      const allProducts = storage.get(COLLECTION);
      if (data.codigo_interno && allProducts.some(p => p.codigo_interno === data.codigo_interno)) {
        return { success: false, error: "Código Interno já existe" };
      }
      if (data.codigo_barras && allProducts.some(p => p.codigo_barras === data.codigo_barras)) {
        return { success: false, error: "Código de Barras já existe" };
      }

      const newItem = storage.add(COLLECTION, data);
      return { success: true, data: newItem };
    } catch (error) {
      return { success: false, error: "Erro ao criar produto" };
    }
  },

  update: async (id, data) => {
    try {
      // Uniqueness checks (exclude self)
      const allProducts = storage.get(COLLECTION);
      if (data.codigo_interno && allProducts.some(p => p.codigo_interno === data.codigo_interno && p.id !== id)) {
        return { success: false, error: "Código Interno já existe" };
      }
      if (data.codigo_barras && allProducts.some(p => p.codigo_barras === data.codigo_barras && p.id !== id)) {
        return { success: false, error: "Código de Barras já existe" };
      }

      const updatedItem = storage.update(COLLECTION, id, data);
      return { success: true, data: updatedItem };
    } catch (error) {
      return { success: false, error: "Erro ao atualizar produto" };
    }
  },

  delete: async (id) => {
    try {
      storage.delete(COLLECTION, id);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erro ao excluir produto" };
    }
  }
};
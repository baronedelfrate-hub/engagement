import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useBPOCadastro = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  const showSuccess = useCallback((message) => {
    toast({
      title: "Sucesso",
      description: message,
      variant: "default",
    });
  }, [toast]);

  const showError = useCallback((message) => {
    toast({
      title: "Erro",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const filterData = useCallback((data, searchFields = ['nome']) => {
    if (!searchTerm) return data;
    
    return data.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [searchTerm]);

  const paginateData = useCallback((data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [currentPage, itemsPerPage]);

  const getTotalPages = useCallback((totalItems) => {
    return Math.ceil(totalItems / itemsPerPage);
  }, [itemsPerPage]);

  return {
    loading,
    setLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    showSuccess,
    showError,
    handleSearch,
    handlePageChange,
    filterData,
    paginateData,
    getTotalPages,
  };
};
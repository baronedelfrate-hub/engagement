export const validateParametrosFiscais = {
  validateDadosFiscais: (data) => {
    const errors = [];
    if (!data.regime_tributario) errors.push('Regime tributário é obrigatório.');
    if (data.inscricao_estadual && !/^\d{8,14}$/.test(data.inscricao_estadual.replace(/\D/g, ''))) {
      errors.push('Inscrição Estadual com formato inválido (somente números, 8 a 14 dígitos).');
    }
    return errors;
  },

  validateNfe: (data) => {
    const errors = [];
    if (!data.serie_padrao) errors.push('Série padrão da NF-e é obrigatória.');
    if (data.serie_padrao && !/^[A-Za-z0-9]+$/.test(data.serie_padrao)) {
      errors.push('Série padrão da NF-e deve ser alfanumérica.');
    }
    if (data.proximo_numero !== undefined && data.proximo_numero < 1) {
      errors.push('Próximo número da NF-e deve ser positivo.');
    }
    return errors;
  },

  validateNfse: (data) => {
    const errors = [];
    if (!data.serie_padrao) errors.push('Série padrão da NFS-e é obrigatória.');
    
    const percentageFields = [
      'aliquota_iss_padrao', 'retencao_irrf_padrao', 
      'retencao_pis_padrao', 'retencao_cofins_padrao', 'retencao_csll_padrao'
    ];
    
    percentageFields.forEach(field => {
      const val = parseFloat(data[field]);
      if (val < 0 || val > 100) errors.push(`Campo ${field} deve ser uma porcentagem entre 0 e 100.`);
    });
    
    if (data.proximo_numero !== undefined && data.proximo_numero < 1) errors.push('Próximo número da NFS-e deve ser positivo.');
    if (data.proximo_rps !== undefined && data.proximo_rps < 1) errors.push('Próximo RPS deve ser positivo.');

    return errors;
  },

  validateTributos: (tributos) => {
    const errors = [];
    tributos.forEach((t) => {
      if (!t.tipo_tributo) errors.push('Tipo de tributo é obrigatório.');
      const aliq = parseFloat(t.aliquota_padrao || 0);
      const ret = parseFloat(t.retencao_padrao || 0);
      if (aliq < 0 || aliq > 100) errors.push(`Alíquota para ${t.tipo_tributo} deve estar entre 0 e 100%.`);
      if (ret < 0 || ret > 100) errors.push(`Retenção para ${t.tipo_tributo} deve estar entre 0 e 100%.`);
    });
    return errors;
  },

  validateIntegradores: (data) => {
    const errors = [];
    if (data.integrador_nfe && data.integrador_nfe !== 'Nenhum' && !data.chave_nfe) {
      errors.push('Chave NF-e é obrigatória quando um integrador é selecionado.');
    }
    if (data.integrador_nfse && data.integrador_nfse !== 'Nenhum' && !data.chave_nfse) {
      errors.push('Chave NFS-e é obrigatória quando um integrador é selecionado.');
    }
    return errors;
  }
};
/**
 * Utility for NFS-e Tax Calculations
 * Regime: Lucro Presumido (Default assumptions)
 */

export const calculatePIS = (valor) => {
    // 0.65% for Lucro Presumido standard
    return valor * 0.0065;
};

export const calculateCOFINS = (valor) => {
    // 3.00% for Lucro Presumido standard
    return valor * 0.03;
};

export const calculateIRPJ = (valor, isClientePJ = true, retemImpostos = false) => {
    // 1.5% - Standard retention for many services
    // Only calculated/retained if value > 666.66 usually, or if configured
    if (!isClientePJ || !retemImpostos) return 0;
    return valor * 0.015;
};

export const calculateCSLL = (valor, isClientePJ = true, retemImpostos = false) => {
    // 1.0% - Standard retention
    if (!isClientePJ || !retemImpostos) return 0;
    return valor * 0.01;
};

export const calculateISS = (valor, aliquota, isRetido) => {
    // ISS is calculated but if retained, it's deducted from payment to provider
    // If not retained, provider pays.
    // This function returns the ISS amount regardless of who pays, for note info.
    return valor * (aliquota / 100);
};

export const calculateTotal = (valorServico, taxes = {}) => {
    // Total Liquido = Servico - Retencoes
    // Assuming PIS/COFINS are retained if value is high enough (R$ 215,05 sum > 10)
    // Simplified logic: If PIS/COFINS/IR/CSLL are calculated, assume they are retained for the net value logic
    // OR we just return the Gross Value of the Note. Usually 'Valor Total da Nota' = Valor Serviços.
    // 'Valor Liquido' is what is received.
    return valorServico; 
};

export const calculateLiquid = (valorServico, taxes = {}) => {
    let deductions = 0;
    if (taxes.issRetido) deductions += (taxes.iss || 0);
    if (taxes.pisRetido) deductions += (taxes.pis || 0);
    if (taxes.cofinsRetido) deductions += (taxes.cofins || 0);
    if (taxes.irRetido) deductions += (taxes.ir || 0);
    if (taxes.csllRetido) deductions += (taxes.csll || 0);
    
    return valorServico - deductions;
};

export const validateNfseData = (data) => {
    const errors = [];
    if (!data.cliente_id) errors.push("Cliente não informado");
    if (!data.codigo_servico) errors.push("Código do serviço não informado");
    if (!data.descricao_servico) errors.push("Descrição do serviço não informada");
    if (!data.valor_servicos || data.valor_servicos <= 0) errors.push("Valor do serviço inválido");
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const identifyServiceType = (descricao) => {
    const d = descricao.toLowerCase();
    if (d.includes('consultoria')) return 'consultoria';
    if (d.includes('desenvolvimento') || d.includes('software')) return 'desenvolvimento';
    if (d.includes('treinamento') || d.includes('curso')) return 'treinamento';
    return 'outros';
};

export const assignCNAE = (serviceType) => {
    const map = {
        'consultoria': '7020-4/00',
        'desenvolvimento': '6201-5/01',
        'treinamento': '8599-6/04',
        'outros': '0000-0/00'
    };
    return map[serviceType] || map['outros'];
};
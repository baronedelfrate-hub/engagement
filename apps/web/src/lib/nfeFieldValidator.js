export const validateItemFields = (item, index = null) => {
    const errors = [];
    const prefix = index !== null ? `Item ${index + 1}: ` : '';

    if (!item.produto_id && !item.servico_id) {
        errors.push(`${prefix}Selecione um Produto ou Serviço cadastrado (não é possível salvar apenas com descrição livre).`);
    }

    if (!item.quantidade || item.quantidade <= 0) {
        errors.push(`${prefix}Quantidade deve ser maior que zero.`);
    }
    
    if (item.valor_unitario === undefined || item.valor_unitario === null || item.valor_unitario < 0) {
        errors.push(`${prefix}Valor unitário inválido.`);
    }

    if (item.tipo_item === 'produto') {
        if (!item.ncm) errors.push(`${prefix}NCM é obrigatório para Produtos.`);
        if (!item.cfop) errors.push(`${prefix}CFOP é obrigatório para Produtos.`);
    } else if (item.tipo_item === 'servico') {
        if (!item.codigo_atividade) errors.push(`${prefix}Código de Atividade (LC 116/03) é obrigatório para Serviços.`);
        if (!item.cnae) errors.push(`${prefix}CNAE é obrigatório para Serviços.`);
    }

    return errors;
};

export const validateNFeFields = (pedido, itens) => {
    const errors = [];

    // Pedido & Cliente checks
    if (!pedido.cliente_id) errors.push("Cliente não selecionado.");
    if (!pedido.data_emissao) errors.push("Data de emissão é obrigatória.");
    
    // Itens checks
    if (!itens || itens.length === 0) {
        errors.push("O pedido deve conter pelo menos um item.");
    } else {
        itens.forEach((item, index) => {
            const itemErrors = validateItemFields(item, index);
            errors.push(...itemErrors);
        });
    }

    // Empresa Emitente checks
    if (!pedido.empresa_razao_social) errors.push("Razão Social da empresa emitente é obrigatória.");
    if (!pedido.empresa_cnpj) errors.push("CNPJ da empresa emitente é obrigatório.");
    if (!pedido.empresa_endereco) errors.push("Endereço da empresa emitente é obrigatório.");

    // Endereço de Entrega
    if (!pedido.endereco_entrega_mesmo_cliente) {
        if (!pedido.endereco_entrega_rua) errors.push("Rua do endereço de entrega é obrigatória.");
        if (!pedido.endereco_entrega_numero) errors.push("Número do endereço de entrega é obrigatório.");
        if (!pedido.endereco_entrega_bairro) errors.push("Bairro do endereço de entrega é obrigatório.");
        if (!pedido.endereco_entrega_cidade) errors.push("Cidade do endereço de entrega é obrigatória.");
        if (!pedido.endereco_entrega_estado) errors.push("Estado (UF) do endereço de entrega é obrigatório.");
        if (!pedido.endereco_entrega_cep) errors.push("CEP do endereço de entrega é obrigatório.");
    }

    // Pagamento
    if (!pedido.forma_pagamento) errors.push("Forma de pagamento é obrigatória.");

    return errors;
};
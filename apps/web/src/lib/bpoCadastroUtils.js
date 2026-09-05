export const formatTableData = (data, entityType) => {
  if (!data) return [];
  
  return data.map(item => ({
    ...item,
    formattedDate: item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-',
    status: item.ativo ? 'Ativo' : 'Inativo',
  }));
};

export const validateFormData = (data, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors[field] = 'Este campo é obrigatório';
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const getEntityLabel = (submenu) => {
  const labels = {
    'bancos': 'Bancos',
    'categorias': 'Categorias',
    'centros-custo': 'Centros de Custo',
    'clientes': 'Clientes',
    'condicoes-pagamento': 'Condições de Pagamento',
    'empresas': 'Empresas',
    'fornecedores': 'Fornecedores',
    'origem': 'Origem',
    'produtos': 'Produtos',
    'servicos': 'Serviços',
    'subcategorias': 'Subcategorias',
    'tipos-documento': 'Tipos de Documento',
    'tipos-pagamento': 'Tipos de Pagamento',
    'tipo-produto': 'Tipos de Produto',
    'tributos': 'Tributos',
    'unidades-medida': 'Unidades de Medida',
  };
  
  return labels[submenu] || submenu;
};

export const getEntityFields = (entityType) => {
  const fieldConfigs = {
    bancos: ['codigo', 'nome', 'agencia', 'conta', 'tipo_conta', 'saldo'],
    categorias: ['nome', 'descricao'],
    'centros-custo': ['codigo', 'nome', 'descricao'],
    clientes: ['nome', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'cnpj_cpf'],
    'condicoes-pagamento': ['nome', 'dias', 'percentual_desconto'],
    empresas: ['razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone'],
    fornecedores: ['nome', 'email', 'telefone', 'cnpj', 'endereco'],
    origem: ['nome', 'descricao'],
    produtos: ['nome', 'descricao', 'sku', 'preco_custo', 'preco_venda', 'estoque_minimo', 'estoque_atual'],
    servicos: ['nome', 'descricao', 'preco'],
    subcategorias: ['nome', 'descricao'],
    'tipos-documento': ['nome', 'sigla'],
    'tipos-pagamento': ['nome', 'descricao'],
    'tipo-produto': ['nome', 'descricao'],
    tributos: ['nome', 'aliquota'],
    'unidades-medida': ['nome', 'sigla'],
  };
  
  return fieldConfigs[entityType] || ['nome'];
};

export const mapSubmenuToService = (submenu) => {
  const serviceMap = {
    'bancos': 'bancosService',
    'categorias': 'categoriasService',
    'centros-custo': 'centrosCustoService',
    'clientes': 'clientesService',
    'condicoes-pagamento': 'condicoesPagamentoService',
    'empresas': 'empresasService',
    'fornecedores': 'fornecedoresService',
    'origem': 'origemService',
    'produtos': 'produtosService',
    'servicos': 'servicosService',
    'subcategorias': 'subcategoriasService',
    'tipos-documento': 'tiposDocumentoService',
    'tipos-pagamento': 'tiposPagamentoService',
    'tipo-produto': 'tiposProdutoService',
    'tributos': 'tributosService',
    'unidades-medida': 'unidadesMedidaService',
  };
  
  return serviceMap[submenu];
};

export const getDefaultFormValues = (entityType) => {
  const defaults = {
    bancos: { codigo: '', nome: '', agencia: '', conta: '', tipo_conta: '', saldo: 0, ativo: true },
    categorias: { nome: '', descricao: '', ativo: true },
    'centros-custo': { codigo: '', nome: '', descricao: '', ativo: true },
    clientes: { nome: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '', cnpj_cpf: '', tipo_cliente: 'PF', status: 'ativo' },
    'condicoes-pagamento': { nome: '', dias: 0, percentual_desconto: 0, ativo: true },
    empresas: { razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', ativo: true },
    fornecedores: { nome: '', email: '', telefone: '', cnpj: '', endereco: '', status: 'ativo' },
    origem: { nome: '', descricao: '', ativo: true },
    produtos: { nome: '', descricao: '', sku: '', preco_custo: 0, preco_venda: 0, estoque_minimo: 0, estoque_atual: 0, unidade_medida: 'UN', ativo: true },
    servicos: { nome: '', descricao: '', preco: 0, status: 'ativo' },
    subcategorias: { nome: '', descricao: '', ativo: true },
    'tipos-documento': { nome: '', sigla: '', ativo: true },
    'tipos-pagamento': { nome: '', descricao: '', ativo: true },
    'tipo-produto': { nome: '', descricao: '', ativo: true },
    tributos: { nome: '', aliquota: 0, ativo: true },
    'unidades-medida': { nome: '', sigla: '', ativo: true },
  };
  
  return defaults[entityType] || { nome: '', ativo: true };
};
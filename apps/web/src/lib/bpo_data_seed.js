export const BPO_SEED_DATA = {
  clientes: [
    {
      id: 'bpo_cli_001',
      nome_empresa: 'TechStart Solutions',
      plano_bpo: 'Premium',
      data_inicio_bpo: '2023-11-15',
      sla_padrao: '24h',
      status_onboarding: 'Concluído',
      status_operacao: 'Operação ativa',
      fase_atual: 'B2',
      alertas: []
    },
    {
      id: 'bpo_cli_002',
      nome_empresa: 'Green Market Ltda',
      plano_bpo: 'Start',
      data_inicio_bpo: '2024-01-05',
      sla_padrao: '48h',
      status_onboarding: 'Em onboarding',
      status_operacao: 'Pendente',
      fase_atual: 'B1',
      alertas: []
    }
  ],
  fase_b1: [
    {
      id: 'b1_001',
      bpo_cliente_id: 'bpo_cli_001',
      contrato_assinado: true,
      manual_cliente_enviado: true,
      acessos_bancarios_recebidos: true,
      acessos_sistemas_recebidos: true,
      clientes_cadastrados: true,
      fornecedores_cadastrados: true,
      plano_contas_configurado: true,
      centros_custo_definidos: true,
      rotina_financeira_alinhada: true,
      status: 'Onboarding concluído',
      data_conclusao: '2023-12-01'
    },
    {
      id: 'b1_002',
      bpo_cliente_id: 'bpo_cli_002',
      contrato_assinado: true,
      manual_cliente_enviado: true,
      acessos_bancarios_recebidos: false,
      acessos_sistemas_recebidos: false,
      clientes_cadastrados: true,
      fornecedores_cadastrados: false,
      plano_contas_configurado: true,
      centros_custo_definidos: false,
      rotina_financeira_alinhada: false,
      status: 'Em onboarding',
      data_conclusao: null
    }
  ],
  fase_b2: [
    {
      id: 'b2_001',
      bpo_cliente_id: 'bpo_cli_001',
      operacao_ativa: true,
      documentos_em_atraso: false,
      dias_atraso: 0,
      status: 'Operação ativa',
      data_inicio_operacao: '2023-12-02'
    }
  ],
  fase_b3: [],
  fase_b4: [],
  fase_b5: []
};

export const initializeBPOData = () => {
  if (!localStorage.getItem('bpo_clientes')) {
    localStorage.setItem('bpo_clientes', JSON.stringify(BPO_SEED_DATA.clientes));
    localStorage.setItem('bpo_fase_b1', JSON.stringify(BPO_SEED_DATA.fase_b1));
    localStorage.setItem('bpo_fase_b2', JSON.stringify(BPO_SEED_DATA.fase_b2));
    localStorage.setItem('bpo_fase_b3', JSON.stringify(BPO_SEED_DATA.fase_b3));
    localStorage.setItem('bpo_fase_b4', JSON.stringify(BPO_SEED_DATA.fase_b4));
    localStorage.setItem('bpo_fase_b5', JSON.stringify(BPO_SEED_DATA.fase_b5));
  }
};
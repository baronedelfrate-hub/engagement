// Seed data for F5 Methodology to simulate Supabase tables
export const F5_SEED_DATA = {
  projetos: [
    { 
      id: 'proj_001', 
      cliente_id: 'cli_001', 
      nome: 'Implementação Grupo Alpha', 
      responsavel_id: 'user_01', 
      data_inicio: '2023-11-01', 
      data_fim_prevista: '2024-05-30', 
      status: 'Em Andamento', 
      percentual_conclusao: 45 
    },
    { 
      id: 'proj_002', 
      cliente_id: 'cli_002', 
      nome: 'Reestruturação Beta Inc', 
      responsavel_id: 'user_02', 
      data_inicio: '2024-01-10', 
      data_fim_prevista: '2024-07-20', 
      status: 'Atrasado', 
      percentual_conclusao: 20 
    }
  ],
  etapas_template: [
    {
      ordem: 1,
      nome: 'F1 - Diagnóstico 360°',
      descricao: 'Mapeamento profundo e identificação de gargalos financeiros.',
      checklists: [
        'Reunião de Kick-off com Diretoria', 'Mapeamento de Processos (As-Is)', 'Entrevistas com Stakeholders', 
        'Análise de Sistemas Atuais', 'Levantamento de Dívidas', 'Análise de Fluxo de Caixa Histórico',
        'Verificação de Conformidade Fiscal', 'Diagnóstico de Cultura Financeira', 'Apresentação do Relatório de Diagnóstico'
      ]
    },
    {
      ordem: 2,
      nome: 'F2 - Estruturação',
      descricao: 'Construção da base: processos, políticas e ferramentas.',
      checklists: [
        'Definição do Plano de Contas Gerencial', 'Desenho de Processos (To-Be)', 'Escolha/Configuração de ERP',
        'Política de Reembolso', 'Política de Compras', 'Política de Crédito e Cobrança',
        'Definição de Centros de Custo', 'Matriz de Responsabilidades (RACI)', 'Validação dos Novos Processos'
      ]
    },
    {
      ordem: 3,
      nome: 'F3 - Implementação',
      descricao: 'Execução operacional e rotinas de excelência.',
      checklists: [
        'Treinamento da Equipe no Novo ERP', 'Migração de Dados', 'Início da Conciliação Diária',
        'Implantação do Fluxo de Caixa Semanal', 'Gestão de Contas a Pagar/Receber Ativa', 'Rotina de Fechamento Mensal',
        'Auditoria de Lançamentos (Primeiro Mês)', 'Ajustes Finos de Processo', 'Go-Live Oficial'
      ]
    },
    {
      ordem: 4,
      nome: 'F4 - Controle',
      descricao: 'Gestão orientada a dados e indicadores (KPIs).',
      checklists: [
        'Definição de KPIs Estratégicos', 'Criação de Dashboard Gerencial', 'Implementação de DRE Gerencial',
        'Análise de Margem de Contribuição', 'Cálculo de Ponto de Equilíbrio', 'Gestão Orçamentária (Budget)',
        'Reunião Mensal de Resultados (V1)', 'Análise de Variação Orçamentária', 'Monitoramento de SLA Financeiro'
      ]
    },
    {
      ordem: 5,
      nome: 'F5 - Evolução',
      descricao: 'Melhoria contínua e alta performance.',
      checklists: [
        'Planejamento Estratégico Financeiro (5 anos)', 'Implementação de Governança Corporativa', 'Auditoria Externa (Preparação)',
        'Plano de Investimentos (Capex)', 'Valuation Preliminar', 'Formação de Comitê Financeiro',
        'Expansão de Time', 'Review Semestral de Processos'
      ]
    }
  ]
};

export const initializeF5Data = () => {
  if (!localStorage.getItem('f5_projetos')) {
    localStorage.setItem('f5_projetos', JSON.stringify(F5_SEED_DATA.projetos));
    
    // Generate stages for projects based on template
    const etapas = [];
    const checklists = [];
    const kpis = [];

    F5_SEED_DATA.projetos.forEach(proj => {
      F5_SEED_DATA.etapas_template.forEach(tpl => {
        const etapaId = `etapa_${proj.id}_${tpl.ordem}`;
        etapas.push({
          id: etapaId,
          projeto_id: proj.id,
          nome: tpl.nome,
          descricao: tpl.descricao,
          status: proj.percentual_conclusao > (tpl.ordem * 20) ? 'Concluído' : (proj.percentual_conclusao > ((tpl.ordem - 1) * 20) ? 'Em Andamento' : 'Pendente'),
          percentual_conclusao: proj.percentual_conclusao > (tpl.ordem * 20) ? 100 : (proj.percentual_conclusao > ((tpl.ordem - 1) * 20) ? 50 : 0),
          ordem: tpl.ordem,
          data_inicio: proj.data_inicio, // Simplified
          data_fim: proj.data_fim_prevista
        });

        // Generate checklists
        tpl.checklists.forEach((desc, idx) => {
          checklists.push({
            id: `chk_${etapaId}_${idx}`,
            etapa_id: etapaId,
            descricao: desc,
            status: Math.random() > 0.5 ? 'Concluído' : 'Pendente',
            responsavel_id: proj.responsavel_id
          });
        });

        // Generate basic KPIs
        kpis.push({
          id: `kpi_${etapaId}_1`,
          etapa_id: etapaId,
          nome_kpi: 'Aderência ao Prazo',
          valor_atual: Math.floor(Math.random() * 100),
          meta: 90,
          tendencia: 'Alta',
          tipo_grafico: 'barra'
        });
      });
    });

    localStorage.setItem('f5_etapas', JSON.stringify(etapas));
    localStorage.setItem('f5_checklists', JSON.stringify(checklists));
    localStorage.setItem('f5_kpis', JSON.stringify(kpis));
  }
};
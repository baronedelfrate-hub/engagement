export const COST_CENTERS = [
  { code: 'CC-01', name: 'Direcao e Estrategia' },
  { code: 'CC-02', name: 'Administrativo e Financeiro' },
  { code: 'CC-03', name: 'Pessoas e Cultura' },
  { code: 'CC-04', name: 'Tecnologia e Infraestrutura' },
  { code: 'CC-05', name: 'Juridico e Compliance' },
  { code: 'CC-10', name: 'Consultoria Financeira' },
  { code: 'CC-11', name: 'Consultoria Operacional e Processos' },
  { code: 'CC-12', name: 'Implantacao de Sistemas Horizon' },
  { code: 'CC-13', name: 'Projetos Especializados' },
  { code: 'CC-14', name: 'Sucesso do Cliente' },
  { code: 'CC-15', name: 'Auditorias Internas e Diagnosticos' },
  { code: 'CC-20', name: 'Comercial' },
  { code: 'CC-21', name: 'Marketing Institucional' },
  { code: 'CC-22', name: 'Branding e Conteudo Digital' },
  { code: 'CC-23', name: 'Parcerias e Afiliados' },
  { code: 'CC-30', name: 'Academy - Gestao Academica' },
  { code: 'CC-31', name: 'Academy - Cursos Gravados' },
  { code: 'CC-32', name: 'Academy - Mentorias e Programas ao Vivo' },
  { code: 'CC-33', name: 'Academy - Comunidade e Membership' },
  { code: 'CC-34', name: 'Academy - Suporte ao Aluno' },
  { code: 'CC-35', name: 'Academy - Producao Audiovisual e Estudio' },
  { code: 'CC-36', name: 'Academy - Marketing' },
  { code: 'CC-37', name: 'Academy - Comercial' },
  { code: 'CC-40', name: 'Inovacao e Desenvolvimento de Produtos' },
  { code: 'CC-41', name: 'Pesquisa e Novas Tecnologias' }
];

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const generateTimelineData = (daysCount = 60) => {
    const today = new Date();
    const days = [];
    
    // Generate dates
    for (let i = 0; i < daysCount; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }

    // Generate rows based on cost centers
    const rows = COST_CENTERS.map(cc => {
        const dailyValues = {};
        
        days.forEach(day => {
            // Generate some random realistic financial data
            // 30% chance of having a value to make it look realistic (not full everywhere)
            const hasValue = Math.random() > 0.7;
            
            dailyValues[day] = {
                previsto: hasValue ? Math.floor(Math.random() * 5000) + 100 : 0,
                realizado: hasValue && Math.random() > 0.5 ? Math.floor(Math.random() * 5000) + 100 : 0
            };
        });
        
        return {
            id: cc.code,
            code: cc.code,
            name: cc.name,
            values: dailyValues // Map of date string -> { previsto, realizado }
        };
    });

    return { days, rows };
};

export const getRelatorioData = (filters) => {
  const { dataInicio, dataFim, categoria } = filters;
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  const result = [];
  
  // Helper to check if date is within range
  const currentDate = new Date(start);
  
  // Safety check to prevent infinite loops if dates are invalid
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
  }
  
  while (currentDate <= end) {
    // Generate 1-3 transactions per day
    const numTrans = Math.floor(Math.random() * 3) + 1;
    
    for(let i=0; i<numTrans; i++) {
       const cc = COST_CENTERS[Math.floor(Math.random() * COST_CENTERS.length)];
       
       // Filter by category if provided
       if (categoria && !cc.name.toLowerCase().includes(categoria.toLowerCase())) continue;

       const isReceita = Math.random() > 0.6;
       
       result.push({
         id: Math.random().toString(36).substr(2, 9),
         data: new Date(currentDate).toISOString(),
         categoria: cc.name,
         descricao: `Lançamento ref. ${cc.code}`,
         valor_previsto: Math.floor(Math.random() * 5000) + 100,
         valor_realizado: Math.floor(Math.random() * 5000) + 100,
         dreGroup: isReceita ? 'A' : 'B', // A = Receita, B = Despesa
         conta: isReceita ? 'Banco Principal' : 'Fornecedores Diversos'
       });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return result;
};
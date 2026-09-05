import { storage } from '@/lib/storage';

export const initializeFinanceData = () => {
  // 1. Initialize Tables if not present
  if (!storage.get('baixas')) storage.set('baixas', []);
  if (!storage.get('extrato_linhas')) storage.set('extrato_linhas', []);
  if (!storage.get('extrato_imports')) storage.set('extrato_imports', []);
  if (!storage.get('conciliacoes')) storage.set('conciliacoes', []);
  if (!storage.get('ajustes')) storage.set('ajustes', []);

  // 2. Seed Mock Data for Cashflow Demo
  const baixas = storage.get('baixas');
  if (baixas.length === 0) {
    const mockBaixas = [
      { id: 'bx_1', titulo_id: 'cp_1', tipo: 'PAGAMENTO', data_baixa: '2023-10-05', valor_baixa: 1500.00, banco_id: 'banco_1', meio_pagamento: 'PIX', conciliado: true, status: 'Confirmado' },
      { id: 'bx_2', titulo_id: 'cr_1', tipo: 'RECEBIMENTO', data_baixa: '2023-10-10', valor_baixa: 5000.00, banco_id: 'banco_1', meio_pagamento: 'BOLETO', conciliado: false, status: 'Confirmado' }
    ];
    storage.set('baixas', mockBaixas);
  }

  // 3. Mock Bank Statement Lines (Extrato)
  const extrato = storage.get('extrato_linhas');
  if (extrato.length === 0) {
    const mockExtrato = [
      { id: 'ext_1', data_lancamento: '2023-10-05', descricao: 'PGTO FORNECEDOR XYZ', valor: -1500.00, conciliado: true, baixa_id: 'bx_1' },
      { id: 'ext_2', data_lancamento: '2023-10-12', descricao: 'COMPRA CARTAO', valor: -250.00, conciliado: false },
      { id: 'ext_3', data_lancamento: '2023-10-15', descricao: 'TARIFA BANCARIA', valor: -15.90, conciliado: false },
      { id: 'ext_4', data_lancamento: '2023-10-10', descricao: 'LIQUIDACAO COBRANCA', valor: 5000.00, conciliado: false }, // Matches bx_2 but not reconciled yet
      { id: 'ext_5', data_lancamento: '2023-10-20', descricao: 'DOC ELETRO', valor: -1200.00, conciliado: false }
    ];
    storage.set('extrato_linhas', mockExtrato);
  }

  // 4. Ensure Contas Pagar/Receber have new fields
  const updateTitles = (key) => {
    const titles = storage.get(key) || [];
    const updated = titles.map(t => ({
      ...t,
      numero_titulo: t.numero_titulo || Math.floor(Math.random() * 900000000 + 100000000).toString(),
      saldo: t.saldo !== undefined ? t.saldo : (t.valor || 0),
      status: t.status || 'Pendente',
      projeto_id: t.projeto_id || null
    }));
    storage.set(key, updated);
  };

  updateTitles('contas_pagar');
  updateTitles('contas_receber');
};
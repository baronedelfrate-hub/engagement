import { parseExtratoFile, validateExtratoData } from '@/services/extratoImportService';

/**
 * Utilitários de teste manual para Importação de Extrato
 * Como usar: chame essas funções no console do navegador para simular uploads
 */

export const testUploadArquivoValido = async () => {
  console.log('--- TESTE 1: Upload Arquivo Válido ---');
  // Criando um mock de arquivo OFX em memória
  const mockOFX = `
    <OFX>
      <BANKMSGSRSV1>
        <STMTTRNRS>
          <STMTRS>
            <BANKTRANLIST>
              <STMTTRN>
                <TRNTYPE>DEBIT</TRNTYPE>
                <DTPOSTED>20231015120000[-3:BRT]</DTPOSTED>
                <TRNAMT>-150.50</TRNAMT>
                <FITID>123456789</FITID>
                <MEMO>PAGAMENTO FORNECEDOR X</MEMO>
              </STMTTRN>
            </BANKTRANLIST>
          </STMTRS>
        </STMTTRNRS>
      </BANKMSGSRSV1>
    </OFX>
  `;
  
  const blob = new Blob([mockOFX], { type: 'application/x-ofx' });
  const file = new File([blob], 'extrato_teste.ofx');
  
  try {
    const parsed = await parseExtratoFile(file);
    console.log('Resultado do parse:', parsed);
    const validated = validateExtratoData(parsed);
    console.log('Resultado validado:', validated);
    console.log('✅ TESTE 1 PASSOU');
  } catch (err) {
    console.error('❌ TESTE 1 FALHOU:', err);
  }
};

export const testUploadArquivoInvalido = async () => {
  console.log('--- TESTE 2: Upload Arquivo Inválido ---');
  const blob = new Blob(['dados aleatorios sem sentido'], { type: 'text/plain' });
  const file = new File([blob], 'invalido.txt');
  
  try {
    await parseExtratoFile(file);
    console.error('❌ TESTE 2 FALHOU: Deveria ter lançado erro de extensão');
  } catch (err) {
    console.log('Erro esperado capturado:', err.message);
    console.log('✅ TESTE 2 PASSOU');
  }
};

// Expor para o window (útil para debug no console)
if (typeof window !== 'undefined') {
  window.runExtratoTests = async () => {
    await testUploadArquivoValido();
    await testUploadArquivoInvalido();
  };
  console.log('🧪 Testes de extrato carregados. Execute window.runExtratoTests() no console para rodar.');
}
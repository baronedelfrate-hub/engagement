import { supabase } from '@/lib/customSupabaseClient';

/**
 * Script de teste manual para debug da tabela clientes.
 * Para executar, abra o console do navegador e digite: testClientesQuery()
 */
export const testClientesQuery = async () => {
    console.log("=========================================");
    console.log("🔍 INICIANDO TESTE MANUAL DE CLIENTES");
    console.log("=========================================");

    const companyId = localStorage.getItem('company_id');
    console.log("📌 Company ID (LocalStorage):", companyId || "NENHUM");

    // 1. Query Simples (Sem filtro)
    console.log("\n1️⃣ Testando Query Simples (SELECT * FROM clientes LIMIT 10)");
    const { data: data1, error: err1 } = await supabase.from('clientes').select('*').limit(10);
    
    if (err1) {
        console.error("❌ Erro na Query Simples:", err1);
        if (err1.code === 'PGRST301') {
            console.error("⚠️ POSSÍVEL ERRO DE RLS (Row Level Security)! As políticas estão bloqueando a leitura.");
        }
    } else {
        console.log("✅ Sucesso na Query Simples! Retornou:", data1?.length || 0, "registros.");
        if (data1?.length > 0) {
            console.log("Amostra (id, nome, company_id):", data1.slice(0, 2).map(c => ({ id: c.id, nome: c.nome, company_id: c.company_id })));
        }
    }

    // 2. Query com Filtro
    if (companyId) {
        console.log(`\n2️⃣ Testando Query com Filtro (company_id = ${companyId})`);
        const { data: data2, error: err2 } = await supabase.from('clientes').select('*').eq('company_id', companyId);
        
        if (err2) {
            console.error("❌ Erro na Query com Filtro:", err2);
        } else {
            console.log("✅ Sucesso na Query com Filtro! Retornou:", data2?.length || 0, "registros.");
        }
    } else {
        console.warn("\n2️⃣ Pulando Query com Filtro (companyId não encontrado no local storage)");
    }

    // 3. Query de Contagem
    console.log("\n3️⃣ Testando Query de Contagem (COUNT)");
    const { count, error: err3 } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    
    if (err3) {
        console.error("❌ Erro na Query de Contagem:", err3);
    } else {
        console.log("✅ Total absoluto de clientes acessíveis:", count);
    }
    
    console.log("=========================================");
    return "Teste concluído. Verifique os logs acima.";
};

// Anexar ao window para ser chamado manualmente no console
if (typeof window !== 'undefined') {
    window.testClientesQuery = testClientesQuery;
    console.log("🛠️ [Debug] Ferramenta disponível: Digite testClientesQuery() no console para testar a tabela de clientes.");
}
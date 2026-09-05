# Guia de Depuração: Parâmetros Fiscais Autenticação

Este documento serve para diagnosticar problemas de carregamento e autenticação na rota `/fiscal/parametros-fiscais`. Ele rastreia o ciclo de vida do contexto de autenticação customizado e dos componentes protegidos.

## Instruções para o Usuário

1. Abra o seu navegador (Chrome, Edge, Firefox, etc.).
2. Pressione `F12` no teclado para abrir o painel de Ferramentas de Desenvolvedor (DevTools).
3. Selecione a aba **Console**.
4. Limpe o console atual (geralmente existe um botão de lixeira "Clear console" ou pressione `Ctrl + L`).
5. Navegue ou recarregue a página `/fiscal/parametros-fiscais`.
6. Tire uma captura de tela (Screenshot) completa de todos os logs exibidos no Console.
7. Compartilhe a captura de tela ou o texto copiado com o desenvolvedor/suporte técnico para análise.

## Fluxo de Logs Esperado (Sucesso)

Se tudo estiver funcionando corretamente (Usuário logado), você deverá ver logs parecidos com esta ordem:
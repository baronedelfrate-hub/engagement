# Setup e Correção: Tabela Municípios Fiscais (IBGE)

Este documento descreve o processo de correção e população da tabela `fiscal_municipios_ibge`.

## 1. O Problema Original
Houve um erro em scripts anteriores que tentaram deletar duplicatas utilizando a função agregadora `MIN(id)` ou `MIN(uuid)` comparada diretamente. UUIDs como texto puro ou gerados não permitem agregação via `MIN()` sem type casting em algumas versões do Postgres, resultando em erro.

## 2. A Solução (Postgres `ctid`)
A forma mais segura e eficiente de remover linhas duplicadas (baseado em `codigo_ibge`) mantendo apenas a primeira inserida é utilizando o identificador de tupla interno do PostgreSQL chamado `ctid`.
O script SQL executado faz:
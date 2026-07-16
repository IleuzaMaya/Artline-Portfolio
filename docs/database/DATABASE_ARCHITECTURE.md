# Artline Business Engine — Database Architecture

> O banco de dados do ABE deve representar o negócio com clareza, preservar o histórico e permitir crescimento sem reescritas estruturais.

---

## 1. Objetivo

Este documento define a arquitetura conceitual e técnica do banco de dados do Artline Business Engine.

Ele orienta:

- criação das migrations;
- relacionamentos entre módulos;
- segurança e RLS;
- integração com Supabase Auth;
- estrutura multiempresa;
- catálogo técnico;
- orçamentos;
- pedidos;
- produção;
- arquivos e imagens;
- auditoria;
- evolução futura do sistema.

O banco antigo será utilizado como fonte histórica e de dados, mas não será restaurado integralmente.

---

## 2. Princípios arquiteturais

### 2.1 Multiempresa desde a fundação

Todas as entidades de negócio deverão pertencer a uma empresa.

Quando necessário, também poderão pertencer a uma unidade.

Exemplos:

```text
empresa_id
unidade_id
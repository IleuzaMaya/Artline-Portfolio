# Artline Business Engine — Inventário de Recuperação

> Este documento registra as fontes recuperadas do sistema anterior, suas inconsistências e a decisão arquitetural adotada para cada componente.

---

## 1. Objetivo

O objetivo deste inventário é impedir que estruturas antigas, incompletas ou incompatíveis sejam copiadas cegamente para o novo Supabase.

A reconstrução do Artline Business Engine deverá preservar:

- dados úteis;
- regras de negócio válidas;
- histórico técnico;
- cadastros existentes;
- cálculos já testados;
- funções atuais do sistema.

Ao mesmo tempo, deverá corrigir:

- tabelas obsoletas;
- funções incompatíveis;
- políticas duplicadas;
- nomes inconsistentes;
- relacionamentos frágeis;
- estruturas que não suportam a evolução do ABE.

---

## 2. Fontes da recuperação

### 2.1 Backup PostgreSQL do Supabase antigo

Arquivo preservado:

```text
db_cluster-26-09-2025@05-07-32.backup(1).gz
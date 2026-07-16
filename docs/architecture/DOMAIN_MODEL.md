# Artline Business Engine — Modelo de Domínio

> O banco de dados será consequência do domínio.  
> Primeiro modelamos o funcionamento da molduraria; depois transformamos os conceitos em tabelas, serviços e interfaces.

---

## 1. Objetivo

Este documento descreve os principais conceitos do Artline Business Engine sem depender de tecnologia, banco de dados ou implementação específica.

Ele deverá orientar:

- arquitetura do banco de dados;
- regras de negócio;
- Calculation Engine;
- Knowledge Engine;
- Production Engine;
- APIs;
- interfaces;
- integrações;
- inteligência artificial.

---

## 2. Princípio de escalabilidade

Cada decisão deverá responder:

> **Isso ainda fará sentido quando o ABE estiver atendendo milhares de moldurarias?**

Nenhuma entidade deverá ser criada apenas para resolver uma necessidade temporária ou exclusiva de uma única empresa.

---

# 3. Contextos do domínio

## 3.1 Identidade e acesso

Responsável por:

- autenticação;
- usuários;
- perfis;
- funções;
- permissões;
- vínculo do usuário com uma molduraria;
- ativação, bloqueio e exclusão lógica de contas.

### Conceitos principais

- Usuário
- Perfil
- Organização
- Unidade
- Papel
- Permissão
- Convite
- Sessão

---

## 3.2 Relacionamento comercial

Responsável pelo cadastro das pessoas e empresas que se relacionam com a molduraria.

### Conceitos principais

- Pessoa
- Cliente
- Empresa
- Contato
- Endereço
- Fornecedor
- Transportadora
- Representante
- Histórico de relacionamento

Uma mesma pessoa ou empresa poderá exercer mais de um papel.

---

## 3.3 Obra

Representa o objeto, imagem ou peça que será emoldurada.

### Exemplos

- fotografia;
- gravura;
- pôster;
- tela;
- pintura;
- diploma;
- camisa;
- objeto;
- documento;
- obra tridimensional.

### Informações principais

- tipo;
- dimensões;
- espessura;
- peso;
- material;
- valor histórico;
- valor afetivo;
- fragilidade;
- necessidade de conservação;
- imagens;
- observações técnicas.

A obra existe independentemente do orçamento.

---

## 3.4 Projeto de emolduramento

Representa a solução técnica e estética definida para uma obra.

Um projeto poderá ser revisado e gerar diferentes versões antes da aprovação.

### Conceitos principais

- obra;
- tipo de montagem;
- dimensões finais;
- margens;
- composição;
- recomendações;
- alertas;
- justificativas técnicas;
- versão;
- aprovação.

---

## 3.5 Composição

Representa as camadas que formam um emoldurado.

### Componentes possíveis

- moldura externa;
- moldura interna;
- terceira moldura;
- vidro;
- passe-partout;
- arte;
- foam;
- fundo;
- baguete;
- chassi;
- reforço;
- camisa;
- objeto;
- impressão;
- materiais diversos.

A composição deverá preservar:

- ordem das camadas;
- função de cada camada;
- dimensões;
- quantidade;
- custo;
- perda;
- fornecedor;
- observações de produção.

---

## 3.6 Margens

As margens deverão ser independentes:

- superior;
- inferior;
- esquerda;
- direita.

Elas poderão ser:

- iguais;
- sugeridas pelo sistema;
- definidas pelo cliente;
- alteradas por exigência estética ou técnica.

As margens poderão ser aplicadas em:

- passe-partout;
- flutuante;
- entre vidros;
- fundo aparente;
- camisa;
- objetos.

---

## 3.7 Catálogo técnico

Representa materiais, serviços e soluções disponíveis para uso nos projetos.

### Famílias iniciais

- molduras;
- vidros;
- fundos;
- passe-partouts;
- baguetes;
- impressões;
- chassis;
- camisas e objetos;
- reforços;
- sarrafos;
- diversos;
- tipos de orçamento.

Cada item de catálogo poderá possuir:

- código;
- descrição;
- fornecedor;
- custo;
- unidade de cálculo;
- dimensões;
- profundidade;
- largura da face;
- compatibilidades;
- restrições;
- disponibilidade;
- vigência de preço;
- imagens;
- metadados técnicos.

---

## 3.8 Calculation Engine

Responsável por transformar o projeto de emolduramento em consumo e preço.

### Responsabilidades

- área;
- perímetro;
- metragem linear;
- quantidade;
- perdas;
- aproveitamento de chapas e folhas;
- custos;
- serviços;
- markup;
- impostos;
- frete;
- preço final;
- arredondamentos;
- memória de cálculo.

Cada cálculo deverá ser:

- reproduzível;
- auditável;
- versionado;
- explicável.

O sistema deverá guardar os valores usados no momento do orçamento, mesmo que os preços do catálogo mudem depois.

---

## 3.9 Knowledge Engine

Responsável pelas regras técnicas, recomendações e alertas.

Cada regra deverá possuir:

- código;
- contexto;
- condição;
- severidade;
- recomendação;
- justificativa técnica;
- alternativas;
- possibilidade de exceção;
- registro da decisão tomada.

### Exemplos

- necessidade de reforço;
- quantidade de travessas;
- profundidade mínima;
- incompatibilidade de vidro;
- afastamento entre arte e vidro;
- conservação de fotografias;
- ventilação de telas e canvas;
- necessidade de passe-partout;
- adequação do perfil da moldura;
- margem mínima para flutuante.

O Knowledge Engine não deverá apenas bloquear.

Ele deverá explicar o motivo e orientar o consultor.

---

## 3.10 Orçamento

Representa uma proposta comercial apresentada ao cliente.

### Estrutura conceitual

- orçamento;
- versões;
- itens;
- projeto de emolduramento de cada item;
- componentes;
- memória de cálculo;
- descontos;
- markup;
- frete;
- impostos;
- condições comerciais;
- validade;
- aprovação;
- histórico.

Um orçamento poderá possuir várias obras e vários projetos de emolduramento.

---

## 3.11 Pedido

Um orçamento aprovado poderá originar um pedido.

O pedido deverá preservar uma fotografia completa da versão aprovada.

Alterações posteriores deverão gerar:

- revisão;
- autorização;
- histórico;
- eventual diferença de preço;
- impacto na produção.

---

## 3.12 Production Engine

Responsável por transformar o pedido em atividades de produção.

### Áreas iniciais

- separação de materiais;
- corte de molduras;
- corte de vidro;
- corte de fundo;
- corte de passe-partout;
- impressão;
- preparação de chassi;
- reforço;
- montagem;
- acabamento;
- embalagem;
- expedição;
- instalação.

Cada área deverá receber apenas as informações necessárias para executar seu trabalho.

A ordem de serviço principal da montagem deverá consolidar:

- composição;
- margens;
- dimensões;
- sequência de camadas;
- recomendações;
- alertas;
- observações do cliente;
- decisões técnicas.

---

## 3.13 Qualidade

Responsável pelas conferências antes da entrega.

### Exemplos

- dimensões;
- esquadro;
- limpeza do vidro;
- acabamento;
- fixação;
- alinhamento;
- correspondência com o pedido;
- fotografia final;
- aprovação de qualidade.

---

## 3.14 Imagens e arquivos

O ABE deverá permitir anexar imagens a:

- obras;
- clientes;
- projetos;
- orçamentos;
- pedidos;
- produção;
- qualidade;
- entrega.

### Futuras capacidades

- reconhecimento do tipo de obra;
- sugestão de composição;
- simulação visual;
- remoção ou troca de fundo;
- identificação de proporção;
- detecção de resolução;
- análise de qualidade para impressão;
- geração de prévia do emoldurado.

---

## 3.15 Financeiro

Responsável por:

- contas a receber;
- pagamentos;
- parcelas;
- sinal;
- saldo;
- comissões;
- custos;
- fretes;
- impostos;
- rentabilidade;
- fluxo de caixa.

O financeiro será ligado ao pedido, mas permanecerá em contexto próprio.

---

## 3.16 Analytics Engine

Responsável por transformar os dados operacionais em indicadores.

### Indicadores futuros

- ticket médio;
- margem;
- materiais mais vendidos;
- molduras mais utilizadas;
- perdas;
- retrabalho;
- prazo médio;
- produtividade;
- conversão de orçamentos;
- rentabilidade por cliente;
- rentabilidade por produto;
- sazonalidade.

---

## 3.17 AI Engine

Responsável por utilizar os dados e o conhecimento estruturado do ABE.

### Possibilidades

- assistente técnico;
- recomendação de materiais;
- revisão de orçamento;
- detecção de riscos;
- explicação para o cliente;
- apoio ao consultor;
- previsão de prazo;
- sugestão de preço;
- análise de imagens;
- identificação de padrões operacionais.

A IA deverá se apoiar nas regras e dados da Artline, e não substituir o Knowledge Engine.

---

# 4. Fluxo principal

```text
Cliente
  ↓
Obra
  ↓
Projeto de emolduramento
  ↓
Composição
  ↓
Validação técnica
  ↓
Cálculo
  ↓
Orçamento
  ↓
Aprovação
  ↓
Pedido
  ↓
Produção
  ↓
Qualidade
  ↓
Entrega
  ↓
Pós-venda
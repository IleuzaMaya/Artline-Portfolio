// frontend/src/OrcamentoForm.jsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';
import FloatingInput from './components/FloatingInput';
import FloatingSelect from './components/FloatingSelect';
import { calcularOrcamento } from './utils/calcularOrcamento';
import { Alert } from '@mui/material';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
console.log('[OrcamentoForm] API =', API);

export default function OrcamentoForm() {
  // helper para garantir array
  const asArray = (data) =>
    Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : []);

  const [tiposOrcamento, setTiposOrcamento] = useState([]);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);

  const [altura, setAltura] = useState('');
  const [largura, setLargura] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [markup, setMarkup] = useState(30);
  const [margemPassepartout, setMargemPassepartout] = useState(0);

  const [molduras, setMolduras] = useState([]);
  const [moldura1, setMoldura1] = useState(null);
  const [moldura2, setMoldura2] = useState(null);
  const [moldura3, setMoldura3] = useState(null);

  const [impressoes, setImpressoes] = useState([]);
  const [impressaoSelecionada, setImpressaoSelecionada] = useState(null);

  const [vidros, setVidros] = useState([]);
  const [fundo, setFundo] = useState([]);
  const [passepartouts, setPassepartouts] = useState([]);

  const [vidroSelecionado, setVidroSelecionado] = useState(null);
  const [fundoSelecionado, setFundoSelecionado] = useState(null);
  const [passepartoutSelecionado, setPassepartoutSelecionado] = useState(null);

  const [camisaObjetoTabela, setCamisaObjetoTabela] = useState([]);

  // Nº de aberturas (para Fotos)
  const [numAberturas, setNumAberturas] = useState(1);
  const [numAberturasCalc, setNumAberturasCalc] = useState(1);

  // avisos
  const [avisoM2, setAvisoM2] = useState(null);

  // Resumo dos itens somados
  const [itensSomados, setItensSomados] = useState([]);

  // zoom imagem de moldura
  const [zoomImg, setZoomImg] = useState(null);

  // helper 2 casas
  const fmt2 = (n) => Number(n || 0).toFixed(2);

  // Baguete interna (ml)
  const [baguetes, setBaguetes] = useState([]);
  const [bagueteInternaSelecionada, setBagueteInternaSelecionada] = useState(null);

  // Chassi (apenas para Tela)
  const [chassis, setChassis] = useState([]);
  const [incluirChassi, setIncluirChassi] = useState(false);

  const [valorTotal, setValorTotal] = useState(0);
  const [valorSemMarkup, setValorSemMarkup] = useState(0);
  const [fundoBloqueado, setFundoBloqueado] = useState(false);
  const [reforcoInfo, setReforcoInfo] = useState(null);
  const [dimensoesFinais, setDimensoesFinais] = useState({
    altura: 0,
    largura: 0,
    area: 0,
    alturaReforco: 0,
    larguraReforco: 0,
    mensagemAviso: null,
  });

  // Zera todos os campos dependentes do tipo
  const resetDependentes = () => {
    setAltura('');
    setLargura('');
    setQuantidade(1);
    setMarkup(30);

    setPassepartoutSelecionado(null);
    setMargemPassepartout(0);
    setFundoSelecionado(null);
    setVidroSelecionado(null);
    setImpressaoSelecionada(null);
    setMoldura1(null);
    setMoldura2(null);
    setMoldura3(null);
    setBagueteInternaSelecionada(null);

    setItensSomados([]);
    setNumAberturas(1);
    setNumAberturasCalc(1);
    setReforcoInfo(null);
    setExcedePP(false);
    setValorSemMarkup(0);
    setValorTotal(0);
    setDimensoesFinais({
      altura: 0, largura: 0, area: 0,
      alturaReforco: 0, larguraReforco: 0,
      mensagemAviso: null,
    });
  };

  // controle vindo do cálculo assíncrono
  const [excedePP, setExcedePP] = useState(false);

  // folha do passepartout (aceita rotação) + segurança
  const FOLHA_PP = { maior: 152, menor: 102, seguranca: 2 };
  function cabeNaFolhaPassepartout(larguraCm, alturaCm, margemCm) {
    const w = (parseFloat(larguraCm) || 0) + (parseFloat(margemCm) || 0) * 2;
    const h = (parseFloat(alturaCm) || 0) + (parseFloat(margemCm) || 0) * 2;
    const maxMenor = FOLHA_PP.menor - FOLHA_PP.seguranca;
    const maxMaior = FOLHA_PP.maior - FOLHA_PP.seguranca;
    const okNormal = w <= maxMenor && h <= maxMaior;
    const okRotacion = h <= maxMenor && w <= maxMaior;
    return okNormal || okRotacion;
  }

  // -------- Perfil por Tipo (normalizado + tabela) --------
  const norm = (s = '') =>
    s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  const DEFAULT_PERFIL = {
    showPassepartout: true,
    passepartoutSemMargem: false,
    showAberturas: false,

    vidroFrontalCombo: true,
    vidroFundoComumFixo: false, // Entre Vidros
    vidroSomenteComum: false,   // força vidro comum (Profundidade/Flutuante/Camisa)

    showFundoCombo: true,
    foamExtraAuto: false,

    bagueteAuto: false,
    // filtro de molduras
    molduraUsoTipo: null, // 'C' caixa, 'N' normal, 'A' alumínio, null = todos
    molduraUsos: {},

    permiteM2M3: true,
  };

  const PERFIS = {
    // Superfície / Fotos
    superficie: {
      showAberturas: true,
      molduraUsoTipo: null,
      molduraUsos: { uso_superficie: 1 },
    },

    // Entre Vidros
    entre_vidros: {
      showPassepartout: false,
      vidroFrontalCombo: true,
      vidroFundoComumFixo: true, // vidro comum faz papel de fundo
      showFundoCombo: false,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_entre_vidros: 1 },
    },

    // Profundidade
    profundidade: {
      showPassepartout: true,
      vidroFrontalCombo: false,
      vidroSomenteComum: true,   // anti-reflexo opaca em profundidade
      showFundoCombo: true,
      bagueteAuto: true,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_profundidade: 1 },
      permiteM2M3: false,
    },

    // Flutuante
    flutuante: {
      showPassepartout: false,
      vidroFrontalCombo: false,
      vidroSomenteComum: true,
      showFundoCombo: true,
      foamExtraAuto: true,       // “Foam Ad Branco” extra
      bagueteAuto: true,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_flutuante: 1 },
      permiteM2M3: false,
    },

    // Camisa / Objetos
    camisa_objeto: {
      showPassepartout: true,      // opcional, sem margem
      passepartoutSemMargem: true,
      vidroFrontalCombo: false,
      vidroSomenteComum: true,
      showFundoCombo: true,
      foamExtraAuto: true,
      bagueteAuto: true,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_camisa_objeto: 1 },
      permiteM2M3: false,
    },

    // Tela
    tela: {
      showPassepartout: false,
      vidroFrontalCombo: false,  // tela normalmente sem vidro
      showFundoCombo: false,
      molduraUsoTipo: null,
      molduraUsos: { uso_tela: 1 },
    },

    // Outros
    outro: {
      showPassepartout: false,
      vidroFrontalCombo: false,
      showFundoCombo: false,
      molduraUsoTipo: null,
      molduraUsos: {},
      permiteM2M3: false,
    },
  };

  function perfilDoTipo(nomeTipo) {
    const k = norm(nomeTipo);

    let key = null;
    if (/entre\s*vidros?/.test(k)) key = 'entre_vidros';
    else if (/profundidade/.test(k)) key = 'profundidade';
    else if (/flutuant/.test(k)) key = 'flutuante';
    else if (/(camisa|objeto)/.test(k)) key = 'camisa_objeto';
    else if (/tela/.test(k)) key = 'tela';
    else if (/outros?/.test(k)) key = 'outro';
    else if (/(foto|superficie)/.test(k)) key = 'superficie';

    const overrides = key ? PERFIS[key] : PERFIS.superficie; // fallback para Superfície
    return { ...DEFAULT_PERFIL, ...overrides };
  }

  const perfil = perfilDoTipo(tipoSelecionado?.nome || '');
  const isTela = /tela/i.test(tipoSelecionado?.nome || '');

  // Preview excede PP e “bloqueio” de PP
  const previewExcedePP =
    perfil.showPassepartout &&
    !cabeNaFolhaPassepartout(largura, altura, margemPassepartout);

  // Bloqueia PP se preview OU cálculo disserem que excede
  const ppBloqueado = Boolean(perfil.showPassepartout && (previewExcedePP || excedePP));
  
  // Entre Vidros => 2 vidros: frente (selecionado) + fundo (comum)
  const isEntreVidros = Boolean(perfil.vidroFundoComumFixo);

  // Flutuante => não se usa passe-partout (perde o efeito)
  const isFlutuante = /flutuant/i.test(tipoSelecionado?.nome || '');


  // tipo/categoria helpers
  const tipoDoItem = (m) =>
    (m?.tipo || m?.tipo_moldura || m?.categoria || '').toLowerCase();
  const ehRetaOuPP = (m) => /reta|passepartout/.test(tipoDoItem(m));
  const ehAluminio = (m) => m?.uso_tipo === 'A' || /alum/i.test(m?.tipo_material || '');
  const ehCaixa    = (m) => m?.uso_tipo === 'C' || /caixa/i.test(tipoDoItem(m));

  // coerções de M2/M3 conforme M1
  useEffect(() => {
    if (ehAluminio(moldura1)) {
      if (moldura2) setMoldura2(null);
      if (moldura3) setMoldura3(null);
    }
    if (moldura1 && !ehRetaOuPP(moldura1)) {
      if (moldura2) setMoldura2(null);
      if (moldura3) setMoldura3(null);
    }
  }, [moldura1]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se M2 virar "Caixa", limpa/desabilita M3
  useEffect(() => {
    if (ehCaixa?.(moldura2) && moldura3) setMoldura3(null);
  }, [moldura2]); // eslint-disable-line react-hooks/exhaustive-deps

  // carregamentos iniciais
  useEffect(() => {
    const load = async () => {
      try {
        const [tipos, impr, v, f, pp, bg, camis, chs] = await Promise.all([
           axios.get(`${API}/tipos-orcamento`),
           axios.get(`${API}/impressoes`),
           axios.get(`${API}/vidros`),
           axios.get(`${API}/fundos`),
           axios.get(`${API}/passepartouts`),
           axios.get(`${API}/baguetes`),
          axios.get(`${API}/camisas`).catch(() => ({ data: [] })),
          axios.get(`${API}/chassis`).catch(() => ({ data: [] })),
         ]);
        setTiposOrcamento(asArray(tipos.data));
        setImpressoes(asArray(impr.data));
        setVidros(asArray(v.data));
        setFundo(asArray(f.data));
        setPassepartouts(asArray(pp.data));
        setBaguetes(asArray(bg.data));
        setCamisaObjetoTabela(asArray(camis.data));
        setChassis(asArray(chs.data));
      } catch (err) {
        console.error('Erro ao carregar listas iniciais:', err);
      }
    };
    load();
  }, []);

  // quando troca o tipo, recarrega molduras + aplica regras
  useEffect(() => {
    if (!tipoSelecionado) return;

    // monta params conforme perfil
    const params = { ...perfil.molduraUsos };
    if (perfil.molduraUsoTipo) params.uso_tipo = perfil.molduraUsoTipo;

    axios.get(`${API}/molduras`, { params })
      .then(async (res) => {
        let lista = asArray(res.data);
        if (!Array.isArray(lista) || lista.length === 0) {
          const resAll = await axios.get(`${API}/molduras`);
          lista = asArray(resAll.data);
        }
        const listaFmt = lista.map(m => ({
          ...m,
          display: m.codigo_principal ? `${m.codigo_principal} — ${m.nome}` : m.nome,
        }));
        setMolduras(listaFmt);
      })
      .catch(err => {
        console.error('Erro ao carregar molduras:', err);
        setMolduras([]);
      });

    // fixa/limpa campos pelo perfil
    if (perfil.vidroSomenteComum || perfil.vidroFundoComumFixo) {
      const comum = vidros.find(v => /comum/i.test(v.nome || v.descricao || ''));
      if (perfil.vidroSomenteComum) setVidroSelecionado(comum || null);
    } else {
      setVidroSelecionado(null);
    }

    if (!perfil.showPassepartout) {
      setPassepartoutSelecionado(null);
      setMargemPassepartout(0);
    } else if (perfil.passepartoutSemMargem) {
      setMargemPassepartout(0);
    }

    if (perfil.foamExtraAuto) {
      const foam = fundo.find(f => /foam ad branco/i.test(f.nome || ''));
      if (foam) setFundoSelecionado(foam);
    }

    if (!perfil.permiteM2M3) {
      setMoldura2(null);
      setMoldura3(null);
    }

    setAvisoM2(null);
    setNumAberturas(1);

    // Tela: por padrão marcamos "incluir chassi"
    setIncluirChassi(/tela/i.test(tipoSelecionado?.nome || '') ? true : false);

  }, [tipoSelecionado, vidros, fundo]); // eslint-disable-line react-hooks/exhaustive-deps

  // defaults quando há item único
  useEffect(() => {
    if (fundo.length === 1) setFundoSelecionado(fundo[0]);
    if (vidros.length === 1) setVidroSelecionado(vidros[0]);
    if (passepartouts.length === 1) setPassepartoutSelecionado(passepartouts[0]);
    if (baguetes.length === 1) setBagueteInternaSelecionada(baguetes[0]);
  }, [fundo, vidros, passepartouts, baguetes]);

  // foam extra para Flutuante e Camisa/Objeto (enviado ao cálculo)
  const precisaFoamExtra = /flutuante|camisa|objeto/i.test(tipoSelecionado?.nome || '');
  const foamExtra = precisaFoamExtra
    ? (fundo.find(f => (f.nome || f.descricao || '').toLowerCase().includes('foam ad branco')) || null)
    : null;

  // cálculo do orçamento
  useEffect(() => {
    async function atualizarOrcamento() {
      try {

        // Área interna em m² (para regra do chassi 3 mm/5 mm)
        const areaInternaM2 =
          (Math.max(0, parseFloat(altura) || 0) / 100) *
          (Math.max(0, parseFloat(largura) || 0) / 100);
        const chassiEscolhido =
          (isTela && incluirChassi)
            ? (areaInternaM2 > 1
                ? (chassis.find(c => /5mm/i.test(c.nome || '')) || null)
                : (chassis.find(c => /3mm/i.test(c.nome || '')) || null))
            : null;

        const resultado = await calcularOrcamento({
          altura,
          largura,
          quantidade: Number(quantidade) || 1,
          markup: Number(markup) || 0,
          margemPassepartout: Number(margemPassepartout) || 0,
          moldura1,
          moldura2,
          moldura3,
          impressaoSelecionada,
          vidroSelecionado,
          fundoSelecionado,
          passepartoutSelecionado,
          tipoSelecionado,
          bagueteInternaSelecionada,

          // extras
          fundoExtraSelecionado: foamExtra,
          camisaObjetoTabela,

          // extras de perfil
          entreVidros: perfil.vidroFundoComumFixo,
          vidroSomenteComum: perfil.vidroSomenteComum,
          foamExtraAuto: perfil.foamExtraAuto,
          bagueteAuto: perfil.bagueteAuto,

          // passe-partout
          numAberturas,
          precoAberturaExtra: Number(passepartoutSelecionado?.preco_abertura_extra || 0),
        
          // chassi (tela)
          incluirChassi: Boolean(isTela && incluirChassi),
          chassiSelecionado: chassiEscolhido,
        });

        if (!resultado) return;

        setValorTotal(Number(resultado.valorTotal || 0));
        setValorSemMarkup(Number(resultado.valorSemMarkup || 0));
        setReforcoInfo(resultado.reforcoInfo || null);
        setExcedePP(Boolean(resultado.excedePassepartout));

        setNumAberturasCalc(Number(resultado.numAberturasConsideradas || numAberturas || 1));

        setDimensoesFinais({
          altura: Number(resultado.alturaFinal || 0),
          largura: Number(resultado.larguraFinal || 0),
          alturaReforco: Number(resultado.alturaReforco || 0).toFixed(1),
          larguraReforco: Number(resultado.larguraReforco || 0).toFixed(1),
          area: Number(resultado.areaTotalM2 || 0),
          mensagemAviso: resultado.mensagemAviso || null,
        });

        if (resultado.excedePassepartout) {
          setPassepartoutSelecionado(null);
          setMargemPassepartout(0);
        }

        // resumo de itens
        const itens = [];
        const c = resultado.custos || {};

        if (moldura1 && c.moldurasCamadas?.[0]?.custo > 0) {
          itens.push(`Moldura 1: ${moldura1.nome}${moldura1.codigo_principal ? ` (${moldura1.codigo_principal})` : ''}`);
        }
        if (moldura2 && c.moldurasCamadas?.[1]?.custo > 0) {
          itens.push(`Moldura 2: ${moldura2.nome}${moldura2.codigo_principal ? ` (${moldura2.codigo_principal})` : ''}`);
        }
        if (moldura3 && c.moldurasCamadas?.[2]?.custo > 0) {
          itens.push(`Moldura 3: ${moldura3.nome}${moldura3.codigo_principal ? ` (${moldura3.codigo_principal})` : ''}`);
        }
        if (c.bagueteInterna > 0 && bagueteInternaSelecionada) {
          itens.push(`Baguete interna${bagueteInternaSelecionada?.nome ? `: ${bagueteInternaSelecionada.nome}` : ''}`);
        }
        if (c.vidro > 0 && vidroSelecionado) {
          if (perfil.vidroFundoComumFixo) {
            itens.push(`Vidro (frente): ${vidroSelecionado.nome || vidroSelecionado.descricao || 'selecionado'}`);
            itens.push('Vidro (fundo): Vidro Comum');
          } else {
            itens.push(`Vidro: ${vidroSelecionado.nome || vidroSelecionado.descricao || 'selecionado'}`);
          }
        }
        if (c.fundo > 0 && fundoSelecionado) {
          itens.push(`Fundo: ${fundoSelecionado.nome || fundoSelecionado.descricao || 'selecionado'}`);
        }
        if (c.fundoExtra > 0 && foamExtra) {
          itens.push(`Fundo extra: ${foamExtra.nome || foamExtra.descricao}`);
        }
        if (c.passepartout > 0) {
          const modo = (resultado.modoCobrancaPassepartout || 'ml').toUpperCase();
          itens.push(`Passe-partout (${modo})`);
        }
        if (Number(c.passepartoutAberturasExtra) > 0) {
          const qtdExtras = Math.max(0, (resultado.numAberturasConsideradas ?? numAberturas ?? 1) - 1);
          const unit = Number(passepartoutSelecionado?.preco_abertura_extra || 0);
          const unitFmt = unit.toFixed(2).replace('.', ',');
          const totalFmt = Number(c.passepartoutAberturasExtra).toFixed(2).replace('.', ',');
          itens.push(`Passe-partout — aberturas extras: ${qtdExtras} × R$ ${unitFmt} = R$ ${totalFmt}`);
        }
        if (c.impressao > 0) {
          itens.push('Impressão');
        }
        if (Number(c.chassi) > 0) {
          itens.push(`Chassi ${resultado.chassiInfo?.mm || ''}`);
        }
        if (resultado.reforcoInfo?.necessita_reforco && Number(resultado.reforcoInfo?.valorTotal) > 0) {
          itens.push('Reforço (moldura caixa)');
        }
        if (resultado.camisaObjetoInfo?.aplicado) {
          const info = resultado.camisaObjetoInfo;
          itens.push(`Adicional Camisa/Objeto (${info.faixa}, ${info.modo === 'm2' ? 'por m²' : 'fixo'})`);
        }

        setItensSomados(itens);
      } catch (error) {
        console.error('Erro ao calcular orçamento:', error);
      }
    }

    if (altura && largura) atualizarOrcamento();
    else {
      setValorTotal(0);
      setValorSemMarkup(0);
      setReforcoInfo(null);
      setExcedePP(false);
      setItensSomados([]);
      setDimensoesFinais({
        altura: 0,
        largura: 0,
        area: 0,
        alturaReforco: 0,
        larguraReforco: 0,
        mensagemAviso: null,
      });
    }
  }, [
    altura,
    largura,
    quantidade,
    markup,
    margemPassepartout,
    moldura1,
    moldura2,
    moldura3,
    impressaoSelecionada,
    vidroSelecionado,
    fundoSelecionado,
    passepartoutSelecionado,
    tipoSelecionado,
    bagueteInternaSelecionada,
    foamExtra,
    camisaObjetoTabela,
    numAberturas,
    perfil.bagueteAuto,
    perfil.foamExtraAuto,
    perfil.vidroFundoComumFixo,
    perfil.vidroSomenteComum,
  ]);

  // ======= derivadas e alertas =======
  const isCaixaM1 = useMemo(
    () => (moldura1?.uso_tipo === 'C') || /caixa/i.test(moldura1?.tipo || moldura1?.categoria || ''),
    [moldura1]
  );
  const larguraM1cm = useMemo(() => {
    const mm = parseFloat(moldura1?.largura_mm || 0);
    return mm > 0 ? mm / 10 : parseFloat(moldura1?.largura || 0);
  }, [moldura1]);

  const LIMIAR_RISCO_CM = 2.9;
  const needsReforco = Boolean(reforcoInfo?.necessita_reforco);
  const mostrarAlertaRisco =
    needsReforco && !isCaixaM1 && larguraM1cm > 0 && larguraM1cm < LIMIAR_RISCO_CM;
  const mostrarCustoReforco =
    needsReforco && isCaixaM1 && (Number(reforcoInfo?.valorTotal || 0) > 0);

  // Área grande com moldura fina
  const AREA_GRANDE_M2 = 6;
  const LIMIAR_MOLDURA_CM = 3;
  const hasVidro = Boolean(vidroSelecionado) || perfil.vidroSomenteComum; // selecionado ou forçado
  const mostrarAlertaAreaGrandeFina =
    Number(dimensoesFinais.area) > AREA_GRANDE_M2 &&
    hasVidro &&
    !isCaixaM1 &&
    larguraM1cm > 0 &&
    larguraM1cm < LIMIAR_MOLDURA_CM;

  // Mostrar select de baguete interna?
  const usaBagueteInterna = useMemo(() => {
    if (isTela) return false; // Tela nunca usa baguete
    return isCaixaM1 || Boolean(Number(tipoSelecionado?.usa_baguete || 0));
  }, [isCaixaM1, tipoSelecionado, isTela]);

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-center text-blue-900 mb-4">
        Orçamento de Emoldurado
      </h1>

      <FloatingInput
        label="Markup (%)"
        type="number"
        value={markup}
        onChange={(e) => setMarkup(Number(e.target.value))}
      />

      <FloatingSelect
        label="Tipo de Orçamento"
        options={tiposOrcamento || []}
        value={tipoSelecionado}
        setValue={(v) => { resetDependentes(); setTipoSelecionado(v); }}
      />

      <div className="grid grid-cols-3 gap-4">
        <FloatingInput
          label="Altura (cm)"
          type="number"
          step="0.01"
          value={altura}
          onChange={(e) => setAltura(e.target.value)}
        />
        <FloatingInput
          label="Largura (cm)"
          type="number"
          step="0.01"
          value={largura}
          onChange={(e) => setLargura(e.target.value)}
        />
        <FloatingInput
          label="Quantidade"
          type="number"
          value={quantidade}
          onChange={(e) => setQuantidade(Number(e.target.value))}
        />
      </div>

      {/* Passe-partout (quando aplicável) */}
      {perfil.showPassepartout && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {(dimensoesFinais?.mensagemAviso || previewExcedePP) && (
            <div className="col-span-2">
              <Alert severity="info" className="mt-1">
                {dimensoesFinais?.mensagemAviso ||
                  '❗ Dimensões excedem a folha de passepartout (102 × 152 cm). Passepartout desativado automaticamente.'}
              </Alert>
            </div>
          )}

          <FloatingSelect
            label="Passepartout"
            options={passepartouts || []}
            value={passepartoutSelecionado}
            setValue={setPassepartoutSelecionado}
            disabled={ppBloqueado}
          />

          <FloatingInput
            label="Margem (cm)"
            type="number"
            step="0.1"
            value={margemPassepartout}
            onChange={(e) => setMargemPassepartout(e.target.value)}
            disabled={ppBloqueado || perfil.passepartoutSemMargem}
          />

          {/* Nº de aberturas: oculto quando PP bloqueado; se PP não selecionado, fica desabilitado */}
          {perfil.showAberturas && !ppBloqueado && (
            <div className="col-span-2 md:col-span-1">
              <FloatingInput
                label="Nº de aberturas"
                type="number"
                min={1}
                value={numAberturas}
                onChange={(e) => setNumAberturas(Math.max(1, Number(e.target.value) || 1))}
                disabled={!passepartoutSelecionado}
              />
            </div>
          )}
        </div>
      )}

      {/* Fundo (quando aplicável) */}
      {perfil.showFundoCombo && (
        <FloatingSelect
          label="Fundo"
          options={fundo || []}
          value={fundoSelecionado}
          setValue={setFundoSelecionado}
          disabled={fundo.length === 1 || fundoBloqueado}
        />
      )}

      {/* Vidro (quando aplicável) */}
      {perfil.vidroFrontalCombo && (
         <FloatingSelect
           label="Vidro"
           options={vidros || []}
           value={vidroSelecionado}
           setValue={setVidroSelecionado}
           disabled={perfil.vidroSomenteComum || vidros.length === 1}
         />
       )}
      {perfil.vidroFrontalCombo && perfil.vidroFundoComumFixo && (
        <div className="mt-2 text-sm text-gray-600">
          Entre Vidros utiliza <strong>2 vidros</strong>: o frontal
          ({vidroSelecionado?.nome || vidroSelecionado?.descricao || '—'}) e um
          <strong> vidro comum</strong> no fundo. Ambos já estão incluídos no cálculo.
        </div>
      )}
       {!perfil.vidroFrontalCombo && perfil.vidroSomenteComum && (
         <div className="mt-2 text-sm text-gray-600">
           Vidro comum aplicado automaticamente neste tipo.
         </div>
       )}

       {isFlutuante && (
        <Alert severity="info" className="mt-2">
          No tipo <strong>Flutuante</strong> não se usa passe-partout — ele encosta na peça e
          perde o efeito de flutuar.
        </Alert>
      )}


      {/* Tela: controle de chassi */}
      {isTela && (
        <div className="mt-2 text-sm text-gray-700">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={incluirChassi}
              onChange={(e) => setIncluirChassi(e.target.checked)}
            />
            <span>Incluir chassi (aplicado por perímetro; 3 mm até 1 m², 5 mm acima)</span>
          </label>
        </div>
      )}

      {/* Molduras */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <FloatingSelect
          label="Moldura 1"
          options={molduras || []}
          value={moldura1}
          setValue={(v) => { setMoldura1(v); setMoldura2(null); setMoldura3(null); }}
          labelKey="display"
        />

        {(perfil.permiteM2M3 && !ehAluminio(moldura1) && ehRetaOuPP(moldura1)) && (
          <>
            <FloatingSelect
              label="Moldura 2 (opcional)"
              options={molduras || []}
              value={moldura2}
              setValue={setMoldura2}
              labelKey="display"
            />
            {!ehCaixa?.(moldura2) && (
              <FloatingSelect
                label="Moldura 3 (opcional)"
                options={molduras || []}
                value={moldura3}
                setValue={setMoldura3}
                labelKey="display"
              />
            )}
          </>
        )}
      </div>

      {avisoM2 && <Alert severity="info" className="mt-2">{avisoM2}</Alert>}
      {ehAluminio(moldura1) && <Alert severity="info" className="mt-2">Moldura de alumínio não permite adicionais.</Alert>}
      {(moldura1 && !ehRetaOuPP(moldura1)) && <Alert severity="info" className="mt-2">Moldura 1 diferente de Reta/Passepartout bloqueia Moldura 2 e 3.</Alert>}

      {/* Previews das molduras com zoom */}
      {[{m:moldura1, rot:'Moldura 1'}, {m:moldura2, rot:'Moldura 2'}, {m:moldura3, rot:'Moldura 3'}]
        .filter(x => x.m)
        .map(({m, rot}) => (
          <div key={rot} className="preview-moldura">
            {m.imagem_url ? (
              <img
                src={m.imagem_url}
                alt={m.nome}
                onClick={() => setZoomImg(m.imagem_url)}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : null}
            <div className="text-sm">
              <div className="font-medium">{rot}: {m.nome}</div>
              {m.codigo_principal && <div className="text-gray-500">{m.codigo_principal}</div>}
            </div>
          </div>
      ))}

      {/* Baguete (auto, mas editável) — aparece quando houver caixa/uso */}
      {(perfil.bagueteAuto || (moldura1?.uso_tipo === 'C')) && !isTela && (
         <div className="mt-6">
           <FloatingSelect
             label="Baguete interna (ml)"
             options={baguetes || []}
             value={bagueteInternaSelecionada}
             setValue={setBagueteInternaSelecionada}
           />
         </div>
       )}

       <FloatingSelect
         label="Impressão (opcional)"
         options={impressoes || []}
         value={impressaoSelecionada}
         setValue={setImpressaoSelecionada}
       />

      {/* ALERTAS */}
      {mostrarAlertaRisco && (
        <div className="mt-3">
          <Alert severity="warning">
            ⚠️ Área grande com moldura fina (&lt; {LIMIAR_RISCO_CM} cm) e sem caixa. Avalie reforço ou troque a moldura.
          </Alert>
        </div>
      )}
      {mostrarCustoReforco && (
        <div className="mt-3">
          <Alert severity="info">
            🔧 Reforço: <strong>{reforcoInfo.nome}</strong> — R$ {Number(reforcoInfo.valorTotal).toFixed(2).replace('.', ',')}
          </Alert>
        </div>
      )}
      {mostrarAlertaAreaGrandeFina && (
        <div className="mt-3">
          <Alert severity="warning">
            ⚠️ Área grande com moldura fina (&lt; {LIMIAR_MOLDURA_CM} cm). Sugiro trocar a moldura
            ou selecionar <strong>Moldura 2 “Caixa”</strong>. A moldura caixa tem reforço para este tamanho.
          </Alert>
        </div>
      )}

      {/* Impressão */}
      <div className="mt-6">
        <FloatingSelect
          label="Impressão (opcional)"
          options={impressoes || []}
          value={impressaoSelecionada}
          setValue={setImpressaoSelecionada}
        />
      </div>

      {/* Métricas e itens somados */}
      <div className="mt-4 text-sm text-gray-600 leading-relaxed space-y-1">
        <div>📐 <strong>Interna</strong>: {fmt2(largura)} cm × {fmt2(altura)} cm</div>

        {perfil.showPassepartout && passepartoutSelecionado && !ppBloqueado && (
          <div>🛠️ <strong>Com Passepartout</strong>: {fmt2(dimensoesFinais.larguraReforco)} cm × {fmt2(dimensoesFinais.alturaReforco)} cm</div>
        )}
        
        <div>🖼️ <strong>Final (com moldura)</strong>: {fmt2(dimensoesFinais.largura)} cm × {fmt2(dimensoesFinais.altura)} cm</div>
        <div>📦 <strong>Área total</strong>: {Number(dimensoesFinais.area || 0).toFixed(3)} m²</div>
        
        {isTela && incluirChassi && (
          <div>🔩 <strong>Chassi</strong>: {(((parseFloat(altura)||0)/100)*((parseFloat(largura)||0)/100)) > 1 ? '5 mm' : '3 mm'} (incluído no cálculo)</div>
        )}
        
        {isEntreVidros && (
          <div>🪟 <strong>Vidros</strong>: 2 (frente: {vidroSelecionado?.nome || vidroSelecionado?.descricao || '—'}, fundo: Vidro Comum)</div>
        )}

        {perfil.showPassepartout && passepartoutSelecionado && !ppBloqueado && (
          <div>🧩 <strong>Aberturas no passe-partout</strong>: {numAberturasCalc}</div>
        )}

        {itensSomados.length > 0 && (
          <div className="pt-2">
            <div className="text-gray-700"><strong>➕ Itens incluídos no total:</strong></div>
            <ul className="list-disc ml-5 space-y-0.5">
              {itensSomados.map((txt, i) => <li key={i}>{txt}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Totais */}
      <div className="mt-4 text-sm text-gray-700 space-y-1">
        <div>💠 <strong>Total sem markup:</strong> R$ {Number(valorSemMarkup).toFixed(2).replace('.', ',')}</div>
        <div>💙 <strong>Total com markup:</strong> R$ {Number(valorTotal).toFixed(2).replace('.', ',')}</div>
      </div>

      <div className="mt-3 text-lg font-semibold text-blue-900 bg-blue-100 rounded p-3 text-center">
        Valor estimado: R$ {Number(valorTotal).toFixed(2).replace('.', ',')}
      </div>

      {/* Modal de zoom */}
      {zoomImg && (
        <div className="modal-backdrop" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="Moldura" />
        </div>
      )}
    </div>
  );
}

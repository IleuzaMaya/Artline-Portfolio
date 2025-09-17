// frontend/src/pages/Orcamento.jsx
import { useEffect, useMemo, useState } from 'react';
import { edge as api } from '../lib/edgeApi';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import MolduraThumb from '../components/MolduraThumb';
import { Alert } from '@mui/material';

import { 
  calcularOrcamento, LIMIAR_REFORCO_M2, moneyNum, num 
} from '../utils/calcularOrcamento';


export default function OrcamentoForm() {

  // ===== helpers =====
  const asArray = (data) =>
    Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : []);

  const toNumberBR = (raw) => {
    if (typeof raw === 'number') return raw;
    const s = String(raw ?? '');
    if (s.includes(',')) {
      return Number(s.replace(/\./g, '').replace(',', '.'));
    }
    return Number(s.replace(/\s/g, ''));
  };

  const money = (v) => {
    const n = typeof v === 'number' ? v : toNumberBR(v);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  const fmt2 = (v) => {
    const n = toNumberBR(v);
    if (!Number.isFinite(n)) return '0,00';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ---- sanitizadores por unidade (evitam “misturar” preco/valor genéricos) ----
  const sanitizeML = (o) => {
    const ml = moneyNum(
      o?.preco_ml ??
        o?.valor_ml ??
        o?.preco_metro ??
        o?.precoMetro ??
        o?.preco_ml_moldura ??
        0
    );
    return { ...o, preco_ml: ml, valor_ml: ml };
  };
  const sanitizeM2 = (o) => {
    const m2 = moneyNum(o?.preco_m2 ?? o?.valor_m2 ?? 0);
    return { ...o, preco_m2: m2, valor_m2: m2 };
  };

  // ===== estados base =====

  // debug de custos
  const [debugVisivel, setDebugVisivel] = useState(false);
  const [custosCalc, setCustosCalc] = useState(null);

  const [margemEntreVidros, setMargemEntreVidros] = useState(2.5); // padrão 2 cm

  const [tiposOrcamento, setTiposOrcamento] = useState([]);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);

  const [corPassepartout, setCorPassepartout] = useState('');

  const [altura, setAltura] = useState('');
  const [largura, setLargura] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [markup, setMarkup] = useState(30);
  const handleMarkupChange = (e) => {
    const v = e?.target?.value ?? '';
    let n = num(v, 0);
    if (n > 1000) n = n / 100; // "3000" => 30
    if (n < 0) n = 0;
    if (n > 300) n = 300;
    setMarkup(n);
  };
  
  const [margemPassepartout, setMargemPassepartout] = useState(0);
  const [margemFlutuante, setMargemFlutuante] = useState(3); // padrão 3 cm (ajuste se quiser)

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

  // ===== Flags Camisa/Entre Vidros =====
  const [ehCamisa, setEhCamisa] = useState(false);
  const [entreVidrosNoCamisa, setEntreVidrosNoCamisa] = useState(false);
  
  // normaliza tipo (pode ser útil em outras regras)
  const tipo = String(tipoSelecionado?.slug ?? tipoSelecionado ?? '').toLowerCase();

  // nome do tipo normalizado (sem acento), para regex reutilizáveis
  const tipoNome = String(tipoSelecionado?.nome || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  const isCamisaObjeto = /(camisa|objeto)/i.test(tipoNome);
  const isFlutuante = /flutuant/.test(tipoNome);


  // ===== Diversos =====
  const [diversosBrutos, setDiversosBrutos] = useState([]);
  const DIVERSOS_OPCOES = [
    { id: 'troca_passepartout', nome: 'Troca de Passepartout' },
    { id: 'troca_canvas', nome: 'Troca de Canvas' },
    { id: 'troca_matte', nome: 'Troca de Papel Matte' },
    { id: 'troca_chassi', nome: 'Troca de Chassis' },
    { id: 'troca_moldura', nome: 'Troca de Moldura' },
    { id: 'troca_vidro', nome: 'Troca de Vidro' },
    { id: 'retirar_arte', nome: 'Retirar arte' },
  ];
  const [diversoSelecionado, setDiversoSelecionado] = useState(null);

  const [incluirImpressaoDiversos, setIncluirImpressaoDiversos] = useState(false);

  // Nº de aberturas (mantém para Superfície)
  const [numAberturas, setNumAberturas] = useState(1);
  const [numAberturasCalc, setNumAberturasCalc] = useState(1);

  // avisos / visual
  const [avisoM2, setAvisoM2] = useState(null);
  const [itensSomados, setItensSomados] = useState([]);
  const [zoomImg, setZoomImg] = useState(null);

  // ===== baguete interna =====
  const [baguetes, setBaguetes] = useState([]);
  const [corBaguetePassepartout, setCorBaguetePassepartout] = useState('');
  const [bagueteInternaSelecionada, setBagueteInternaSelecionada] = useState(null);

  // ===== sarrafo (preço ML para reforço) =====
  const [sarrafoLista, setSarrafoLista] = useState([]);
  const precoSarrafoML = useMemo(() => {
    const s = (sarrafoLista || [])[0] || null;
    const raw = s?.preco ?? s?.valor ?? s?.preco_ml ?? s?.valor_ml ?? 0;
    return moneyNum(raw, 0);
  }, [sarrafoLista]);

  // ===== vidro comum m² (para Entre Vidros e fallback) =====
  const precoVidroComumM2 = useMemo(() => {
    const comum = (vidros || []).find((v) => /comum/i.test(v?.nome || v?.descricao || ''));
    // ESTRITO: só aceita campos de m²
    const raw = comum?.preco_m2 ?? comum?.valor_m2 ?? 0;
    return moneyNum(raw, 0);
  }, [vidros]);

  // ===== chassi (tela) =====
  const [chassis, setChassis] = useState([]);
  const [incluirChassi, setIncluirChassi] = useState(false);
  const [incluirImpressaoTela, setIncluirImpressaoTela] = useState(false);

  const impressaoCanvas = useMemo(
    () => (impressoes || []).find((i) => /canvas/i.test(i.nome || i.descricao || '')) || null,
    [impressoes]
  );
  const impressaoMatte = useMemo(
    () =>
      (impressoes || []).find((i) => /(matte|mate|fosco)/i.test(i.nome || i.descricao || '')) ||
      null,
    [impressoes]
  );

  // ===== totais/dimensões =====
  const [valorTotal, setValorTotal] = useState(0);
  const [valorSemMarkup, setValorSemMarkup] = useState(0);
  const [fundoBloqueado] = useState(false);
  const [reforcoInfo, setReforcoInfo] = useState(null);
  const [dimensoesFinais, setDimensoesFinais] = useState({
    altura: 0,
    largura: 0,
    area: 0,
    alturaReforco: 0,
    larguraReforco: 0,
    mensagemAviso: null,
  });

  // ===== resets =====
  const resetDependentes = () => {
    setAltura('');
    setLargura('');
    setQuantidade(1);
    setMarkup(30);

    setPassepartoutSelecionado(null);
    setCorPassepartout('');
    setMargemPassepartout(3);
    setMargemEntreVidros(2.5);
    setFundoSelecionado(null);
    setVidroSelecionado(null);
    setImpressaoSelecionada(null);
    setMoldura1(null);
    setMoldura2(null);
    setMoldura3(null);
    setBagueteInternaSelecionada(null);

    setDiversoSelecionado(null);
    setIncluirImpressaoDiversos(false);

    setEhCamisa(false);
    setEntreVidrosNoCamisa(false);
    setCorBaguetePassepartout('');

    setAvisoM2(null);

    setItensSomados([]);
    setNumAberturas(1);
    setNumAberturasCalc(1);
    setReforcoInfo(null);
    setExcedePP(false);
    setForcarReforcoMesmoAssim(false);
    setValorSemMarkup(0);
    setValorTotal(0);
    setDimensoesFinais({
      altura: 0,
      largura: 0,
      area: 0,
      alturaReforco: 0,
      larguraReforco: 0,
      mensagemAviso: null,
    });

    setDebugVisivel(false);
    setCustosCalc(null);

  };

  // controle vindo do cálculo assíncrono
  const [excedePP, setExcedePP] = useState(false);

  // ===== passepartout folha =====
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

  // ===== perfis por tipo =====
  const norm = (s = '') => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  const DEFAULT_PERFIL = {
    showPassepartout: true,
    passepartoutSemMargem: false,
    showAberturas: false,

    vidroFrontalCombo: true,
    vidroFundoComumFixo: false,
    vidroSomenteComum: false,

    showFundoCombo: true,
    foamExtraAuto: false,

    bagueteAuto: false,
    molduraUsoTipo: null,
    molduraUsos: {},

    permiteM2M3: true,
  };

  const PERFIS = {
    superficie: {
      showAberturas: true,
      molduraUsoTipo: null,
      molduraUsos: { uso_superficie: 1 },
    },
    entre_vidros: {
      showPassepartout: false,     // sem passe-partout
      vidroFrontalCombo: true,     // mantém o combo de escolha
      vidroSomenteComum: false,    // frente pode ser comum ou antirreflexo
      vidroFundoComumFixo: true,   // fundo é sempre vidro comum (automático)
      showFundoCombo: false,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_entre_vidros: 1 },
    },
    profundidade: {
      showPassepartout: true,
      vidroFrontalCombo: false,
      vidroSomenteComum: true,
      showFundoCombo: true,
      bagueteAuto: true,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_profundidade: 1 },
      permiteM2M3: false,
      showAberturas: true,
    },
    flutuante: {
      showPassepartout: true,            // mantém área do PP
      passepartoutSemMargem: true,       // margem vem do campo do flutuante
      showAberturas: true,               // liberar Nº de aberturas
      ppComoFundoColorido: true,
      ppApenasCor: true,
      vidroFrontalCombo: false,
      vidroSomenteComum: true,
      showFundoCombo: true,
      foamExtraAuto: true,
      bagueteAuto: true,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_flutuante: 1 },
      permiteM2M3: false,
    },
    camisa_objeto: {
      showPassepartout: true,
      passepartoutSemMargem: true,
      showAberturas: true,
      vidroFrontalCombo: false,
      vidroSomenteComum: true,
      showFundoCombo: true,
      foamExtraAuto: true,
      bagueteAuto: true,
      molduraUsoTipo: 'C',
      molduraUsos: { uso_camisa_objeto: 1 },
      permiteM2M3: false,
    },
    tela: {
      showPassepartout: false,
      vidroFrontalCombo: false,
      showFundoCombo: false,
      molduraUsoTipo: null,
      molduraUsos: { uso_tela: 1 },
    },
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
    else if (/superficie/.test(k)) key = 'superficie';
    const overrides = key ? PERFIS[key] : PERFIS.superficie;
    return { ...DEFAULT_PERFIL, ...overrides };
  }

  const perfilBase = useMemo(() => perfilDoTipo(tipoSelecionado?.nome || ''), [tipoSelecionado?.nome]);

  const isTela = /tela/i.test(tipoNome);
  const isDiversosTipo = /diversos/i.test(tipoNome);

  // Gate: reforço permitido (Superfície e Entre Vidros)
  const reforcoPermitidoPorTipo = useMemo(() => /(superf|entre\s*vidros?)/i.test(tipoNome), [tipoNome]);

  const [forcarReforcoMesmoAssim, setForcarReforcoMesmoAssim] = useState(false);

  // Perfil efetivo + overrides especiais
  const perfil = useMemo(() => {
    if (!isDiversosTipo) {
      if (isCamisaObjeto && entreVidrosNoCamisa) {
        return {
          ...perfilBase,
          showPassepartout: false,
          showFundoCombo: false,
          vidroFrontalCombo: true,
          vidroFundoComumFixo: true,
          vidroSomenteComum: false,
        };
      }
      return perfilBase;
    }
    const id = diversoSelecionado?.id || '';
    return {
      ...DEFAULT_PERFIL,
      showPassepartout: false,
      showFundoCombo: false,
      vidroFrontalCombo: id === 'troca_vidro',
      vidroFundoComumFixo: false,
      vidroSomenteComum: false,
      bagueteAuto: false,
      molduraUsoTipo: null,
      molduraUsos: {},
      permiteM2M3: true,
    };
  }, [perfilBase, isDiversosTipo, diversoSelecionado, isCamisaObjeto, entreVidrosNoCamisa]);

  // Helpers de tipo/categoria
  const tipoDoItem = (m) => (m?.tipo || m?.tipo_moldura || m?.categoria || '').toLowerCase();
  const ehRetaOuPP = (m) => /reta|passepartout/.test(tipoDoItem(m));
  const ehAluminio = (m) => m?.uso_tipo === 'A' || /alum/i.test(m?.tipo_material || '');
  const ehCaixa = (m) => m?.uso_tipo === 'C' || /caixa/i.test(tipoDoItem(m));

  // Caixa selecionada em alguma camada?
  const isCaixaSelecionada = useMemo(
    () => [moldura1, moldura2, moldura3].some(ehCaixa),
    [moldura1, moldura2, moldura3]
  );

  // opções para M2 quando M1 for CAIXA
  const moldurasApenasCaixa = useMemo(
    () => (molduras || []).filter(ehCaixa),
    [molduras]
  );

  // largura de face em cm (usa mm se existir)
  const larguraFaceCm = (m) => {
    const mm = Number(m?.largura_mm || 0);
    if (mm) return mm / 10;
    const cm = Number(m?.largura || 0);
    return Number.isFinite(cm) ? cm : 0;
  };
  const larguraM1cm = useMemo(() => larguraFaceCm(moldura1), [moldura1]);

  // Usa baguete interna?
  const usaBagueteInterna = useMemo(() => {
    if (isTela) return false;
    return (
      isCaixaSelecionada || perfil.bagueteAuto || Boolean(Number(tipoSelecionado?.usa_baguete || 0))
    );
  }, [isTela, isCaixaSelecionada, perfil.bagueteAuto, tipoSelecionado]);

  // Preview excede PP e “bloqueio”
  const previewExcedePP =
  perfil.showPassepartout &&
  !cabeNaFolhaPassepartout(
    largura, altura,
    perfil.ppComoFundoColorido ? margemFlutuante : margemPassepartout
  );
  
    const ppBloqueado = Boolean(perfil.showPassepartout && (previewExcedePP || excedePP));

  // Entre Vidros?
  const isEntreVidros = Boolean(perfil.vidroFundoComumFixo);

  // Vidro presente (frente selecionado/comum ou EV)
  const temVidro = useMemo(
    () => Boolean(vidroSelecionado) || perfil.vidroSomenteComum || perfil.vidroFundoComumFixo,
    [vidroSelecionado, perfil.vidroSomenteComum, perfil.vidroFundoComumFixo]
  );

  // Profundidade interna da(s) moldura(s) de CAIXA em cm
  const profundidadeCaixaCm = useMemo(() => {
    const toCm = (m) => {
      if (!m) return 0;
      const mm =
        Number(m?.profundidade_mm ?? m?.profundidadeInterna_mm ?? m?.profundidade_interna_mm ?? 0);
      if (mm) return mm / 10; // 10 mm = 1 cm
      const cm = Number(
        m?.profundidade ?? m?.profundidade_cm ?? m?.profundidadeInterna ?? m?.profundidade_interna
      );
      return Number.isFinite(cm) ? cm : 0;
    };
    const depths = [moldura1, moldura2, moldura3].filter(ehCaixa).map(toCm);
    return depths.length ? Math.max(...depths) : 0;
  }, [moldura1, moldura2, moldura3]);

  // Área "de reforço" (usa as dimensões já calculadas para a estrutura) — calculado UMA vez
  const wRefCm = parseFloat(dimensoesFinais.larguraReforco) || 0;
  const hRefCm = parseFloat(dimensoesFinais.alturaReforco) || 0;
  const areaRefM2 = (wRefCm / 100) * (hRefCm / 100);

  // Critério para mostrar o checkbox manual de reforço em tipos que NÃO calculam automático
  // - tamanho acima do limiar OU profundidade < 3 cm
  const PROFUNDIDADE_GATE_CM = 3;
  const criterioProfundidade = profundidadeCaixaCm < PROFUNDIDADE_GATE_CM;

  const podeMostrarReforcoManual = useMemo(() => {
    const k = norm(tipoSelecionado?.nome || '');
    const tipoNaoCalculaAuto = !/(superf|entre\s*vidros?)/i.test(k); // flutuante/profundidade/camisa/outro...
    const tamanhoAcima = areaRefM2 >= LIMIAR_REFORCO_M2;
    return isCaixaSelecionada && tipoNaoCalculaAuto && (tamanhoAcima || criterioProfundidade);
  }, [tipoSelecionado, isCaixaSelecionada, areaRefM2, criterioProfundidade]);

  // --- Reforço: estado + tipo (únicos) ---
  const [reforcoTabela, setReforcoTabela] = useState([]);

  const tipoReforco = useMemo(() => {
    const nome = (tipoSelecionado?.nome || '').toLowerCase();
    return /tela/.test(nome) ? 'canvas' : 'matte';
  }, [tipoSelecionado?.nome]);


  const temAlgumaMoldura = Boolean(moldura1 || moldura2 || moldura3);
  
  const isTrocaPP = useMemo(
    () => isDiversosTipo && (diversoSelecionado?.id === 'troca_passepartout'),
    [isDiversosTipo, diversoSelecionado?.id]
  );


  useEffect(() => {
    if (!isCaixaSelecionada || (!reforcoPermitidoPorTipo && !forcarReforcoMesmoAssim)) {
      setReforcoTabela([]);
      return;
    }
    let cancel = false;
    api
      .get('/reforco', { params: { tipo: tipoReforco } })
      .then(({ data }) => {
        if (!cancel) setReforcoTabela(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancel) setReforcoTabela([]);
      });
    return () => {
      cancel = true;
    };
  }, [isCaixaSelecionada, tipoReforco, reforcoPermitidoPorTipo, forcarReforcoMesmoAssim]);

  // ===== coerções de M2/M3 =====
 
  useEffect(() => {
    if (ehAluminio(moldura1)) {
      if (moldura2) setMoldura2(null);
      if (moldura3) setMoldura3(null);
      return;
    }
    // M1 CAIXA: M2 deve ser CAIXA e M3 desabilita
    if (ehCaixa(moldura1)) {
      if (moldura3) setMoldura3(null);
      if (moldura2 && !ehCaixa(moldura2)) setMoldura2(null);
      return;
    }
    // Outros tipos ≠ Reta/PP bloqueiam M2/M3
    if (moldura1 && !ehRetaOuPP(moldura1)) {
      if (moldura2) setMoldura2(null);
      if (moldura3) setMoldura3(null);
    }
  }, [moldura1]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ehCaixa(moldura2) && moldura3) setMoldura3(null);
    // Se M1 for CAIXA, garantir que M2 também seja CAIXA
    if (ehCaixa(moldura1) && moldura2 && !ehCaixa(moldura2)) setMoldura2(null);
  }, [moldura2, moldura1]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== carregamentos iniciais =====
  useEffect(() => {
    const load = async () => {
      try {
        const [tipos, impr, v, f, pp, bg, camis, chs, divs, sarr] = await Promise.all([
          api.get('/tipos-orcamento'),
          api.get('/impressoes'),
          api.get('/vidros'),
          api.get('/fundos'),
          api.get('/passepartouts'),
          api.get('/baguetes'),
          api.get('/camisas').catch(() => ({ data: [] })),
          api.get('/chassis').catch(() => ({ data: [] })),
          api.get('/diversos').catch(() => ({ data: [] })),
          api.get('/sarrafo').catch(() => ({ data: [] })),
        ]);

        setTiposOrcamento(asArray(tipos.data).filter((t) => !/foto/i.test(t?.nome || '')));
        
        setImpressoes(asArray(impr.data).map(sanitizeM2));
        setVidros(asArray(v.data).map(sanitizeM2));
        setSarrafoLista(asArray(sarr.data).map(sanitizeML));

        const fundosSan = asArray(f.data).map(sanitizeM2);
        setFundo(fundosSan.filter((x) => (x?.ativo ?? true) && moneyNum(x?.preco_m2) > 0));
       
        setPassepartouts(
          asArray(pp.data).map((o) => ({ ...sanitizeML(o), ...sanitizeM2(o) }))
        );
        setBaguetes(asArray(bg.data).map(sanitizeML));
        
        setCamisaObjetoTabela(asArray(camis.data));
        
        setChassis(asArray(chs.data).map(sanitizeML));

        setDiversosBrutos(asArray(divs.data));
      } catch (err) {
        console.error('Erro ao carregar listas iniciais:', err);
      }
    };
    load();
  }, []);

  // ===== efeitos dependentes de perfil =====
  useEffect(() => {
    if (!usaBagueteInterna) setBagueteInternaSelecionada(null);
  }, [usaBagueteInterna]);

  // CAIXA sempre com baguete interna: seleciona uma padrão automaticamente
  useEffect(() => {
   if (usaBagueteInterna && !bagueteInternaSelecionada && (baguetes || []).length) {
     const padrao =
       (baguetes || []).find(b => /foam\s*branco\s*adesiv/i.test(b?.nome || '')) ||
       (baguetes || []).find(b => /passepartout/i.test(b?.nome || '')) ||
       (baguetes || [])[0] || null;
     if (padrao) setBagueteInternaSelecionada(padrao);
   }
  }, [usaBagueteInterna, baguetes, bagueteInternaSelecionada]);


  useEffect(() => {
    if (!perfil.showPassepartout || ppBloqueado) {
      setPassepartoutSelecionado(null);
      setMargemPassepartout(3);
      setNumAberturas(1);
    }
  }, [perfil.showPassepartout, ppBloqueado]);

  useEffect(() => {
    if (!perfil.vidroFrontalCombo && !perfil.vidroSomenteComum) {
      setVidroSelecionado(null);
    }
  }, [perfil.vidroFrontalCombo, perfil.vidroSomenteComum]);

  useEffect(() => {
    if (!perfil.showFundoCombo) setFundoSelecionado(null);
  }, [perfil.showFundoCombo]);

  useEffect(() => {
  if (isTrocaPP) {
    setMoldura1(null);
    setMoldura2(null);
    setMoldura3(null);
  }
  }, [isTrocaPP]);

  // ===== carregar molduras quando muda o tipo =====
  useEffect(() => {
    const carregarMolduras = async () => {
      try {
        const _norm = (s = '') =>
          s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
        const mapTipoParaUso = (nome = '') =>
          /entre\s*vidros?/.test(_norm(nome))
            ? 'entre_vidros'
            : /profundidade/.test(_norm(nome))
            ? 'profundidade'
            : /flutuant/.test(_norm(nome))
            ? 'flutuante'
            : /(camisa|objeto)/.test(_norm(nome))
            ? 'camisa'
            : /tela/.test(_norm(nome))
            ? 'tela'
            : 'superficie';

        const uso = tipoSelecionado ? mapTipoParaUso(tipoSelecionado?.nome || '') : null;
        const params = uso ? { uso, ...(uso === 'camisa' && ehCamisa ? { permiteA: 1 } : {}) } : undefined;

        let { data } = await api.get('/molduras', params ? { params } : undefined);
        let lista = asArray(data);
        if (!lista.length) {
          ({ data } = await api.get('/molduras'));
          lista = asArray(data);
        }

        const pick = (...vals) =>
          vals.find((v) => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

        const listaFmt = (lista || []).map((m) => {
          const codigo = pick(m.codigo_principal, m.codigo, m.cod, m.referencia);
          const nomeSafe = pick(m.nome, m.descricao, m.nome_moldura, m.modelo, m.titulo);
          const display =
            [codigo, nomeSafe].filter(Boolean).join(' — ') ||
            nomeSafe ||
            codigo ||
            'Sem nome';
          const ABS = (u) => {
            if (!u) return null;
            if (/^https?:\/\//i.test(u)) return u;        // já é absoluta
            const base = import.meta.env.VITE_API_URL || ''; // ex: http://localhost:3333
            return base.replace(/\/$/, '') + '/' + String(u).replace(/^\//, '');
          };

          const _img = ABS(pick(m.imagem_url, m.image_url, m.url_imagem, m.imagem, m.foto, m.foto_url, null));

          const id = m.id ?? m.id_moldura ?? m.moldura_id ?? m.uuid ?? codigo ?? nomeSafe;

          // ⚠️ Moldura: aceitar SOMENTE campos de ML; se não houver, fica 0 (dimensão cresce do mesmo jeito)
          const precoML = moneyNum(
            pick(m.preco_ml, m.valor_ml, m.preco_metro, m.precoMetro, m.preco_ml_moldura)
          );

          const uso_tipo =
            m.uso_tipo ?? (/(caixa|canaleta)/i.test(nomeSafe || display) ? 'C' : 'N');

          return {
            id,
            ...m,
            nome: pick(m.nome, nomeSafe, codigo, 'Sem nome'),
            display,
            imagem_url: _img,
            image_url: _img,           
            preco_ml: precoML,
            valor_ml: precoML,
            uso_tipo,
          };
        });

        setMolduras(listaFmt);
      } catch (err) {
        console.error('Erro ao carregar molduras:', err);
        setMolduras([]);
      }
    };

    carregarMolduras();
  }, [tipoSelecionado, ehCamisa]);

  // ===== regras/limpezas ao trocar o tipo =====
  useEffect(() => {
    if (!tipoSelecionado) return;

   const comum = vidros.find((v) => /comum/i.test(v?.nome || v?.descricao || ''));
   if (perfil.vidroSomenteComum) {
     // tipos que forçam vidro comum na frente
     setVidroSelecionado(comum || null);
   } else if (perfil.vidroFundoComumFixo && perfil.vidroFrontalCombo) {
     // Entre Vidros: default comum na frente, mas usuário pode trocar
     setVidroSelecionado((prev) => prev || comum || null);
   } else {
     setVidroSelecionado(null);
   }

    if (!perfil.showPassepartout) {
      setPassepartoutSelecionado(null);
      setMargemPassepartout(3);
    } else if (perfil.passepartoutSemMargem) {
      setMargemPassepartout(3);
    }

    if (perfil.foamExtraAuto) {
      const foam = fundo.find((f) => /foam ad branco/i.test(f.nome || ''));
      if (foam) setFundoSelecionado(foam);
    }

    if (!perfil.permiteM2M3) {
      setMoldura2(null);
      setMoldura3(null);
    }

    setAvisoM2(null);
    setNumAberturas(1);

    const tela = /tela/i.test(tipoSelecionado?.nome || '');
    setIncluirChassi(!!tela);
    setIncluirImpressaoTela(false);
    setForcarReforcoMesmoAssim(false);
  }, [tipoSelecionado, vidros, fundo, perfil, ehCamisa]);

  // ===== defaults quando há item único =====
  useEffect(() => {
    if (fundo.length === 1) setFundoSelecionado(fundo[0]);
    if (vidros.length === 1) setVidroSelecionado(vidros[0]);
    if (passepartouts.length === 1) setPassepartoutSelecionado(passepartouts[0]);
    if (baguetes.length === 1) setBagueteInternaSelecionada(baguetes[0]);
  }, [fundo, vidros, passepartouts, baguetes]);

  // ===== foam extra para Flutuante e Camisa/Objeto =====
  const precisaFoamExtra = /flutuante|camisa|objeto/i.test(tipoSelecionado?.nome || '');
  const foamExtra = precisaFoamExtra
    ? fundo.find((f) => (f.nome || f.descricao || '').toLowerCase().includes('foam ad branco')) ||
      null
    : null;

  // ===== Diversos: helpers de preço =====
  // (num, moneyNum, pickPrecoML/M2 agora vêm de ../utils/calcularOrcamento)
  const toM2 = (wCm, hCm) => (num(wCm) / 100) * (num(hCm) / 100);
  /** perímetro em METROS a partir de cm */
  const perimetroML = (wCm, hCm) => (2 * (num(wCm) + num(hCm))) / 100;

  const maiorLado = () => Math.max(num(altura), num(largura));
  const precoTrocaPorCategoria = (catId) => {
    if (!Array.isArray(diversosBrutos) || diversosBrutos.length === 0) return 0;

    const mm = maiorLado();
    const faixa = mm <= 50 ? 'ate' : 'acima';

    const pickPreco = (o) => moneyNum(o?.preco ?? o?.valor ?? o?.preco_unit ?? o?.valor_unit, 0);

    const nomeUpper = (x) => String(x || '').toUpperCase();

    const byCat = (d) => {
      const n = nomeUpper(d.nome);
      switch (catId) {
        case 'troca_canvas':
          return n.includes('CANVAS') && n.includes('TROCA');
        case 'troca_matte':
          return (n.includes('MATTE') || n.includes('FOSCO')) && n.includes('TROCA');
        case 'troca_chassi':
          return n.includes('CHASSIS') && n.includes('TROCA');
        case 'troca_moldura':
          return n.includes('MOLDURA') && n.includes('TROCA');
        case 'troca_vidro':
          return n.includes('VIDRO') && n.includes('TROCA');
        case 'troca_passepartout':
          return (n.includes('PASSEPARTOUT') || n.includes('PASSPARTOUT') || n.includes('PP')) && n.includes('TROCA');  
        case 'retirar_arte':
          return n.includes('RETIRAR') && n.includes('ARTE');
        default:
          return false;
      }
    };

    const candidatos = diversosBrutos.filter(byCat);
    if (candidatos.length === 0) return 0;

    const ehAte = (d) => /AT[ÉE]|ATE/i.test(d.faixa_aplicacao || d.faixa || '');
    const ehAcima = (d) => /ACIMA/i.test(d.faixa_aplicacao || d.faixa || '');

    let escolhido = null;
    if (faixa === 'ate') {
      escolhido = candidatos.find(ehAte) || candidatos.find((d) => !ehAcima(d));
    } else {
      escolhido = candidatos.find(ehAcima) || candidatos.find((d) => !ehAte(d));
    }
    if (!escolhido) escolhido = candidatos[0];
    return pickPreco(escolhido);
  };

  // ===== Reforço: cálculo assíncrono total =====
  useEffect(() => {
    async function atualizarOrcamento() {
      try {
        const areaInternaM2 =
          (Math.max(0, parseFloat(altura) || 0) / 100) *
          (Math.max(0, parseFloat(largura) || 0) / 100);

        let impressaoParam = null;

        if (isTela) {
          impressaoParam = incluirImpressaoTela ? impressaoCanvas : null;
        } else if (isDiversosTipo && incluirImpressaoDiversos) {
          const id = diversoSelecionado?.id;
          if (id === 'troca_canvas') impressaoParam = impressaoCanvas;
          else if (id === 'troca_matte') impressaoParam = impressaoMatte;
        } else {
          impressaoParam = impressaoSelecionada;
        }

        const foamAdBranco =
          (fundo || []).find((f) => /foam\s*ad\s*branco/i.test(f.nome || f.descricao || '')) ||
          null;
        const foamExtraDiversos =
          isDiversosTipo && diversoSelecionado?.id === 'troca_matte' ? foamAdBranco : null;

        const forcaChassi =
          (isTela && incluirChassi) ||
          (isDiversosTipo && diversoSelecionado?.id === 'troca_chassi');
        const chassiEscolhido = forcaChassi
          ? areaInternaM2 > 1
            ? chassis.find((c) => /5mm/i.test(c.nome || '')) || null
            : chassis.find((c) => /3mm/i.test(c.nome || '')) || null
          : null;

        let diversosPayload = [];
        if (isDiversosTipo && diversoSelecionado?.id) {
          const pTroca = precoTrocaPorCategoria(diversoSelecionado.id);
          if (pTroca > 0) {
            diversosPayload = [
              {
                id: `cat:${diversoSelecionado.id}`,
                nome: diversoSelecionado.nome,
                faixa_aplicacao: maiorLado() <= 50 ? 'até 50cm' : 'acima 50cm',
                preco: pTroca,
              },
            ];
          }
        }

        const resultado = await calcularOrcamento({
          altura,
          largura,
          quantidade: Number(quantidade) || 1,
          markup: Number(markup) || 0,

          margemPassepartout: Number(margemPassepartout) || 0,
          margemFlutuanteCm: isFlutuante ? (Number(margemFlutuante) || 0) : 0,

          // passa cru; o parser numérico no calcularOrcamento aceita "2,5"
          margemEntreVidros: margemEntreVidros,

          moldura1,
          moldura2,
          moldura3,

          impressaoSelecionada: impressaoParam,

          vidroSelecionado,
          fundoSelecionado,
          passepartoutSelecionado: perfil.ppApenasCor ? null : passepartoutSelecionado,
          tipoSelecionado,
          bagueteInternaSelecionada,

          // extras
          fundoExtraSelecionado: foamExtraDiversos || foamExtra,
          camisaObjetoTabela,
          camisaObjetoExtra: 0,

          // Diversos
          diversosSelecionados: diversosPayload,

          // extras de perfil
          entreVidros: perfil.vidroFundoComumFixo,
          vidroSomenteComum: perfil.vidroSomenteComum,
          foamExtraAuto: perfil.foamExtraAuto,
          bagueteAuto: perfil.bagueteAuto,
          forcarPassepartoutM2: perfil.ppApenasCor ? false : Boolean(perfil.ppComoFundoColorido),

          // passe-partout
          numAberturas,
          precoAberturaExtra: Number(passepartoutSelecionado?.preco_abertura_extra || 0),

          // chassi
          incluirChassi: Boolean(forcaChassi),
          chassiSelecionado: chassiEscolhido,

          // Camisa / Entre Vidros flags
          forcarCamisaObjetoTipo:
            (isCamisaObjeto && ehCamisa) || (isEntreVidros && ehCamisa)
              ? 'camisa'
              : isCamisaObjeto && !ehCamisa
              ? 'objeto'
              : null,
          camisaEntreVidros:
            Boolean((isCamisaObjeto && entreVidrosNoCamisa) || (isEntreVidros && ehCamisa)),

          // Reforço
          reforcoTabela,

          // preços auxiliares
          precoSarrafoML,
          precoVidroComumM2,
          forcarReforco: Boolean(forcarReforcoMesmoAssim),
        });

        if (!resultado) return;

        setCustosCalc(resultado.custos || null);

        setValorTotal(Number(resultado.valorTotal || 0));
        setValorSemMarkup(Number(resultado.valorSemMarkup || 0));
        setReforcoInfo(resultado.reforcoInfo || null);
        setExcedePP(Boolean(resultado.excedePassepartout));

        setNumAberturasCalc(Number(resultado.numAberturasConsideradas || numAberturas || 1));

        setDimensoesFinais({
          altura: Number(resultado.alturaFinal || 0),
          largura: Number(resultado.larguraFinal || 0),
          alturaReforco: Number(resultado.alturaReforco || 0),
          larguraReforco: Number(resultado.larguraReforco || 0),
          area: Number(resultado.areaTotalM2 || 0),
          mensagemAviso: resultado.mensagemAviso || null,
        });

        if (resultado.excedePassepartout) {
          setPassepartoutSelecionado(null);
          setMargemPassepartout(3);
        }

        const itens = [];
        const c = resultado.custos || {};

        if (moldura1 && c.moldurasCamadas?.[0]?.custo > 0) {
          itens.push(
            `Moldura 1: ${moldura1.nome}${
              moldura1.codigo_principal ? ` (${moldura1.codigo_principal})` : ''
            }`
          );
        }
        if (moldura2 && c.moldurasCamadas?.[1]?.custo > 0) {
          itens.push(
            `Moldura 2: ${moldura2.nome}${
              moldura2.codigo_principal ? ` (${moldura2.codigo_principal})` : ''
            }`
          );
        }
        if (moldura3 && c.moldurasCamadas?.[2]?.custo > 0) {
          itens.push(
            `Moldura 3: ${moldura3.nome}${
              moldura3.codigo_principal ? ` (${moldura3.codigo_principal})` : ''
            }`
          );
        }

        if (c.bagueteInterna > 0 && bagueteInternaSelecionada) {
          const corTxt =
            /passepartout/i.test(bagueteInternaSelecionada?.nome || '') &&
            corBaguetePassepartout?.trim()
              ? ` — cor: ${corBaguetePassepartout.trim()}`
              : '';
          itens.push(
            `Baguete interna${
              bagueteInternaSelecionada?.nome ? `: ${bagueteInternaSelecionada.nome}` : ''
            }${corTxt}`
          );
        }

        if (c.vidro > 0 && vidroSelecionado) {
          if (perfil.vidroFundoComumFixo) {
            itens.push(
              `Vidro (frente): ${
                vidroSelecionado.nome || vidroSelecionado.descricao || 'selecionado'
              }`
            );
            itens.push('Vidro (fundo): Vidro Comum');
          } else {
            itens.push(
              `Vidro: ${vidroSelecionado.nome || vidroSelecionado.descricao || 'selecionado'}`
            );
          }
        }
        if (c.fundo > 0 && fundoSelecionado) {
          itens.push(
            `Fundo: ${fundoSelecionado.nome || fundoSelecionado.descricao || 'selecionado'}`
          );
        }
        if (c.fundoExtra > 0 && (foamExtraDiversos || foamExtra)) {
          const fExtra = foamExtraDiversos || foamExtra;
          itens.push(`Fundo extra: ${fExtra?.nome || fExtra?.descricao || 'Foam AD Branco'}`);
        }
        if (c.passepartout > 0) {
          const modo = (resultado.modoCobrancaPassepartout || 'ml').toUpperCase();
          itens.push(`Passe-partout (${modo})${corPassepartout ? ` — cor: ${corPassepartout}` : ''}`);
        }
        // Flutuante: cor sem custo
        if (isFlutuante && corPassepartout) {
          itens.push(`Passe-partout — cor: ${corPassepartout} (apenas cor)`);
        }

        if (Number(c.passepartoutAberturasExtra) > 0) {
          const qtdExtras = Math.max(
            0,
            (resultado.numAberturasConsideradas ?? numAberturas ?? 1) - 1
          );
          const unit = Number(passepartoutSelecionado?.preco_abertura_extra || 0);
          const unitFmt = unit.toFixed(2).replace('.', ',');
          const totalFmt = Number(c.passepartoutAberturasExtra).toFixed(2).replace('.', ',');
          itens.push(`Passe-partout — aberturas extras: ${qtdExtras} × R$ ${unitFmt} = R$ ${totalFmt}`);
        }
        if (c.impressao > 0) {
          itens.push(isTela ? 'Impressão em canvas' : 'Impressão');
        }

        if (Number(c.chassi) > 0) {
          itens.push(`Chassi ${resultado.chassiInfo?.mm || ''}`);
        }

        // Reforço (moldura caixa)
        if (resultado.reforcoInfo?.necessita_reforco && Number(resultado.reforcoInfo?.valorTotal) > 0) {
          const r = resultado.reforcoInfo;
          if (Number(r.ml) > 0 && Number(r.precoML) > 0) {
            itens.push(
              `Reforço (moldura caixa): ${Number(r.ml).toFixed(2)} m × R$ ${Number(r.precoML)
                .toFixed(2)
                .replace('.', ',')} = R$ ${Number(r.valorTotal).toFixed(2).replace('.', ',')}`
            );
          } else {
            itens.push('Reforço (moldura caixa)');
          }
        }

        // Camisa/Objeto
        if (resultado.camisaObjetoInfo?.aplicado) {
          const info = resultado.camisaObjetoInfo;
          itens.push(
            `Adicional Camisa/Objeto (${info.faixa}, ${info.modo === 'm2' ? 'por m²' : 'fixo'})`
          );
        }

        // Diversos (texto)
        if (Array.isArray(diversosPayload) && diversosPayload.length) {
          diversosPayload.forEach((it) => {
            itens.push(
              `Serviço: ${it.nome}${it.faixa_aplicacao ? ` (${it.faixa_aplicacao})` : ''} — R$ ${Number(
                it.preco
              )
                .toFixed(2)
                .replace('.', ',')}`
            );
          });
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
      setCustosCalc(null);
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
    // Diversos
    isTela,
    incluirImpressaoTela,
    isDiversosTipo,
    diversoSelecionado,
    incluirImpressaoDiversos,
    diversosBrutos,
    ehCamisa,
    entreVidrosNoCamisa,
    reforcoTabela,
    forcarReforcoMesmoAssim,
    precoSarrafoML,
    precoVidroComumM2,
    corBaguetePassepartout,
    corPassepartout,
    impressaoCanvas,
    impressaoMatte,
    !!chassis.length,
  ]);

  // ===== Avisos de segurança por área/face =====
  const usoTipoM1 = String(moldura1?.uso_tipo || '').toUpperCase();

  const LIMIAR_MOLDURA_CM = 2.5; // “moldura fina”
  const mostrarAlertaPesoVidro =
    areaRefM2 > LIMIAR_REFORCO_M2 &&
    temVidro &&
    !isCaixaSelecionada &&
    larguraM1cm > 0 &&
    larguraM1cm <= LIMIAR_MOLDURA_CM &&
    (usoTipoM1 === 'N' || usoTipoM1 === 'A');

 

  return (
    <div className="max-w-3xl mx-auto mt-6 p-4 bg-white shadow rounded overflow-visible">
      <h1 className="text-xl font-bold text-center text-blue-900 mb-3">Orçamento de Emoldurado</h1>

      <FloatingInput
        label="Markup (%)"
        type="number"
        value={markup}
        onChange={handleMarkupChange}
        size="sm"
      />

      <FloatingSelect
        label="Tipo de Orçamento"
        options={tiposOrcamento || []}
        value={tipoSelecionado}
        setValue={(v) => {
          resetDependentes();
          setTipoSelecionado(v);
        }}
        labelKey="nome"
        valueKey="id"
        size="sm"
      />

      <div className="grid grid-cols-3 gap-4">
        <FloatingInput
          label="Altura (cm)"
          type="number"
          step="0.01"
          value={altura}
          onChange={(e) => setAltura(e.target.value)}
          size="sm"
        />
        <FloatingInput
          label="Largura (cm)"
          type="number"
          step="0.01"
          value={largura}
          onChange={(e) => setLargura(e.target.value)}
          size="sm"
        />
        <FloatingInput
          label="Quantidade"
          type="number"
          value={quantidade}
          onChange={(e) => setQuantidade(Number(e.target.value))}
          size="sm"
        />
      </div>

      {/* Checks extras por tipo */}
      {(() => {
        const nome = tipoSelecionado?.nome || '';
        const isEV = /entre\s*vidros?/i.test(nome);
        const isCO = /(camisa|objeto)/i.test(nome);

        return (
          <>
            {/* Entre vidros */}
            {isEV && (
              <label className="inline-flex items-center gap-2 mt-2 mb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={ehCamisa}
                  onChange={(e) => setEhCamisa(e.target.checked)}
                />
                <span>É camisa?</span>
              </label>
            )}

            {/(^|\s)entre\s*vidros?/i.test(tipoSelecionado?.nome || '') && (
              <div className="mt-2">
                <FloatingInput
                  label="Margem do entre-vidros (cm)"
                  type="number"
                  step="0.1"
                  value={margemEntreVidros}
                  onChange={(e) => setMargemEntreVidros(e.target.value)}
                  size="sm"
                />
              </div>
            )}


            {/* Camisa / Objeto */}
            {isCO && (
              <div className="mt-2 space-y-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={ehCamisa}
                    onChange={(e) => setEhCamisa(e.target.checked)}
                  />
                  <span>É camisa?</span>
                </label>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={entreVidrosNoCamisa}
                    onChange={(e) => setEntreVidrosNoCamisa(e.target.checked)}
                  />
                  <span>Entre vidros?</span>
                </label>

                {entreVidrosNoCamisa && (
                  <FloatingInput
                    label="Margem do entre-vidros (cm)"
                    type="number"
                    step="0.1"
                    value={margemEntreVidros}
                    onChange={(e) => setMargemEntreVidros(e.target.value)}
                    size="sm"
                  />
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Passe-partout (ordem: Passepartout → Margem (cm) → Cor do passe-partout) */}
      {perfil.showPassepartout && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {(dimensoesFinais?.mensagemAviso || previewExcedePP) && (
            <div className="col-span-2">
              <Alert severity="info" className="mt-1">
                {dimensoesFinais?.mensagemAviso ||
                  '❗ Dimensões excedem a folha de passepartout (102 × 152 cm). Passepartout desativado automaticamente.'}
              </Alert>
            </div>
          )}

          {/* 1) Passepartout (select) */}
          <FloatingSelect
            label="Passepartout"
            options={passepartouts || []}
            value={passepartoutSelecionado}
            setValue={setPassepartoutSelecionado}
            disabled={ppBloqueado}
            labelKey="nome"
            valueKey="id"
            size="sm"
          />

         {/* 2) Margem (cm) */}
          <FloatingInput
            label="Margem (cm)"
            type="number"
            step="0.1"
            value={isFlutuante ? margemFlutuante : margemPassepartout}
            onChange={(e) =>
              isFlutuante
                ? setMargemFlutuante(e.target.value)
                : setMargemPassepartout(e.target.value)
            }
            disabled={ppBloqueado || (!isFlutuante && perfil.passepartoutSemMargem)}
            size="sm"
          />

          {/* 3) Cor do passe-partout */}
          <FloatingInput
            label="Cor do passe-partout"
            value={corPassepartout}
            onChange={(e) => setCorPassepartout(e.target.value)}
            size="sm"
          />

          {/* 4) Nº de aberturas — number, sem limite */}
          {perfil.showAberturas && !ppBloqueado && (
            <FloatingInput
              label="Nº de aberturas"
              type="number"
              min={1}
              value={numAberturas}
              onChange={(e) => setNumAberturas(Math.max(1, Number(e.target.value) || 1))}
              size="sm"
            />
          )}

        </div>
      )}

      {/* Fundo */}
      {perfil.showFundoCombo && (
        <FloatingSelect
          label="Fundo"
          options={fundo || []}
          value={fundoSelecionado}
          setValue={setFundoSelecionado}
          disabled={fundo.length === 1 || fundoBloqueado}
          labelKey="nome"
          valueKey="id"
          size="sm"
        />
      )}

      {/* Vidro */}
      {perfil.vidroFrontalCombo && (
        <FloatingSelect
          label="Vidro (frente)"
          options={vidros || []}
          value={vidroSelecionado}
          setValue={setVidroSelecionado}
          disabled={perfil.vidroSomenteComum} // só desabilita em tipos que exigem comum
          labelKey="nome"
          valueKey="id"
          size="sm"
        />
      )}

      {perfil.vidroFrontalCombo && perfil.vidroFundoComumFixo && (
        <div className="mt-2 text-sm text-gray-600">
          Entre Vidros utiliza <strong>2 vidros</strong>: o frontal (
          {vidroSelecionado?.nome || vidroSelecionado?.descricao || '—'}) e um
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
          No tipo <strong>Flutuante</strong> não se usa passe-partout na frente.
          A cor de fundo pode vir do <strong>Passepartout</strong> selecionado.
          Defina a <em>margem de respiro</em> no campo <strong>Margem (cm)</strong> acima.
        </Alert>
      )}

      {/* Tela: chassi/impressão */}
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

          <div className="mt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={incluirImpressaoTela}
                onChange={(e) => setIncluirImpressaoTela(e.target.checked)}
              />
              <span>
                Incluir impressão em <strong>canvas</strong>
                {impressaoCanvas?.preco_m2
                  ? ` (automático — R$ ${Number(
                      impressaoCanvas.preco_m2 || impressaoCanvas.valor_m2 || 0
                    )
                      .toFixed(2)
                      .replace('.', ',')}/m²)`
                  : ''}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Molduras */}
      {(!isDiversosTipo || diversoSelecionado?.id === 'troca_moldura') && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          <FloatingSelect
            label="Moldura 1"
            options={molduras || []}
            value={moldura1}
            setValue={(v) => {
              setMoldura1(v);
              setMoldura2(null);
              setMoldura3(null);
            }}
            labelKey="display"
            valueKey="id"
            size="sm"
          />

          {perfil.permiteM2M3 && !ehAluminio(moldura1) && (ehRetaOuPP(moldura1) || ehCaixa(moldura1)) && (
            <>
              <FloatingSelect
                label="Moldura 2 (opcional)"
                options={ehCaixa(moldura1) ? moldurasApenasCaixa : (molduras || [])}
                value={moldura2}
                setValue={setMoldura2}
                labelKey="display"
                valueKey="id"
                size="sm"
              />
              {/* M3 só aparece se M1 NÃO for caixa e M2 também NÃO for caixa */}
              {!ehCaixa(moldura1) && !ehCaixa(moldura2) && (
                <FloatingSelect
                  label="Moldura 3 (opcional)"
                  options={molduras || []}
                  value={moldura3}
                  setValue={setMoldura3}
                  labelKey="display"
                  valueKey="id"
                  size="sm"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Forçar reforço quando o tipo não calcula automaticamente */}
      {podeMostrarReforcoManual && (
        <div className="mt-2">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={forcarReforcoMesmoAssim}
              onChange={(e) => setForcarReforcoMesmoAssim(e.target.checked)}
            />
            <span>Adicionar reforço mesmo assim</span>
          </label>
          <div className="text-xs text-gray-500 mt-1">
            {areaRefM2 >= LIMIAR_REFORCO_M2
              ? 'Área acima do limiar para reforço.'
              : `Profundidade da caixa ${fmt2(profundidadeCaixaCm)} cm abaixo de ${PROFUNDIDADE_GATE_CM} cm.`}
          </div>
        </div>
      )}

      {avisoM2 && <Alert severity="info" className="mt-2">{avisoM2}</Alert>}
      {ehAluminio(moldura1) && (
        <Alert severity="info" className="mt-2">Moldura de alumínio não permite adicionais.</Alert>
      )}
      {perfil.permiteM2M3 && moldura1 && !ehRetaOuPP(moldura1) && !ehCaixa(moldura1) && (
        <Alert severity="info" className="mt-2">
          Moldura 1 diferente de Reta/Passepartout bloqueia Moldura 2 e 3.
        </Alert>
      )}

      {perfil.permiteM2M3 && ehCaixa(moldura1) && (
        <Alert severity="info" className="mt-2">
          Moldura 1 do tipo <strong>Caixa</strong>: Moldura 2 permite apenas Caixa e Moldura 3 fica desabilitada.
        </Alert>
      )}

      {/* Previews das molduras */}
      <div className="mt-5 flex flex-col gap-6">
        {[{ m: moldura1, rot: 'Moldura 1' }, { m: moldura2, rot: 'Moldura 2' }, { m: moldura3, rot: 'Moldura 3' }]
          .filter((x) => x.m)
          .map(({ m, rot }) => {
            const nomeM =
              (m?.nome && m.nome.trim()) ||
              (m?.display && m.display.trim()) ||
              (m?.codigo_principal && m.codigo_principal.trim()) ||
              'Moldura';

            return (
              <div key={`${rot}-${m?.id ?? m?.codigo_principal ?? nomeM}`} className="preview-moldura flex items-start gap-4">
                <MolduraThumb moldura={m} onZoom={(url) => setZoomImg(url)} />
                <div className="text-sm">
                  <div className="font-medium">
                    {rot}: {nomeM}
                  </div>
                  {m?.codigo_principal && <div className="text-gray-500">{m.codigo_principal}</div>}
                </div>
              </div>
            );
          })}
      </div>

      {/* Baguete interna */}
      {usaBagueteInterna && !isTela && (
        <div className="mt-6">
          <FloatingSelect
            label="Baguete interna (ml)"
            options={baguetes || []}
            value={bagueteInternaSelecionada}
            setValue={setBagueteInternaSelecionada}
            labelKey="nome"
            valueKey="id"
            size="sm"
          />
          {bagueteInternaSelecionada &&
            /passepartout/i.test(bagueteInternaSelecionada?.nome || '') && (
              <div className="mt-3">
                <FloatingInput
                  label="Cor do passe-partout (baguete interna)"
                  value={corBaguetePassepartout}
                  onChange={(e) => setCorBaguetePassepartout(e.target.value)}
                  size="sm"
                />
              </div>
            )}
        </div>
      )}

      {mostrarAlertaPesoVidro && (
        <div className="mt-3">
          <Alert severity="warning">
            ⚠️ Área grande com moldura fina. Moldura 1 com face ≤ 2,5 cm e tipo {usoTipoM1 === 'A' ? 'Alumínio' : 'Normal'} com vidro selecionado. Esta combinação pode não suportar o peso do vidro. Verificar com o responsável.
          </Alert>
        </div>
      )}

      {/* Impressão (opcional) */}
      {!isTela && !isDiversosTipo && (
        <div className="mt-6">
          <FloatingSelect
            label="Impressão (opcional)"
            options={impressoes || []}
            value={impressaoSelecionada}
            setValue={setImpressaoSelecionada}
            labelKey="nome"
            valueKey="id"
            size="sm"
          />
        </div>
      )}

      {/* Diversos */}
      {isDiversosTipo && (
        <div className="mt-6 space-y-3">
          <FloatingSelect
            label="Serviço (Diversos)"
            options={DIVERSOS_OPCOES}
            value={diversoSelecionado}
            setValue={(v) => {
              setDiversoSelecionado(v);
              setIncluirImpressaoDiversos(false);
              if (v?.id === 'troca_passepartout') {   // ← limpa molduras
                setMoldura1(null);
                setMoldura2(null);
                setMoldura3(null);
              }
            }}
            labelKey="nome"
            valueKey="id"
            size="sm"
          />

          {(() => {
            const id = diversoSelecionado?.id;
            return (
              <>
                {id === 'troca_vidro' && (
                  <FloatingSelect
                    label="Vidro"
                    options={vidros || []}
                    value={vidroSelecionado}
                    setValue={setVidroSelecionado}
                    labelKey="nome"
                    valueKey="id"
                    size="sm"
                  />
                )}

                {id === 'troca_moldura' && (
                  <div className="grid grid-cols-3 gap-4">
                    <FloatingSelect
                      label="Moldura 1"
                      options={molduras || []}
                      value={moldura1}
                      setValue={(v) => {
                        setMoldura1(v);
                        setMoldura2(null);
                        setMoldura3(null);
                      }}
                      labelKey="display"
                      size="sm"
                    />

                    {!ehAluminio(moldura1) && (ehRetaOuPP(moldura1) || ehCaixa(moldura1)) && (
                      <>
                        <FloatingSelect
                          label="Moldura 2 (opcional)"
                          options={ehCaixa(moldura1) ? moldurasApenasCaixa : (molduras || [])}
                          value={moldura2}
                          setValue={setMoldura2}
                          labelKey="display"
                          size="sm"
                        />
                        {!ehCaixa(moldura1) && !ehCaixa(moldura2) && (
                          <FloatingSelect
                            label="Moldura 3 (opcional)"
                            options={molduras || []}
                            value={moldura3}
                            setValue={setMoldura3}
                            labelKey="display"
                            size="sm"
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                {(id === 'troca_canvas' || id === 'troca_matte') && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={incluirImpressaoDiversos}
                      onChange={(e) => setIncluirImpressaoDiversos(e.target.checked)}
                    />
                    <span>Incluir impressão ({id === 'troca_canvas' ? 'canvas' : 'papel matte'})</span>
                  </label>
                )}

                {id === 'troca_passepartout' && (
                  <>
                    <FloatingSelect
                      label="Passepartout"
                      options={passepartouts || []}
                      value={passepartoutSelecionado}
                      setValue={setPassepartoutSelecionado}
                      size="sm"
                      labelKey="nome"
                      valueKey="id"
                    />

                    {/* NOVO: Margem (cm) para Troca de Passepartout */}
                    <FloatingInput
                      className="mt-2"
                      label="Margem (cm)"
                      type="number"
                      step="0.1"
                      value={margemPassepartout}
                      onChange={(e) => setMargemPassepartout(e.target.value)}
                      size="sm"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FloatingInput
                        label="Cor do passe-partout"
                        value={corPassepartout}
                        onChange={(e) => setCorPassepartout(e.target.value)}
                        size="sm"
                      />
                      <FloatingInput
                        label="Nº de aberturas"
                        type="number"
                        min={1}
                        value={numAberturas}
                        onChange={(e) => setNumAberturas(Math.max(1, Number(e.target.value) || 1))}
                        disabled={!passepartoutSelecionado}
                        size="sm"
                      />
                    </div>
                  </>
                )}


              </>
            );
          })()}
        </div>
      )}



      {/* Métricas e itens somados */}
      <div className="mt-4 text-sm text-gray-600 leading-relaxed space-y-1">
        <div>
          <span className="emoji">📐</span> <strong>Interna</strong>: {fmt2(largura)} cm × {fmt2(altura)} cm
        </div>

        {isFlutuante && Number(margemFlutuante) > 0 && (
          <div>
            <span className="emoji">🔲</span> <strong>Com margem (flutuante)</strong>:{' '}
            {fmt2(dimensoesFinais.larguraReforco)} cm × {fmt2(dimensoesFinais.alturaReforco)} cm
         </div>
        )}

        {/* 1) “Com passe-partout” aparece em Troca de PP também */}
        {!ppBloqueado && !isFlutuante && ((perfil.showPassepartout && passepartoutSelecionado) || isTrocaPP) && (
          <div>
            <span className="emoji">🔲</span> <strong>Com passe-partout</strong>:{' '}
            {fmt2(dimensoesFinais.larguraReforco)} cm × {fmt2(dimensoesFinais.alturaReforco)} cm
          </div>
        )}

        {/* 2) Renomeia o rótulo da área */}
        <div>
          <span className="emoji">📦</span>{' '}
          <strong>{isTrocaPP ? 'Área com passe-partout' : 'Área total'}</strong>:{' '}
          {Number(dimensoesFinais.area || 0).toFixed(3)} m²
        </div>

        {/* 3) Só mostra “Final (com moldura)” se houver moldura escolhida */}
        {temAlgumaMoldura && (
          <div>
            <span className="emoji">🖼️</span> <strong>Final (com moldura)</strong>:{' '}
            {fmt2(dimensoesFinais.largura)} cm × {fmt2(dimensoesFinais.altura)} cm
          </div>
        )}



        {isTela && incluirImpressaoTela && (
          <div>
            <span className="emoji">🖨️</span> <strong>Impressão</strong>: canvas (incluída)
          </div>
        )}

        {isTela &&
          ((parseFloat(altura) || 0) / 100) * ((parseFloat(largura) || 0) / 100) > 0 &&
          incluirChassi && (
            <div>
              <span className="emoji">🔩</span> <strong>Chassi</strong>:{' '}
              {((parseFloat(altura) || 0) / 100) * ((parseFloat(largura) || 0) / 100) > 1 ? '5 mm' : '3 mm'}{' '}
              (incluído no cálculo)
            </div>
          )}

        {isEntreVidros && Number(margemEntreVidros) > 0 && (
          <div>
            <span className="emoji">🔲</span> <strong>Com margem (entre vidros)</strong>:{' '}
            {fmt2(dimensoesFinais.larguraReforco)} cm × {fmt2(dimensoesFinais.alturaReforco)} cm
          </div>
        )}

        {isEntreVidros && (
          <div>
            <span className="emoji">🪟</span> <strong>Vidros</strong>: 2 (frente:{' '}
            {vidroSelecionado?.nome || vidroSelecionado?.descricao || '—'}, fundo: Vidro Comum)
          </div>
        )}

        {perfil.showPassepartout && passepartoutSelecionado && !ppBloqueado && (
          <div>
            <span className="emoji">🔳</span> <strong>Aberturas no passe-partout</strong>: {numAberturasCalc}
          </div>
        )}
   
        {itensSomados.length > 0 && (
          <div className="pt-2">
            <div className="text-gray-700">
              <strong>➕ Itens incluídos no total:</strong>
            </div>
            <ul className="list-disc ml-5 space-y-0.5">
              {itensSomados.map((txt, i) => (
                <li key={i}>{txt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Totais */}
      <div className="mt-4 text-sm text-gray-700 space-y-1">
        <div>
          <span className="emoji">💠</span> <strong>Total sem markup:</strong> {money(valorSemMarkup)}
        </div>
        <div>
          <span className="emoji">💙</span> <strong>Total com markup:</strong> {money(valorTotal)}
        </div>
      </div>

      <div className="mt-3 text-lg font-semibold text-blue-900 bg-blue-100 rounded p-3 text-center">
        Valor estimado: {money(valorTotal)}
      </div>

{/* -------- DEBUG DE CUSTOS -------- */}
{/*
<div className="mt-3 text-xs text-gray-600">
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="checkbox" className="h-4 w-4"
           checked={debugVisivel}
           onChange={(e)=>setDebugVisivel(e.target.checked)} />
    <span>Mostrar debug de custos</span>
  </label>

  {debugVisivel && custosCalc && (
    <div className="mt-2 bg-gray-50 rounded p-2">
      <div className="font-medium text-gray-700 mb-1">Breakdown:</div>

      {(custosCalc.moldurasCamadas || []).map((c, i) => (
        <div key={i}>
          M{i+1}: {fmt2(c.ml)} m × R$ {fmt2(c.precoML)} = R$ {fmt2(c.custo)}
        </div>
      ))}

      <div>Vidro: R$ {fmt2(custosCalc.vidro)}</div>
      <div>Fundo: R$ {fmt2(custosCalc.fundo)}</div>
      <div>Fundo extra: R$ {fmt2(custosCalc.fundoExtra)}</div>
      <div>Passe-partout: R$ {fmt2(custosCalc.passepartout)}</div>
      {Number(custosCalc.passepartoutAberturasExtra||0)>0 && (
        <div>Aberturas extras: R$ {fmt2(custosCalc.passepartoutAberturasExtra)}</div>
      )}
      <div>Impressão: R$ {fmt2(custosCalc.impressao)}</div>
      <div>Baguete interna: R$ {fmt2(custosCalc.bagueteInterna)}</div>
      <div>Chassi: R$ {fmt2(custosCalc.chassi)}</div>
      <div>Reforço: R$ {fmt2(custosCalc.reforco)}</div>
      <div>Camisa/Objeto: R$ {fmt2(custosCalc.camisaObjeto)}</div>
      <div>Diversos: R$ {fmt2(custosCalc.diversos)}</div>
    </div>
  )}
</div>
*/}
{/* ------- FIM DEBUG DE CUSTOS ------- */}


      {/* Modal de zoom */}
      {zoomImg && (
        <div className="modal-backdrop" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="Moldura" />
        </div>
      )}


    </div>
  );
}

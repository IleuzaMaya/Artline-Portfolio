// frontend/src/pages/Orcamento.jsx
import { useEffect, useMemo, useState } from 'react';
import { edge as api } from '../lib/edgeApi';  
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import { calcularOrcamento } from '../utils/calcularOrcamento';
import { Alert } from '@mui/material';
import MolduraThumb from '../components/MolduraThumb';


// Supabase envs
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se existir VITE_SUPABASE_FUNCTIONS_URL, usa; senão troca o domínio para .functions.
const FUNCTIONS_URL =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co'))
    .replace(/\/$/, '');


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

  // ===== Flags Camisa/Entre Vidros =====
  const [ehCamisa, setEhCamisa] = useState(false);                 // usado em Entre Vidros e Camisa/Objetos
  const [entreVidrosNoCamisa, setEntreVidrosNoCamisa] = useState(false); // check "Entre vidros?" dentro de Camisa/Objetos
  const isCamisaObjeto = /(camisa|objeto)/i.test(
    (tipoSelecionado?.nome || '')
  );

  // ===== MODO DIVERSOS (categoria simplificada) =====
  const [diversosBrutos, setDiversosBrutos] = useState([]); // vindo do backend (/diversos)
  const DIVERSOS_OPCOES = [
    { id: 'troca_canvas',  nome: 'Troca de Canvas' },
    { id: 'troca_matte',   nome: 'Troca de Papel Matte' },
    { id: 'troca_chassi',  nome: 'Troca de Chassis' },
    { id: 'troca_moldura', nome: 'Troca de Moldura' },
    { id: 'troca_vidro',   nome: 'Troca de Vidro' },
    { id: 'retirar_arte',  nome: 'Retirar arte' },
  ];
  const [diversoSelecionado, setDiversoSelecionado] = useState(null); // {id, nome}
  const [incluirImpressaoDiversos, setIncluirImpressaoDiversos] = useState(false);

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
  const [incluirImpressaoTela, setIncluirImpressaoTela] = useState(false);

  const impressaoCanvas = useMemo(
    () => (impressoes || []).find(i =>
      /canvas/i.test((i.nome || i.descricao || ''))
    ) || null,
    [impressoes]
  );
  const impressaoMatte = useMemo(
    () => (impressoes || []).find(i =>
      /(matte|mate|fosco)/i.test((i.nome || i.descricao || ''))
    ) || null,
    [impressoes]
  );

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

  // reset
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

    setDiversoSelecionado(null);
    setIncluirImpressaoDiversos(false);

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

  // -------- Perfil por Tipo --------
  const norm = (s = '') =>
    s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

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
      showPassepartout: false,
      vidroFrontalCombo: true,
      vidroFundoComumFixo: true,
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
    },
    flutuante: {
      showPassepartout: false,
      vidroFrontalCombo: false,
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
    else if (/(foto|superficie)/.test(k)) key = 'superficie';
    const overrides = key ? PERFIS[key] : PERFIS.superficie;
    return { ...DEFAULT_PERFIL, ...overrides };
  }

  // 👇 memo para manter referência estável
  const perfilBase = useMemo(
    () => perfilDoTipo(tipoSelecionado?.nome || ''),
    [tipoSelecionado?.nome]
  );

  const isTela = /tela/i.test(tipoSelecionado?.nome || '');
  const isDiversosTipo = /diversos/i.test(tipoSelecionado?.nome || '');

  // Perfil efetivo (override no modo Diversos)
  const perfil = useMemo(() => {
    // Overrides especiais: Camisa/Objetos "em Entre Vidros"
    if (!isDiversosTipo) {
      // se estiver no tipo Camisa/Objetos e marcar "Entre vidros?"
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

  // Preview excede PP e “bloqueio” de PP
  const previewExcedePP =
    perfil.showPassepartout &&
    !cabeNaFolhaPassepartout(largura, altura, margemPassepartout);
  const ppBloqueado = Boolean(perfil.showPassepartout && (previewExcedePP || excedePP));

  // Entre Vidros => 2 vidros
  const isEntreVidros = Boolean(perfil.vidroFundoComumFixo);

  // Quando Camisa/Objetos entra no modo "Entre Vidros", zera PP/Fundo
  useEffect(() => {
    if (isCamisaObjeto && entreVidrosNoCamisa) {
      setPassepartoutSelecionado(null);
      setMargemPassepartout(0);
      setFundoSelecionado(null);
    }
  }, [isCamisaObjeto, entreVidrosNoCamisa]);

  // Helper: mapear nome do tipo → "uso" do backend
  const mapTipoParaUso = (nome='') => {
    const k = norm(nome);
    return /entre\s*vidros?/.test(k) ? 'entre_vidros'
         : /profundidade/.test(k)    ? 'profundidade'
         : /flutuant/.test(k)        ? 'flutuante'
         : /(camisa|objeto)/.test(k) ? 'camisa'
         : /tela/.test(k)            ? 'tela'
         : /superficie|foto/.test(k) ? 'superficie'
         : 'superficie';
  };
  
  // Flutuante
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
      const [tipos, impr, v, f, pp, bg, camis, chs, divs] = await Promise.all([
        edge.get("/tipos-orcamento"),
        edge.get("/impressoes"),
        edge.get("/vidros"),
        edge.get("/fundos"),
        edge.get("/passepartouts"),
        edge.get("/baguetes"),
        edge.get("/camisas").catch(() => ({ data: [] })),
        edge.get("/chassis").catch(() => ({ data: [] })),
        edge.get("/diversos").catch(() => ({ data: [] })),
      ]);
      setTiposOrcamento(asArray(tipos.data));
      setImpressoes(asArray(impr.data));
      setVidros(asArray(v.data));
      setFundo(asArray(f.data));
      setPassepartouts(asArray(pp.data));
      setBaguetes(asArray(bg.data));
      setCamisaObjetoTabela(asArray(camis.data));
      setChassis(asArray(chs.data));
      setDiversosBrutos(asArray(divs.data));
    } catch (err) {
      console.error("Erro ao carregar listas iniciais:", err);
    }
  };
  load();
}, []);


  // quando troca o tipo, recarrega molduras + aplica regras
  useEffect(() => {
  if (!tipoSelecionado) return;

  const uso = mapTipoParaUso(tipoSelecionado?.nome || '');
  const params = { uso };
  if (uso === 'camisa' && ehCamisa) params.permiteA = 1;

  edge.get("/molduras", { params })
    .then((res) => {
      const lista = asArray(res.data);
      const listaFmt = (lista || []).map(m => ({
        ...m,
        display: m.codigo_principal ? `${m.codigo_principal} — ${m.nome}` : m.nome,
        imagem_url: m.imagem_url || m.image_url || m.url_imagem || m.imagem || null,
      }));
      setMolduras(listaFmt);
    })
    .catch(err => {
      console.error('Erro ao carregar molduras:', err);
      setMolduras([]);
    });

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

    const tela = /tela/i.test(tipoSelecionado?.nome || '');
    setIncluirChassi(!!tela);
    setIncluirImpressaoTela(false);
  }, [tipoSelecionado, vidros, fundo, perfil, ehCamisa]);

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

  // ===== Helpers Diversos: encontrar preço correto conforme faixa =====
  const num = (v, d = 0) => {
    const n = Number(String(v ?? '').toString().replace(',', '.'));
    return Number.isFinite(n) ? n : d;
  };
  const maiorLado = () => Math.max(num(altura), num(largura));
  const precoTrocaPorCategoria = (catId) => {
    if (!Array.isArray(diversosBrutos) || diversosBrutos.length === 0) return 0;

    const mm = maiorLado();
    const faixa = mm <= 50 ? 'ate' : 'acima';

    const pickPreco = (o) =>
      num(o?.preco ?? o?.valor ?? o?.preco_unit ?? o?.valor_unit, 0);

    const nomeUpper = (x) => String(x || '').toUpperCase();

    const byCat = (d) => {
      const n = nomeUpper(d.nome);
      switch (catId) {
        case 'troca_canvas':  return n.includes('CANVAS')  && n.includes('TROCA');
        case 'troca_matte':   return (n.includes('MATTE') || n.includes('FOSCO')) && n.includes('TROCA');
        case 'troca_chassi':  return n.includes('CHASSIS') && n.includes('TROCA');
        case 'troca_moldura': return n.includes('MOLDURA') && n.includes('TROCA');
        case 'troca_vidro':   return n.includes('VIDRO')   && n.includes('TROCA');
        case 'retirar_arte':  return n.includes('RETIRAR') && n.includes('ARTE');
        default: return false;
      }
    };

    const candidatos = diversosBrutos.filter(byCat);
    if (candidatos.length === 0) return 0;

    const ehAte = (d) => /AT[ÉE]|ATE/i.test(d.faixa_aplicacao || d.faixa || '');
    const ehAcima = (d) => /ACIMA/i.test(d.faixa_aplicacao || d.faixa || '');

    let escolhido = null;
    if (faixa === 'ate') {
      escolhido = candidatos.find(ehAte) || candidatos.find(d => !ehAcima(d));
    } else {
      escolhido = candidatos.find(ehAcima) || candidatos.find(d => !ehAte(d));
    }
    if (!escolhido) escolhido = candidatos[0];
    return pickPreco(escolhido);
  };

  // cálculo do orçamento
  useEffect(() => {
    async function atualizarOrcamento() {
      try {
        const areaInternaM2 =
          (Math.max(0, parseFloat(altura) || 0) / 100) *
          (Math.max(0, parseFloat(largura) || 0) / 100);

        let impressaoParam = null;
        const isTela = /tela/i.test(tipoSelecionado?.nome || '');

        if (isTela) {
          impressaoParam = incluirImpressaoTela ? impressaoCanvas : null;
        } else if (isDiversosTipo && incluirImpressaoDiversos) {
          const id = diversoSelecionado?.id;
          if (id === 'troca_canvas') impressaoParam = impressaoCanvas;
          else if (id === 'troca_matte') impressaoParam = impressaoMatte;
        } else {
          impressaoParam = impressaoSelecionada;
        }

        const foamAdBranco = (fundo || []).find(f => /foam\s*ad\s*branco/i.test(f.nome || f.descricao || '')) || null;
        const foamExtraDiversos = (isDiversosTipo && diversoSelecionado?.id === 'troca_matte') ? foamAdBranco : null;

        const forcaChassi = (isTela && incluirChassi) || (isDiversosTipo && diversoSelecionado?.id === 'troca_chassi');
        const chassiEscolhido =
          forcaChassi
            ? (areaInternaM2 > 1
                ? (chassis.find(c => /5mm/i.test(c.nome || '')) || null)
                : (chassis.find(c => /3mm/i.test(c.nome || '')) || null))
            : null;

        let diversosPayload = [];
        if (isDiversosTipo && diversoSelecionado?.id) {
          const pTroca = precoTrocaPorCategoria(diversoSelecionado.id);
          if (pTroca > 0) {
            diversosPayload = [{
              id: `cat:${diversoSelecionado.id}`,
              nome: diversoSelecionado.nome,
              faixa_aplicacao: maiorLado() <= 50 ? 'até 50cm' : 'acima 50cm',
              preco: pTroca,
            }];
          }
        }

        const resultado = await calcularOrcamento({
          altura,
          largura,
          quantidade: Number(quantidade) || 1,
          markup: Number(markup) || 0,
          margemPassepartout: Number(margemPassepartout) || 0,
          moldura1,
          moldura2,
          moldura3,

          impressaoSelecionada: impressaoParam,

          vidroSelecionado,
          fundoSelecionado,
          passepartoutSelecionado,
          tipoSelecionado,
          bagueteInternaSelecionada,

          // extras
          fundoExtraSelecionado: foamExtraDiversos || foamExtra,
          camisaObjetoTabela,

          // Diversos
          diversosSelecionados: diversosPayload,

          // extras de perfil
          entreVidros: perfil.vidroFundoComumFixo,
          vidroSomenteComum: perfil.vidroSomenteComum,
          foamExtraAuto: perfil.foamExtraAuto,
          bagueteAuto: perfil.bagueteAuto,

          // passe-partout
          numAberturas,
          precoAberturaExtra: Number(passepartoutSelecionado?.preco_abertura_extra || 0),

          // chassi
          incluirChassi: Boolean(forcaChassi),
          chassiSelecionado: chassiEscolhido,

          // ===== Camisa / Entre Vidros flags =====
          forcarCamisaObjetoTipo:
            (isCamisaObjeto && ehCamisa) || (isEntreVidros && ehCamisa) ? 'camisa'
            : (isCamisaObjeto && !ehCamisa) ? 'objeto'
            : null,
          camisaEntreVidros:
            Boolean((isCamisaObjeto && entreVidrosNoCamisa) || (isEntreVidros && ehCamisa)),

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
        if (c.fundoExtra > 0 && (foamExtraDiversos || foamExtra)) {
          const fExtra = foamExtraDiversos || foamExtra;
          itens.push(`Fundo extra: ${fExtra?.nome || fExtra?.descricao || 'Foam AD Branco'}`);
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
          itens.push(isTela ? 'Impressão em canvas' : 'Impressão');
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

        if (Array.isArray(resultado.diversosInfo?.itens) && resultado.diversosInfo.itens.length) {
          resultado.diversosInfo.itens.forEach((it) => {
            itens.push(`Serviço: ${it.nome}${it.faixa ? ` (${it.faixa})` : ''}`);
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
    impressoes,
    fundo,
    chassis,
    ehCamisa,
    entreVidrosNoCamisa,
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

  const AREA_GRANDE_M2 = 6;
  const LIMIAR_MOLDURA_CM = 3;
  const hasVidro = Boolean(vidroSelecionado) || perfil.vidroSomenteComum;
  const mostrarAlertaAreaGrandeFina =
    Number(dimensoesFinais.area) > AREA_GRANDE_M2 &&
    hasVidro &&
    !isCaixaM1 &&
    larguraM1cm > 0 &&
    larguraM1cm < LIMIAR_MOLDURA_CM;

  const usaBagueteInterna = useMemo(() => {
    if (isTela) return false;
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
        labelKey="nome"
        valueKey="id"
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

    {/* Checks extras por tipo */}
    {(() => {
      const nome = tipoSelecionado?.nome || '';
      const isEV = /entre\s*vidros?/i.test(nome);
      const isCO = /(camisa|objeto)/i.test(nome);
      return (
        <>
          {/* Entre Vidros → "É camisa?" */}
          {isEV && (
            <label className="inline-flex items-center gap-2 mt-2 mb-4 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={ehCamisa}
                onChange={(e) => setEhCamisa(e.target.checked)}
              />
              <span>É camisa?</span>
            </label>
          )}
          {/* Camisa/Objetos → "É camisa?" e "Entre vidros?" */}
          {isCO && (
            <div className="mt-2 space-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={ehCamisa} onChange={(e)=>setEhCamisa(e.target.checked)} />
                <span>É camisa?</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={entreVidrosNoCamisa} onChange={(e)=>setEntreVidrosNoCamisa(e.target.checked)} />
                <span>Entre vidros?</span>
              </label>
            </div>
          )}
        </>
      );
    })()}


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
            labelKey="nome"      // use "descricao" se sua API vier assim
            valueKey="id"
          />

          <FloatingInput
            label="Margem (cm)"
            type="number"
            step="0.1"
            value={margemPassepartout}
            onChange={(e) => setMargemPassepartout(e.target.value)}
            disabled={ppBloqueado || perfil.passepartoutSemMargem}
          />

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
          labelKey="nome"
          valueKey="id"
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
          labelKey="nome"
          valueKey="id"
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
                {impressaoCanvas?.preco_m2 ? ` (automático — R$ ${Number(impressaoCanvas.preco_m2 || impressaoCanvas.valor_m2 || 0).toFixed(2).replace('.', ',')}/m²)` : ''}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Molduras (oculta no Diversos, exceto quando categoria exige) */}
      {(!isDiversosTipo || diversoSelecionado?.id === 'troca_moldura') && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          <FloatingSelect
            label="Moldura 1"
            options={molduras || []}
            value={moldura1}
            setValue={(v) => { setMoldura1(v); setMoldura2(null); setMoldura3(null); }}
            labelKey="display"
            valueKey="id"
          />

          {(perfil.permiteM2M3 && !ehAluminio(moldura1) && ehRetaOuPP(moldura1)) && (
            <>
              <FloatingSelect
                label="Moldura 2 (opcional)"
                options={molduras || []}
                value={moldura2}
                setValue={setMoldura2}
                labelKey="display"
                valueKey="id"
              />
              {!ehCaixa?.(moldura2) && (
                <FloatingSelect
                  label="Moldura 3 (opcional)"
                  options={molduras || []}
                  value={moldura3}
                  setValue={setMoldura3}
                  labelKey="display"
                  valueKey="id"
                />
              )}
            </>
          )}
        </div>
      )}

      {avisoM2 && <Alert severity="info" className="mt-2">{avisoM2}</Alert>}
      {ehAluminio(moldura1) && <Alert severity="info" className="mt-2">Moldura de alumínio não permite adicionais.</Alert>}
      {(moldura1 && !ehRetaOuPP(moldura1)) && <Alert severity="info" className="mt-2">Moldura 1 diferente de Reta/Passepartout bloqueia Moldura 2 e 3.</Alert>}

      {/* Previews das molduras com mais espaço — usando MolduraThumb */}
      <div className="mt-5 flex flex-col gap-6">
        {[{ m: moldura1, rot: 'Moldura 1' }, { m: moldura2, rot: 'Moldura 2' }, { m: moldura3, rot: 'Moldura 3' }]
          .filter(x => x.m)
          .map(({ m, rot }) => (
            <div key={`${rot}-${m.id || m.codigo_principal || m.nome}`} className="preview-moldura flex items-start gap-4">
              <MolduraThumb moldura={m} onZoom={(url) => setZoomImg(url)} />
              <div className="text-sm">
                <div className="font-medium">{rot}: {m.nome}</div>
                {m.codigo_principal && <div className="text-gray-500">{m.codigo_principal}</div>}
              </div>
            </div>
        ))}
      </div>


      {/* Baguete (auto, mas editável) — aparece quando houver caixa/uso */}
      {(perfil.bagueteAuto || (moldura1?.uso_tipo === 'C')) && !isTela && (
        <div className="mt-6">
          <FloatingSelect
            label="Baguete interna (ml)"
            options={baguetes || []}
            value={bagueteInternaSelecionada}
            setValue={setBagueteInternaSelecionada}
            labelKey="nome"
            valueKey="id"
          />
        </div>  
      )}

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

      {/* Impressão (apenas quando NÃO é Tela e NÃO é modo Diversos) */}
      {!isTela && !isDiversosTipo && (
        <div className="mt-6">
          <FloatingSelect
            label="Impressão (opcional)"
            options={impressoes || []}
            value={impressaoSelecionada}
            setValue={setImpressaoSelecionada}
            labelKey="nome"
            valueKey="id"
          />
        </div>
      )}

      {/* MODO DIVERSOS (categoria simples) */}
      {isDiversosTipo && (
        <div className="mt-6 space-y-3">
          <FloatingSelect
            label="Serviço (Diversos)"
            options={DIVERSOS_OPCOES}
            value={diversoSelecionado}
            setValue={(v) => { setDiversoSelecionado(v); setIncluirImpressaoDiversos(false); }}
            labelKey="nome"
            valueKey="id"
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
                  />
                )}

                {id === 'troca_moldura' && (
                  <div className="grid grid-cols-3 gap-4">
                    <FloatingSelect label="Moldura 1" options={molduras||[]} value={moldura1} setValue={(v)=>{setMoldura1(v); setMoldura2(null); setMoldura3(null);}} labelKey="display"/>
                    {(!ehAluminio(moldura1) && ehRetaOuPP(moldura1)) && (
                      <>
                        <FloatingSelect label="Moldura 2 (opcional)" options={molduras||[]} value={moldura2} setValue={setMoldura2} labelKey="display"/>
                        {!ehCaixa?.(moldura2) && (
                          <FloatingSelect label="Moldura 3 (opcional)" options={molduras||[]} value={moldura3} setValue={setMoldura3} labelKey="display"/>
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
                      onChange={(e)=>setIncluirImpressaoDiversos(e.target.checked)}
                    />
                    <span>Incluir impressão ({id === 'troca_canvas' ? 'canvas' : 'papel matte'})</span>
                  </label>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Métricas e itens somados */}
      <div className="mt-4 text-sm text-gray-600 leading-relaxed space-y-1">
        <div>📐 <strong>Interna</strong>: {fmt2(largura)} cm × {fmt2(altura)} cm</div>

        {perfil.showPassepartout && passepartoutSelecionado && !ppBloqueado && (
          <div>🛠️ <strong>Com Passepartout</strong>: {fmt2(dimensoesFinais.larguraReforco)} cm × {fmt2(dimensoesFinais.alturaReforco)} cm</div>
        )}

        <div>🖼️ <strong>Final (com moldura)</strong>: {fmt2(dimensoesFinais.largura)} cm × {fmt2(dimensoesFinais.altura)} cm</div>
        <div>📦 <strong>Área total</strong>: {Number(dimensoesFinais.area || 0).toFixed(3)} m²</div>

        {isTela && incluirImpressaoTela && (
          <div>🖨️ <strong>Impressão</strong>: canvas (incluída)</div>
        )}

        {isTela && ((parseFloat(altura)||0)/100)*((parseFloat(largura)||0)/100) > 0 && incluirChassi && (
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

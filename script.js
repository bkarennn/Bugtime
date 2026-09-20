'use strict';

// Todos os tempos são armazenados em segundos. A interface formata em horas/minutos.
const CHAVE = 'bugtime.v1';
// TESTE VISUAL DO JARDIM: troque null por 'morning', 'afternoon', 'sunset' ou
// 'night' e recarregue a página. Volte para null para acompanhar o relógio local.
// Esta opção é só de desenvolvimento e não é gravada no localStorage.
const periodoTeste = null;
const $ = (seletor) => document.querySelector(seletor);
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cores = ['#f5ccd4', '#f8e5a4', '#d6e8f7', '#dcebcf'];
const corSegura = cor => /^#[0-9a-f]{6}$/i.test(cor) ? cor : cores[0];

// CATÁLOGO: altere requisitos e aparências aqui, sem mexer nas telas.
// As metas de tempo usam segundos. Imagens podem ser adicionadas posteriormente:
// imagens: ['assets/plantas/margarida/estagio1.png', ...] (cinco caminhos).
const plantas = [
  {id:'margarida', nome:'Margarida', raridade:'comum', desbloqueadaInicialmente:true},
  {id:'tulipa', nome:'Tulipa', raridade:'comum', requisito:{metrica:'pomodorosConcluidos', meta:3, descricao:'Complete 3 sessões de foco.'}},
  {id:'cacto', nome:'Cacto', raridade:'comum', desbloqueadaInicialmente:true},
  {id:'suculenta', nome:'Suculenta', raridade:'comum', desbloqueadaInicialmente:true},
  {id:'lavanda', nome:'Lavanda', raridade:'comum', requisito:{metrica:'tarefasConcluidas', meta:10, descricao:'Complete 10 tarefas de projetos.'}},
  {id:'trevo', nome:'Trevo', raridade:'comum', desbloqueadaInicialmente:true},
  {id:'hortela', nome:'Hortelã', raridade:'comum', requisito:{metrica:'tempoTotalDeFoco', meta:3600, descricao:'Acumule 1 hora de foco.'}},
  {id:'girassol', nome:'Girassol', raridade:'comum', desbloqueadaInicialmente:true},
  {id:'rosa', nome:'Rosa', raridade:'incomum', requisito:{metrica:'tempoTotalDeFoco', meta:5*3600, descricao:'Dedique 5 horas aos seus projetos.'}},
  {id:'hibisco', nome:'Hibisco', raridade:'incomum', requisito:{metrica:'projetosCriados', meta:3, descricao:'Crie 3 projetos.'}},
  {id:'lirio', nome:'Lírio', raridade:'incomum', requisito:{metrica:'pomodorosConcluidos', meta:10, descricao:'Complete 10 sessões de foco.'}},
  {id:'violeta', nome:'Violeta', raridade:'incomum', requisito:{metrica:'tarefasConcluidas', meta:20, descricao:'Complete 20 tarefas de projetos.'}},
  {id:'dalia', nome:'Dália', raridade:'incomum', requisito:{metrica:'tempoTotalDeFoco', meta:8*3600, descricao:'Acumule 8 horas de foco.'}},
  {id:'camelia', nome:'Camélia', raridade:'incomum', requisito:{metrica:'projetosConcluidos', meta:2, descricao:'Conclua 2 projetos diferentes.'}},
  {id:'orquidea', nome:'Orquídea', raridade:'incomum', requisito:{metrica:'pomodorosConcluidos', meta:25, descricao:'Complete 25 Pomodoros.'}},
  {id:'flor-de-lotus', nome:'Flor-de-lótus', raridade:'rara', requisito:{metrica:'projetosConcluidos', meta:1, descricao:'Conclua seu primeiro projeto.'}},
  {id:'peonia', nome:'Peônia', raridade:'rara', requisito:{metrica:'tempoTotalDeFoco', meta:20*3600, descricao:'Acumule 20 horas de foco.'}},
  {id:'glicinia', nome:'Glicínia', raridade:'rara', requisito:{metrica:'pomodorosConcluidos', meta:40, descricao:'Complete 40 sessões de foco.'}},
  {id:'cerejeira', nome:'Cerejeira', raridade:'rara', requisito:{metrica:'projetosConcluidos', meta:5, descricao:'Conclua 5 projetos diferentes.'}},
  {id:'monstera-variegata', nome:'Monstera variegata', raridade:'rara', requisito:{metrica:'tarefasConcluidas', meta:60, descricao:'Complete 60 tarefas de projetos.'}},
  {id:'rosa-azul', nome:'Rosa azul', raridade:'especial', requisito:{metrica:'pomodorosConcluidos', meta:50, descricao:'Complete 50 sessões de foco.'}},
  {id:'flor-da-lua', nome:'Flor da Lua', raridade:'especial', requisito:{metrica:'tempoTotalDeFoco', meta:50*3600, descricao:'Acumule 50 horas de foco.'}},
  {id:'trevo-dourado', nome:'Trevo dourado', raridade:'especial', requisito:{metrica:'tarefasConcluidas', meta:100, descricao:'Complete 100 tarefas de projetos.'}},
  {id:'cogumelo-luminoso', nome:'Cogumelo luminoso', raridade:'especial', requisito:{metrica:'projetosConcluidos', meta:10, descricao:'Conclua 10 projetos diferentes.'}},
  {id:'flor-estrelada', nome:'Flor estrelada', raridade:'especial', requisito:{metrica:'pomodorosConcluidos', meta:100, descricao:'Complete 100 sessões de foco.'}}
];
const nomesEstagios = ['Semente', 'Broto', 'Planta jovem', 'Planta adulta', 'Planta florida / completa'];
const raridades = {comum:'Comuns', incomum:'Incomuns', rara:'Raras', especial:'Especiais'};
const nomesRaridade = {comum:'Comum', incomum:'Incomum', rara:'Rara', especial:'Especial'};
const filaConquistas = [];
const crescimentosRecentes = new Map();
let conquistaAtual = null;
let conquistaTimeout;
let avisoCarga = '';
let dados = carregarDados();
let telaAtual = 'inicio';
let projetoAberto = null;
let acaoModal = null;
let avisoTimeout;
let celebrando = false;
// Estado de apresentação do Jardim; não altera os dados salvos nem os desbloqueios.
let jardimVista = 'cultivo';
let jardimProjetoAberto = null;

function dadosIniciais() {
  return {
    versao:2, projetos:[], pastas:[], listas:[], sessoes:[],
    configuracoes:{minutos:25, projetoId:''}, pomodoro:null,
    plantasDesbloqueadas:plantas.filter(p => p.desbloqueadaInicialmente).map(p => p.id),
    historicoConquistas:{tarefas:[], projetos:[]}, estatisticas:{}
  };
}
function carregarDados() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return dadosIniciais();
    const salvo = JSON.parse(bruto);
    if (!salvo || !['projetos','pastas','listas','sessoes'].every(chave => Array.isArray(salvo[chave]))) throw new Error('Formato inválido');
    return migrarDados(salvo);
  } catch (erro) {
    avisoCarga = 'Não foi possível ler os dados salvos. O armazenamento original foi preservado; as alterações desta sessão não serão salvas.';
    return dadosIniciais();
  }
}
function salvarDados() {
  atualizarGamificacao();
  // Não sobrescrevemos um armazenamento que não conseguimos ler.
  if (avisoCarga) { avisar(avisoCarga); return; }
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); }
  catch (erro) { avisar('Não foi possível salvar neste navegador. Baixe uma cópia na aba Perfil.'); }
}
function avisar(mensagem) {
  clearTimeout(avisoTimeout);
  $('#aviso').textContent = mensagem; $('#aviso').hidden = false;
  avisoTimeout = setTimeout(() => $('#aviso').hidden = true, 5500);
}
function tempoAmigavel(segundos) {
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  return horas ? `${horas}h ${minutos % 60}min` : `${minutos}min`;
}
function diaLocal(data = new Date()) { return `${data.getFullYear()}-${data.getMonth()+1}-${data.getDate()}`; }
function progresso(projeto) { return projeto.metaHoras > 0 ? Math.min(100, projeto.tempoTotal / (projeto.metaHoras * 3600) * 100) : 0; }
// MIGRAÇÃO: a mesma chave do localStorage preserva todo o histórico da versão anterior.
// IDs creditados impedem que marcar/desmarcar ou reabrir projetos multiplique pontos.
function migrarDados(salvo) {
  const estado = {...dadosIniciais(), ...salvo, versao:2};
  estado.configuracoes = {...dadosIniciais().configuracoes, ...salvo.configuracoes};
  estado.plantasDesbloqueadas = [...new Set([
    ...dadosIniciais().plantasDesbloqueadas,
    ...(Array.isArray(salvo.plantasDesbloqueadas) ? salvo.plantasDesbloqueadas : [])
  ])].filter(id => plantas.some(p => p.id === id));
  estado.historicoConquistas = {
    tarefas:[...(salvo.historicoConquistas?.tarefas || [])],
    projetos:[...(salvo.historicoConquistas?.projetos || [])]
  };
  estado.projetos.forEach(projeto => {
    projeto.plantaId = estado.plantasDesbloqueadas.includes(projeto.plantaId) ? projeto.plantaId : 'margarida';
    projeto.concluido = !!projeto.concluido;
    projeto.estagioPlanta = calcularEstagioPlanta(projeto);
  });
  atualizarEstatisticasGlobais(estado);
  return estado;
}

function atualizarEstatisticasGlobais(estado = dados) {
  const tarefas = new Set(estado.historicoConquistas.tarefas);
  const projetos = new Set(estado.historicoConquistas.projetos);
  estado.projetos.forEach(projeto => {
    projeto.tarefas.filter(t => t.concluida).forEach(t => tarefas.add(t.id));
    if (projeto.concluido) projetos.add(projeto.id);
  });
  estado.historicoConquistas = {tarefas:[...tarefas], projetos:[...projetos]};
  estado.estatisticas = {
    tempoTotalDeFoco:estado.projetos.reduce((total,p) => total+p.tempoTotal,0),
    pomodorosConcluidos:new Set(estado.sessoes.map(s => s.id)).size,
    tarefasConcluidas:tarefas.size,
    projetosConcluidos:projetos.size,
    projetosCriados:estado.projetos.length
  };
}

// Crescimento por tempo: tarefas e sessões também ajudam a ampliar a coleção.
// Com meta, os limites superiores de 20/40/60/80% pertencem ao estágio anterior.
// Sem meta, 30min, 2h, 5h e 10h iniciam o próximo estágio.
function limitesEstagios(projeto) {
  return projeto.metaHoras > 0
    ? [0.2,0.4,0.6,0.8].map(fracao => Math.floor(projeto.metaHoras*3600*fracao)+1)
    : [30*60, 2*3600, 5*3600, 10*3600];
}
function calcularEstagioPlanta(projeto) {
  return 1 + limitesEstagios(projeto).filter(limite => projeto.tempoTotal >= limite).length;
}
function nivelDaPlanta(projeto) { return calcularEstagioPlanta(projeto); }
function progressoProximoEstagio(projeto) {
  const estagio = calcularEstagioPlanta(projeto);
  if (estagio === 5) return {percentual:100, restante:0};
  const limites = limitesEstagios(projeto);
  const inicio = estagio === 1 ? 0 : limites[estagio-2];
  const fim = limites[estagio-1];
  return {percentual:Math.max(0,Math.min(100,(projeto.tempoTotal-inicio)/(fim-inicio)*100)), restante:fim-projeto.tempoTotal};
}
function plantaDoProjeto(projeto) { return plantas.find(p => p.id === projeto.plantaId) || plantas[0]; }

// ARTE FLAT: dados visuais separados dos requisitos e do progresso do catálogo.
// Todas as espécies compartilham vaso, escala, folhagens e cores sem sombras.
const aparenciasPlantas = {
  margarida: {tipo:'flor', cor:'#fff9e9', miolo:'#e7ba59', petalas:8},
  tulipa: {tipo:'tulipa', cor:'#eaa0ae'},
  cacto: {tipo:'cacto', cor:'#88ab83'},
  suculenta: {tipo:'suculenta', cor:'#96bba6'},
  lavanda: {tipo:'ramo', cor:'#ac98c3'},
  trevo: {tipo:'trevo', cor:'#86ab7c'},
  hortela: {tipo:'erva', cor:'#89b18e'},
  girassol: {tipo:'flor', cor:'#e9bd60', miolo:'#896548', petalas:12},
  rosa: {tipo:'rosa', cor:'#d98b98'},
  hibisco: {tipo:'hibisco', cor:'#e6a09a', miolo:'#e7bc65', petalas:5},
  lirio: {tipo:'lirio', cor:'#fff1d6'},
  violeta: {tipo:'flor', cor:'#a796bf', miolo:'#f2d68d', petalas:5},
  dalia: {tipo:'camadas', cor:'#d990a8', miolo:'#efd08b', petalas:10},
  camelia: {tipo:'flor', cor:'#e9b9b5', miolo:'#deb860', petalas:7},
  orquidea: {tipo:'orquidea', cor:'#c9a1c3'},
  'flor-de-lotus': {tipo:'lotus', cor:'#e7adbc'},
  peonia: {tipo:'camadas', cor:'#e9b1c5', miolo:'#efcf8b', petalas:7},
  glicinia: {tipo:'cascata', cor:'#b49bca'},
  cerejeira: {tipo:'arvore', cor:'#edb8ca'},
  'monstera-variegata': {tipo:'monstera', cor:'#86a88b'},
  'rosa-azul': {tipo:'rosa', cor:'#8eafce'},
  'flor-da-lua': {tipo:'lua', cor:'#c5bddb', miolo:'#fff1c2', petalas:6},
  'trevo-dourado': {tipo:'trevo', cor:'#d6b362'},
  'cogumelo-luminoso': {tipo:'cogumelo', cor:'#a8b9b0'},
  'flor-estrelada': {tipo:'estrela', cor:'#e2c17b'}
};

// Usa o desenho original como fonte única. Classes de contexto mudam só a pose.
function visualJoaninha() {
  const partes = $('#joaninha').innerHTML.replaceAll('<div', '<span').replaceAll('</div>', '</span>');
  return `<span class="bug-art" aria-hidden="true">${partes}</span>`;
}
function petalasSVG(quantidade, cor, x = 48, y = 37, raio = 14, largura = 8, altura = 13) {
  return Array.from({length:quantidade}, (_,i) =>
    `<ellipse cx="${x}" cy="${y-raio}" rx="${largura}" ry="${altura}" fill="${cor}" transform="rotate(${i*360/quantidade} ${x} ${y})"/>`
  ).join('');
}
function folhasSVG() {
  return '<path d="M47 74C31 76 24 65 24 58C38 55 47 61 47 74Z" fill="#91ad83"/><path d="M49 64C64 65 72 54 70 48C58 48 49 54 49 64Z" fill="#abc39b"/>';
}

function desenhoAdultoSVG(aparencia, completa) {
  const {tipo, cor, miolo = '#e8c57a', petalas = 6} = aparencia;
  const caule = '<path d="M48 89V41" fill="none" stroke="#7f9d74" stroke-width="4" stroke-linecap="round"/>';
  const base = caule + folhasSVG();
  const flor = petalasSVG(petalas,cor) + `<circle cx="48" cy="37" r="9" fill="${miolo}"/>`;
  // Espécies sem flor têm sua própria silhueta em todas as fases adultas.
  if (tipo === 'cacto') return `<path d="M41 88V39Q41 25 49 25Q57 25 57 39V53H63V42Q63 37 68 37Q73 37 73 42V58Q73 63 66 63H57V88Z" fill="${cor}"/><path d="M42 63H33Q25 63 25 55V47Q25 42 30 42Q35 42 35 47V54H42Z" fill="${cor}"/><path d="M49 39V81" stroke="#6e946e" stroke-width="2" stroke-linecap="round"/>${completa ? petalasSVG(5,'#e6a9b7',49,27,5,4,6)+'<circle cx="49" cy="27" r="3" fill="#f3d492"/>' : ''}`;
  if (tipo === 'suculenta') return `<g transform="translate(0 10)">${[-65,-35,0,35,65].map((angulo,i) => `<ellipse cx="48" cy="53" rx="10" ry="26" fill="${i%2 ? '#7fa591' : cor}" transform="rotate(${angulo} 48 74)"/>`).join('')}<ellipse cx="48" cy="60" rx="9" ry="17" fill="#b5cbb0"/></g>`;
  if (tipo === 'trevo') return `${caule}<g fill="${cor}">${[0,90,180,270].map(a => `<path d="M48 43C22 40 24 18 36 20Q44 19 48 28Q52 19 60 20C72 18 74 40 48 43Z" transform="rotate(${a} 48 43)"/>`).join('')}</g><circle cx="48" cy="43" r="4" fill="#78976e"/>`;
  if (tipo === 'erva') return `${caule}${[0,18,36].map((offset,i) => `<g transform="translate(0 ${offset})"><path d="M48 46C24 45 24 30 28 24C43 24 49 31 48 46Z" fill="${i%2 ? '#a8c19a' : cor}"/><path d="M48 40C70 42 73 28 69 22C55 22 48 29 48 40Z" fill="#a8c19a"/></g>`).join('')}`;
  if (tipo === 'monstera') return `${caule}<path d="M48 29C23 9 13 43 29 62L48 76L67 62C83 43 73 9 48 29Z" fill="${cor}"/><path d="M48 29C61 15 74 27 70 44L61 42L67 55L48 76Z" fill="#dce6c3"/><path d="M48 34V73M30 37L40 43M28 49L39 54M58 36L66 31" stroke="#5f8265" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (tipo === 'cogumelo') return `<path d="M40 56L36 86Q48 93 60 86L56 56Z" fill="#e8d8b5"/><path d="M19 57C21 9 75 9 77 57Q48 68 19 57Z" fill="${cor}"/><g fill="#faf1cf"><circle cx="36" cy="39" r="5"/><circle cx="56" cy="33" r="6"/><circle cx="63" cy="51" r="4"/></g>${completa ? '<path d="M14 29V37M10 33H18M81 70V78M77 74H85" stroke="#c3b57d" stroke-width="2" stroke-linecap="round"/>' : ''}`;
  if (tipo === 'arvore') return `<path d="M48 89V39M48 61L29 41M48 54L67 32" stroke="#a68c76" stroke-width="5" stroke-linecap="round" fill="none"/>${[[28,37],[48,26],[67,32],[56,52],[26,57]].map(([x,y]) => completa ? petalasSVG(5,cor,x,y,6,5,7)+`<circle cx="${x}" cy="${y}" r="3" fill="#d0a66a"/>` : `<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#abc39b"/>`).join('')}`;
  if (tipo === 'cascata') return `<path d="M47 88V28Q62 18 76 28M47 29Q31 21 19 32" fill="none" stroke="#7f9d74" stroke-width="4" stroke-linecap="round"/>${[24,47,70].map((x,i) => `<path d="M${x} 29V${65+i%2*10}" stroke="#7f9d74" stroke-width="2"/>${[0,1,2,3].map(j => `<ellipse cx="${x}" cy="${34+j*9}" rx="${9-j*1.5}" ry="6" fill="${completa ? cor : '#aac399'}"/>`).join('')}`).join('')}`;
  if (tipo === 'ramo') return `${[-16,0,16].map((x,i) => `<g transform="translate(${x} ${i===1 ? -6 : 4})"><path d="M48 87V30" stroke="#7f9d74" stroke-width="3" stroke-linecap="round"/>${[0,1,2,3].map(j => `<ellipse cx="44" cy="${31+j*8}" rx="4" ry="6" fill="${completa ? cor : '#a4b892'}" transform="rotate(-25 44 ${31+j*8})"/><ellipse cx="52" cy="${31+j*8}" rx="4" ry="6" fill="${completa ? cor : '#a4b892'}" transform="rotate(25 52 ${31+j*8})"/>`).join('')}</g>`).join('')}`;
  // No estágio adulto, um botão substitui a flor aberta, mantendo espécie e cores.
  if (!completa) return `${base}<path d="M48 44C23 38 34 20 48 18C62 20 73 38 48 44Z" fill="${cor}"/><path d="M36 39L48 49L60 39" stroke="#7f9d74" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  switch (tipo) {
    case 'tulipa': return `${base}<path d="M27 20L38 30L48 15L58 30L69 20V36C69 60 27 60 27 36Z" fill="${cor}"/>`;
    case 'rosa': return `${base}<path d="M48 14C59 10 72 20 70 31C81 45 66 59 55 56C40 67 25 54 28 42C15 30 29 15 40 18Z" fill="${cor}"/><path d="M59 30C43 20 33 35 40 45C48 54 64 43 59 35C53 27 42 32 46 39L52 40" fill="none" stroke="#fff4e8" stroke-width="3" stroke-linecap="round"/>`;
    case 'hibisco': return `${base}${flor}<path d="M49 37L62 20" stroke="#b16e70" stroke-width="3" stroke-linecap="round"/><circle cx="64" cy="17" r="4" fill="#e8c57a"/>`;
    case 'lirio': return `${base}${[0,60,120,180,240,300].map(a => `<path d="M48 39Q30 22 48 10Q66 22 48 39Z" fill="${cor}" transform="rotate(${a} 48 39)"/>`).join('')}<circle cx="48" cy="39" r="6" fill="#d5aa66"/>`;
    case 'orquidea': return `${base}<g fill="${cor}"><ellipse cx="30" cy="33" rx="16" ry="12" transform="rotate(25 30 33)"/><ellipse cx="66" cy="33" rx="16" ry="12" transform="rotate(-25 66 33)"/><ellipse cx="48" cy="25" rx="10" ry="17"/></g><path d="M48 37C23 39 34 58 48 50C62 58 73 39 48 37Z" fill="#e7bdd8"/><path d="M42 36H54L51 47H45Z" fill="#e5bc69"/>`;
    case 'lotus': return `${caule}<ellipse cx="48" cy="73" rx="32" ry="9" fill="#a8c29a"/><path d="M48 61C17 65 16 39 20 31C35 33 45 45 48 61Z" fill="#d995ab"/><path d="M48 61C79 65 80 39 76 31C61 33 51 45 48 61Z" fill="#d995ab"/><path d="M48 61C23 46 34 25 48 14C62 25 73 46 48 61Z" fill="${cor}"/>`;
    case 'camadas': return `${base}${petalasSVG(petalas,cor,48,37,16,10,14)}${petalasSVG(petalas,'#f3d0d7',48,37,8,6,10)}<circle cx="48" cy="37" r="6" fill="${miolo}"/>`;
    case 'lua': return `${base}${petalasSVG(petalas,cor)}<circle cx="48" cy="37" r="12" fill="${miolo}"/><circle cx="53" cy="33" r="10" fill="${cor}"/>`;
    case 'estrela': return `${base}<path d="M48 12L57 29L77 32L62 46L65 66L48 56L31 66L34 46L19 32L39 29Z" fill="${cor}"/><circle cx="48" cy="40" r="7" fill="#fff1ca"/>`;
    default: return `${base}${flor}`;
  }
}
function desenhoPlantaSVG(planta, estagio) {
  const aparencia = aparenciasPlantas[planta.id] || aparenciasPlantas.margarida;
  let desenho;
  if (estagio === 1) {
    desenho = '<ellipse cx="48" cy="81" rx="8" ry="5" fill="#957453" transform="rotate(-25 48 81)"/><path d="M47 83L50 79" stroke="#c5a67f" stroke-width="2" stroke-linecap="round"/>';
  } else if (estagio === 2) {
    desenho = '<path d="M48 90V66" stroke="#7f9d74" stroke-width="3" stroke-linecap="round"/><path d="M48 74C28 74 29 58 32 55C45 57 49 63 48 74Z" fill="#a8c29a"/><path d="M48 67C48 52 62 49 68 51C68 64 59 69 48 67Z" fill="#88aa80"/>';
  } else if (estagio === 3) {
    // Muda com caule e poucas folhas: ainda não tem botão nem flor aberta.
    desenho = '<path d="M48 88V43" fill="none" stroke="#7f9d74" stroke-width="3" stroke-linecap="round"/>' + folhasSVG() + '<path d="M48 47Q38 35 43 32Q55 36 48 47Z" fill="#abc39b"/>';
  } else {
    const arte = desenhoAdultoSVG(aparencia,estagio === 5);
    // A fase adulta ainda é menor que a completa, inclusive nas folhagens sem flor.
    desenho = estagio === 4 ? `<g transform="translate(6 11) scale(.88)">${arte}</g>` : arte;
  }
  const vaso = '<path d="M29 88H67L62 106H34Z" fill="#d2a88f"/><rect x="26" y="85" width="44" height="7" rx="3" fill="#bd937b"/>';
  return `<svg class="planta-icone stage-${estagio}" viewBox="0 0 96 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${desenho}${vaso}</svg>`;
}

// Um único adaptador atende Jardim, projetos, estágios e avisos de conquistas.
function visualPlanta(planta, estagio = 5, visitante = false) {
  const imagem = planta.imagens?.[estagio-1];
  const arte = imagem
    ? `<img src="${escapar(imagem)}" alt="" class="plant-image">`
    : desenhoPlantaSVG(planta,estagio);
  return `<span class="plant-visual plant-${planta.id}" aria-hidden="true">${arte}${visitante ? `<span class="plant-visitor" data-visit-until="${Date.now()+6000}">${visualJoaninha()}</span>` : ''}</span>`;
}

function atualizarGamificacao(notificar = true) {
  atualizarEstatisticasGlobais();
  dados.projetos.forEach(projeto => {
    const anterior = projeto.estagioPlanta || 1;
    projeto.estagioPlanta = calcularEstagioPlanta(projeto);
    if (notificar && projeto.estagioPlanta > anterior) {
      crescimentosRecentes.set(projeto.id, Date.now()+6000);
      enfileirarConquista({tipo:'crescimento', projetoId:projeto.id, plantaId:projeto.plantaId, estagio:projeto.estagioPlanta, nome:projeto.nome});
    }
  });
  const novas = plantas.filter(planta => !dados.plantasDesbloqueadas.includes(planta.id)
    && (planta.desbloqueadaInicialmente || dados.estatisticas[planta.requisito.metrica] >= planta.requisito.meta));
  novas.forEach(planta => dados.plantasDesbloqueadas.push(planta.id));
  if (notificar && novas.length) enfileirarConquista({tipo:'desbloqueio', plantas:novas.map(p => p.id)});
}

// Avisos em fila não roubam o foco nem interrompem o Pomodoro ou os formulários.
function enfileirarConquista(conquista) {
  filaConquistas.push(conquista);
  mostrarProximaConquista();
}
function mostrarProximaConquista() {
  if (conquistaAtual || !filaConquistas.length) return;
  conquistaAtual = filaConquistas.shift();
  const crescimento = conquistaAtual.tipo === 'crescimento';
  const planta = plantas.find(p => p.id === (crescimento ? conquistaAtual.plantaId : conquistaAtual.plantas[0])) || plantas[0];
  const nomes = crescimento ? conquistaAtual.nome : conquistaAtual.plantas.map(id => plantas.find(p => p.id === id).nome).join(', ');
  $('#conquista-conteudo').innerHTML = `${visualPlanta(planta,crescimento ? conquistaAtual.estagio : 5,crescimento)}<div><strong>${crescimento ? 'Sua plantinha cresceu!' : 'Nova planta desbloqueada!'}</strong><p>${escapar(nomes)}</p><small>${crescimento ? nomesEstagios[conquistaAtual.estagio-1] : 'Uma nova semente chegou ao seu jardim.'}</small></div>`;
  $('#ver-conquista').textContent = crescimento ? 'Ver projeto ↗' : 'Ver no Jardim ↗';
  $('#conquista').hidden = false;
  conquistaTimeout = setTimeout(dispensarConquista, crescimento ? 6000 : 10000);
}
function dispensarConquista() {
  clearTimeout(conquistaTimeout);
  $('#conquista').hidden = true;
  conquistaAtual = null;
  mostrarProximaConquista();
}

// Cultivo e coleção são apresentações diferentes da mesma fonte de dados.
function mudarVistaJardim(vista) {
  jardimVista = vista === 'colecao' ? 'colecao' : 'cultivo';
  $('#jardim-cultivo').hidden = jardimVista !== 'cultivo';
  $('#jardim-sementes').hidden = jardimVista !== 'colecao';
  document.querySelectorAll('[data-garden-view]').forEach(botao => {
    botao.setAttribute('aria-pressed',String(botao.dataset.gardenView === jardimVista));
  });
}
function resumoCrescimento(projeto) {
  const estagio = calcularEstagioPlanta(projeto);
  const proximo = progressoProximoEstagio(projeto);
  const percentual = projeto.metaHoras > 0 ? progresso(projeto) : Math.min(100,projeto.tempoTotal/36000*100);
  return {estagio, proximo, percentual, referencia:projeto.metaHoras > 0 ? `da meta de ${projeto.metaHoras}h` : 'da referência de 10h, sem meta'};
}
function cartaoCanteiro(projeto) {
  const planta = plantaDoProjeto(projeto);
  const {estagio,percentual,referencia} = resumoCrescimento(projeto);
  const visitante = (crescimentosRecentes.get(projeto.id) || 0) > Date.now();
  return `<button class="garden-bed" data-garden-project="${escapar(projeto.id)}" aria-label="${escapar(planta.nome)} de ${escapar(projeto.nome)}: estágio ${estagio}, ${nomesEstagios[estagio-1]}. Ver crescimento">
    <span class="bed-illustration">${visualPlanta(planta,estagio,visitante)}</span>
    <span class="bed-species">${planta.nome}</span><strong>${escapar(projeto.nome)}</strong>
    <span class="bed-stage">${estagio}/5 · ${nomesEstagios[estagio-1]}</span>
    <span class="bed-dots" aria-hidden="true">${nomesEstagios.map((_,i) => `<i class="${i<estagio ? 'grown' : ''}"></i>`).join('')}</span>
    <span class="bed-time">${tempoAmigavel(projeto.tempoTotal)} de foco · ${Math.round(percentual)}% ${referencia}</span>
    ${projeto.concluido ? '<span class="bed-finished">✓ Projeto concluído</span>' : ''}
  </button>`;
}
function renderizarCultivo() {
  const projetos = [...dados.projetos].sort((a,b) => Number(a.concluido)-Number(b.concluido));
  $('#jardim-resumo').textContent = projetos.length ? `${projetos.length} ${projetos.length === 1 ? 'ideia criando raízes' : 'ideias criando raízes'}` : 'Seu primeiro canteiro espera por você';
  $('#jardim-canteiros').innerHTML = projetos.length ? projetos.map(cartaoCanteiro).join('') : `
    <div class="garden-empty">${visualPlanta(plantas[0],1)}<h3>Tudo começa com uma sementinha.</h3><p>Crie um projeto e escolha a planta que vai crescer com ele.</p><button class="primary" data-action="novo-projeto">＋ Plantar um projeto</button></div>`;
  if (jardimProjetoAberto && $('#planta-modal').open) renderizarDetalhesCultivo(jardimProjetoAberto);
}
function animarPlanta(elemento) {
  if (!elemento || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  elemento.classList.remove('plant-touched');
  // Reinicia só a animação curta, inclusive em toques repetidos.
  void elemento.offsetWidth;
  elemento.classList.add('plant-touched');
}
function renderizarDetalhesCultivo(id) {
  const projeto = dados.projetos.find(p => p.id === id);
  if (!projeto) { $('#planta-modal').close(); jardimProjetoAberto = null; return; }
  const planta = plantaDoProjeto(projeto);
  const {estagio,proximo,percentual,referencia} = resumoCrescimento(projeto);
  $('#planta-modal-title').textContent = planta.nome;
  $('#planta-modal-conteudo').innerHTML = `
    <button class="cultivation-preview rarity-${planta.raridade}" data-touch-plant aria-label="Tocar em ${planta.nome}">${visualPlanta(planta,estagio)}<span>Toque para dar um carinho</span></button>
    <p class="cultivation-project">Projeto: <strong>${escapar(projeto.nome)}</strong>${projeto.concluido ? ' · concluído' : ''}</p>
    <span class="rarity-badge rarity-${planta.raridade}">${nomesRaridade[planta.raridade]}</span>
    <dl class="cultivation-facts"><div><dt>Estágio atual</dt><dd>${estagio}/5 · ${nomesEstagios[estagio-1]}</dd></div><div><dt>Tempo dedicado</dt><dd>${tempoAmigavel(projeto.tempoTotal)}</dd></div><div><dt>Progresso</dt><dd>${Math.round(percentual)}% ${referencia}</dd></div></dl>
    <progress class="unlock-progress" value="${percentual}" max="100" aria-label="Progresso de crescimento"></progress>
    ${estagio<5 ? `<div class="next-growth"><h3>Próximo estágio: ${nomesEstagios[estagio]}</h3><p>Faltam ${tempoAmigavel(Math.ceil(proximo.restante/60)*60)} de foco.</p><small>${Math.floor(proximo.percentual)}% do caminho neste estágio</small></div>` : '<p class="next-growth">Sua planta chegou ao estágio completo. Todo o cuidado continua guardado aqui.</p>'}
    <button class="secondary wide" data-garden-open-project="${escapar(projeto.id)}">Abrir projeto ↗</button>`;
}
function abrirPlantaCultivada(id) {
  jardimProjetoAberto = id;
  renderizarDetalhesCultivo(id);
  if (!jardimProjetoAberto) return;
  $('#planta-modal').showModal();
  animarPlanta($('#planta-modal-conteudo .plant-visual'));
}
// O relógio do próprio dispositivo define o céu, sem APIs nem localização.
function obterPeriodoJardim(hora = new Date().getHours()) {
  if (hora >= 5 && hora < 12) return 'morning';
  if (hora >= 12 && hora < 17) return 'afternoon';
  if (hora >= 17 && hora < 19) return 'sunset';
  return 'night';
}
function atualizarHorarioJardim() {
  const ambiente = $('.garden-landscape');
  if (!ambiente) return;
  const periodos = ['morning', 'afternoon', 'sunset', 'night'];
  const periodo = periodos.includes(periodoTeste) ? periodoTeste : obterPeriodoJardim();
  periodos.forEach(nome => ambiente.classList.toggle(`garden-${nome}`, nome === periodo));
  return periodo;
}
function renderizarJardim() {
  atualizarHorarioJardim();
  renderizarCultivo();
  mudarVistaJardim(jardimVista);
  $('#colecao-contagem').textContent = `${dados.plantasDesbloqueadas.length} / ${plantas.length} plantas descobertas`;
  $('#jardim-colecao').innerHTML = Object.entries(raridades).map(([raridade,nome]) => `
    <section class="garden-group" aria-labelledby="raridade-${raridade}">
      <h2 id="raridade-${raridade}">${nome}</h2>
      <div class="garden-grid">${plantas.filter(p => p.raridade === raridade).map(planta => {
        const livre = dados.plantasDesbloqueadas.includes(planta.id);
        return `<button class="plant-card rarity-${raridade} ${livre ? '' : 'locked'}" data-plant="${planta.id}" aria-label="${escapar(planta.nome)} · ${livre ? 'desbloqueada' : 'bloqueada: '+escapar(planta.requisito.descricao)}">
          ${visualPlanta(planta)}<strong>${planta.nome}</strong><span class="rarity-badge">${nomesRaridade[raridade]}</span><small>${livre ? '✓ Descoberta' : '<span class="lock-icon" aria-hidden="true"></span> Como desbloquear'}</small>
        </button>`;
      }).join('')}</div>
    </section>`).join('');
}
function abrirDetalhesPlanta(id) {
  jardimProjetoAberto = null;
  const planta = plantas.find(p => p.id === id);
  if (!planta) return;
  const livre = dados.plantasDesbloqueadas.includes(id);
  const requisito = planta.requisito;
  const atual = requisito ? dados.estatisticas[requisito.metrica] : 1;
  const meta = requisito?.meta || 1;
  const formatar = valor => requisito?.metrica === 'tempoTotalDeFoco' ? tempoAmigavel(valor) : String(valor);
  $('#planta-modal-title').textContent = planta.nome;
  $('#planta-modal-conteudo').innerHTML = `
    <div class="plant-preview rarity-${planta.raridade}">${visualPlanta(planta)}<span class="rarity-badge">${nomesRaridade[planta.raridade]}</span></div>
    <p class="meta">Prévia da espécie completa. O estágio cultivado depende do projeto.</p>
    <h3>${livre ? 'Pronta para cultivar' : 'Como desbloquear'}</h3>
    <p>${requisito?.descricao || 'Disponível desde o começo para acompanhar seus projetos.'}</p>
    ${requisito ? `<p class="meta">Progresso: ${formatar(atual)} / ${formatar(meta)}</p><progress class="unlock-progress" value="${Math.min(atual,meta)}" max="${meta}" aria-label="Progresso para desbloquear ${planta.nome}"></progress>` : ''}
    <p class="meta">${livre ? 'Escolha esta planta ao criar ou editar um projeto. Suas conquistas são permanentes.' : 'Continue no seu ritmo. A planta será liberada automaticamente ao atingir o objetivo.'}</p>
    <ol class="plant-stages">${nomesEstagios.map((nome,i) => `<li>${visualPlanta(planta,i+1)}<span>${i+1}. ${nome}</span></li>`).join('')}</ol>`;
  $('#planta-modal').showModal();
  animarPlanta($('#planta-modal-conteudo .plant-preview .plant-visual'));
}
function painelPlanta(projeto) {
  const planta = plantaDoProjeto(projeto);
  const estagio = calcularEstagioPlanta(projeto);
  const proximo = progressoProximoEstagio(projeto);
  const crescendo = (crescimentosRecentes.get(projeto.id) || 0) > Date.now();
  return `<div class="card cultivated-plant rarity-${planta.raridade}">
    <div class="cultivated-heading">${visualPlanta(planta,estagio,crescendo)}<div><span class="rarity-badge">${nomesRaridade[planta.raridade]}</span><h2>${planta.nome}</h2><p>Estágio ${estagio} de 5 · ${nomesEstagios[estagio-1]}</p></div></div>
    <progress class="unlock-progress" value="${proximo.percentual}" max="100" aria-label="Progresso para o próximo estágio"></progress>
    <p class="meta">${estagio === 5 ? 'Sua planta está completa. Continue cultivando suas ideias!'
      : `Próximo estágio: faltam ${tempoAmigavel(Math.ceil(proximo.restante/60)*60)} de foco.`}</p>
    <p class="meta">${projeto.metaHoras ? 'O crescimento acompanha a meta de horas do projeto.' : 'Sem meta: novos estágios aos 30min, 2h, 5h e 10h de foco.'} Trocar a espécie preserva seu tempo e estágio.</p>
    <button class="text-button" data-edit-project="${escapar(projeto.id)}">Trocar planta / editar projeto ↗</button>
  </div>`;
}
function barraProgresso(projeto) {
  const valor = progresso(projeto);
  return `<div class="progress" role="progressbar" aria-label="Meta de tempo" aria-valuenow="${Math.round(valor)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${valor}%"></span></div><div class="progress-caption"><span>${projeto.metaHoras ? `Meta de ${projeto.metaHoras}h` : 'Sem meta · cada minuto conta'}</span><span>${projeto.metaHoras ? Math.round(valor)+'%' : '✦'}</span></div>`;
}
function cartaoProjeto(p) {
  const planta = plantaDoProjeto(p);
  const estagio = calcularEstagioPlanta(p);
  return `<button class="project-card" style="--project-color:${corSegura(p.cor)}" data-project="${escapar(p.id)}"><div class="project-top">${visualPlanta(planta,estagio,(crescimentosRecentes.get(p.id) || 0)>Date.now())}<span>${p.concluido ? '✓ Concluído' : '↗'}</span></div><h3>${escapar(p.nome)}</h3><p class="project-plant-name">${planta.nome} · estágio ${estagio}</p><p>${tempoAmigavel(p.tempoTotal)}${p.metaHoras ? ` / ${tempoAmigavel(p.metaHoras*3600)}` : ' dedicados'}</p>${barraProgresso(p)}</button>`;
}
function mostrarTela(tela) {
  telaAtual = tela;
  document.querySelectorAll('.screen').forEach(secao => secao.hidden = secao.id !== tela);
  document.querySelectorAll('.bottom-nav button').forEach(botao => {
    if (botao.dataset.nav === (tela === 'detalhe' ? 'projetos' : tela)) botao.setAttribute('aria-current','page');
    else botao.removeAttribute('aria-current');
  });
  renderizarTudo(); window.scrollTo(0,0);
  const titulo = $(`#${tela} h1`);
  if (titulo) { titulo.tabIndex = -1; titulo.focus({preventScroll:true}); }
}
function renderizarProjetos() {
  const recentes = dados.projetos.filter(p => !p.concluido).sort((a,b) => (b.atualizadoEm || b.criadoEm).localeCompare(a.atualizadoEm || a.criadoEm)).slice(0,3);
  $('#recentes').innerHTML = recentes.map(cartaoProjeto).join('') || `<p class="empty">${dados.projetos.length ? 'Todos os projetos estão concluídos. Que tal cultivar uma nova ideia?' : 'Sua próxima ideia começa aqui.<br>Crie seu primeiro projeto ♡'}</p>`;
  $('#sem-pasta').innerHTML = dados.projetos.filter(p => !p.concluido && (!p.pastaId || !dados.pastas.some(f => f.id === p.pastaId))).map(cartaoProjeto).join('');
  const concluidos = dados.projetos.filter(p => p.concluido);
  $('#secao-concluidos').hidden = !concluidos.length;
  $('#projetos-concluidos').innerHTML = concluidos.map(cartaoProjeto).join('');
  renderizarPastas();
}
function renderizarPastas() {
  $('#pastas').innerHTML = dados.pastas.map(pasta => {
    const projetos = dados.projetos.filter(p => p.pastaId === pasta.id && !p.concluido);
    return `<div class="folder-group"><button class="text-button folder-rename" data-rename-folder="${escapar(pasta.id)}" aria-label="Editar nome da pasta ${escapar(pasta.nome)}">Editar nome</button><details class="folder" data-folder="${escapar(pasta.id)}" ${pasta.aberta ? 'open' : ''}><summary><span class="folder-dot" style="--project-color:${corSegura(pasta.cor)}"></span>${escapar(pasta.nome)}<span class="folder-count">${projetos.length} projeto(s)</span></summary><div class="project-grid">${projetos.map(cartaoProjeto).join('') || '<p class="empty">Ao criar um projeto, escolha esta pasta.</p>'}</div></details></div>`;
  }).join('');
  document.querySelectorAll('[data-folder]').forEach(elemento => elemento.addEventListener('toggle', () => {
    const pasta = dados.pastas.find(p => p.id === elemento.dataset.folder);
    if (pasta && pasta.aberta !== elemento.open) { pasta.aberta = elemento.open; salvarDados(); }
  }));
}
function renderizarEstatisticas() {
  const hoje = dados.sessoes.filter(s => s.dia === diaLocal());
  const tarefas = dados.projetos.flatMap(p => p.tarefas).filter(t => t.concluida).length;
  $('#estatisticas').innerHTML = `<div class="stat"><strong>${tempoAmigavel(hoje.reduce((s,x) => s+x.segundos,0))}</strong><span>foco hoje</span></div><div class="stat"><strong>${hoje.length}</strong><span>pomodoros hoje</span></div><div class="stat"><strong>${tarefas}</strong><span>tarefas feitas</span></div>`;
  const totais = dados.estatisticas;
  $('#resumo-perfil').textContent = `${dados.projetos.length} projetos · ${totais.pomodorosConcluidos || 0} sessões · ${tempoAmigavel(totais.tempoTotalDeFoco || 0)} de dedicação · ${totais.tarefasConcluidas || 0} tarefas conquistadas · ${totais.projetosConcluidos || 0} projetos concluídos`;
}
function linhasItens(itens, tipo, id) {
  return itens.map(item => `<div class="task-row"><label><input type="checkbox" data-check="${tipo}" data-owner="${escapar(id)}" data-item="${escapar(item.id)}" ${item.concluida ? 'checked' : ''}><span class="${item.concluida ? 'done' : ''}">${escapar(item.texto)}</span></label><button class="delete" data-delete-item="${tipo}" data-owner="${escapar(id)}" data-item="${escapar(item.id)}" aria-label="Excluir ${escapar(item.texto)}">×</button></div>`).join('');
}
function formularioItem(tipo,id) {
  return `<form class="inline-form" data-add="${tipo}" data-owner="${escapar(id)}"><input name="texto" required maxlength="200" placeholder="${tipo === 'projeto' ? 'Adicionar tarefa…' : 'Adicionar item…'}" aria-label="${tipo === 'projeto' ? 'Nova tarefa' : 'Novo item'}"><button aria-label="Adicionar" type="submit">＋</button></form>`;
}
function renderizarDetalhe() {
  const p = dados.projetos.find(p => p.id === projetoAberto); if (!p) return;
  $('#detalhe').innerHTML = `<button class="text-button" data-nav="projetos">← Todos os projetos</button><div class="card detail-hero" style="--project-color:${corSegura(p.cor)}"><span class="eyebrow">SEU PROJETO</span><h1>${escapar(p.nome)}</h1><button class="text-button" data-edit-project="${escapar(p.id)}">Editar projeto</button><p>${escapar(p.descricao)}</p><div class="detail-time">${tempoAmigavel(p.tempoTotal)}</div><p class="meta">de tempo dedicado</p>${barraProgresso(p)}<p class="meta">Criado em ${new Date(p.criadoEm).toLocaleDateString('pt-BR')}</p><div class="actions"><button class="primary" data-focus-project="${escapar(p.id)}">Focar neste projeto ↗</button><button class="secondary" data-complete-project="${escapar(p.id)}">${p.concluido ? 'Reabrir projeto' : 'Concluir projeto'}</button></div>${p.concluido ? '<p class="meta">✓ Projeto concluído · sua planta e seu histórico estão preservados.</p>' : ''}</div>${painelPlanta(p)}<div class="card"><h2>Tarefas</h2>${linhasItens(p.tarefas,'projeto',p.id) || '<p class="empty">Qual é o primeiro pequeno passo?</p>'}${formularioItem('projeto',p.id)}</div>`;
}
function renderizarListas() {
  $('#listas').innerHTML = dados.listas.map(lista => `<article class="card list-card"><div class="section-heading"><h2 class="list-title">${escapar(lista.nome)}</h2><button class="text-button" data-rename-list="${escapar(lista.id)}" aria-label="Editar nome de ${escapar(lista.nome)}">Editar</button><button class="delete" data-delete-list="${escapar(lista.id)}" aria-label="Excluir lista ${escapar(lista.nome)}">×</button></div>${linhasItens(lista.itens,'lista',lista.id)}${formularioItem('lista',lista.id)}</article>`).join('') || '<p class="empty">Compras, estudos ou ideias soltas.<br>Crie uma lista e abra espaço na cabeça.</p>';
}
function renderizarTudo() { renderizarProjetos(); renderizarEstatisticas(); renderizarDetalhe(); renderizarListas(); renderizarFoco(); renderizarJardim(); }

// Um único modal serve aos formulários. Textos digitados são escapados ao renderizar.
function abrirModal(tipo, id) {
  const lista = dados.listas.find(l => l.id === id);
  const pasta = tipo === 'editar-pasta' ? dados.pastas.find(p => p.id === id) : null;
  const existente = tipo === 'editar-projeto' ? dados.projetos.find(p => p.id === id) : null;
  const projeto = tipo === 'novo-projeto' || tipo === 'editar-projeto';
  const titulos = {'novo-projeto':'Um novo projeto', 'editar-projeto':'Cuidar do projeto', 'nova-pasta':'Uma nova pasta', 'editar-pasta':'Editar nome da pasta', 'editar-lista':'Editar lista', 'nova-lista':'Uma nova lista'};
  $('#modal-title').textContent = titulos[tipo];
  $('#modal-fields').innerHTML = `<label>Nome<input name="nome" required maxlength="80" value="${escapar(existente?.nome || pasta?.nome || lista?.nome || '')}" placeholder="Dê um nome à sua ideia" autofocus></label>
    ${projeto ? `<label>Descrição <small>(opcional)</small><textarea name="descricao" maxlength="500" rows="3">${escapar(existente?.descricao || '')}</textarea></label>` : ''}
    ${projeto || tipo === 'nova-pasta' ? `<label>Cor<input name="cor" type="color" value="${corSegura(existente?.cor || cores[dados.projetos.length % cores.length])}" list="paleta"></label><datalist id="paleta">${cores.map(c => `<option value="${c}"></option>`).join('')}</datalist>` : ''}
    ${projeto ? `<label>Meta de horas <small>(opcional)</small><input name="meta" type="number" min="0.1" max="100000" step="0.1" value="${existente?.metaHoras || ''}" placeholder="Ex.: 10"></label>
      <label>Pasta<select name="pasta"><option value="">Sem pasta</option>${dados.pastas.map(p => `<option value="${escapar(p.id)}" ${existente?.pastaId === p.id ? 'selected' : ''}>${escapar(p.nome)}</option>`).join('')}</select></label>
      <label>Qual planta você quer cultivar?<select name="planta">${plantas.filter(p => dados.plantasDesbloqueadas.includes(p.id)).map(p => `<option value="${p.id}" ${existente?.plantaId === p.id ? 'selected' : ''}>${p.nome}</option>`).join('')}</select></label>
      <p class="meta">Trocar a planta mantém seu tempo e estágio. Alterar a meta recalcula o estágio. Descubra novas espécies no Jardim.</p>` : ''}`;
  $('#modal-submit').textContent = tipo.startsWith('editar') ? 'Salvar alterações' : projeto ? 'Criar projeto' : tipo === 'nova-pasta' ? 'Criar pasta' : 'Criar lista';
  acaoModal = {tipo,id}; $('#modal').showModal();
}
function camposProjeto(form) {
  const plantaId = form.get('planta');
  return {
    nome:form.get('nome').trim(), descricao:form.get('descricao').trim(),
    cor:corSegura(form.get('cor')), metaHoras:Number(form.get('meta')) || 0,
    pastaId:form.get('pasta'),
    plantaId:dados.plantasDesbloqueadas.includes(plantaId) ? plantaId : 'margarida'
  };
}
function criarProjeto(form) {
  dados.projetos.push({id:uid(), ...camposProjeto(form), tempoTotal:0, tarefas:[],
    criadoEm:new Date().toISOString(), concluido:false, estagioPlanta:1});
}
function editarProjeto(id, form) {
  const projeto = dados.projetos.find(p => p.id === id);
  if (!projeto) return;
  Object.assign(projeto, camposProjeto(form), {atualizadoEm:new Date().toISOString()});
  // Editar uma meta não é uma nova sessão: recalcula sem disparar prêmio de foco.
  projeto.estagioPlanta = calcularEstagioPlanta(projeto);
}
function alternarConclusaoProjeto(id) {
  const projeto = dados.projetos.find(p => p.id === id);
  if (!projeto) return;
  projeto.concluido = !projeto.concluido;
  projeto.concluidoEm = projeto.concluido ? new Date().toISOString() : null;
  salvarDados(); renderizarTudo();
  avisar(projeto.concluido ? 'Projeto concluído! Sua planta continua com você.' : 'Projeto reaberto. Vamos continuar cultivando!');
}
function criarPasta(form) { dados.pastas.push({id:uid(),nome:form.get('nome').trim(),cor:corSegura(form.get('cor')),aberta:true}); }
$('#modal-form').addEventListener('submit', evento => {
  evento.preventDefault(); const form = new FormData(evento.target);
  if (!form.get('nome').trim()) { evento.target.elements.nome.setCustomValidity('Digite um nome.'); evento.target.elements.nome.reportValidity(); return; }
  if (acaoModal.tipo === 'novo-projeto') criarProjeto(form);
  else if (acaoModal.tipo === 'editar-projeto') editarProjeto(acaoModal.id,form);
  else if (acaoModal.tipo === 'nova-pasta') criarPasta(form);
  else if (acaoModal.tipo === 'editar-pasta') {
    const pasta = dados.pastas.find(p => p.id === acaoModal.id);
    if (pasta) pasta.nome = form.get('nome').trim();
  }
  else if (acaoModal.tipo === 'editar-lista') dados.listas.find(l => l.id === acaoModal.id).nome = form.get('nome').trim();
  else dados.listas.push({id:uid(),nome:form.get('nome').trim(),itens:[]});
  salvarDados(); $('#modal').close(); renderizarTudo(); avisar(acaoModal.tipo.startsWith('editar') ? 'Alterações salvas!' : 'Tudo pronto! Sua ideia ganhou um lugar.');
});
$('#modal-form').addEventListener('input', evento => evento.target.setCustomValidity?.(''));
$('#fechar-modal').addEventListener('click', () => $('#modal').close());
$('#fechar-planta').addEventListener('click', () => $('#planta-modal').close());
$('#planta-modal').addEventListener('close', () => { jardimProjetoAberto = null; });
$('#fechar-conquista').addEventListener('click', dispensarConquista);
$('#ver-conquista').addEventListener('click', () => {
  if (conquistaAtual?.tipo === 'crescimento') {
    projetoAberto = conquistaAtual.projetoId;
    mostrarTela('detalhe');
  } else {
    mudarVistaJardim('colecao');
    mostrarTela('jardim');
  }
  dispensarConquista();
});
function itensDoDono(tipo,id) { return tipo === 'projeto' ? dados.projetos.find(p => p.id === id)?.tarefas : dados.listas.find(l => l.id === id)?.itens; }
function adicionarTarefa(tipo,id,texto) { itensDoDono(tipo,id).push({id:uid(),texto,concluida:false}); salvarDados(); }
document.addEventListener('submit', evento => {
  const form = evento.target.closest('[data-add]'); if (!form) return;
  evento.preventDefault(); const texto = form.elements.texto.value.trim(); if (!texto) return;
  adicionarTarefa(form.dataset.add,form.dataset.owner,texto);
  renderizarDetalhe(); renderizarListas();
  document.querySelector(`[data-add="${form.dataset.add}"][data-owner="${CSS.escape(form.dataset.owner)}"] input`)?.focus();
});
document.addEventListener('change', evento => {
  const el = evento.target;
  if (el.dataset.check) {
    const item = itensDoDono(el.dataset.check,el.dataset.owner).find(t => t.id === el.dataset.item);
    item.concluida = el.checked; salvarDados(); el.nextElementSibling.classList.toggle('done',el.checked); renderizarEstatisticas(); renderizarJardim();
  }
});
document.addEventListener('click', evento => {
  const b = evento.target.closest('button'); if (!b) return;
  if (b.dataset.nav) mostrarTela(b.dataset.nav);
  if (b.dataset.action) abrirModal(b.dataset.action);
  if (b.dataset.project) { projetoAberto = b.dataset.project; mostrarTela('detalhe'); }
  if (b.dataset.plant) abrirDetalhesPlanta(b.dataset.plant);
  if (b.dataset.gardenView) mudarVistaJardim(b.dataset.gardenView);
  if (b.dataset.gardenProject) abrirPlantaCultivada(b.dataset.gardenProject);
  if (b.hasAttribute('data-touch-plant')) animarPlanta(b.querySelector('.plant-visual'));
  if (b.dataset.gardenOpenProject) {
    projetoAberto = b.dataset.gardenOpenProject;
    $('#planta-modal').close();
    jardimProjetoAberto = null;
    mostrarTela('detalhe');
  }
  if (b.dataset.editProject) abrirModal('editar-projeto',b.dataset.editProject);
  if (b.dataset.completeProject) alternarConclusaoProjeto(b.dataset.completeProject);
  if (b.dataset.renameList) abrirModal('editar-lista',b.dataset.renameList);
  if (b.dataset.renameFolder) abrirModal('editar-pasta',b.dataset.renameFolder);
  if (b.dataset.deleteList && confirm('Excluir esta lista e todos os seus itens?')) { dados.listas = dados.listas.filter(l => l.id !== b.dataset.deleteList); salvarDados(); renderizarListas(); }
  if (b.dataset.deleteItem) { const itens = itensDoDono(b.dataset.deleteItem,b.dataset.owner); const indice = itens.findIndex(i => i.id === b.dataset.item); if (indice >= 0) itens.splice(indice,1); salvarDados(); renderizarDetalhe(); renderizarListas(); renderizarEstatisticas(); }
  if (b.dataset.focusProject) { if (!dados.pomodoro) { dados.configuracoes.projetoId = b.dataset.focusProject; salvarDados(); } else avisar('A sessão atual mantém seu projeto até terminar ou reiniciar.'); mostrarTela('foco'); }
  if (b.dataset.minutos && !dados.pomodoro) {
    $('#custom-label').hidden = b.dataset.minutos !== 'custom';
    if (b.dataset.minutos === 'custom') $('#custom-minutos').focus();
    else { dados.configuracoes.minutos = Number(b.dataset.minutos); salvarDados(); renderizarFoco(); }
  }
});

// O timer usa uma data de término, não uma contagem de intervalos: abas em segundo
// plano e recarregamentos não perdem minutos. Uma sessão só é creditada uma vez.
function segundosRestantes() {
  const p = dados.pomodoro;
  return p ? (p.status === 'rodando' ? Math.max(0,Math.ceil((p.terminaEm-Date.now())/1000)) : p.restante) : dados.configuracoes.minutos*60;
}
function iniciarPomodoro() {
  if (dados.pomodoro?.status === 'rodando') return;
  if (!dados.pomodoro) {
    if (!dados.projetos.some(p => p.id === dados.configuracoes.projetoId)) { avisar('Crie ou selecione um projeto para começar.'); return; }
    const segundos = dados.configuracoes.minutos*60;
    dados.pomodoro = {id:uid(),projetoId:dados.configuracoes.projetoId,duracao:segundos,restante:segundos,status:'pausado',terminaEm:null};
  }
  dados.pomodoro.status = 'rodando'; dados.pomodoro.terminaEm = Date.now()+dados.pomodoro.restante*1000;
  salvarDados(); renderizarFoco();
}
function pausarPomodoro() {
  if (dados.pomodoro?.status !== 'rodando') return;
  const restante = segundosRestantes(); if (!restante) { finalizarPomodoro(); return; }
  dados.pomodoro.restante = restante; dados.pomodoro.status = 'pausado'; salvarDados(); renderizarFoco();
}
function finalizarPomodoro() {
  const sessao = dados.pomodoro; if (!sessao) return;
  const projeto = dados.projetos.find(p => p.id === sessao.projetoId);
  if (projeto && !dados.sessoes.some(s => s.id === sessao.id)) {
    projeto.tempoTotal += sessao.duracao; projeto.atualizadoEm = new Date(sessao.terminaEm || Date.now()).toISOString();
    dados.sessoes.push({id:sessao.id,projetoId:projeto.id,segundos:sessao.duracao,dia:diaLocal(new Date(sessao.terminaEm || Date.now()))});
  }
  dados.pomodoro = null; celebrando = true; salvarDados(); renderizarTudo();
  avisar(`${tempoAmigavel(sessao.duracao)} dedicados a ${projeto?.nome || 'seu projeto'}! Muito bem!`);
  setTimeout(() => { celebrando = false; atualizarMascote(); },1600);
}
function renderizarFoco() {
  const sessao = dados.pomodoro;
  if (!sessao && !dados.projetos.some(p => p.id === dados.configuracoes.projetoId)) dados.configuracoes.projetoId = dados.projetos[0]?.id || '';
  $('#projeto-foco').innerHTML = dados.projetos.map(p => `<option value="${escapar(p.id)}">${escapar(p.nome)}</option>`).join('') || '<option value="">Crie seu primeiro projeto</option>';
  $('#projeto-foco').value = sessao?.projetoId || dados.configuracoes.projetoId;
  $('#projeto-foco').disabled = !!sessao;
  document.querySelectorAll('[data-minutos]').forEach(b => { b.disabled = !!sessao; b.classList.toggle('selected', b.dataset.minutos === String(dados.configuracoes.minutos) || (b.dataset.minutos === 'custom' && ![25,50].includes(dados.configuracoes.minutos))); });
  $('#custom-minutos').disabled = !!sessao;
  $('#custom-minutos').value = dados.configuracoes.minutos;
  if (![25,50].includes(dados.configuracoes.minutos)) $('#custom-label').hidden = false;
  $('#iniciar').disabled = sessao?.status === 'rodando' || !dados.projetos.length;
  $('#iniciar').textContent = sessao?.status === 'pausado' ? 'Continuar' : 'Iniciar';
  $('#pausar').disabled = sessao?.status !== 'rodando';
  $('#timer-status').textContent = sessao?.status === 'rodando' ? 'Você e sua joaninha, um passo de cada vez.' : sessao ? 'Uma pausa. Respire e volte quando quiser.' : 'Reserve um tempinho para o que importa.';
  atualizarRelogio(); atualizarMascote();
}
function atualizarRelogio() {
  const segundos = segundosRestantes();
  $('#timer').textContent = `${String(Math.floor(segundos/60)).padStart(2,'0')}:${String(segundos%60).padStart(2,'0')}`;
}
$('#iniciar').addEventListener('click',iniciarPomodoro);
$('#pausar').addEventListener('click',pausarPomodoro);
$('#reiniciar').addEventListener('click', () => { if (dados.pomodoro && !confirm('Reiniciar? O tempo desta sessão incompleta não será somado.')) return; dados.pomodoro = null; salvarDados(); renderizarFoco(); });
$('#projeto-foco').addEventListener('change',evento => { dados.configuracoes.projetoId = evento.target.value; salvarDados(); });
$('#custom-minutos').addEventListener('change',evento => { if (!evento.target.checkValidity() || !evento.target.value) { evento.target.reportValidity(); evento.target.value = dados.configuracoes.minutos; return; } dados.configuracoes.minutos = Number(evento.target.value); salvarDados(); renderizarFoco(); });
setInterval(() => { if (dados.pomodoro?.status === 'rodando' && segundosRestantes() <= 0) finalizarPomodoro(); else atualizarRelogio(); },250);
// Mantém abas abertas sincronizadas para evitar crédito duplicado de uma sessão.
window.addEventListener('storage',evento => { if (evento.key === CHAVE) { dados = carregarDados(); atualizarGamificacao(false); renderizarTudo(); } });
$('#exportar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(dados,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'bugtime-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});

// Adaptador visual: substitua esta função/cena por sprites quando houver desenhos.
function atualizarMascote() {
  const emFoco = telaAtual === 'foco' && (!!dados.pomodoro || celebrando);
  $('#joaninha').hidden = emFoco || $('#modal').open || $('#planta-modal').open;
  $('#mascote-foco').classList.toggle('working',dados.pomodoro?.status === 'rodando');
  $('#mascote-foco').classList.toggle('celebrating',celebrando);
  $('#mascote-foco').classList.toggle('resting',dados.pomodoro?.status === 'pausado');
}
const joaninha = $('#joaninha');
let x = 24, y = 180, destinoX = x, destinoY = y, proximoPasseio = 0;
function limitesJoaninha() {
  const app = $('.app').getBoundingClientRect();
  return {minX:Math.max(10,app.left+8),maxX:Math.max(10,Math.min(innerWidth-48,app.right-45)),maxY:Math.max(10,$('.bottom-nav').getBoundingClientRect().top-58)};
}
function sobreControle(px,py) {
  return [...document.querySelectorAll('button,input,select,textarea,summary')].some(el => { const r = el.getBoundingClientRect(); return r.width && r.height && px+32>r.left && px<r.right && py+40>r.top && py<r.bottom; });
}
function moverJoaninha() {
  atualizarMascote(); const limites = limitesJoaninha();
  x = Math.max(limites.minX,Math.min(limites.maxX,x)); y = Math.max(10,Math.min(limites.maxY,y));
  joaninha.style.left = `${x}px`; joaninha.style.top = `${y}px`;
  if (joaninha.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches || Date.now()<proximoPasseio) return;
  const dx = destinoX-x, dy = destinoY-y, distancia = Math.hypot(dx,dy);
  if (distancia<4 || destinoY>limites.maxY || destinoX>limites.maxX || destinoX<limites.minX) {
    destinoX = Math.max(limites.minX,Math.min(limites.maxX,x+(Math.random()-.5)*130));
    destinoY = Math.max(10,Math.min(limites.maxY,y+(Math.random()-.5)*100));
    if (sobreControle(destinoX,destinoY)) { destinoX = limites.minX; }
    proximoPasseio = Date.now()+1500+Math.random()*4000; return;
  }
  const passo = 2+Math.random()*2;
  const nx = x+dx/distancia*passo, ny = y+dy/distancia*passo;
  if (sobreControle(nx,ny)) { destinoX=x; destinoY=y; return; }
  x=nx; y=ny; joaninha.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI+90}deg)`;
}
function piscarJoaninha() { joaninha.classList.add('piscando'); setTimeout(() => joaninha.classList.remove('piscando'),120); setTimeout(piscarJoaninha,2500+Math.random()*5000); }
setInterval(moverJoaninha,85); setTimeout(piscarJoaninha,2000);
// Encerra a visita também quando o usuário desativa animações no sistema.
setInterval(() => {
  document.querySelectorAll('[data-visit-until]').forEach(visitante => {
    if (Number(visitante.dataset.visitUntil) <= Date.now()) visitante.remove();
  });
},1000);
$('#data-hoje').textContent = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
// Preenche as ilustrações de apoio sem duplicar o desenho original do mascote.
document.querySelectorAll('[data-mascot]').forEach(local => local.innerHTML = visualJoaninha());
$('#garden-emblem').innerHTML = desenhoPlantaSVG(plantas.find(p => p.id === 'hortela'),5);
// Migra e salva uma vez na abertura; objetivos já atingidos também são reconhecidos.
salvarDados();
renderizarTudo();
// Atualiza mesmo se a página atravessar uma mudança de horário; ao voltar de uma
// aba suspensa, verifica imediatamente em vez de esperar pelo próximo minuto.
setInterval(atualizarHorarioJardim, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) atualizarHorarioJardim();
});
if (dados.pomodoro?.status === 'rodando' && segundosRestantes() <= 0) finalizarPomodoro();
if (avisoCarga) avisar(avisoCarga);


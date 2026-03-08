// ╔══════════════════════════════════════════════════════════════╗
// ║          RIFAS EL MENOR — app.js  v6 (Sénior Fix)           ║
// ╚══════════════════════════════════════════════════════════════╝

const PRECIO_BOLETO      = 5;      // Precio en Bs. por boleto
const MINIMO_BOLETOS     = 20;     // Mínimo de boletos a comprar
const TOTAL_BOLETOS      = 10000;  // 0000-9999 — no tocar
const BOLETOS_POR_PAGINA = 500;    // boletos por página — no tocar
const VIP_URL = 'https://chat.whatsapp.com/ChkSensk7jPHY5qS8e2VRM?mode=gi_t';

// ─────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────
let ticketStates    = new Map();
let availableList   = [];
let currentPage     = 1;
let totalPages      = Math.ceil(TOTAL_BOLETOS / BOLETOS_POR_PAGINA);
let selectedTickets = new Set();
let cdInterval      = null;
let cantidadAzar    = MINIMO_BOLETOS; // Controla la cantidad dinámica del botón

// ─────────────────────────────────────────
// INICIO
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('statPrecio').textContent = PRECIO_BOLETO;
  document.getElementById('statMin').textContent    = MINIMO_BOLETOS;
  document.getElementById('minLabel').textContent   = MINIMO_BOLETOS;

  configurarBotonesDinamicos();

  showToast('⏳ Cargando boletos...');
  await loadTickets();
  renderGrid();
  updateUI();
});

// ─────────────────────────────────────────
// LÓGICA DE BOTONES DINÁMICOS (+10 / -10)
// ─────────────────────────────────────────
function configurarBotonesDinamicos() {
  const btnRestar = document.getElementById('btnRestarAzar');
  const btnSumar = document.getElementById('btnSumarAzar');
  const displayDiv = document.getElementById('displayCantidadAzar');

  if (btnRestar && btnSumar && displayDiv) {
    displayDiv.textContent = cantidadAzar;
    
    btnRestar.onclick = () => {
      if (cantidadAzar > MINIMO_BOLETOS) {
        cantidadAzar -= 10;
        displayDiv.textContent = cantidadAzar;
      } else {
        showToast(`El mínimo permitido es ${MINIMO_BOLETOS} boletos.`);
      }
    };
    
    btnSumar.onclick = () => {
      cantidadAzar += 10;
      displayDiv.textContent = cantidadAzar;
    };
  }
}

// ─────────────────────────────────────────
// CARGA Y RENDERIZADO
// ─────────────────────────────────────────
async function loadTickets() {
  for (let i = 0; i < TOTAL_BOLETOS; i++) {
    let numStr = i.toString().padStart(4, '0');
    ticketStates.set(numStr, 'available');
    availableList.push(numStr);
  }
}

function renderGrid() {
  const grid = document.getElementById('ticketGrid');
  grid.innerHTML = '';
  
  const start = (currentPage - 1) * BOLETOS_POR_PAGINA;
  const end = start + BOLETOS_POR_PAGINA;
  
  for (let i = start; i < end && i < TOTAL_BOLETOS; i++) {
    let numStr = i.toString().padStart(4, '0');
    
    let t = document.createElement('div');
    t.className = 'ticket ' + (selectedTickets.has(numStr) ? 'ticket-selected' : 'ticket-available');
    t.textContent = numStr;
    
    t.onclick = () => toggleTicket(numStr);
    grid.appendChild(t);
  }
  
  document.getElementById('pageIndicator').textContent = `${currentPage} / ${totalPages}`;
  document.getElementById('btnPrev').disabled = (currentPage === 1);
  document.getElementById('btnNext').disabled = (currentPage === totalPages);
}

function toggleTicket(numStr) {
  if (selectedTickets.has(numStr)) {
    selectedTickets.delete(numStr);
  } else {
    selectedTickets.add(numStr);
  }
  renderGrid();
  updateUI();
}

function changePage(dir) {
  let newPage = currentPage + dir;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderGrid();
  }
}

function jumpToPage() {
  let input = parseInt(document.getElementById('pageJump').value);
  if (!isNaN(input) && input >= 1 && input <= totalPages) {
    currentPage = input;
    renderGrid();
  } else {
    showToast(`Ingresa una página entre 1 y ${totalPages}`);
  }
}

// ─────────────────────────────────────────
// SELECCIÓN AL AZAR EXACTA 
// ─────────────────────────────────────────
function randomSelect() {
  selectedTickets.clear();
  let disp = availableList.filter(t => ticketStates.get(t) === 'available');
  
  if (disp.length < cantidadAzar) {
    showToast(`❌ Solo quedan ${disp.length} boletos disponibles.`);
    return;
  }
  
  for (let i = disp.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [disp[i], disp[j]] = [disp[j], disp[i]];
  }
  
  for (let i = 0; i < cantidadAzar; i++) {
    selectedTickets.add(disp[i]);
  }
  
  showToast(`🎲 ¡${cantidadAzar} boletos seleccionados al azar!`);
  
  let primerBoleto = Array.from(selectedTickets).sort()[0];
  if (primerBoleto) {
    let indice = parseInt(primerBoleto);
    currentPage = Math.floor(indice / BOLETOS_POR_PAGINA) + 1;
  }
  
  renderGrid();
  updateUI();
}

function clearSelection() {
  selectedTickets.clear();
  renderGrid();
  updateUI();
}

function updateUI() {
  let count = selectedTickets.size;
  document.getElementById('countLabel').innerHTML = `${count} / <span id="minLabel">${MINIMO_BOLETOS}</span>`;
  
  let total = count * PRECIO_BOLETO;
  document.getElementById('totalPrice').textContent = `Bs. ${total}`;
  
  let pct = Math.min((count / MINIMO_BOLETOS) * 100, 100);
  document.getElementById('progressBar').style.width = pct + '%';
  
  let btnPagar = document.getElementById('btnPagar');
  if (count >= MINIMO_BOLETOS) {
    btnPagar.disabled = false;
    btnPagar.style.opacity = '1';
  } else {
    btnPagar.disabled = true;
    btnPagar.style.opacity = '0.4';
  }
}

// ─────────────────────────────────────────
// MODALES Y PAGO
// ─────────────────────────────────────────
function openPayModal() {
  if (selectedTickets.size < MINIMO_BOLETOS) return;
  
  const termsAgreed = localStorage.getItem('termsAgreed');
  if (!termsAgreed) {
    document.getElementById('termsModal').style.display = 'flex';
    return;
  }
  
  let container = document.getElementById('selectedChips');
  container.innerHTML = '';
  Array.from(selectedTickets).sort().forEach(num => {
    let chip = document.createElement('div');
    chip.className = 'selected-chip';
    chip.textContent = num;
    container.appendChild(chip);
  });
  
  let total = selectedTickets.size * PRECIO_BOLETO;
  document.getElementById('modalTotal').textContent = `Bs. ${total}`;
  
  document.getElementById('payModal').style.display = 'flex';
}

function closePayModal() {
  document.getElementById('payModal').style.display = 'none';
}

function acceptTerms() {
  localStorage.setItem('termsAgreed', 'true');
  document.getElementById('termsModal').style.display = 'none';
  openPayModal();
}

function copyText(text, msg) {
  navigator.clipboard.writeText(text).then(() => showToast(msg));
}

function previewCapture(input) {
  let file = input.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = e => {
      let img = document.getElementById('capturePreview');
      img.src = e.target.result;
      img.classList.remove('hidden');
      document.getElementById('uploadText').textContent = "Capture cargado ✅";
      document.getElementById('uploadIcon').textContent = "🖼️";
    };
    reader.readAsDataURL(file);
  }
}

// ─────────────────────────────────────────
// CONEXIÓN CON SUPABASE AL GUARDAR (ARREGLADO)
// ─────────────────────────────────────────
async function submitOrder(e) {
  e.preventDefault();
  
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '⏳ Procesando...';
  
  const nombre = document.getElementById('fNombre').value;
  const cedula = document.getElementById('fCedula').value;
  const whatsapp = document.getElementById('fWhatsapp').value;
  const totalPagado = selectedTickets.size * PRECIO_BOLETO;
  const referencia = document.getElementById('fRef').value;
  const boletosArray = Array.from(selectedTickets).sort();
  const boletosStr = boletosArray.join(', ');
  const fileInput = document.getElementById('fCapture');

  try {
    // 1. Subir Capture a Supabase Storage
    let captureUrl = null;
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop();
      const fileName = `pagos/${Date.now()}_${cedula}.${ext}`;

      const { error: uploadError } = await db.storage
        .from('captures')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = db.storage.from('captures').getPublicUrl(fileName);
      captureUrl = publicUrlData.publicUrl;
    }

    // 2. Guardar Pedido en tabla 'pedidos'
    const { data: pedidoData, error: pedidoError } = await db
      .from('pedidos')
      .insert([{
        nombre: nombre,
        cedula: cedula,
        whatsapp: whatsapp,
        ref_comprobante: referencia,
        numeros: boletosArray.map(Number),
        total: totalPagado,
        capture_url: captureUrl,
        estado: 'pendiente'
      }])
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // 3. Reservar Tickets en tabla 'tickets'
    const ticketsToInsert = boletosArray.map(num => ({
      numero: parseInt(num, 10),
      estado: 'pendiente',
      pedido_id: pedidoData.id
    }));

    const { error: ticketsError } = await db.from('tickets').insert(ticketsToInsert);
    if (ticketsError) throw ticketsError;

    // 4. Notificar a Telegram
    await notificarTelegram(nombre, boletosStr, totalPagado, referencia);
    
    // 5. Mostrar Éxito
    document.getElementById('payModal').style.display = 'none';
    document.getElementById('successSummary').innerHTML = `
      <div class="text-white">👤 ${nombre}</div>
      <div class="text-white">🎟️ ${selectedTickets.size} boletos</div>
      <div class="text-white">💰 Pagado: Bs. ${totalPagado}</div>
      <div class="text-white text-xs mt-1 text-gray-400">Ref: ${referencia}</div>
    `;
    document.getElementById('successModal').style.display = 'flex';
    startVIPCountdown();
    
  } catch(error) {
    console.error(error);
    showToast('❌ Error al enviar. Verifica tu conexión e intenta de nuevo.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Confirmar y Reservar';
  }
}

// ─────────────────────────────────────────
// NOTIFICACIONES TELEGRAM
// ─────────────────────────────────────────
async function notificarTelegram(nombre, boletos, total, ref) {
  const BOT_TOKEN = '8666595624:AAGoWxS-9QGxtB1p4opumRqWoyB4n-Su4tI'; 
  const CHAT_ID = '5873749605'; 
  
  const mensaje = `🚨 ¡NUEVA RESERVA! 🚨\n\n👤 Cliente: ${nombre}\n🎟️ Boletos: ${boletos}\n💰 Pago: Bs. ${total}\n🔢 Referencia: ${ref}`;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje })
  });
}

// ─────────────────────────────────────────
// BUSCADOR Y VERIFICACIÓN
// ─────────────────────────────────────────
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length === 4) {
      let tickets = document.querySelectorAll('.ticket');
      tickets.forEach(tk => {
        if (tk.textContent === val) {
          tk.style.boxShadow = '0 0 15px #0EA5E9';
          setTimeout(() => tk.style.boxShadow = '', 2000);
        }
      });
    }
  });
}

function openVerifyModal() { document.getElementById('verifyModal').style.display = 'flex'; }
function closeVerifyModal() { document.getElementById('verifyModal').style.display = 'none'; document.getElementById('verifyResults').innerHTML=''; }

function buscarMisBoletos() {
    const input = document.getElementById('verifyCedula').value;
    const res = document.getElementById('verifyResults');
    if(input.length < 5) {
        showToast('Ingresa una cédula válida');
        return;
    }
    res.innerHTML = `
      <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);
        border-radius:14px;padding:16px;text-align:center;color:#FCA5A5;font-weight:700">
        ❌ No se encontraron reservas confirmadas.
      </div>`;
}

// ─────────────────────────────────────────
// TOAST Y EXTRAS VIP
// ─────────────────────────────────────────
function showToast(msg, duration = 2000) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function startVIPCountdown() {
  let c = 3;
  document.getElementById('cdNum').textContent = c;
  document.getElementById('cdRing').style.setProperty('--pct', '100%');
  
  if (cdInterval) clearInterval(cdInterval);
  cdInterval = setInterval(() => {
    c--;
    document.getElementById('cdNum').textContent = c;
    document.getElementById('cdRing').style.setProperty('--pct', (c/3)*100 + '%');
    if (c <= 0) {
      clearInterval(cdInterval);
      goVIP();
    }
  }, 1000);
}

function goVIP() {
  window.location.href = VIP_URL;
}

function closeSuccessModal() {
  document.getElementById('successModal').style.display = 'none';
  window.location.reload(); 
}

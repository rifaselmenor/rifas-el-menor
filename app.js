// ╔══════════════════════════════════════════════════════════════╗
// ║      RIFAS EL MENOR — app.js (PAGA - 20 MIN - SÉNIOR)        ║
// ╚══════════════════════════════════════════════════════════════╝

const PRECIO_BOLETO      = 5;      // Precio en Bs. por boleto
const MINIMO_BOLETOS     = 20;     // Mínimo de boletos a comprar
const TOTAL_BOLETOS      = 10000;  // 0000-9999
const BOLETOS_POR_PAGINA = 500;
const VIP_URL = 'https://chat.whatsapp.com/ChkSensk7jPHY5qS8e2VRM?mode=gi_t';

let ticketStates    = new Map();
let availableList   = [];
let currentPage     = 1;
let totalPages      = Math.ceil(TOTAL_BOLETOS / BOLETOS_POR_PAGINA);
let selectedTickets = new Set();
let cdInterval      = null;
let cantidadAzar    = MINIMO_BOLETOS;

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

async function loadTickets() {
  for (let i = 0; i < TOTAL_BOLETOS; i++) {
    let numStr = i.toString().padStart(4, '0');
    ticketStates.set(numStr, 'available');
    availableList.push(numStr);
  }
  try {
    let desde = 0, hasta = 999, hayMasData = true;
    while (hayMasData) {
      const { data, error } = await db.from('tickets').select('numero,estado').in('estado', ['pendiente','vendido']).range(desde, hasta);
      if (error) throw error;
      if (data && data.length > 0) {
        data.forEach(t => {
          let numStr = t.numero.toString().padStart(4, '0');
          ticketStates.set(numStr, t.estado);
        });
        if (data.length < 1000) hayMasData = false;
        else { desde += 1000; hasta += 1000; }
      } else hayMasData = false;
    }
  } catch(e) { console.error("Error cargando tickets", e); }
}

function renderGrid() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const start = (currentPage - 1) * BOLETOS_POR_PAGINA;
  const end = start + BOLETOS_POR_PAGINA;

  for (let i = start; i < end && i < TOTAL_BOLETOS; i++) {
    let numStr = i.toString().padStart(4, '0');
    let t = document.createElement('div');
    let estado = ticketStates.get(numStr);

    if (estado === 'pendiente' || estado === 'vendido') {
       t.className = 'ticket';
       t.textContent = numStr;
       t.style.opacity = '0.3';
       t.style.cursor = 'not-allowed';
       t.style.background = estado === 'vendido' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)';
    } else {
       t.className = 'ticket ' + (selectedTickets.has(numStr) ? 'ticket-selected' : 'ticket-available');
       t.textContent = numStr;
       t.onclick = () => toggleTicket(numStr);
    }
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
  let label = document.getElementById('countLabel');
  if(label) label.innerHTML = `${count} / <span id="minLabel">${MINIMO_BOLETOS}</span>`;

  let total = count * PRECIO_BOLETO;
  let pLabel = document.getElementById('totalPrice');
  if(pLabel) pLabel.textContent = `Bs. ${total}`;

  let pct = Math.min((count / MINIMO_BOLETOS) * 100, 100);
  let pBar = document.getElementById('progressBar');
  if(pBar) pBar.style.width = pct + '%';

  let btnPagar = document.getElementById('btnPagar');
  if(btnPagar) {
      if (count >= MINIMO_BOLETOS) {
        btnPagar.disabled = false;
        btnPagar.style.opacity = '1';
      } else {
        btnPagar.disabled = true;
        btnPagar.style.opacity = '0.4';
      }
  }
}

function openPayModal() {
  if (selectedTickets.size < MINIMO_BOLETOS) return;

  const termsAgreed = localStorage.getItem('termsAgreed');
  if (!termsAgreed) {
    document.getElementById('termsModal').style.display = 'flex';
    return;
  }

  let container = document.getElementById('selectedChips');
  if(container) {
      container.innerHTML = '';
      Array.from(selectedTickets).sort().forEach(num => {
        let chip = document.createElement('div');
        chip.className = 'selected-chip';
        chip.textContent = num;
        container.appendChild(chip);
      });
  }

  let total = selectedTickets.size * PRECIO_BOLETO;
  let mTotal = document.getElementById('modalTotal');
  if(mTotal) mTotal.textContent = `Bs. ${total}`;

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
      if(img) {
        img.src = e.target.result;
        img.classList.remove('hidden');
      }
      let upText = document.getElementById('uploadText');
      if(upText) upText.textContent = "Capture cargado ✅";
      let upIcon = document.getElementById('uploadIcon');
      if(upIcon) upIcon.textContent = "🖼️";
    };
    reader.readAsDataURL(file);
  }
}

// ─────────────────────────────────────────
// CONEXIÓN CON SUPABASE AL GUARDAR (DIAGNÓSTICO SÉNIOR)
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
  
  const refEl = document.getElementById('fRef');
  const referencia = refEl ? refEl.value : '000000';
  
  const boletosArray = Array.from(selectedTickets).sort();
  const boletosStr = boletosArray.join(', ');
  
  const fileInput = document.getElementById('fCapture');
  const file = fileInput ? fileInput.files[0] : null;

  try {
    // 1. Subir Capture a Supabase Storage
    let captureUrl = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const fileName = `pagos/${Date.now()}_${cedula}.${ext}`;

      const { error: uploadError } = await db.storage
        .from('captures')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        alert("🚨 ERROR EN FOTO: " + uploadError.message);
        throw uploadError;
      }

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
        numeros: boletosArray.map(Number), // Lo guardamos como números para el admin
        total: totalPagado,
        capture_url: captureUrl,
        estado: 'pendiente'
      }])
      .select()
      .single();

    if (pedidoError) {
      alert("🚨 ERROR EN BASE DE DATOS (Pedidos): " + pedidoError.message + "\nDetalles: " + pedidoError.details);
      throw pedidoError;
    }

    // 3. Reservar Tickets en tabla 'tickets'
    const ticketsToInsert = boletosArray.map(num => ({
      numero: parseInt(num, 10),
      estado: 'pendiente',
      pedido_id: pedidoData.id
    }));

    const { error: ticketsError } = await db.from('tickets').insert(ticketsToInsert);
    
    if (ticketsError) {
      alert("🚨 ERROR EN BASE DE DATOS (Tickets): " + ticketsError.message);
      throw ticketsError;
    }

    // 4. Notificar a Telegram (Aislado)
    try {
      await notificarTelegram(nombre, boletosStr, totalPagado, referencia);
    } catch (telErr) {
      console.warn("Telegram falló, pero la DB está perfecta: ", telErr);
    }

    // 5. Mostrar Éxito
    document.getElementById('payModal').style.display = 'none';
    
    const summary = document.getElementById('successSummary');
    if(summary) {
        summary.innerHTML = `
          <div class="text-white">👤 ${nombre}</div>
          <div class="text-white">🎟️ ${selectedTickets.size} boletos</div>
          <div class="text-white">💰 Pagado: Bs. ${totalPagado}</div>
          <div class="text-white text-xs mt-1 text-gray-400">Ref: ${referencia}</div>
        `;
    }
    
    const successModal = document.getElementById('successModal');
    if(successModal) successModal.style.display = 'flex';
    
    startVIPCountdown();

  } catch(error) {
    console.error(error);
    showToast('❌ Compra detenida. Revisa la ventana de alerta.');
    btn.disabled = false;
    btn.innerHTML = '🚀 Confirmar y Reservar';
  }
}

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

function showToast(msg, duration = 2000) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function startVIPCountdown() {
  let c = 3;
  let cdNum = document.getElementById('cdNum');
  if(cdNum) cdNum.textContent = c;
  
  let cdRing = document.getElementById('cdRing');
  if(cdRing) cdRing.style.setProperty('--pct', '100%');
  
  if (cdInterval) clearInterval(cdInterval);
  cdInterval = setInterval(() => {
    c--;
    if(cdNum) cdNum.textContent = c;
    if(cdRing) cdRing.style.setProperty('--pct', (c/3)*100 + '%');
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

// ╔══════════════════════════════════════════════════════════════╗
// ║      RIFAS EL MENOR — app.js (PAGA - 20 MIN - SÉNIOR)        ║
// ╚══════════════════════════════════════════════════════════════╝

// 1. Cambiamos de 'const' a 'let' para que los valores puedan actualizarse
let PRECIO_BOLETO      = 5;      
let MINIMO_BOLETOS     = 20;     
const TOTAL_BOLETOS      = 10000;  
const BOLETOS_POR_PAGINA = 500;
const VIP_URL = 'https://chat.whatsapp.com/ChkSensk7jPHY5qS8e2VRM?mode=gi_t';

let ticketStates    = new Map();
let availableList   = [];
let currentPage     = 1;
let totalPages      = 1; // Se calculará dinámicamente
let selectedTickets = new Set();
let cdInterval      = null;
let cantidadAzar    = MINIMO_BOLETOS;

document.addEventListener('DOMContentLoaded', async () => {

  // 2. VAMOS A SUPABASE A LEER EL ESTADO Y LOS PRECIOS NUEVOS
  try {
    // select('*') para traer tanto el botón de pánico como los precios
    const { data: configData } = await db.from('landing_config').select('*').eq('id', 'main').single();
    
    if (configData) {
      
      // 🛡️ ESCUDO ANTI-FRAUDE (BOTÓN DE PÁNICO)
      if (configData.ventas_activas === false) {
        const mainSection = document.getElementById('mainTicketSection');
        if (mainSection) {
          mainSection.innerHTML = `
            <div style="text-align:center;padding:50px 20px;background:rgba(239,68,68,0.15);border:2px dashed #ef4444;border-radius:16px;margin:20px 0;box-shadow:0 0 30px rgba(239,68,68,0.2);">
              <div class="animate-pulse" style="font-size:60px; margin-bottom:15px;">🛑</div>
              <h2 style="color:#ef4444;font-size:28px;font-weight:900;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Plataforma Cerrada</h2>
              <p style="color:#fca5a5;font-size:15px;font-weight:700;">Estamos esperando los resultados de Súper Gana.<br>¡Mucha suerte a todos los participantes!</p>
            </div>
          `;
        }
        const buyButtons = document.querySelectorAll('button[onclick="comenzarCompra()"]');
        buyButtons.forEach(btn => {
          btn.textContent = '🛑 PLATAFORMA CERRADA';
          btn.style.background = 'linear-gradient(135deg, #7f1d1d, #ef4444)';
          btn.onclick = null; 
          btn.style.pointerEvents = 'none'; 
        });
        return; // Cortamos la ejecución aquí
      }

      // 💰 ACTUALIZAMOS LOS VALORES SEGÚN EL ADMIN
      if (configData.precio_boleto) {
        PRECIO_BOLETO = parseFloat(configData.precio_boleto);
      }
      if (configData.minimo_boletos) {
        MINIMO_BOLETOS = parseInt(configData.minimo_boletos, 10);
        cantidadAzar = MINIMO_BOLETOS; // Emparejamos la selección al azar
      }
    }
  } catch (e) {
    console.error('Error leyendo configuración de Supabase', e);
  }

  // 3. AHORA SÍ: PINTAMOS LOS NÚMEROS (ACTUALIZADOS) EN LA PANTALLA
  if (document.getElementById('statPrecio')) document.getElementById('statPrecio').textContent = PRECIO_BOLETO;
  if (document.getElementById('statMin')) document.getElementById('statMin').textContent = MINIMO_BOLETOS;
  if (document.getElementById('minLabel')) document.getElementById('minLabel').textContent = MINIMO_BOLETOS;

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
  // Inicializamos todos como disponibles primero
  for (let i = 0; i < TOTAL_BOLETOS; i++) {
    let numStr = i.toString().padStart(4, '0');
    ticketStates.set(numStr, 'available');
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
    
    // Construir la availableList EXCLUYENDO los no-disponibles
    availableList = [];
    for (let i = 0; i < TOTAL_BOLETOS; i++) {
      let numStr = i.toString().padStart(4, '0');
      let estado = ticketStates.get(numStr);
      // Solo metemos a la lista los que estén 100% libres
      if (estado !== 'pendiente' && estado !== 'vendido') {
         availableList.push(numStr);
      }
    }
    
    // Recalcular páginas en base a lo que quedó
    totalPages = Math.max(1, Math.ceil(availableList.length / BOLETOS_POR_PAGINA));
    if(currentPage > totalPages) currentPage = 1;
    
    updateSalesBar();
  } catch(e) { console.error("Error cargando tickets", e); }
}

function updateSalesBar() {
  let vendidosOPendientes = TOTAL_BOLETOS - availableList.length;
  
  const pct = Math.min(Math.round((vendidosOPendientes / TOTAL_BOLETOS) * 100), 100);
  
  const fillEl = document.getElementById('salesFill');
  const pctEl  = document.getElementById('salesPct');
  const soldEl = document.getElementById('salesSold');
  const remEl  = document.getElementById('salesRem');
  
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (soldEl) soldEl.textContent = vendidosOPendientes;
  if (remEl) remEl.textContent = availableList.length;
  
  const disp = document.getElementById('statDisp');
  if (disp) disp.textContent = availableList.length;
}

function renderGrid() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const start = (currentPage - 1) * BOLETOS_POR_PAGINA;
  const end = start + BOLETOS_POR_PAGINA;

  // Renderizamos SOLO los elementos de la availableList
  for (let i = start; i < end && i < availableList.length; i++) {
    let numStr = availableList[i];
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

function randomSelect() {
  selectedTickets.clear();

  if (availableList.length < cantidadAzar) {
    showToast(`❌ Solo quedan ${availableList.length} boletos disponibles.`);
    return;
  }

  let pool = [...availableList];
  
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let i = 0; i < cantidadAzar; i++) {
    selectedTickets.add(pool[i]);
  }

  showToast(`🎲 ¡${cantidadAzar} boletos seleccionados al azar!`);

  let primerBoleto = Array.from(selectedTickets).sort()[0];
  if (primerBoleto) {
    let indice = availableList.indexOf(primerBoleto);
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

    if (pedidoError) {
      alert("🚨 ERROR EN BASE DE DATOS (Pedidos): " + pedidoError.message + "\nDetalles: " + pedidoError.details);
      throw pedidoError;
    }

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

    // Actualizamos visualmente quitando los tickets de la lista disponible
    boletosArray.forEach(n => {
       ticketStates.set(n, 'pendiente');
       let idx = availableList.indexOf(n);
       if(idx !== -1) availableList.splice(idx, 1);
    });
    
    totalPages = Math.max(1, Math.ceil(availableList.length / BOLETOS_POR_PAGINA));
    if(currentPage > totalPages) currentPage = 1;
    
    updateSalesBar();
    renderGrid();

    try {
      await notificarTelegram(nombre, boletosStr, totalPagado, referencia);
    } catch (telErr) {}

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
      if(!availableList.includes(val)) {
         showToast('Ese número ya no está disponible');
         return;
      }
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

async function buscarMisBoletos() {
    const btn = document.getElementById('btnBuscarBoletos');
    const cedula = document.getElementById('verifyCedula').value.trim();
    const resultsDiv = document.getElementById('verifyResults');
    if(cedula.length < 5) { alert('Ingresa una cédula válida'); return; }
    
    btn.textContent = '⏳'; btn.disabled = true; resultsDiv.innerHTML = '';
    try {
      const { data, error } = await db.from('pedidos').select('id,nombre,cedula,numeros,estado').ilike('cedula', '%' + cedula.replace(/^[VEJvej]-?/,'') + '%');
      if (error) throw error;
      if (!data || data.length === 0) {
        resultsDiv.innerHTML = `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:14px;padding:16px;text-align:center;color:#FCA5A5;font-weight:700">❌ No se encontraron registros con esa cédula.</div>`;
      } else {
        let html = '';
        data.forEach(p => {
          let badge = '';
          if(p.estado === 'aprobado') badge = '<span style="background:rgba(34,197,94,.2);color:#86EFAC;padding:2px 6px;border-radius:6px;font-size:11px">✅ Aprobado</span>';
          else if (p.estado === 'pendiente') badge = '<span style="background:rgba(234,179,8,.2);color:#FDE68A;padding:2px 6px;border-radius:6px;font-size:11px">⏳ En Revisión</span>';
          else badge = '<span style="background:rgba(239,68,68,.2);color:#FCA5A5;padding:2px 6px;border-radius:6px;font-size:11px">❌ Rechazado</span>';
          
          let numsFormat = Array.isArray(p.numeros) ? p.numeros.join(', ') : p.numeros;
          html += `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;margin-bottom:8px;font-size:13px;">
                      <div class="flex justify-between mb-2"><strong>${p.nombre}</strong>${badge}</div>
                      <div class="text-gray-400 text-xs mb-1">Boletos: <span class="text-white">${numsFormat}</span></div>
                   </div>`;
        });
        resultsDiv.innerHTML = html;
      }
    } catch (err) {
      resultsDiv.innerHTML = '<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:14px;padding:16px;text-align:center;color:#FCA5A5;font-weight:700">❌ Error al consultar. Revisa tu conexión.</div>';
    } finally {
      btn.textContent = 'Buscar'; btn.disabled = false;
    }
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

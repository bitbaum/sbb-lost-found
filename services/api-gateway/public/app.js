const $ = (sel) => document.querySelector(sel);
const tripsEl = $('#trips');
const s1 = $('#step1'),
  s2 = $('#step2'),
  s3 = $('#step3'),
  s4 = $('#step4');
let selectedTrip = null;
let category = 'other';
let lastTicketId = null;
let socket = null;

async function loadTrips() {
  try {
    const res = await fetch('/me/recent-trips');
    const json = await res.json();
    if (!json.success) throw new Error('Failed trips');
    tripsEl.innerHTML = '';
    json.data.forEach((t) => {
      const el = document.createElement('div');
      el.className = 'trip';
      el.innerHTML = `<div><div class="route">${t.route}</div><div class="muted">${new Date(t.departureTime).toLocaleString()} — ${t.vehicleId}</div></div><div>Choose</div>`;
      el.onclick = () => {
        selectedTrip = t;
        $('#lossTime').value = new Date(t.arrivalTime).toISOString().slice(0, 16);
        $('#tripStatus').textContent = `Selected: ${t.route}`;
        s2.classList.remove('hidden');
        s2.scrollIntoView({ behavior: 'smooth' });
      };
      tripsEl.appendChild(el);
    });
  } catch (e) {
    tripsEl.innerHTML =
      '<div class="hint">No trips available in dev. Continue with manual details.</div>';
    s2.classList.remove('hidden');
  }
}

// Category chips
document.querySelectorAll('.chips button').forEach((b) => {
  b.addEventListener('click', () => {
    category = b.dataset.cat;
  });
});

// Submit flow
$('#submit').addEventListener('click', async () => {
  const jwt = $('#jwt').value.trim();
  if (!jwt) {
    $('#submitStatus').textContent = 'Paste a JWT (make jwt)';
    return;
  }

  const title = $('#title').value.trim() || 'Lost item';
  const description = $('#description').value.trim();
  const approximateLossTime = $('#lossTime').value
    ? new Date($('#lossTime').value).toISOString()
    : undefined;
  let images = [];
  const file = $('#photo').files?.[0];
  if (file) {
    // For prototype only: embed as data URL (no upload service yet)
    images = [await toDataURL(file)];
  }
  const body = {
    tripId: selectedTrip?.id,
    category,
    title,
    description,
    approximateLossTime,
    images,
  };
  $('#submitStatus').textContent = 'Submitting…';
  try {
    const res = await fetch('/reporting/api/lost-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json?.error?.message || 'Submit failed');
    $('#ticketId').textContent = json.data.id;
    lastTicketId = json.data.id;
    $('#result').textContent = JSON.stringify(json, null, 2);
    s3.classList.remove('hidden');
    s3.scrollIntoView({ behavior: 'smooth' });
    $('#submitStatus').textContent = 'Done';
    connectWS();
  } catch (e) {
    $('#submitStatus').textContent = 'Error: ' + e.message;
  }
});

async function toDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

loadTrips();

function connectWS() {
  try {
    if (!window.io) return;
    socket = window.io('http://localhost:3003');
    appendEvent('ws', 'Connected to notifications');
    socket.on('lost_item_status_updated', (evt) => {
      if (!lastTicketId || evt?.data?.lostItem?.id !== lastTicketId) return;
      appendEvent('status', 'Status updated: ' + evt?.data?.lostItem?.status);
    });
    socket.on('driver_notification', (evt) => {
      if (evt?.data?.lostItemId && lastTicketId && evt.data.lostItemId !== lastTicketId) return;
      appendEvent('driver', 'Driver notification: ' + (evt?.data?.message || ''));
    });
  } catch {}
}

function appendEvent(kind, text) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  $('#events').prepend(li);
}

$('#notifyDriver').addEventListener('click', async () => {
  $('#notifyStatus').textContent = 'Sending…';
  try {
    const payload = {
      type: 'driver_notification',
      lostItemId: lastTicketId,
      message: 'Passenger lost item on recent trip',
    };
    const res = await fetch('/notifications/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'driver_notification', payload }),
    });
    if (!res.ok) throw new Error('Failed');
    $('#notifyStatus').textContent = 'Notified';
  } catch (e) {
    $('#notifyStatus').textContent = 'Error';
  }
});

// Navigation
function show(section) {
  for (const el of [s1, s2, s3, s4]) el.classList.add('hidden');
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth' });
}
$('#navReport').addEventListener('click', () => show(s1));
$('#navMy').addEventListener('click', () => show(s4));

// My reports
$('#loadMy').addEventListener('click', async () => {
  const jwtMy = $('#jwtMy').value.trim() || $('#jwt').value.trim();
  if (!jwtMy) {
    $('#myList').innerHTML = '<li class="hint">Paste JWT first</li>';
    return;
  }
  $('#myList').innerHTML = '<li class="hint">Loading…</li>';
  try {
    const res = await fetch('/reporting/api/lost-items/my?limit=20', {
      headers: { Authorization: 'Bearer ' + jwtMy },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || 'Failed');
    const items = Array.isArray(json) ? json : json.data || [];
    if (!items.length) {
      $('#myList').innerHTML = '<li class="hint">No reports yet</li>';
      return;
    }
    $('#myList').innerHTML = '';
    items.forEach((it) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${it.title || it.id}</b> — <i>${it.status}</i><br/><span class="hint">${new Date(it.createdAt).toLocaleString()}</span>`;
      li.onclick = async () => {
        try {
          const r = await fetch('/reporting/api/lost-items/' + it.id, {
            headers: { Authorization: 'Bearer ' + jwtMy },
          });
          const jj = await r.json();
          $('#myDetail').textContent = JSON.stringify(jj, null, 2);
        } catch {}
      };
      $('#myList').appendChild(li);
    });
  } catch (e) {
    $('#myList').innerHTML = '<li class="hint">Error loading</li>';
  }
});

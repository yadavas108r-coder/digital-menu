// admin.js
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyJhNtesxLueBswZHEDmfkpv9EIjR2pPBqOgCvD3Cj9vz_I1Q4IJvJ5m1ZhutiNnEbs/exec'; // <-- replace with your deployed web app URL

// small JSONP helper
function jsonpRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    window[cb] = data => { delete window[cb]; if (script.parentNode) script.parentNode.removeChild(script); resolve(data); };
    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    script.onerror = () => { delete window[cb]; if (script.parentNode) script.parentNode.removeChild(script); reject(new Error('script load error')); };
    document.head.appendChild(script);
    setTimeout(()=> {
      if (window[cb]) { delete window[cb]; if(script.parentNode) script.parentNode.removeChild(script); reject(new Error('timeout')); }
    }, timeout);
  });
}

// small fetch POST helper for JSON (image upload)
async function postJson(url, obj) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  });
  return res.json();
}

// UI refs
const ordersBody = document.getElementById('ordersBody');
const menuBody = document.getElementById('menuBody');
const ordersTable = document.getElementById('ordersTable');
const menuTable = document.getElementById('menuTable');

const catNameInput = document.getElementById('catName');
const catImageFile = document.getElementById('catImageFile');
const catPreview = document.getElementById('catPreview');

const prodName = document.getElementById('prodName');
const prodPrice = document.getElementById('prodPrice');
const prodDesc = document.getElementById('prodDesc');
const prodCategory = document.getElementById('prodCategory');
const prodImageFile = document.getElementById('prodImageFile');
const prodPreview = document.getElementById('prodPreview');

const totalOrdersEl = document.getElementById('totalOrders');
const totalSalesEl = document.getElementById('totalSales');
const todayOrdersEl = document.getElementById('todayOrders');
const pendingOrdersEl = document.getElementById('pendingOrders');

function showLoading(section, msg = 'Loading...') {
  const el = document.getElementById(section + 'Loading');
  if (el) { el.style.display = 'block'; el.innerText = msg; }
}
function hideLoading(section) {
  const el = document.getElementById(section + 'Loading');
  if (el) el.style.display = 'none';
}

async function loadDashboard() {
  try {
    showLoading('menu');
    showLoading('orders');

    const stats = await jsonpRequest(WEB_APP_URL + '?action=getDashboardStats');
    if (stats && stats.status === 'success') {
      totalOrdersEl.innerText = stats.totalOrders || 0;
      totalSalesEl.innerText = '₹' + (stats.totalSales || 0);
      todayOrdersEl.innerText = stats.todayOrders || 0;
      pendingOrdersEl.innerText = stats.pendingOrders || 0;
    }

    const ordersResp = await jsonpRequest(WEB_APP_URL + '?action=getOrders');
    if (ordersResp && ordersResp.status === 'success') {
      renderOrders(ordersResp.orders || []);
    } else {
      ordersBody.innerHTML = '<tr><td colspan="8">No orders</td></tr>';
    }

    const menuResp = await jsonpRequest(WEB_APP_URL + '?action=getAllProducts');
    if (menuResp && menuResp.status === 'success') {
      renderMenu(menuResp.products || []);
    } else {
      menuBody.innerHTML = '<tr><td colspan="6">No menu items</td></tr>';
    }

    const catResp = await jsonpRequest(WEB_APP_URL + '?action=getCategories');
    if (catResp && catResp.status === 'success') {
      populateCategoryDropdown(catResp.categories || []);
    }

  } catch (err) {
    console.error(err);
    ordersBody.innerHTML = '<tr><td colspan="8">Error loading</td></tr>';
    menuBody.innerHTML = '<tr><td colspan="6">Error loading</td></tr>';
  } finally {
    hideLoading('orders');
    hideLoading('menu');
  }
}

function renderOrders(orders) {
  if (!orders || orders.length === 0) { ordersBody.innerHTML = '<tr><td colspan="8">No orders</td></tr>'; ordersTable.style.display='none'; return; }
  ordersTable.style.display = 'table';
  ordersBody.innerHTML = orders.map(o => {
    const time = new Date(o.Timestamp || o.timestamp || o.Date).toLocaleString();
    const items = (() => {
      try { const arr = typeof o.Items === 'string' ? JSON.parse(o.Items) : (o.Items || o.items); if (Array.isArray(arr)) return arr.map(it=>`${it.quantity}x ${it.name}`).join('<br>'); } catch(e){}
      return o.Items || o.items || '';
    })();
    const total = o.Total || o.total || o.totalAmount || '0';
    const status = (o.Status || o.status || 'pending');
    return `<tr>
      <td>${time}</td>
      <td><strong>${o.Name || o.name || ''}</strong></td>
      <td>${o.Phone || o.phone || 'N/A'}</td>
      <td>${o.Table || o.table || 'N/A'}</td>
      <td style="max-width:200px">${items}</td>
      <td>₹${Number(total).toFixed(2)}</td>
      <td>${status}</td>
      <td class="actions">
        <button onclick="openBill('${encodeURIComponent(o.Timestamp || o.timestamp || o.Date)}')">Bill</button>
        ${status !== 'completed' ? `<button onclick="markComplete('${encodeURIComponent(o.Timestamp || o.timestamp || o.Date)}')">Complete</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function renderMenu(products) {
  if (!products || products.length === 0) { menuBody.innerHTML = '<tr><td colspan="6">No products</td></tr>'; menuTable.style.display='none'; return; }
  menuTable.style.display = 'table';
  menuBody.innerHTML = products.map(p => {
    return `<tr>
      <td><div style="display:flex;gap:8px;align-items:center"><img src="${p.image}" style="width:60px;height:60px;object-fit:cover;border-radius:8px"/> <strong>${p.name}</strong><div style="font-size:12px;color:#666">${p.description||''}</div></div></td>
      <td>₹${p.price}</td>
      <td><img src="${p.image}" style="width:80px;height:50px;object-fit:cover"/></td>
      <td>${p.category}</td>
      <td>${p.type}</td>
      <td><button onclick="editProduct('${encodeURIComponent(p.name)}')">Edit</button> <button onclick="deleteProduct('${encodeURIComponent(p.name)}')">Delete</button></td>
    </tr>`;
  }).join('');
}

function populateCategoryDropdown(categories) {
  prodCategory.innerHTML = '';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.text = c.name;
    prodCategory.appendChild(opt);
  });
}

// ---------- category preview handlers ----------
catImageFile.addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  if (!f) { catPreview.innerHTML = 'No image'; return; }
  const r = new FileReader();
  r.onload = ev => { catPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover" />`; };
  r.readAsDataURL(f);
});
prodImageFile.addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  if (!f) { prodPreview.innerHTML = 'No image'; return; }
  const r = new FileReader();
  r.onload = ev => { prodPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover" />`; };
  r.readAsDataURL(f);
});

// ---------- submit category (upload image then addCategory) ----------
async function submitCategory(e) {
  if (e) e.preventDefault();
  const name = catNameInput.value.trim();
  if (!name) return alert('Provide category name');

  // if file exists, upload via POST to Apps Script
  const file = catImageFile.files[0];
  let imageUrl = '';
  try {
    if (file) {
      const base64 = await readFileAsDataURL(file);
      const res = await postJson(WEB_APP_URL, { action: 'uploadImage', imageData: base64, filename: file.name });
      if (res && res.status === 'success') imageUrl = res.url || res.url;
      else { alert('Image upload failed'); return; }
    }

    // call addCategory (GET) with name & image url
    const addRes = await jsonpRequest(WEB_APP_URL + '?action=addCategory&name=' + encodeURIComponent(name) + '&image=' + encodeURIComponent(imageUrl || ''));
    if (addRes && addRes.status === 'success') {
      alert('Category added');
      catNameInput.value = ''; catImageFile.value = ''; catPreview.innerHTML = 'No image';
      loadDashboard();
    } else {
      alert('Add category failed: ' + (addRes.error || JSON.stringify(addRes)));
    }
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = e => reject(e);
    r.readAsDataURL(file);
  });
}

// ---------- submit product (upload image optional then addProduct) ----------
async function submitProduct(e) {
  if (e) e.preventDefault();
  const name = prodName.value.trim();
  const price = prodPrice.value.trim();
  const category = prodCategory.value || 'General';
  const description = prodDesc.value || '';
  const type = document.getElementById('prodType').value || 'veg';
  if (!name || !price) return alert('Enter name & price');

  let imageUrl = '';
  const file = prodImageFile.files[0];
  try {
    if (file) {
      const base64 = await readFileAsDataURL(file);
      const res = await postJson(WEB_APP_URL, { action: 'uploadImage', imageData: base64, filename: file.name });
      if (res && res.status === 'success') imageUrl = res.url;
      else { alert('Image upload failed'); return; }
    }

    const q = `${WEB_APP_URL}?action=addProduct&name=${encodeURIComponent(name)}&price=${encodeURIComponent(price)}&category=${encodeURIComponent(category)}&description=${encodeURIComponent(description)}&type=${encodeURIComponent(type)}&image=${encodeURIComponent(imageUrl)}`;
    const res2 = await jsonpRequest(q);
    if (res2 && res2.status === 'success') {
      alert('Product added');
      prodName.value = ''; prodPrice.value = ''; prodDesc.value = ''; prodImageFile.value=''; prodPreview.innerHTML='No image';
      loadDashboard();
    } else {
      alert('Add product failed: ' + (res2.error || JSON.stringify(res2)));
    }
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}

// ---------- edit / delete / order operations ----------
async function deleteProduct(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm('Delete ' + name + '?')) return;
  const res = await jsonpRequest(WEB_APP_URL + '?action=deleteProduct&name=' + encodeURIComponent(name));
  if (res && res.status === 'success') { alert('Deleted'); loadDashboard(); } else alert('Delete failed: ' + (res.error||JSON.stringify(res)));
}

async function editProduct(encodedName) {
  const name = decodeURIComponent(encodedName);
  // open simple prompt-based edit (for speed)
  const newName = prompt('New name', name) || name;
  const newPrice = prompt('New price', '') || '';
  const newCategory = prompt('New category', '') || '';
  const newDesc = prompt('New description', '') || '';
  const newType = prompt('Type (veg/non-veg)', 'veg') || 'veg';
  const q = `${WEB_APP_URL}?action=updateProduct&oldName=${encodeURIComponent(name)}&name=${encodeURIComponent(newName)}&price=${encodeURIComponent(newPrice)}&category=${encodeURIComponent(newCategory)}&description=${encodeURIComponent(newDesc)}&type=${encodeURIComponent(newType)}`;
  const res = await jsonpRequest(q);
  if (res && res.status === 'success') { alert('Updated'); loadDashboard(); } else alert('Update failed: ' + (res.error||JSON.stringify(res)));
}

async function markComplete(encodedOrderId) {
  const id = decodeURIComponent(encodedOrderId);
  const res = await jsonpRequest(WEB_APP_URL + '?action=updateOrderStatus&orderId=' + encodeURIComponent(id) + '&status=completed');
  if (res && res.status === 'success') { alert('Order completed'); loadDashboard(); } else alert('Failed: ' + (res.error||JSON.stringify(res)));
}

async function openBill(encodedOrderId) {
  const id = decodeURIComponent(encodedOrderId);
  const res = await jsonpRequest(WEB_APP_URL + '?action=generateBill&orderId=' + encodeURIComponent(id));
  if (res && res.status === 'success') {
    showBillModal(res.bill);
  } else {
    alert('Bill error: ' + (res.error||JSON.stringify(res)));
  }
}

function showBillModal(bill) {
  const modal = document.getElementById('billModal');
  const cont = document.getElementById('billContent');
  const itemsHtml = (bill.items || []).map(it=>`<div style="display:flex;justify-content:space-between;padding:6px 0"><div>${it.quantity} x ${it.name}</div><div>₹${(it.price*it.quantity).toFixed(2)}</div></div>`).join('');
  cont.innerHTML = `<h3>Bill - ${bill.customerName}</h3><div>${new Date(bill.timestamp).toLocaleString()}</div><div style="margin-top:10px">${itemsHtml}</div><div style="margin-top:12px;font-weight:700">Total: ₹${(bill.totalAmount||0).toFixed(2)}</div>`;
  modal.style.display='flex';
}

function closeBill() { document.getElementById('billModal').style.display='none'; }
function printBill() { window.print(); }

// ---------- init ----------
function loadDashboard() { loadDashboardData(); }
async function loadDashboardData() { await loadDashboard(); }
document.addEventListener('DOMContentLoaded', () => { loadDashboard(); });

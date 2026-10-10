'use strict';
/* Munch Express — admin dashboard: orders + service fees across all restaurants. */

var ADMIN_EMAIL = 'lilmavis23@gmail.com';

function openAdminPanel() {
  if (!currentVendorUser || currentVendorUser.email !== ADMIN_EMAIL) {
    toast('Access denied.');
    return;
  }
  renderAdminScreen();
  showScreen('admin');
}

function renderAdminScreen() {
  var el = document.getElementById('screen-admin');
  if (!el) return;

  var h = '<div class="dash-head">';
  h += '<button class="back-btn" onclick="adminLogout()">Log out</button>';
  h += '<h2>Admin</h2>';
  h += '<p>Service fees owed by restaurant</p>';
  h += '</div>';
  h += '<div id="admin-body" style="padding:0 16px 24px;">';
  h += '<p style="text-align:center;color:var(--muted);padding:30px 0;">Loading...</p>';
  h += '</div>';
  el.innerHTML = h;

  SupaAdmin.listAllOrders()
    .then(function (orders) {
      renderAdminBody(orders);
    })
    .catch(function (err) {
      console.error('[Munch admin] Load failed:', err);
      var body = document.getElementById('admin-body');
      if (body) body.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px 0;">Could not load orders.</p>';
    });
}

function renderAdminBody(orders) {
  var body = document.getElementById('admin-body');
  if (!body) return;

  if (!orders.length) {
    body.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 0;">No orders yet.</p>';
    return;
  }

  /* Group by restaurant */
  var byRest = {};
  var order = [];
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var key = o.restaurant_id || 'unknown';
    if (!byRest[key]) {
      byRest[key] = {
        name: o.restaurant_name || 'Unknown',
        orders: 0,
        totalSales: 0,
        totalFees: 0,
        firstOrder: o.created_at,
        lastOrder: o.created_at
      };
      order.push(key);
    }
    var g = byRest[key];
    g.orders += 1;
    g.totalSales += Number(o.grand_total) || 0;
    g.totalFees += Number(o.service_fee) || 0;
    if (o.created_at < g.firstOrder) g.firstOrder = o.created_at;
    if (o.created_at > g.lastOrder) g.lastOrder = o.created_at;
  }

  /* Sort by highest fees */
  order.sort(function (a, b) { return byRest[b].totalFees - byRest[a].totalFees; });

  var grandFees = 0;
  for (var j = 0; j < order.length; j++) grandFees += byRest[order[j]].totalFees;

  var html = '';
  html += '<div style="background:var(--teal-soft);border-radius:14px;padding:18px;margin-bottom:18px;">';
  html += '<p style="font-size:11px;color:var(--teal);text-transform:uppercase;letter-spacing:.06em;font-weight:800;margin-bottom:4px;">Total Service Fees Owed</p>';
  html += '<p style="font-size:28px;font-weight:900;color:var(--teal);margin:0;">' + money(grandFees) + '</p>';
  html += '<p style="font-size:12px;color:var(--muted);margin-top:6px;">' + orders.length + ' order' + (orders.length === 1 ? '' : 's') + ' across ' + order.length + ' restaurant' + (order.length === 1 ? '' : 's') + '</p>';
  html += '</div>';

  for (var k = 0; k < order.length; k++) {
    var r = byRest[order[k]];
    html += '<div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;">';
    html += '<p style="font-size:15px;font-weight:800;color:var(--text);margin:0 0 8px;">' + esc(r.name) + '</p>';
    html += '<div class="row-between"><span class="rs">Orders</span><span class="rt">' + r.orders + '</span></div>';
    html += '<div class="row-between"><span class="rs">Total Sales</span><span class="rt">' + money(r.totalSales) + '</span></div>';
    html += '<div class="row-between" style="border-top:1px dashed var(--border);padding-top:8px;margin-top:4px;">';
    html += '<span class="rt" style="font-weight:800;">Fees Owed</span>';
    html += '<span class="rt" style="color:var(--orange);font-weight:900;font-size:16px;">' + money(r.totalFees) + '</span>';
    html += '</div>';
    html += '</div>';
  }

  body.innerHTML = html;
}

function adminLogout() {
  SupaAuth.signOut().then(function () {
    currentVendorUser = null;
    currentVendorRestaurant = null;
    toast('Logged out.');
    showScreen('customer-app');
  });
}

/* ============ Admin login & deep link ============ */
function openAdminLogin() {
  showScreen('admin-login');
}

function handleAdminLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  var email = fieldVal('al-email').toLowerCase();
  var passEl = document.getElementById('al-pass');
  var pass = passEl ? passEl.value : '';
  if (!email || !pass) { toast('Enter email and password.'); return false; }

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    toast('Access denied.');
    return false;
  }

  var btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }

  SupaAuth.signIn(email, pass)
    .then(function () { return SupaAuth.getUser(); })
    .then(function (user) {
      if (!user || user.email !== ADMIN_EMAIL) {
        toast('Access denied.');
        return SupaAuth.signOut();
      }
      currentVendorUser = user;
      openAdminPanel();
    })
    .catch(function (err) {
      console.error('[Munch admin] Login failed:', err);
      var msg = err.message || 'Login failed.';
      if (/invalid login credentials/i.test(msg)) msg = 'Incorrect email or password.';
      if (/email not confirmed/i.test(msg)) msg = 'Please confirm your email first.';
      toast(msg);
    })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Enter'; }
    });

  return false;
}

/* Returns true if the URL has ?admin and we routed to admin */
function checkAdminDeepLink() {
  try {
    var params = new URLSearchParams(window.location.search);
    if (!params.has('admin')) return false;

    SupaAuth.getUser().then(function (user) {
      if (user && user.email === ADMIN_EMAIL) {
        currentVendorUser = user;
        openAdminPanel();
      } else {
        openAdminLogin();
      }
    }).catch(function () {
      openAdminLogin();
    });
    return true;
  } catch (e) {
    console.warn('[Munch admin] URL check failed:', e);
    return false;
  }
}
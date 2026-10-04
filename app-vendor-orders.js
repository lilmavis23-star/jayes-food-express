'use strict';
/* Munch Express — vendor orders list. */

var currentOrderId = null;
var cachedOrders = [];

function openVendorOrders() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  currentOrderId = null;
  renderVendorOrdersScreen();
  showScreen('vendor-orders');
}

function renderVendorOrdersScreen() {
  var el = document.getElementById('screen-vendor-orders');
  if (!el) return;
  if (currentOrderId) renderOrderDetail(el, currentOrderId);
  else renderOrdersList(el);
}

function renderOrdersList(el) {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;

  var h = '<div class="dash-head">';
  h += '<button class="back-btn" onclick="showVendorDashboard()">Back to Dashboard</button>';
  h += '<h2>Orders</h2>';
  h += '<p>' + esc(r.name) + '</p></div>';
  h += '<div id="orders-list-body" style="padding:0 16px 24px;">';
  h += '<p style="text-align:center;color:var(--muted);padding:30px 0;">Loading orders...</p></div>';
  el.innerHTML = h;

  SupaOrders.listForRestaurant(r.id, 100)
    .then(function (orders) {
      cachedOrders = orders;
      renderOrdersListBody();
    })
    .catch(function (err) {
      console.error('[Munch] Orders load failed:', err);
      var body = document.getElementById('orders-list-body');
      if (body) body.innerHTML = '<p style="text-align:center;padding:30px 0;color:var(--muted);">Could not load orders. Pull down to refresh.</p>';
    });
}

function renderOrdersListBody() {
  var body = document.getElementById('orders-list-body');
  if (!body) return;
  if (!cachedOrders.length) {
    body.innerHTML = '<p style="text-align:center;padding:40px 0;color:var(--muted);">No orders yet.</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < cachedOrders.length; i++) {
    html += buildOrderRow(cachedOrders[i]);
  }
  body.innerHTML = html;
}

function buildOrderRow(o) {
  var items = Array.isArray(o.items) ? o.items : [];
  var count = 0;
  for (var i = 0; i < items.length; i++) count += Number(items[i].qty) || 0;
  var code = o.order_code || '----';
  var name = o.customer_name || 'Customer';
  var when = timeAgo(new Date(o.created_at));
  var total = money(o.grand_total);
  var pill = orderStatusPill(o.status);

  var s = '<div onclick="openOrderDetail(\'' + esc(o.id) + '\')" ';
  s += 'style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;">';
  s += '<div style="display:flex;justify-content:space-between;gap:12px;">';
  s += '<div style="min-width:0;flex:1;">';
  s += '<div style="font-family:monospace;font-size:13px;font-weight:800;color:var(--teal);">' + esc(code) + '</div>';
  s += '<div style="font-size:14px;font-weight:700;margin-top:4px;">' + esc(name) + '</div>';
  s += '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + count + ' item' + (count === 1 ? '' : 's') + ' &middot; ' + when + '</div>';
  s += '</div>';
  s += '<div style="text-align:right;flex:none;">';
  s += '<div style="font-weight:800;color:var(--orange);font-size:15px;">' + total + '</div>';
  s += '<div style="margin-top:6px;">' + pill + '</div>';
  s += '</div></div></div>';
  return s;
}

function openOrderDetail(orderId) {
  currentOrderId = orderId;
  var el = document.getElementById('screen-vendor-orders');
  if (!el) return;
  renderOrderDetail(el, orderId);
}

function backToOrdersList() {
  currentOrderId = null;
  renderVendorOrdersScreen();
}

function orderStatusPill(status) {
  var label = 'Awaiting Payment';
  var color = '#B8843F';
  var bg = '#F7EEDE';
  if (status === 'accepted')  { label = 'Accepted';  color = '#2F6B62'; bg = '#E5F0ED'; }
  if (status === 'ready')     { label = 'Ready';     color = '#3E8B5F'; bg = '#E5F3EB'; }
  if (status === 'delivered') { label = 'Delivered'; color = '#6E747A'; bg = '#EFEDEA'; }
  return '<span style="display:inline-block;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;color:' + color + ';background:' + bg + ';">' + label + '</span>';
}

function timeAgo(date) {
  var s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  var m = Math.floor(s / 60);
  if (m < 60) return m + ' min ago';
  var h = Math.floor(m / 60);
  if (h < 24) return h + ' hr ago';
  var d = Math.floor(h / 24);
  if (d < 7) return d + ' day ago';
  return date.toLocaleDateString();
}
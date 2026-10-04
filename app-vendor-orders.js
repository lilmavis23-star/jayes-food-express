'use strict';
/* Munch Express — vendor orders. */

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

  var head = '<div class="dash-head">';
  head += '<button class="back-btn" onclick="showVendorDashboard()">Back to Dashboard</button>';
  head += '<h2>Orders</h2>';
  head += '<p>' + esc(r.name) + '</p>';
  head += '</div>';

  var loading = '<div id="orders-list-body" style="padding:0 16px 24px;">';
  loading += '<p style="text-align:center;color:var(--muted);font-size:14px;padding:30px 0;">Loading orders...</p>';
  loading += '</div>';

  el.innerHTML = head + loading;

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
  cachedOrders.forEach(function (o) {
    html += buildOrderRow(o);
  });
  body.innerHTML = html;
}

function buildOrderRow(o) {
  var items = Array.isArray(o.items) ? o.items : [];
  var itemCount = 0;
  for (var i = 0; i < items.length; i++) itemCount += Number(items[i].qty) || 0;

  var when = timeAgo(new Date(o.created_at));
  var code = o.order_code || '----';
  var name = o.customer_name || 'Customer';
  var total = money(o.grand_total);
  var status = orderStatusPill(o.status);

  var s = '<div onclick="openOrderDetail(\'' + esc(o.id) + '\')"';
  s += ' style="background:#fff;border:1px solid var(--border);border-radius:14px;';
  s += 'padding:14px;margin-bottom:10px;cursor:pointer;">';
  s += '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;">';
  s += '<div style="min-width:0;flex:1;">';
  s += '<div style="font-family:monospace;font-size:13px;font-weight:800;color:var(--teal);">' + esc(code) + '</div>';
  s += '<div style="font-size:14px;font-weight:700;color:var(--'text);margin-top:4px +;">' + esc(name item) + '</div>';
  s += '<div styleCount="font-size:12px;color:var +(--muted);margin-top:2px;"> ' item' + (itemCount === 1 ? '' : 's') + ' &middot; ' + when + '</div>';
  s += '</div>';
  s += '<div style="text-align:right;flex:none;">';
  s += '<div style="font-weight:800;color:var(--orange);font-size:15px;">' + total + '</div>';
  s += '<div style="margin-top:6px;">' + status + '</div>';
  s += '</div>';
  s += '</div>';
  s += '</div>';
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

function renderOrderDetail(el, orderId) {
  var head = '<div class="dash-head">';
  head += '<button class="back-btn" onclick="backToOrdersList()">All Orders</button>';
  head += '<h2>Order Detail</h2>';
  head += '</div>';
  head += '<div id="order-detail-body" style="padding:0 16px 24px;">';
  head += '<p style="text-align:center;padding:30px 0;color:var(--muted);">Loading...</p>';
  head += '</div>';
  el.innerHTML = head;

  SupaOrders.getById(orderId)
    .then(function (o) { renderOrderDetailBody(o); })
    .catch(function (err) {
      console.error('[Munch] Order load failed:', err);
      var body = document.getElementById('order-detail-body');
      if (body) body.innerHTML = '<p style="text-align:center;padding:30px 0;color:var(--muted);">Could not load order.</p>';
    });
}

function renderOrderDetailBody(o) {
  var body = document.getElementById('order-detail-body');
  if (!body) return;
  if (!o) {
    body.innerHTML = '<p style="text-align:center;padding:30px 0;color:var(--muted);">Order not found.</p>';
    return;
  }

  var status = o.status || 'awaiting';
  var html = '';

  /* Header with code + status */
  html += '<div class="form-card">';
  html += '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;">';
  html += '<div style="min-width:0;">';
  html += '<p style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px;">Order Code</p>';
  html += '<p style="font-family:monospace;font-size:20px;font-weight:900;color:var(--teal);margin:0;">' + esc(o.order_code || '----') + '</p>';
  html += '</div>';
  html += '<div>' + orderStatusPill(status) + '</div>';
  html += '</div>';
  html += '<p style="font-size:12px;color:var(--muted);margin:0;">Placed ' + timeAgo(new Date(o.created_at)) + '</p>';
  html += '</div>';

  /* Receipt */
  html += '<div class="form-card">';
  html += '<h3>PAYMENT RECEIPT</h3>';
  if (o.receipt_url) {
    html += '<p style="font-size:12px;color:var(--muted);margin-bottom:10px;">Tap to view full size.</p>';
    html += '<a href="' + esc(o.receipt_url) + '" target="_blank" rel="noopener">';
    html += '<img src="' + esc(o.receipt_url) + '" style="width:100%;border-radius:10px;border:1px solid var(--border);" alt="Receipt">';
    html += '</a>';
  } else {
    html += '<p style="font-size:13px;color:var(--muted);">No receipt uploaded.</p>';
  }
  html += '</div>';

  /* Customer */
  html += '<div class="form-card">';
  html += '<h3>CUSTOMER</h3>';
  html += rowLine('Name', esc(o.customer_name || '-'));
  html += rowLine('Phone', esc(o.customer_phone || '-'));
  html += rowLine('Option', esc(o.order_option || 'Delivery'));
  if (o.delivery_location) html += rowLine('Location', esc(o.delivery_location));
  if (o.instructions) html += rowLine('Note', esc(o.instructions));
  html += '</div>';

  /* Items */
  html += '<div class="form-card">';
  html += '<h3>ITEMS</h3>';
  var items = Array.isArray(o.items) ? o.items : [];
  items.forEach(function (i) {
    html += '<div class="row-between">';
    html += '<span class="rt">' + esc(i.name || 'Item') + ' x ' + (i.qty || 1) + '</span>';
    html += '<span class="rt">' + money(i.line || 0) + '</span>';
    html += '</div>';
  });
  var dFee = Number(o.delivery_fee) || 0;
  var fTotal = Number(o.food_total) || 0;
  var gTotal = Number(o.grand_total) || 0;
  var pack = gTotal - fTotal - dFee;

  html += '<div class="row-between mt8"><span class="rs">Food Total</span><span class="rt">' + money(fTotal) + '</span></div>';
  html += '<div class="row-between"><span class="rs">Delivery</span><span class="rt">' + money(dFee) + '</span></div>';
  if (pack > 0) html += '<div class="row-between"><span class="rs">Disposable Pack</span><span class="rt">' + money(pack) + '</span></div>';
  html += '<div class="row-between"><span class="rt">Total</span><span class="rt" style="color:var(--teal);font-weight:800;">' + money(gTotal) + '</span></div>';
  html += '</div>';

  /* Action button */
  if (status === 'awaiting') {
    html += '<button class="btn btn-orange btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\',\'accepted\')">Accept Order</button>';
    html += '<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">Verify the receipt, then tap Accept.</p>';
  } else if (status === 'accepted') {
    html += '<button class="btn btn-teal btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\',\'ready\')">Mark Ready for Pickup</button>';
    html += '<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">Tap when the food is cooked and packed.</p>';
  } else if (status === 'ready') {
    html += '<button class="btn btn-orange btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\',\'delivered\')">Mark Delivered</button>';
    html += '<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">Tap when the rider has collected.</p>';
  } else if (status === 'delivered') {
    html += '<div style="background:var(--green-bg);border-radius:12px;padding:14px;text-align:center;">';
    html += '<p style="font-size:13px;color:#3E8B5F;font-weight:700;margin:0;">This order was delivered.</p>';
    html += '</div>';
  }

  body.innerHTML = html;
}

function rowLine(label, value) {
  return '<div class="row-between"><span class="rs">' + label + '</span><span class="rt" style="text-align:right;max-width:60%;">' + value + '</span></div>';
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

function updateOrderStatus(orderId, status) {
  var btn = document.querySelector('#order-detail-body .btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

  SupaOrders.updateStatus(orderId, status)
    .then(function () {
      var msg = 'Updated';
      if (status === 'accepted')  msg = 'Order accepted';
      if (status === 'ready')     msg = 'Marked as ready';
      if (status === 'delivered') msg = 'Marked as delivered';
      toast(msg);
      cachedOrders = cachedOrders.map(function (x) {
        if (x.id === orderId) return Object.assign({}, x, { status: status });
        return x;
      });
      return SupaOrders.getById(orderId);
    })
    .then(function (o) { renderOrderDetailBody(o); })
    .catch(function (err) {
      console.error('[Munch] Status update failed:', err);
      toast(err.message || 'Could not update order.');
      if (btn) { btn.disabled = false; btn.textContent = 'Retry'; }
    });
}

function timeAgo(date) {
  var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  var mins = Math.floor(seconds / 60);
  if (mins < 60) return mins + ' min ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' hr ago';
  var days = Math.floor(hours / 24);
  if (days < 7) return days + ' day ago';
  return date.toLocaleDateString();
}

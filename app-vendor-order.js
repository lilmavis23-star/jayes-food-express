'use strict';
/* Munch Express — vendor orders: list, detail, status updates. */

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
  if (currentOrderId) {
    renderOrderDetail(el, currentOrderId);
  } else {
    renderOrdersList(el);
  }
}

function renderOrdersList(el) {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;

  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="showVendorDashboard()">\u2190 Dashboard</button>' +
      '<h2>Orders</h2>' +
      '<p>' + esc(r.name) + '</p>' +
    '</div>' +
    '<div id="orders-list-body" style="padding:0 16px 24px;">' +
      '<p style="text-align:center;color:var(--muted);font-size:14px;padding:30px 0;">Loading orders...</p>' +
    '</div>';

  SupaOrders.listForRestaurant(r.id, 100)
    .then(function (orders) {
      cachedOrders = orders;
      renderOrdersListBody();
    })
    .catch(function (err) {
      console.error('[Munch] Orders load failed:', err);
      var body = document.getElementById('orders-list-body');
      if (body) body.innerHTML = '<div class="empty-state"><div class="big">\u26a0\ufe0f</div><p>Could not load orders.</p><p class="mt8" style="font-size:.82rem;">Pull down to refresh.</p></div>';
    });
}

function renderOrdersListBody() {
  var body = document.getElementById('orders-list-body');
  if (!body) return;

  if (!cachedOrders.length) {
    body.innerHTML =
      '<div class="empty-state" style="margin-top:20px;">' +
        '<div class="big">\ud83d\udccb</div>' +
        '<p>No orders yet.</p>' +
        '<p class="mt8" style="font-size:.82rem;">When customers order, they\'ll appear here.</p>' +
      '</div>';
    return;
  }

  body.innerHTML = cachedOrders.map(function (o) {
    var items = Array.isArray(o.items) ? o.items : [];
    var itemCount = items.reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
    var t = new Date(o.created_at);
    return '<div onclick="openOrderDetail(\'' + esc(o.id) + '\')" ' +
      'style="background:#fff;border:1px solid var(--border);border-radius:14px;' +
      'padding:14px;margin-bottom:10px;cursor:pointer;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="font-family:monospace;font-size:13px;font-weight:800;color:var(--teal);letter-spacing:.02em;">' +
            esc(o.order_code || '----') +
          '</div>' +
          '<div style="font-size:14px;font-weight:700;color:var(--text);margin-top:4px;">' +
            esc(o.customer_name || 'Customer') +
          '</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' +
            itemCount + ' item' + (itemCount === 1 ? '' : 's') + ' \u00b7 ' + timeAgo(t) +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;flex:none;">' +
          '<div style="font-weight:800;color:var(--orange);font-size:15px;">' +
            money(o.grand_total) +
          '</div>' +
          '<div style="margin-top:6px;">' + orderStatusPill(o.status) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function openOrderDetail(orderId) {
  currentOrderId = orderId;
  var el = document.getElementById('screen-vendor-orders');
  if (!el) return;
  renderOrderDetail(el, orderId);
}

function renderOrderDetail(el, orderId) {
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="backToOrdersList()">\u2190 All Orders</button>' +
      '<h2>Order Detail</h2>' +
    '</div>' +
    '<div id="order-detail-body" style="padding:0 16px 24px;">' +
      '<p style="text-align:center;color:var(--muted);font-size:14px;padding:30px 0;">Loading...</p>' +
    '</div>';

  SupaOrders.getById(orderId)
    .then(function (o) {
      renderOrderDetailBody(o);
    })
    .catch(function (err) {
      console.error('[Munch] Order load failed:', err);
      var body = document.getElementById('order-detail-body');
      if (body) body.innerHTML = '<div class="empty-state"><div class="big">\u26a0\ufe0f</div><p>Could not load order.</p></div>';
    });
}

function backToOrdersList() {
  currentOrderId = null;
  renderVendorOrdersScreen();
}

function renderOrderDetailBody(o) {
  var body = document.getElementById('order-detail-body');
  if (!body) return;
  if (!o) {
    body.innerHTML = '<div class="empty-state"><div class="big">\ud83d\udccb</div><p>Order not found.</p></div>';
    return;
  }

  var items = Array.isArray(o.items) ? o.items : [];

  var receiptHTML = o.receipt_url
    ? '<div class="form-card">' +
        '<h3>PAYMENT RECEIPT</h3>' +
        '<p style="font-size:12px;color:var(--muted);margin-bottom:10px;">Tap to view full size. Confirm the amount matches before accepting.</p>' +
        '<a href="' + esc(o.receipt_url) + '" target="_blank" rel="noopener">' +
          '<img src="' + esc(o.receipt_url) + '" style="width:100%;border-radius:10px;border:1px solid var(--border);" alt="Receipt">' +
        '</a>' +
      '</div>'
    : '<div class="form-card">' +
        '<h3>PAYMENT RECEIPT</h3>' +
        '<div style="background:#FBEEE5;border:1px solid #F3D5BE;border-radius:10px;padding:12px;font-size:13px;color:#8A4520;">No receipt uploaded.</div>' +
      '</div>';

  var itemsHTML = items.map(function (i) {
    return '<div class="row-between">' +
      '<span class="rt">' + esc(i.name || 'Item') + ' \u00d7 ' + (i.qty || 1) + '</span>' +
      '<span class="rt">' + money(i.line || 0) + '</span>' +
    '</div>';
  }).join('');

  var deliveryFee = Number(o.delivery_fee) || 0;
  var foodTotal = Number(o.food_total) || 0;
  var grandTotal = Number(o.grand_total) || 0;
  var disposable = grandTotal - foodTotal - deliveryFee;

  var totalsHTML =
    '<div class="row-between mt8"><span class="rs">Food Total</span><span class="rt">' + money(foodTotal) + '</span></div>' +
    '<div class="row-between"><span class="rs">Delivery</span><span class="rt">' + money(deliveryFee) + '</span></div>' +
    (disposable > 0 ? '<div class="row-between"><span class="rs">Disposable Pack</span><span class="rt">' + money(disposable) + '</span></div>' : '') +
    '<div class="row-between"><span class="rt">Total</span><span class="rt" style="color:var(--teal);font-weight:800;">' + money(grandTotal) + '</span></div>';

  var status = o.status || 'awaiting';
  var actionHTML = '';
  if (status === 'awaiting') {
    actionHTML =
      '<button class="btn btn-orange btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\', \'accepted\')" style="margin-bottom:10px;">' +
        'Accept Order' +
      '</button>' +
      '<p style="text-align:center;font-size:12px;color:var(--muted);margin:0;">Tap Accept once you\'ve verified the receipt and the payment is in your account.</p>';
  } else if (status === 'accepted') {
    actionHTML =
      '<button class="btn btn-teal btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\', \'ready\')" style="margin-bottom:10px;">' +
        'Mark Ready for Pickup' +
      '</button>' +
      '<p style="text-align:center;font-size:12px;color:var(--muted);margin:0;">Tap once the food is cooked and packed.</p>';
  } else if (status === 'ready') {
    actionHTML =
      '<button class="btn btn-orange btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\', \'delivered\')" style="margin-bottom:10px;">' +
        'Mark Delivered' +
      '</button>' +
      '<p style="text-align:center;font-size:12px;color:var(--muted);margin:0;">Tap once the rider has collected or the customer has picked up.</p>';
  } else if (status === 'delivered') {
    actionHTML =
      '<div style="background:var(--green-bg);border:1px solid #C8E0D2;border-radius:12px;padding:14px;text-align:center;">' +
        '<p style="font-size:13px;color:#3E8B5F;font-weight:700;margin:0;">\u2713 This order was delivered</p>' +
      '</div>';
  }

  body.innerHTML =
    '<div class="form-card">' +
      '<div style="display:flex;justify-content:space-between;align-itemsspan:flex-start;gap:12px;><margin-bottom:12px;">'span +
        '<div style="min-width:0;"> class' +
          '<p style="font-size:="11px;color:var(--muted);rttext-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px;">Order Code</p>' +
          '<p style="font-family:monospace;font-size:20px;font-weight:900;color:var(--teal);margin:0;">' +
            esc(o.order_code || '----') +
          '</p>' +
        '</div>' +
        '<div>' + orderStatusPill(status) + '</div>' +
      '</div>' +
      '<p style="font-size:12px;color:var(--muted);margin:0;">Placed ' + timeAgo(new Date(o.created_at)) + '</p>' +
    '</div>' +

    receiptHTML +

    '<div class="form-card">' +
      '<h3>CUSTOMER</h3>' +
      '<div class="row-between"><span class="rs">Name</">' + esc(o.customer_name || '-') + '</span></div>' +
      '<div class="row-between"><span class="rs">Phone</span><span class="rt"><a href="tel:' + esc(o.customer_phone || '') + '" style="color:var(--teal);text-decoration:none;">' + esc(o.customer_phone || '-') + '</a></span></div>' +
      '<div class="row-between"><span class="rs">Option</span><span class="rt">' + esc(o.order_option || 'Delivery') + '</span></div>' +
      (o.delivery_location ? '<div class="row-between"><span class="rs">Location</span><span class="rt" style="text-align:right;max-width:60%;">' + esc(o.delivery_location) + '</span></div>' : '') +
      (o.instructions ? '<div class="row-between"><span class="rs">Note</span><span class="rt" style="text-align:right;max-width:60%;font-style:italic;">' + esc(o.instructions) + '</span></div>' : '') +
    '</div>' +

    '<div class="form-card">' +
      '<h3>ITEMS</h3>' +
      itemsHTML +
      totalsHTML +
    '</div>' +

    actionHTML;
}

function orderStatusPill(status) {
  var map = {
    awaiting:  { label: 'Awaiting Payment', color: '#B8843F', bg: '#F7EEDE' },
    accepted:  { label: 'Accepted',         color: '#2F6B62', bg: '#E5F0ED' },
    ready:     { label: 'Ready',            color: '#3E8B5F', bg: '#E5F3EB' },
    delivered: { label: 'Delivered',        color: '#6E747A', bg: '#EFEDEA' }
  };
  var m = map[status] || map.awaiting;
  return '<span style="display:inline-block;font-size:11px;font-weight:800;' +
    'padding:4px 10px;border-radius:999px;letter-spacing:.02em;' +
    'color:' + m.color + ';background:' + m.bg + ';">' + m.label + '</span>';
}

function updateOrderStatus(orderId, status) {
  var btn = document.querySelector('#order-detail-body .btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

  SupaOrders.updateStatus(orderId, status)
    .then(function () {
      var labels = { accepted: 'Order accepted', ready: 'Marked as ready', delivered: 'Marked as delivered' };
      toast(labels[status] || 'Updated');
      return SupaOrders.getById(orderId);
    })
    .then(function (o) {
      renderOrderDetailBody(o);
      if (status === 'accepted' && document.querySelector('[data-order-id="' + orderId + '"]')) {
        /* refresh the parent list silently for when they go back */
      }
      cachedOrders = cachedOrders.map(function (x) {
        if (x.id === orderId) {
          var copy = Object.assign({}, x, { status: status });
          return copy;
        }
        return x;
      });
    })
    .catch(function (err) {
      console.error('[Munch] Status update failed:', err);
      toast(err.message || 'Could not update order.');
    });
}

function timeAgo(date) {
  var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  var mins = Math.floor(seconds / 60);
  if (mins < 60) return mins + ' min ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' hr' + (hours === 1 ? '' : 's') + ' ago';
  var days = Math.floor(hours / 24);
  if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  return date.toLocaleDateString();
}
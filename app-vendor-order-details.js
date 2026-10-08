'use strict';
/* Munch Express — vendor order detail and status updates. */

function renderOrderDetail(el, orderId) {
  var h = '<div class="dash-head">';
  h += '<button class="back-btn" onclick="backToOrdersList()">All Orders</button>';
  h += '<h2>Order Detail</h2></div>';
  h += '<div id="order-detail-body" style="padding:0 16px 24px;">';
  h += '<p style="text-align:center;padding:30px 0;color:var(--muted);">Loading...</p></div>';
  el.innerHTML = h;

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

  /* Header */
  html += '<div class="form-card">';
  html += '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;">';
  html += '<div><p style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:4px;">Order Code</p>';
  html += '<p style="font-family:monospace;font-size:20px;font-weight:900;color:var(--teal);margin:0;">' + esc(o.order_code || '----') + '</p></div>';
  html += '<div>' + orderStatusPill(status) + '</div></div>';
  html += '<p style="font-size:12px;color:var(--muted);margin:0;">Placed ' + timeAgo(new Date(o.created_at)) + '</p>';
  html += '</div>';

  /* Receipt */
  /* Receipt */
  html += '<div class="form-card"><h3>PAYMENT RECEIPT</h3>';
  if (o.receipt_url) {
    html += '<p style="font-size:12px;color:var(--muted);margin-bottom:10px;">Loading receipt...</p>';
    html += '<div id="receipt-slot-' + esc(o.id) + '"></div>';
  } else {
    html += '<p style="font-size:13px;color:var(--muted);">No receipt uploaded.</p>';
  }
  html += '</div>';
  /* Customer */
  html += '<div class="form-card"><h3>CUSTOMER</h3>';
  html += detailRow('Name', esc(o.customer_name || '-'));
  html += detailRow('Phone', esc(o.customer_phone || '-'));
  html += detailRow('Option', esc(o.order_option || 'Delivery'));
  if (o.delivery_location) html += detailRow('Address', esc(o.delivery_location));
  if (o.instructions) html += detailRow('Note', esc(o.instructions));
  html += '</div>';

  /* Map / directions */
  if (o.delivery_lat && o.delivery_lng) {
    var gmap = 'https://www.google.com/maps/dir/?api=1&destination=' + o.delivery_lat + ',' + o.delivery_lng;
    html += '<div class="form-card"><h3>LOCATION</h3>';
    html += '<p style="font-size:12px;color:var(--muted);margin-bottom:10px;">Customer pinned this exact spot.</p>';
    html += '<a href="' + gmap + '" target="_blank" rel="noopener" class="btn btn-teal btn-block" style="text-decoration:none;display:block;text-align:center;">Get Directions in Google Maps</a>';
    html += '<p style="font-size:11px;color:var(--muted);text-align:center;margin-top:8px;">Coordinates: ' + Number(o.delivery_lat).toFixed(5) + ', ' + Number(o.delivery_lng).toFixed(5) + '</p>';
    html += '</div>';
  }

  /* Items */
  html += '<div class="form-card"><h3>ITEMS</h3>';
  var items = Array.isArray(o.items) ? o.items : [];
  for (var i = 0; i < items.length; i++) {
    html += '<div class="row-between"><span class="rt">' + esc(items[i].name || 'Item') + ' x ' + (items[i].qty || 1) + '</span>';
    html += '<span class="rt">' + money(items[i].line || 0) + '</span></div>';
  }
  var dFee = Number(o.delivery_fee) || 0;
  var fTot = Number(o.food_total) || 0;
  var gTot = Number(o.grand_total) || 0;
  var pack = gTot - fTot - dFee;
  html += '<div class="row-between mt8"><span class="rs">Food Total</span><span class="rt">' + money(fTot) + '</span></div>';
  html += '<div class="row-between"><span class="rs">Delivery</span><span class="rt">' + money(dFee) + '</span></div>';
  if (pack > 0) html += '<div class="row-between"><span class="rs">Disposable Pack</span><span class="rt">' + money(pack) + '</span></div>';
  html += '<div class="row-between"><span class="rt">Total</span><span class="rt" style="color:var(--teal);font-weight:800;">' + money(gTot) + '</span></div>';
  html += '</div>';

  /* Action */
  if (status === 'awaiting') {
    html += '<button class="btn btn-orange btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\',\'accepted\')">Accept Order</button>';
    html += '<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">Verify receipt, then tap Accept.</p>';
  } else if (status === 'accepted') {
    html += '<button class="btn btn-teal btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\',\'ready\')">Mark Ready for Pickup</button>';
    html += '<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">Tap when food is cooked and packed.</p>';
  } else if (status === 'ready') {
    html += '<button class="btn btn-orange btn-block" onclick="updateOrderStatus(\'' + esc(o.id) + '\',\'delivered\')">Mark Delivered</button>';
    html += '<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">Tap when rider collects or customer picks up.</p>';
  } else if (status === 'delivered') {
    html += '<div style="background:var(--green-bg);border-radius:12px;padding:14px;text-align:center;">';
    html += '<p style="font-size:13px;color:#3E8B5F;font-weight:700;margin:0;">This order was delivered.</p></div>';
  }

  body.innerHTML = html;

  /* Load receipt via signed URL (private bucket) */
  if (o.receipt_url) {
    SupaImages.getReceiptUrl(o.receipt_url).then(function (url) {
      var slot = document.getElementById('receipt-slot-' + o.id);
      if (!slot) return;
      if (!url) {
        slot.innerHTML = '<p style="font-size:13px;color:var(--muted);">Could not load receipt.</p>';
        return;
      }
      slot.innerHTML = '<a href="' + url + '" target="_blank" rel="noopener">' +
        '<img src="' + url + '" style="width:100%;border-radius:10px;border:1px solid var(--border);" alt="Receipt"></a>';
    });
  }
}

function detailRow(label, value) {
  return '<div class="row-between"><span class="rs">' + label + '</span><span class="rt" style="text-align:right;max-width:60%;">' + value + '</span></div>';
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
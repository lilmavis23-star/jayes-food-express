'use strict';
/* Munch Express — customer order tracking. */

function openTrackOrder() {
  renderTrackScreen();
  showScreen('track-order');
}

function renderTrackScreen() {
  var el = document.getElementById('screen-track-order');
  if (!el) return;

  var h = '<div class="screen-head">';
  h += '<button class="back-btn" onclick="openHome()">Back</button>';
  h += '<h2>Track Order</h2></div>';
  h += '<div class="form-body">';
  h += '<p style="font-size:14px;color:var(--muted);margin-bottom:20px;">Enter your order code and the phone number you used at checkout.</p>';
  h += '<div class="field"><label for="tr-code">Order Code</label>';
  h += '<input id="tr-code" placeholder="e.g. MUNCH-193D" style="text-transform:uppercase;"></div>';
  h += '<div class="field"><label for="tr-phone">Phone Number</label>';
  h += '<input id="tr-phone" type="tel" placeholder="080XXXXXXXX"></div>';
  h += '<button class="btn btn-orange btn-block" id="tr-submit" onclick="lookupOrder()">Find My Order</button>';
  h += '<div id="tr-result" style="margin-top:20px;"></div>';
  h += '</div>';
  el.innerHTML = h;
}

function lookupOrder() {
  var code = fieldVal('tr-code').toUpperCase();
  var phone = fieldVal('tr-phone');

  if (!code) { toast('Please enter your order code.'); return; }
  if (!phone || phone.replace(/\D/g, '').length < 7) { toast('Please enter your phone number.'); return; }

  var btn = document.getElementById('tr-submit');
  var result = document.getElementById('tr-result');
  if (btn) { btn.disabled = true; btn.textContent = 'Searching...'; }
  if (result) result.innerHTML = '';

  SupaOrders.track(code, phone)
    .then(function (order) {
      if (!order) {
        if (result) {
          result.innerHTML = '<div style="background:var(--red-bg);border-radius:12px;padding:16px;text-align:center;">' +
            '<p style="font-size:14px;color:var(--red);font-weight:700;margin:0;">No order found</p>' +
            '<p style="font-size:12px;color:var(--muted);margin-top:6px;">Check that your code and phone number are correct.</p>' +
          '</div>';
        }
        return;
      }
      renderTrackResult(order);
    })
    .catch(function (err) {
      console.error('[Munch] Track failed:', err);
      toast('Could not look up order.');
    })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Find My Order'; }
    });
}

function renderTrackResult(order) {
  var result = document.getElementById('tr-result');
  if (!result) return;

  var status = order.status || 'awaiting';
  var steps = [
    { key: 'awaiting',  label: 'Order Received',   desc: 'Waiting for the restaurant to confirm payment', at: order.created_at },
    { key: 'accepted',  label: 'Accepted',         desc: 'Payment confirmed, preparing your food',        at: order.accepted_at },
    { key: 'ready',     label: 'Ready for Pickup', desc: 'Food is cooked and packed',                     at: order.ready_at },
    { key: 'delivered', label: 'Delivered',        desc: 'Order has been delivered or picked up',         at: order.delivered_at }
  ];
  var statusOrder = ['awaiting', 'accepted', 'ready', 'delivered'];
  var currentIndex = statusOrder.indexOf(status);

  var html = '';
  html += '<div style="background:var(--teal-soft);border-radius:14px;padding:16px;margin-bottom:20px;">';
  html += '<p style="font-size:11px;color:var(--teal);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:4px;">Order Code</p>';
  html += '<p style="font-family:monospace;font-size:20px;font-weight:900;color:var(--teal);margin:0;">' + esc(order.order_code) + '</p>';
  html += '<p style="font-size:13px;color:var(--text);margin-top:8px;">From <strong>' + esc(order.restaurant_name) + '</strong></p>';
  html += '</div>';

  html += '<p style="font-size:13px;font-weight:800;color:var(--teal);margin-bottom:14px;">Progress</p>';

  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var reached = i <= currentIndex;
    var isCurrent = i === currentIndex;
    var dotBg = reached ? 'var(--teal)' : 'var(--border)';
    var check = reached ? '\u2713' : '';
    var textColor = reached ? 'var(--text)' : 'var(--muted)';
    var weight = isCurrent ? '800' : '700';

    html += '<div style="display:flex;gap:12px;">';
    html += '<div style="flex:none;display:flex;flex-direction:column;align-items:center;">';
    html += '<div style="width:24px;height:24px;border-radius:50%;background:' + dotBg + ';color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800;">' + check + '</div>';
    if (i < steps.length - 1) {
      html += '<div style="width:2px;flex:1;min-height:24px;background:' + (reached && i < currentIndex ? 'var(--teal)' : 'var(--border)') + ';margin-top:4px;margin-bottom:4px;"></div>';
    }
    html += '</div>';
    html += '<div style="flex:1;padding-bottom:14px;">';
    html += '<p style="font-size:14px;font-weight:' + weight + ';color:' + textColor + ';margin:0;">' + step.label + '</p>';
    html += '<p style="font-size:12px;color:var(--muted);margin-top:2px;">' + step.desc + '</p>';
    if (step.at) {
      html += '<p style="font-size:11px;color:var(--muted);margin-top:3px;">' + formatTrackTime(new Date(step.at)) + '</p>';
    }
    html += '</div></div>';
  }

  html += '<div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px;margin-top:14px;">';
  var items = Array.isArray(order.items) ? order.items : [];
  for (var j = 0; j < items.length; j++) {
    html += '<div class="row-between"><span class="rt">' + esc(items[j].name) + ' x ' + (items[j].qty || 1) + '</span>';
    html += '<span class="rt">' + money(items[j].line || 0) + '</span></div>';
  }
  html += '<div class="row-between" style="border-top:1px dashed var(--border);padding-top:10px;margin-top:10px;">';
  html += '<span class="rt">Total</span>';
  html += '<span class="rt" style="color:var(--teal);font-weight:800;">' + money(order.grand_total) + '</span></div>';
  html += '</div>';

  result.innerHTML = html;
}

function formatTrackTime(date) {
  try {
    return date.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return date.toString();
  }
}
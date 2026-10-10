'use strict';
/* Munch Express — checkout, receipt upload, order confirmation. */

var pendingReceiptBlob = null;
var pendingDeliveryLat = null;
var pendingDeliveryLng = null;

function openCheckout() {
  var data = cartLines();
  if (!data.cart || !data.lines.length) { toast('Your cart is empty.'); return; }
  closeCart();
  state.checkoutOption = 'Delivery';
  pendingReceiptBlob = null;
  pendingDeliveryLat = null;
  pendingDeliveryLng = null;
  renderCheckout();
  document.getElementById('checkout-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function setCheckoutOption(opt) {
  state.checkoutOption = opt;
  renderCheckout();
}

function renderCheckout() {
  var el = document.getElementById('checkout-body');
  if (!el) return;
  var data = cartLines();
  if (!data.cart || !data.lines.length) { closeCheckout(); openCart(); return; }
  var r = data.restaurant;
  if (!r) { closeCheckout(); openCart(); return; }
  var grand = data.foodTotal + data.deliveryFee + data.disposableFee + (data.serviceFee || 0);
  var isDel = state.checkoutOption === 'Delivery';
  var hasBank = r.bankName && r.accountNumber;

  var summaryHTML =
    '<div class="form-card"><h3>ORDER SUMMARY — ' + esc(r.name) + '</h3>' +
      data.lines.map(function (l) {
        return '<div class="row-between"><span class="rt">' + esc(l.product.name) + ' × ' + l.qty + '</span><span class="rt">' + money(l.line) + '</span></div>';
      }).join('') +
      '<div class="row-between mt8"><span class="rs">Food Total</span><span class="rt">' + money(data.foodTotal) + '</span></div>' +
      '<div class="row-between"><span class="rs">Delivery</span><span class="rt">' + money(data.deliveryFee) + '</span></div>' +
     (data.disposableFee > 0 ? '<div class="row-between"><span class="rs">Disposable Pack</span><span class="rt">' + money(data.disposableFee) + '</span></div>' : '') +
      (data.serviceFee > 0 ? '<div class="row-between"><span class="rs">Service Fee</span><span class="rt">' + money(data.serviceFee) + '</span></div>' : '') +
      '<div class="row-between"><span class="rt">Total</span><span class="rt" style="color:var(--teal)">' + money(grand) + '</span></div>' +
    '</div>';

  var bankHTML = '';
  if (hasBank) {
    bankHTML =
      '<div class="form-card">' +
        '<h3>STEP 1 — PAY</h3>' +
        '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Transfer <strong>' + money(grand) + '</strong> to the account below, then upload your receipt.</p>' +
        '<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px;">' +
          '<div class="row-between"><span class="rs">Bank</span><span class="rt">' + esc(r.bankName) + '</span></div>' +
          '<div class="row-between"><span class="rs">Account Name</span><span class="rt">' + esc(r.accountName || r.name) + '</span></div>' +
          '<div class="row-between"><span class="rs">Account Number</span><span class="rt" style="font-family:monospace;font-size:15px;">' + esc(r.accountNumber) + '</span></div>' +
        '</div>' +
        '<button type="button" class="btn btn-teal btn-block" style="margin-top:12px;" onclick="copyBankDetails()">Copy Account Details</button>' +
      '</div>';
  } else {
    bankHTML =
      '<div class="form-card">' +
        '<div style="background:#FBEEE5;border:1px solid #F3D5BE;border-radius:12px;padding:14px;font-size:13px;color:#8A4520;">' +
          'This restaurant hasn\'t set up their bank details yet. Please try again later.' +
        '</div>' +
      '</div>';
  }

  var formHTML =
    '<div class="form-card"><h3>STEP 2 — YOUR DETAILS</h3>' +
      '<div class="field"><label for="co-name">Your name *</label><input id="co-name" placeholder="e.g. John Ade"></div>' +
      '<div class="field"><label for="co-phone">Phone number *</label><input id="co-phone" type="tel" placeholder="080XXXXXXXX"></div>' +
      '<div class="field"><label>Order option</label>' +
        '<div class="radio-row">' +
          '<label class="radio-card' + (isDel ? ' sel' : '') + '"><input type="radio" name="co-opt" ' + (isDel ? 'checked' : '') + ' onchange="setCheckoutOption(\'Delivery\')">Delivery</label>' +
          '<label class="radio-card' + (!isDel ? ' sel' : '') + '"><input type="radio" name="co-opt" ' + (!isDel ? 'checked' : '') + ' onchange="setCheckoutOption(\'Pickup\')">Pickup</label>' +
        '</div></div>' +
     '<div class="field">' +
        '<label for="co-loc">Delivery location' + (isDel ? ' *' : '') + '</label>' +
        '<div class="location-row">' +
          '<input id="co-loc" placeholder="e.g. Mobalufon, near the big church">' +
          '<button type="button" class="location-pin-btn" id="co-pin-btn" onclick="pickLocationOnMap()">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
              '<circle cx="12" cy="10" r="3"/>' +
            '</svg>' +
            'Pin' +
          '</button>' +
        '</div>' +
        '<div id="co-pin-status"></div>' +
      '</div>' +
      '<div class="field"><label for="co-note">Order note / instructions</label><textarea id="co-note" rows="2" placeholder="Optional"></textarea></div>' +
    '</div>' +
    '<div class="form-card"><h3>STEP 3 — UPLOAD RECEIPT</h3>' +
      '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Take a screenshot of your transfer confirmation and upload it here.</p>' +
      '<input type="file" id="receipt-file" accept="image/*" onchange="handleReceiptUpload(this)" style="display:none;">' +
      '<div id="receipt-preview" onclick="document.getElementById(\'receipt-file\').click()" ' +
        'style="border:2px dashed var(--border);border-radius:12px;padding:24px 16px;text-align:center;cursor:pointer;background:var(--bg);">' +
        '<p style="font-size:14px;color:var(--muted);margin:0;">📸 Tap to upload receipt</p>' +
      '</div>' +
    '</div>';

  var submitHTML = hasBank
    ? '<button class="btn btn-orange btn-block" id="checkout-submit-btn" onclick="submitCheckout()">Place Order</button>' +
      '<p class="mt8" style="text-align:center;font-size:12px;color:var(--muted);">Your order will be sent to ' + esc(r.name) + ' for confirmation.</p>'
    : '';

  el.innerHTML = summaryHTML + bankHTML + formHTML + submitHTML +
    '<p class="mt8" style="text-align:center"><button class="btn-ghost" onclick="closeCheckout();openCart()">← Back to cart</button></p>';
}

function copyBankDetails() {
  var data = cartLines();
  var r = data.restaurant;
  if (!r) return;
  var text = r.bankName + '\n' + (r.accountName || r.name) + '\n' + r.accountNumber;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      toast('Account details copied');
    }).catch(function () {
      toast('Copy failed — check the details manually');
    });
  } else {
    toast('Copy the details manually');
  }
}

async function handleReceiptUpload(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  if (!/^image\//i.test(f.type)) { toast('Please choose an image file.'); input.value = ''; return; }

  var prev = document.getElementById('receipt-preview');
  if (prev) prev.innerHTML = '<p style="font-size:13px;color:var(--muted);margin:0;">Processing…</p>';

  try {
    var blob = await compressImageToBlob(f, 1000, 0.75);
    pendingReceiptBlob = blob;
    if (prev) {
      var url = URL.createObjectURL(blob);
      prev.innerHTML =
        '<img src="' + url + '" style="max-width:100%;max-height:200px;border-radius:10px;display:block;margin:0 auto;">' +
        '<p style="font-size:11px;color:var(--muted);margin-top:8px;">' + Math.round(blob.size / 1024) + ' KB — tap to change</p>';
    }
  } catch (err) {
    console.error('[Munch] Receipt error:', err);
    toast('Could not process that image.');
    pendingReceiptBlob = null;
    if (prev) prev.innerHTML = '<p style="font-size:14px;color:var(--muted);margin:0;">📸 Tap to upload receipt</p>';
  }
}

function submitCheckout() {
  var data = cartLines();
  if (!data.cart || !data.lines.length) { toast('Your cart is empty.'); return; }
  var r = data.restaurant;
  if (!r) { toast('Restaurant unavailable.'); return; }
  if (!isRestaurantOpen(r)) { toast(r.name + ' is now closed.'); return; }

  var name = fieldVal('co-name');
  var phone = fieldVal('co-phone');
  var loc = fieldVal('co-loc');
  var note = fieldVal('co-note');
  var ok = true;
  ok = markInvalid('co-name', !name) && ok;
  ok = markInvalid('co-phone', phone.replace(/\D/g, '').length < 7) && ok;
  if (state.checkoutOption === 'Delivery') ok = markInvalid('co-loc', !loc) && ok;
  if (!ok) { toast('Please fill in the required fields.'); return; }
  if (!pendingReceiptBlob) { toast('Please upload your payment receipt.'); return; }

  var btn = document.getElementById('checkout-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

  var grand = data.foodTotal + data.deliveryFee + data.disposableFee + (data.serviceFee || 0);

  SupaImages.uploadReceipt(pendingReceiptBlob)
    .then(function (receiptUrl) {
      return SupaOrders.create({
        restaurantId: r.id,
        restaurantName: r.name,
        customerName: name,
        customerPhone: phone,
        deliveryLocation: loc,
        orderOption: state.checkoutOption,
        instructions: note,
        items: data.lines.map(function (l) {
          return { name: l.product.name, qty: l.qty, price: l.price, line: l.line };
        }),
        foodTotal: data.foodTotal,
        deliveryFee: data.deliveryFee,
      grandTotal: grand,
        receiptUrl: receiptUrl,
        deliveryLat: pendingDeliveryLat,
        deliveryLng: pendingDeliveryLng
      });
    })
    .then(function (row) {
      pendingReceiptBlob = null;
      setCart(null);
      showOrderConfirmation(row.order_code, name, phone, r.name, grand);
    })
    .catch(function (err) {
      console.error('[Munch] Order failed:', err);
      toast(err.message || 'Could not place order.');
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    });
}

function showOrderConfirmation(code, customerName, customerPhone, restaurantName, total) {
  var el = document.getElementById('checkout-body');
  if (!el) return;
  el.innerHTML =
    '<div style="text-align:center;padding:20px 8px;">' +
      '<div style="width:72px;height:72px;border-radius:50%;background:var(--green-bg);' +
        'display:grid;place-items:center;margin:0 auto 16px;">' +
        '<svg viewBox="0 0 16 16" style="width:38px;height:38px;">' +
          '<path d="M4 8.5l3 3 5-6" stroke="#3E8B5F" stroke-width="2.4" fill="none" ' +
            'stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</div>' +
      '<h2 style="font-size:22px;color:var(--text);margin-bottom:6px;">Order Placed!</h2>' +
      '<p style="font-size:14px;color:var(--muted);margin-bottom:24px;">' +
        'We\'ve sent your order to <strong>' + esc(restaurantName) + '</strong>.' +
      '</p>' +
    '</div>' +
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center;margin-bottom:16px;">' +
      '<p style="font-size:12px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Your Order Code</p>' +
      '<p style="font-size:26px;font-weight:900;color:var(--teal);font-family:monospace;letter-spacing:.05em;margin:0;">' + esc(code) + '</p>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:20px;">' +
      'Save this code. You can use it to track your order status.' +
    '</p>' +
    '<button class="btn btn-outline btn-block" onclick="copyOrderCode(\'' + esc(code) + '\')" style="margin-bottom:10px;">Copy Order Code</button>' +
    '<button class="btn btn-orange btn-block" onclick="closeCheckout();openHome()">Done</button>';
}

function copyOrderCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(function () {
      toast('Order code copied');
    }).catch(function () {
      toast('Copy manually: ' + code);
    });
  } else {
    toast('Copy manually: ' + code);
  }
}

/* ============ Map location picker ============ */
function pickLocationOnMap() {
  openMapPicker(pendingDeliveryLat, pendingDeliveryLng).then(function (result) {
    if (!result) return;
    pendingDeliveryLat = result.lat;
    pendingDeliveryLng = result.lng;
    updatePinStatus();
  });
}

function updatePinStatus() {
  var el = document.getElementById('co-pin-status');
  var btn = document.getElementById('co-pin-btn');
  if (!el) return;
  if (pendingDeliveryLat && pendingDeliveryLng) {
    el.innerHTML =
      '<div class="location-status">' +
        '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M4.75 8.25l2 2 4.5-4.5"/>' +
        '</svg>' +
        'Exact location pinned' +
      '</div>';
    if (btn) btn.classList.add('active');
  } else {
    el.innerHTML = '';
    if (btn) btn.classList.remove('active');
  }
}
'use strict';
/* =====================================================================
   Jaye's Food Express — vendor dashboard, menu manager, food form,
   restaurant settings, opening hours, WhatsApp settings.
===================================================================== */

/* ============ Vendor dashboard ============ */
function showVendorDashboard() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var el = document.getElementById('screen-vendor-dashboard');
  if (!el) return;
  var open = isRestaurantOpen(r);
  var count = getProductsFor(r.id).length;
  var avail = getProductsFor(r.id).filter(function (p) { return p.available !== false; }).length;
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="openHome()">← Customer site</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p>Welcome back, ' + esc(ctx.user.email || '') + ' 👋</p>' +
    '</div>' +
    '<div class="stat-row">' +
      '<div class="stat"><div class="num">' + (open ? '🟢' : '🔴') + '</div><div class="lbl">' + (open ? 'OPEN' : 'CLOSED') + '</div></div>' +
      '<div class="stat"><div class="num">' + count + '</div><div class="lbl">FOODS</div></div>' +
      '<div class="stat"><div class="num">' + avail + '</div><div class="lbl">AVAILABLE</div></div>' +
    '</div>' +
    '<div class="quick-list">' +
      '<button class="quick-item" onclick="openMenuManager()"><span class="qi-ico">🍽️</span>Manage Menu <span class="qi-arrow">›</span></button>' +
      '<button class="quick-item" onclick="openRestaurantSettings()"><span class="qi-ico">⚙️</span>Restaurant Settings <span class="qi-arrow">›</span></button>' +
      '<button class="quick-item" onclick="openOpeningHours()"><span class="qi-ico">🕒</span>Opening Hours <span class="qi-arrow">›</span></button>' +
      '<button class="quick-item" onclick="openWhatsAppSettings()"><span class="qi-ico">💬</span>WhatsApp Settings <span class="qi-arrow">›</span></button>' +
      '<button class="quick-item" onclick="logoutVendor()"><span class="qi-ico">🚪</span>Logout <span class="qi-arrow">›</span></button>' +
    '</div>';
  showScreen('vendor-dashboard');
}

/* ============ Menu manager ============ */
function openMenuManager() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  renderMenuManager();
  showScreen('menu-manager');
}

function renderMenuManager() {
  var el = document.getElementById('screen-menu-manager');
  if (!el) return;
  var r = vendorRestaurant();
  if (!r) { showScreen('vendor-login'); return; }
  var prods = getProductsFor(r.id);
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="showVendorDashboard()">← Dashboard</button>' +
      '<h2>Manage Menu</h2>' +
      '<p>' + esc(r.name) + ' · ' + prods.length + ' item' + (prods.length === 1 ? '' : 's') + '</p>' +
    '</div>' +
    '<div style="padding:0 16px 14px"><button class="btn btn-orange btn-block" onclick="openFoodForm()">+ Add Food</button></div>' +
    '<div style="padding:0 16px">' +
      (prods.length ? prods.map(function (p) {
        var avail = p.available !== false;
        return '<div class="mm-item">' +
          imageHTML(p.image, 'rest-thumb') +
          '<div class="mm-info"><h4>' + esc(p.name) + (avail ? '' : ' <span class="unavail-tag">Hidden</span>') + '</h4>' +
            '<p class="meta">' + esc(p.category || 'Menu') + ' · ' + money(p.price) + '</p></div>' +
          '<div class="mm-actions">' +
            '<label class="switch" title="Show/hide"><input type="checkbox" ' + (avail ? 'checked' : '') +
              ' onchange="toggleAvailable(\'' + esc(p.id) + '\')"><span class="slider"></span></label>' +
            '<div style="display:flex;gap:5px">' +
              '<button class="mini-btn teal" onclick="openFoodForm(\'' + esc(p.id) + '\')">Edit</button>' +
              '<button class="mini-btn red" onclick="confirmDeleteFood(\'' + esc(p.id) + '\')">Delete</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') : '<div class="empty-state"><div class="big">🍽️</div><p>No food yet — add your first item!</p></div>') +
    '</div>';
}

function toggleAvailable(productId) {
  var p = getProduct(productId);
  if (!p) return;
  var newVal = !(p.available !== false);
  SupaData.updateProduct(productId, { available: newVal })
    .then(function () {
      toast(p.name + (newVal ? ' is now visible to customers' : ' hidden from customers'));
      renderMenuManager();
      if (state.currentRestaurantId) renderRestaurantPage();
    })
    .catch(function (err) { toast(err.message || 'Could not update.'); });
}

function confirmDeleteFood(productId)Product(productId);
  if (!p) return;
  showModal({
    title: 'Delete food?',
    body: '<p>Delete <strong>' + esc(p.name) + '</strong> permanently? This cannot be undone.</p>',
    actions: [
      { label: 'Cancel', className: 'btn-outline' },
      { label: 'Delete', className: 'btn-danger', onClick: function () { deleteFood(productId); } }
    ]
  });
}

function deleteFood(productId) {
  var p = getProduct(productId);
  SupaData.deleteProduct(productId).then(function () {
    if (p && p.image) SupaImages.remove(p.image);
    var c = getCart();
    if (c) { c.items = c.items.filter(function (it) { return it.productId !== productId; }); setCart(c); }
    toast((p ? p.name : 'Item') + ' deleted');
    renderMenuManager();
    if (state.currentRestaurantId) renderRestaurantPage();
  }).catch(function (err) {
    toast(err.message || 'Could not delete.');
  });
}

/* ============ Food form ============ */
function openFoodForm(productId) {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var p = productId ? getProduct(productId) : null;
  if (productId && (!p || p.restaurantId !== r.id)) { toast('Item not found.'div); return; }
  state.editingProductId = p ? p.id : null;
  var el = document.getElementById('screen-food-form');
  if (!el) return;
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="openMenuManager()">← Menu</button>' +
      '<h2>' + (p ? 'Edit Food' : 'Add Food') + '</h2>' +
      '<p>' + esc(r.name) + '</p>' +
    '</div>' +
    '<div style="padding:0 16px">' +
      '<input type="hidden" id="ff-image" value="' + esc(p ? p.image : '') + '">' +
      '<div class="form-card">' +
        '<div class="field"><label for="ff-name">Food name *</label>' +
          '<input id="ff-name" placeholder="e.g. Jollof Rice" value="' + esc(p ? p.name : '') + '"></div>' +
        '<div class="field"><label for="ff-price">Price (₦) *</label>' +
          '<input id="ff-price" type="number" min="0" inputmode="numeric" placeholder="2500" value="' + (p ? esc(p.price) : '') + '"></div>' +
        '<div class="field"><label for="ff-category">Category</label>' +
          categorySelect('ff-category', p ? p.category : 'Rice & Meals', FOOD_CATEGORIES) + '</div>' +
        '<div class="field"><label for="ff-desc">Description</label>' +
          '<textarea id="ff-desc" rows="2" placeholder="Short tasty description">' + esc(p ? p.description : '') + '</textarea></div>' +
        '<div class="field"><label>Food photo</label>' +
          '<div class="form-preview" id="ff-preview">' + imageHTML(p ? p.image : '🍽️', 'rest-thumb') + '</div>' +
          '<div class="upload-row">' +
            '<input id="ff-file" type="file" accept="image/*" onchange="handleImageUpload(this,\'ff-image\',\'ff-preview\',\'food\')">' +
            '<input id="ff-emoji" type="text" placeholder="Or type an emoji (e.g. 🍚) — optional" oninput="setFoodImageEmoji(this.value)">' +
          '</div>' +
          '<p class="hint">Upload a real photo of the dish. Big photos are resized automatically.</p>' +
        '</div>' +
        '<div class="row-between">' +
          '<div><div class="rt">Available</div><div class="rs">Customers can order this item</div></div>' +
          '<label class="switch"><input id="ff-available" type="checkbox" ' + (!p || p.available !== false ? 'checked' : '') + '><span class="slider"></span></label>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-outline" onclick="openMenuManager()">Cancel</button>' +
        '<button class="btn btn-orange" onclick="saveFood()">Save Food</button>' +
      '</div>' +
    '</div>';
  showScreen('food-form');
}

function setFoodImageEmoji(val) {
  var trimmed = String(val || '').trim();
  var hidden = document.getElementById('ff-image');
  var prev = document.getElementById('ff-preview');
  var current = hidden ? hidden.value : '';
  if (trimmed) {
    if (hidden) hidden.value = trimmed;
    if (prev) prev.innerHTML = imageHTML(trimmed, 'rest-thumb');
  } else if (!isImageSrc(current)) {
    if (hidden) hidden.value = '🍽️';
    if (prev) prev.innerHTML = imageHTML('🍽️', 'rest-thumb');
  }
}

async function handleImageUpload(input, hiddenId, previewId, targetKey) {
  var f = input.files && input.files[0];
  if (!f) return;
  if (!/^image\//i.test(f.type)) { toast('Please choose an image file.'); input.value = ''; return; }

  var target = IMG_TARGETS[targetKey] || IMG_TARGETS.food;
  var hidden = document.getElementById(hiddenId);
  var prev = document.getElementById(previewId);
  if (prev) prev.innerHTML = '<span class="emoji-thumb">⏳</span>';

  try {
    var blob = await compressImageToBlob(f, target.maxDim, target.quality);
    var url = await SupaImages.upload(blob, targetKey);
    if (hidden) hidden.value = url;
    if (prev) prev.innerHTML = imageHTML(url, 'rest-thumb');
    toast('Photo uploaded (' + Math.round(blob.size / 1024) + ' KB)');
  } catch (err) {
    console.warn('[Jaye] Image upload failed:', err);
    toast(err.message || 'Could not upload image.');
    if (prev) prev.innerHTML = imageHTML((hidden && hidden.value) || '🍽️', 'rest-thumb');
  }
}

function saveFood() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var name = fieldVal('ff-name');
  var price = toNum(fieldVal('ff-price'), -1);
  var category = fieldVal('ff-category') || 'Menu';
  var desc = fieldVal('ff-desc');
  var imgEl = document.getElementById('ff-image');
  var image = imgEl ? imgEl.value.trim() : '';
  var availEl = document.getElementById('ff-available');
  var available = availEl ? availEl.checked : true;
  var ok = true;
  ok = markInvalid('ff-name', !name) && ok;
  ok = markInvalid('ff-price', !(price >= 0)) && ok;
  if (!ok) { toast('Please fill in the required fields.'); return; }

  var payload = {
    restaurantId: r.id,
    name: name, price: price, category: category,
    description: desc, image: image, available: available
  };

  var promise = state.editingProductId
    ? SupaData.updateProduct(state.editingProductId, payload)
    : SupaData.createProduct(payload);

  promise.then(function () {
    toast(state.editingProductId ? 'Food updated' : 'Food added');
    state.editingProductId = null;
    openMenuManager();
  }).catch(function (err) {
    console.error('[Jaye] Save food failed:', err);
    toast(err.message || 'Could not save food.');
  });
}

/* ============ Restaurant settings ============ */
function openRestaurantSettings() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var el = document.getElementById('screen-restaurant-settings');
  if (!el) return;
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="showVendorDashboard()">← Dashboard</button>' +
      '<h2>Restaurant Settings</h2>' +
    '</div>' +
    '<div style="padding:0 16px">' +
      '<input type="hidden" id="rs-image" value="' + esc(r.image) + '">' +
      '<div class="form-card">' +
        '<div class="form-preview" id="rs-preview">' + imageHTML(r.image, 'rest-thumb') + '</div>' +
        '<div class="upload-row">' +
          '<input id="rs-file" type="file" accept="image/*" onchange="handleImageUpload(this,\'rs-image\',\'rs-preview\',\'restaurant\')">' +
          '<input id="rs-emoji" type="text" placeholder="Or type an emoji (e.g. 🍲) — optional" value="' + (isImageSrc(r.image) ? '' : esc(r.image)) + '" oninput="setSettingsImageEmoji(this.value)">' +
        '</div>' +
        '<p class="hint">Upload a photo of your restaurant, logo or signature dish.</p>' +
        '<div class="field mt14"><label for="rs-name">Restaurant name *</label>' +
          '<input id="rs-name" value="' + esc(r.name) + '"></div>' +
        '<div class="field"><label for="rs-phone">Phone</label>' +
          '<input id="rs-phone" type="tel" value="' + esc(r.phone) + '"></div>' +
        '<div class="field"><label for="rs-addr">Address</label>' +
          '<input id="rs-addr" value="' + esc(r.address) + '"></div>' +
        '<div class="field"><label for="rs-cat">Category</label>' +
          categorySelect('rs-cat', r.category, STORE_CATEGORIES) + '</div>' +
        '<div class="field"><label for="rs-fee">Delivery fee (₦)</label>' +
          '<input id="rs-fee" type="number" min="0" inputmode="numeric" value="' + esc(r.deliveryFee) + '"></div>' +
        '<div class="field"><label for="rs-time">Estimated delivery time</label>' +
          '<input id="rs-time" value="' + esc(r.deliveryTime) + '"></div>' +
        '<div class="field"><label for="rs-desc">Description</label>' +
          '<textarea id="rs-desc" rows="2">' + esc(r.description) + '</textarea></div>' +
        '<div class="row-between">' +
          '<div><div class="rt">Restaurant active</div><div class="rs">Inactive restaurants never appear as open</div></div>' +
          '<label class="switch"><input id="rs-active" type="checkbox" ' + (r.active !== false ? 'checked' : '') + '><span class="slider"></span></label>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-outline" onclick="showVendorDashboard()">Cancel</button>' +
        '<button class="btn btn-orange" onclick="saveRestaurantSettings()">Save Settings</button>' +
      '</div>' +
    '</div>';
  showScreen('restaurant-settings');
}

function setSettingsImageEmoji(val) {
  var trimmed = String(val || '').trim();
  var hidden = document.getElementById('rs-image');
  var prev = document.getElementById('rs-preview');
  var current = hidden ? hidden.value : '';
  if (trimmed) {
    if (hidden) hidden.value = trimmed;
    if (prev) prev.innerHTML = imageHTML(trimmed, 'rest-thumb');
  } else if (!isImageSrc(current)) {
    if (hidden) hidden.value = '🍽️';
    if (prev) prev.innerHTML = imageHTML('🍽️', 'rest-thumb');
  }
}

function saveRestaurantSettings() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var name = fieldVal('rs-name');
  if (!name) { markInvalid('rs-name', true); toast('Restaurant name is required.'); return; }
  var imgEl = document.getElementById('rs-image');
  var patch = {
    name: name,
    phone: fieldVal('rs-phone'),
    address: fieldVal('rs-addr'),
    category: fieldVal('rs-cat') || 'General',
    deliveryFee: Math.max(0, toNum(fieldVal('rs-fee'))),
    deliveryTime: fieldVal('rs-time') || '30–45 min',
    description: fieldVal('rs-desc'),
    image: imgEl ? imgEl.value.trim() : '',
    active: (document.getElementById('rs-active') || {}).checked !== false
  };
  SupaData.updateRestaurant(r.id, patch)
    .then(function () { return refreshVendorContext(); })
    .then(function () {
      toast('Settings saved');
      showVendorDashboard();
    })
    .catch(function (err) {
      console.error('[Jaye] Settings save failed:', err);
      toast(err.message || 'Could not save.');
    });
}

/* ============ Opening hours ============ */
function openOpeningHours() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var el = document.getElementById('screen-opening-hours');
  if (!el) return;
  var open = isRestaurantOpen(r);
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="showVendorDashboard()">← Dashboard</button>' +
      '<h2>Opening Hours</h2>' +
      '<p>Customers see your restaurant as <strong>' + (open ? '🟢 Open' : '🔴 Closed') + '</strong> right now.</p>' +
    '</div>' +
    '<div style="padding:0 16px">' +
      '<div class="form-card">' +
        '<div class="field"><label for="oh-open">Opening time</label>' +
          '<input id="oh-open" type="time" value="' + esc(r.openingTime || '08:00') + '"></div>' +
        '<div class="field"><label for="oh-close">Closing time</label>' +
          '<input id="oh-close" type="time" value="' + esc(r.closingTime || '20:00') + '"></div>' +
        '<p class="hint">If closing time is earlier than opening time, hours are treated as overnight.</p>' +
        '<div class="row-between">' +
          '<div><div class="rt">Restaurant active</div><div class="rs">Inactive stays closed regardless of hours</div></div>' +
          '<label class="switch"><input id="oh-active" type="checkbox" ' + (r.active !== false ? 'checked' : '') + '><span class="slider"></span></label>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-outline" onclick="showVendorDashboard()">Cancel</button>' +
        '<button class="btn btn-orange" onclick="saveOpeningHours()">Save Hours</button>' +
      '</div>' +
    '</div>';
  showScreen('opening-hours');
}

function saveOpeningHours() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var o = fieldVal('oh-open'), c = fieldVal('oh-close');
  if (!o || !c) { toast('Please set both opening and closing time.'); return; }
  var patch = {
    openingTime: o, closingTime: c,
    active: (document.getElementById('oh-active') || {}).checked !== false
  };
  SupaData.updateRestaurant(r.id, patch)
    .then(function () { return refreshVendorContext(); })
    .then(function () {
      toast('Opening hours saved');
      showVendorDashboard();
    })
    .catch(function (err) { toast(err.message || 'Could not save.'); });
}

/* ============ WhatsApp settings ============ */
function openWhatsAppSettings() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var el = document.getElementById('screen-whatsapp-settings');
  if (!el) return;
  el.innerHTML =
    '<div class="dash-head">' +
      '<button class="back-btn" onclick="showVendorDashboard()">← Dashboard</button>' +
      '<h2>WhatsApp Settings</h2>' +
      '<p>Orders for ' + esc(r.name) + ' are sent to your WhatsApp.</p>' +
    '</div>' +
    '<div style="padding:0 16px">' +
      '<div class="form-card">' +
        '<div class="field"><label for="ws-num">WhatsApp number *</label>' +
          '<input id="ws-num" type="tel" placeholder="080XXXXXXXX or 2348012345678" value="' + esc(r.whatsapp) + '">' +
          '<p class="hint">Include country code if outside Nigeria. Nigerian numbers starting with 0 are converted automatically.</p></>' +
        '<div class="row-between">' +
          '<div><div class="rt">Number preview</div><div class="rs" id="ws-preview">' + esc(normalizeWhatsApp(r.whatsapp) || '—') + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-outline" onclick="showVendorDashboard()">Cancel</button>' +
        '<button class="btn btn-orange" onclick="saveWhatsAppSettings()">Save Number</button>' +
      '</div>' +
    '</div>';
  var inp = document.getElementById('ws-num');
  if (inp) inp.addEventListener('input', function () {
    var pv = document.getElementById('ws-preview');
    if (pv) pv.textContent = normalizeWhatsApp(inp.value) || '—';
  });
  showScreen('whatsapp-settings');
}

function saveWhatsAppSettings() {
  var ctx = requireVendorScreen();
  if (!ctx) return;
  var r = ctx.restaurant;
  var num = fieldVal('ws-num');
  if (normalizeWhatsApp(num).length < 10) { markInvalid('ws-num', true); toast('Enter a valid WhatsApp number.'); return; }
  SupaData.updateRestaurant(r.id, { whatsapp: num })
    .then(function () { return refreshVendorContext(); })
    .then(function () {
      toast('WhatsApp number saved');
      showVendorDashboard();
    })
    .catch(function (err) { toast(err.message || 'Could not save.'); });
}
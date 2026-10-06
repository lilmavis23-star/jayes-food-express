'use strict';
/* Munch Express — Supabase data layer. */

var SUPABASE_URL  = 'https://wdbwjloupkucxpdmounh.supabase.co';
var SUPABASE_ANON = 'sb_publishable_UbNd45Z3sw3OnjEIvaLXlA_cwblbZJC';

if (!window.supabase || !window.supabase.createClient) {
  console.error('[Munch] Supabase JS not loaded.');
}
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

function slugify(str) {
  return String(str || 'restaurant')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'restaurant';
}

var SupaCache = {
  restaurants: [],
  products:    [],
  loaded:      false
};

function rFromDB(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug || '',
    category: row.category || 'General',
    rating: row.rating != null ? Number(row.rating) : 5.0,
    description: row.description || '',
    image: row.image_url || '🍽️',
    active: row.active !== false,
    openingTime: row.opening_time || '08:00',
    closingTime: row.closing_time || '20:00',
    whatsapp: row.whatsapp || '',
    phone: row.phone || '',
    address: row.address || '',
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : 0,
    disposableFee: row.disposable_fee != null ? Number(row.disposable_fee) : 0,
    deliveryTime: row.delivery_time || '30–45 min',
    bankName: row.bank_name || '',
    accountName: row.account_name || '',
    accountNumber: row.account_number || ''
  };
}
function rToDB(r) {
  var out = {};
  if (r.name          !== undefined) out.name           = r.name;
  if (r.slug          !== undefined) out.slug           = r.slug;
  if (r.category      !== undefined) out.category       = r.category;
  if (r.rating        !== undefined) out.rating         = r.rating;
  if (r.description   !== undefined) out.description    = r.description;
  if (r.image         !== undefined) out.image_url      = r.image;
  if (r.active        !== undefined) out.active         = r.active;
  if (r.openingTime   !== undefined) out.opening_time   = r.openingTime;
  if (r.closingTime   !== undefined) out.closing_time   = r.closingTime;
  if (r.whatsapp      !== undefined) out.whatsapp       = r.whatsapp;
  if (r.phone         !== undefined) out.phone          = r.phone;
  if (r.address       !== undefined) out.address        = r.address;
  if (r.deliveryFee   !== undefined) out.delivery_fee   = r.deliveryFee;
  if (r.disposableFee !== undefined) out.disposable_fee = r.disposableFee;
  if (r.deliveryTime  !== undefined) out.delivery_time  = r.deliveryTime;
  if (r.bankName      !== undefined) out.bank_name      = r.bankName;
  if (r.accountName   !== undefined) out.account_name   = r.accountName;
  if (r.accountNumber !== undefined) out.account_number = r.accountNumber;
  return out;
}
function pFromDB(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    price: row.price != null ? Number(row.price) : 0,
    category: row.category || 'Menu',
    description: row.description || '',
    image: row.image_url || '🍽️',
    available: row.available !== false
  };
}
function pToDB(p) {
  var out = {};
  if (p.restaurantId !== undefined) out.restaurant_id = p.restaurantId;
  if (p.name         !== undefined) out.name          = p.name;
  if (p.price        !== undefined) out.price         = p.price;
  if (p.category     !== undefined) out.category      = p.category;
  if (p.description  !== undefined) out.description   = p.description;
  if (p.image        !== undefined) out.image_url     = p.image;
  if (p.available    !== undefined) out.available     = p.available;
  return out;
}

var SupaData = {
  loadAll: function () {
    return Promise.all([
      sb.from('restaurants').select('*').order('created_at', { ascending: true }),
      sb.from('products').select('*').order('created_at', { ascending: true })
    ]).then(function (results) {
      var rRes = results[0], pRes = results[1];
      if (rRes.error) throw rRes.error;
      if (pRes.error) throw pRes.error;
      SupaCache.restaurants = (rRes.data || []).map(rFromDB);
      SupaCache.products    = (pRes.data || []).map(pFromDB);
      SupaCache.loaded = true;
    });
  },
  reloadRestaurants: function () {
    return sb.from('restaurants').select('*').order('created_at', { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        SupaCache.restaurants = (res.data || []).map(rFromDB);
      });
  },
  reloadProducts: function () {
    return sb.from('products').select('*').order('created_at', { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        SupaCache.products = (res.data || []).map(pFromDB);
      });
  },
  getRestaurants: function () { return SupaCache.restaurants; },
  getProducts:    function () { return SupaCache.products; },
  getProductsFor: function (id) {
    return SupaCache.products.filter(function (p) { return p.restaurantId === id; });
  },
  getRestaurant: function (id) {
    for (var i = 0; i < SupaCache.restaurants.length; i++) {
      if (SupaCache.restaurants[i].id === id) return SupaCache.restaurants[i];
    }
    return null;
  },
  getRestaurantBySlug: function (slug) {
    for (var i = 0; i < SupaCache.restaurants.length; i++) {
      if (SupaCache.restaurants[i].slug === slug) return SupaCache.restaurants[i];
    }
    return null;
  },
  getProduct: function (id) {
    for (var i = 0; i < SupaCache.products.length; i++) {
      if (SupaCache.products[i].id === id) return SupaCache.products[i];
    }
    return null;
  },
  createRestaurant: function (data, ownerId) {
    var payload = rToDB(data);
    payload.owner_id = ownerId;
    payload.slug = slugify(data.name) + '-' + Math.random().toString(36).slice(2, 6);
    return sb.from('restaurants').insert(payload).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        var mapped = rFromDB(res.data);
        SupaCache.restaurants.push(mapped);
        return mapped;
      });
  },
  updateRestaurant: function (id, patch) {
    return sb.from('restaurants').update(rToDB(patch)).eq('id', id).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        var mapped = rFromDB(res.data);
        for (var i = 0; i < SupaCache.restaurants.length; i++) {
          if (SupaCache.restaurants[i].id === id) { SupaCache.restaurants[i] = mapped; break; }
        }
        return mapped;
      });
  },
  createProduct: function (data) {
    return sb.from('products').insert(pToDB(data)).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        var mapped = pFromDB(res.data);
        SupaCache.products.push(mapped);
        return mapped;
      });
  },
  updateProduct: function (id, patch) {
    return sb.from('products').update(pToDB(patch)).eq('id', id).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        var mapped = pFromDB(res.data);
        for (var i = 0; i < SupaCache.products.length; i++) {
          if (SupaCache.products[i].id === id) { SupaCache.products[i] = mapped; break; }
        }
        return mapped;
      });
  },
  deleteProduct: function (id) {
    return sb.from('products').delete().eq('id', id).then(function (res) {
      if (res.error) throw res.error;
      SupaCache.products = SupaCache.products.filter(function (p) { return p.id !== id; });
    });
  }
};

var SupaAuth = {
  signUp: function (email, password, meta) {
    return sb.auth.signUp({
      email: email,
      password: password,
      options: { data: meta || {}, emailRedirectTo: 'https://munchxpress.com.ng' }
    }).then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  },
  signIn: function (email, password) {
    return sb.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  },
  signOut: function () { return sb.auth.signOut(); },
  getUser: function () {
    return sb.auth.getUser().then(function (res) {
      if (res.error || !res.data) return null;
      return res.data.user || null;
    });
  },
  onAuthChange: function (cb) {
    sb.auth.onAuthStateChange(function (event, session) { cb(event, session); });
  }
};

var SupaImages = {
  upload: function (blob, pathHint) {
    var ext = (blob.type && blob.type.indexOf('png') !== -1) ? 'png' : 'jpg';
    var path = (pathHint || 'img') + '_' + Date.now() + '_' +
               Math.random().toString(36).slice(2, 7) + '.' + ext;
    return sb.storage.from('jayes-images').upload(path, blob, {
      cacheControl: '3600', upsert: false,
      contentType: blob.type || 'image/jpeg'
    }).then(function (res) {
      if (res.error) throw res.error;
      var pub = sb.storage.from('jayes-images').getPublicUrl(path);
      return pub.data.publicUrl;
    });
  },
  uploadReceipt: function (blob) {
    var path = 'receipt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.jpg';
    return sb.storage.from('munch-receipts').upload(path, blob, {
      cacheControl: '3600', upsert: false,
      contentType: blob.type || 'image/jpeg'
    }).then(function (res) {
      if (res.error) throw res.error;
      return path;
    });
  },

  getReceiptUrl: function (path) {
    if (!path) return Promise.resolve(null);
    /* If it's already a full URL (old data), extract the path */
    var clean = path;
    var marker = '/munch-receipts/';
    var idx = path.indexOf(marker);
    if (idx !== -1) clean = path.slice(idx + marker.length).split('?')[0];

    return sb.storage.from('munch-receipts').createSignedUrl(clean, 3600)
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data ? res.data.signedUrl : null;
      })
      .catch(function (err) {
        console.warn('[Munch] Signed URL failed:', err);
        return null;
      });
  },
  remove: function (publicUrl) {
    if (!publicUrl || typeof publicUrl !== 'string') return Promise.resolve();
    var marker = '/jayes-images/';
    var idx = publicUrl.indexOf(marker);
    if (idx === -1) return Promise.resolve();
    var path = publicUrl.slice(idx + marker.length).split('?')[0];
    return sb.storage.from('jayes-images').remove([path]).catch(function () {});
  }
};

var SupaRealtime = {
  channel: null,
  start: function (onChange) {
    if (SupaRealtime.channel) return;
    SupaRealtime.channel = sb.channel('munch-public-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, function () {
        SupaData.reloadRestaurants().then(onChange).catch(console.warn);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, function () {
        SupaData.reloadProducts().then(onChange).catch(console.warn);
      })
      .subscribe(function (status) { console.log('[Munch realtime]', status); });
  },
  stop: function () {
    if (SupaRealtime.channel) { sb.removeChannel(SupaRealtime.channel); SupaRealtime.channel = null; }
  }
};

var SupaOrders = {
  create: function (order) {
    return sb.rpc('create_order', {
      p_restaurant_id: order.restaurantId,
      p_restaurant_name: order.restaurantName,
      p_customer_name: order.customerName,
      p_customer_phone: order.customerPhone,
      p_delivery_location: order.deliveryLocation || '',
      p_order_option: order.orderOption || 'Delivery',
      p_instructions: order.instructions || '',
      p_items: order.items,
      p_food_total: order.foodTotal,
      p_delivery_fee: order.deliveryFee,
      p_grand_total: order.grandTotal,
      p_receipt_url: order.receiptUrl || ''
    }).then(function (res) {
      if (res.error) throw res.error;
      var row = res.data && res.data[0];
      if (!row) throw new Error('Could not create order');
      return row;
    });
  },
  listForRestaurant: function (restaurantId, limit) {
    var q = sb.from('orders').select('*').eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    return q.then(function (res) {
      if (res.error) throw res.error;
      return res.data || [];
    });
  },
  getById: function (id) {
    return sb.from('orders').select('*').eq('id', id).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || null;
      });
  },
  updateStatus: function (id, status) {
    var patch = { status: status };
    var now = new Date().toISOString();
    if (status === 'accepted')  patch.accepted_at  = now;
    if (status === 'ready')     patch.ready_at     = now;
    if (status === 'delivered') patch.delivered_at = now;
    return sb.from('orders').update(patch).eq('id', id).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  },
  track: function (code, phone) {
    return sb.rpc('track_order', { p_code: code, p_phone: phone })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data && res.data[0] ? res.data[0] : null;
      });
  }
};
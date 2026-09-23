'use strict';
/* =====================================================================
   Supabase layer for Munch Express.
   Loaded BEFORE app.js. Exposes:
     - sb            : the Supabase client
     - SupaCache     : in-memory mirror of restaurants + products
     - SupaData      : CRUD helpers
     - SupaAuth      : auth helpers
     - SupaImages    : storage upload/remove
     - SupaRealtime  : realtime subscription
     - SupaOrders    : order logging + admin access
   ===================================================================== */

/* ---- REPLACE THESE THREE LINES WITH YOUR OWN VALUES ---- */
var SUPABASE_URL  = 'https://wdbwjloupkucxpdmounh.supabase.co/';
var SUPABASE_ANON = 'sb_publishable_UbNd45Z3sw3OnjEIvaLXlA_cwblbZJC';
var ADMIN_EMAIL   = 'lilmavis23@gmail.com';
/* ------------------------------------------------------- */

if (!window.supabase || !window.supabase.createClient) {
  console.error('[Munch] Supabase JS not loaded. Check the CDN script tag.');
}
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ---- In-memory cache ---- */
var SupaCache = {
  restaurants: [],
  products:    [],
  loaded:      false
};

/* ---- Row mappers: DB (snake_case) <-> App (camelCase) ---- */
function rFromDB(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
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
    deliveryTime: row.delivery_time || '30–45 min'
  };
}
function rToDB(r) {
  var out = {};
  if (r.name         !== undefined) out.name          = r.name;
  if (r.category     !== undefined) out.category      = r.category;
  if (r.rating       !== undefined) out.rating        = r.rating;
  if (r.description  !== undefined) out.description   = r.description;
  if (r.image        !== undefined) out.image_url     = r.image;
  if (r.active       !== undefined) out.active        = r.active;
  if (r.openingTime  !== undefined) out.opening_time  = r.openingTime;
  if (r.closingTime  !== undefined) out.closing_time  = r.closingTime;
  if (r.whatsapp     !== undefined) out.whatsapp      = r.whatsapp;
  if (r.phone        !== undefined) out.phone         = r.phone;
  if (r.address      !== undefined) out.address       = r.address;
  if (r.deliveryFee  !== undefined) out.delivery_fee  = r.deliveryFee;
  if (r.deliveryTime !== undefined) out.delivery_time = r.deliveryTime;
  return out;
}
function pFromDB(row)) {
  return {
    id: row.id,
    restaurantId: row {.restaurant_id,
    name: row.name,
 return    price: row.price != null ? Number(row.price) p : 0,
    category: row.category || '.restMenu',
    description: row.description || '',
    image:aurant row.image_url || '🍽️',
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

/* ---- Data helpers ---- */
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
    return SupaCache.products.filter(function (pId === id; });
  },
  getRestaurant: function (id) {
    for (var i = 0; i < SupaCache.restaurants.length; i++) {
      if (SupaCache.restaurants[i].id === id) return SupaCache.restaurants[i];
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

/* ---- Auth helpers ---- */
var SupaAuth = {
  signUp: function (email, password, meta) {
    return sb.auth.signUp({
      email: email,
      password: password,
      options: { data: meta || {} }
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
    sb.auth.onAuthStateChange(function (event, session) {
      cb(event, session);
    });
  }
};

/* ---- Storage helpers ---- */
var SupaImages = {
  upload: function (blob, pathHint) {
    var ext = (blob.type && blob.type.indexOf('png') !== -1) ? 'png' : 'jpg';
    var path = (pathHint || 'img') + '_' + Date.now() + '_' +
               Math.random().toString(36).slice(2, 7) + '.' + ext;
    return sb.storage.from('jayes-images').upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'image/jpeg'
    }).then(function (res) {
      if (res.error) throw res.error;
      var pub = sb.storage.from('jayes-images').getPublicUrl(path);
      return pub.data.publicUrl;
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

/* ---- Realtime ---- */
var SupaRealtime = {
  channel: null,
  start: function (onChange) {
    if (SupaRealtime.channel) return;
    SupaRealtime.channel = sb.channel('munch-public-changes')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'restaurants' },
          function () {
            console.log('[Munch realtime] restaurants changed');
            SupaData.reloadRestaurants().then(onChange).catch(console.warn);
          })
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          function () {
            console.log('[Munch realtime] products changed');
            SupaData.reloadProducts().then(onChange).catch(console.warn);
          })
      .subscribe(function (status) {
        console.log('[Munch realtime] status:', status);
      });
  },
  stop: function () {
    if (SupaRealtime.channel) {
      sb.removeChannel(SupaRealtime.channel);
      SupaRealtime.channel = null;
    }
  }
};

/* ---- Orders ---- */
var SupaOrders = {
  create: function (order) {
    return sb.from('orders').insert({
      restaurant_id: order.restaurantId,
      restaurant_name: order.restaurantName,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      delivery_location: order.deliveryLocation,
      order_option: order.orderOption,
      instructions: order.instructions,
      items: order.items,
      food_total: order.foodTotal,
      delivery_fee: order.deliveryFee,
      grand_total: order.grandTotal,
      status: 'submitted'
    }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  },

  list: function () {
    return sb.from('orders').select('*').order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  },

  isAdmin: function () {
    return currentVendorUser && currentVendorUser.email === ADMIN_EMAIL;
  }
};
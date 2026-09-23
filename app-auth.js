'use strict';
/* =====================================================================
   Jaye's Food Express — vendor authentication via Supabase Auth.
===================================================================== */

function vendorRestaurant() { return currentVendorRestaurant; }
function currentVendor()    { return currentVendorUser; }

function refreshVendorContext() {
  return SupaAuth.getUser().then(function (user) {
    currentVendorUser = user;
    if (!user) { currentVendorRestaurant = null; return null; }
    return sb.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        currentVendorRestaurant = res.data ? rFromDB(res.data) : null;
        if (currentVendorRestaurant) {
          var list = getRestaurants();
          var found = false;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === currentVendorRestaurant.id) {
              SupaCache.restaurants[i] = currentVendorRestaurant;
              found = true;
              break;
            }
          }
          if (!found) SupaCache.restaurants.push(currentVendorRestaurant);
        }
        return currentVendorRestaurant;
      });
  });
}

function requireVendorScreen() {
  if (!currentVendorUser || !currentVendorRestaurant) {
    openVendorLogin();
    return null;
  }
  return { user: currentVendorUser, restaurant: currentVendorRestaurant };
}

function openVendorAccess() {
  refreshVendorContext().then(function (restaurant) {
    if (restaurant) showVendorDashboard();
    else openVendorLogin();
  }).catch(function (err) {
    console.warn('[Jaye] vendor context failed:', err);
    openVendorLogin();
  });
}
function openVendorLogin()    { showScreen('vendor-login'); }
function openVendorRegister() { showScreen('vendor-register'); }

function handleVendorRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  var rname = fieldVal('vr-rname'), oname = fieldVal('vr-oname'),
      email = fieldVal('vr-email').toLowerCase(),
      phone = fieldVal('vr-phone'),
      passEl = document.getElementById('vr-pass'),
      pass = passEl ? passEl.value : '';
  var ok = true;
  ok = markInvalid('vr-rname', !rname) && ok;
  ok = markInvalid('vr-oname', !oname) && ok;
  ok = markInvalid('vr-email', !/^\S+@\S+\.\S+$/.test(email)) && ok;
  ok = markInvalid('vr-phone', phone.replace(/\D/g, '').length < 7) && ok;
  ok = markInvalid('vr-pass', pass.length < 6) && ok;
  if (!ok) { toast('Please complete all fields correctly.'); return false; }

  var btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  SupaAuth.signUp(email, pass, { owner_name: oname })
    .then(function (data) {
      if (data && data.session) return data;
      return SupaAuth.signIn(email, pass);
    })
    .then(function (data) {
      var userId = data && data.user ? data.user.id :
                   (data && data.session && data.session.user ? data.session.user.id : null);
      if (!userId) throw new Error('Could not establish session after signup.');
      return SupaData.createRestaurant({
        name: rname, category: 'General', rating: 5.0,
        description: '', image: '🍽️', active: false,
        openingTime: '08:00', closingTime: '20:00',
        whatsapp: phone, phone: phone, address: '',
        deliveryFee: 1000, deliveryTime: '30–45 min'
      }, userId);
    })
    .then(function () { return refreshVendorContext(); })
    .then(function () {
      toast('Welcome, ' + oname + '!');
      showVendorDashboard();
    })
    .catch(function (err) {
      console.error('[Jaye] Signup failed:', err);
      toast(err.message || 'Could not create account.');
    })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    });

  return false;
}

function handleVendorLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  var email = fieldVal('vl-email').toLowerCase();
  var passEl = document.getElementById('vl-pass');
  var pass = passEl ? passEl.value : '';
  if (!email || !pass) { toast('Please enter email and password.'); return false; }

  var btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  SupaAuth.signIn(email, pass)
    .then(function () { return refreshVendorContext(); })
    .then(function (restaurant) {
      if (!restaurant) {
        toast('Signed in, but no restaurant is linked to this account.');
        openVendorLogin();
        return;
      }
      toast('Welcome back!');
      showVendorDashboard();
    })
    .catch(function (err) {
      console.error('[Jaye] Login failed:', err);
      toast(err.message || 'Invalid email or password.');
    })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
    });

  return false;
}

function logoutVendor() {
  SupaAuth.signOut().then(function () {
    currentVendorUser = null;
    currentVendorRestaurant = null;
    toast('Logged out.');
    openVendorLogin();
  });
}

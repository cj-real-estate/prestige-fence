// Prestige Fence — shared site behavior
document.body.classList.add('js');

// Year
var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Sticky header shadow
var hdr = document.getElementById('hdr');
if (hdr) {
  addEventListener('scroll', function(){ hdr.classList.toggle('scrolled', scrollY > 10); }, { passive: true });
}

// Mobile menu
var mm = document.getElementById('mobile-menu');
if (mm) {
  var mo = document.getElementById('menu-open');
  var mc = document.getElementById('menu-close');
  if (mo) mo.addEventListener('click', function(){ mm.classList.add('open'); });
  if (mc) mc.addEventListener('click', function(){ mm.classList.remove('open'); });
  Array.prototype.forEach.call(mm.querySelectorAll('a'), function(a){
    a.addEventListener('click', function(){ mm.classList.remove('open'); });
  });
}

// Reveal on scroll
var rvEls = document.querySelectorAll('.rv');
if ('IntersectionObserver' in window && rvEls.length) {
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  rvEls.forEach(function(el){ io.observe(el); });
} else {
  rvEls.forEach(function(el){ el.classList.add('in'); });
}

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(function(item){
  var q = item.querySelector('.faq-q');
  var a = item.querySelector('.faq-a');
  if (!q || !a) return;
  q.addEventListener('click', function(){
    var open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(o){
      o.classList.remove('open');
      o.querySelector('.faq-a').style.maxHeight = null;
      var oq = o.querySelector('.faq-q');
      if (oq) oq.setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      item.classList.add('open');
      a.style.maxHeight = a.scrollHeight + 'px';
      q.setAttribute('aria-expanded', 'true');
    }
  });
});

// Quote form
var qf = document.getElementById('quote-form');
if (qf) {
  qf.addEventListener('submit', function(e){
    e.preventDefault();
    var form = this;
    var required = ['qf-name','qf-phone','qf-email'];
    var ok = true;
    var firstInvalid = null;
    required.forEach(function(id){
      var el = document.getElementById(id);
      if (!el.value.trim()) {
        el.style.borderColor = '#C0392B';
        el.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) firstInvalid = el;
        ok = false;
      } else {
        el.style.borderColor = '';
        el.removeAttribute('aria-invalid');
      }
    });
    var err = document.getElementById('qf-error');
    if (!ok) {
      if (err) {
        err.textContent = 'Please fill in the required fields: name, phone, and email.';
        err.classList.add('show');
      }
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (err) { err.textContent = ''; err.classList.remove('show'); }

    var btn = document.getElementById('qf-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    var val = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var payload = {
      name:       val('qf-name'),
      phone:      val('qf-phone'),
      email:      val('qf-email'),
      city:       val('qf-city'),
      fence_type: val('qf-type'),
      footage:    val('qf-footage'),
      notes:      val('qf-notes'),
    };

    fetch('/api/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(function(r){ return r.ok ? r : Promise.reject(r.status); })
    .then(function(){
      form.style.display = 'none';
      document.getElementById('qf-success').classList.add('show');
    })
    .catch(function(){
      btn.disabled = false;
      btn.textContent = 'Request My Free Estimate';
      alert('Something went wrong — please call 580-670-1829 or email estimating@prestigefenceusa.com.');
    });
  });
}

// Careers: "Apply for This Role" buttons pre-select the position
document.querySelectorAll('.js-apply').forEach(function(link){
  link.addEventListener('click', function(){
    var sel = document.getElementById('af-position');
    if (!sel) return;
    var want = link.getAttribute('data-position');
    Array.prototype.forEach.call(sel.options, function(o){
      if (o.text === want) sel.value = o.value || o.text;
    });
  });
});

// Careers: application form
var af = document.getElementById('apply-form');
if (af) {
  af.addEventListener('submit', function(e){
    e.preventDefault();
    var form = this;
    var required = ['af-name','af-phone','af-email','af-position'];
    var ok = true;
    var firstInvalid = null;
    required.forEach(function(id){
      var el = document.getElementById(id);
      if (!el.value.trim()) {
        el.style.borderColor = '#C0392B';
        el.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) firstInvalid = el;
        ok = false;
      } else {
        el.style.borderColor = '';
        el.removeAttribute('aria-invalid');
      }
    });
    var err = document.getElementById('af-error');
    if (!ok) {
      if (err) {
        err.textContent = 'Please fill in the required fields: name, phone, email, and position.';
        err.classList.add('show');
      }
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (err) { err.textContent = ''; err.classList.remove('show'); }

    var btn = document.getElementById('af-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    var val = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var payload = {
      name:       val('af-name'),
      phone:      val('af-phone'),
      email:      val('af-email'),
      city:       val('af-city'),
      position:   val('af-position'),
      experience: val('af-experience'),
      notes:      val('af-notes'),
    };

    fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(function(r){ return r.ok ? r : Promise.reject(r.status); })
    .then(function(){
      form.style.display = 'none';
      document.getElementById('af-success').classList.add('show');
    })
    .catch(function(){
      btn.disabled = false;
      btn.textContent = 'Submit Application';
      alert('Something went wrong — please call 580-670-1829 or email estimating@prestigefenceusa.com.');
    });
  });
}

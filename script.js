/* Informatie — homepage interactions (no dependencies) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Method stages ---------- */
  var STAGES = {
    understand: {
      word: 'UNDERSTAND',
      title: 'Start with what it means.',
      body: 'We lead with the plain-language meaning, then show the detail behind it. You always know the point before the fine print.',
      example: '“This plan’s fees rise after the first year” appears before the full fee table.'
    },
    explore: {
      word: 'EXPLORE',
      title: 'See the full range.',
      body: 'Every reasonable option is shown — including keeping what you have. Nothing is hidden to make one choice look better.',
      example: 'Three plans, plus “stay with your current one”, side by side.'
    },
    compare: {
      word: 'COMPARE',
      title: 'Compare on the same terms.',
      body: 'Options sit side by side on identical criteria, with uncertainty stated plainly where the evidence is thin.',
      example: 'Cost, risk and flexibility for every option — in the same order, every time.'
    },
    decide: {
      word: 'DECIDE',
      title: 'Choose — or come back later.',
      body: 'Nothing is pre-selected and there is no countdown. Save your comparison and return whenever you are ready.',
      example: '“Save comparison” sits right next to “Choose this option”.'
    }
  };

  var stageButtons = document.querySelectorAll('.stage');
  var methodFields = document.querySelectorAll('[data-m]');
  methodFields.forEach(function (el) { el.classList.add('method-swap'); });

  function setStage(key) {
    var data = STAGES[key];
    if (!data) return;
    stageButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-stage') === key ? 'true' : 'false');
    });
    var apply = function () {
      methodFields.forEach(function (el) {
        var field = el.getAttribute('data-m');
        if (data[field] != null) el.textContent = data[field];
        el.classList.remove('fading');
      });
    };
    if (reduceMotion) { apply(); return; }
    methodFields.forEach(function (el) { el.classList.add('fading'); });
    window.setTimeout(apply, 180);
  }
  stageButtons.forEach(function (b) {
    b.addEventListener('click', function () { setStage(b.getAttribute('data-stage')); });
  });

  /* ---------- Accordions (trust card + audience list) ---------- */
  function setOpen(btn, open) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) panel.hidden = !open;
    var sign = btn.querySelector('.sign');
    if (sign) sign.textContent = open ? '−' : '+';
  }
  document.querySelectorAll('.acc').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      var group = btn.getAttribute('data-group');
      if (group && open) {
        document.querySelectorAll('.acc[data-group="' + group + '"]').forEach(function (other) {
          if (other !== btn) setOpen(other, false);
        });
      }
      setOpen(btn, open);
    });
  });

  /* ---------- Preferences → comparison ---------- */
  var PREFS = {
    cost: { label: 'LOWER COST', match: 'A' },
    risk: { label: 'LESS RISK', match: 'C' },
    flex: { label: 'MORE FLEXIBILITY', match: 'B' }
  };
  var prefButtons = document.querySelectorAll('.pref');
  var note = document.getElementById('pref-note');
  var current = null;

  function setPref(key) {
    current = key;
    prefButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-pref') === key ? 'true' : 'false');
    });
    var match = key ? PREFS[key].match : null;
    document.querySelectorAll('.opt').forEach(function (card) {
      var isMatch = card.getAttribute('data-opt') === match;
      card.classList.toggle('match', isMatch);
      var flag = card.querySelector('.opt-flag');
      if (flag) flag.textContent = isMatch ? 'MATCHES YOUR PRIORITY ■' : '';
    });
    if (note) {
      note.textContent = key
        ? 'HIGHLIGHTED BECAUSE YOU CHOSE “' + PREFS[key].label + '”. EVERY OPTION STAYS VISIBLE.'
        : 'NO PRIORITY SET — ALL OPTIONS SHOWN EQUALLY.';
    }
  }
  prefButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-pref');
      setPref(current === key ? null : key);
    });
  });
  var skip = document.getElementById('pref-skip');
  if (skip) skip.addEventListener('click', function () { setPref(null); });

  /* ---------- Subscribe (front-end only; wire to your email provider) ---------- */
  var email = document.getElementById('sub-email');
  var subBtn = email && email.parentElement.querySelector('button');
  if (email && subBtn) {
    subBtn.addEventListener('click', function () {
      if (!email.value || !email.checkValidity()) {
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        return;
      }
      email.removeAttribute('aria-invalid');
      email.value = '';
      email.placeholder = 'Thanks — you’re on the list.';
    });
  }
})();

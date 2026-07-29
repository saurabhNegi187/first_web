/* ============================================================
   Vidyamrit — form.js
   Reusable, dependency-free validation for the admission
   enquiry form and the contact form (defer).

   How it works
   ------------
   Any <form data-validate> is enhanced automatically. Each
   control lives inside a .field wrapper and declares intent
   through native attributes plus optional data-rule hints:

     required                     → must not be empty
     type="email"                 → valid email address
     data-rule="phone"            → 10-digit Indian mobile (6-9…)
     data-rule="name"             → letters / spaces, min 2 chars
     type="checkbox" required     → must be ticked (consent)

   A friendly field name is taken from data-label, else the
   wrapper's <label> text. Errors render into .field__error and
   the wrapper toggles .has-error / .is-valid. A summary shows in
   .form-status.

   Connecting a backend later
   ---------------------------
   Everything below the "SUBMIT" marker is front-end only. The
   payload is already assembled as a plain object — see the
   clearly-labelled integration hooks (Google Forms / Sheets,
   Firebase, EmailJS, or your own REST API) to wire it up.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var forms = doc.querySelectorAll('form[data-validate]');
  if (!forms.length) return;

  /* ---- Validation primitives ----------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var NAME_RE = /^[A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F .'-]{1,}$/;

  // Accepts 10-digit Indian mobiles, tolerating spaces, dashes
  // and an optional +91 / 0 prefix before checking the core.
  function isPhone(raw) {
    var digits = raw.replace(/[\s()-]/g, '').replace(/^(\+91|0)/, '');
    return /^[6-9]\d{9}$/.test(digits);
  }

  function labelFor(field, input) {
    if (input.getAttribute('data-label')) return input.getAttribute('data-label');
    var lbl = field.querySelector('label');
    if (lbl) return lbl.textContent.replace(/\*+/g, '').trim();
    return 'This field';
  }

  // Returns '' when valid, otherwise an error message.
  function checkField(field) {
    var input = field.querySelector('input, select, textarea');
    if (!input) return '';

    var name = labelFor(field, input);
    var required = input.hasAttribute('required');

    // Consent / checkbox
    if (input.type === 'checkbox') {
      return required && !input.checked ? 'Please tick this box to continue.' : '';
    }

    var value = (input.value || '').trim();

    if (!value) {
      return required ? name + ' is required.' : '';
    }

    if (input.type === 'email' && !EMAIL_RE.test(value)) {
      return 'Please enter a valid email address.';
    }
    if (input.getAttribute('data-rule') === 'phone' && !isPhone(value)) {
      return 'Enter a valid 10-digit mobile number.';
    }
    if (input.getAttribute('data-rule') === 'name' && !NAME_RE.test(value)) {
      return 'Please enter a valid ' + name.toLowerCase() + '.';
    }
    if (input.tagName === 'SELECT' && value === '') {
      return 'Please choose an option.';
    }
    return '';
  }

  function paintField(field, message) {
    var errEl = field.querySelector('.field__error');
    if (message) {
      field.classList.add('has-error');
      field.classList.remove('is-valid');
      if (errEl) errEl.textContent = message;
    } else {
      field.classList.remove('has-error');
      var input = field.querySelector('input, select, textarea');
      // only flag valid once the user has actually entered something
      if (input && input.type !== 'checkbox' && (input.value || '').trim()) {
        field.classList.add('is-valid');
      } else {
        field.classList.remove('is-valid');
      }
      if (errEl) errEl.textContent = '';
    }
  }

  function showStatus(form, type, msg) {
    var status = form.querySelector('.form-status');
    if (!status) return;
    status.classList.remove('is-success', 'is-error');
    status.classList.add(type === 'success' ? 'is-success' : 'is-error');
    var icon = type === 'success'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>';
    status.innerHTML = icon + '<span>' + msg + '</span>';
  }

  /* ---- Wire each form ------------------------------------ */
  forms.forEach(function (form) {
    var fields = Array.from(form.querySelectorAll('.field'));
    var submitted = false;

    // live re-validation, but only after the first submit attempt
    fields.forEach(function (field) {
      var input = field.querySelector('input, select, textarea');
      if (!input) return;
      var revalidate = function () { if (submitted) paintField(field, checkField(field)); };
      input.addEventListener('blur', revalidate);
      input.addEventListener('input', revalidate);
      input.addEventListener('change', revalidate);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitted = true;

      var firstInvalid = null;
      fields.forEach(function (field) {
        var msg = checkField(field);
        paintField(field, msg);
        if (msg && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        showStatus(form, 'error', 'Please fix the highlighted fields and try again.');
        var focusable = firstInvalid.querySelector('input, select, textarea');
        if (focusable) focusable.focus();
        return;
      }

      /* ---------------- SUBMIT ----------------------------
         All fields valid. Collect the payload as a plain
         object keyed by each control's name attribute. */
      var payload = {};
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (!el.name) return;
        payload[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });

      var successMsg = form.getAttribute('data-success')
        || 'Thank you! Your enquiry has been received. Our team will call you within one working day.';

      // Reset the form to a clean state after a successful send.
      function onSuccess(msg) {
        showStatus(form, 'success', msg || successMsg);
        form.reset();
        fields.forEach(function (field) { field.classList.remove('is-valid', 'has-error'); });
        submitted = false;
        var status = form.querySelector('.form-status');
        if (status && status.scrollIntoView) {
          status.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // Map server-side validation errors (keyed by field name)
      // back onto the matching .field wrappers.
      function applyServerErrors(errors) {
        var firstBad = null;
        fields.forEach(function (field) {
          var input = field.querySelector('input, select, textarea');
          if (input && input.name && errors[input.name]) {
            paintField(field, errors[input.name]);
            if (!firstBad) firstBad = field;
          }
        });
        showStatus(form, 'error', 'Please fix the highlighted fields and try again.');
        if (firstBad) {
          var f = firstBad.querySelector('input, select, textarea');
          if (f) f.focus();
        }
      }

      var endpoint = form.getAttribute('data-endpoint');

      /* No endpoint configured → keep the static-site demo
         behaviour (validate + confirmation, without a server). */
      if (!endpoint) {
        onSuccess();
        return;
      }

      /* ---- Live submission to the Node/Express backend -------
         POSTs JSON and handles three outcomes:
           · 200 { ok:true }          → success banner
           · 422 { ok:false, errors } → per-field errors
           · anything else / network  → generic error banner     */
      var submitBtn = form.querySelector('[type="submit"]');
      var btnLabel = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Sending\u2026'; }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { status: res.status, ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          if (r.ok && r.data && r.data.ok) {
            onSuccess(r.data.message);
          } else if (r.status === 422 && r.data && r.data.errors) {
            applyServerErrors(r.data.errors);
          } else {
            showStatus(form, 'error', (r.data && r.data.message) ||
              'Sorry, something went wrong. Please try again, or call us directly.');
          }
        })
        .catch(function () {
          showStatus(form, 'error',
            'We could not reach the server. Please check your connection and try again, or call us directly.');
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = btnLabel; }
        });
    });
  });
})();

/* =============================================================================
   utils/form-model.js — contact-form behavior model (shared test utility)
   Feature: website-animation-ux-polish

   Models the pages' contact/booking form behavior pattern (observed in the real
   templates): a submit handler that preventDefault()s, runs the form's native
   constraint validation, and on success writes a confirmation into a
   role="status" region and "sends" to a destination; on failure it rejects
   without sending and reports the invalid fields. Used by the behavior-
   equivalence guard (example test 9.3) to prove the Motion_System leaves form
   behavior identical before vs after enhancement.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

// A representative contact form matching the real templates' shape.
function formFixtureBody() {
  return [
    '<section id="book">',
    '  <form id="bookingForm" data-destination="/booking-endpoint">',
    '    <input id="nameInput" name="nameInput" type="text" required>',
    '    <input id="phoneInput" name="phoneInput" type="tel" required>',
    '    <select id="serviceSelect" name="serviceSelect" required>',
    '      <option value="">Select</option><option value="gel">Gel</option>',
    '    </select>',
    '    <textarea id="notesInput" name="notesInput"></textarea>',
    '    <div id="confirmation" role="status" class="confirmation"></div>',
    '    <button class="btn" type="submit">Send request</button>',
    '  </form>',
    '</section>'
  ].join('\n');
}

/**
 * Install the page's own submit handler (this is pre-existing page JS, NOT the
 * Motion_System). Identical in baseline and enhanced docs so any behavior
 * difference could only come from the motion layer.
 */
function installSubmitHandler(win) {
  const doc = win.document;
  const form = doc.getElementById('bookingForm');
  const confirmation = doc.getElementById('confirmation');
  const state = { sent: false, destination: null, statusText: '', rejected: false };

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    // Native constraint validation (required fields).
    if (!form.checkValidity()) {
      state.rejected = true;
      state.sent = false;
      return;
    }
    const name = (doc.getElementById('nameInput').value || '').trim() || 'there';
    state.sent = true;
    state.rejected = false;
    state.destination = form.getAttribute('data-destination');
    state.statusText = 'Thanks, ' + name + '! Your request has been received.';
    confirmation.textContent = state.statusText;
    confirmation.classList.add('show');
  });

  return state;
}

/** Fill fields then dispatch a submit; returns an outcome snapshot. */
function simulateSubmit(win, values, state) {
  const doc = win.document;
  Object.keys(values).forEach(function (id) {
    const el = doc.getElementById(id);
    if (el) { el.value = values[id]; }
  });
  // reset the shared state accumulators for this attempt
  state.sent = false; state.rejected = false; state.destination = null; state.statusText = '';
  const form = doc.getElementById('bookingForm');
  const valid = form.checkValidity();
  form.dispatchEvent(new win.Event('submit', { cancelable: true, bubbles: true }));
  return {
    valid: valid,
    sent: state.sent,
    rejected: state.rejected,
    destination: state.destination,
    statusText: state.statusText,
    confirmationText: doc.getElementById('confirmation').textContent
  };
}

module.exports = { formFixtureBody, installSubmitHandler, simulateSubmit };

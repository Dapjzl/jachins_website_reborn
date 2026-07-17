document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('enquiryForm');
  if (!form) return;

  var submitBtn = form.querySelector('button[type="submit"]');
  var btnOriginalHTML = submitBtn.innerHTML;

  // Create one alert box and place it right after the form (created once)
  var alertBox = document.createElement('div');
  alertBox.id = 'enquiryFormAlert';
  alertBox.style.display = 'none';
  alertBox.setAttribute('role', 'alert');
  form.insertAdjacentElement('afterend', alertBox);

  var hideTimeout;

  function showAlert(type, message) {
    alertBox.className = 'alert ' + (type === 'success' ? 'alert-success' : 'alert-danger') + ' mt-3';
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(function () {
      alertBox.style.display = 'none';
    }, 6000);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Native HTML5 validation first (required, type="email", etc.)
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var formData = new FormData(form);

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending...';

    fetch('contact-handler.php', {
      method: 'POST',
      body: formData
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.status === 'success') {
          showAlert('success', result.data.message);
          form.reset();
        } else {
          showAlert('error', result.data.message || 'Something went wrong. Please try again.');
        }
      })
      .catch(function () {
        showAlert('error', 'Network error. Please check your connection and try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = btnOriginalHTML;
      });
  });
});

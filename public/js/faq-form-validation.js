(function () {
  const form = document.getElementById('faq-form');
  if (!form) return;

  const questionInput = form.querySelector('input[name="question"]');
  const answerInput = form.querySelector('textarea[name="answer"]');
  const errorBox = document.getElementById('faq-client-error');

  function setFieldError(element, hasError) {
    if (!element) return;
    element.style.borderColor = hasError ? '#ef4444' : '';
    element.setAttribute('aria-invalid', hasError ? 'true' : 'false');
  }

  function setFormError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.style.display = message ? 'block' : 'none';
  }

  function trimValue(value) {
    return (value || '').trim();
  }

  function validate() {
    const question = trimValue(questionInput && questionInput.value);
    const answer = trimValue(answerInput && answerInput.value);

    setFieldError(questionInput, false);
    setFieldError(answerInput, false);
    setFormError('');

    if (!question) {
      setFieldError(questionInput, true);
      setFormError('Question is required.');
      questionInput && questionInput.focus();
      return false;
    }

    if (question.length > 255) {
      setFieldError(questionInput, true);
      setFormError('Question must be 255 characters or fewer.');
      questionInput && questionInput.focus();
      return false;
    }

    if (!answer) {
      setFieldError(answerInput, true);
      setFormError('Answer is required.');
      answerInput && answerInput.focus();
      return false;
    }

    return true;
  }

  form.addEventListener('submit', function (event) {
    if (!validate()) {
      event.preventDefault();
    }
  });

  if (questionInput) {
    questionInput.addEventListener('input', function () {
      if (questionInput.value.trim()) {
        setFieldError(questionInput, false);
        setFormError('');
      }
    });
  }

  if (answerInput) {
    answerInput.addEventListener('input', function () {
      if (answerInput.value.trim()) {
        setFieldError(answerInput, false);
        setFormError('');
      }
    });
  }
})();

/** Front-end only — connect to an email provider before launch. */
export function initSubscribe() {
  const email = document.getElementById('sub-email') as HTMLInputElement | null;
  const btn = email?.parentElement?.querySelector('button');
  if (!email || !btn) return;
  const submit = () => {
    if (!email.value || !email.checkValidity()) {
      email.setAttribute('aria-invalid', 'true');
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    email.value = '';
    email.placeholder = 'Thanks — you’re on the list.';
  };
  btn.addEventListener('click', submit);
  email.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

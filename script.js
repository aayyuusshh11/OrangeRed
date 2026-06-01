document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  logo.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

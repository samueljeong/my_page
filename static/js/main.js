// static/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.view;
      views.forEach((v) => v.classList.remove("active"));
      document.getElementById(`view-${target}`).classList.add("active");
    });
  });
});
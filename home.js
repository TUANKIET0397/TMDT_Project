// // auto lap 
// const track = document.querySelector('.slide-track');
// let pos = 0;
// setInterval(() => {
//   pos -= 1;
//   if (Math.abs(pos) > track.scrollWidth / 2) pos = 0;
//   track.style.transform = `translateX(${pos}px)`;
// }, 20);

// Scroll reveal effect
window.addEventListener('scroll', () => {
  document.querySelectorAll('section').forEach(sec => {
    const top = sec.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      sec.classList.add('visible');
    }
  });
});

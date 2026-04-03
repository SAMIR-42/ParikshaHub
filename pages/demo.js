
document.querySelectorAll(".media-slider").forEach((slider) => {
  const track = slider.querySelector(".media-track");
  const items = slider.querySelectorAll(".media-item");
  const prevBtn = slider.querySelector(".prev");
  const nextBtn = slider.querySelector(".next");
  const dotsContainer = slider.querySelector(".dots");
  const progress = slider.querySelector(".progress");

  if (!track || items.length === 0) return;
  if (!dotsContainer || !progress) return;

  let index = 0;
  let startX = 0;
  let isDragging = false;
  let interval;

  // --- CREATE DOTS ---
  items.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("active");
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll("span");

  function updateSlide(i) {
    index = i;
    track.style.transform = `translateX(-${index * 100}%)`;

    // dots update
    dots.forEach(d => d.classList.remove("active"));
    dots[index].classList.add("active");

    // reset videos
    slider.querySelectorAll("video").forEach(v => {
      v.pause();
      v.currentTime = 0;
    });

    // play if video
    const video = items[index].querySelector("video");
    if (video) video.play();

    restartProgress();
  }

  function nextSlide() {
    index = (index + 1) % items.length;
    updateSlide(index);
  }

  function prevSlide() {
    index = (index - 1 + items.length) % items.length;
    updateSlide(index);
  }

  // --- BUTTONS ---
  nextBtn.onclick = () => {
    nextSlide();
  };

  prevBtn.onclick = () => {
    prevSlide();
  };

  // --- AUTO SLIDE + PROGRESS ---
  function startAuto() {
    interval = setInterval(nextSlide, 20200);
    startProgress();
  }

  function stopAuto() {
    clearInterval(interval);
    progress.style.width = "0%";
  }

  function startProgress() {
    progress.style.transition = "none";
    progress.style.width = "0%";

    setTimeout(() => {
      progress.style.transition = "width 22s linear";
      progress.style.width = "100%";
    }, 50);
  }

  function restartProgress() {
    progress.style.transition = "none";
    progress.style.width = "0%";
    setTimeout(startProgress, 50);
  }

  // --- SWIPE ---
  slider.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    isDragging = true;
    stopAuto();
  });

  slider.addEventListener("touchend", e => {
    if (!isDragging) return;

    let diff = startX - e.changedTouches[0].clientX;

    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();

    startAuto();
    isDragging = false;
  });

  // --- VIDEO FULLSCREEN ---
  slider.querySelectorAll("video").forEach(video => {
    video.addEventListener("click", () => {
      if (video.requestFullscreen) video.requestFullscreen();
    });
  });

  // --- INIT ---
  updateSlide(0);
  startAuto();
});
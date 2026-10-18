"use strict";

/* Local-only presentation controls. No API calls, analytics, or storage. */
(() => {
  const chapters = [...document.querySelectorAll(".chapter")];
  const inventoryLinks = [...document.querySelectorAll(".inventory a")];
  const pitchToggle = document.querySelector("#pitch-toggle");
  const presenterControls = document.querySelector(".presenter-controls");
  const presenterHint = document.querySelector(".presenter-hint");
  const count = document.querySelector("#chapter-count");
  const progress = document.querySelector(".journey-progress > span");
  const announcement = document.querySelector(".live-announcement");
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const timerToggle = document.querySelector("#timer-toggle");
  const timerValue = document.querySelector("#timer-value");
  const timerIcon = document.querySelector("#timer-icon");
  const demoImage = document.querySelector("#demo-image");
  const demoPanel = document.querySelector("#demo-panel");
  const demoCaption = document.querySelector("#demo-caption");
  const demoFallback = document.querySelector(".demo-image-fallback");
  const demoTabs = [...document.querySelectorAll("[data-demo]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = 0;
  let presenting = false;
  let timerId = null;
  let remaining = 240000;
  let deadline = 0;
  let scrollScheduled = false;

  const demos = {
    upload: {
      src: "assets/demo-before.png",
      alt: "Настоящий интерфейс CashGuard до загрузки синтетического видео",
      caption: "Настоящий интерфейс. Без приватных банковских данных.",
    },
    processing: {
      src: "assets/demo-processing.png",
      alt: "Публичный сайт CashGuard: синтетическое видео принято и находится в обработке",
      caption: "Реальный запрос принят. Статус обработки приходит из API.",
    },
    result: {
      src: "assets/demo-result.png",
      alt: "Результат публичной проверки: в коротком синтетическом видео нарушения не обнаружены",
      caption: "Синтетический ролик → настоящий API → результат на сайте.",
    },
  };

  function updateCurrent(index, speak = false) {
    current = Math.max(0, Math.min(chapters.length - 1, index));
    inventoryLinks.forEach((link, i) => {
      if (i === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
    progress.style.width = `${((current + 1) / chapters.length) * 100}%`;
    previous.disabled = current === 0;
    next.disabled = current === chapters.length - 1;
    if (speak)
      announcement.textContent = `Раздел ${current + 1} из ${chapters.length}: ${chapters[current].dataset.title}`;
  }

  function goTo(index) {
    updateCurrent(index, true);
    chapters[current].scrollIntoView({
      behavior: presenting || reducedMotion.matches ? "instant" : "smooth",
      block: "start",
    });
    if (presenting) focusCurrentHeading();
  }

  function focusCurrentHeading() {
    const heading = chapters[current].querySelector("h1, h2");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  function setPresenting(value) {
    presenting = value;
    document.documentElement.classList.toggle("presenting", value);
    pitchToggle.setAttribute("aria-pressed", String(value));
    presenterControls.hidden = !value;
    presenterHint.hidden = !value;
    if (!value) pauseTimer();
    requestAnimationFrame(() => {
      if (value !== presenting) return;
      chapters[current].scrollIntoView({ behavior: "instant", block: "start" });
      if (value) focusCurrentHeading();
    });
    announcement.textContent = value
      ? "Режим питча включён. Стрелки — переход, Escape — выход. Таймер запускается отдельно."
      : "Режим питча выключен.";
  }

  function updateTimer() {
    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    timerValue.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    timerValue.classList.toggle("timer-ended", seconds === 0);
  }

  function pauseTimer() {
    if (timerId !== null) {
      remaining = Math.max(0, deadline - performance.now());
      clearInterval(timerId);
      timerId = null;
    }
    timerIcon.textContent = "▶";
    timerToggle.setAttribute(
      "aria-label",
      remaining === 0
        ? "Таймер завершён. Сначала сбросьте его"
        : "Запустить таймер",
    );
    updateTimer();
  }

  function startTimer() {
    if (remaining <= 0 || timerId !== null) return;
    deadline = performance.now() + remaining;
    timerIcon.textContent = "Ⅱ";
    timerToggle.setAttribute("aria-label", "Приостановить таймер");
    timerId = setInterval(() => {
      remaining = Math.max(0, deadline - performance.now());
      updateTimer();
      if (remaining === 0) {
        pauseTimer();
        announcement.textContent = "Четыре минуты истекли.";
      }
    }, 200);
  }

  function selectDemo(tab, focus = false) {
    const demo = demos[tab.dataset.demo];
    if (!demo) return;
    demoTabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    demoImage.hidden = false;
    demoFallback.hidden = true;
    demoImage.src = demo.src;
    demoImage.alt = demo.alt;
    demoCaption.textContent = demo.caption;
    demoPanel.setAttribute("aria-labelledby", tab.id);
    if (focus) tab.focus();
  }

  pitchToggle.addEventListener("click", () => setPresenting(!presenting));
  inventoryLinks.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (!presenting) return;
      event.preventDefault();
      goTo(index);
    });
  });
  document.querySelector("#exit-pitch").addEventListener("click", () => {
    setPresenting(false);
    pitchToggle.focus();
  });
  previous.addEventListener("click", () => goTo(current - 1));
  next.addEventListener("click", () => goTo(current + 1));
  timerToggle.addEventListener("click", () =>
    timerId === null ? startTimer() : pauseTimer(),
  );
  document.querySelector("#timer-reset").addEventListener("click", () => {
    pauseTimer();
    remaining = 240000;
    updateTimer();
    timerToggle.setAttribute("aria-label", "Запустить таймер");
    announcement.textContent = "Таймер сброшен на четыре минуты.";
  });
  demoTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectDemo(tab));
    tab.addEventListener("keydown", (event) => {
      const index = demoTabs.indexOf(tab);
      let target = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight")
        target = (index + 1) % demoTabs.length;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft")
        target = (index - 1 + demoTabs.length) % demoTabs.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = demoTabs.length - 1;
      if (target !== null) {
        event.preventDefault();
        event.stopPropagation();
        selectDemo(demoTabs[target], true);
      }
    });
  });
  demoImage.addEventListener("error", () => {
    demoImage.hidden = true;
    demoFallback.hidden = false;
  });
  demoImage.addEventListener("load", () => {
    demoImage.hidden = false;
    demoFallback.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    const editable =
      target instanceof Element &&
      target.closest('input, textarea, select, [contenteditable="true"]');
    const pitchShortcut =
      event.altKey &&
      !event.shiftKey &&
      (event.code === "KeyP" || ["p", "з"].includes(event.key.toLowerCase()));
    if (pitchShortcut && !editable) {
      event.preventDefault();
      if (!event.repeat) setPresenting(!presenting);
      return;
    }
    if (event.altKey) return;
    const interactive =
      target instanceof Element &&
      target.closest(
        'input, textarea, select, button, a, summary, [contenteditable="true"], [role="tab"]',
      );
    if (event.key === "Escape" && presenting) {
      event.preventDefault();
      setPresenting(false);
      pitchToggle.focus();
      return;
    }
    const presenterNavigation =
      presenting &&
      target instanceof Element &&
      target.closest(".presenter-controls button") &&
      [
        "ArrowRight",
        "ArrowDown",
        "PageDown",
        "ArrowLeft",
        "ArrowUp",
        "PageUp",
        "Home",
        "End",
      ].includes(event.key);
    if (interactive && !presenterNavigation) return;
    if (presenting) {
      let targetIndex = null;
      if (
        event.key === "ArrowRight" ||
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        (event.key === " " && !event.shiftKey)
      )
        targetIndex = current + 1;
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowUp" ||
        event.key === "PageUp" ||
        (event.key === " " && event.shiftKey)
      )
        targetIndex = current - 1;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = chapters.length - 1;
      if (targetIndex !== null) {
        event.preventDefault();
        goTo(targetIndex);
      }
    }
  });

  function syncScroll() {
    scrollScheduled = false;
    const point = window.innerHeight * 0.42;
    let closest = 0;
    let distance = Infinity;
    chapters.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const d =
        rect.top <= point && rect.bottom > point
          ? 0
          : Math.min(Math.abs(rect.top - point), Math.abs(rect.bottom - point));
      if (d < distance) {
        closest = index;
        distance = d;
      }
    });
    if (closest !== current) updateCurrent(closest);
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollScheduled) {
        scrollScheduled = true;
        requestAnimationFrame(syncScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", syncScroll);
  updateCurrent(0);
  syncScroll();
})();

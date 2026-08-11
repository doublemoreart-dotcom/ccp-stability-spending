const sitePreloader = document.querySelector("#site-preloader");
const sitePreloaderValue = document.querySelector("#site-preloader-value");
const sitePreloaderFill = document.querySelector("#site-preloader-fill");
const sitePreloaderStatus = document.querySelector("#site-preloader-status");
const mainContent = document.querySelector("main");

function wait(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function waitWithTimeout(promise, timeout = 1600) {
  return Promise.race([promise.catch(() => undefined), wait(timeout)]);
}

function waitForImage(image) {
  if (!image) return Promise.resolve();
  if (image.complete) {
    return typeof image.decode === "function" ? image.decode().catch(() => undefined) : Promise.resolve();
  }
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function setPreloadProgress(value, status) {
  if (!sitePreloader) return;
  const progress = String(value);
  sitePreloader.setAttribute("aria-valuenow", progress);
  sitePreloaderValue.textContent = progress;
  sitePreloaderFill.style.width = `${progress}%`;
  sitePreloaderStatus.textContent = status;
}

async function runSitePreloader() {
  if (!sitePreloader) return;
  mainContent?.setAttribute("aria-busy", "true");

  await wait(70);
  setPreloadProgress(32, "頁面結構已建立");

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  await waitWithTimeout(fontsReady);
  setPreloadProgress(60, "字型樣式已就緒");

  const heroVisual = document.querySelector(".hero-visual");
  await waitWithTimeout(waitForImage(heroVisual));
  setPreloadProgress(85, "主視覺已載入");

  const startedAt = window.__sitePreloadStart ?? performance.now();
  const minimumVisibleTime = Math.max(0, 680 - (performance.now() - startedAt));
  await wait(minimumVisibleTime);
  setPreloadProgress(100, "互動功能已就緒");

  await wait(180);
  window.clearTimeout(window.__sitePreloadSafety);
  sitePreloader.setAttribute("aria-hidden", "true");
  sitePreloader.classList.add("is-complete");
  mainContent?.setAttribute("aria-busy", "false");
  document.documentElement.classList.remove("is-preloading");
  await wait(460);
  sitePreloader.remove();
}

const siteReadyPromise = runSitePreloader().catch(() => {
  window.clearTimeout(window.__sitePreloadSafety);
  mainContent?.setAttribute("aria-busy", "false");
  document.documentElement.classList.remove("is-preloading");
  sitePreloader?.remove();
});

const externalObservation = document.querySelector("#external-observation");
const perspectivesSection = document.querySelector("#perspectives");

// 外部觀察先建立問題框架，再銜接外部報導，最後進入方法與限制。
if (externalObservation && perspectivesSection) {
  perspectivesSection.insertAdjacentElement("afterend", externalObservation);
}

const scenarios = {
  low: {
    label: "核心口徑",
    delta: "核心口徑基準",
    modules: ["security", "response", "grassroots"],
    note: "以中共公開機關職能為基線，納入公共安全、司法、應變與基層治理模組。",
  },
  mid: {
    label: "擴展口徑",
    delta: "較核心口徑增加 0.56 兆",
    modules: ["security", "response", "grassroots", "content", "digital", "temporary"],
    note: "在中共公開治理職能之外，再納入網路內容管理、資料系統與特定時點部署。",
  },
  high: {
    label: "社會成本口徑",
    delta: "較核心口徑增加 1.31 兆",
    modules: ["security", "response", "grassroots", "content", "digital", "temporary", "regional", "compliance", "mobilization"],
    note: "離開官方直接支出口徑，再納入企業合規、特定地區治理及組織動員等外溢成本。",
  },
};

const scenarioButtons = document.querySelectorAll(".scenario-button");
const estimateValue = document.querySelector("#estimate-value");
const estimateNote = document.querySelector("#estimate-note");
const estimateDelta = document.querySelector("#estimate-delta");
const rangeFill = document.querySelector("#range-fill");
const rangeButtons = document.querySelectorAll(".range-point");
const moduleInputs = [...document.querySelectorAll(".cost-module input")];
const pressureInput = document.querySelector("#pressure-range");
const pressureValue = document.querySelector("#pressure-value");
const calculatorValue = document.querySelector("#calculator-value");
const calculatorCount = document.querySelector("#calculator-count");
const calculatorModelName = document.querySelector("#calculator-model-name");
const definitionButtons = document.querySelectorAll(".definition-card");
const calculatorGroupButtons = [...document.querySelectorAll(".calculator-group-toggle")];
const calculatorCompactQuery = window.matchMedia("(max-width: 560px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function canUseGsapMotion() {
  return Boolean(window.gsap && window.ScrollTrigger && !reducedMotionQuery.matches);
}

function renderAnimatedNumber(element, target, { duration = 0.55, from } = {}) {
  if (!element) return;
  const formattedTarget = Number(target).toFixed(2);
  element.dataset.numericValue = formattedTarget;

  if (!document.documentElement.classList.contains("gsap-motion")) {
    element.textContent = formattedTarget;
    return;
  }

  element._numberTween?.kill();
  const counter = {
    value: Number.isFinite(from) ? from : (Number(element.textContent) || 0),
  };
  element._numberTween = window.gsap.to(counter, {
    value: Number(target),
    duration,
    ease: "power2.out",
    overwrite: true,
    onUpdate: () => {
      element.textContent = counter.value.toFixed(2);
    },
    onComplete: () => {
      element.textContent = formattedTarget;
      element._numberTween = null;
    },
  });
}

function setCalculatorGroupExpanded(button, expanded) {
  const panel = document.querySelector(`#${button.getAttribute("aria-controls")}`);
  button.setAttribute("aria-expanded", String(expanded));
  if (panel) panel.hidden = calculatorCompactQuery.matches && !expanded;
}

function syncCalculatorGroupLayout(reset = false) {
  calculatorGroupButtons.forEach((button, index) => {
    const expanded = calculatorCompactQuery.matches
      ? (reset ? index === 0 : button.getAttribute("aria-expanded") === "true")
      : true;
    setCalculatorGroupExpanded(button, expanded);
  });
}

function updateCalculatorGroupSummaries() {
  calculatorGroupButtons.forEach((button) => {
    const panelId = button.getAttribute("aria-controls");
    const panel = document.querySelector(`#${panelId}`);
    const output = document.querySelector(`[data-group-selected="${panelId}"]`);
    if (panel && output) output.textContent = String(panel.querySelectorAll("input:checked").length);
  });
}

function selectedModules() {
  return moduleInputs.filter((input) => input.checked).map((input) => input.dataset.module);
}

function matchingScenario() {
  if (Number(pressureInput.value) !== 100) return null;
  const selected = selectedModules().sort().join(",");
  return Object.entries(scenarios).find(([, scenario]) => [...scenario.modules].sort().join(",") === selected)?.[0] ?? null;
}

function updateEstimate() {
  const subtotal = moduleInputs.reduce((sum, input) => sum + (input.checked ? Number(input.dataset.cost) : 0), 0);
  const total = subtotal * (Number(pressureInput.value) / 100);
  const preset = matchingScenario();
  const modelName = preset ? scenarios[preset].label : "自訂口徑";

  renderAnimatedNumber(estimateValue, total);
  renderAnimatedNumber(calculatorValue, total);
  calculatorCount.textContent = String(selectedModules().length);
  calculatorModelName.textContent = modelName;
  pressureValue.textContent = `${pressureInput.value}%`;
  estimateNote.textContent = preset ? scenarios[preset].note : `自訂口徑包含 ${selectedModules().length} 個成本模組，並套用 ${pressureInput.value}% 情境調整係數。`;
  const difference = total - 1.71;
  estimateDelta.textContent = preset
    ? scenarios[preset].delta
    : `較核心口徑 ${difference >= 0 ? "增加" : "減少"} ${Math.abs(difference).toFixed(2)} 兆`;
  const rangeWidth = Math.max(0, Math.min(100, (total / 3.4) * 100));
  rangeFill.dataset.rangeWidth = String(rangeWidth);
  if (document.documentElement.classList.contains("gsap-motion")) {
    window.gsap.to(rangeFill, { width: `${rangeWidth}%`, duration: 0.55, ease: "power2.out", overwrite: true });
  } else {
    rangeFill.style.width = `${rangeWidth}%`;
  }

  scenarioButtons.forEach((button) => {
    const active = button.dataset.scenario === preset;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  rangeButtons.forEach((button) => {
    const active = button.dataset.rangeScenario === preset;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  definitionButtons.forEach((button) => {
    const active = button.dataset.definitionScenario === preset;
    button.classList.remove("preview");
    button.setAttribute("aria-pressed", String(active));
    button.querySelector(".definition-card-action > span:first-child").textContent = active ? "目前口徑・查看完整敘事" : "套用並查看完整敘事";
  });
  updateCalculatorGroupSummaries();
}

function applyScenario(key) {
  const selected = scenarios[key].modules;
  moduleInputs.forEach((input) => { input.checked = selected.includes(input.dataset.module); });
  pressureInput.value = "100";
  updateEstimate();
}

function previewDefinitionCard(previewButton = null) {
  definitionButtons.forEach((button) => {
    button.classList.toggle("preview", button === previewButton);
  });
}

scenarioButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (scenarios[button.dataset.scenario]) applyScenario(button.dataset.scenario);
  });
});

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (scenarios[button.dataset.rangeScenario]) applyScenario(button.dataset.rangeScenario);
  });
});

definitionButtons.forEach((button) => {
  button.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") previewDefinitionCard(button);
  });
  button.addEventListener("pointerleave", () => previewDefinitionCard());
  button.addEventListener("pointercancel", () => previewDefinitionCard());
  button.addEventListener("focus", () => {
    if (button.matches(":focus-visible")) previewDefinitionCard(button);
  });
  button.addEventListener("blur", () => previewDefinitionCard());
  button.addEventListener("click", () => {
    if (scenarios[button.dataset.definitionScenario]) {
      applyScenario(button.dataset.definitionScenario);
      openEstimateNarrative(button.dataset.definitionScenario, button);
    }
  });
});

moduleInputs.forEach((input) => input.addEventListener("change", updateEstimate));
pressureInput.addEventListener("input", updateEstimate);
calculatorGroupButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!calculatorCompactQuery.matches) return;
    const shouldExpand = button.getAttribute("aria-expanded") !== "true";
    calculatorGroupButtons.forEach((otherButton) => {
      setCalculatorGroupExpanded(otherButton, otherButton === button && shouldExpand);
    });
  });
});
calculatorCompactQuery.addEventListener("change", () => syncCalculatorGroupLayout(true));
syncCalculatorGroupLayout(true);
updateEstimate();

const menuButton = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
const readingProgressFill = document.querySelector(".reading-progress i");
const navigationLinks = [...siteNav.querySelectorAll('a[href^="#"]')];
const navigationSections = navigationLinks
  .map((link) => ({ link, section: document.querySelector(link.hash) }))
  .filter(({ section }) => section);
let navigationFrame = 0;

function updateNavigationState() {
  navigationFrame = 0;
  const readingPoint = window.scrollY + (window.innerHeight * 0.36);
  let currentLink = null;

  navigationSections.forEach(({ link, section }) => {
    if (section.offsetTop <= readingPoint) currentLink = link;
  });

  navigationLinks.forEach((link) => {
    if (link === currentLink) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });

  if (!document.documentElement.classList.contains("gsap-motion") && readingProgressFill) {
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
    readingProgressFill.style.transform = `scaleX(${progress})`;
  }
}

function requestNavigationUpdate() {
  if (navigationFrame) return;
  navigationFrame = window.requestAnimationFrame(updateNavigationState);
}

function setMenuOpen(isOpen, { restoreFocus = false } = {}) {
  siteNav.classList.toggle("open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  if (restoreFocus) menuButton.focus({ preventScroll: true });
}

menuButton.addEventListener("click", () => {
  setMenuOpen(!siteNav.classList.contains("open"));
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    setMenuOpen(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav.classList.contains("open")) {
    setMenuOpen(false, { restoreFocus: true });
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!siteNav.classList.contains("open")) return;
  if (siteNav.contains(event.target) || menuButton.contains(event.target)) return;
  setMenuOpen(false);
});

window.matchMedia("(min-width: 851px)").addEventListener("change", (event) => {
  if (event.matches) setMenuOpen(false);
});

window.addEventListener("scroll", requestNavigationUpdate, { passive: true });
window.addEventListener("resize", requestNavigationUpdate);
updateNavigationState();

const observedSections = [...document.querySelectorAll(".chapter")];
const revealItems = new Set();
const revealSequences = [
  [".hero-summary", ":scope > a"],
  [".definition-cards", ":scope > .definition-card"],
  [".estimate-controls", ":scope > .scenario-button"],
  [".flow-card-grid", ":scope > .flow-card"],
  [".news-evidence-list", ":scope > li"],
  [".system-path", ":scope > .system-path-node"],
  [".power-chain", ":scope > li"],
  [".narrative-compare", ":scope > article"],
  [".perspective-grid", ":scope > .perspective-card"],
  [".source-faqs", ":scope > .source-faq"],
];

observedSections.forEach((section) => section.classList.add("reveal-section"));
revealSequences.forEach(([groupSelector, itemSelector]) => {
  document.querySelectorAll(groupSelector).forEach((group) => {
    [...group.querySelectorAll(itemSelector)].forEach((item, index) => {
      item.classList.add("reveal-item");
      item.style.setProperty("--reveal-order", String(Math.min(index, 3)));
      revealItems.add(item);
    });
  });
});

function initializeRevealMotion() {
  if (!("IntersectionObserver" in window)) {
    observedSections.forEach((section) => section.classList.add("is-visible"));
    revealItems.forEach((item) => {
      item.classList.remove("reveal-item");
      item.style.removeProperty("--reveal-order");
    });
    return;
  }

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        sectionObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -5% 0px" },
  );

  const itemObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        itemObserver.unobserve(entry.target);
        const order = Number(entry.target.style.getPropertyValue("--reveal-order")) || 0;
        window.setTimeout(() => {
          entry.target.classList.remove("reveal-item", "is-visible");
          entry.target.style.removeProperty("--reveal-order");
        }, 760 + (order * 70));
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );

  observedSections.forEach((section) => sectionObserver.observe(section));
  revealItems.forEach((item) => itemObserver.observe(item));
}

function clearLegacyRevealState() {
  observedSections.forEach((section) => section.classList.remove("reveal-section", "is-visible"));
  revealItems.forEach((item) => {
    item.classList.remove("reveal-item", "is-visible");
    item.style.removeProperty("--reveal-order");
  });
}

function initializeGsapMotion() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("gsap-motion");
  clearLegacyRevealState();

  if (readingProgressFill) {
    gsap.set(readingProgressFill, { scaleX: 0, transformOrigin: "left center" });
    gsap.to(readingProgressFill, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.2,
      },
    });
  }

  const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTimeline
    .fromTo(".hero-visual", { scale: 1.065 }, { scale: 1, duration: 1.45, clearProps: "transform" }, 0)
    .fromTo(".hero-grid", { autoAlpha: 0 }, { opacity: 0.08, visibility: "visible", duration: 0.7, clearProps: "opacity,visibility" }, 0.08)
    .fromTo(".hero .eyebrow", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, clearProps: "transform,opacity,visibility" }, 0.12)
    .fromTo(".hero h1", { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.82, clearProps: "transform,opacity,visibility" }, 0.2)
    .fromTo([".hero-lead", ".hero-framing"], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.08, clearProps: "transform,opacity,visibility" }, 0.45)
    .fromTo(".hero-summary > a", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.58, stagger: 0.09, clearProps: "transform,opacity,visibility" }, 0.58);

  const gsapMedia = gsap.matchMedia();
  gsapMedia.add("(min-width: 761px)", () => {
    gsap.to(".hero-visual-wrap", {
      yPercent: 5,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.45 },
    });
    document.querySelectorAll(".funding-feature figure > img").forEach((image) => {
      gsap.fromTo(image, { scale: 1.055, yPercent: -1.5 }, {
        scale: 1.085,
        yPercent: 1.5,
        ease: "none",
        scrollTrigger: { trigger: image.closest(".funding-feature"), start: "top bottom", end: "bottom top", scrub: 0.55 },
      });
    });
  });

  document.querySelectorAll(".chapter").forEach((section) => {
    const headingTargets = section.querySelectorAll(":scope > .chapter-label, :scope > .section-heading > div, :scope > .section-heading > p");
    if (!headingTargets.length) return;
    gsap.from(headingTargets, {
      autoAlpha: 0,
      y: 26,
      duration: 0.72,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: { trigger: section, start: "top 82%", once: true },
    });
    const label = section.querySelector(":scope > .chapter-label");
    if (label) {
      gsap.fromTo(label, { "--chapter-line-progress": 0 }, {
        "--chapter-line-progress": 1,
        duration: 0.64,
        ease: "power2.out",
        scrollTrigger: { trigger: section, start: "top 82%", once: true },
      });
    }
  });

  const costTarget = Number(estimateValue.dataset.numericValue || estimateValue.textContent);
  gsap.set([estimateValue, calculatorValue], { autoAlpha: 1 });
  estimateValue.textContent = "0.00";
  calculatorValue.textContent = "0.00";
  gsap.set(rangeFill, { width: 0 });

  ScrollTrigger.create({
    trigger: ".estimate-panel",
    start: "top 78%",
    once: true,
    onEnter: () => {
      renderAnimatedNumber(estimateValue, costTarget, { duration: 1.05, from: 0 });
      gsap.to(rangeFill, {
        width: `${rangeFill.dataset.rangeWidth || 0}%`,
        duration: 1,
        ease: "power3.out",
      });
    },
  });
  ScrollTrigger.create({
    trigger: ".calculator-result",
    start: "top 84%",
    once: true,
    onEnter: () => renderAnimatedNumber(
      calculatorValue,
      Number(calculatorValue.dataset.numericValue || calculatorValue.textContent),
      { duration: 0.9, from: 0 },
    ),
  });

  document.querySelectorAll(".flow-stage").forEach((stage) => {
    const cards = stage.querySelectorAll(".flow-card");
    gsap.from(stage, {
      autoAlpha: 0,
      y: 28,
      duration: 0.72,
      ease: "power3.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: { trigger: stage, start: "top 82%", once: true },
    });
    gsap.from(cards, {
      autoAlpha: 0,
      y: 18,
      duration: 0.52,
      stagger: 0.08,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: { trigger: stage, start: "top 72%", once: true },
    });
    ScrollTrigger.create({
      trigger: stage,
      start: "top 62%",
      end: "bottom 38%",
      toggleClass: { targets: stage, className: "motion-active" },
    });
  });

  document.querySelectorAll(".flow-connector").forEach((connector) => {
    gsap.set(connector, { "--flow-progress": 0, "--flow-opacity": 0 });
    gsap.to(connector, {
      "--flow-progress": 1,
      "--flow-opacity": 1,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: connector, start: "top 82%", once: true },
    });
  });

  gsap.from(".system-path-node", {
    autoAlpha: 0,
    y: 20,
    duration: 0.58,
    stagger: 0.12,
    ease: "power3.out",
    clearProps: "transform,opacity,visibility",
    scrollTrigger: { trigger: ".system-path", start: "top 80%", once: true },
  });
  gsap.from(".power-chain > li", {
    autoAlpha: 0,
    y: 18,
    duration: 0.52,
    stagger: 0.07,
    ease: "power2.out",
    clearProps: "transform,opacity,visibility",
    scrollTrigger: { trigger: ".power-chain", start: "top 82%", once: true },
  });

  const genericSequences = [
    ".definition-cards > .definition-card",
    ".estimate-controls > .scenario-button",
    ".narrative-compare > article",
    ".perspective-grid > .perspective-card",
    ".source-faqs > .source-faq",
    ".news-evidence-list:not(.expanded) > li:nth-child(-n+3)",
  ];
  genericSequences.forEach((selector) => {
    const items = gsap.utils.toArray(selector);
    if (!items.length) return;
    gsap.from(items, {
      autoAlpha: 0,
      y: 20,
      duration: 0.58,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: { trigger: items[0].parentElement, start: "top 82%", once: true },
    });
  });

  ScrollTrigger.refresh();
}

siteReadyPromise.finally(() => {
  if (canUseGsapMotion()) initializeGsapMotion();
  else initializeRevealMotion();
});

const sourceCatalog = {
  npcBudget: {
    label: "全國人大・2026 年中央與地方預算草案",
    url: "https://www.npc.gov.cn/npc/c2/c30834/202603/t20260316_453265.html",
  },
  reutersLand: {
    label: "Reuters・地方土地出讓收入與財政壓力",
    url: "https://www.investing.com/news/economy-news/chinas-2024-local-government-land-sales-see-16-drop-in-revenue-3829088",
  },
  leMondeLocal: {
    label: "Le Monde・地方政府財政困境",
    url: "https://www.lemonde.fr/en/economy/article/2024/07/05/china-is-having-trouble-paying-its-finances_6676755_19.html",
  },
  apTechnology: {
    label: "Associated Press・中國監控技術供應鏈調查",
    url: "https://apnews.com/article/chinese-surveillance-silicon-valley-uyghurs-tech-xinjiang-a80904158b771a14d5a734947f28d71b",
  },
  apCameras: {
    label: "Associated Press・監控攝影機與日常治理影像專題",
    url: "https://apnews.com/article/c68debcc6d750b36985b99132df4f784",
  },
  academicStudy: {
    label: "PNAS Nexus・中國數位監控與治理研究",
    url: "https://academic.oup.com/pnasnexus/article/4/10/pgaf331/8287264",
  },
  siteCost: { label: "本站・估算口徑與互動計算器", url: "#cost" },
  siteMethod: { label: "本站・資料方法與限制", url: "#method" },
};

const dialogPresentations = {
  estimate: {
    low: { subtitle: "以較可觀察的中共機關職能建立支出基線", image: "assets/images/scenario-core.jpg", icon: "assets/icons/shield-check.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteCost, sourceCatalog.siteMethod] },
    mid: { subtitle: "從直接機關支出延伸至行政、資料與網路治理", image: "assets/images/scenario-expanded.jpg", icon: "assets/icons/cpu-chip.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.academicStudy, sourceCatalog.siteMethod] },
    high: { subtitle: "再把企業、平台與組織承擔的外溢成本納入分析", image: "assets/images/scenario-social.jpg", icon: "assets/icons/arrows-right-left.svg", sources: [sourceCatalog.apTechnology, sourceCatalog.reutersLand, sourceCatalog.siteMethod] },
  },
  perspective: {
    rights: { subtitle: "從個人自由、隱私與法律保障檢視治理代價", image: "assets/images/scenario-core.jpg", icon: "assets/icons/eye.svg", sources: [sourceCatalog.apCameras, sourceCatalog.apTechnology] },
    business: { subtitle: "從地方財政、資源排擠與投資環境檢視可持續性", image: "assets/images/funding-editorial.webp", icon: "assets/icons/chart-bar-square.svg", sources: [sourceCatalog.reutersLand, sourceCatalog.leMondeLocal] },
    technology: { subtitle: "從資料整合、自動化與供應鏈檢視治理能力", image: "assets/images/scenario-expanded.jpg", icon: "assets/icons/cpu-chip.svg", sources: [sourceCatalog.apTechnology, sourceCatalog.academicStudy] },
    taiwan: { subtitle: "從威權記憶、民主制衡與對台壓力檢視自由邊界", image: "assets/images/hero-main.webp", icon: "assets/icons/shield-check.svg", sources: [sourceCatalog.apCameras, sourceCatalog.siteMethod] },
  },
  system: {
    define: { subtitle: "中共治理從黨如何命名風險開始", image: "assets/images/scenario-core.jpg", icon: "assets/icons/exclamation-triangle.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteMethod] },
    translate: { subtitle: "黨的政策語言被拆成責任、程序與考核", image: "assets/images/scenario-core.jpg", icon: "assets/icons/clipboard-document-list.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteMethod] },
    enforce: { subtitle: "政法機關把安全任務轉成情報、治安與應變", image: "assets/images/scenario-expanded.jpg", icon: "assets/icons/magnifying-glass.svg", sources: [sourceCatalog.apTechnology, sourceCatalog.apCameras] },
    legalize: { subtitle: "中共以依法治理敘事把處置納入制度程序", image: "assets/images/scenario-expanded.jpg", icon: "assets/icons/scale.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteMethod] },
    localize: { subtitle: "中央要求透過屬地責任與地方財力落地", image: "assets/images/scenario-social.jpg", icon: "assets/icons/building-office-2.svg", sources: [sourceCatalog.leMondeLocal, sourceCatalog.reutersLand] },
    normalize: { subtitle: "黨的治理要求透過社區、組織與平台進入日常", image: "assets/images/scenario-social.jpg", icon: "assets/icons/squares-2x2.svg", sources: [sourceCatalog.apCameras, sourceCatalog.academicStudy] },
  },
  funding: {
    labor: { subtitle: "中共如何把社會活動形成的稅基納入公共財政", image: "assets/images/funding-editorial.webp", icon: "assets/icons/user-group.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.leMondeLocal] },
    enterprise: { subtitle: "中共如何把企業同時納入稅基與治理責任", image: "assets/images/funding-editorial.webp", icon: "assets/icons/briefcase.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.apTechnology] },
    assets: { subtitle: "土地與國有資產如何擴大中共可配置的財政空間", image: "assets/images/funding-editorial.webp", icon: "assets/icons/map.svg", sources: [sourceCatalog.reutersLand, sourceCatalog.leMondeLocal] },
    central: { subtitle: "中央財政如何承擔政策統籌與跨地區配置", image: "assets/images/funding-editorial.webp", icon: "assets/icons/building-library.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteMethod] },
    local: { subtitle: "地方財政如何承擔中共治理體系的日常執行", image: "assets/images/funding-editorial.webp", icon: "assets/icons/building-office-2.svg", sources: [sourceCatalog.leMondeLocal, sourceCatalog.reutersLand] },
    transfer: { subtitle: "中共如何用轉移支付把中央要求轉成地方專案", image: "assets/images/funding-editorial.webp", icon: "assets/icons/arrows-right-left.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteMethod] },
    security: { subtitle: "中共如何把預算轉化為執法、司法與應變能力", image: "assets/images/scenario-core.jpg", icon: "assets/icons/shield-check.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.apCameras] },
    network: { subtitle: "中共如何透過地方、平台與社區延伸治理觸角", image: "assets/images/scenario-social.jpg", icon: "assets/icons/signal.svg", sources: [sourceCatalog.apCameras, sourceCatalog.academicStudy] },
    capacity: { subtitle: "中共治理能力如何依靠設備、系統、維護與人力", image: "assets/images/scenario-expanded.jpg", icon: "assets/icons/cpu-chip.svg", sources: [sourceCatalog.apTechnology, sourceCatalog.academicStudy] },
  },
  method: {
    official: { subtitle: "先依中共官方文件建立制度、科目與年度基線", image: "assets/images/funding-editorial.webp", icon: "assets/icons/document-magnifying-glass.svg", sources: [sourceCatalog.npcBudget, sourceCatalog.siteCost] },
    academic: { subtitle: "用透明方法把分散資料轉成可檢驗推論", image: "assets/images/scenario-core.jpg", icon: "assets/icons/building-library.svg", sources: [sourceCatalog.academicStudy, sourceCatalog.siteMethod] },
    media: { subtitle: "以採訪、文件與事件補足地方執行脈絡", image: "assets/images/scenario-expanded.jpg", icon: "assets/icons/globe-alt.svg", sources: [sourceCatalog.apTechnology, sourceCatalog.reutersLand] },
    model: { subtitle: "讓納入範圍、係數與不確定性都能被檢查", image: "assets/images/scenario-social.jpg", icon: "assets/icons/calculator.svg", sources: [sourceCatalog.siteCost, sourceCatalog.siteMethod] },
  },
};

function applyDialogPresentation(dialog, detail, presentation) {
  if (!presentation) return;
  const image = dialog.querySelector("[data-dialog-image]");
  const icon = dialog.querySelector("[data-dialog-icon]");
  const caption = dialog.querySelector("[data-dialog-caption]");
  const subtitle = dialog.querySelector("[data-dialog-subtitle]");
  const sourceList = dialog.querySelector("[data-dialog-sources]");

  image.src = presentation.image;
  image.alt = `${detail.title}主題情境插圖`;
  if (icon) icon.src = presentation.icon;
  if (caption) caption.textContent = `主題插圖・${detail.tag}`;
  subtitle.textContent = presentation.subtitle;
  sourceList.replaceChildren(...presentation.sources.map((source) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const label = document.createElement("span");
    const arrow = document.createElement("img");
    link.href = source.url;
    if (!source.url.startsWith("#")) {
      link.target = "_blank";
      link.rel = "noreferrer";
    } else {
      link.addEventListener("click", () => closeDetailDialog(dialog, { immediate: true }));
    }
    label.textContent = source.label;
    arrow.src = "assets/icons/arrow-right.svg";
    arrow.alt = "";
    arrow.setAttribute("aria-hidden", "true");
    link.append(label, arrow);
    item.append(link);
    return item;
  }));
}

function openDetailDialog(dialog) {
  dialog.scrollTop = 0;
  const shell = dialog.querySelector(".dialog-shell");
  if (shell) shell.scrollTop = 0;
  dialog.querySelectorAll(".dialog-question-disclosure").forEach((disclosure) => {
    disclosure.open = false;
  });
  document.body.classList.add("modal-open");
  if (canUseGsapMotion()) window.gsap.set(dialog, { opacity: 0 });
  dialog.showModal();
  if (canUseGsapMotion()) {
    window.requestAnimationFrame(() => animateDialogOpen(dialog));
  }
}

function animateDialogOpen(dialog) {
  const { gsap } = window;
  const visual = dialog.querySelector(".dialog-visual");
  const shell = dialog.querySelector(".dialog-shell");
  const content = shell?.querySelectorAll(":scope > :not(.dialog-close)") ?? [];
  const isMobile = window.matchMedia("(max-width: 760px)").matches;

  gsap.killTweensOf([dialog, visual, shell, ...content]);
  gsap.set(dialog, { opacity: 0, pointerEvents: "auto" });
  if (visual) gsap.set(visual, isMobile ? { autoAlpha: 0.72, y: 18, scale: 1.025 } : { autoAlpha: 0.72, x: -22, scale: 1.025 });
  if (shell) gsap.set(shell, isMobile ? { autoAlpha: 0, y: 24 } : { autoAlpha: 0, x: 28 });

  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  timeline.to(dialog, { opacity: 1, duration: 0.16, clearProps: "opacity" }, 0);
  if (visual) {
    timeline.to(visual, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.48,
      clearProps: "transform,opacity,visibility",
    }, 0.02);
  }
  if (shell) {
    timeline.to(shell, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      duration: 0.4,
      clearProps: "transform,opacity,visibility",
    }, 0.08);
  }
  if (content.length) {
    timeline.fromTo(content, { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.32,
      stagger: 0.035,
      clearProps: "transform,opacity,visibility",
    }, 0.2);
  }
}

function closeDetailDialog(dialog, { immediate = false } = {}) {
  if (!dialog.open || dialog.dataset.closing === "true") return;
  if (immediate || !canUseGsapMotion()) {
    dialog.close();
    return;
  }

  const { gsap } = window;
  const visual = dialog.querySelector(".dialog-visual");
  const shell = dialog.querySelector(".dialog-shell");
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  dialog.dataset.closing = "true";
  gsap.killTweensOf([dialog, visual, shell]);
  gsap.timeline({
    defaults: { ease: "power2.in" },
    onComplete: () => {
      delete dialog.dataset.closing;
      gsap.set([dialog, visual, shell], { clearProps: "transform,opacity,visibility,pointerEvents" });
      dialog.close();
    },
  })
    .to(shell, { autoAlpha: 0, x: isMobile ? 0 : 18, y: isMobile ? 18 : 0, duration: 0.18 }, 0)
    .to(visual, { autoAlpha: 0.58, scale: 0.99, duration: 0.2 }, 0)
    .to(dialog, { opacity: 0, pointerEvents: "none", duration: 0.2 }, 0.02);
}

document.querySelectorAll("dialog.perspective-dialog").forEach((dialog) => {
  dialog.addEventListener("cancel", (event) => {
    if (!canUseGsapMotion()) return;
    event.preventDefault();
    closeDetailDialog(dialog);
  });
});

const estimateNarratives = {
  low: {
    tag: "估算口徑 01・核心口徑",
    label: "核心口徑",
    value: "1.71",
    moduleNote: "3 個模組・較可觀察的制度支出",
    title: "1.71 兆：從可觀察的制度支出建立基線",
    intro: "1.71 兆不是一筆名為「維穩」的官方總預算，而是把中共治理體系中較容易從公開職能辨認的公安司法、重大事件應變與基層治理合併，建立可供比較的起點。",
    reading: "這個數字回答的是：若先限縮在直接執行安全、秩序與司法治理的模組，年度規模約落在哪裡。它是後續兩種口徑共同沿用的基線。",
    boundary: "公安與司法也服務一般治安及公共服務，因此不能把 1.71 兆全部解讀成政治控制支出。",
    equation: "1.20 ＋ 0.25 ＋ 0.26",
    breakdown: [
      { label: "公安、法院、檢察與監獄", note: "主要制度基線", value: "1.20" },
      { label: "武警與重大事件應變", note: "高強度與臨時執行", value: "0.25" },
      { label: "街道、社區與網格治理", note: "治理落到基層", value: "0.26" },
    ],
  },
  mid: {
    tag: "估算口徑 02・擴展口徑",
    label: "擴展口徑",
    value: "2.27",
    moduleNote: "6 個模組・行政與數位治理",
    title: "2.27 兆：治理能力從政法機關延伸到數位系統",
    intro: "2.27 兆保留 1.71 兆核心基線，再增加 0.56 兆，把網路內容管理、數位監控與資料系統，以及特定時點部署納入，呈現中共治理如何超出傳統公安司法。",
    reading: "新增的 0.56 兆用來表達科技與行政網絡加入後，治理能力不只依靠人員，也依賴平台規則、資料整合、設備維護與臨時動員。",
    boundary: "數位建設也可能服務交通、城市管理等一般用途；公開資料很難把安全用途完整切開，所以 2.27 兆仍是口徑比較值。",
    equation: "1.71 ＋ 0.38 ＋ 0.18",
    breakdown: [
      { label: "核心直接支出", note: "沿用核心口徑", value: "1.71" },
      { label: "內容管理與數位系統", note: "平台規則、監控與資料整合", value: "0.38" },
      { label: "特定時點與臨時部署", note: "事件與敏感時點動員", value: "0.18" },
    ],
  },
  high: {
    tag: "估算口徑 03・社會成本口徑",
    label: "社會成本口徑",
    value: "3.02",
    moduleNote: "9 個模組・間接與外溢成本",
    title: "3.02 兆：治理要求如何外溢到企業與社會組織",
    intro: "3.02 兆以 2.27 兆擴展口徑為基礎，再增加 0.75 兆，把特定地區高密度治理、企業與平台合規，以及宣傳、校園和組織動員納入觀察。",
    reading: "新增的 0.75 兆不是都由政府直接付款，而是用來呈現中共治理要求如何轉化為企業、平台、學校與組織共同承擔的資源成本。",
    boundary: "這一層最難由公開預算直接驗證，也不能與政府財政支出做一比一比較；它用來展示外溢範圍，而非宣稱精確總額。",
    equation: "2.27 ＋ 0.47 ＋ 0.28",
    breakdown: [
      { label: "擴展治理口徑", note: "沿用六個直接與數位模組", value: "2.27" },
      { label: "地區治理與企業合規", note: "高密度治理、平台責任", value: "0.47" },
      { label: "宣傳、校園與組織動員", note: "社會組織共同承擔", value: "0.28" },
    ],
  },
};

const estimateDialog = document.querySelector("#estimate-dialog");
const estimateDialogClose = estimateDialog.querySelector(".dialog-close");
const estimateDialogTag = estimateDialog.querySelector("#estimate-dialog-tag");
const estimateDialogTitle = estimateDialog.querySelector("#estimate-dialog-title");
const estimateDialogIntro = estimateDialog.querySelector("#estimate-dialog-intro");
const estimateDialogValue = estimateDialog.querySelector("#estimate-dialog-value");
const estimateDialogVisualLabel = estimateDialog.querySelector("#estimate-dialog-visual-label");
const estimateDialogVisualNote = estimateDialog.querySelector("#estimate-dialog-visual-note");
const estimateDialogBreakdown = estimateDialog.querySelector("#estimate-dialog-breakdown");
const estimateDialogEquation = estimateDialog.querySelector("#estimate-dialog-equation");
const estimateDialogTotal = estimateDialog.querySelector("#estimate-dialog-total");
const estimateDialogReading = estimateDialog.querySelector("#estimate-dialog-reading");
const estimateDialogBoundary = estimateDialog.querySelector("#estimate-dialog-boundary");
let estimateDialogTrigger = null;

function openEstimateNarrative(key, trigger) {
  const detail = estimateNarratives[key];
  if (!detail) return;
  estimateDialogTrigger = trigger;
  estimateDialogTag.textContent = detail.tag;
  estimateDialogTitle.textContent = detail.title;
  estimateDialogIntro.textContent = detail.intro;
  estimateDialogValue.textContent = detail.value;
  estimateDialogVisualLabel.textContent = detail.label;
  estimateDialogVisualNote.textContent = detail.moduleNote;
  estimateDialogEquation.textContent = detail.equation;
  estimateDialogTotal.textContent = `＝ ${detail.value} 兆`;
  estimateDialogReading.textContent = detail.reading;
  estimateDialogBoundary.textContent = detail.boundary;
  applyDialogPresentation(estimateDialog, detail, dialogPresentations.estimate[key]);
  estimateDialogBreakdown.replaceChildren(...detail.breakdown.map((part) => {
    const item = document.createElement("li");
    const copy = document.createElement("span");
    const label = document.createElement("strong");
    const note = document.createElement("small");
    const value = document.createElement("b");
    label.textContent = part.label;
    note.textContent = part.note;
    value.textContent = `${part.value} 兆`;
    copy.append(label, note);
    item.append(copy, value);
    return item;
  }));
  openDetailDialog(estimateDialog);
}

estimateDialogClose.addEventListener("click", () => closeDetailDialog(estimateDialog));
estimateDialog.addEventListener("click", (event) => {
  if (event.target === estimateDialog) closeDetailDialog(estimateDialog);
});
estimateDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  estimateDialogTrigger?.focus({ preventScroll: true });
});

const perspectiveDetails = {
  rights: {
    tag: "外部檢驗・權利視角",
    title: "權利受到哪些影響？",
    intro: "離開中共以安全、秩序與發展為核心的官方敘事後，權利視角把注意力轉向治理措施如何影響個人的表達、組織、隱私與法律保障。",
    question: "國家安全與基本權利的界線由誰決定，又由誰監督？",
    points: [
      "言論、新聞、宗教與結社空間是否受到限制",
      "異議人士、律師、少數群體與公民組織的處境",
      "拘留、審判與其他法律程序是否透明且可預測",
    ],
  },
  business: {
    tag: "外部檢驗・財政與商業",
    title: "財政能否持續承擔？",
    intro: "中共把穩定視為發展的前提；財政與商業視角則反向檢驗，維持這套穩定所需的支出是否排擠公共服務並改變投資環境。",
    question: "當經濟與土地收入放緩，治理成本是否會排擠其他公共支出？",
    points: [
      "地方債務、土地收入與中央轉移支付的變化",
      "監控系統、人員與平台治理的持續性成本",
      "資料合規、政策不確定性與企業投資風險",
    ],
  },
  technology: {
    tag: "外部檢驗・科技治理",
    title: "技術如何改變治理？",
    intro: "中共以精準治理、風險預警與行政效率說明技術用途；外部科技視角則檢驗資料、演算法與行政權力被整合後帶來的規模效應。",
    question: "技術提高治理效率的同時，是否也擴大了監控的深度與規模？",
    points: [
      "人臉辨識、位置資料與跨資料庫整合",
      "內容審查、風險預警及自動化決策",
      "監控技術供應鏈、出口及其他地區的採用方式",
    ],
  },
  taiwan: {
    tag: "外部檢驗・台灣民主",
    title: "這對台灣意味著什麼？",
    intro: "中共把對台工作納入國家統一與安全敘事；台灣民主視角則從威權歷史、民主化經驗，以及中國長期對台施加的政治與資訊壓力加以檢驗。",
    question: "面對安全威脅時，台灣如何維持秩序，同時保住監督與發聲的空間？",
    points: [
      "戒嚴與白色恐怖記憶如何影響今日的警覺",
      "媒體影響、資訊操作與社會信任的變化",
      "司法、國會、媒體與公民社會能否持續制衡權力",
    ],
  },
};

const perspectiveDialog = document.querySelector("#perspective-dialog");
const perspectiveCards = document.querySelectorAll(".perspective-card");
const dialogClose = perspectiveDialog.querySelector(".dialog-close");
const dialogTag = perspectiveDialog.querySelector("#dialog-tag");
const dialogTitle = perspectiveDialog.querySelector("#dialog-title");
const dialogIntro = perspectiveDialog.querySelector("#dialog-intro");
const dialogQuestion = perspectiveDialog.querySelector("#dialog-question");
const dialogPoints = perspectiveDialog.querySelector("#dialog-points");
let dialogTrigger = null;

perspectiveCards.forEach((card) => {
  card.addEventListener("click", () => {
    const key = card.dataset.perspective;
    const detail = perspectiveDetails[key];
    if (!detail) return;

    dialogTrigger = card;
    dialogTag.textContent = detail.tag;
    dialogTitle.textContent = detail.title;
    dialogIntro.textContent = detail.intro;
    dialogQuestion.textContent = detail.question;
    applyDialogPresentation(perspectiveDialog, detail, dialogPresentations.perspective[key]);
    dialogPoints.replaceChildren(
      ...detail.points.map((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        return item;
      }),
    );
    openDetailDialog(perspectiveDialog);
  });
});

dialogClose.addEventListener("click", () => closeDetailDialog(perspectiveDialog));

perspectiveDialog.addEventListener("click", (event) => {
  if (event.target === perspectiveDialog) closeDetailDialog(perspectiveDialog);
});

perspectiveDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  dialogTrigger?.focus({ preventScroll: true });
});

const systemDetails = {
  define: {
    tag: "中共治理鏈 01・定義風險",
    title: "中共如何決定什麼是風險？",
    intro: "依中共治理邏輯，執法之前先要由黨的決策與安全體系界定哪些事件涉及政治安全、社會穩定或公共秩序。",
    question: "在中共的安全框架中，完成風險命名是調動政法、財政與行政資源的前提。",
    points: ["政治安全被置於國家安全與社會穩定的核心", "黨中央、國安與政法政策體系形成風險分類", "分類結果決定後續任務層級與可動用資源"],
  },
  translate: {
    tag: "中共治理鏈 02・轉譯任務",
    title: "黨的安全要求如何成為行政任務？",
    intro: "中共透過政法協調與中央、地方工作機制，把政治方向拆成目標、責任分工、回報制度與地方考核。",
    question: "在黨領導政法工作的架構下，協調系統使不同機關沿同一政治目標運作。",
    points: ["政法協調機制承接黨的政策與安全判斷", "任務被轉成責任單位、時間要求與回報路徑", "屬地責任與考核把中央要求逐級傳導至地方"],
  },
  enforce: {
    tag: "中共治理鏈 03・情報執法",
    title: "中共如何把風險判斷轉成現場行動？",
    intro: "中共透過公安、國安與武警等單位，把上游的安全判斷轉化為情報蒐集、治安管理、調查、管制與事件應變。",
    question: "在中共治理敘事中，情報與執法是及早發現風險、控制事態並維持秩序的執行核心。",
    points: ["公安負責廣泛的治安與行政執法", "國安系統關注政治安全、情報與反間諜", "武警通常涉及重大事件、反恐與高強度應變"],
  },
  legalize: {
    tag: "中共治理鏈 04・法定程序",
    title: "中共如何把處置納入法律程序？",
    intro: "中共以依法治國與依法治理說明制度正當性；執法之後，案件可進入起訴、審判、羈押、監獄或其他司法行政程序。",
    question: "在中共制度敘事中，法定程序把一次性處置轉成可持續、可複製的治理秩序。",
    points: ["法院、檢察與司法行政承擔不同法定職能", "程序把政治與安全要求轉成案件處理流程", "司法與行政規則使治理能力得以常態化運作"],
  },
  localize: {
    tag: "中共治理鏈 05・地方執行",
    title: "中央要求如何在地方落地？",
    intro: "中共透過地方黨委、政府、政法系統與街道機構承接中央要求，再依區域情況配置財力、人力並承擔屬地責任。",
    question: "在中共治理邏輯中，地方化讓風險處理貼近現場，也讓責任與考核逐級下沉。",
    points: ["省、市、縣及街道形成多層級執行網絡", "地方黨委統籌行政與政法資源", "敏感事件與重要時點可觸發臨時部署"],
  },
  normalize: {
    tag: "中共治理鏈 06・日常治理",
    title: "中共如何把治理嵌入日常？",
    intro: "中共把基層治理視為國家治理的末梢，透過社區、學校、工作場所、平台規則與技術系統把政策要求帶入日常互動。",
    question: "在中共的治理效能敘事中，治理節點越接近居民，風險發現與行政回應就越及時。",
    points: ["居委會、網格員與基層組織掌握在地資訊", "學校、企業與平台承擔不同程度的治理責任", "資料系統與組織網絡讓治理要求常態化"],
  },
};

const systemDialog = document.querySelector("#system-dialog");
const systemCards = document.querySelectorAll(".system-step");
const systemDialogClose = systemDialog.querySelector(".dialog-close");
const systemDialogTag = systemDialog.querySelector("#system-dialog-tag");
const systemDialogTitle = systemDialog.querySelector("#system-dialog-title");
const systemDialogIntro = systemDialog.querySelector("#system-dialog-intro");
const systemDialogQuestion = systemDialog.querySelector("#system-dialog-question");
const systemDialogPoints = systemDialog.querySelector("#system-dialog-points");
const systemGroupButtons = document.querySelectorAll(".system-path-node[data-system-group]");
const systemPath = document.querySelector(".system-path");
const systemSteps = document.querySelector("#system-steps");
const systemShowAllButton = document.querySelector("#system-show-all");
const systemShowAllLabel = systemShowAllButton?.querySelector("span");
const systemFilterLabel = document.querySelector("#system-filter-label");
const systemGroupMap = {
  policy: ["define", "translate"],
  execution: ["enforce", "legalize"],
  local: ["localize", "normalize"],
};
const systemGroupLabels = {
  policy: "01–02・定義風險與任務",
  execution: "03–04・執行與法定程序",
  local: "05–06・地方執行與日常",
};
const narrativeComparison = document.querySelector(".narrative-compare");
const compareInternalTitle = document.querySelector("#compare-internal-title");
const compareInternalCopy = document.querySelector("#compare-internal-copy");
const compareExternalTitle = document.querySelector("#compare-external-title");
const compareExternalCopy = document.querySelector("#compare-external-copy");
const comparisonDetails = {
  overall: {
    label: "整體治理鏈",
    internalTitle: "秩序、安全與行政協調",
    internalCopy: "中共將風險防範、矛盾化解與公共秩序視為發展前提，並以跨部門協調和基層執行證明治理能力。",
    externalTitle: "監督、程序與自由邊界",
    externalCopy: "追問誰定義風險、誰監督監控者，以及維持秩序是否壓縮了表達、組織與抗議空間。",
  },
  policy: {
    label: "步驟 01–02・風險與任務",
    internalTitle: "統一判斷，快速形成治理任務",
    internalCopy: "中共以集中領導統一安全口徑，再把抽象風險拆成跨部門可執行、可考核的責任。",
    externalTitle: "定義權是否受到公開檢驗？",
    externalCopy: "外部觀察會檢查風險定義是否過度擴張，以及政策目標、責任歸屬與救濟空間是否透明。",
  },
  execution: {
    label: "步驟 03–04・執行與程序",
    internalTitle: "把安全任務納入執法與制度程序",
    internalCopy: "公安、國安與政法機關依任務蒐集資訊、處理事件，再由司法與行政程序形成持續執行能力。",
    externalTitle: "程序能否真正約束執行權？",
    externalCopy: "外部檢驗聚焦監控、執法與司法之間是否存在獨立監督，以及個人能否有效申訴與救濟。",
  },
  local: {
    label: "步驟 05–06・地方與日常",
    internalTitle: "讓治理貼近現場並持續運作",
    internalCopy: "中共透過屬地責任、街道社區與平台組織，把中央要求轉成在地配置、日常巡查與快速回應。",
    externalTitle: "治理深入日常後，邊界在哪裡？",
    externalCopy: "外部觀察會追問基層掌握資訊的範圍、企業與平台責任，以及日常管理是否形成持續監控。",
  },
  define: {
    label: "步驟 01・定義風險",
    internalTitle: "用統一口徑辨識政治與社會風險",
    internalCopy: "中共認為先建立一致的安全判斷，才能及早配置部門、人力與財政資源。",
    externalTitle: "誰決定哪些人與事件構成風險？",
    externalCopy: "需要檢驗風險分類是否公開、可質疑，以及政治異議是否被一併納入安全治理。",
  },
  translate: {
    label: "步驟 02・轉譯為任務",
    internalTitle: "把政策訊號拆成責任與考核",
    internalCopy: "政法協調系統將中央要求轉成部門任務、地方責任與可追蹤的執行節點。",
    externalTitle: "任務下達是否伴隨責任公開？",
    externalCopy: "需要檢驗政策目標、執行依據與問責方式，避免模糊命令造成層層加碼。",
  },
  enforce: {
    label: "步驟 03・情報與執法",
    internalTitle: "用情報與執法縮短風險回應時間",
    internalCopy: "公安、國安與武警依任務掌握資訊、處理事件並維持中共所定義的公共秩序。",
    externalTitle: "監控與強制力由誰監督？",
    externalCopy: "核心檢驗包括資料蒐集範圍、執法比例原則，以及被監控者是否有知情與救濟可能。",
  },
  legalize: {
    label: "步驟 04・納入法定程序",
    internalTitle: "以程序讓治理措施制度化",
    internalCopy: "中共透過法院、檢察與司法行政，把安全處置納入案件、羈押、審判與矯正流程。",
    externalTitle: "法定程序能否制衡政治要求？",
    externalCopy: "外部檢驗關注審判獨立、律師權利、證據規則與程序是否足以限制先行的政治判斷。",
  },
  localize: {
    label: "步驟 05・地方執行",
    internalTitle: "以屬地責任貼近現場配置資源",
    internalCopy: "地方黨委、政府與街道依地區風險調度預算、人力與臨時部署，承接中央治理要求。",
    externalTitle: "地方壓力是否導致治理加碼？",
    externalCopy: "需要檢驗考核與問責是否鼓勵過度執行，以及地方財政壓力如何影響公共服務取捨。",
  },
  normalize: {
    label: "步驟 06・嵌入日常治理",
    internalTitle: "透過基層與平台建立常態回應網絡",
    internalCopy: "社區、學校、企業與平台成為治理節點，使政策訊號能進入日常互動並及早回報。",
    externalTitle: "日常治理是否壓縮私人與公共空間？",
    externalCopy: "外部檢驗聚焦資料邊界、平台責任與組織動員，並追問個人能否拒絕或挑戰治理要求。",
  },
};
let systemDialogTrigger = null;
let selectedSystemGroup = "policy";
let showAllSystemSteps = false;

function updateNarrativeComparison(key = "overall") {
  const detail = comparisonDetails[key] ?? comparisonDetails.overall;
  if (!narrativeComparison) return;

  narrativeComparison.dataset.compareKey = key;
  compareInternalTitle.textContent = detail.internalTitle;
  compareInternalCopy.textContent = detail.internalCopy;
  compareExternalTitle.textContent = detail.externalTitle;
  compareExternalCopy.textContent = detail.externalCopy;

  if (canUseGsapMotion()) {
    const content = narrativeComparison.querySelectorAll("article > :not(span)");
    window.gsap.killTweensOf(content);
    window.gsap.fromTo(content, { opacity: 0.45 }, {
      opacity: 1,
      duration: 0.2,
      stagger: 0.018,
      ease: "power1.out",
      clearProps: "opacity",
    });
  }
}

function previewSystemGroup(groupKey, enabled) {
  const previewSteps = enabled ? (systemGroupMap[groupKey] ?? []) : [];

  systemGroupButtons.forEach((button) => {
    button.classList.toggle(
      "group-preview",
      enabled && button.dataset.systemGroup === groupKey,
    );
  });

  systemCards.forEach((card) => {
    card.closest("li")?.classList.toggle(
      "group-preview",
      previewSteps.includes(card.dataset.systemStep),
    );
  });
}

function previewSystemStep(card, enabled) {
  card.closest("li")?.classList.toggle("group-preview", enabled);
}

function renderSystemFilter() {
  const visibleSteps = systemGroupMap[selectedSystemGroup] ?? [];

  systemGroupButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.systemGroup === selectedSystemGroup));
  });
  systemCards.forEach((card) => {
    card.closest("li").hidden = !showAllSystemSteps && !visibleSteps.includes(card.dataset.systemStep);
  });
  systemSteps?.classList.toggle("is-filtered", !showAllSystemSteps);
  systemShowAllButton?.setAttribute("aria-expanded", String(showAllSystemSteps));
  if (systemShowAllLabel) {
    systemShowAllLabel.textContent = showAllSystemSteps ? "收合至目前階段" : "查看全部六步";
  }
  if (systemFilterLabel) {
    systemFilterLabel.textContent = showAllSystemSteps
      ? `完整六步・${systemGroupLabels[selectedSystemGroup]}`
      : systemGroupLabels[selectedSystemGroup];
  }
  updateNarrativeComparison(selectedSystemGroup);
}

systemGroupButtons.forEach((button) => {
  const groupKey = button.dataset.systemGroup;
  button.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") {
      previewSystemGroup(groupKey, true);
      updateNarrativeComparison(groupKey);
    }
  });
  button.addEventListener("pointerleave", () => {
    previewSystemGroup(groupKey, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
  button.addEventListener("pointercancel", () => {
    previewSystemGroup(groupKey, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
  button.addEventListener("focus", () => {
    if (button.matches(":focus-visible")) {
      previewSystemGroup(groupKey, true);
      updateNarrativeComparison(groupKey);
    }
  });
  button.addEventListener("blur", () => {
    previewSystemGroup(groupKey, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
  button.addEventListener("click", () => {
    previewSystemGroup(groupKey, false);
    selectedSystemGroup = groupKey;
    showAllSystemSteps = false;
    renderSystemFilter();
  });
});

systemShowAllButton?.addEventListener("click", () => {
  showAllSystemSteps = !showAllSystemSteps;
  previewSystemGroup(null, false);
  renderSystemFilter();
});

systemCards.forEach((card) => {
  const stepKey = card.dataset.systemStep;
  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") {
      previewSystemStep(card, true);
      updateNarrativeComparison(stepKey);
    }
  });
  card.addEventListener("pointerleave", () => {
    previewSystemStep(card, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
  card.addEventListener("pointercancel", () => {
    previewSystemStep(card, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
  card.addEventListener("focus", () => {
    if (card.matches(":focus-visible")) {
      previewSystemStep(card, true);
      updateNarrativeComparison(stepKey);
    }
  });
  card.addEventListener("blur", () => {
    previewSystemStep(card, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
  card.addEventListener("click", () => {
    previewSystemStep(card, false);
    const key = card.dataset.systemStep;
    const detail = systemDetails[key];
    if (!detail) return;
    systemDialogTrigger = card;
    systemDialogTag.textContent = detail.tag;
    systemDialogTitle.textContent = detail.title;
    systemDialogIntro.textContent = detail.intro;
    systemDialogQuestion.textContent = detail.question;
    applyDialogPresentation(systemDialog, detail, dialogPresentations.system[key]);
    systemDialogPoints.replaceChildren(...detail.points.map((point) => {
      const item = document.createElement("li");
      item.textContent = point;
      return item;
    }));
    openDetailDialog(systemDialog);
  });
});

[systemPath, systemSteps].forEach((container) => {
  container?.addEventListener("pointerleave", () => {
    previewSystemGroup(null, false);
    updateNarrativeComparison(selectedSystemGroup);
  });
});

renderSystemFilter();

window.addEventListener("blur", () => {
  previewDefinitionCard();
  previewSystemGroup(null, false);
  updateNarrativeComparison(selectedSystemGroup);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    previewDefinitionCard();
    previewSystemGroup(null, false);
  }
});

systemDialogClose.addEventListener("click", () => closeDetailDialog(systemDialog));
systemDialog.addEventListener("click", (event) => {
  if (event.target === systemDialog) closeDetailDialog(systemDialog);
});
systemDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  systemDialogTrigger?.focus({ preventScroll: true });
});

const fundingDetails = {
  labor: {
    tag: "上游・收入來源",
    title: "消費與勞動",
    intro: "在中共公共財政架構中，居民消費、勞動與日常交易形成稅基，是國家可配置收入最廣泛的社會來源之一。收入先進入一般財政，再由黨政體系透過預算程序分配。",
    question: "中共不是把某一筆稅收直接標記為維穩費，而是先集中形成公共財力，再依治理優先順序配置。",
    points: ["消費與交易可能對應流轉稅等收入", "勞動與所得活動構成部分直接稅稅基", "這些收入通常先進入一般財政，並非專門標記為治理支出"],
  },
  enterprise: {
    tag: "上游・收入來源",
    title: "企業活動",
    intro: "在中共治理架構中，企業經營提供稅收、就業與經濟產出；企業與平台同時也被要求承擔資料、內容與行政合規責任。",
    question: "企業既是中共財政治理的收入來源，也是黨政規則向社會延伸的執行節點。",
    points: ["企業所得與交易活動形成稅收", "國企與民營企業承擔的角色並不相同", "平台合規成本可能反映在企業支出，而不會完整出現在政府預算"],
  },
  assets: {
    tag: "上游・資產來源",
    title: "土地與國有資產",
    intro: "中共透過土地制度、國有資產經營與國企收益補充中央或地方可配置的公共資源，形成稅收之外的治理財力。",
    question: "土地與國有資產擴大黨政體系的資源動員空間，但也使地方治理能力受到資產景氣影響。",
    points: ["土地相關收入與地方房地產景氣高度相關", "國企收益可能透過不同制度進入公共財政", "資產收入下降時，地方支出安排與債務壓力可能同時受到影響"],
  },
  central: {
    tag: "中游・財政配置",
    title: "中央財政",
    intro: "在中共集中統一領導下，中央財政承擔全國性政策、中央機關支出與對地方的轉移支付，提供政策方向與再分配能力。",
    question: "中央決定治理優先順序與跨地區配置，但大量日常維穩支出仍由地方實際編列與執行。",
    points: ["中央本級預算只呈現中央單位的一部分支出", "跨區域政策可能透過轉移支付或專案落地", "理解總成本時不能只看中央本級公共安全科目"],
  },
  local: {
    tag: "中游・財政配置",
    title: "地方財政",
    intro: "中共透過屬地管理把公安、街道、社區與日常行政責任下沉到地方，使地方財政成為維穩能力的主要執行端。",
    question: "地方黨委與政府把中央政策轉成具體人力、採購、專案與行政支出。",
    points: ["省、市、縣等層級的財政能力差異很大", "同類支出可能分散在不同部門與預算名稱下", "土地收入、債務與轉移支付會影響地方的可持續性"],
  },
  transfer: {
    tag: "中游・跨層級配置",
    title: "轉移支付與專案",
    intro: "中共透過一般性或專項轉移支付補充地方財力，再由地方以預算或專案採購建置人力、設備與系統。",
    question: "跨層級配置使中央治理要求能在不同地區落地，也讓相關資金分散到更多科目與年度。",
    points: ["一般性轉移支付不一定能直接對應單一用途", "專項資金通常有較明確的政策目標", "設備建置、維護與人力可能分別出現在不同年度或科目"],
  },
  security: {
    tag: "下游・治理支出",
    title: "公安與司法",
    intro: "中共把公安與司法體系視為維護國家安全、社會秩序與依法治理的制度支柱，相關預算轉化為治安、調查、起訴、審判、羈押與司法行政能力。",
    question: "這是中共治理能力最可見的執行層，但公開公共安全支出仍不能全部等同於政治維穩。",
    points: ["公安支出同時包含一般犯罪防治與行政服務", "法院、檢察與監獄具有不同法定職能", "估算時需要避免把全部公共安全支出直接視為單一用途"],
  },
  network: {
    tag: "下游・治理支出",
    title: "網路與基層治理",
    intro: "中共以基層治理與網路綜合治理延伸國家能力，透過地方行政、街道社區與平台責任把治理要求帶入網路空間和日常生活。",
    question: "相關資源分散在人力、委外服務、平台合規與一般行政之中，形成政府與組織共同執行的治理網絡。",
    points: ["街道、社區與網格治理多由地方執行", "平台治理成本可能由政府與企業分別承擔", "公開資料往往難以完整切分一般服務與風險管理用途"],
  },
  capacity: {
    tag: "下游・治理能力",
    title: "設備、系統與人力",
    intro: "中共以科技賦能與精準治理說明數位建設，攝影設備、資料平台、軟體維護與執行人員共同構成可持續運作的治理能力。",
    question: "對中共而言，設備建置只是起點，持續維護、資料整合與組織人力才使系統成為常態治理工具。",
    points: ["硬體採購與軟體服務可能分屬不同契約", "資料整合需要持續的技術與行政協調", "自動化可以改變人力配置，但不必然降低總成本"],
  },
};

const fundingDialog = document.querySelector("#funding-dialog");
const fundingCards = document.querySelectorAll(".funding-detail");
const fundingDialogClose = fundingDialog.querySelector(".dialog-close");
const fundingDialogTag = fundingDialog.querySelector("#funding-dialog-tag");
const fundingDialogTitle = fundingDialog.querySelector("#funding-dialog-title");
const fundingDialogIntro = fundingDialog.querySelector("#funding-dialog-intro");
const fundingDialogQuestion = fundingDialog.querySelector("#funding-dialog-question");
const fundingDialogPoints = fundingDialog.querySelector("#funding-dialog-points");
let fundingDialogTrigger = null;

fundingCards.forEach((card) => {
  card.addEventListener("click", () => {
    const key = card.dataset.fundingDetail;
    const detail = fundingDetails[key];
    if (!detail) return;
    fundingDialogTrigger = card;
    fundingDialogTag.textContent = detail.tag;
    fundingDialogTitle.textContent = detail.title;
    fundingDialogIntro.textContent = detail.intro;
    fundingDialogQuestion.textContent = detail.question;
    applyDialogPresentation(fundingDialog, detail, dialogPresentations.funding[key]);
    fundingDialogPoints.replaceChildren(...detail.points.map((point) => {
      const item = document.createElement("li");
      item.textContent = point;
      return item;
    }));
    openDetailDialog(fundingDialog);
  });
});

fundingDialogClose.addEventListener("click", () => closeDetailDialog(fundingDialog));
fundingDialog.addEventListener("click", (event) => {
  if (event.target === fundingDialog) closeDetailDialog(fundingDialog);
});
fundingDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  fundingDialogTrigger?.focus({ preventScroll: true });
});

const sourceDetails = {
  official: {
    tag: "第一層・中共官方公布",
    title: "先理解中共如何命名制度與預算",
    intro: "中共政府的預決算、統計公報與正式文件，是理解其制度語言、機關職掌、公開科目及年度變化的第一層證據。",
    question: "先依中共官方定義辨識政策與機關，再判斷公開數字實際涵蓋哪些治理職能。",
    points: ["優先記錄中共官方原始文件、發布日期與頁碼", "區分中央本級、地方合計與全國口徑", "官方公共安全科目不能直接等同於本站所稱的全部維穩成本"],
    caveat: "中共官方資料具有可追溯性，但其公開程度、分類方式與政治敘事也會限制外部比較。",
  },
  academic: {
    tag: "第二層・學術研究",
    title: "把分散資料轉成可檢驗的推論",
    intro: "論文與研究機構資料可補充定義、比較方法和長期趨勢，也能說明估算如何處理資料缺口。",
    question: "檢查研究問題、納入範圍、資料年份與方法是否適合本站要回答的問題。",
    points: ["辨識研究採用的維穩或國內安全定義", "比較樣本期間、價格基準與是否調整通膨", "優先採用方法透明且能重複核對的研究"],
    caveat: "研究結論受資料與模型假設限制，不同論文的數字未必能直接相加或比較。",
  },
  media: {
    tag: "第三層・媒體調查",
    title: "補足事件、採購與地方執行脈絡",
    intro: "具名媒體的調查與採訪能呈現公開預算之外的執行情況、地方差異及技術供應鏈。",
    question: "把媒體報導視為線索與情境證據，並回查其中引用的文件、採購資料與受訪來源。",
    points: ["區分新聞事實、匿名說法與評論推論", "交叉比對不同媒體與原始資料", "留意個別事件不能直接外推為全國年度成本"],
    caveat: "媒體調查提供重要脈絡，但採訪可得性與報導選題可能造成樣本偏差。",
  },
  model: {
    tag: "第四層・本站模型",
    title: "用透明假設呈現估算區間",
    intro: "本站先依中共治理架構辨識可觀察支出，再把較難直接追蹤的治理與外溢模組組合成不同口徑，用來解釋估算為何形成區間。",
    question: "每一個模型數字都應能回到納入項目、基準金額與情境係數，而不是被當成官方總預算。",
    points: ["核心、擴展與社會成本口徑不可混為單一結論", "互動計算器用於理解敏感度，不代表精確預測", "正式版應標示來源、年份、公式與不確定範圍"],
    caveat: "目前數字仍屬試作假設，尚未完成逐項查證，不應作為研究、投資或政策判斷的唯一依據。",
  },
};

const methodDialog = document.querySelector("#method-dialog");
const sourceCards = document.querySelectorAll(".source-detail-button");
const sourceFaqs = document.querySelectorAll(".source-faq");
const methodDialogClose = methodDialog.querySelector(".dialog-close");
const methodDialogTag = methodDialog.querySelector("#method-dialog-tag");
const methodDialogTitle = methodDialog.querySelector("#method-dialog-title");
const methodDialogIntro = methodDialog.querySelector("#method-dialog-intro");
const methodDialogQuestion = methodDialog.querySelector("#method-dialog-question");
const methodDialogPoints = methodDialog.querySelector("#method-dialog-points");
const methodDialogCaveat = methodDialog.querySelector("#method-dialog-caveat");
let methodDialogTrigger = null;

sourceFaqs.forEach((faq) => {
  faq.addEventListener("toggle", () => {
    if (!faq.open) return;
    sourceFaqs.forEach((otherFaq) => {
      if (otherFaq !== faq) otherFaq.open = false;
    });
    if (canUseGsapMotion()) {
      const answer = faq.querySelector(".source-faq-answer");
      window.gsap.fromTo(answer, { autoAlpha: 0, height: 0, y: -8 }, {
        autoAlpha: 1,
        height: "auto",
        y: 0,
        duration: 0.34,
        ease: "power2.out",
        clearProps: "height,transform,opacity,visibility",
        onComplete: () => window.ScrollTrigger?.refresh(),
      });
    }
  });
});

sourceCards.forEach((card) => {
  card.addEventListener("click", () => {
    const key = card.dataset.sourceDetail;
    const detail = sourceDetails[key];
    if (!detail) return;
    methodDialogTrigger = card;
    methodDialogTag.textContent = detail.tag;
    methodDialogTitle.textContent = detail.title;
    methodDialogIntro.textContent = detail.intro;
    methodDialogQuestion.textContent = detail.question;
    applyDialogPresentation(methodDialog, detail, dialogPresentations.method[key]);
    methodDialogPoints.replaceChildren(...detail.points.map((point) => {
      const item = document.createElement("li");
      item.textContent = point;
      return item;
    }));
    methodDialogCaveat.textContent = detail.caveat;
    openDetailDialog(methodDialog);
  });
});

methodDialogClose.addEventListener("click", () => closeDetailDialog(methodDialog));
methodDialog.addEventListener("click", (event) => {
  if (event.target === methodDialog) closeDetailDialog(methodDialog);
});
methodDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  methodDialogTrigger?.focus({ preventScroll: true });
});

const externalNewsList = document.querySelector("#external-news-list");
const externalNewsToggle = document.querySelector(".news-list-toggle");

externalNewsToggle?.addEventListener("click", () => {
  const expanded = externalNewsToggle.getAttribute("aria-expanded") === "true";
  const shouldExpand = !expanded;
  const additionalItems = externalNewsList ? [...externalNewsList.children].slice(3) : [];
  externalNewsToggle.setAttribute("aria-expanded", String(shouldExpand));
  externalNewsToggle.querySelector("span").textContent = expanded
    ? "顯示全部 10 則報導"
    : "收合至 3 則報導";

  if (!externalNewsList || !canUseGsapMotion()) {
    externalNewsList?.classList.toggle("expanded", shouldExpand);
    requestNavigationUpdate();
    return;
  }

  window.gsap.killTweensOf(additionalItems);
  if (shouldExpand) {
    externalNewsList.classList.add("expanded");
    window.gsap.fromTo(additionalItems, { autoAlpha: 0, y: 14 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.38,
      stagger: 0.045,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility",
      onComplete: () => {
        window.ScrollTrigger?.refresh();
        requestNavigationUpdate();
      },
    });
  } else {
    window.gsap.to(additionalItems, {
      autoAlpha: 0,
      y: -8,
      duration: 0.24,
      stagger: { each: 0.025, from: "end" },
      ease: "power2.in",
      onComplete: () => {
        externalNewsList.classList.remove("expanded");
        window.gsap.set(additionalItems, { clearProps: "transform,opacity,visibility" });
        window.ScrollTrigger?.refresh();
        requestNavigationUpdate();
      },
    });
  }
});

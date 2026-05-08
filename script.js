(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    document.body.classList.add("reduce-motion");
  }

  const taglineText = document.getElementById("taglineText");
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  const glowItems = Array.from(document.querySelectorAll(".glass-card, .skill-branch"));
  const scrollSections = Array.from(document.querySelectorAll(".scroll-section"));

  const taglines = [
    "From logic to launch - I build what matters.",
    "Responsive interfaces. Reliable backends. Real outcomes.",
    "Turning practical ideas into clean full stack systems.",
    "Frontend polish with backend discipline."
  ];
  let taglineIndex = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateScrollEffects() {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const pageProgress = clamp(window.scrollY / maxScroll, 0, 1);
    document.documentElement.style.setProperty("--scroll-page", pageProgress.toFixed(4));

    scrollSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      section.style.setProperty("--section-progress", progress.toFixed(4));
    });
  }

  function rotateTagline() {
    if (!taglineText) return;
    taglineText.classList.add("is-switching");

    window.setTimeout(() => {
      taglineIndex = (taglineIndex + 1) % taglines.length;
      taglineText.textContent = taglines[taglineIndex];
      taglineText.classList.remove("is-switching");
    }, 320);
  }

  function setupRevealObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });

    revealItems.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 70}ms`);
      observer.observe(item);
    });
  }

  function setupGlowTracking() {
    glowItems.forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        item.style.setProperty("--glow-x", `${x}%`);
        item.style.setProperty("--glow-y", `${y}%`);
      });
    });
  }

  function setFieldValidity(field, valid) {
    field.classList.toggle("is-invalid", !valid);
  }

  function validateContactForm(form) {
    const name = form.elements.name;
    const email = form.elements.email;
    const message = form.elements.message;
    const nameValid = /^[A-Za-z .'-]{2,70}$/.test(name.value.trim());
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    const messageValue = message.value.trim();
    const messageValid = messageValue.length >= 20 && messageValue.length <= 1200;

    setFieldValidity(name, nameValid);
    setFieldValidity(email, emailValid);
    setFieldValidity(message, messageValid);

    return nameValid && emailValid && messageValid;
  }

  const contactForm = document.querySelector(".contact-form");
  if (contactForm) {
    const status = document.getElementById("formStatus");
    Array.from(contactForm.elements).forEach((field) => {
      if (!["INPUT", "TEXTAREA"].includes(field.tagName)) return;
      field.addEventListener("input", () => {
        if (field.classList.contains("is-invalid")) {
          validateContactForm(contactForm);
        }
      });
    });

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      status.textContent = "";
      status.classList.remove("is-error");

      if (window.location.protocol === "file:") {
        status.textContent = "Open this site through XAMPP at http://localhost/portfolio/ so PHP can send the message.";
        status.classList.add("is-error");
        return;
      }

      if (!validateContactForm(contactForm)) {
        status.textContent = "Please fix the highlighted fields before sending.";
        status.classList.add("is-error");
        return;
      }

      button.disabled = true;
      button.textContent = "Sending...";

      fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: {
          "Accept": "application/json"
        }
      })
        .then((response) => response.text())
        .then((text) => {
          let result;
          try {
            result = JSON.parse(text);
          } catch (error) {
            throw new Error("The mail script returned a server error. Check XAMPP PHP mail/SMTP settings.");
          }

          if (!result.ok) {
            if (result.code === "mail_not_configured" && result.mailto) {
              status.textContent = "Your email app is opening with the message ready to send.";
              window.location.href = result.mailto;
              return;
            }
            throw new Error(result.message || "Message could not be sent.");
          }

          status.textContent = "Message sent successfully.";
          contactForm.reset();
        })
        .catch((error) => {
          status.textContent = error.message || "Message could not be sent. Please email me directly.";
          status.classList.add("is-error");
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = "Send Message";
        });
    });
  }

  setupRevealObserver();
  setupGlowTracking();
  updateScrollEffects();

  window.addEventListener("resize", updateScrollEffects, { passive: true });
  window.addEventListener("scroll", updateScrollEffects, { passive: true });

  if (!prefersReducedMotion) {
    window.setInterval(rotateTagline, 3000);
  }
}());

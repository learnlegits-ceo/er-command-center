// ============================================================
// ER Command Center — Marketing Site JavaScript
// ============================================================

(function () {
  'use strict';

  // ---------- DOM Elements ----------
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const demoForm = document.getElementById('demoForm');
  const hamburgerOpen = hamburger.querySelector('.hamburger-open');
  const hamburgerClose = hamburger.querySelector('.hamburger-close');

  // ---------- Navbar Scroll Effect ----------
  function handleScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // initial check

  // ---------- Mobile Menu Toggle ----------
  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburgerOpen.style.display = isOpen ? 'none' : 'block';
    hamburgerClose.style.display = isOpen ? 'block' : 'none';
  });

  // Close mobile menu when a link is clicked
  var mobileLinks = mobileMenu.querySelectorAll('.mobile-link');
  mobileLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
      hamburgerOpen.style.display = 'block';
      hamburgerClose.style.display = 'none';
    });
  });

  // ---------- Smooth Scroll for Anchor Links ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var navHeight = navbar.offsetHeight;
        var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ---------- Form Submission ----------
  demoForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var formData = new FormData(demoForm);
    var name = formData.get('name');
    var email = formData.get('email');
    var hospital = formData.get('hospital');

    // Check if Formspree is configured (has a real form ID)
    var action = demoForm.getAttribute('action');
    if (action && !action.includes('your-form-id')) {
      // Formspree is configured — submit via fetch
      fetch(action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            showFormSuccess();
            demoForm.reset();
          } else {
            showFormError();
          }
        })
        .catch(function () {
          showFormError();
        });
    } else {
      // Formspree not configured — open mailto
      var subject = encodeURIComponent('Demo Request - ' + (hospital || 'Hospital'));
      var body = encodeURIComponent(
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Hospital: ' + (hospital || 'Not specified') + '\n\n' +
        'I would like to request a demo of ER Command Center.'
      );
      window.location.href = 'mailto:info@ercommandcenter.com?subject=' + subject + '&body=' + body;
      showFormSuccess();
      demoForm.reset();
    }
  });

  function showFormSuccess() {
    var btn = demoForm.querySelector('button[type="submit"]');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Demo Requested!';
    btn.style.background = '#16a34a';
    btn.style.borderColor = '#16a34a';
    btn.disabled = true;

    setTimeout(function () {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.disabled = false;
    }, 3000);
  }

  function showFormError() {
    var btn = demoForm.querySelector('button[type="submit"]');
    var originalText = btn.innerHTML;
    btn.innerHTML = 'Something went wrong. Try again.';
    btn.style.background = '#ef4444';
    btn.style.borderColor = '#ef4444';

    setTimeout(function () {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 3000);
  }

  // ---------- Intersection Observer for Fade-in ----------
  if ('IntersectionObserver' in window) {
    var observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all section headers and cards
    document.querySelectorAll('.section-header, .feature-card, .step-card, .pricing-card, .testimonial-card').forEach(function (el) {
      observer.observe(el);
    });
  }
})();

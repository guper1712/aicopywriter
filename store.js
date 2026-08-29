/* =========================================================
   U.S. Polo Assn — Store
   store.js  —  cart, wishlist, search, drawers, animations
   Vanilla JS, no dependencies.
   ========================================================= */
(function () {
  "use strict";

  var $  = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  var fmt = function (n) {
    return new Intl.NumberFormat("uk-UA").format(n) + " ₴";
  };

  /* -------------------------------------------------------
     Reveal on scroll
  ------------------------------------------------------- */
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------------
     Overlays (search / cart / mobile nav) + scrim
  ------------------------------------------------------- */
  var scrim = $("#scrim");
  var openLayer = null;

  function lockScroll(on) {
    document.body.style.overflow = on ? "hidden" : "";
  }
  function closeAll() {
    if (openLayer) openLayer.classList.remove("open");
    var s = $("#search"); if (s) s.classList.remove("open");
    if (scrim) scrim.classList.remove("open");
    openLayer = null;
    lockScroll(false);
  }
  function openDrawer(el) {
    if (!el) return;
    if (openLayer && openLayer !== el) openLayer.classList.remove("open");
    el.classList.add("open");
    if (scrim) scrim.classList.add("open");
    openLayer = el;
    lockScroll(true);
  }

  if (scrim) scrim.addEventListener("click", closeAll);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll();
  });

  /* -------------------------------------------------------
     Search overlay
  ------------------------------------------------------- */
  function initSearch() {
    var search = $("#search");
    if (!search) return;
    var input = $("#searchInput");
    on("#searchBtn", "click", function () {
      search.classList.add("open");
      if (scrim) scrim.classList.add("open");
      lockScroll(true);
      openLayer = null;
      setTimeout(function () { if (input) input.focus(); }, 250);
    });
    on("#searchClose", "click", closeAll);
  }

  /* -------------------------------------------------------
     Mobile navigation (built from the desktop nav)
  ------------------------------------------------------- */
  function initMobileNav() {
    var burger = $("#burger");
    if (!burger) return;

    var links = $$(".nav .nav__link").map(function (a) {
      return { text: a.textContent.trim(), sale: a.hasAttribute("data-sale") };
    });

    var nav = document.createElement("aside");
    nav.className = "mobile-nav";
    nav.setAttribute("aria-label", "Меню");
    var html = '<div class="mobile-nav__head">' +
      '<strong style="font-family:var(--f-display);font-size:20px">Меню</strong>' +
      '<button class="drawer__close" data-close aria-label="Закрити">' +
      '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    links.forEach(function (l) {
      html += '<a href="#bestsellers"' + (l.sale ? " data-sale" : "") + ">" + l.text + "</a>";
    });
    nav.innerHTML = html;
    document.body.appendChild(nav);

    burger.addEventListener("click", function () { openDrawer(nav); });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]") || e.target.tagName === "A") closeAll();
    });
  }

  /* -------------------------------------------------------
     Hero slideshow (rotates through product imagery)
  ------------------------------------------------------- */
  function initHero() {
    var img = $("#heroImg");
    var dots = $$(".hero__dots span");
    if (!img || !dots.length) return;

    var slides = [
      "https://25d163-uspolo.akinoncloudcdn.com/cms/2026/03/03/87cd8feb-a78b-4c7c-9d57-8340b6e1ed46.jpg",
      "https://25d163-uspolo.akinoncloudcdn.com/cms/2026/04/01/3a5074aa-298a-4da5-97d4-52f60f0d3543.jpg",
      "https://25d163-uspolo.akinoncloudcdn.com/cms/2026/03/04/f6470936-5ae3-4690-a7c7-cfc571dbec74.jpg"
    ];
    var i = 0, timer;

    function go(n) {
      i = (n + slides.length) % slides.length;
      img.style.transition = "opacity .5s ease";
      img.style.opacity = "0";
      setTimeout(function () {
        img.src = slides[i];
        img.style.opacity = "1";
      }, 260);
      dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    }
    function start() { timer = setInterval(function () { go(i + 1); }, 5000); }
    function stop() { clearInterval(timer); }

    dots.forEach(function (d, k) {
      d.addEventListener("click", function () { stop(); go(k); start(); });
    });
    start();
  }

  /* -------------------------------------------------------
     Wishlist
  ------------------------------------------------------- */
  var wish = new Set();

  function updateWishBadge() {
    var b = $("#wishBadge");
    if (!b) return;
    b.textContent = wish.size;
    b.style.display = wish.size ? "flex" : "none";
  }

  function initWishlist() {
    $$(".card__wish").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var card = btn.closest(".card");
        var name = card ? card.getAttribute("data-name") : "item";
        btn.classList.toggle("on");
        if (btn.classList.contains("on")) { wish.add(name); toast("Додано в обране"); }
        else { wish.delete(name); }
        updateWishBadge();
      });
    });
    on("#wishBtn", "click", function () {
      toast(wish.size ? ("У обраному: " + wish.size) : "Список бажань порожній");
    });
  }

  /* -------------------------------------------------------
     Cart
  ------------------------------------------------------- */
  var cart = [];

  function cartCount() { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  function addToCart(name, price, img) {
    var found = cart.filter(function (i) { return i.name === name; })[0];
    if (found) found.qty += 1;
    else cart.push({ name: name, price: price, img: img, qty: 1 });
    renderCart();
    toast("Додано в кошик");
  }
  function changeQty(name, delta) {
    var it = cart.filter(function (i) { return i.name === name; })[0];
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) cart = cart.filter(function (i) { return i.name !== name; });
    renderCart();
  }
  function removeItem(name) {
    cart = cart.filter(function (i) { return i.name !== name; });
    renderCart();
  }

  function renderCart() {
    var body = $("#cartBody");
    var foot = $("#cartFoot");
    var badge = $("#cartBadge");
    if (!body) return;

    if (!cart.length) {
      body.innerHTML = '<div class="drawer__empty">Ваш кошик порожній.<br>Додайте товари, щоб почати.</div>';
      if (foot) foot.style.display = "none";
    } else {
      body.innerHTML = cart.map(function (i) {
        return '' +
          '<div class="cart-item">' +
            '<div class="cart-item__img"><img src="' + i.img + '" alt=""></div>' +
            '<div class="cart-item__info">' +
              '<div class="cart-item__name">' + i.name + '</div>' +
              '<div class="cart-item__price">' + fmt(i.price) + '</div>' +
              '<div class="cart-item__qty">' +
                '<button data-dec="' + esc(i.name) + '" aria-label="Менше">−</button>' +
                '<span>' + i.qty + '</span>' +
                '<button data-inc="' + esc(i.name) + '" aria-label="Більше">+</button>' +
              '</div>' +
            '</div>' +
            '<div class="cart-item__right">' +
              '<div class="cart-item__total">' + fmt(i.price * i.qty) + '</div>' +
              '<button class="cart-item__rm" data-rm="' + esc(i.name) + '">Видалити</button>' +
            '</div>' +
          '</div>';
      }).join("");
      if (foot) foot.style.display = "block";
      var sub = $("#cartSub");
      if (sub) sub.textContent = fmt(cartTotal());
    }

    if (badge) {
      var c = cartCount();
      badge.textContent = c;
      badge.style.display = c ? "flex" : "none";
    }
  }

  function esc(s) { return String(s).replace(/"/g, "&quot;"); }

  function initCart() {
    $$(".card__add").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var card = btn.closest(".card");
        if (!card) return;
        addToCart(
          card.getAttribute("data-name"),
          parseInt(card.getAttribute("data-price"), 10) || 0,
          card.getAttribute("data-img")
        );
      });
    });

    on("#cartBtn", "click", function () { openDrawer($("#cart")); });
    on("#cartClose", "click", closeAll);

    var body = $("#cartBody");
    if (body) {
      body.addEventListener("click", function (e) {
        var t = e.target.closest("button");
        if (!t) return;
        if (t.dataset.inc) changeQty(t.dataset.inc, 1);
        else if (t.dataset.dec) changeQty(t.dataset.dec, -1);
        else if (t.dataset.rm) removeItem(t.dataset.rm);
      });
    }
    renderCart();
  }

  /* -------------------------------------------------------
     Newsletter
  ------------------------------------------------------- */
  function initNewsletter() {
    var form = $("#newsForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = $("#newsOk");
      if (ok) ok.textContent = "Дякуємо! Перевірте пошту — ваш промокод −10% уже там.";
      form.reset();
    });
  }

  /* -------------------------------------------------------
     Toast
  ------------------------------------------------------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    var m = $("#toastMsg");
    if (m && msg) m.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* -------------------------------------------------------
     Helpers
  ------------------------------------------------------- */
  function on(sel, ev, fn) {
    var el = $(sel);
    if (el) el.addEventListener(ev, fn);
  }

  /* -------------------------------------------------------
     Boot
  ------------------------------------------------------- */
  function init() {
    initReveal();
    initSearch();
    initMobileNav();
    initHero();
    initWishlist();
    initCart();
    initNewsletter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

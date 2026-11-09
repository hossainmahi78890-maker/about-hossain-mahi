document.getElementById("year").textContent = new Date().getFullYear();

/* ================= Figma-style designer cursor =================
   Every component starts hidden. The first time a section scrolls into view,
   a "Mahi" cursor flies over, drags out a selection frame for each component
   in turn, and the component appears inside it. Headings are typed in.
*/
(function () {
  // keep in sync with the html.building rule in style.css
  const BUILD_SELECTOR = [
    ".navbar", ".avatar-wrap", ".hero-title", ".hero-sub", ".hero-actions .btn",
    ".section-head .tag", ".section-head h2", ".section-sub", ".about-card",
    ".feature-card", ".hobby-card", ".game-card", ".social-card", ".footer p",
  ].join(",");
  const TYPE_SELECTOR = ".hero-title, .section-head h2";

  const root = document.documentElement;
  if (!root.classList.contains("building")) return;

  const targets = [...document.querySelectorAll(BUILD_SELECTOR)];

  // ---- overlay elements ----
  const layer = document.createElement("div");
  layer.className = "design-layer";
  layer.innerHTML = `
    <div class="sel-box">
      <span class="sel-name"></span>
      <span class="handle h-tl"></span><span class="handle h-tr"></span>
      <span class="handle h-bl"></span><span class="handle h-br"></span>
      <span class="sel-dim"></span>
    </div>
    <div class="type-caret"></div>
    <div class="d-cursor hidden">
      <svg viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#5e5263" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
      <span class="d-cursor-name">Mahi</span>
    </div>`;
  document.body.appendChild(layer);

  const box = layer.querySelector(".sel-box");
  const boxName = layer.querySelector(".sel-name");
  const boxDim = layer.querySelector(".sel-dim");
  const caret = layer.querySelector(".type-caret");
  const cursor = layer.querySelector(".d-cursor");

  const skipBtn = document.createElement("button");
  skipBtn.className = "skip-build gone";
  skipBtn.type = "button";
  skipBtn.textContent = "Skip animation";
  document.body.appendChild(skipBtn);

  let skipped = false;

  // ---- helpers ----
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const linear = (t) => t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function tween(ms, ease, onUpdate) {
    return new Promise((resolve) => {
      if (skipped || ms <= 0) { onUpdate(1); return resolve(); }
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / ms);
        onUpdate(ease(t));
        if (t < 1 && !skipped) requestAnimationFrame(frame);
        else { onUpdate(1); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  // The overlay scrolls with the page, so positions are measured from its corner.
  function origin() {
    const r = layer.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }

  function textRange(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range;
  }

  function layerRect(el, isText) {
    const o = origin();
    const r = isText ? textRange(el).getBoundingClientRect() : el.getBoundingClientRect();
    return { x: r.left - o.x, y: r.top - o.y, w: r.width, h: r.height };
  }

  // One box per line of a heading, so wrapped headings (phones) type line by line
  function textLines(el) {
    const lines = [];
    [...textRange(el).getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0)
      .forEach((r) => {
        const line = lines.find((l) => Math.abs(l.top - r.top) < r.height / 2);
        if (line) {
          line.left = Math.min(line.left, r.left);
          line.right = Math.max(line.right, r.right);
          line.top = Math.min(line.top, r.top);
          line.bottom = Math.max(line.bottom, r.bottom);
        } else {
          lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
      });
    return lines.sort((a, b) => a.top - b.top);
  }

  function onScreen(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  function labelFor(el) {
    if (el.matches(".navbar")) return "Navbar";
    if (el.matches(".avatar-wrap")) return "Avatar";
    if (el.matches(".btn")) return "Button";
    if (el.matches(".tag")) return "Tag";
    if (el.matches(TYPE_SELECTOR)) return "Heading";
    if (el.matches("p")) return "Text";
    return "Card";
  }

  let pos = { x: layer.offsetWidth + 40, y: innerHeight * 0.8 - origin().y };
  function placeCursor(x, y) {
    pos = { x, y };
    cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
  }
  placeCursor(pos.x, pos.y);

  function moveCursor(x, y, speed) {
    const from = { ...pos };
    const dist = Math.hypot(x - from.x, y - from.y);
    const ms = Math.min(750, Math.max(260, dist * 0.7)) * speed;
    return tween(ms, easeInOut, (e) =>
      placeCursor(from.x + (x - from.x) * e, from.y + (y - from.y) * e)
    );
  }

  function setBox(x, y, w, h) {
    box.style.transform = `translate(${x}px, ${y}px)`;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    boxDim.textContent = `${Math.round(w)} × ${Math.round(h)}`;
  }

  function reveal(el, ms = 350) {
    el.style.transition = `opacity ${ms}ms ease`;
    el.classList.add("built");
    setTimeout(() => (el.style.transition = ""), ms + 50);
  }

  // type a heading in, line by line, with a blinking caret
  async function typeIn(el, speed) {
    const o = origin();
    const elBox = el.getBoundingClientRect();
    const lines = textLines(el).map((l) => ({
      x: l.left - elBox.left, y: l.top - elBox.top, w: l.right - l.left, h: l.bottom - l.top,
    }));
    if (!lines.length) return reveal(el);
    // line boxes can overlap a little; split the overlap so the next line never peeks through
    lines.forEach((l, i) => {
      const prev = lines[i - 1], next = lines[i + 1];
      l.top = prev ? (prev.y + prev.h + l.y) / 2 : l.y - 2;
      l.bottom = next ? (l.y + l.h + next.y) / 2 : l.y + l.h + 2;
    });
    const total = lines.reduce((s, l) => s + l.w, 0);
    const chars = Math.max(1, el.textContent.trim().length);

    // Show only the first `px` of text, counted across the lines in order.
    // Each line is its own rectangle inside one clip polygon.
    function showUpTo(px) {
      const pts = [];
      let left = px;
      let caretAt = { x: lines[0].x, y: lines[0].y, h: lines[0].h };
      for (const l of lines) {
        const w = Math.min(l.w, Math.max(0, left));
        left -= l.w;
        if (w <= 0) break;
        const x0 = l.x - 8, y0 = l.top;
        const x1 = l.x + w + (w >= l.w ? 8 : 0), y1 = l.bottom;
        pts.push(`${x0}px ${y0}px`, `${x1}px ${y0}px`, `${x1}px ${y1}px`, `${x0}px ${y1}px`, `${x0}px ${y0}px`);
        caretAt = { x: l.x + w, y: l.y, h: l.h };
      }
      el.style.clipPath = pts.length ? `polygon(${pts.join(",")})` : "inset(50%)";
      caret.style.height = `${caretAt.h}px`;
      caret.style.transform = `translate(${elBox.left - o.x + caretAt.x}px, ${elBox.top - o.y + caretAt.y}px)`;
    }

    showUpTo(0);
    el.classList.add("built");
    caret.className = "type-caret on";
    const last = lines[lines.length - 1];
    await moveCursor(elBox.left - o.x + last.x + last.w + 14, elBox.top - o.y + last.y + last.h + 10, speed * 0.6);
    await tween(Math.min(1400, chars * 55) * speed, linear, (e) => {
      showUpTo(total * (Math.round(e * chars) / chars));
    });
    el.style.clipPath = "";
    caret.className = "type-caret";
  }

  // ---- build one component ----
  async function build(el, speed) {
    const isText = el.matches(TYPE_SELECTOR);
    const r = layerRect(el, isText);

    await moveCursor(r.x, r.y, speed);
    if (skipped) return;

    // press and drag out the frame
    cursor.classList.add("press");
    box.className = "sel-box on" + (isText ? " text-mode" : "");
    boxName.textContent = labelFor(el);
    setBox(r.x, r.y, 0, 0);
    await tween(520 * speed, easeOut, (e) => {
      setBox(r.x, r.y, r.w * e, r.h * e);
      placeCursor(r.x + r.w * e, r.y + r.h * e);
    });
    cursor.classList.remove("press");
    if (skipped) return;

    if (isText) await typeIn(el, speed);
    else reveal(el);

    await wait(160 * speed);
    box.classList.add("fade");
  }

  // ---- queue: build components in page order as their section scrolls into view ----
  const queue = [];
  let running = false;
  let idleTimer;

  async function run() {
    if (running) return;
    running = true;
    clearTimeout(idleTimer);
    cursor.classList.remove("hidden");
    skipBtn.classList.remove("gone");
    while (queue.length && !skipped) {
      queue.sort((a, b) => targets.indexOf(a) - targets.indexOf(b));
      const el = queue.shift();
      // Already scrolled past it (e.g. jumped via the menu)? Just show it.
      if (!onScreen(el)) { reveal(el, 250); continue; }
      // speed up when the visitor scrolls ahead of the cursor
      const speed = queue.length > 5 ? 0.5 : queue.length > 2 ? 0.75 : 1;
      await build(el, speed);
    }
    running = false;
    if (skipped) return;
    if (targets.every((t) => t.classList.contains("built"))) {
      setTimeout(finish, 900);
    } else {
      idleTimer = setTimeout(() => {
        cursor.classList.add("hidden");
        skipBtn.classList.add("gone");
      }, 1200);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          queue.push(entry.target);
        }
      });
      run();
    },
    { threshold: 0.15 }
  );
  targets.forEach((el) => observer.observe(el));

  function finish() {
    skipped = true;
    observer.disconnect();
    targets.forEach((el) => {
      el.classList.add("built");
      el.style.clipPath = "";
    });
    root.classList.remove("building");
    skipBtn.classList.add("gone");
    cursor.classList.add("hidden");
    box.className = "sel-box";
    caret.className = "type-caret";
    setTimeout(() => { layer.remove(); skipBtn.remove(); }, 500);
  }

  skipBtn.addEventListener("click", finish);
})();

/* ================= Mobile menu ================= */
(function () {
  const nav = document.querySelector(".navbar");
  const toggle = nav && nav.querySelector(".nav-toggle");
  if (!toggle) return;

  function setOpen(open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("click", (e) => { if (!nav.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();

/* ================= Memory Match ================= */
(function () {
  const board = document.getElementById("memoryBoard");
  const movesEl = document.getElementById("memMoves");
  const messageEl = document.getElementById("memMessage");
  const resetBtn = document.getElementById("memReset");
  if (!board) return;

  const ICONS = [
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4l9 16H3z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l9 9-9 9-9-9z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="3.5"/></svg>',
  ];

  let cards = [];
  let firstIndex = null;
  let secondIndex = null;
  let lockBoard = false;
  let matchedCount = 0;
  let moves = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startGame() {
    cards = shuffle([...ICONS, ...ICONS]).map((icon) => ({ icon, matched: false }));
    firstIndex = null;
    secondIndex = null;
    lockBoard = false;
    matchedCount = 0;
    moves = 0;
    movesEl.textContent = "0";
    messageEl.textContent = " ";
    board.innerHTML = "";

    cards.forEach((card, index) => {
      const cardEl = document.createElement("div");
      cardEl.className = "memory-card";
      cardEl.dataset.index = index;
      cardEl.addEventListener("click", () => onCardClick(index, cardEl));
      board.appendChild(cardEl);
    });
  }

  function onCardClick(index, cardEl) {
    if (lockBoard || cards[index].matched || index === firstIndex) return;

    cardEl.innerHTML = cards[index].icon;
    cardEl.classList.add("revealed");

    if (firstIndex === null) {
      firstIndex = index;
      return;
    }

    secondIndex = index;
    moves++;
    movesEl.textContent = String(moves);
    lockBoard = true;

    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (firstCard.icon === secondCard.icon) {
      firstCard.matched = true;
      secondCard.matched = true;
      matchedCount += 2;
      board.children[firstIndex].classList.add("matched");
      board.children[secondIndex].classList.add("matched");
      firstIndex = null;
      secondIndex = null;
      lockBoard = false;

      if (matchedCount === cards.length) {
        messageEl.textContent = `You matched them all in ${moves} moves!`;
      }
    } else {
      setTimeout(() => {
        board.children[firstIndex].textContent = "";
        board.children[firstIndex].classList.remove("revealed");
        board.children[secondIndex].textContent = "";
        board.children[secondIndex].classList.remove("revealed");
        firstIndex = null;
        secondIndex = null;
        lockBoard = false;
      }, 700);
    }
  }

  resetBtn.addEventListener("click", startGame);
  startGame();
})();

/* ================= Snake ================= */
(function () {
  const canvas = document.getElementById("snakeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("snakeScore");
  const messageEl = document.getElementById("snakeMessage");
  const resetBtn = document.getElementById("snakeReset");

  const CELL = 15;
  const COLS = canvas.width / CELL;
  const ROWS = canvas.height / CELL;
  const SPEED = 130;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const START_MSG = isTouch
    ? "Swipe on the board or tap the arrows to start."
    : "Click the board, then press an arrow key to start.";

  let snake, dir, nextDir, food, score, loopId, running;

  function randomFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((seg) => seg.x === pos.x && seg.y === pos.y));
    return pos;
  }

  function startGame() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 0, y: 0 };
    nextDir = { x: 0, y: 0 };
    score = 0;
    running = true;
    scoreEl.textContent = "0";
    messageEl.textContent = START_MSG;
    food = randomFood();
    if (loopId) clearInterval(loopId);
    loopId = setInterval(tick, SPEED);
    draw();
  }

  function tick() {
    if (!running) return;
    if (nextDir.x !== 0 || nextDir.y !== 0) dir = nextDir;
    if (dir.x === 0 && dir.y === 0) {
      draw();
      return;
    }

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
    const hitSelf = snake.some((seg) => seg.x === head.x && seg.y === head.y);

    if (hitWall || hitSelf) {
      running = false;
      clearInterval(loopId);
      messageEl.textContent = `Game over! Score: ${score}. Hit Restart to try again.`;
      draw();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = String(score);
      food = randomFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = "#f9edd3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#c0566a";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL / 2.4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#5e5263" : "#6e6f94";
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();
    });
  }

  function setDirection(x, y) {
    if (snake.length > 1 && x === -dir.x && y === -dir.y) return;
    nextDir = { x, y };
  }

  window.addEventListener("keydown", (e) => {
    const keys = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    const move = keys[e.key];
    if (!move) return;
    if (canvas.getBoundingClientRect().top < window.innerHeight && canvas.getBoundingClientRect().bottom > 0) {
      e.preventDefault();
    }
    setDirection(move[0], move[1]);
  });

  canvas.addEventListener("click", () => {
    if (!running) startGame();
  });

  // Touch: swipe on the board
  let touchFrom = null;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchFrom = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!touchFrom) return;
    const t = e.touches[0];
    const dx = t.clientX - touchFrom.x;
    const dy = t.clientY - touchFrom.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(Math.sign(dx), 0);
    else setDirection(0, Math.sign(dy));
    touchFrom = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  canvas.addEventListener("touchend", () => (touchFrom = null));

  // Touch: on-screen arrows
  document.querySelectorAll("#snakePad .dpad-btn").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!running) startGame();
      const [x, y] = btn.dataset.dir.split(",").map(Number);
      setDirection(x, y);
    });
  });

  resetBtn.addEventListener("click", startGame);
  startGame();
})();

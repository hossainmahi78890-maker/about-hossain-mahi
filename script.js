document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Respect reduced motion for SVG (SMIL) animations too, like the flying plane
if (reduceMotion) {
  document.querySelectorAll("svg").forEach((svg) => svg.pauseAnimations && svg.pauseAnimations());
}

/* ================= Global nav: hairline on scroll + phone menu ================= */
(function () {
  const nav = document.getElementById("gnav");
  if (!nav) return;
  const toggle = nav.querySelector(".nav-toggle");

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setOpen(open) {
    nav.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 833) setOpen(false); });
})();

/* ================= Reveal on scroll ================= */
(function () {
  const els = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach((el) => io.observe(el));
})();

/* ================= Scroll-linked effects =================
   - Hero: the illustration eases back and fades as you scroll past it.
   - About: the statement lights up word by word as it moves up the screen.
*/
(function () {
  const hero = document.querySelector(".hero");
  const statement = document.getElementById("statement");
  if (!statement) return;

  // Wrap each word so it can light up on its own
  const words = statement.textContent.trim().split(/\s+/);
  statement.textContent = "";
  const spans = words.map((word, i) => {
    const span = document.createElement("span");
    span.className = "w";
    span.textContent = word;
    statement.appendChild(span);
    if (i < words.length - 1) statement.appendChild(document.createTextNode(" "));
    return span;
  });

  if (reduceMotion) {
    spans.forEach((s) => s.classList.add("lit"));
    return;
  }

  const clamp = (v) => Math.min(1, Math.max(0, v));
  let queued = false;

  function update() {
    queued = false;
    const vh = window.innerHeight;

    if (hero) {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--hp", clamp(-r.top / (r.height * 0.75)).toFixed(3));
    }

    const s = statement.getBoundingClientRect();
    const start = vh * 0.85;            // first word lights when the text reaches here
    const end = vh * 0.25;              // last word lights when its bottom reaches here
    const progress = clamp((start - s.top) / (start - end + s.height - vh * 0.1));
    const lit = Math.round(progress * spans.length);
    spans.forEach((span, i) => span.classList.toggle("lit", i < lit));
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
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
    ctx.fillStyle = "#f5f5f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#a86b74";
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
      ctx.fillStyle = i === 0 ? "#5e5263" : "#9496b8";
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

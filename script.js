document.getElementById("year").textContent = new Date().getFullYear();

/* ================= Figma-style designer cursor =================
   Every component starts hidden. A "Mahi" cursor flies over, drags out a
   selection frame, and the component appears inside it. Headings are typed in.
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
    <div class="d-cursor">
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
  skipBtn.className = "skip-build";
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

  // page coordinates of an element (headings use the tight text box)
  function pageRect(el, isText) {
    let r = el.getBoundingClientRect();
    if (isText) {
      const range = document.createRange();
      range.selectNodeContents(el);
      r = range.getBoundingClientRect();
    }
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, vx: r.left };
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

  let pos = { x: innerWidth + scrollX + 40, y: scrollY + innerHeight * 0.8 };
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

  function reveal(el) {
    el.style.transition = "opacity 0.35s ease";
    el.classList.add("built");
    setTimeout(() => (el.style.transition = ""), 400);
  }

  // ---- build one component ----
  async function build(el, speed) {
    const isText = el.matches(TYPE_SELECTOR);
    const r = pageRect(el, isText);

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

    if (isText) {
      // type the heading in, left to right, with a blinking caret
      const elRect = el.getBoundingClientRect();
      const textLeft = r.vx - elRect.left;
      const chars = Math.max(1, el.textContent.trim().length);
      el.style.clipPath = `inset(-10px ${elRect.width - textLeft}px -10px -10px)`;
      el.classList.add("built");
      caret.style.height = `${r.h}px`;
      caret.style.transform = `translate(${r.x}px, ${r.y}px)`;
      caret.className = "type-caret on";
      await moveCursor(r.x + r.w + 14, r.y + r.h + 10, speed * 0.6);
      await tween(Math.min(1300, chars * 55) * speed, linear, (e) => {
        const shown = Math.round(e * chars) / chars;
        const edge = textLeft + r.w * shown;
        el.style.clipPath = `inset(-10px ${Math.max(0, elRect.width - edge)}px -10px -10px)`;
        caret.style.transform = `translate(${r.x + r.w * shown}px, ${r.y}px)`;
      });
      el.style.clipPath = "";
      caret.className = "type-caret";
    } else {
      reveal(el);
    }

    await wait(160 * speed);
    box.classList.add("fade");
  }

  // ---- queue: build components in page order as they scroll into view ----
  const queue = [];
  let running = false;
  let idleTimer;

  async function run() {
    if (running) return;
    running = true;
    clearTimeout(idleTimer);
    cursor.classList.remove("hidden");
    while (queue.length && !skipped) {
      queue.sort((a, b) => targets.indexOf(a) - targets.indexOf(b));
      const el = queue.shift();
      // speed up when the visitor scrolls ahead of the cursor
      const speed = queue.length > 3 ? 0.4 : queue.length > 1 ? 0.7 : 1;
      await build(el, speed);
    }
    running = false;
    if (skipped) return;
    if (targets.every((t) => t.classList.contains("built"))) {
      setTimeout(finish, 900);
    } else {
      idleTimer = setTimeout(() => cursor.classList.add("hidden"), 1200);
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
    { threshold: 0.2 }
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

/* ================= Leaf Match (memory game) ================= */
(function () {
  const board = document.getElementById("memoryBoard");
  const movesEl = document.getElementById("memMoves");
  const messageEl = document.getElementById("memMessage");
  const resetBtn = document.getElementById("memReset");
  if (!board) return;

  const ICONS = ["🌿", "🍃", "🌱", "🌻", "🍄", "🌸", "🌵", "🍂"];

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

    cardEl.textContent = cards[index].icon;
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

/* ================= Garden Snake ================= */
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
    messageEl.textContent = "Click the board, then press an arrow key to start.";
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
      ctx.fillStyle = i === 0 ? "#5e5263" : "#a86b74";
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

  resetBtn.addEventListener("click", startGame);
  startGame();
})();

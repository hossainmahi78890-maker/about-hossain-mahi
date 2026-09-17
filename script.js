document.getElementById("year").textContent = new Date().getFullYear();

const revealTargets = document.querySelectorAll(".section, .navbar");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealTargets.forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(24px)";
  el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
  observer.observe(el);
});

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
    ctx.fillStyle = "#eef6ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e05353";
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
      ctx.fillStyle = i === 0 ? "#2f7d4f" : "#5fa864";
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

class ParentCircle {
  constructor(x, y, text, childTexts, id) {
    this.x = x; this.y = y;
    this.text = text;
    this.r = 130;
    this.children = childTexts.map((t) => new ChildCircle(t));
    this.id = id;
    this.originalText = text;
    this.originalChildTexts = childTexts.slice();
    this.updateTextFromChildren();
  }

  updateTextFromChildren() {
    this.text = this.children.map((c) => c.text).join("");
  }

  display() {
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(this.x, this.y, this.r * 2);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    if (textWidth(this.text) > 260) textSize(15);
    text(this.text, this.x, this.y);
  }

  display2() {
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(this.x, this.y, this.r * 2, this.r);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    if (textWidth(this.text) > 260) textSize(15);
    text(this.text, this.x, this.y);
  }

  moveTo(targetX, targetY, speed = 0.1) {
    this.x += (targetX - this.x) * speed;
    this.y += (targetY - this.y) * speed;
  }
}

class ChildCircle {
  constructor(text) {
    this.x = width / 2; this.y = height / 2;
    this.r = 110;
    this.text = text;
    this.visible = false;
  }

  display() {
    if (!this.visible) return;
    noStroke();
    fill(100, 150, 200, 200);
    ellipse(this.x, this.y, this.r * 2);
    fill(0);
    textAlign(CENTER, CENTER);
    text(this.text, this.x, this.y);
  }

  moveTo(targetX, targetY, speed = 0.1) {
    this.x += (targetX - this.x) * speed;
    this.y += (targetY - this.y) * speed;
  }
}

// --- グローバル変数 ---
let parents = [];
let originalParents = [];
let N = 5;
let activeParent = null;
let layoutMode = "polygon";
let lastBgColor;

let dragging = null, offsetX = 0, offsetY = 0;
let draggingChild = null, childOffsetX = 0, childOffsetY = 0;

let editingChild = null; // メニュー操作中の子円
let showTextWindow = false;
let isMenuHovered = false; 

// タイピング用変数
let currentLine = 0;
let fullLine = "";
let typedLine = "";
let charIndex = 0;
let typingSpeed = 2;
let typingCounter = 0;
let finishedLine = false;
let waitCounter = 0;
let waitTime = 60;
let historyTexts = [];

// サンプルデータ
let textData = [
  { text: "親１", children: ["窓の", "外を", "見る"] },
  { text: "親２", children: ["枝葉は", "風に", "揺れている"] },
  { text: "親３", children: ["うっすらと", "けぶった", "空は", "淡い", "水色だ"] },
  { text: "親４", children: ["夏の", "空は", "もっと", "色が", "濃い"] },
  { text: "親５", children: ["秋が", "近づいて", "いるのかもしれない"] },
];
let textData2 = [
  { text: "親A", children: ["いちごは", "栃木の", "名産品だ"] },
  { text: "親B", children: ["内陸型の", "気候が", "栽培に", "適している"] },
  { text: "親C", children: ["植物の", "甘みは", "寒暖差によって", "生まれる"] },
  { text: "親D", children: ["比熱が", "小さい", "大地は", "寒暖差を", "生みやすい"] },
  { text: "親E", children: ["内陸県だからこそ", "発展した", "産業だ"] },
];
let textData3 = [
  { text: "親α", children: ["糸の", "目は", "感情を", "表に", "出しにくい"] },
  { text: "親β", children: ["私は", "その目に", "憧れを", "抱く"] },
  { text: "親γ", children: ["私の", "目は", "大きく", "感情が", "表に", "出やすい"] },
  { text: "親δ", children: ["この間は", "落胆を", "隠しきれず", "恥ずかしい", "思いを", "した"] },
  { text: "親ε", children: ["来世は", "糸の目に", "生まれたいと", "思う"] },
];

let currentSample = 0;
let samples = [textData, textData2, textData3];
let originalTextData = [], originalTextData2 = [], originalTextData3 = [];

let isSplitMode = false;

// --- セットアップ ---
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container'); 

  lastBgColor = color(240);
  originalTextData = JSON.parse(JSON.stringify(textData));
  originalTextData2 = JSON.parse(JSON.stringify(textData2));
  originalTextData3 = JSON.parse(JSON.stringify(textData3));

  let cx = width / 2, cy = height / 2, radius = 200;
  for (let i = 0; i < N; i++) {
    let angle = (TWO_PI * i) / N - HALF_PI;
    let x = cx + cos(angle) * radius;
    let y = cy + sin(angle) * radius;
    let parent = new ParentCircle(x, y, textData[i].text, textData[i].children, i);
    parent.updateTextFromChildren();
    parents.push(parent);
  }
  originalParents = parents.slice();
  
  // UIイベントの登録
  setupUIEvents();
  updateInstructionsUI();

  // ★ 最初のタイトル画面中はキャンバスを止めておく
  noLoop();
}

function draw() {
  if (layoutMode === "polygon" && activeParent === null) {
    updateBgByOrder();
  }
  background(lastBgColor);

  // === アニメーションと描画 ===
  if (activeParent === null) {
    for (let i = 0; i < parents.length; i++) {
      let p = parents[i], targetX, targetY;
      if (layoutMode === "polygon") {
        let angle = (TWO_PI * i) / N - HALF_PI;
        targetX = width / 2 + cos(angle) * 300;
        targetY = height / 2 + sin(angle) * 300;
      } else if (layoutMode === "line") {
        let spacing = 260;
        targetX = width / 2 - ((N - 1) / 2) * spacing + i * spacing;
        targetY = height / 2;
      } else if (layoutMode === "line2") {
        let spacing = 130;
        targetX = width / 3;
        targetY = height / 2 - ((N - 1) / 2) * spacing + i * spacing;
      }

      if (p !== dragging) {
        let speed = activeParent === null ? 0.25 : 0.1;
        p.moveTo(targetX, targetY, speed);
      }
      for (let c of p.children) {
        c.visible = false;
        c.moveTo(width / 2, height / 2);
      }

      if (layoutMode === "line2") p.display2();
      else p.display();
    }
  } else if (layoutMode === "detail" && activeParent) {
    activeParent.moveTo(width / 4, height / 2);
    activeParent.display();

    let spacing = 160;
    for (let i = 0; i < activeParent.children.length; i++) {
      let c = activeParent.children[i];
      c.visible = true;
      c.moveTo(width / 2, height / 2 - ((activeParent.children.length - 1) / 2) * spacing + i * spacing);
      c.display();
    }
  } else {
    for (let p of parents) {
      if (p === activeParent) {
        p.moveTo(width / 2, height / 2);
        let M = p.children.length, r = 300;
        for (let i = 0; i < M; i++) {
          let angle = (TWO_PI * i) / M - HALF_PI;
          let tx = width / 2 + cos(angle) * r;
          let ty = height / 2 + sin(angle) * r;
          let c = p.children[i];
          c.visible = true;
          if (c !== draggingChild) c.moveTo(tx, ty);
          c.display();
        }
      } else {
        let dx = p.x - width / 2, dy = p.y - height / 2;
        p.moveTo(width / 2 + dx * 1.2, height / 2 + dy * 1.2);
        for (let c of p.children) c.visible = false;
      }
      p.display();
    }
  }

  if (editingChild && layoutMode === "detail" && activeParent) {
    let menu = document.getElementById("circle-menu");
    menu.style.left = (editingChild.x + editingChild.r + 30) + "px";
    menu.style.top = editingChild.y + "px";
  }

  if (showTextWindow) handleTypingEffect();

  handleHoverMenu();
}

// --- マウス操作 ---
function doubleClicked() {
  if (showTextWindow) return;

  if (activeParent) {
    for (let c of activeParent.children) {
      if (dist(mouseX, mouseY, c.x, c.y) < c.r) {
        layoutMode = (layoutMode === "detail") ? "polygon" : "detail";
        updateInstructionsUI();
        return;
      }
    }
    if (dist(mouseX, mouseY, activeParent.x, activeParent.y) < activeParent.r) {
      activeParent = null;
      layoutMode = "polygon"; 
      document.getElementById("circle-menu").classList.add("hidden");
      updateInstructionsUI();
      return;
    }
  } else {
    for (let p of parents) {
      if (dist(mouseX, mouseY, p.x, p.y) < p.r) {
        activeParent = p;
        document.getElementById("circle-menu").classList.add("hidden");
        updateInstructionsUI();
        return;
      }
    }
  }
}

function mousePressed(event) {
  if (event.target.tagName !== "CANVAS") return;
  document.getElementById("circle-menu").classList.add("hidden");
  editingChild = null;

  if (activeParent === null) {
    for (let p of parents) {
      let rx = layoutMode === "line2" ? 160 : p.r;
      let ry = layoutMode === "line2" ? 80 : p.r;
      let distSq = ((mouseX - p.x) ** 2) / (rx ** 2) + ((mouseY - p.y) ** 2) / (ry ** 2);
      if (distSq <= 1) {
        dragging = p;
        offsetX = mouseX - p.x;
        offsetY = mouseY - p.y;
      }
    }
  } else {
    for (let c of activeParent.children) {
      if (c.visible && dist(mouseX, mouseY, c.x, c.y) < c.r) {
        draggingChild = c;
        childOffsetX = mouseX - c.x;
        childOffsetY = mouseY - c.y;
      }
    }
  }
}

function mouseDragged() {
  if (dragging) { dragging.x = mouseX - offsetX; dragging.y = mouseY - offsetY; }
  if (draggingChild) { draggingChild.x = mouseX - childOffsetX; draggingChild.y = mouseY - childOffsetY; }
}

function mouseReleased() {
  if (dragging) {
    let angle = atan2(dragging.y - height / 2, dragging.x - width / 2);
    if (angle < -HALF_PI) angle += TWO_PI;
    let newIndex = round(((angle + HALF_PI) / TWO_PI) * N) % N;
    parents.splice(parents.indexOf(dragging), 1);
    parents.splice(newIndex, 0, dragging);
    dragging = null;
  }
  if (draggingChild) {
    let angle = atan2(draggingChild.y - height / 2, draggingChild.x - width / 2);
    if (angle < -HALF_PI) angle += TWO_PI;
    let n = activeParent.children.length;
    let newIndex = round(((angle + HALF_PI) / TWO_PI) * n) % n;
    activeParent.children.splice(activeParent.children.indexOf(draggingChild), 1);
    activeParent.children.splice(newIndex, 0, draggingChild);
    activeParent.updateTextFromChildren();
    draggingChild = null;
  }
}

function keyPressed() {
  if (key === "c" || key === "C") {
    currentSample = (currentSample + 1) % samples.length;
    textData = samples[currentSample];
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
  }
  if (key === "d" || key === "D") {
    layoutMode = (layoutMode === "detail") ? "polygon" : (activeParent ? "detail" : layoutMode);
    document.getElementById("circle-menu").classList.add("hidden");
  }
  if (key === "r" || key === "R") {
    let baseData = currentSample === 0 ? originalTextData : (currentSample === 1 ? originalTextData2 : originalTextData3);
    textData = JSON.parse(JSON.stringify(baseData));
    samples[currentSample] = textData; 
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
    parents.sort((a, b) => originalParents.indexOf(a) - originalParents.indexOf(b));
    activeParent = null; 
    document.getElementById("circle-menu").classList.add("hidden");
  }

  if (key === "l" || key === "L") layoutMode = "line";
  if (key === "f" || key === "F") layoutMode = "polygon";
  if (key === "i" || key === "I") layoutMode = "line2";

  if (key === "w" || key === "W") {
    showTextWindow = true;
    document.getElementById("text-window").classList.remove("hidden");
    historyTexts = []; currentLine = 0; typedLine = ""; fullLine = ""; charIndex = 0; finishedLine = false;
    startTypingLine();
  }

  if (key === "Escape") {
    showTextWindow = false;
    document.getElementById("text-window").classList.add("hidden");
    document.getElementById("modal-bg").classList.add("hidden");
    
    // ★追加：ウィンドウを閉じる時に分割モードをリセットする
    isSplitMode = false;
    document.getElementById("text-window").classList.remove("is-split");
    document.getElementById("split-btn").innerText = "▶";
    document.querySelector(".split-btn-text").innerText = "元の言葉を辿る";
  }
  updateInstructionsUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function updateBgByOrder() {
  let rAcc = 0, gAcc = 0, bAcc = 0;
  for (let i = 0; i < parents.length; i++) {
    const v = (i + 1) * (parents[i].id + 1);
    rAcc += (v * 37) % 256; gAcc += (v * 53) % 256; bAcc += (v * 97) % 256;
  }
  let bgColor = color(50 + (rAcc % 206), 50 + (gAcc % 206), 50 + (bAcc % 206));
  lastBgColor = lerpColor(lastBgColor, bgColor, 0.05);
}

// === タイトル・チュートリアル・ボタン等のUI管理 ===
let modalCallback = null;

function setupUIEvents() {
  const titleScreen = document.getElementById('title-screen');
  const tutorialScreen = document.getElementById('tutorial-screen');
  const startBtn = document.getElementById("start-btn");
  const tutorialBtn = document.getElementById("tutorial-btn");
  const slider = document.getElementById('tutorial-slider');
  const tutBackBtn = document.getElementById('tut-back-btn');
  const tutNextBtn = document.getElementById('tut-next-btn');
  const tutStartBtn = document.getElementById('tut-start-btn');
  const helpBtn = document.getElementById('help-btn');
  const tutCloseBtn = document.getElementById('tut-close-btn');

  let currentPage = 0;
  const totalPages = 4;

  // --- 操作画面の「？」ボタンを表示・非表示にする関数 ---
  function showHelpButton() {
    if (helpBtn) helpBtn.classList.remove('hidden');
  }
  function hideHelpButton() {
    if (helpBtn) helpBtn.classList.add('hidden');
  }

  // --- スライダーの更新処理 ---
  function updateSlider() {
    slider.style.transform = `translateX(-${currentPage * 100}%)`;

    const dots = document.querySelectorAll('.tutorial-dots .dot');
    dots.forEach((dot,index) => {
      if(index === currentPage){
        dot.classList.add('active');
      }else{
        dot.classList.remove('active');
      }
    });
    
    if (currentPage === 0) tutBackBtn.classList.add('hidden');
    else tutBackBtn.classList.remove('hidden');

    if (currentPage === totalPages - 1) {
      tutNextBtn.classList.add('hidden');
      tutStartBtn.classList.remove('hidden');
    } else {
      tutNextBtn.classList.remove('hidden');
      tutStartBtn.classList.add('hidden');
    }
  }

  // --- チュートリアルを開く処理 ---
  function openTutorial(isFirstTime) {
    currentPage = 0;
    updateSlider();

    if (isFirstTime) {
      tutStartBtn.innerText = "はじめる";
      if (tutCloseBtn) tutCloseBtn.classList.add("hidden");
    } else {
      tutStartBtn.innerText = "閉じる";
      if (tutCloseBtn) tutCloseBtn.classList.remove("hidden");
    }

    hideHelpButton(); // 「？」ボタンを隠す

    // 表示させてからフェードイン
    tutorialScreen.style.display = 'flex';
    setTimeout(() => {
      tutorialScreen.classList.remove('fade-out');
      tutorialScreen.classList.remove('hidden');
    }, 10);

    noLoop(); // p5.jsの一時停止
  }

  // --- チュートリアルを閉じる処理 ---
  function closeTutorial() {
    tutorialScreen.classList.add('fade-out');
    loop(); // p5.jsの再開
    showHelpButton(); // 操作画面に戻るので「？」を表示

    setTimeout(() => {
      tutorialScreen.style.display = 'none';
    }, 1000);
  }

  // --- 各ボタンのイベント登録 ---
  if (startBtn) {
    startBtn.onclick = () => {
      titleScreen.classList.add('fade-out');
      loop(); 
      showHelpButton(); // タイトルから操作画面へ行くので「？」を表示
      setTimeout(() => {
        titleScreen.style.display = 'none';
      }, 1000);
    };
  }

  if (tutorialBtn) {
    tutorialBtn.onclick = () => {
      titleScreen.classList.add('fade-out'); 
      setTimeout(() => {
        titleScreen.style.display = 'none';
      }, 1000);
      openTutorial(true); // 初回ルート
    };
  }

  if (helpBtn) {
    helpBtn.onclick = () => openTutorial(false); // 2回目以降のルート
  }

  if (tutNextBtn) tutNextBtn.onclick = () => { if (currentPage < totalPages - 1) { currentPage++; updateSlider(); } };
  if (tutBackBtn) tutBackBtn.onclick = () => { if (currentPage > 0) { currentPage--; updateSlider(); } };
  if (tutStartBtn) tutStartBtn.onclick = closeTutorial;
  if (tutCloseBtn) tutCloseBtn.onclick = closeTutorial;

  // --- メニューのホバーイベント等 ---
  const menu = document.getElementById("circle-menu");
  if(menu) {
    menu.addEventListener("mouseenter", () => isMenuHovered = true);
    menu.addEventListener("mouseleave", () => isMenuHovered = false);
  }

  document.getElementById("btn-delete").onclick = () => {
    if (editingChild && activeParent) {
      activeParent.children.splice(activeParent.children.indexOf(editingChild), 1);
      activeParent.updateTextFromChildren();
      document.getElementById("circle-menu").classList.add("hidden");
      editingChild = null;
    }
  };

  document.getElementById("btn-add").onclick = () => {
    showHTMLModal("追加するテキストを入力", "", (val) => {
      if (val.trim() !== "") {
        activeParent.children.push(new ChildCircle(val));
        activeParent.updateTextFromChildren();
      }
    });
  };

  document.getElementById("btn-edit").onclick = () => {
    showHTMLModal("テキストを編集", editingChild.text, (val) => {
      if (val.trim() !== "") {
        editingChild.text = val;
        activeParent.updateTextFromChildren();
      }
    });
  };

  document.getElementById("modal-ok").onclick = confirmModal;
  document.getElementById("modal-input").onkeydown = (e) => {
    if (e.key === "Enter") confirmModal();
  };

  const splitBtnContainer = document.getElementById("split-btn-container");
  const splitBtn = document.getElementById("split-btn");
  const textWindow = document.getElementById("text-window");
  const originalContentDiv = document.getElementById("text-content-original");

  splitBtnContainer.onclick = () => {
    isSplitMode = !isSplitMode; // 状態を切り替え

    if (isSplitMode) {
      // 分割モードにする
      textWindow.classList.add("is-split");
      splitBtn.innerText = "◀"; // ボタンの矢印を逆にする
      document.querySelector(".split-btn-text").innerText = "現在の言葉のみを見る";

      // 現在のサンプルの「元のテキスト」を取得して表示
      let baseData = currentSample === 0 ? originalTextData : (currentSample === 1 ? originalTextData2 : originalTextData3);
      let originalHtml = baseData.map(p => p.children.join("")).join("<br>");
      originalContentDiv.innerHTML = originalHtml;

    } else {
      // 元に戻す
      textWindow.classList.remove("is-split");
      splitBtn.innerText = "▶";
      document.querySelector(".split-btn-text").innerText = "元の言葉を辿る";
    }
  };
}

function showHTMLModal(msg, defaultText, callback) {
  document.getElementById("modal-message").innerText = msg;
  let input = document.getElementById("modal-input");
  input.value = defaultText;
  document.getElementById("modal-bg").classList.remove("hidden");
  document.getElementById("circle-menu").classList.add("hidden");
  input.focus();
  modalCallback = callback;
}

function confirmModal() {
  let val = document.getElementById("modal-input").value;
  document.getElementById("modal-bg").classList.add("hidden");
  if (modalCallback) modalCallback(val);
  modalCallback = null;
  editingChild = null;
}

function startTypingLine() {
  if (currentLine < parents.length) {
    fullLine = parents[currentLine].text;
    typedLine = ""; charIndex = 0; typingCounter = 0; finishedLine = false;
  }
}

function handleTypingEffect() {
  let contentDiv = document.getElementById("text-content");

  if (!finishedLine && currentLine < parents.length) {
    typingCounter++;
    if (typingCounter % typingSpeed === 0 && charIndex < fullLine.length) {
      typedLine += fullLine[charIndex];
      charIndex++;
      contentDiv.innerHTML = historyTexts.join("<br>") + (historyTexts.length > 0 ? "<br>" : "") + typedLine;
      contentDiv.scrollTop = contentDiv.scrollHeight; 
    }
    if (charIndex >= fullLine.length) {
      finishedLine = true;
      historyTexts.push(typedLine);
      waitCounter = 0;
    }
  } else if (finishedLine && currentLine < parents.length) {
    waitCounter++;
    if (waitCounter > waitTime) {
      currentLine++;
      if (currentLine < parents.length) startTypingLine();
    }
  }
}

function updateInstructionsUI() {
  let arr = [];
  if (activeParent === null) {
    if (layoutMode === "line2") arr = ["Fキー", "Lキー", "Cキー", "円をドラッグ", "操作"];
    else arr = ["円をダブルクリック", "Wキー", "Cキー", "Fキー", "Lキー", "円をドラッグ", "操作"];
  } else if (layoutMode === "detail" && activeParent) {
    arr = ["Wキー", "Dキー", "並んだ円をダブルクリック", "操作"];
  } else {
    arr = ["Wキー", "Dキー", "中央の円をダブルクリック", "周囲の円をドラッグ", "操作"];
  }
  document.getElementById("instructions").innerHTML = arr.join("<br>");
}

function handleHoverMenu() {
  if (!activeParent || draggingChild || dragging || showTextWindow || layoutMode !== "detail") {
    document.getElementById("circle-menu").classList.add("hidden");
    return;
  }

  let newlyHovered = null;
  for (let c of activeParent.children) {
    if (dist(mouseX, mouseY, c.x, c.y) < c.r) {
      newlyHovered = c;
      break;
    }
  }

  const menu = document.getElementById("circle-menu");
  let modalBg = document.getElementById("modal-bg");

  if (newlyHovered) {
    editingChild = newlyHovered;
    menu.style.left = (newlyHovered.x + newlyHovered.r + 10) + "px"; 
    menu.style.top = newlyHovered.y + "px";
    menu.classList.remove("hidden");
  } else {
    let keepMenu = false;
    if (!modalBg.classList.contains("hidden") || isMenuHovered) {
      keepMenu = true;
    } else if (editingChild) {
      let d = dist(mouseX, mouseY, editingChild.x, editingChild.y);
      if (d < editingChild.r + 80 && mouseX > editingChild.x) {
        keepMenu = true;
      }
    }
    if (!keepMenu) {
      menu.classList.add("hidden");
    }
  }
}
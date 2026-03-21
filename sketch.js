// =========================================
// クラス定義
// =========================================

class ParentCircle {
  constructor(x, y, text, childTexts, id) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.r = 130;
    this.children = childTexts.map((t) => new ChildCircle(t));
    this.id = id;
    this.originalText = text;
    this.originalChildTexts = childTexts.slice();
    this.updateTextFromChildren();

    this.hovered = false;
    this.hoverFrames = 0;
    this.tooltipLabel = null; // ランダムに決まる吹き出しラベル
  }

  updateTextFromChildren() {
    this.text = this.children.map((c) => c.text).join("");
  }

  // 子円の並び順が元の順番からどれだけ変化しているかをスコア化し
  // HSLの色相（hue）にマッピングして返す
  calcTextColor() {
    const n = this.children.length;
    if (n === 0) return color(0);

    // 現在の並び順と元の並び順を比較して「ずれ」を計算
    // 各子円が元の位置からどれだけ離れているかの合計
    let totalShift = 0;
    for (let i = 0; i < n; i++) {
      const originalIndex = this.originalChildTexts.indexOf(this.children[i].text);
      if (originalIndex !== -1) {
        totalShift += abs(i - originalIndex);
      }
    }

    // 最大ずれ（全部逆順になった場合）
    const maxShift = floor(n * n / 2);
    if (maxShift === 0) return color(0);

    // 0〜1に正規化してHSLの色相（0〜360）にマッピング
    const t = constrain(totalShift / maxShift, 0, 1);
    colorMode(HSL);
    const c = color(t * 300, 70, 30); // 黒寄り→色あり（紫方向まで）
    colorMode(RGB);
    return c;
  }

  display() {
    // ホバー時：輪郭をそっと浮かびあがらせる
    if (this.hovered) {
      noFill();
      stroke(255, 255, 255, 160);
      strokeWeight(1.5);
      ellipse(this.x, this.y, this.r * 2 + 14, this.r * 2 + 14);
    }

    noStroke();
    fill(255, 255, 255, this.hovered ? 190 : 150);
    ellipse(this.x, this.y, this.r * 2);

    // テキストを子円ごとに分割して描画
    // グロー対象の子円だけ白く光らせ、それ以外は通常色
    const baseCol = this.calcTextColor();
    textAlign(LEFT, CENTER);
    textSize(16);
    if (textWidth(this.text) > 260) textSize(15);

    // 各子円のテキスト幅を測定して全体幅を計算（中央揃え用）
    let totalW = 0;
    const widths = this.children.map(c => {
      const w = textWidth(c.text);
      totalW += w;
      return w;
    });

    // 描画開始X座標（中央揃え）
    let curX = this.x - totalW / 2;

    for (let i = 0; i < this.children.length; i++) {
      const c = this.children[i];
      const isGlowing = (glowTargetParent === this && glowTargetChild === c);

      if (isGlowing && glowFrame < GLOW_DURATION_FRAMES) {
        // 急激に光ってゆっくり消える「ピカッ」なカーブ
        const t = glowFrame / GLOW_DURATION_FRAMES;
        const intensity = pow(1 - t, 1.8);

        drawingContext.shadowColor = `rgba(255,255,255,${intensity * 0.9})`;
        drawingContext.shadowBlur = 16 + intensity * 16;
        fill(lerpColor(baseCol, color(255), intensity * 0.9));
      } else {
        drawingContext.shadowBlur = 0;
        fill(baseCol);
      }

      text(c.text, curX, this.y);
      curX += widths[i];
    }

    // shadowBlurをリセット
    drawingContext.shadowBlur = 0;

    // 吹き出し（3秒ホバー後に表示）
    if (this.tooltipLabel) {
      drawTooltip(this.x, this.y - this.r - 10, this.tooltipLabel);
    }
  }

  moveTo(targetX, targetY) {
    const d = dist(this.x, this.y, targetX, targetY);
    // 距離が遠いほど速く、近いほど遅くなる（最小0.12・最大0.55）
    const dynamicSpeed = constrain(0.12 + d * 0.0012, 0.12, 0.77);
    this.x += (targetX - this.x) * dynamicSpeed;
    this.y += (targetY - this.y) * dynamicSpeed;
  }
}

class ChildCircle {
  constructor(text) {
    this.x = width / 2;
    this.y = height / 2;
    this.r = 110;
    this.text = text;
    this.visible = false;
    this.hovered = false;
    this.hoverFrames = 0;
    this.tooltipLabel = null;
  }

  display() {
    if (!this.visible) return;

    // ホバー時：本体をわずかに明るく・輪郭をそっと浮かびあがらせる
    if (this.hovered) {
      noFill();
      stroke(255, 255, 255, 140);
      strokeWeight(1.5);
      ellipse(this.x, this.y, this.r * 2 + 14);
    }

    noStroke();
    fill(100, 150, 200, this.hovered ? 220 : 200);
    ellipse(this.x, this.y, this.r * 2);

    fill(this.hovered ? 255 : 0);
    textAlign(CENTER, CENTER);
    text(this.text, this.x, this.y);

    // 吹き出し（3秒ホバー後に表示）
    if (this.tooltipLabel) {
      drawTooltip(this.x, this.y - this.r - 10, this.tooltipLabel);
    }
  }

  moveTo(targetX, targetY, speed = 0.1) {
    this.x += (targetX - this.x) * speed;
    this.y += (targetY - this.y) * speed;
  }
}

// =========================================
// グローバル変数
// =========================================

let parents = [];
let originalParents = [];
let N = 5;
let activeParent = null;
let isDetailMode = false; // 子円を一直線に展開するモード
let lastBgColor;

let dragging = null, offsetX = 0, offsetY = 0;
let draggingChild = null, childOffsetX = 0, childOffsetY = 0;

let editingChild = null;
let showTextWindow = false;
let isMenuHovered = false;
let isTutorialOpen = false;

// 削除取り消し用
let pendingDelete = null; // { parent, child, index } を保持
let deleteTimer = null;   // 確定タイマー

// ランダムグロー演出用
const GLOW_INTERVAL_FRAMES = 300; // 5秒（60fps × 5）
const GLOW_DURATION_FRAMES = 120; // 2秒（60fps × 2）
let glowCounter = 0;
let glowTargetParent = null; // 光らせる親円
let glowTargetChild = null;  // 光らせる子円
let glowFrame = 0;

// [修正11] タイピング用変数をオブジェクトにまとめてグローバルを整理
let typing = {
  currentLine: 0,
  fullLine: "",
  typedLine: "",
  charIndex: 0,
  speed: 2,
  counter: 0,
  finished: false,
  waitCounter: 0,
  waitTime: 60,
  history: [],
};

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

// [修正9] originalSamples を配列にまとめて三項演算子の入れ子を解消
let originalSamples = [];

let isSplitMode = false;

// [修正8] draw() 内で毎フレーム querySelector しないようにキャッシュ
let circleMenuEl = null;

// =========================================
// 吹き出し描画
// =========================================

const TOOLTIP_LABELS = ["Drag", "Double Click"];
const HOVER_TOOLTIP_FRAMES = 180; // 3秒（60fps × 3）

// 吹き出しをp5.jsで描画する関数
function drawTooltip(cx, tipY, label) {
  const pw = textWidth(label) + 36;
  const ph = 34;
  const px = cx - pw / 2;
  const py = tipY - ph - 10;
  const tailH = 10;
  const cr = 8; // 角丸

  push();
  // 影
  noStroke();
  fill(0, 0, 0, 25);
  rect(px + 2, py + 4, pw, ph, cr);

  // 吹き出し本体（角丸矩形）
  fill(255, 255, 255, 230);
  rect(px, py, pw, ph, cr);

  // 三角の尻尾
  beginShape();
  vertex(cx - 7, py + ph);
  vertex(cx + 7, py + ph);
  vertex(cx, py + ph + tailH);
  endShape(CLOSE);

  // ラベルテキスト
  fill(40);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(13);
  textStyle(NORMAL);
  text(label, cx, py + ph / 2);
  pop();
}

// =========================================
// セットアップ
// =========================================

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');

  lastBgColor = color(240);

  // [修正9] originalSamples をディープコピーで初期化
  originalSamples = [
    JSON.parse(JSON.stringify(textData)),
    JSON.parse(JSON.stringify(textData2)),
    JSON.parse(JSON.stringify(textData3)),
  ];

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

  // [修正8] DOM要素をキャッシュ
  circleMenuEl = document.getElementById("circle-menu");

  setupUIEvents();
  // タイトル表示中からキャンバスアニメーションを動かす
}

// =========================================
// メインループ
// =========================================

function draw() {
  if (activeParent === null) {
    updateBgByOrder();
  }
  background(lastBgColor);

  if (activeParent === null) {
    // polygon モード：親円を多角形状に配置
    for (let i = 0; i < parents.length; i++) {
      let p = parents[i];
      let angle = (TWO_PI * i) / N - HALF_PI;
      let targetX = width / 2 + cos(angle) * 300;
      let targetY = height / 2 + sin(angle) * 300;

      if (p !== dragging) p.moveTo(targetX, targetY);
      for (let c of p.children) {
        c.visible = false;
        c.moveTo(width / 2, height / 2);
      }

      // ホバー判定
      if (!dragging && !showTextWindow) {
        const isHit = dist(mouseX, mouseY, p.x, p.y) < p.r;
        if (isHit) {
          p.hovered = true;
          p.hoverFrames++;
          if (p.hoverFrames === HOVER_TOOLTIP_FRAMES) {
            p.tooltipLabel = random(TOOLTIP_LABELS);
          }
        } else {
          p.hovered = false;
          p.hoverFrames = 0;
          p.tooltipLabel = null;
        }
      } else {
        p.hovered = false;
        p.hoverFrames = 0;
        p.tooltipLabel = null;
      }

      p.display();
    }
  } else if (isDetailMode && activeParent) {
    // detail モード：親円を左寄りに、子円を縦一直線に配置
    activeParent.moveTo(width / 4, height / 2);
    activeParent.display();

    let spacing = 160;
    for (let i = 0; i < activeParent.children.length; i++) {
      let c = activeParent.children[i];
      c.visible = true;
      c.moveTo(
        width / 2,
        height / 2 - ((activeParent.children.length - 1) / 2) * spacing + i * spacing
      );
      c.display();
    }
  } else {
    // polygon + activeParent：中央に親円、周囲に子円を配置
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

          // 子円ホバー判定
          if (!draggingChild && !showTextWindow) {
            const isHit = dist(mouseX, mouseY, c.x, c.y) < c.r;
            if (isHit) {
              c.hovered = true;
              c.hoverFrames++;
              if (c.hoverFrames === HOVER_TOOLTIP_FRAMES) {
                c.tooltipLabel = random(TOOLTIP_LABELS);
              }
            } else {
              c.hovered = false;
              c.hoverFrames = 0;
              c.tooltipLabel = null;
            }
          } else {
            c.hovered = false;
            c.hoverFrames = 0;
            c.tooltipLabel = null;
          }

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

  if (editingChild && activeParent) {
    circleMenuEl.style.left = (editingChild.x + editingChild.r + 30) + "px";
    circleMenuEl.style.top = editingChild.y + "px";
  }

  if (showTextWindow) handleTypingEffect();

  handleHoverMenu();
  updateGlow();
}

// =========================================
// マウス操作
// =========================================

function doubleClicked() {
  if (showTextWindow) return;
  if (isTutorialOpen) return;

  if (activeParent) {
    // 子円をダブルクリックで detail モード切り替え
    for (let c of activeParent.children) {
      if (dist(mouseX, mouseY, c.x, c.y) < c.r) {
        isDetailMode = !isDetailMode;
        return;
      }
    }
    // 親円をダブルクリックで非アクティブ化
    if (dist(mouseX, mouseY, activeParent.x, activeParent.y) < activeParent.r) {
      activeParent = null;
      isDetailMode = false;
      circleMenuEl.classList.add("hidden");
      return;
    }
  } else {
    // 親円をダブルクリックでアクティブ化
    for (let p of parents) {
      if (dist(mouseX, mouseY, p.x, p.y) < p.r) {
        activeParent = p;
        circleMenuEl.classList.add("hidden");
        return;
      }
    }
  }
}

function mousePressed(event) {
  if (event.target.tagName !== "CANVAS") return;
  if (isTutorialOpen) return; // チュートリアル表示中はキャンバス操作を無視

  // [修正4] モーダルが開いている時はドラッグを開始しない
  if (!document.getElementById("modal-bg").classList.contains("hidden")) return;

  circleMenuEl.classList.add("hidden");
  editingChild = null;

  if (activeParent === null) {
    for (let p of parents) {
      let distSq = ((mouseX - p.x) ** 2) / (p.r ** 2) + ((mouseY - p.y) ** 2) / (p.r ** 2);
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
  if (dragging) {
    dragging.x = mouseX - offsetX;
    dragging.y = mouseY - offsetY;
  }
  if (draggingChild) {
    draggingChild.x = mouseX - childOffsetX;
    draggingChild.y = mouseY - childOffsetY;
  }
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

// =========================================
// キーボード操作
// =========================================

function keyPressed() {
  // C・R はキーでも動作を残す（ボタンと共存）
  if (key === "c" || key === "C") {
    currentSample = (currentSample + 1) % samples.length;
    textData = samples[currentSample];
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
  }

  if (key === "r" || key === "R") {
    let baseData = originalSamples[currentSample];
    textData = JSON.parse(JSON.stringify(baseData));
    samples[currentSample] = textData;
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
    parents.sort((a, b) => originalParents.indexOf(a) - originalParents.indexOf(b));
    activeParent = null;
    isDetailMode = false;
    circleMenuEl.classList.add("hidden");
  }

  // W・Esc はボタンと共通関数に委譲
  if (key === "w" || key === "W") {
    if (window.openTextWindow) openTextWindow();
  }

  if (key === "Escape") {
    if (window.closeTextWindow) closeTextWindow();
  }
}

// =========================================
// ウィンドウリサイズ
// =========================================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// =========================================
// 背景色の更新
// =========================================

function updateBgByOrder() {
  let rAcc = 0, gAcc = 0, bAcc = 0;
  for (let i = 0; i < parents.length; i++) {
    const v = (i + 1) * (parents[i].id + 1);
    rAcc += (v * 37) % 256;
    gAcc += (v * 53) % 256;
    bAcc += (v * 97) % 256;
  }
  let bgColor = color(50 + (rAcc % 206), 50 + (gAcc % 206), 50 + (bAcc % 206));
  lastBgColor = lerpColor(lastBgColor, bgColor, 0.05);
}

// =========================================
// ランダムグロー演出
// =========================================

function updateGlow() {
  if (showTextWindow || isTutorialOpen) return;

  glowCounter++;

  // 5秒ごとに全親円の中からランダムな子円を1つ選んでグロー開始
  if (glowCounter >= GLOW_INTERVAL_FRAMES) {
    glowCounter = 0;

    // 全子円をフラットに集めてランダムに1つ選ぶ
    let allChildren = [];
    for (let p of parents) {
      for (let c of p.children) {
        allChildren.push({ parent: p, child: c });
      }
    }
    if (allChildren.length > 0) {
      const picked = allChildren[floor(random(allChildren.length))];
      glowTargetParent = picked.parent;
      glowTargetChild = picked.child;
      glowFrame = 0;
    }
  }

  // フレームを進める
  if (glowTargetChild && glowFrame < GLOW_DURATION_FRAMES) {
    glowFrame++;
  } else if (glowFrame >= GLOW_DURATION_FRAMES) {
    glowTargetParent = null;
    glowTargetChild = null;
  }
}

function startTypingLine() {
  if (typing.currentLine < parents.length) {
    const p = parents[typing.currentLine];
    typing.fullLine = p.text;
    typing.currentParentId = p.id; // 現在タイピング中の親円ID
    typing.typedLine = "";
    typing.charIndex = 0;
    typing.counter = 0;
    typing.finished = false;
    typing.waitCounter = 0;
  }
}

// =========================================
// テキストパネルのフォントサイズ自動計算
// =========================================

// 全親円のテキストが1行に収まる最大フォントサイズを返す
// ブラウザのRange APIで実際のレンダリング幅を測定するため正確
function calcFitFontSize() {
  const PANEL_WIDTH = 480;  // .text-panel の実効幅
  const MAX_SIZE = 32;
  const MIN_SIZE = 10;
  const FONT_FAMILY = '"Yu Mincho", "游明朝", "Hiragino Mincho ProN", serif';
  const LETTER_SPACING = "0.15em";

  // 最も長い行のテキストを特定
  let longestText = "";
  for (let p of parents) {
    if (p.text.length > longestText.length) longestText = p.text;
  }
  if (!longestText) return MAX_SIZE;

  // 測定用の非表示要素を作成
  const ruler = document.createElement("span");
  ruler.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    "visibility:hidden",
    "white-space:nowrap",
    `font-family:${FONT_FAMILY}`,
    `letter-spacing:${LETTER_SPACING}`,
    "line-height:1",
  ].join(";");
  ruler.textContent = longestText;
  document.body.appendChild(ruler);

  // 二分探索でPANEL_WIDTHに収まる最大サイズを求める
  let lo = MIN_SIZE, hi = MAX_SIZE, result = MIN_SIZE;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ruler.style.fontSize = mid + "px";
    const w = ruler.getBoundingClientRect().width;
    if (w <= PANEL_WIDTH) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  document.body.removeChild(ruler);
  return result;
}


// historyLines: [{text, parentId}] の配列
function buildTypingHTML(historyLines, currentTyped, currentParentId) {
  let lines = historyLines.map(
    (item) => `<span class="text-line" data-parent-id="${item.parentId}">${item.text}</span>`
  );
  if (currentTyped !== "") {
    lines.push(`<span class="text-line typing-current" data-parent-id="${currentParentId}">${currentTyped}</span>`);
  }
  return lines.join("<br>");
}

// 左右の .text-line に mouseenter/mouseleave を登録して連動ハイライトを実現
// 親円IDで対応付けるので、順番が入れ替わっていても正しく連動する
function bindLineHoverEvents() {
  document.querySelectorAll(".text-line").forEach((span) => {
    span.addEventListener("mouseenter", () => {
      const pid = span.dataset.parentId;
      document.querySelectorAll(`.text-line[data-parent-id="${pid}"]`).forEach(el => {
        el.classList.add("hovered");
      });
    });
    span.addEventListener("mouseleave", () => {
      const pid = span.dataset.parentId;
      document.querySelectorAll(`.text-line[data-parent-id="${pid}"]`).forEach(el => {
        el.classList.remove("hovered");
      });
    });
  });
}

// [修正11] typing オブジェクトを使うように書き換え
function handleTypingEffect() {
  let contentDiv = document.getElementById("text-content");

  if (!typing.finished && typing.currentLine < parents.length) {
    typing.counter++;
    if (typing.counter % typing.speed === 0 && typing.charIndex < typing.fullLine.length) {
      typing.typedLine += typing.fullLine[typing.charIndex];
      typing.charIndex++;
      contentDiv.innerHTML = buildTypingHTML(typing.history, typing.typedLine, typing.currentParentId);
      contentDiv.scrollTop = contentDiv.scrollHeight;
      bindLineHoverEvents();
    }
    if (typing.charIndex >= typing.fullLine.length) {
      typing.finished = true;
      // historyを {text, parentId} オブジェクトで保存
      typing.history.push({ text: typing.typedLine, parentId: typing.currentParentId });
      typing.waitCounter = 0;
      contentDiv.innerHTML = buildTypingHTML(typing.history, "");
      bindLineHoverEvents();
    }
  } else if (typing.finished && typing.currentLine < parents.length) {
    typing.waitCounter++;
    if (typing.waitCounter > typing.waitTime) {
      typing.currentLine++;
      if (typing.currentLine < parents.length) startTypingLine();
    }
  }
}

// =========================================
// ホバーメニューの制御
// =========================================

function handleHoverMenu() {
  if (!activeParent || !isDetailMode || draggingChild || dragging || showTextWindow) {
    if (activeParent) {
      for (let c of activeParent.children) c.hovered = false;
    }
    circleMenuEl.classList.add("hidden");
    return;
  }

  let newlyHovered = null;
  for (let c of activeParent.children) {
    if (dist(mouseX, mouseY, c.x, c.y) < c.r) {
      newlyHovered = c;
      break;
    }
  }

  // 子円のhoveredフラグを更新
  for (let c of activeParent.children) {
    c.hovered = (c === newlyHovered);
  }

  let modalBg = document.getElementById("modal-bg");

  if (newlyHovered) {
    editingChild = newlyHovered;
    circleMenuEl.style.left = (newlyHovered.x + newlyHovered.r + 10) + "px";
    circleMenuEl.style.top = newlyHovered.y + "px";
    circleMenuEl.classList.remove("hidden");
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
      circleMenuEl.classList.add("hidden");
    }
  }
}

// =========================================
// タイトル・チュートリアル・ボタン等のUI管理
// =========================================

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
  const mainCtrlEls = [
    document.getElementById('ctrl-bottom-right'),
    document.getElementById('ctrl-arrow-left'),
    document.getElementById('ctrl-arrow-right'),
  ].filter(Boolean);

  let currentPage = 0;
  const totalPages = 4;

  // --- 通常画面UIの表示・非表示 ---
  function showMainUI() {
    if (helpBtn) helpBtn.classList.remove('hidden');
    mainCtrlEls.forEach(el => el.classList.remove('hidden'));
  }
  function hideMainUI() {
    if (helpBtn) helpBtn.classList.add('hidden');
    mainCtrlEls.forEach(el => el.classList.add('hidden'));
  }

  // --- テキストウィンドウを開く（W相当） ---
  window.openTextWindow = function() {
    showTextWindow = true;
    document.getElementById("text-window").classList.remove("hidden");

    // 最長行が1行に収まるフォントサイズを計算してパネルに適用
    const fitSize = calcFitFontSize();
    document.getElementById("text-content").style.fontSize = fitSize + "px";

    typing = {
      currentLine: 0, fullLine: "", typedLine: "",
      charIndex: 0, speed: 2, counter: 0,
      finished: false, waitCounter: 0, waitTime: 60, history: [],
    };
    startTypingLine();
  };

  // --- テキストウィンドウを閉じる（Esc相当） ---
  window.closeTextWindow = function() {
    showTextWindow = false;
    document.getElementById("text-window").classList.add("hidden");
    document.getElementById("modal-bg").classList.add("hidden");
    isSplitMode = false;
    document.getElementById("text-window").classList.remove("is-split");
    document.getElementById("split-btn").innerText = "▶";
    document.querySelector(".split-btn-text").innerText = "元の言葉を辿る";
  };

  function updateSlider() {
    slider.style.transform = `translateX(-${currentPage * 100}%)`;
    const dots = document.querySelectorAll('.tutorial-dots .dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentPage);
    });
    tutBackBtn.classList.toggle('hidden', currentPage === 0);
    if (currentPage === totalPages - 1) {
      tutNextBtn.classList.add('hidden');
      tutStartBtn.classList.remove('hidden');
    } else {
      tutNextBtn.classList.remove('hidden');
      tutStartBtn.classList.add('hidden');
    }

    // 動画制御：現在のスライドのみ再生、他は停止して巻き戻す
    const videos = document.querySelectorAll('.tutorial-video');
    videos.forEach((video, index) => {
      if (index === currentPage) {
        video.currentTime = 0;
        video.play().catch(() => {}); // 自動再生ポリシーで失敗しても無視
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }

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
    hideMainUI();
    tutorialScreen.style.display = 'flex';
    setTimeout(() => {
      tutorialScreen.classList.remove('fade-out');
      tutorialScreen.classList.remove('hidden');
    }, 10);
    isTutorialOpen = true;
    noLoop();
  }

  function closeTutorial() {
    tutorialScreen.classList.add('fade-out');
    showMainUI();
    setTimeout(() => {
      tutorialScreen.style.display = 'none';
      isTutorialOpen = false; // フェード完了後にフラグを解除してからloop再開
      loop();
    }, 1000);
  }

  if (startBtn) {
    startBtn.onclick = () => {
      titleScreen.classList.add('fade-out');
      showMainUI();
      setTimeout(() => {
        titleScreen.style.display = 'none';
      }, 1000);
    };
  }

  if (tutorialBtn) {
    tutorialBtn.onclick = () => {
      titleScreen.classList.add('fade-out');
      setTimeout(() => { titleScreen.style.display = 'none'; }, 1000);
      openTutorial(true);
    };
  }

  if (helpBtn) helpBtn.onclick = () => openTutorial(false);

  if (tutNextBtn) tutNextBtn.onclick = () => {
    if (currentPage < totalPages - 1) { currentPage++; updateSlider(); }
  };
  if (tutBackBtn) tutBackBtn.onclick = () => {
    if (currentPage > 0) { currentPage--; updateSlider(); }
  };
  if (tutStartBtn) tutStartBtn.onclick = closeTutorial;
  if (tutCloseBtn) tutCloseBtn.onclick = closeTutorial;

  // --- メインコントロールボタン ---
  const ctrlTextBtn = document.getElementById('ctrl-text-btn');
  const ctrlSampleBtn = document.getElementById('ctrl-sample-btn');
  const ctrlPrevBtn = document.getElementById('ctrl-prev-btn');
  const ctrlResetBtn = document.getElementById('ctrl-reset-btn');
  const textCloseBtn = document.getElementById('text-close-btn');

  if (ctrlTextBtn) ctrlTextBtn.onclick = () => openTextWindow();

  // 次の言葉へ（右矢印）
  if (ctrlSampleBtn) ctrlSampleBtn.onclick = () => {
    currentSample = (currentSample + 1) % samples.length;
    textData = samples[currentSample];
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
  };

  // 前の言葉へ（左矢印）
  if (ctrlPrevBtn) ctrlPrevBtn.onclick = () => {
    currentSample = (currentSample - 1 + samples.length) % samples.length;
    textData = samples[currentSample];
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
  };

  if (ctrlResetBtn) ctrlResetBtn.onclick = () => {
    // Rキーと同じ処理
    let baseData = originalSamples[currentSample];
    textData = JSON.parse(JSON.stringify(baseData));
    samples[currentSample] = textData;
    for (let i = 0; i < parents.length; i++) {
      parents[i].originalChildTexts = textData[i].children.slice();
      parents[i].children = textData[i].children.map((t) => new ChildCircle(t));
      parents[i].updateTextFromChildren();
    }
    parents.sort((a, b) => originalParents.indexOf(a) - originalParents.indexOf(b));
    activeParent = null;
    isDetailMode = false;
    circleMenuEl.classList.add("hidden");
  };

  if (textCloseBtn) textCloseBtn.onclick = () => closeTextWindow();

  const menu = document.getElementById("circle-menu");
  if (menu) {
    menu.addEventListener("mouseenter", () => isMenuHovered = true);
    menu.addEventListener("mouseleave", () => isMenuHovered = false);
  }

  // --- トースト関連要素 ---
  const deleteToast = document.getElementById("delete-toast");
  const deleteUndoBtn = document.getElementById("delete-undo-btn");
  const deleteToastBar = document.getElementById("delete-toast-bar");
  const TOAST_DURATION = 5000; // 5秒

  function showDeleteToast() {
    // 既存タイマーがあればキャンセル
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }
    // トースト表示
    deleteToast.classList.remove("hidden");
    // プログレスバーアニメーション
    deleteToastBar.style.transition = "none";
    deleteToastBar.style.transform = "scaleX(1)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        deleteToastBar.style.transition = `transform ${TOAST_DURATION}ms linear`;
        deleteToastBar.style.transform = "scaleX(0)";
      });
    });
    // 5秒後に削除確定
    deleteTimer = setTimeout(() => {
      commitDelete();
    }, TOAST_DURATION);
  }

  function commitDelete() {
    // 削除を確定（pendingDeleteをクリア）
    pendingDelete = null;
    deleteTimer = null;
    deleteToast.classList.add("hidden");
  }

  function cancelDelete() {
    // 削除を取り消し：子円を元の位置に戻す
    if (!pendingDelete) return;
    const { parent, child, index } = pendingDelete;
    parent.children.splice(index, 0, child);
    parent.updateTextFromChildren();
    pendingDelete = null;
    if (deleteTimer) { clearTimeout(deleteTimer); deleteTimer = null; }
    deleteToast.classList.add("hidden");
  }

  document.getElementById("btn-delete").onclick = () => {
    if (editingChild && activeParent) {
      const index = activeParent.children.indexOf(editingChild);
      // まず先に前の保留削除があれば確定させる
      if (pendingDelete) commitDelete();
      // 削除を保留状態で実行（見た目上は即削除）
      pendingDelete = { parent: activeParent, child: editingChild, index };
      activeParent.children.splice(index, 1);
      activeParent.updateTextFromChildren();
      circleMenuEl.classList.add("hidden");
      editingChild = null;
      showDeleteToast();
    }
  };

  if (deleteUndoBtn) deleteUndoBtn.onclick = () => cancelDelete();

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
    isSplitMode = !isSplitMode;
    if (isSplitMode) {
      textWindow.classList.add("is-split");
      splitBtn.innerText = "◀";
      document.querySelector(".split-btn-text").innerText = "現在の言葉のみを見る";
      let baseData = originalSamples[currentSample];
      let originalHtml = baseData
        .map((p, i) => `<span class="text-line" data-parent-id="${i}">${p.children.join("")}</span>`)
        .join("<br>");
      originalContentDiv.innerHTML = originalHtml;
      // 現在パネルと同じフォントサイズを原文パネルにも適用
      const currentFontSize = document.getElementById("text-content").style.fontSize;
      if (currentFontSize) originalContentDiv.style.fontSize = currentFontSize;
      bindLineHoverEvents();
    } else {
      textWindow.classList.remove("is-split");
      splitBtn.innerText = "▶";
      document.querySelector(".split-btn-text").innerText = "元の言葉を辿る";
    }
  };
}

// =========================================
// モーダル
// =========================================

function showHTMLModal(msg, defaultText, callback) {
  document.getElementById("modal-message").innerText = msg;
  let input = document.getElementById("modal-input");
  input.value = defaultText;
  document.getElementById("modal-bg").classList.remove("hidden");
  circleMenuEl.classList.add("hidden");
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
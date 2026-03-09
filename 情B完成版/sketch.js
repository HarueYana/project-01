class ParentCircle {
  constructor(x, y, text, childTexts, id) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.r = 130;
    this.children = childTexts.map((t) => new ChildCircle(t));
    this.id = id; // ★追加：初期番号を保持

    this.originalText = text; // ←元テキストを保存
    this.originalChildTexts = childTexts.slice();
    // 初期テキストを子円から生成
    this.updateTextFromChildren();
  }

  updateTextFromChildren() {
    // 子円の text をつなげて親円の text にする
    this.text = this.children.map((c) => c.text).join("");
  }

  display() {
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(this.x, this.y, this.r * 2);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    if (textWidth(this.text) > 260) {
      textSize(15);
    }
    text(this.text, this.x, this.y);
  }

  display2() {
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(this.x, this.y, this.r * 2, this.r);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    if (textWidth(this.text) > 260) {
      textSize(15);
    }
    text(this.text, this.x, this.y);
  }

  moveTo(targetX, targetY, speed = 0.1) {
    this.x += (targetX - this.x) * speed;
    this.y += (targetY - this.y) * speed;
  }

  reset() {
    // 元の子テキストで子円をリセット
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].text = this.originalChildTexts[i];
      this.children[i].x = width / 2;
      this.children[i].y = height / 2;
      this.children[i].visible = false;
    }
    // 親テキストも更新
    this.updateTextFromChildren();
  }
}

class ChildCircle {
  constructor(text) {
    this.x = width / 2;
    this.y = height / 2;
    this.r = 110;
    this.text = text;
    this.visible = false; // 表示フラグ
    this.menuVisible = false;

    this.targetX = this.x;
    this.targetY = this.y;
  }

  display() {
    if (!this.visible) return;
    noStroke();
    fill(100, 150, 200, 200);
    ellipse(this.x, this.y, this.r * 2);
    fill(0);
    textAlign(CENTER, CENTER);
    text(this.text, this.x, this.y);

    // ★メニュー表示
    if (this.menuVisible) {
      let bx = this.x + this.r + 50;
      let by = this.y;
      let br = 25;

      // 上（削除）
      fill(255, 100, 100);
      ellipse(bx, by - 50, br * 2);
      text("×", bx, by - 50);

      // 中（追加）
      fill(100, 255, 100);
      ellipse(bx, by, br * 2);
      text("+", bx, by);

      // 下（編集）
      fill(100, 100, 255);
      ellipse(bx, by + 50, br * 2);
      text("✎", bx, by + 50);
    }
  }

  moveTo(targetX, targetY, speed = 0.1) {
    this.x += (targetX - this.x) * speed;
    this.y += (targetY - this.y) * speed;
  }
}

let parents = [];
let originalParents = []; // 初期状態のコピー

let N = 5;
let activeParent = null;
let layoutMode = "polygon";
let lastBgColor;
let dragging = null; // 掴んでいる親円
let offsetX = 0;
let offsetY = 0;

let draggingChild = null;
let childOffsetX = 0;
let childOffsetY = 0;

let editingChild = null; // 編集対象の子円

let showTextWindow = false; // ウィンドウ表示フラグ
let textLines = []; // 表示済みの行
let currentLine = 0; // 今表示している親円の番号
let fullLine = ""; // 現在タイプ中の行
let typedLine = ""; // タイプ済みの文字列
let charIndex = 0; // 現在の文字インデックス
let typingSpeed = 2; // 何フレームごとに1文字追加するか
let typingCounter = 0; // スピード調整カウンタ
let finishedLine = false; // 1行打ち終わったかどうか
let waitCounter = 0; // 行表示後の待機時間カウンタ
let waitTime = 60; // 待機時間（フレーム数, 60=約1秒）
let historyTexts = []; // ✅ 打ち終わった行を保存

let textData = [
  {
    text: "親１",
    children: ["窓の", "外を", "見る"],
  },
  {
    text: "親２",
    children: ["枝葉は", "風に", "揺れている"],
  },
  {
    text: "親３",
    children: ["うっすらと", "けぶった", "空は", "淡い", "水色だ"],
  },
  {
    text: "親４",
    children: ["夏の", "空は", "もっと", "色が", "濃い"],
  },
  {
    text: "親５",
    children: ["秋が", "近づいて", "いるのかもしれない"],
  },
];
let textData2 = [
  { text: "親A", children: ["いちごは", "栃木の", "名産品だ"] },
  { text: "親B", children: ["内陸型の", "気候が", "栽培に", "適している"] },
  { text: "親C", children: ["植物の", "甘みは", "寒暖差によって", "生まれる"] },
  {
    text: "親D",
    children: ["比熱が", "小さい", "大地は", "寒暖差を", "生みやすい"],
  },
  { text: "親E", children: ["内陸県だからこそ", "発展した", "産業だ"] },
];
let textData3 = [
  { text: "親α", children: ["糸の", "目は", "感情を", "表に", "出しにくい"] },
  { text: "親β", children: ["私は", "その目に", "憧れを", "抱く"] },
  {
    text: "親γ",
    children: ["私の", "目は", "大きく", "感情が", "表に", "出やすい"],
  },
  {
    text: "親δ",
    children: [
      "この間は",
      "落胆を",
      "隠しきれず",
      "恥ずかしい",
      "思いを",
      "した",
    ],
  },
  { text: "親ε", children: ["来世は", "糸の目に", "生まれたいと", "思う"] },
];
let currentSample = 0;
let samples = [textData, textData2, textData3];

let originalTextData = []; // 初期状態コピー用
let originalTextData2 = []; // 初期状態コピー用]
let originalTextData3 = []; // 初期状態コピー用

function setup() {
  lastBgColor = color(240); // 最後の背景色を保持
  createCanvas(windowWidth, windowHeight);
  originalTextData = JSON.parse(JSON.stringify(textData));
  originalTextData2 = JSON.parse(JSON.stringify(textData2));
  originalTextData3 = JSON.parse(JSON.stringify(textData3));

  let cx = width / 2;
  let cy = height / 2;
  let radius = 200;

  for (let i = 0; i < N; i++) {
    let angle = (TWO_PI * i) / N - HALF_PI;
    let x = cx + cos(angle) * radius;
    let y = cy + sin(angle) * radius;

    // ✅ ParentCircle を生成
    let parent = new ParentCircle(
      x,
      y,
      textData[i].text, // 親のテキスト
      textData[i].children, // 子のテキスト配列
      i,
    );

    parent.updateTextFromChildren();

    parents.push(parent);
  }

  // setup() の最後で
  originalParents = parents.slice();
}

function draw() {
  // 多角形上の親円の色を計算
  if (layoutMode === "polygon" && activeParent === null) {
    updateBgByOrder();
  }
  background(lastBgColor);

  let rkey = "Rキーですべてリセット";
  text(rkey, width - 40 - textWidth(rkey), height - 40);

  if (activeParent === null) {
    for (let i = 0; i < parents.length; i++) {
      let p = parents[i];

      let targetX, targetY;

      if (layoutMode === "polygon") {
        // 多角形上に配置
        let angle = (TWO_PI * i) / N - HALF_PI;
        targetX = width / 2 + cos(angle) * 300;
        targetY = height / 2 + sin(angle) * 300;
      } else if (layoutMode === "line") {
        // 一直線上に配置
        let spacing = 260; // 円の間隔
        targetX = width / 2 - ((N - 1) / 2) * spacing + i * spacing;
        targetY = height / 2;
      } else if (layoutMode === "line2") {
        let spacing = 130;
        targetX = width / 3;
        targetY = height / 2 - ((N - 1) / 2) * spacing + i * spacing;
      }

      if (p !== dragging) {
        let speed = activeParent === null ? 0.25 : 0.1; // ★戻すときだけ早く
        p.moveTo(targetX, targetY, speed);
      }
      // 子円は中央に隠す
      for (let c of p.children) {
        c.visible = false;
        c.moveTo(width / 2, height / 2);
      }

      if (layoutMode === "polygon" || layoutMode === "line") {
        p.display();
        let instractions = [
          "円をダブルクリック",
          "Wキー",
          "Cキー",
          "Fキー",
          "Lキー",
          "円をドラッグ",
          "操作",
        ];
        for (let i = instractions.length - 1; i >= 0; i--) {
          textAlign(LEFT, CENTER);
          textSize(16);
          noStroke();
          fill(255, 200);
          text(instractions[i], 40, height - 40 - i * 20);
        }
      } else if (layoutMode === "line2") {
        p.display2();
        let instractions = ["Fキー", "Lキー", "Cキー", "円をドラッグ", "操作"];
        for (let i = instractions.length - 1; i >= 0; i--) {
          textAlign(LEFT, CENTER);
          textSize(16);
          noStroke();
          fill(255, 200);
          text(instractions[i], 40, height - 40 - i * 20);
        }
      }
    }
  } else if (layoutMode === "detail" && activeParent) {
    // 親円を左側に
    activeParent.moveTo(width / 4, height / 2);
    activeParent.display();

    // 子円を中央に縦並び
    let spacing = 160;
    for (let i = 0; i < activeParent.children.length; i++) {
      let c = activeParent.children[i];
      c.visible = true;
      c.moveTo(
        width / 2,
        height / 2 -
          ((activeParent.children.length - 1) / 2) * spacing +
          i * spacing,
      );
      c.display();
    }

    let instractions = [
      "Wキー",
      "Dキー",
      "青ボタン：テキストを編集",
      "緑ボタン：円を追加",
      "赤ボタン：円を消去",
      "並んだ円をダブルクリック",
      "操作",
    ];
    for (let i = instractions.length - 1; i >= 0; i--) {
      textAlign(LEFT, CENTER);
      textSize(16);
      noStroke();
      fill(255, 200);
      text(instractions[i], 40, height - 40 - i * 20);
    }
  } else {
    // アクティブな親円だけ中央へ
    for (let p of parents) {
      if (p === activeParent) {
        p.moveTo(width / 2, height / 2);

        // 子円を展開
        let M = p.children.length;
        let r = 300;
        for (let i = 0; i < M; i++) {
          let angle = (TWO_PI * i) / M - HALF_PI;
          let tx = width / 2 + cos(angle) * r;
          let ty = height / 2 + sin(angle) * r;

          let c = p.children[i];
          c.visible = true;

          // ドラッグ中でなければ整列させる
          if (c !== draggingChild) {
            c.moveTo(tx, ty);
          }

          c.display();
        }
      } else {
        // 他の親円は画面外へ
        let dx = p.x - width / 2;
        let dy = p.y - height / 2;
        let farX = width / 2 + dx * 1.2;
        let farY = height / 2 + dy * 1.2;
        p.moveTo(farX, farY);

        // 子円は非表示
        for (let c of p.children) {
          c.visible = false;
        }
      }

      p.display();
    }
    let instractions = [
      "Wキー",
      "Dキー",
      "中央の円をダブルクリック",
      "周囲の円をドラッグ",
      "操作",
    ];
    for (let i = instractions.length - 1; i >= 0; i--) {
      textAlign(LEFT, CENTER);
      textSize(16);
      noStroke();
      fill(255, 200);
      text(instractions[i], 40, height - 40 - i * 20);
    }
  }
  if (showTextWindow) {
    drawTextWindow();
  }
}

function doubleClicked() {
  if (activeParent && layoutMode === "detail") {
    for (let c of activeParent.children) {
      let d = dist(mouseX, mouseY, c.x, c.y);
      if (d < c.r) {
        c.menuVisible = true;
        return;
      }
    }
  } else {
    for (let p of parents) {
      let d = dist(mouseX, mouseY, p.x, p.y);
      if (d < p.r) {
        if (activeParent === p) {
          activeParent = null; // もう一度ダブルクリックで戻す
        } else {
          activeParent = p;
        }
      }
    }
  }
}

function mousePressed() {
  if (activeParent && layoutMode === "detail") {
    for (let i = 0; i < activeParent.children.length; i++) {
      let c = activeParent.children[i];
      if (!c.menuVisible) continue;

      let bx = c.x + c.r + 50;
      let by = c.y;
      let br = 25;

      // --- 上：削除 ---
      if (dist(mouseX, mouseY, bx, by - 50) < br) {
        activeParent.children.splice(i, 1);
        activeParent.updateTextFromChildren();
        c.menuVisible = false;
        return;
      } else if (dist(mouseX, mouseY, bx, by) < br) {
        c.menuVisible = false;
        showModal("子を追加してください", "", (value) => {
          if (value.trim() !== "") {
            activeParent.children.push(new ChildCircle(value)); // ←修正
            activeParent.updateTextFromChildren();
          }
        });
      } else if (dist(mouseX, mouseY, bx, by + 50) < br) {
        c.menuVisible = false;
        showModal("テキストを編集してください", c.text, (value) => {
          if (value.trim() !== "") {
            c.text = value;
            activeParent.updateTextFromChildren();
          }
        });
      } else {
        c.menuVisible = false;
      }
    }
  } else if (activeParent === null) {
    if (layoutMode === "line2") {
      for (let p of parents) {
        let mx = mouseX,
          my = mouseY,
          cx = p.x,
          cy = p.y,
          rx = 160,
          ry = 80;
        let distSq =
          ((mx - cx) * (mx - cx)) / (rx * rx) +
          ((my - cy) * (my - cy)) / (ry * ry);
        if (distSq <= 1) {
          dragging = p;
          offsetX = mouseX - p.x; // ← fが抜けてたので修正
          offsetY = mouseY - p.y;
        }
      }
    } else {
      // 多角形モードのときだけ有効
      for (let p of parents) {
        let d = dist(mouseX, mouseY, p.x, p.y);
        if (d < p.r) {
          dragging = p;
          offsetX = mouseX - p.x;
          offsetY = mouseY - p.y;
        }
      }
    }
  } else {
    for (let c of activeParent.children) {
      if (c.visible) {
        let d = dist(mouseX, mouseY, c.x, c.y);
        if (d < c.r) {
          dragging = null;
          draggingChild = c;
          childOffsetX = mouseX - c.x;
          childOffsetY = mouseY - c.y;
        }
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
    // どの位置に一番近いか調べる
    let cx = width / 2;
    let cy = height / 2;
    let angle = atan2(dragging.y - cy, dragging.x - cx); // 中心からの角度
    if (angle < -HALF_PI) angle += TWO_PI; // -90度基準に補正

    // 角度からインデックスを推定
    let newIndex = round(((angle + HALF_PI) / TWO_PI) * N) % N;

    // 現在のインデックス
    let oldIndex = parents.indexOf(dragging);

    // 配列を入れ替え
    parents.splice(oldIndex, 1);
    parents.splice(newIndex, 0, dragging);

    dragging = null;
  }

  if (draggingChild) {
    let cx = width / 2;
    let cy = height / 2;
    let angle = atan2(draggingChild.y - cy, draggingChild.x - cx);
    if (angle < -HALF_PI) angle += TWO_PI;

    let n = activeParent.children.length;
    let newIndex = round(((angle + HALF_PI) / TWO_PI) * n) % n;

    let oldIndex = activeParent.children.indexOf(draggingChild);

    activeParent.children.splice(oldIndex, 1);
    activeParent.children.splice(newIndex, 0, draggingChild);

    // ★ 子円の順序が変わったので親のテキストを更新
    activeParent.updateTextFromChildren();

    draggingChild = null;
  }
}

function keyPressed() {
  if (key === "c" || key === "C") {
    // サンプルを順番に切り替え
    currentSample = (currentSample + 1) % samples.length;
    textData = samples[currentSample];

    for (let i = 0; i < parents.length; i++) {
      let p = parents[i];
      p.originalChildTexts = textData[i].children.slice();
      p.children = textData[i].children.map((t) => new ChildCircle(t));
      p.updateTextFromChildren();
    }

    // テキストウィンドウリセット
    historyTexts = [];
    currentLine = 0;
    typedLine = "";
    charIndex = 0;
    finishedLine = false;
  }
  if (key === "d" || key === "D") {
    if (layoutMode === "detail") {
      layoutMode = "polygon"; // 戻す
    } else if (activeParent) {
      layoutMode = "detail"; // 詳細モードに入る
    }
  }
  if (key === "r" || key === "R") {
    // textData を初期状態に戻す
    textData = JSON.parse(JSON.stringify(originalTextData));
    textData2 = JSON.parse(JSON.stringify(originalTextData2));
    textData3 = JSON.parse(JSON.stringify(originalTextData3));

    // 親円を元の順序・位置・子テキストに戻す
    for (let i = 0; i < parents.length; i++) {
      let p = parents[i];
      p.originalChildTexts = textData[i].children.slice();
      p.children = textData[i].children.map((t) => new ChildCircle(t));
      p.updateTextFromChildren();
    }
    for (let i = 0; i < parents.length; i++) {
      let p = parents[i];
      p.originalChildTexts = textData2[i].children.slice();
      p.children = textData2[i].children.map((t) => new ChildCircle(t));
      p.updateTextFromChildren();
    }
    for (let i = 0; i < parents.length; i++) {
      let p = parents[i];
      p.originalChildTexts = textData3[i].children.slice();
      p.children = textData3[i].children.map((t) => new ChildCircle(t));
      p.updateTextFromChildren();
    }

    // 配列順を元に戻す
    parents.sort(
      (a, b) => originalParents.indexOf(a) - originalParents.indexOf(b),
    );

    activeParent = null; // アクティブ親円もリセット
  }

  if (key === "l" || key === "L") {
    layoutMode = "line"; // 一直線モード
  }
  if (key === "f" || key === "F") {
    layoutMode = "polygon"; // 多角形モード
  }
  if (key === "i" || key === "I") {
    layoutMode = "line2";
  }

  if (key === "w" || key === "W") {
    showTextWindow = true;
    textLines = []; // 新規スタート時は履歴クリア
    currentLine = 0;
    startTypingLine();
  }

  if (key === "Escape") {
    showTextWindow = false; // ウィンドウを閉じる

    // --- 追加：ここから下の変数をリセットして元の文章を消去する ---
    historyTexts = []; // 打ち終わった行の履歴をクリア
    textLines = []; // 表示済みの行をクリア
    currentLine = 0; // 行数のカウントをリセット
    typedLine = ""; // タイプ済みの文字列をクリア
    fullLine = ""; // 現在の行の文字列をクリア
    charIndex = 0; // 文字のインデックスをリセット
    finishedLine = false; // 完了フラグをリセット
  }
}

function updateBgByOrder() {
  // 並び（parentsの順）と固定IDに基づいて色を作る
  let rAcc = 0,
    gAcc = 0,
    bAcc = 0;
  for (let i = 0; i < parents.length; i++) {
    const uid = parents[i].id; // 固定ID
    const v = (i + 1) * (uid + 1); // 並び×ID で変化
    rAcc += (v * 37) % 256;
    gAcc += (v * 53) % 256;
    bAcc += (v * 97) % 256;
  }
  // 見やすい範囲に収める（50〜255）
  const r = 50 + (rAcc % 206);
  const g = 50 + (gAcc % 206);
  const b = 50 + (bAcc % 206);
  bgColor = color(r, g, b);

  lastBgColor = lerpColor(lastBgColor, bgColor, 0.05);
}

function showModal(message, defaultText, callback) {
  let bg = document.getElementById("modal-bg");
  let msg = document.getElementById("modal-message");
  let input = document.getElementById("modal-input");
  let ok = document.getElementById("modal-ok");

  msg.textContent = message;
  bg.style.display = "flex"; // モーダル表示
  input.value = defaultText || "";
  input.focus();

  // OKボタン
  ok.onclick = () => {
    callback(input.value);
    bg.style.display = "none";
  };

  // Enterキーでも確定
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      callback(input.value);
      bg.style.display = "none";
    }
  };
}

function drawInstractions() {
  if (activeParent && layoutMode === "detail") {
    push();
    noStroke();
    fill(200, 200, 200, 200);
    rect(100, height - 400, 400, 300, 30, 30, 30, 30);
    fill(0);
    textSize(14);
    textAlign(LEFT, TOP);
    text("小円をダブルクリック", 120, height - 380);
    text("赤ボタン:消去", 120, height - 360);
    text("緑ボタン:小円追加", 120, height - 340);
    text("青ボタン:テキスト編集", 120, height - 320);
    text("dキーで戻る", 120, height - 300);
    pop();
  }
}

function drawTextWindow() {
  // ウィンドウ本体
  fill(255);
  stroke(0);
  rectMode(CENTER);
  let ww = width * 0.6;
  let wh = height * 0.6;
  rect(width / 2, height / 2, ww, wh, 20);

  // テキスト描画設定
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  let ts = 20;
  textSize(ts);
  let lh = ts * 1.4; // 行間
  textLeading(lh);

  // テキストエリア
  let margin = 40;
  let startX = width / 2 - ww / 2 + margin;
  let startY = height / 2 - wh / 2 + margin;
  let tw = ww - margin * 2; // テキスト幅
  let th = wh - margin * 2; // テキスト高さ

  let maxLines = Math.floor(th / lh); // 入る最大行数
  let y = startY;

  push();
  noStroke();
  fill(0, 150); // 少し透過
  textSize(16);
  textAlign(RIGHT, TOP); // 右上に揃える
  text("escキーで戻る", width / 2 + ww / 2 - 20, height / 2 + wh / 2 - 40);
  pop();

  // ---- 打ち終わった行を描画 ----
  let visibleHistory = [];
  for (let t of historyTexts) {
    let wrapped = wrapText(t, tw);
    visibleHistory.push(...wrapped);
  }
  // 最新 maxLines 行だけ表示
  visibleHistory = visibleHistory.slice(-maxLines);

  for (let w of visibleHistory) {
    text(w, startX, y);
    y += lh;
  }

  // ---- タイピング中の行 ----
  if (!finishedLine && currentLine < parents.length) {
    typingCounter++;
    if (typingCounter % typingSpeed === 0 && charIndex < fullLine.length) {
      typedLine += fullLine[charIndex];
      charIndex++;
    }

    let wrapped = wrapText(typedLine, tw);
    for (let w of wrapped) {
      text(w, startX, y);
      y += lh;
    }

    if (charIndex >= fullLine.length) {
      finishedLine = true;
      historyTexts.push(typedLine);
      waitCounter = 0;
    }
  }
  // ---- 待機中（次の行に進む） ----
  else if (finishedLine && currentLine < parents.length) {
    waitCounter++;
    if (waitCounter > waitTime) {
      currentLine++;
      if (currentLine < parents.length) {
        startTypingLine(); // 次の行スタート
      }
    }
  }
}

function startTypingLine() {
  if (currentLine < parents.length) {
    fullLine = parents[currentLine].text;
    typedLine = "";
    charIndex = 0;
    typingCounter = 0;
    finishedLine = false;
  }
}

function drawHistoryWindow(i) {
  let bx = width / 2 - ((4 - 1) / 2) * 200 + i * 200;
  let by = (height / 4) * 3;
  let bw = 120;
  let bh = 40;

  // 履歴ウィンドウをボタンの上に表示
  let hw = 300;
  let hh = 100;
  let hx = bx + bw / 2 - hw / 2;
  let hy = by - hh - 20;

  fill(255);
  stroke(0);
  rect(hx, hy, hw, hh, 10);

  noStroke();
  fill(0);
  textAlign(LEFT, TOP);
  textSize(14);

  for (let j = 0; j < textBox[i].length; j++) {
    text(textBox[i][j], hx + 10, hy + 10 + j * 18);
  }
}

function wrapText(str, maxWidth) {
  let words = str.split(" ");
  let lines = [];
  let currentLine = "";
  for (let w of words) {
    let testLine = currentLine ? currentLine + " " + w : w;
    if (textWidth(testLine) > maxWidth) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

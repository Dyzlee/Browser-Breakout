// Global variables
var maxBricks = 30;
var maxLives = 30;
var showExplosion = true;
var ballColor = "#ff0000";
var platformColor = "#000000";
loadConfig();
var gameStarted = false;
var gameInited = false;
var plsReset = false;
const colors = [['#1abc9c', '#16a085'], ['#2ecc71', '#27ae60'], ['#3498db', '#2980b9'], ['#9b59b6', '#8e44ad'], ['#f1c40f', '#f39c12'], ['#e67e22', '#d35400'], ['#e74c3c', '#c0392b']];

// Message listener
chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.key) {
    case 'init':
      if (gameInited) {
        plsReset = true;
      } else {
        initGame();
        gameInited = true;
      }
      break;
    case 'maxBricks':
      maxBricks = msg.value;
      break;
    case 'lives':
      maxLives = msg.value;
      break;
    case 'showExplosion':
      showExplosion = msg.value;
      break;
    case 'ballColor':
      ballColor = msg.value;
      break;
    case 'platformColor':
      platformColor = msg.value;
      break;
  }
});

function initGame() {
  //loadConfig();
  var lives = maxLives;
  const RX = window.innerWidth + window.scrollX;    // Absolute Right x Coord
  const BY = window.innerHeight + window.scrollY;   // Absolute Bottom y Coord
  const LX = window.scrollX;                        // Absolute Left x Coord
  const TY = window.scrollY;                        // Absolute Top y Coord
  const W = RX - LX;            // True Width
  const H = BY - TY;            // True Height
  document.body.style.cssText += "overflow:hidden !important;"

  // Create Canvas
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  canvas.width = RX;
  canvas.height = BY;
  canvas.style = "position:absolute;top:0;left:0;z-index:2147483647;";
  document.body.appendChild(canvas);

  // Create Platform
  var platform = {
    width: 200,
    height: 25,
    dx: 20,  // by how much the platform moves per frame
    speed: 0  // current movement speed on x axis
  };
  platform.x = RX - W / 2 - platform.width / 2;
  platform.y = BY - platform.height - 5;

  // Create Ball
  var ball = {
    r: 15,
    a: 0,
    v: 15
  };
  ball.x = platform.x + platform.width / 2;  // note that the (x,y) indicates the center of the ball
  ball.y = platform.y - ball.r;

  // Create directional line
  var dirl = {
    l: 100  // length of line
  }
  dirl.x = ball.x;  // Coord of top of directional line
  dirl.y = ball.y - dirl.l;

  // Create Bricks
  var bricks = [];
  var createBricks = function () {
    canvas.style.pointerEvents = 'none';  // pointer-events is none, because of use of elementFromPoint(), which ignores elements with pointer-events:none
    var minDistanceBallBrick = 100;
    var bodyElements = document.body.querySelectorAll('*');
    bodyElements = Array.from(bodyElements);

    var brickCandidates = [];
    for (var i = 0; i < bodyElements.length; i++) {
      var bc = bodyElements[i];
      var bcRect = getAbsRect(bc);

      if (bcRect.y + bcRect.height + platform.height + ball.r * 2 + minDistanceBallBrick < BY &&
        bcRect.y > TY && (bcRect.width > 10 && bcRect.height > 10) && elementIsVisible(bc)) {
        brickCandidates.push(bc);
      }
    }

    if (brickCandidates.length == 0) {
      window.alert("There aren't any possible bricks from this POV!");
      location.reload();
      return;
    } else if (maxBricks > brickCandidates.length) {
      bricks = sampleArray(brickCandidates, brickCandidates.length);
    } else {
      bricks = sampleArray(brickCandidates, maxBricks);
    }

    for (var i = 0; i < bricks.length; i++) {
      var e = bricks[i];
      var c = sampleArray(colors, 1)[0];
      e.style.cssText += `border: ${c[0]} 0.5px solid !important; outline: ${c[0]} 2px solid !important; background-color: ${c[1]}88 !important;`;
    }
    canvas.style.pointerEvents = 'auto';  // reset pointer-events afterwards
  }
  createBricks();

  // Inputhandler
  var keysDown = {};
  document.onkeydown = function (e) {
    keysDown[e.key] = true;
  };
  document.onkeyup = function (e) {
    keysDown[e.key] = false;
  };

  // Draw function
  var draw = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas

    if (!gameStarted) {
      // Draw directional line
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(dirl.x, dirl.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = platformColor;
      ctx.stroke();
      ctx.closePath();
    }

    ctx.beginPath();  // Draw platform
    ctx.rect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = platformColor;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();  // Draw ball
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();
    ctx.closePath();

    ctx.font = "16px Arial";  // Lives count
    ctx.fillStyle = ballColor;
    ctx.fillText(`Lives: ${lives}`, LX + 5, BY - 5);
  }

  // Update function
  var update = function () {
    // Update Ball
    var ballR = (ball.a > 0 && ball.a < 180);  // true if ball is moving right
    var ballL = !ballR;                        // true if ball is moving left
    var ballD = (ball.a > 90 && ball.a < 270); // true if ball is moving down
    var ballU = !ballD;                        // true if ball is moving up

    // Hit Brick
    for (var i = 0; i < bricks.length; i++) {
      var brick = bricks[i];
      var brickRect = getAbsRect(brick);

      if (ballRectangleCollision(ball, brickRect)) {
        // Ref: https://codesandbox.io/s/brick-breaker-using-javascript-forked-uvws2?file=/src/collisionDetection.js
        var x1 = ball.x - ball.r;                 // left of ball
        var x2 = ball.x + ball.r;                 // right of ball
        var ax = brickRect.x;                     // left of brick
        var bx = brickRect.x + brickRect.width;   // right of brick

        var y1 = ball.y - ball.r;                 // top of ball
        var y2 = ball.y + ball.r;                 // bottom of ball
        var ay = brickRect.y;                     // top of brick
        var by = brickRect.y + brickRect.height;  // bottom of brick

        var d1 = by - y1 < x2 - ax;  // true if ball is nearer to bottom than it is to left of brick
        var d2 = by - y1 < bx - x1;  // true if ball is nearer to bottom than it is to right of brick
        var d3 = y2 - ay < x2 - ax;  // true if ball is nearer to top than it is to left of brick
        var d4 = y2 - ay < bx - x1;  // true if ball is nearer to top than it is to right of brick

        if ((ballR && ballU && d1) || (ballL && ballU && d2) || (ballR && ballD && d3) || (ballL && ballD && d4)) {
          ball.a = angleReflect(ball.a, 90);
        }
        else if ((ballR && ballU && !d1) || (ballL && ballU && !d2) || (ballR && ballD && !d3) || (ballL && ballD && !d4)) {
          ball.a = angleReflect(ball.a, 0);
        }
        else {
          console.log(d1, d2, d3, d4);
          ball.a = angleReflect(ball.a, 0);
          throw "There is a problem somewhere in Brick direction hit";  // TODO Check if this gets thrown
        }
        // todo make brick content disapear?!
        /*var brickChildren = brick.querySelectorAll('*');
        brickChildren = Array.from(brickChildren);
        for (var i = 0; i < brickChildren.length; i++) {
          brickChildren[i].style = "visibility:visible;"
        }
        brick.style = "visibility:hidden;"*/

        brick.style.border = "";
        brick.style.outline = "";
        brick.style.backgroundColor = "";
        bricks.splice(i, 1);
        if (showExplosion) {
          breakBrick(brick);
        }

        break;
      }
    }

    // Check if game is won
    if (bricks.length == 0 && gameStarted) {
      gameStarted = false;
      if (confirm("You Won! Play again?")) {
        reset(true);
      } else {
        location.reload();
      }
      return;
    }

    // Hit Platform
    if (ballRectangleCollision(ball, platform) && ballD) {
      if (ball.a <= 190 && ball.a >= 180) {
        ball.a += 20;
      } else if (ball.a < 180 && ball.a >= 170) {
        ball.a -= 20;
      }
      ball.a = angleReflect(ball.a, 90);
    }

    // Hit Border
    var hitLeftBorder = ball.x - ball.r <= LX && ballL;
    var hitRightBorder = ball.x + ball.r >= RX && ballR;
    var hitTopBorder = ball.y - ball.r <= TY && ballU;
    var hitBottom = ball.y >= BY && ballD;

    if (hitLeftBorder || hitRightBorder) {
      ball.a = angleReflect(ball.a, 0);
    }
    if (hitTopBorder) {
      ball.a = angleReflect(ball.a, 90);
    }
    if (hitBottom) {  // Game over
      lives -= 1;
      if (lives == 0) {
        if (confirm("You lost! Play again?")) {
          reset(true);
        } else {
          location.reload();
        }
        return;
      }
      reset();
      return;
    }

    ball.a = normalizeAngle(ball.a);
    ball.x += ball.v * Math.sin(ball.a * Math.PI / 180);
    ball.y -= ball.v * Math.cos(ball.a * Math.PI / 180);

    // Update Platform
    // Key input
    var l = keysDown['a'] || keysDown['ArrowLeft'];
    var r = keysDown['d'] || keysDown['ArrowRight'];
    if (l && !r) {
      platform.speed = -platform.dx;
    } else if (r && !l) {
      platform.speed = platform.dx;
    } else {
      platform.speed = 0;
    }

    // Borders
    if (platform.x < LX && platform.speed < 0) {  // Left Border
      platform.speed = 0;
    }
    if (platform.x + platform.width > RX && platform.speed > 0) {  // Right Border
      platform.speed = 0;
    }

    platform.x += platform.speed;
  }

  // Main loop
  var run = function () {
    if (gameStarted) {
      update();
    } else {
      // Allow player to select ball direction
      var l = keysDown['a'] || keysDown['ArrowLeft'];
      var r = keysDown['d'] || keysDown['ArrowRight'];

      if (l && (ball.a > 300 || ball.a <= 60)) {
        ball.a -= 2;
      } else if (r && (ball.a >= 300 || ball.a < 60)) {
        ball.a += 2;
      }
      ball.a = normalizeAngle(ball.a);
      dirl.x = ball.x + dirl.l * Math.sin(ball.a * Math.PI / 180);
      dirl.y = ball.y - dirl.l * Math.cos(ball.a * Math.PI / 180);

      if (keysDown[' '] || keysDown['ArrowUp'] || keysDown['w']) {  // Wait for player to start by pressing space
        gameStarted = true;
      }
    }

    if (plsReset) {
      loadConfig();
      reset(true);
      plsReset = false;
    }

    draw();

    requestAnimationFrame(run);
  }

  // Reset function
  var reset = function (fullReset = false) {
    platform.x = RX - W / 2 - platform.width / 2;
    platform.y = BY - platform.height - 5;
    platform.speed = 0;

    ball.x = platform.x + platform.width / 2;
    ball.y = platform.y - ball.r;
    ball.a = 0;

    keysDown = {};

    if (fullReset) {
      bricks.forEach(e => { e.style.border = ""; e.style.outline = ""; e.style.backgroundColor = ""; });
      bricks = [];
      createBricks();
      lives = maxLives;
    }

    gameStarted = false;
  }

  run();
}

function breakBrick(brick) {
  // Animation by @jkantner - https://codepen.io/jkantner/pen/oNjjEaJ
  var centerX = pxToEm(brick.offsetWidth) / 2;
  var centerY = pxToEm(brick.offsetHeight) / 2;
  var duration = 1000;

  brick.classList.add("exploding");

  var particle_amount = 25;
  for (var c = 0; c < particle_amount; ++c) {
    var r = randomFloat(0.25, 0.5);
    var diam = r * 2;
    var xBound = centerX - r;
    var yBound = centerY - r;
    var easing = "cubic-bezier(0.15, 0.5, 0.5, 0.85)";

    var x = centerX + randomFloat(-xBound, xBound);
    var y = centerY + randomFloat(-yBound, yBound);
    var angle = calcAngle(centerX, centerY, x, y);
    var distance = randomFloat(1, 5);

    // Create FireParticle
    var width = `${diam}em`;
    var height = `${diam}em`;
    var adjustedAngle = angle + Math.PI / 2;

    var div = document.createElement("div");
    div.className = "particle";

    div.classList.add("particle--fire");

    div.style.width = width;
    div.style.height = height;

    brick.appendChild(div);

    var s = {
      x: x - diam / 2,
      y: y - diam / 2
    };

    var d = {
      x: s.x + Math.sin(adjustedAngle) * distance,
      y: s.y - Math.cos(adjustedAngle) * distance
    };

    var sx = s.x;
    var sy = s.y;
    var dx = d.x;
    var dy = d.y;

    var animation = div.animate([
      { background: "hsl(60,100%,100%)", transform: `translate(${sx}em,${sy}em) scale(1)` },
      { background: "hsl(60,100%,80%)", transform: `translate(${sx + (dx - sx) * 0.25}em,${sy + (dy - sy) * 0.25}em) scale(4)` },
      { background: "hsl(40,100%,60%)", transform: `translate(${sx + (dx - sx) * 0.5}em,${sy + (dy - sy) * 0.5}em) scale(7)` },
      { background: "hsl(20,100%,40%)" },
      { background: "hsl(0,0%,20%)", transform: `translate(${dx}em,${dy}em) scale(0)` }],
      {
        duration: randomInt(duration / 2, duration),
        easing: easing,
        delay: 0
      });

    animation.onfinish = () => {
      div.remove();
    };
  }
}

// Utils
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function randomInt(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}
function propertyUnitsStripped(el, property, unit) {
  let cs = window.getComputedStyle(el),
    valueRaw = cs.getPropertyValue(property),
    value = +valueRaw.substr(0, valueRaw.indexOf(unit));

  return value;
}
function calcAngle(x1, y1, x2, y2) {
  let opposite = y2 - y1;
  let adjacent = x2 - x1;
  let angle = Math.atan(opposite / adjacent);

  if (adjacent < 0)
    angle += Math.PI;

  if (isNaN(angle))
    angle = 0;

  return angle;
}
function pxToEm(px) {
  let el = document.querySelector(":root");
  return px / propertyUnitsStripped(el, "font-size", "px");
}
function ballRectangleCollision(ball, rectangleRect) {
  // Ref: https://stackoverflow.com/a/21096179/11726100
  var rr = rectangleRect;  // rectangle rect

  // Find vert & hori distances between circle center and rect center
  var distX = Math.abs(ball.x - (rr.x + rr.width / 2));
  var distY = Math.abs(ball.y - (rr.y + rr.height / 2));

  // If the distance is greater than halfCircle + halfRect, then they are too far apart to be colliding
  if (distX > (rr.width / 2 + ball.r)) { return false; }
  if (distY > (rr.height / 2 + ball.r)) { return false; }

  // If the distance is less than halfRect then they are definitely colliding
  if (distX <= (rr.width / 2)) { return true; }
  if (distY <= (rr.height / 2)) { return true; }

  // If a corner of the rectangle is hit
  var dx = distX - rr.width / 2;
  var dy = distY - rr.height / 2;
  return (dx * dx + dy * dy <= (ball.r * ball.r));
}
function sampleArray(arr, n) {
  var result = new Array(n),
    len = arr.length,
    taken = new Array(len);
  if (n > len)
    throw new RangeError("sampleArray: more elements taken than available");
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}
function elementIsVisible(el) {
  // Ref: https://stackoverflow.com/a/41698614/11726100
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  if (style.display == 'none' || style.visibility != 'visible' || style.opacity < 0.1 ||
    el.offsetWidth + el.offsetHeight + rect.height + rect.width == 0) {
    return false;
  }
  const elemCenter = {
    x: rect.left + el.offsetWidth / 2,
    y: rect.top + el.offsetHeight / 2
  };
  if (isNaN(elemCenter.x) || isNaN(elemCenter.y)) {
    return false;
  }
  if (elemCenter.x < 0 || elemCenter.y < 0) {
    return false;
  }
  if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) {
    return false;
  }
  if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) {
    return false;
  }

  var pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
  do {
    if (pointContainer === el) {
      return true;
    }
  } while (pointContainer = pointContainer.parentNode);
  return false;
}
function angleReflect(incidenceAngle, surfaceAngle) {
  var a = surfaceAngle * 2 - incidenceAngle;
  return a >= 360 ? a - 360 : a < 0 ? a + 360 : a;
}
function normalizeAngle(angle) {
  angle = angle % 360;
  angle = (angle + 360) % 360;
  return angle;
}
function getAbsRect(el) {
  // Returns the BoundingClientRect of el, but with absolute coordinates. Ref: https://stackoverflow.com/a/46155596/11726100
  var rect = el.getBoundingClientRect();

  // Add window scroll position to get the offset position
  var left = rect.left + window.scrollX;
  var top = rect.top + window.scrollY;
  var right = rect.right + window.scrollX;
  var bottom = rect.bottom + window.scrollY;

  // Polyfill missing 'x' and 'y' rect properties not returned from getBoundingClientRect() by older browsers
  if (rect.x === undefined) { var x = left; }
  else { var x = rect.x + window.scrollX; }

  if (rect.y === undefined) { var y = top; }
  else { var y = rect.y + window.scrollY; }

  // Width and height are the same
  var width = rect.width;
  var height = rect.height;

  return { left, top, right, bottom, x, y, width, height };
};
function loadConfig() {
  chrome.storage.sync.get(null, (data) => {
    if (data.maxBricks != null) {
      maxBricks = data.maxBricks;
    } else {
      maxBricks = 30;
    }

    if (data.lives != null) {
      maxLives = data.lives;
    } else {
      maxLives = 3;
    }

    if (data.showExplosion != null) {
      showExplosion = data.showExplosion;
    } else {
      showExplosion = true;
    }

    if (data.ballColor != null) {
      ballColor = data.ballColor;
    } else {
      ballColor = "#ff0000";
    }

    if (data.platformColor != null) {
      platformColor = data.platformColor;
    } else {
      platformColor = "#000000";
    }
  });
}
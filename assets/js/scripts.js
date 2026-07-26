/* ==========================================================================
   Jesse Do — site scripts
   Sections: reveal-on-scroll, sticky topbar, three.js dog random-walk lab,
             canvas histogram analyzer for distributions of random walks.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     REVEAL ON SCROLL
     ------------------------------------------------------------------ */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     STICKY TOPBAR SHADOW
     ------------------------------------------------------------------ */
  function initTopbar() {
    var topbar = document.getElementById("topbar");
    if (!topbar) return;
    function onScroll() {
      if (window.scrollY > 12) topbar.classList.add("is-scrolled");
      else topbar.classList.remove("is-scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------
     FOOTER YEAR
     ------------------------------------------------------------------ */
  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------
     THREE.JS RANDOM-WALK DOG LAB
     ------------------------------------------------------------------ */
  function initDogLab() {
    var container = document.getElementById("dog-canvas");
    var toggleBtn = document.getElementById("walk-toggle");
    var stepsEl = document.getElementById("sim-steps");
    var distEl = document.getElementById("sim-distance");
    if (!container) return;

    if (typeof THREE === "undefined") {
      var section = container.closest(".simulator");
      if (section) section.classList.add("no-webgl");
      if (toggleBtn) toggleBtn.disabled = true;
      return;
    }

    var width = container.clientWidth || 600;
    var height = container.clientHeight || (width * 10 / 16);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6e2c0);
    scene.fog = new THREE.Fog(0xf6e2c0, 14, 30);

    var camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 6.2, 11);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lighting
    var hemi = new THREE.HemisphereLight(0xfff3df, 0x8a5a2f, 0.95);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffe8c2, 0.9);
    sun.position.set(6, 10, 4);
    scene.add(sun);

    // Ground
    var groundGeo = new THREE.CircleGeometry(11, 48);
    var groundMat = new THREE.MeshStandardMaterial({ color: 0xcf9a5f, roughness: 1 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Start marker
    var ringGeo = new THREE.RingGeometry(0.3, 0.4, 32);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x2f6f6b, side: THREE.DoubleSide });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    // Build simple low-poly dog
    function buildDog() {
      var group = new THREE.Group();
      var furMat = new THREE.MeshStandardMaterial({ color: 0xb5541a, roughness: 0.8 });
      var darkMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.6 });

      var body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.7), furMat);
      body.position.y = 0.6;
      group.add(body);

      var head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), furMat);
      head.position.set(0.95, 0.75, 0);
      group.add(head);

      var snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, 0.32), furMat);
      snout.position.set(1.28, 0.62, 0);
      group.add(snout);

      var nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.34), darkMat);
      nose.position.set(1.46, 0.62, 0);
      group.add(nose);

      var earGeo = new THREE.ConeGeometry(0.16, 0.32, 4);
      var earL = new THREE.Mesh(earGeo, darkMat);
      earL.position.set(0.8, 1.05, 0.18);
      earL.rotation.z = -0.3;
      group.add(earL);
      var earR = earL.clone();
      earR.position.z = -0.18;
      group.add(earR);

      var legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8);
      var legPositions = [
        [0.55, 0.28, 0.25], [0.55, 0.28, -0.25],
        [-0.55, 0.28, 0.25], [-0.55, 0.28, -0.25]
      ];
      legPositions.forEach(function (p) {
        var leg = new THREE.Mesh(legGeo, darkMat);
        leg.position.set(p[0], p[1], p[2]);
        group.add(leg);
      });

      var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.7, 6), furMat);
      tail.position.set(-0.95, 0.85, 0);
      tail.rotation.z = Math.PI / 2.6;
      group.add(tail);

      return group;
    }

    var dog = buildDog();
    scene.add(dog);

    var current = new THREE.Vector3(0, 0, 0);
    var target = new THREE.Vector3(0, 0, 0);
    var facing = 0;
    var walking = false;
    var stepCount = 0;
    var maxRadius = 9;
    var trailPoints = [];
    var maxTrail = 160;
    var trailLine = null;
    var trailMat = new THREE.LineBasicMaterial({ color: 0x2f6f6b, transparent: true, opacity: 0.75 });

    function pickNewTarget(from) {
      var angle = Math.random() * Math.PI * 2;
      var stepLen = 0.9 + Math.random() * 2.2;
      var nx = from.x + Math.cos(angle) * stepLen;
      var nz = from.z + Math.sin(angle) * stepLen;
      var dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > maxRadius) {
        nx *= maxRadius / dist;
        nz *= maxRadius / dist;
      }
      return new THREE.Vector3(nx, 0, nz);
    }

    function updateTrail() {
      if (trailLine) scene.remove(trailLine);
      if (trailPoints.length < 2) return;
      var geo = new THREE.BufferGeometry().setFromPoints(trailPoints);
      trailLine = new THREE.Line(geo, trailMat);
      trailLine.position.y = 0.03;
      scene.add(trailLine);
    }

    target = pickNewTarget(current);
    trailPoints.push(current.clone());

    function setWalking(state) {
      walking = state;
      if (toggleBtn) {
        toggleBtn.textContent = walking ? "Call the dog back" : "Send the dog wandering";
      }
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        setWalking(!walking);
      });
    }

    var clock = new THREE.Clock();
    var speed = 1.6; // units per second

    function animate() {
      requestAnimationFrame(animate);
      var delta = Math.min(clock.getDelta(), 0.05);
      var elapsed = clock.elapsedTime;

      if (walking) {
        var toTarget = new THREE.Vector3().subVectors(target, current);
        var dist = toTarget.length();

        if (dist > 0.05) {
          toTarget.normalize().multiplyScalar(speed * delta);
          if (toTarget.length() > dist) toTarget.multiplyScalar(dist / toTarget.length());
          current.add(toTarget);

          var desiredFacing = Math.atan2(toTarget.x, toTarget.z);
          var diff = desiredFacing - facing;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          facing += diff * Math.min(1, delta * 8);
        } else {
          stepCount++;
          trailPoints.push(current.clone());
          if (trailPoints.length > maxTrail) trailPoints.shift();
          updateTrail();
          target = pickNewTarget(current);
          if (stepsEl) stepsEl.textContent = String(stepCount);
          if (distEl) distEl.textContent = current.length().toFixed(1);
        }
      }

      dog.position.set(current.x, 0, current.z);
      dog.rotation.y = facing;

      if (!prefersReducedMotion) {
        camera.position.x = Math.sin(elapsed * 0.06) * 11.5;
        camera.position.z = Math.cos(elapsed * 0.06) * 11.5;
        camera.position.y = 6.2;
        camera.lookAt(0, 0.4, 0);
      }

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener("resize", function () {
      var w = container.clientWidth;
      var h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  /* ------------------------------------------------------------------
     CANVAS HISTOGRAM — distribution of random walk endpoints, sped up
     ------------------------------------------------------------------ */
  function initAnalyzer() {
    var canvas = document.getElementById("histogram-canvas");
    var runBtn = document.getElementById("run-sim-btn");
    var statsEl = document.getElementById("sim-stats");
    if (!canvas || !runBtn) return;

    var ctx = canvas.getContext("2d");
    var TOTAL_SIMS = 3000;
    var STEPS_PER_WALK = 60;
    var BIN_COUNT = 26;
    var MAX_DIST = Math.sqrt(STEPS_PER_WALK) * 3.4;
    var bins = new Array(BIN_COUNT).fill(0);
    var completed = 0;
    var running = false;
    var sumDist = 0;
    var sumSq = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
      var rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      draw();
    }

    function randomWalkFinalDistance(steps) {
      var x = 0, y = 0;
      for (var i = 0; i < steps; i++) {
        var angle = Math.random() * Math.PI * 2;
        x += Math.cos(angle);
        y += Math.sin(angle);
      }
      return Math.sqrt(x * x + y * y);
    }

    function draw() {
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      var padLeft = 0.04 * w;
      var padBottom = 0.10 * h;
      var padTop = 0.08 * h;
      var chartW = w - padLeft * 1.5;
      var chartH = h - padBottom - padTop;

      // baseline
      ctx.strokeStyle = "rgba(34,26,18,0.25)";
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(padLeft, h - padBottom);
      ctx.lineTo(w - padLeft * 0.5, h - padBottom);
      ctx.stroke();

      var maxBin = Math.max.apply(null, bins.concat([1]));
      var barGap = chartW / BIN_COUNT * 0.18;
      var barWidth = chartW / BIN_COUNT - barGap;

      for (var i = 0; i < BIN_COUNT; i++) {
        var count = bins[i];
        var barH = (count / maxBin) * chartH;
        var x = padLeft + i * (chartW / BIN_COUNT) + barGap / 2;
        var y = h - padBottom - barH;
        ctx.fillStyle = "#2f6f6b";
        ctx.fillRect(x, y, barWidth, barH);
      }

      // mean marker
      if (completed > 0) {
        var mean = sumDist / completed;
        var meanX = padLeft + (mean / MAX_DIST) * chartW;
        ctx.strokeStyle = "#b5541a";
        ctx.lineWidth = Math.max(2, 2 * dpr);
        ctx.beginPath();
        ctx.moveTo(meanX, padTop * 0.4);
        ctx.lineTo(meanX, h - padBottom);
        ctx.stroke();
      }
    }

    function updateProgress() {
      if (statsEl) {
        statsEl.textContent = "Simulating… " + completed.toLocaleString() + " of " +
          TOTAL_SIMS.toLocaleString() + " random walks complete.";
      }
    }

    function finalizeStats() {
      var mean = sumDist / TOTAL_SIMS;
      var variance = Math.max(0, sumSq / TOTAL_SIMS - mean * mean);
      var stdev = Math.sqrt(variance);
      var theory = Math.sqrt(STEPS_PER_WALK);
      if (statsEl) {
        statsEl.textContent = TOTAL_SIMS.toLocaleString() + " independent walks of " +
          STEPS_PER_WALK + " steps each. Mean distance from start: " + mean.toFixed(2) +
          " units (orange line). Standard deviation: " + stdev.toFixed(2) +
          ". Theory predicts a mean near \u221AN \u2248 " + theory.toFixed(2) + " — close enough for a dog.";
      }
    }

    function runBatch() {
      var batchSize = 60;
      for (var i = 0; i < batchSize && completed < TOTAL_SIMS; i++) {
        var d = randomWalkFinalDistance(STEPS_PER_WALK);
        var binIndex = Math.min(BIN_COUNT - 1, Math.floor((d / MAX_DIST) * BIN_COUNT));
        bins[binIndex]++;
        sumDist += d;
        sumSq += d * d;
        completed++;
      }
      draw();
      updateProgress();
      if (completed < TOTAL_SIMS) {
        requestAnimationFrame(runBatch);
      } else {
        finalizeStats();
        running = false;
        runBtn.disabled = false;
        runBtn.textContent = "Run again";
      }
    }

    runBtn.addEventListener("click", function () {
      if (running) return;
      running = true;
      bins = new Array(BIN_COUNT).fill(0);
      completed = 0;
      sumDist = 0;
      sumSq = 0;
      runBtn.disabled = true;
      runBtn.textContent = "Simulating…";
      requestAnimationFrame(runBatch);
    });

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initTopbar();
    initYear();
    initDogLab();
    initAnalyzer();
  });
})();
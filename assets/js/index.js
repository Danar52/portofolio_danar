// ── Typewriter ──
    const words = ['One', 'Developer', 'Engineer', 'Technologist'];
    const el    = document.getElementById('typewriter');
    let wIdx = 0, cIdx = 0, deleting = false;
    function type() {
      const word = words[wIdx];
      if (!deleting) {
        el.textContent = word.slice(0, ++cIdx);
        if (cIdx === word.length) { deleting = true; setTimeout(type, 1800); return; }
      } else {
        el.textContent = word.slice(0, --cIdx);
        if (cIdx === 0) { deleting = false; wIdx = (wIdx + 1) % words.length; }
      }
      setTimeout(type, deleting ? 65 : 105);
    }
    setTimeout(type, 900);

    // ── Chibi Animation ──
    const CHIBI_POSES   = ['./assets/chibi_1.png','./assets/chibi_2.png','./assets/chibi_3.png', './assets/chibi_4.png'];
    const IDLE_DURATION = 4000;
    const EXIT_DUR      = 480;
    const ENTER_DUR     = 700;
    const LAND_DUR      = 500;

    const imgA   = document.getElementById('chibiImgA');
    const imgB   = document.getElementById('chibiImgB');
    const shadow = document.getElementById('chibiShadow');

    let poseIdx = 0, activeImg = imgA, inactiveImg = imgB, isTransitioning = false;

    CHIBI_POSES.forEach((src, i) => { if (i > 0) { const img = new Image(); img.src = src; } });

    const ALL_STATES = ['state-enter','state-entering','state-idle','state-exit','state-landing'];
    function setState(imgEl, state) {
      imgEl.classList.remove(...ALL_STATES);
      if (state) imgEl.classList.add(state);
    }

    function initFirstPose() {
      setState(activeImg, 'state-enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setState(activeImg, 'state-entering');
          shadow.style.opacity = '1';
          setTimeout(() => {
            setState(activeImg, 'state-landing');
            shadow.style.transform = 'scaleX(1.15)';
            setTimeout(() => { shadow.style.transform = ''; }, LAND_DUR);
            setTimeout(() => { setState(activeImg, 'state-idle'); scheduleNext(); }, LAND_DUR);
          }, ENTER_DUR);
        });
      });
    }

    function doTransition() {
      if (isTransitioning) return;
      isTransitioning = true;
      const nextIdx = (poseIdx + 1) % CHIBI_POSES.length;
      inactiveImg.src = CHIBI_POSES[nextIdx];
      setState(inactiveImg, 'state-enter');
      setState(activeImg, 'state-exit');
      shadow.style.opacity = '0.3';
      shadow.style.transform = 'scaleX(0.85)';
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setState(inactiveImg, 'state-entering');
            shadow.style.opacity = '1';
            setTimeout(() => {
              setState(inactiveImg, 'state-landing');
              shadow.style.transform = 'scaleX(1.15)';
              setTimeout(() => { shadow.style.transform = ''; }, LAND_DUR);
              setTimeout(() => {
                setState(inactiveImg, 'state-idle');
                setState(activeImg, '');
                [activeImg, inactiveImg] = [inactiveImg, activeImg];
                poseIdx = nextIdx;
                isTransitioning = false;
                scheduleNext();
              }, LAND_DUR);
            }, ENTER_DUR);
          });
        });
      }, EXIT_DUR);
    }

    function scheduleNext() { setTimeout(doTransition, IDLE_DURATION); }
    initFirstPose();

(function() {
    const hamburger = document.getElementById('hamburger');
    const sidebar   = document.getElementById('sidebar');
    const backdrop  = document.getElementById('nav-backdrop');
    if (!hamburger || !sidebar || !backdrop) return;

    function openMenu() {
      sidebar.classList.add('open');
      backdrop.classList.add('visible');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('visible');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeMenu() : openMenu();
    });

    backdrop.addEventListener('click', closeMenu);

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });
  })();
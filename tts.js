// tts.js — HotGato Read Aloud (Web Speech API)
// Reuses splitIntoSentences() from core.js.
// Works alongside the RSVP reader without conflict.
//
// Cross-browser behaviour:
//   • Edge/Chrome:  speechSynthesis.pause()/resume() work natively.
//                   Chrome silently drops synthesis after ~15 s; watchdog re-kicks it.
//   • Firefox:      pause()/resume() are unreliable. Pause is implemented in
//                   software: cancel(), save sentenceIndex, restart on resume.
//                   Firefox also has a ~5 s silent-stop bug; watchdog catches it.
//
//   Settings (speed, pause factor) are read fresh on every new utterance, so
//   pressing Pause → adjust slider → Resume will use the new values on Firefox.
//   On Edge/Chrome the new rate takes effect from the next sentence after resume.

const TTS = (() => {

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let ttsActive     = false;  // True while playing OR natively paused OR sw-paused
  let ttsPaused     = false;  // True while paused (either native or software)
  let ttsAborted    = false;  // Latched true during stop/cancel to silence callbacks
  let swPause       = false;  // True when using software-pause path (Firefox)

  let sentenceList  = [];     // string[] — rebuilt on each fresh play
  let sentenceIndex = 0;      // Index of the sentence currently being spoken

  let readAloudBtn  = null;
  let resetBtn      = null;
  let watchdog      = null;

  // ---------------------------------------------------------------------------
  // Browser detection — only used to choose pause strategy
  // ---------------------------------------------------------------------------

  const isFirefox = typeof navigator !== 'undefined' &&
                    navigator.userAgent.toLowerCase().includes('firefox');

  // ---------------------------------------------------------------------------
  // Live settings — read from DOM every time so sliders are always current
  // ---------------------------------------------------------------------------

  function currentWpm() {
    return parseInt((document.getElementById('speedSelector') || {}).value, 10) || 300;
  }

  function currentPauseFactor() {
    return parseFloat((document.getElementById('pauseSpeedSelector') || {}).value) || 3;
  }

  function wpmToRate(wpm) {
    // 150 WPM ≈ natural speech = rate 1.0; clamp to valid [0.1, 10]
    return Math.min(10, Math.max(0.1, wpm / 150));
  }

  function pauseMsForText(text, wpm, pauseFactor) {
    // Mirror core.js specialCharacterRegex pause logic
    const re = /(\d+(\.\d+)?|[.,!?'"`\n]|https?:\/\/[^\s]+|\s{2,})/g;
    return re.test(text) ? (60000 / wpm) * pauseFactor : 0;
  }

  // ---------------------------------------------------------------------------
  // Sentence list
  // ---------------------------------------------------------------------------

  function buildSentenceList() {
    const raw = (document.getElementById('textInput') || {}).value || '';
    const text = raw.trim();
    if (!text) return [];
    return splitIntoSentences(text).map(s => s.trim()).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Watchdog — fires every 12 s to catch silent-stop bugs in Firefox & Chrome
  // ---------------------------------------------------------------------------

  function startWatchdog() {
    stopWatchdog();
    watchdog = setInterval(() => {
      if (!ttsActive || ttsPaused || ttsAborted) return;
      const ss = window.speechSynthesis;
      if (!ss.speaking && !ss.pending) {
        console.log('TTS watchdog: stall detected at sentence', sentenceIndex, '— restarting');
        speakSentence(sentenceIndex);
      }
    }, 12000);
  }

  function stopWatchdog() {
    if (watchdog !== null) { clearInterval(watchdog); watchdog = null; }
  }

  // ---------------------------------------------------------------------------
  // Core speak primitive — settings read fresh every call
  // ---------------------------------------------------------------------------

  function speakSentence(index) {
    if (ttsAborted || index >= sentenceList.length) {
      if (!ttsAborted) onTTSEnd();
      return;
    }

    sentenceIndex = index;

    const wpm         = currentWpm();
    const pauseFactor = currentPauseFactor();
    const rate        = wpmToRate(wpm);
    const text        = sentenceList[index];

    const u = new SpeechSynthesisUtterance(text);
    u.rate  = rate;
    u.lang  = 'en-US';

    u.onstart = () => {
      console.log('TTS playing — sentence', index, '/', sentenceList.length - 1,
                  '| rate', rate.toFixed(2), '| wpm', wpm);
    };

    u.onend = () => {
      if (ttsAborted || ttsPaused) return;
      const extraMs = pauseMsForText(text, wpm, pauseFactor);
      if (extraMs > 0) {
        setTimeout(() => {
          if (!ttsAborted && !ttsPaused) speakSentence(index + 1);
        }, extraMs);
      } else {
        speakSentence(index + 1);
      }
    };

    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('TTS utterance error:', e.error, '— skipping to next sentence');
      if (!ttsAborted && !ttsPaused) speakSentence(index + 1);
    };

    window.speechSynthesis.speak(u);
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  function start(fromIndex) {
    ttsAborted    = false;
    ttsPaused     = false;
    swPause       = false;
    ttsActive     = true;
    sentenceIndex = fromIndex || 0;

    const wpm         = currentWpm();
    const pauseFactor = currentPauseFactor();
    console.log('TTS play — from sentence', sentenceIndex,
                '| wpm', wpm, '| pause factor', pauseFactor,
                '| rate', wpmToRate(wpm).toFixed(2));

    setButtonState('playing');
    startWatchdog();

    // Cancel any stale synthesis before enqueueing (Edge can get stuck otherwise)
    window.speechSynthesis.cancel();
    setTimeout(() => {
      if (!ttsAborted) speakSentence(sentenceIndex);
    }, 50);
  }

  function pause() {
    if (!ttsActive || ttsPaused) return;

    ttsPaused = true;
    stopWatchdog();
    setButtonState('paused');

    if (isFirefox) {
      // Software pause: latch ttsAborted so onend callbacks stop advancing the queue,
      // cancel the current utterance, then immediately un-latch ttsAborted so that
      // resume() can call speakSentence() without interference.
      swPause    = true;
      ttsAborted = true;
      window.speechSynthesis.cancel();
      // Un-latch after cancel has had time to flush (Firefox needs a small gap)
      setTimeout(() => { ttsAborted = false; }, 150);
      console.log('TTS paused (software) at sentence', sentenceIndex);
    } else {
      // Native pause — Edge/Chrome
      swPause = false;
      window.speechSynthesis.pause();
      console.log('TTS paused (native) at sentence', sentenceIndex);
    }
  }

  function resume() {
    if (!ttsActive || !ttsPaused) return;

    const wpm         = currentWpm();
    const pauseFactor = currentPauseFactor();
    console.log('TTS resume — from sentence', sentenceIndex,
                '| wpm', wpm, '| pause factor', pauseFactor,
                '| rate', wpmToRate(wpm).toFixed(2));

    ttsPaused  = false;
    ttsAborted = false;
    setButtonState('playing');
    startWatchdog();

    if (swPause) {
      // Firefox software-pause path: restart from saved sentence
      swPause = false;
      speakSentence(sentenceIndex);
    } else {
      // Native resume — Edge/Chrome
      window.speechSynthesis.resume();
    }
  }

  function stop() {
    console.log('TTS stop.');
    ttsAborted    = true;
    ttsActive     = false;
    ttsPaused     = false;
    swPause       = false;
    sentenceIndex = 0;
    stopWatchdog();
    window.speechSynthesis.cancel();
    resetButtonState();
  }

  function reset() {
    console.log('TTS reset — clearing position and sentence list.');
    stop();
    sentenceList  = [];
    sentenceIndex = 0;
  }

  function onTTSEnd() {
    console.log('TTS finished — reached end of text.');
    ttsActive     = false;
    ttsPaused     = false;
    swPause       = false;
    sentenceIndex = 0;
    sentenceList  = [];
    stopWatchdog();
    resetButtonState();
  }

  // ---------------------------------------------------------------------------
  // Button labels
  // ---------------------------------------------------------------------------

  function setButtonState(state) {
    if (!readAloudBtn) return;
    if (state === 'playing') { readAloudBtn.textContent = '⏸ Pause Reading';  return; }
    if (state === 'paused')  { readAloudBtn.textContent = '▶ Resume Reading'; return; }
    resetButtonState();
  }

  function resetButtonState() {
    if (readAloudBtn) readAloudBtn.textContent = '🔊 Read Aloud (beta)';
  }

  // ---------------------------------------------------------------------------
  // Button click handlers
  // ---------------------------------------------------------------------------

  function handleReadAloudClick() {
    if (!window.speechSynthesis) {
      alert('Sorry, your browser does not support text-to-speech.');
      return;
    }

    if (!ttsActive) {
      // Fresh start — always rebuild sentence list to pick up any text/setting changes
      sentenceList  = buildSentenceList();
      sentenceIndex = 0;
      start(0);
    } else if (!ttsPaused) {
      pause();
    } else {
      resume();
    }
  }

  function handleResetClick() {
    console.log('TTS reset button clicked.');
    reset();
  }

  // ---------------------------------------------------------------------------
  // Mutual exclusion with the RSVP reader
  // ---------------------------------------------------------------------------

  function patchStartPauseButton() {
    const btn = document.getElementById('startPause');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (ttsActive) {
        console.log('TTS: RSVP reader started — stopping TTS.');
        stop();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    readAloudBtn = document.getElementById('readAloud');
    resetBtn     = document.getElementById('reset');

    if (!readAloudBtn) {
      console.warn('TTS: #readAloud button not found in DOM.');
      return;
    }

    if (!window.speechSynthesis) {
      readAloudBtn.textContent = '🔇 TTS unavailable';
      readAloudBtn.disabled    = true;
      if (resetBtn) resetBtn.disabled = true;
      return;
    }

    console.log('TTS: init — browser is', isFirefox ? 'Firefox (software pause)' : 'non-Firefox (native pause)');

    readAloudBtn.addEventListener('click', handleReadAloudClick);

    if (resetBtn) {
      resetBtn.addEventListener('click', handleResetClick);
      console.log('TTS: #reset button found and wired.');
    } else {
      console.warn('TTS: #reset button not found in DOM — add <button id="reset"> to HTML.');
    }

    patchStartPauseButton();

    // Stop TTS when user edits the textarea (sentence list would be stale)
    const textInputEl = document.getElementById('textInput');
    if (textInputEl) {
      textInputEl.addEventListener('input', () => {
        if (ttsActive) {
          console.log('TTS: text changed — stopping.');
          stop();
        }
      });
    }

    // Prime the voice list (async on Safari iOS / some Android)
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    window.speechSynthesis.getVoices();

    console.log('TTS: ready.');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return { init, stop, reset };

})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TTS.init);
} else {
  TTS.init();
}
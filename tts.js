// tts.js — HotGato Read Aloud (Web Speech API)
// Mirrors core.js state and reuses splitIntoSentences() / getChunksFromSentences().
// Designed to work alongside the existing Start/Pause reader without conflict.

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const TTS = (() => {
  let ttsActive    = false;   // True while TTS is playing or paused
  let ttsPaused    = false;   // True while paused (not cancelled)
  let ttsAborted   = false;   // Set to true on explicit stop so end-callbacks bail

  // Queue of SpeechSynthesisUtterance objects built from the full text
  let utteranceQueue  = [];
  let currentUtterance = null;
  let queueIndex      = 0;

  // Keep track of the button element
  let readAloudBtn = null;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Map HotGato WPM (100–1000+) to SpeechSynthesisUtterance.rate (0.1–10).
   * Normal conversational speech is ~150 WPM → rate 1.0.
   * We clamp the result to the valid [0.1, 10] range.
   */
  function wpmToRate(wpm) {
    const rate = wpm / 150;
    return Math.min(10, Math.max(0.1, rate));
  }

  /**
   * Build an extra pause (in ms) for sentence-ending punctuation, mirroring
   * the pauseSpeedSelector logic in core.js.
   * core.js formula: 60000 / wpm * pauseFactor
   */
  function getPauseMsForText(text, wpm, pauseFactor) {
    const specialCharacterRegex = /(\d+(\.\d+)?|[.,!?'"`\n]|https?:\/\/[^\s]+|\s{2,})/g;
    if (specialCharacterRegex.test(text)) {
      return (60000 / wpm) * pauseFactor;
    }
    return 0;
  }

  /**
   * Build the full utterance queue from textInput.
   * Each sentence becomes one utterance so we get natural phrasing.
   * An extra silent utterance is inserted after sentences that end with
   * sentence-final punctuation to honour pauseSpeedSelector.
   */
  function buildQueue() {
    const text      = document.getElementById('textInput').value.trim();
    const wpm       = parseInt(document.getElementById('speedSelector').value, 10)       || 300;
    const pauseFactor = parseFloat(document.getElementById('pauseSpeedSelector').value)  || 3;
    const rate      = wpmToRate(wpm);

    if (!text) return [];

    // Reuse core.js helpers so punctuation logic stays in sync
    const sentences = splitIntoSentences(text);
    const queue     = [];

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      const u    = new SpeechSynthesisUtterance(trimmed);
      u.rate     = rate;
      u.lang     = 'en-US';   // Can be made configurable in the future
      queue.push(u);

      // Insert a brief silent pause utterance after sentence-ending punctuation
      const pauseMs = getPauseMsForText(trimmed, wpm, pauseFactor);
      if (pauseMs > 0) {
        // Minimum audible gap; the Speech API won't honour a zero-length utterance
        const pauseSec = Math.max(0.05, pauseMs / 1000);
        const pause    = new SpeechSynthesisUtterance(' ');
        pause.rate     = 10;      // Rush through the space
        pause.volume   = 0;       // Silent
        pause._isPause = true;    // Tag so we can skip logging
        queue.push(pause);
      }
    });

    return queue;
  }

  // ---------------------------------------------------------------------------
  // Playback control
  // ---------------------------------------------------------------------------

  function speakNext() {
    if (ttsAborted || queueIndex >= utteranceQueue.length) {
      if (!ttsAborted) {
        // Reached the natural end of the queue
        onTTSEnd();
      }
      return;
    }

    currentUtterance = utteranceQueue[queueIndex];
    queueIndex++;

    currentUtterance.onend = () => {
      if (!ttsAborted) speakNext();
    };

    currentUtterance.onerror = (e) => {
      // 'interrupted' fires on Chrome when we call cancel() ourselves — ignore it
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('TTS utterance error:', e.error);
      if (!ttsAborted) speakNext();  // Try to continue on non-fatal errors
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  /**
   * Chrome has a known bug where SpeechSynthesis silently stops after ~15 s.
   * We keep a watchdog timer that calls resume() periodically to prevent it.
   */
  let chromeBugWorkaround = null;

  function startChromeBugWorkaround() {
    stopChromeBugWorkaround();
    chromeBugWorkaround = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  function stopChromeBugWorkaround() {
    if (chromeBugWorkaround !== null) {
      clearInterval(chromeBugWorkaround);
      chromeBugWorkaround = null;
    }
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  function start() {
    if (ttsActive && ttsPaused) {
      resume();
      return;
    }

    ttsAborted      = false;
    ttsPaused       = false;
    ttsActive       = true;
    utteranceQueue  = buildQueue();
    queueIndex      = 0;

    if (utteranceQueue.length === 0) {
      console.warn('TTS: no text to read.');
      resetButtonState();
      return;
    }

    setButtonState('stop');
    startChromeBugWorkaround();
    speakNext();
  }

  function pause() {
    if (!ttsActive || ttsPaused) return;
    ttsPaused = true;
    stopChromeBugWorkaround();
    window.speechSynthesis.pause();
    setButtonState('resume');
  }

  function resume() {
    if (!ttsActive || !ttsPaused) return;
    ttsPaused = false;
    startChromeBugWorkaround();
    window.speechSynthesis.resume();
    setButtonState('stop');
  }

  function stop() {
    ttsAborted = true;
    ttsActive  = false;
    ttsPaused  = false;
    stopChromeBugWorkaround();
    window.speechSynthesis.cancel();
    utteranceQueue   = [];
    currentUtterance = null;
    queueIndex       = 0;
    resetButtonState();
  }

  function onTTSEnd() {
    ttsActive  = false;
    ttsPaused  = false;
    stopChromeBugWorkaround();
    utteranceQueue   = [];
    currentUtterance = null;
    queueIndex       = 0;
    resetButtonState();
  }

  // ---------------------------------------------------------------------------
  // Button state helpers
  // ---------------------------------------------------------------------------

  function setButtonState(state) {
    if (!readAloudBtn) return;
    switch (state) {
      case 'stop':   readAloudBtn.textContent = '⏹ Stop Reading';   break;
      case 'resume': readAloudBtn.textContent = '▶ Resume Reading'; break;
      default:       resetButtonState();
    }
  }

  function resetButtonState() {
    if (readAloudBtn) readAloudBtn.textContent = '🔊 Read Aloud (beta)';
  }

  // ---------------------------------------------------------------------------
  // Button click handler — cycles: idle → playing → paused → playing → stop
  // ---------------------------------------------------------------------------

  function handleButtonClick() {
    if (!window.speechSynthesis) {
      alert('Sorry, your browser does not support text-to-speech.');
      return;
    }

    if (!ttsActive) {
      // Idle → start
      start();
    } else if (!ttsPaused) {
      // Playing → pause
      pause();
    } else {
      // Paused → resume
      resume();
    }
  }

  // ---------------------------------------------------------------------------
  // Stop TTS automatically if the main reader starts, and vice-versa
  // ---------------------------------------------------------------------------

  /**
   * Patch the existing startPauseButton so TTS is cancelled whenever the
   * RSVP reader starts — keeps the two modes mutually exclusive.
   * Called after DOMContentLoaded so startPauseButton is guaranteed to exist.
   */
  function patchStartPauseButton() {
    const btn = document.getElementById('startPause');
    if (!btn) return;

    btn.addEventListener('click', () => {
      // If the RSVP reader is about to start (button currently shows "Start"),
      // cancel any running TTS.
      if (ttsActive) {
        stop();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    readAloudBtn = document.getElementById('readAloud');
    if (!readAloudBtn) {
      console.warn('TTS: #readAloud button not found.');
      return;
    }

    if (!window.speechSynthesis) {
      readAloudBtn.textContent = '🔇 TTS unavailable';
      readAloudBtn.disabled    = true;
      return;
    }

    readAloudBtn.addEventListener('click', handleButtonClick);
    patchStartPauseButton();

    // Stop TTS if the user loads new text — the queue would be stale
    const textInput = document.getElementById('textInput');
    if (textInput) {
      textInput.addEventListener('input', () => { if (ttsActive) stop(); });
    }

    // Safari iOS: voices load asynchronously. Warm up the list now.
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    console.log('TTS: initialised.');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return { init, stop };
})();

// Boot after the DOM is ready (works whether this script loads before or after DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TTS.init);
} else {
  TTS.init();
}

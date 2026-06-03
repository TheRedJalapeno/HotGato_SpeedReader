// tts.js — HotGato Read Aloud (Web Speech API)
// Mirrors core.js state and reuses splitIntoSentences() / getChunksFromSentences().
// Designed to work alongside the existing Start/Pause RSVP reader without conflict.
//
// Cross-browser notes:
//   • Firefox does not reliably implement speechSynthesis.pause()/resume().
//     "Pause" is therefore implemented in software: we cancel(), save the sentence
//     index, and re-speak from there on resume — also picking up any slider changes.
//   • Firefox also has an undocumented timeout (~5 s) that silently stops synthesis.
//     The watchdog re-queues the current sentence every 4 s to work around this.
//   • Edge/Chrome honour pause()/resume() natively, but Chrome silently drops
//     synthesis after ~15 s. The watchdog handles both browsers with the same path.
//   • Speed / pause-factor changes take effect on the next sentence automatically
//     because settings are read fresh for every new utterance.

const TTS = (() => {

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let ttsActive  = false;   // True while playing or software-paused
  let ttsPaused  = false;   // True while software-paused (not cancelled)
  let ttsAborted = false;   // Set true on explicit stop so async callbacks bail

  // The raw sentence array built once per play/reset.
  // We keep it separate from the utterance objects so we can rebuild
  // utterances at any point with fresh settings without re-splitting the text.
  let sentenceList  = [];   // string[]
  let sentenceIndex = 0;    // next sentence to speak

  let readAloudBtn = null;
  let resetBtn     = null;

  // Watchdog timer handle
  let watchdog = null;

  // ---------------------------------------------------------------------------
  // Settings helpers — always read live so slider changes take effect instantly
  // ---------------------------------------------------------------------------

  function currentWpm() {
    return parseInt(document.getElementById('speedSelector').value, 10) || 300;
  }

  function currentPauseFactor() {
    return parseFloat(document.getElementById('pauseSpeedSelector').value) || 3;
  }

  /** Map WPM → SpeechSynthesisUtterance.rate. 150 WPM = rate 1.0 (natural speed). */
  function wpmToRate(wpm) {
    return Math.min(10, Math.max(0.1, wpm / 150));
  }

  /** Returns extra pause in ms for sentences containing punctuation, matching core.js logic. */
  function pauseMsForText(text, wpm, pauseFactor) {
    const re = /(\d+(\.\d+)?|[.,!?'"`\n]|https?:\/\/[^\s]+|\s{2,})/g;
    return re.test(text) ? (60000 / wpm) * pauseFactor : 0;
  }

  // ---------------------------------------------------------------------------
  // Sentence list — built once from the textarea, reused for the whole session
  // ---------------------------------------------------------------------------

  function buildSentenceList() {
    const text = (document.getElementById('textInput').value || '').trim();
    if (!text) return [];
    // Reuse core.js helper so splitting stays in sync with the RSVP reader
    return splitIntoSentences(text).map(s => s.trim()).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Watchdog
  // A single timer that re-speaks the current sentence if synthesis has
  // unexpectedly stopped (Firefox timeout) or gone silent (Chrome 15 s bug).
  // Interval < Firefox's ~5 s cutoff; we use 4 s.
  // ---------------------------------------------------------------------------

  function startWatchdog() {
    stopWatchdog();
    watchdog = setInterval(() => {
      if (!ttsActive || ttsPaused || ttsAborted) return;

      const ss = window.speechSynthesis;
      if (!ss.speaking && !ss.pending) {
        // Synthesis stopped on its own — re-speak the current sentence
        console.log('TTS watchdog: synthesis stalled, re-speaking sentence', sentenceIndex);
        speakSentence(sentenceIndex);
      }
    }, 4000);
  }

  function stopWatchdog() {
    if (watchdog !== null) {
      clearInterval(watchdog);
      watchdog = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Core speak primitive
  // Speaks sentenceList[index] and wires up onend/onerror to advance the queue.
  // Settings are read fresh here, so speed/pause changes take effect immediately.
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

    const u  = new SpeechSynthesisUtterance(text);
    u.rate   = rate;
    u.lang   = 'en-US';

    u.onstart = () => {
      console.log(`TTS [${index}/${sentenceList.length - 1}] rate=${rate.toFixed(2)}:`, text);
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
      // 'interrupted' / 'canceled' fire when we call cancel() ourselves — ignore
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('TTS utterance error:', e.error, '— skipping sentence', index);
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
    ttsActive     = true;
    sentenceIndex = fromIndex || 0;

    if (sentenceList.length === 0) {
      sentenceList = buildSentenceList();
    }

    if (sentenceList.length === 0) {
      console.warn('TTS: no text to read.');
      resetButtonState();
      ttsActive = false;
      return;
    }

    setButtonState('playing');
    startWatchdog();

    // Ensure synthesis isn't in a stale paused state before we speak
    window.speechSynthesis.cancel();
    // Small delay lets cancel() fully flush before we enqueue a new utterance
    setTimeout(() => {
      if (!ttsAborted) speakSentence(sentenceIndex);
    }, 50);
  }

  /**
   * Software pause: cancel current synthesis, remember position.
   * On resume we rebuild from sentenceIndex with fresh settings.
   */
  function pause() {
    if (!ttsActive || ttsPaused) return;

    ttsPaused  = true;
    ttsAborted = true;   // Stop any pending onend callbacks from advancing the queue
    stopWatchdog();
    window.speechSynthesis.cancel();

    // After cancel() resolves, re-arm ttsAborted=false so resume() can proceed
    // We do NOT set ttsActive=false — that's what distinguishes pause from stop
    setTimeout(() => { ttsAborted = false; }, 100);

    setButtonState('paused');
    console.log('TTS paused at sentence', sentenceIndex);
  }

  /** Resume from saved position, picking up current slider settings. */
  function resume() {
    if (!ttsActive || !ttsPaused) return;

    ttsPaused  = false;
    ttsAborted = false;

    setButtonState('playing');
    startWatchdog();
    speakSentence(sentenceIndex);
    console.log('TTS resumed from sentence', sentenceIndex);
  }

  /** Full stop — clears all state. */
  function stop() {
    ttsAborted = true;
    ttsActive  = false;
    ttsPaused  = false;
    stopWatchdog();
    window.speechSynthesis.cancel();
    sentenceIndex = 0;
    resetButtonState();
  }

  /** Reset: stop, clear sentence list, go back to index 0. */
  function reset() {
    stop();
    sentenceList  = [];
    sentenceIndex = 0;
    console.log('TTS reset.');
  }

  /** Called when the queue plays to its natural end. */
  function onTTSEnd() {
    ttsActive     = false;
    ttsPaused     = false;
    sentenceIndex = 0;
    sentenceList  = [];
    stopWatchdog();
    resetButtonState();
    console.log('TTS finished.');
  }

  // ---------------------------------------------------------------------------
  // Button labels
  // ---------------------------------------------------------------------------

  function setButtonState(state) {
    if (!readAloudBtn) return;
    switch (state) {
      case 'playing': readAloudBtn.textContent = '⏸ Pause Reading';  break;
      case 'paused':  readAloudBtn.textContent = '▶ Resume Reading'; break;
      default:        resetButtonState();
    }
  }

  function resetButtonState() {
    if (readAloudBtn) readAloudBtn.textContent = '🔊 Read Aloud (beta)';
  }

  // ---------------------------------------------------------------------------
  // Main button click handler
  // ---------------------------------------------------------------------------

  function handleReadAloudClick() {
    if (!window.speechSynthesis) {
      alert('Sorry, your browser does not support text-to-speech.');
      return;
    }

    if (!ttsActive) {
      // Cold start — (re)build sentence list so it reflects latest textarea content
      sentenceList  = buildSentenceList();
      sentenceIndex = 0;
      start(0);
    } else if (!ttsPaused) {
      pause();
    } else {
      resume();
    }
  }

  // ---------------------------------------------------------------------------
  // Reset button click handler
  // ---------------------------------------------------------------------------

  function handleResetClick() {
    reset();
  }

  // ---------------------------------------------------------------------------
  // Mutual exclusion with the RSVP reader
  // ---------------------------------------------------------------------------

  function patchStartPauseButton() {
    const btn = document.getElementById('startPause');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (ttsActive) stop();
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    readAloudBtn = document.getElementById('readAloud');
    resetBtn     = document.getElementById('reset');

    if (!readAloudBtn) {
      console.warn('TTS: #readAloud button not found.');
      return;
    }

    if (!window.speechSynthesis) {
      readAloudBtn.textContent = '🔇 TTS unavailable';
      readAloudBtn.disabled    = true;
      if (resetBtn) resetBtn.disabled = true;
      return;
    }

    readAloudBtn.addEventListener('click', handleReadAloudClick);

    if (resetBtn) {
      resetBtn.addEventListener('click', handleResetClick);
    }

    patchStartPauseButton();

    // Stop TTS if the user edits the textarea — sentence list would be stale
    const textInput = document.getElementById('textInput');
    if (textInput) {
      textInput.addEventListener('input', () => { if (ttsActive) stop(); });
    }

    // Warm up the voice list (required for async load on Safari iOS / some Android)
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    window.speechSynthesis.getVoices();

    console.log('TTS: initialised.');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return { init, stop, reset };

})();

// Boot after DOM is ready (safe whether script loads sync or deferred)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TTS.init);
} else {
  TTS.init();
}
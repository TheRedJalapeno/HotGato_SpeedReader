// tts.js — HotGato Read Aloud (Web Speech API)
// Reuses splitIntoSentences() from core.js.
// Works alongside the RSVP reader without conflict.
//
// Architecture: one sentence at a time.
//   Each SpeechSynthesisUtterance covers exactly one sentence. When it ends,
//   onend fires and we speak the next one — no queuing, no watchdog needed.
//   Settings are read fresh per sentence so slider changes take effect immediately.
//
// Pause strategy:
//   Edge/Chrome: native speechSynthesis.pause() / resume() work correctly.
//   Firefox:     pause()/resume() are broken; we use software-pause instead:
//                cancel() the current utterance, save sentenceIndex, restart on resume.

const TTS = (() => {

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let ttsActive  = false;  // True while playing OR paused
  let ttsPaused  = false;  // True while paused
  let ttsAborted = false;  // Latched true on stop/cancel to silence async callbacks
  let swPause    = false;  // True when Firefox software-pause is in effect

  let sentenceList  = [];  // string[] — built once per fresh play
  let sentenceIndex = 0;   // Index of the sentence currently being (or about to be) spoken

  let readAloudBtn = null;
  let resetBtn     = null;

  // ---------------------------------------------------------------------------
  // Browser detection — only used to select pause strategy
  // ---------------------------------------------------------------------------

  const isFirefox = typeof navigator !== 'undefined' &&
                    /firefox/i.test(navigator.userAgent);

  // ---------------------------------------------------------------------------
  // Live settings — always read from DOM so sliders are instantly current
  // ---------------------------------------------------------------------------

  function currentWpm() {
    return parseInt((document.getElementById('speedSelector') || {}).value, 10) || 300;
  }

  function currentPauseFactor() {
    return parseFloat((document.getElementById('pauseSpeedSelector') || {}).value) || 3;
  }

  function wpmToRate(wpm) {
    // 150 WPM ≈ natural conversational speed = rate 1.0. Clamp to [0.1, 10].
    return Math.min(10, Math.max(0.1, wpm / 150));
  }

  function pauseMsForText(text, wpm, pauseFactor) {
    // Mirror core.js specialCharacterRegex: add a pause after punctuation / numbers
    const re = /(\d+(\.\d+)?|[.,!?'"`\n]|https?:\/\/[^\s]+|\s{2,})/g;
    return re.test(text) ? (60000 / wpm) * pauseFactor : 0;
  }

  // ---------------------------------------------------------------------------
  // Sentence list — built from the textarea via core.js splitIntoSentences()
  // ---------------------------------------------------------------------------

  function buildSentenceList() {
    const raw  = (document.getElementById('textInput') || {}).value || '';
    const text = raw.trim();
    if (!text) return [];
    return splitIntoSentences(text).map(s => s.trim()).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Core: speak a single sentence, then chain to the next via onend
  // ---------------------------------------------------------------------------

  function speakSentence(index) {
    if (ttsAborted || ttsPaused || index >= sentenceList.length) {
      if (!ttsAborted && !ttsPaused) onTTSEnd();
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
      // 'interrupted' / 'canceled' fire when we call cancel() ourselves — ignore
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('TTS error on sentence', index, ':', e.error, '— skipping');
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

    // Cancel any stale synthesis before starting fresh
    window.speechSynthesis.cancel();
    setTimeout(() => {
      if (!ttsAborted) speakSentence(sentenceIndex);
    }, 50);
  }

  function pause() {
    if (!ttsActive || ttsPaused) return;

    ttsPaused = true;
    setButtonState('paused');

    if (isFirefox) {
      swPause    = true;
      ttsAborted = true;
      window.speechSynthesis.cancel();
      // Un-latch ttsAborted after cancel flushes so resume() can call speakSentence()
      setTimeout(() => { ttsAborted = false; }, 150);
      console.log('TTS paused (software/Firefox) at sentence', sentenceIndex);
    } else {
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

    if (swPause) {
      swPause = false;
      speakSentence(sentenceIndex);
    } else {
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
    resetButtonState();
  }

  // ---------------------------------------------------------------------------
  // Button labels
  // ---------------------------------------------------------------------------

  function setButtonState(state) {
    if (!readAloudBtn) return;
    if (state === 'playing') { readAloudBtn.textContent = 'Pause ⏸';  return; }
    if (state === 'paused')  { readAloudBtn.textContent = 'Resume ▶'; return; }
    resetButtonState();
  }

  function resetButtonState() {
    if (readAloudBtn) readAloudBtn.textContent = 'Listen ▶';
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

    console.log('TTS: init —', isFirefox ? 'Firefox (software pause)' : 'non-Firefox (native pause)');

    readAloudBtn.addEventListener('click', handleReadAloudClick);

    if (resetBtn) {
      resetBtn.addEventListener('click', handleResetClick);
      console.log('TTS: #reset button wired.');
    } else {
      console.warn('TTS: #reset button not found — add <button id="reset"> to HTML.');
    }

    patchStartPauseButton();

    // Stop TTS if the user edits the textarea (sentence list would be stale)
    const textInputEl = document.getElementById('textInput');
    if (textInputEl) {
      textInputEl.addEventListener('input', () => {
        if (ttsActive) {
          console.log('TTS: text changed — stopping.');
          stop();
        }
      });
    }

    // Prime the voice list (loads asynchronously on Safari iOS / some Android)
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
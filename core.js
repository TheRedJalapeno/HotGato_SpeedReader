// Define all the variables
let textInput;
let speedSelector;
let pauseSpeedSelector;
let chunkSelector;
let fontSizeSelector;
let fontFamilySelector;
let startPauseButton;
let textOutput;
let reading;
let isReading = false;

function initializeFromStorage(itemName, valueElementId) {
  const value = localStorage.getItem(itemName);
  if(value) {
    document.getElementById(valueElementId).innerHTML = value;
  }
  return value;
}

function addInputListener(source, targetId, localStorageName) {
  source.addEventListener('input', function() {
    document.getElementById(targetId).innerHTML = this.value;
    localStorage.setItem(localStorageName, this.value);
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  // Assign the variables
  textInput = document.getElementById('textInput');
  speedSelector = document.getElementById('speedSelector');
  pauseSpeedSelector = document.getElementById('pauseSpeedSelector');
  chunkSelector = document.getElementById('chunkSize');
  fontSizeSelector = document.getElementById('fontSize');
  fontFamilySelector = document.getElementById('fontFamily');
  startPauseButton = document.getElementById('startPause');
  textOutput = document.getElementById('textOutput');

  // Load settings from localStorage
  speedSelector.value = initializeFromStorage('speedSelector', 'speedValue');
  pauseSpeedSelector.value = initializeFromStorage('pauseSpeedSelector', 'pauseSpeedValue');
  chunkSelector.value = initializeFromStorage('chunkSize', 'chunkValue');
  const fontSizeValue = initializeFromStorage('fontSize', 'fontValue');
  if (fontSizeValue) {
    fontSizeSelector.value = fontSizeValue;
    textOutput.style.fontSize = fontSizeValue + 'px';
  }
  const fontFamilyValue = localStorage.getItem('fontFamily');
  if (fontFamilyValue) {
    fontFamilySelector.value = fontFamilyValue;
    //textOutput.style.fontFamily = fontFamilyValue;
  }

  // Set up event listeners
  addInputListener(speedSelector, 'speedValue', 'speedSelector');
  addInputListener(pauseSpeedSelector, 'pauseSpeedValue', 'pauseSpeedSelector');
  addInputListener(chunkSelector, 'chunkValue', 'chunkSize');
  fontSizeSelector.addEventListener('input', function() {
    document.getElementById('fontValue').innerHTML = this.value;
    textOutput.style.fontSize = this.value + 'px';
    localStorage.setItem('fontSize', this.value); // save to localStorage
  });
  fontFamilySelector.addEventListener('change', function() {
    // Add specific class if necessary
    if (this.value) {
        document.body.className = '';
        document.body.classList.add('body-' + this.value);
    }
    localStorage.setItem('fontFamily', this.value); // save to localStorage

    // Prepare the first chunk
    let text = textInput.value;
    let words = text.split(' ');
    let chunkSize = parseInt(chunkSelector.value);
    let chunkEnd = Math.min(chunkSize, words.length);
    let chunk = words.slice(0, chunkEnd);
    let chunkText = chunk.join(' ') + ' ';

    // If the selected font family is "ADHD", highlight the first two letters
    if (this.value === 'ADHD') {
        chunkText = highlightFirstTwoLetters(chunkText);
    }

    // Set the first chunk as the text output
    textOutput.innerHTML = chunkText;
  });

  startPauseButton.addEventListener('click', function() {
    if (isReading) {
        this.innerHTML = 'Start';
        isReading = false;
    } else {
        this.innerHTML = 'Pause';
        isReading = true;
        startReading();
    }
  });

  function highlightFirstTwoLetters(text) {
    return text.replace(/\b(\w{1,2})(\w*)\b/g, '&nbsp;<span class="highlight">$1</span>$2');
  }

  function startReading() {
    let text = textInput.value;
    let words = text.split(/\s+/);
    let chunkSize = parseInt(chunkSelector.value);
    let i = 0;

    function nextChunk() {
        if (i >= words.length) {
            startPauseButton.innerHTML = 'Start';
            isReading = false;
            return;
        }

        let chunkEnd = Math.min(i + chunkSize, words.length);
        let chunk = words.slice(i, chunkEnd);
        let chunkText = chunk.join(' ');

        // This regex matches sentence-ending punctuation, numbers, URLs, and paragraph breaks
        const specialCharacterRegex = /(\d+(\.\d+)?|[.!?]|https?:\/\/[^\s]+|\s{2,})/g;
        let delay = 60000 / parseInt(speedSelector.value);

        // If the chunk contains a special character, add an extra delay
        if (specialCharacterRegex.test(chunkText)) {
            delay += 60000 / parseInt(speedSelector.value) * pauseSpeedSelector.value; // add a delay relative to reading speed
        }

        if (fontFamilySelector.value === 'ADHD') {
            chunkText = highlightFirstTwoLetters(chunkText);
        }

        textOutput.innerHTML = chunkText;

        i += chunkSize;

        if (isReading) {
            setTimeout(nextChunk, delay);
        }
    }

    nextChunk();
  }
});

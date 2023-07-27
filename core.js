// Define all the variables
let textInput;
let speedSelector;
let chunkSelector;
let fontSizeSelector;
let fontFamilySelector;
let startPauseButton;
let textOutput;
let reading;
let isReading = false;

document.addEventListener('DOMContentLoaded', (event) => {
  // Assign the variables
  textInput = document.getElementById('textInput');
  speedSelector = document.getElementById('speedSelector');
  chunkSelector = document.getElementById('chunkSize');
  fontSizeSelector = document.getElementById('fontSize');
  fontFamilySelector = document.getElementById('fontFamily');
  startPauseButton = document.getElementById('startPause');
  textOutput = document.getElementById('textOutput');

  // Load settings from localStorage
  const speedSelectorValue = localStorage.getItem('speedSelector');
  const chunkSizeValue = localStorage.getItem('chunkSize');
  const fontSizeValue = localStorage.getItem('fontSize');
  const fontFamilyValue = localStorage.getItem('fontFamily');
  
  if (speedSelectorValue) {
    speedSelector.value = speedSelectorValue;
    document.getElementById('speedValue').innerHTML = speedSelectorValue;
  }
  
  if (chunkSizeValue) {
    chunkSelector.value = chunkSizeValue;
    document.getElementById('chunkValue').innerHTML = chunkSizeValue;
  }
  
  if (fontSizeValue) {
    fontSizeSelector.value = fontSizeValue;
    document.getElementById('fontValue').innerHTML = fontSizeValue;
    textOutput.style.fontSize = fontSizeValue + 'px';
  }
  
  if (fontFamilyValue) {
    fontFamilySelector.value = fontFamilyValue;
    //textOutput.style.fontFamily = fontFamilyValue;
  }

  // Set up event listeners
  speedSelector.addEventListener('input', function() {
    document.getElementById('speedValue').innerHTML = this.value;
    localStorage.setItem('speedSelector', this.value); // save to localStorage
  });

  chunkSelector.addEventListener('input', function() {
    document.getElementById('chunkValue').innerHTML = this.value;
    localStorage.setItem('chunkSize', this.value); // save to localStorage
  });

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
    let words = text.split(' ');
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
            delay += 60000 / parseInt(speedSelector.value) * 4; // add a delay relative to reading speed
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

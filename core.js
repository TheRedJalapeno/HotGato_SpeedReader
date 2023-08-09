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

    console.log(chunk);

    // Set the first chunk as the text output
    textOutput.innerHTML = chunkText;

    console.log(textOutput.innerHTML);  // Ensure this logs the correct text.
     
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

//-------------------------------------
//-------------------------------------
// START of splitIntoSentences function
function splitIntoSentences(text) {
  let splitParts = text.split(/(?<!\d)\.(?!\d)(?=\s|$|\s?[A-Z])|([!?])\s+/);
  let sentences = [];

  for (let i = 0; i < splitParts.length; i += 2) {
      let sentence = splitParts[i];
      let punctuation = splitParts[i + 1] || '.'; // Default to a period if no punctuation captured
      sentences.push(sentence.trim() + punctuation);
  }

  return sentences;
}

// END of splitIntoSentences function

// START of getChunksFromSentences function
function getChunksFromSentences(sentences, chunkSize) {
  let allWords = [];
  sentences.forEach(sentence => {
      let wordsInSentence = sentence.split(/\s+/);
      allWords.push(...wordsInSentence);
  });

  let i = 0;
  let chunks = [];
  while (i < allWords.length) {
      let chunkEnd = i + chunkSize;

      if (/[.!?]$/.test(allWords[chunkEnd - 1])) {
          chunkEnd = chunkEnd;
      } else {
          let nextPunctuationIndex = allWords.slice(i).findIndex(word => /[.!?]$/.test(word));
          if (nextPunctuationIndex !== -1 && nextPunctuationIndex < chunkSize) {
              chunkEnd = i + nextPunctuationIndex + 1;
          }
      }

      let chunk = allWords.slice(i, chunkEnd);
      chunks.push(chunk);

      i += chunk.length;
  }
  
  return chunks;
}
// END of getChunksFromSentences function
//-------------------------------------
//-------------------------------------



function startReading() {
  let sentences = splitIntoSentences(textInput.value);
  let chunks = getChunksFromSentences(sentences, parseInt(chunkSelector.value));
  let currentChunkIndex = 0;

  function nextChunk() {
      // Check if all chunks are processed
      if (currentChunkIndex >= chunks.length) {
          startPauseButton.innerHTML = 'Start';
          isReading = false;
          return;
      }

      let chunk = chunks[currentChunkIndex];
      currentChunkIndex++;  // Move to the next chunk for the next cycle

      let chunkText = chunk.join(' ');

      // This regex matches sentence-ending punctuation, numbers, URLs, and paragraph breaks
      const specialCharacterRegex = /(\d+(\.\d+)?|[.!?]|https?:\/\/[^\s]+|\s{2,})/g;
      let delay = 60000 / parseInt(speedSelector.value);

      // If the chunk contains a special character, add an extra delay
      if (specialCharacterRegex.test(chunkText)) {
          delay += 60000 / parseInt(speedSelector.value) * parseFloat(pauseSpeedSelector.value); // add a delay relative to reading speed
      }

      // If the selected font family is "ADHD", highlight the first two letters
      if (fontFamilySelector.value === 'ADHD') {
          chunkText = highlightFirstTwoLetters(chunkText);
      }
      function highlightFirstTwoLetters(text) {
          return text.replace(/\b(\w{1,2})(\w*)\b/g, '&nbsp;<span class="highlight">$1</span>$2');
      }

      textOutput.innerHTML = chunkText;

      if (isReading) {
          setTimeout(nextChunk, delay);
      }

      console.log("Current chunk:", chunk);
  }

  nextChunk();

  console.log("Sentences array:", sentences);
  console.log("Chunks array:", chunks);
}




});
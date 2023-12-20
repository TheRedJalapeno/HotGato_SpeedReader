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
var isPaused = false;
let currentChunkIndex = 0;
var userInteracted = false;

// Define all the functions

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
  textInput.addEventListener('click', function() {
    userInteracted = true;
    console.log("User clicked the text input box.");
  });
  textInput.addEventListener('input', function() {
    userInteracted = true;
    console.log("User typed in the text input box.");
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


// START of Start Reading 
startPauseButton.addEventListener('click', function() {
  if (isReading) {
      this.innerHTML = 'Start';
      isReading = false;
      isPaused = true; // Indicate that the reading is paused
  } else {
      this.innerHTML = 'Pause';
      isReading = true;
      isPaused = false; // Reading is resumed
      startReading(); // Call startReading which now handles both starting and resuming
  }
});
// END of resumeReading function
//-------------------------------------

//-------------------------------------
// START of splitIntoSentences function
function splitIntoSentences(text) {
  // Replace multiple newlines with a single newline
  text = text.replace(/\n+/g, '\n');
  let splitParts = text.split(/(?<!\d)([.!?])(?!\d)(?=\s|$|\s?[A-Z]|$)|\n+/);
  let sentences = [];
  
  console.log("splitParts:", splitParts);  // Debug line

  for (let i = 0; i < splitParts.length; i++) {
    if (splitParts[i]) { // Check if the current part exists
      let sentence = splitParts[i].trim();
      let punctuation = splitParts[i + 1];

      if (punctuation && [".", "!", "?"].includes(punctuation)) {
          sentences.push(sentence + punctuation);
          i++;  // Move past the captured punctuation
      } else {
          sentences.push(sentence);
      }
    }
  }

  return sentences;
}
// END of splitIntoSentences function
//-------------------------------------

//-------------------------------------
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
// START of startReading function
function startReading() {
  let sentences = splitIntoSentences(textInput.value);
  let chunks = getChunksFromSentences(sentences, parseInt(chunkSelector.value));
  
  // Check if user has interacted and reset currentChunkIndex
  if (userInteracted) {
    currentChunkIndex = 0;
    userInteracted = false; // Reset the flag after handling the interaction
  }

  function nextChunk() {
      // Check if all chunks are processed
      if (currentChunkIndex >= chunks.length) {
          startPauseButton.innerHTML = 'Start';
          isReading = false;
          currentChunkIndex = 0; // Reset currentChunkIndex
          return;
      }

      let chunk = chunks[currentChunkIndex];
      let chunkText = chunk.join(' ');
      currentChunkIndex++;  // Move to the next chunk for the next cycle

      // Compute delay based on chunk size and selected WPM
      let delay = (chunk.length / parseInt(speedSelector.value)) * 60000;

      // This regex matches sentence-ending punctuation, numbers, URLs, and paragraph breaks
      const specialCharacterRegex = /(\d+(\.\d+)?|[.,!?'"`\n]|https?:\/\/[^\s]+|\s{2,})/g;

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
// END of startReading function



});


// About the author
document.addEventListener('DOMContentLoaded', function() {
  var aboutTrigger = document.getElementById('about-trigger');
  if (aboutTrigger) {
      aboutTrigger.onclick = function() {
          var aboutBox = document.getElementById('about-box');
          if (aboutBox) {
              aboutBox.style.display = aboutBox.style.display === 'none' ? 'block' : 'none';
          }
      };
  }
});
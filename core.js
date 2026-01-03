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

// Define default minimum values
const DEFAULT_VALUES = {
  speed: 300,              // Minimum speed (WPM)
  pauseSpeed: 3,         // Minimum pause factor
  chunkSize: 1,            // Minimum chunk size
  fontSize: 25,            // Minimum font size
  fontFamily: 'sans-serif' // Default font family
};
const textOutputElement = document.getElementById('textOutput');

// Safe way to update UI elements
function updateUIElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

// Initialize settings from storage with fallback to defaults
function initializeSettings() {
  console.log("Initializing settings...");
  
  // First set everything to minimum defaults
  speedSelector.value = DEFAULT_VALUES.speed;
  updateUIElement('speedValue', DEFAULT_VALUES.speed);
  
  pauseSpeedSelector.value = DEFAULT_VALUES.pauseSpeed;
  updateUIElement('pauseSpeedValue', DEFAULT_VALUES.pauseSpeed);
  
  chunkSelector.value = DEFAULT_VALUES.chunkSize;
  updateUIElement('chunkValue', DEFAULT_VALUES.chunkSize);
  
  fontSizeSelector.value = DEFAULT_VALUES.fontSize;
  updateUIElement('fontValue', DEFAULT_VALUES.fontSize);
  textOutput.style.fontSize = DEFAULT_VALUES.fontSize + 'px';
  
  fontFamilySelector.value = DEFAULT_VALUES.fontFamily;
  textOutputElement.className = '';
  textOutputElement.classList.add('body-' + DEFAULT_VALUES.fontFamily);
  console.log("Loaded font family:", DEFAULT_VALUES.FontFamily);
  
  // Then try to load from localStorage
  try {
    const storedSpeed = localStorage.getItem('speedSelector');
    if (storedSpeed) {
      speedSelector.value = storedSpeed;
      updateUIElement('speedValue', storedSpeed);
      console.log("Loaded speed:", storedSpeed);
    }
    
    const storedPauseSpeed = localStorage.getItem('pauseSpeedSelector');
    if (storedPauseSpeed) {
      pauseSpeedSelector.value = storedPauseSpeed;
      updateUIElement('pauseSpeedValue', storedPauseSpeed);
      console.log("Loaded pause speed:", storedPauseSpeed);
    }
    
    const storedChunkSize = localStorage.getItem('chunkSize');
    if (storedChunkSize) {
      chunkSelector.value = storedChunkSize;
      updateUIElement('chunkValue', storedChunkSize);
      console.log("Loaded chunk size:", storedChunkSize);
    }
    
    const storedFontSize = localStorage.getItem('fontSize');
    if (storedFontSize) {
      fontSizeSelector.value = storedFontSize;
      updateUIElement('fontValue', storedFontSize);
      textOutput.style.fontSize = storedFontSize + 'px';
      console.log("Loaded font size:", storedFontSize);
    }
    
    const storedFontFamily = localStorage.getItem('fontFamily');
    if (storedFontFamily) {
      fontFamilySelector.value = storedFontFamily;
      textOutputElement.className = '';
      textOutputElement.classList.add('body-' + storedFontFamily);
      console.log("Loaded font family:", storedFontFamily);
    }
  } catch (e) {
    console.error("Error loading settings from localStorage:", e);
  }
}

// Set up event listeners for controls
function setupEventListeners() {
  // Speed selector
  speedSelector.addEventListener('input', function() {
    updateUIElement('speedValue', this.value);
    localStorage.setItem('speedSelector', this.value);
  });
  
  // Pause speed selector
  pauseSpeedSelector.addEventListener('input', function() {
    updateUIElement('pauseSpeedValue', this.value);
    localStorage.setItem('pauseSpeedSelector', this.value);
  });
  
  // Chunk size selector
  chunkSelector.addEventListener('input', function() {
    updateUIElement('chunkValue', this.value);
    localStorage.setItem('chunkSize', this.value);
  });
  
  // Font size selector
  fontSizeSelector.addEventListener('input', function() {
    updateUIElement('fontValue', this.value);
    textOutput.style.fontSize = this.value + 'px';
    localStorage.setItem('fontSize', this.value);
  });
  
  // Text input events
  textInput.addEventListener('click', function() {
    userInteracted = true;
    console.log("User clicked the text input box.");
  });
  
  textInput.addEventListener('input', function() {
    userInteracted = true;
    console.log("User typed in the text input box.");
  });
  
    // Font family selector
fontFamilySelector.addEventListener('change', function() {
  if (this.value) {
    textOutputElement.className = '';
    textOutputElement.classList.add('body-' + this.value);
    console.log("Loaded font family:", this.value);
  }
  localStorage.setItem('fontFamily', this.value);
    
    // Prepare the first chunk
    let text = textInput.value;
    if (text) {
      let words = text.split(' ');
      let chunkSize = parseInt(chunkSelector.value);
      let chunkEnd = Math.min(chunkSize, words.length);
      let chunk = words.slice(0, chunkEnd);
      let chunkText = chunk.join(' ');
      
      console.log("Preview chunk:", chunk);
      
      // Set the first chunk as the text output
      textOutput.textContent = chunkText;
    }
  });
  
  // Start/pause button
  startPauseButton.addEventListener('click', function() {
    if (isReading) {
      this.textContent = 'Start';
      isReading = false;
      isPaused = true; // Indicate that the reading is paused
    } else {
      this.textContent = 'Pause';
      isReading = true;
      isPaused = false; // Reading is resumed
      startReading(); // Call startReading which now handles both starting and resuming
    }
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  console.log("DOM fully loaded");
  
  // Assign the variables
  textInput = document.getElementById('textInput');
  speedSelector = document.getElementById('speedSelector');
  pauseSpeedSelector = document.getElementById('pauseSpeedSelector');
  chunkSelector = document.getElementById('chunkSize');
  fontSizeSelector = document.getElementById('fontSize');
  fontFamilySelector = document.getElementById('fontFamily');
  startPauseButton = document.getElementById('startPause');
  textOutput = document.getElementById('textOutput');
  
  if (!textInput || !speedSelector || !pauseSpeedSelector || !chunkSelector || 
      !fontSizeSelector || !fontFamilySelector || !startPauseButton || !textOutput) {
    console.error("Failed to find one or more UI elements!");
    return;
  }
  
  // Initialize settings and set up event listeners
  initializeSettings();
  setupEventListeners();
  
  // About box functionality
  var aboutTrigger = document.getElementById('about-trigger');
  if (aboutTrigger) {
    aboutTrigger.onclick = function() {
      var aboutBox = document.getElementById('about-box');
      if (aboutBox) {
        aboutBox.style.display = aboutBox.style.display === 'none' ? 'block' : 'none';
      }
    };
  }
  
  // Extension-specific code - Load extracted text
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['extractedText'], function(result) {
      if (result.extractedText) {
        textInput.value = result.extractedText;
        console.log("Loaded extracted text from chrome storage");
      }
    });
  } else {
    console.log("Chrome storage not available, running in standard mode");
  }
});

//-------------------------------------
// START of acronym and abbreviation protection functions
const PROTECTED_DOT = '\uFFFF'; // Placeholder character for protected dots

// Common abbreviations that shouldn't end a sentence
const ABBREVIATIONS = [
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
  'vs', 'etc', 'approx', 'Inc', 'Ltd', 'Co',
  'Gen', 'Col', 'Lt', 'Sgt', 'Rev', 'Hon'
];
const ABBREV_REGEX = new RegExp(`\\b(${ABBREVIATIONS.join('|')})\\.`, 'gi');

// Protects acronyms like U.K., U.S.A., N.A.T.O.
// If followed by lowercase letter → protect all dots (not end of sentence)
// Otherwise → protect all dots except last (is end of sentence)
function protectAcronyms(text) {
  return text.replace(/\b([A-Z]\.){2,}/g, (match, _, offset) => {
    const afterMatch = text.slice(offset + match.length);

    // If followed by space + lowercase → protect ALL dots (not end of sentence)
    if (/^\s+[a-z]/.test(afterMatch)) {
      return match.replace(/\./g, PROTECTED_DOT);
    }

    // Otherwise, protect all dots EXCEPT the last one (is end of sentence)
    return match.slice(0, -1).replace(/\./g, PROTECTED_DOT) + '.';
  });
}

// Protects common abbreviations like Mr., Dr., etc.
function protectAbbreviations(text) {
  return text.replace(ABBREV_REGEX, (match) => {
    return match.slice(0, -1) + PROTECTED_DOT;
  });
}

// Restores protected dots back to normal dots
function restoreProtectedDots(text) {
  return text.replace(new RegExp(PROTECTED_DOT, 'g'), '.');
}

// Combined protection function
function protectSpecialDots(text) {
  text = protectAcronyms(text);
  text = protectAbbreviations(text);
  return text;
}
// END of acronym and abbreviation protection functions
//-------------------------------------

//-------------------------------------
// START of splitIntoSentences function
function splitIntoSentences(text) {
  // Protect acronyms and abbreviations before splitting
  text = protectSpecialDots(text);
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

  // Restore protected dots before returning
  return sentences.map(s => restoreProtectedDots(s));
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
      startPauseButton.textContent = 'Start';
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

    // If the selected font family is "Bionic", highlight the first two letters
    if (fontFamilySelector.value === 'Bionic') {
      displayBionicText(chunk);
    } else {
      // Standard display
      textOutput.textContent = chunkText;
    }

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

// Function to display bionic text (Firefox-safe implementation with improved spacing)
function displayBionicText(chunk) {
  // Clear the output first
  textOutput.innerHTML = '';
  
  // Create a container div to hold all the content
  const container = document.createElement('div');
  container.style.whiteSpace = 'pre-wrap'; // Preserve spaces
  
  // Process the chunk word by word
  const text = chunk.join(' ');
  const words = text.split(/\s+/);
  
  words.forEach((word, index) => {
    // Skip empty words
    if (!word) return;
    
    // Create a wrapper for each word + space
    const wordWrapper = document.createElement('span');
    
    // Determine how many letters to highlight (1 or 2)
    const highlightLength = Math.min(2, word.length);
    
    if (highlightLength > 0) {
      // Create the highlight span
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'highlight';
      highlightSpan.textContent = word.substring(0, highlightLength);
      wordWrapper.appendChild(highlightSpan);
      
      // Add the rest of the word if there's more
      if (word.length > highlightLength) {
        const restOfWord = document.createTextNode(word.substring(highlightLength));
        wordWrapper.appendChild(restOfWord);
      }
    } else {
      // If for some reason the word can't be highlighted, just add it
      wordWrapper.appendChild(document.createTextNode(word));
    }
    
    // Add the word to the container
    container.appendChild(wordWrapper);
    
    // Add a space after the word (except for the last word)
    if (index < words.length - 1) {
      // Using a non-breaking space to ensure it's visible
      container.appendChild(document.createTextNode(' '));
    }
  });
  
  // Add the container to the output
  textOutput.appendChild(container);
}

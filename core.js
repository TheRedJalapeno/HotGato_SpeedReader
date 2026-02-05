// Define all the variables
let textInput;
let speedSelector;
let pauseSpeedSelector;
let chunkSelector;
let fontSizeSelector;
let fontFamilySelector;
let startPauseButton;
let textOutput;
let fileInput;
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

// Load default text file on page load
async function loadDefaultText() {
  try {
    const response = await fetch('kolnari_prologue_chap1.txt');
    if (!response.ok) {
      console.log('Default text file not found, textarea will remain empty');
      return;
    }
    const text = await response.text();
    if (textInput && !textInput.value) {
      textInput.value = text;
      userInteracted = true; // Treat like user interaction to reset reading position
      console.log('Loaded default text from kolnari_prologue_chap1.txt');
    }
  } catch (error) {
    console.log('Could not load default text:', error);
    // Silently fail - textarea will remain empty
  }
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
  fileInput = document.getElementById('fileInput');
  
  if (!textInput || !speedSelector || !pauseSpeedSelector || !chunkSelector || 
      !fontSizeSelector || !fontFamilySelector || !startPauseButton || !textOutput) {
    console.error("Failed to find one or more UI elements!");
    return;
  }
  
  // Initialize settings and set up event listeners
  initializeSettings();
  setupEventListeners();
  
  // Add file input event listener if element exists
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
  
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
  
  // Load default text file
  loadDefaultText();
  
  // Extension-specific code - Load extracted text
  // Note: Chrome storage takes priority over default text
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['extractedText'], function(result) {
      if (result.extractedText) {
        textInput.value = result.extractedText;
        userInteracted = true;
        console.log("Loaded extracted text from chrome storage");
      }
    });
  } else {
    console.log("Chrome storage not available, running in standard mode");
  }
});

//-------------------------------------
// START of acronym and abbreviation protection functions
// Note: Uses placeholder technique instead of lookbehind (like numbers in
// splitIntoSentences) because acronym patterns have variable length which
// JavaScript regex lookbehind doesn't support
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

// Returns true if word ends with real sentence-ending punctuation
// Protected dots (PROTECTED_DOT) are NOT sentence endings
// Real dots at end of acronyms (like "U.S." at end of sentence) ARE sentence endings
function endsWithSentencePunctuation(word) {
  if (!/[.!?]$/.test(word)) return false;
  // If word contains PROTECTED_DOT, it's an acronym/abbreviation
  // but might still end with real punctuation (e.g., "U￿S." at end of sentence)
  // The key is: does it end with a REAL dot (not protected)?
  // If last char is . and second-to-last is not PROTECTED_DOT, it's a real ending
  if (word.includes(PROTECTED_DOT)) {
    // Check if it ends with real punctuation (not just protected dot pattern)
    // "U￿K￿" → no real ending (ends with protected dot pattern)
    // "U￿S." → real ending (ends with real dot)
    const lastChar = word.slice(-1);
    const beforeLast = word.slice(-2, -1);
    return lastChar === '.' && beforeLast !== PROTECTED_DOT;
  }
  // No protected dots, check for abbreviations
  const abbrevPattern = new RegExp(`^(${ABBREVIATIONS.join('|')})\\.$`, 'i');
  if (abbrevPattern.test(word)) return false;
  return true;
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

  // Keep protected dots for now - will restore when displaying
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

    if (endsWithSentencePunctuation(allWords[chunkEnd - 1])) {
      chunkEnd = chunkEnd;
    } else {
      let nextPunctuationIndex = allWords.slice(i).findIndex(word => endsWithSentencePunctuation(word));
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
// START of file handling functions
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  console.log("File selected:", file.name, "Type:", file.type);
  
  const extension = file.name.split('.').pop().toLowerCase();
  let extractedText = '';
  
  try {
    switch(extension) {
      case 'txt':
      case 'log':
        extractedText = await readTextFile(file);
        break;
      case 'pdf':
        extractedText = await readPDFFile(file);
        break;
      case 'docx':
        extractedText = await readDocxFile(file);
        break;
      case 'epub':
        extractedText = await readEpubFile(file);
        break;
      case 'rtf':
        extractedText = await readRTFFile(file);
        break;
      case 'odt':
        extractedText = await readODTFile(file);
        break;
      case 'html':
      case 'htm':
        extractedText = await readHTMLFile(file);
        break;
      case 'md':
      case 'markdown':
        extractedText = await readMarkdownFile(file);
        break;
      case 'doc':
        alert('Legacy .doc files are not supported. Please convert to .docx format.');
        return;
      case 'gdoc':
        alert('Google Docs cannot be uploaded directly. Please use File > Download > Plain Text (.txt) or Microsoft Word (.docx) from Google Docs, then upload the downloaded file.');
        return;
      default:
        alert('Unsupported file format. Supported formats: txt, pdf, docx, epub, pages, rtf, odt, html, md');
        return;
    }
    
    if (extractedText) {
      textInput.value = extractedText;
      userInteracted = true;
      console.log("Successfully loaded text from file");
    }
  } catch (error) {
    console.error("Error reading file:", error);
    alert('Error reading file: ' + error.message);
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

async function readPDFFile(file) {
  // Load PDF.js library if not already loaded
  if (typeof pdfjsLib === 'undefined') {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        
        resolve(fullText);
      } catch (error) {
        reject(new Error('Failed to parse PDF: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readDocxFile(file) {
  // Load mammoth.js library if not already loaded
  if (typeof mammoth === 'undefined') {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(new Error('Failed to parse DOCX: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read DOCX file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readEpubFile(file) {
  // Load JSZip and basic EPUB parsing
  if (typeof JSZip === 'undefined') {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const zip = await JSZip.loadAsync(e.target.result);
        let fullText = '';
        
        // Find all HTML/XHTML files in the EPUB
        const htmlFiles = Object.keys(zip.files).filter(filename => 
          filename.match(/\.(html|xhtml|htm)$/i) && !filename.startsWith('__MACOSX')
        );
        
        // Extract text from each HTML file
        for (const filename of htmlFiles) {
          const content = await zip.files[filename].async('string');
          // Remove HTML tags and extract text
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          fullText += tempDiv.textContent + '\n\n';
        }
        
        resolve(fullText);
      } catch (error) {
        reject(new Error('Failed to parse EPUB: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read EPUB file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readRTFFile(file) {
  // RTF to HTML conversion
  if (typeof RTFJS === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/rtf.js@3.0.8/rtf.min.js');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const doc = new RTFJS.Document(arrayBuffer);
        const htmlElements = await doc.render();
        
        // Extract text from rendered HTML elements
        let fullText = '';
        htmlElements.forEach(element => {
          if (element && element.textContent) {
            fullText += element.textContent + '\n';
          }
        });
        
        resolve(fullText);
      } catch (error) {
        reject(new Error('Failed to parse RTF: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read RTF file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readODTFile(file) {
  // ODT files are ZIP archives containing XML
  if (typeof JSZip === 'undefined') {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const zip = await JSZip.loadAsync(e.target.result);
        
        if (!zip.files['content.xml']) {
          reject(new Error('Invalid ODT file: content.xml not found'));
          return;
        }
        
        const contentXml = await zip.files['content.xml'].async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contentXml, 'text/xml');
        
        // Extract text from paragraphs
        const paragraphs = xmlDoc.getElementsByTagName('text:p');
        let fullText = '';
        for (let i = 0; i < paragraphs.length; i++) {
          fullText += paragraphs[i].textContent + '\n';
        }
        
        resolve(fullText);
      } catch (error) {
        reject(new Error('Failed to parse ODT: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read ODT file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readHTMLFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const htmlContent = e.target.result;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Remove script and style tags
        const scripts = tempDiv.getElementsByTagName('script');
        const styles = tempDiv.getElementsByTagName('style');
        
        while (scripts.length > 0) {
          scripts[0].parentNode.removeChild(scripts[0]);
        }
        while (styles.length > 0) {
          styles[0].parentNode.removeChild(styles[0]);
        }
        
        resolve(tempDiv.textContent);
      } catch (error) {
        reject(new Error('Failed to parse HTML: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read HTML file'));
    reader.readAsText(file);
  });
}

async function readMarkdownFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // For a speed reader, we can just read markdown as plain text
        // Alternatively, we could strip markdown syntax
        const text = e.target.result;
        
        // Optional: Remove markdown formatting for cleaner reading
        let cleanText = text
          // Remove headers (#, ##, etc.)
          .replace(/^#{1,6}\s+/gm, '')
          // Remove bold/italic (**text**, *text*, __text__, _text_)
          .replace(/(\*\*|__)(.*?)\1/g, '$2')
          .replace(/(\*|_)(.*?)\1/g, '$2')
          // Remove links [text](url) -> text
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          // Remove inline code `code` -> code
          .replace(/`([^`]+)`/g, '$1')
          // Remove code blocks
          .replace(/```[\s\S]*?```/g, '')
          // Remove horizontal rules
          .replace(/^[-*_]{3,}$/gm, '');
        
        resolve(cleanText);
      } catch (error) {
        reject(new Error('Failed to parse Markdown: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Markdown file'));
    reader.readAsText(file);
  });
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}
// END of file handling functions
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

    // Check for real sentence-ending punctuation (excluding acronyms/abbreviations)
    const words = chunkText.split(/\s+/);
    const hasRealPunctuation = words.some(word => endsWithSentencePunctuation(word)) ||
                               /(\d+(\.\d+)?|[,!?'"`\n]|https?:\/\/[^\s]+|\s{2,})/.test(chunkText);

    // If the chunk contains special characters, add an extra delay
    if (hasRealPunctuation) {
      delay += 60000 / parseInt(speedSelector.value) * parseFloat(pauseSpeedSelector.value); // add a delay relative to reading speed
    }

    // Restore protected dots for display
    const displayText = restoreProtectedDots(chunkText);

    // If the selected font family is "Bionic", highlight the first two letters
    if (fontFamilySelector.value === 'Bionic') {
      displayBionicText(chunk);
    } else {
      // Standard display
      textOutput.textContent = displayText;
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
  
  // Process the chunk word by word (restore protected dots for display)
  const text = restoreProtectedDots(chunk.join(' '));
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

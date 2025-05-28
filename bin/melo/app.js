/**
 * Musical Melody Game
 * Players must play specific notes with correct durations using keyboard keys 1-9
 */

// Game state
let gameStarted = false;
let currentNoteIndex = 0;
let userSequence = [];
let audioContext = null;

// Note mappings (keys to frequencies)
const noteMapping = {
  '1': { note: 'G3', frequency: 196.00 },
  '2': { note: 'B3', frequency: 246.94 },
  '3': { note: 'C4', frequency: 261.63 },
  '4': { note: 'D4', frequency: 293.66 },
  '5': { note: 'E4', frequency: 329.63 },
  '6': { note: 'F4', frequency: 349.23 },
  '7': { note: 'G4', frequency: 392.00 },
  '8': { note: 'A4', frequency: 440.00 },
  '9': { note: 'B4', frequency: 493.88 }
};

// Perfect melody sequence
const perfectMelody = [
  { note: 'B3', duration: 'blanche', key: '2' },
  { note: 'D4', duration: 'noire-pointee', key: '4' },
  { note: 'G4', duration: 'ronde', key: '7' },
  { note: 'E4', duration: 'croche', key: '5' },
  { note: 'E4', duration: 'demi-croche', key: '5' },
  { note: 'E4', duration: 'noire', key: '5' },
  { note: 'E4', duration: 'croche', key: '5' },
  { note: 'E4', duration: 'croche', key: '5' },
  { note: 'D4', duration: 'demi-croche', key: '4' },
  { note: 'C4', duration: 'noire', key: '3' },
  { note: 'B3', duration: 'croche', key: '2' },
  { note: 'C4', duration: 'blanche', key: '3' }
];

// Duration names in French
const durationNames = {
  'blanche': 'Blanche',
  'noire': 'Noire',
  'noire-pointee': 'Noire pointée',
  'ronde': 'Ronde',
  'croche': 'Croche',
  'demi-croche': 'Demi-croche'
};

// DOM elements
let durationOverlay, successCode;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('Musical melody game loaded');
  initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
  // Get DOM elements
  durationOverlay = document.getElementById('duration-overlay');
  successCode = document.getElementById('success-code');

  // Add event listeners
  document.addEventListener('keydown', handleKeyPress);

  // Initialize audio context
  initializeAudio();
  
  // Start game immediately
  startGame();

  console.log('App initialized');
}

/**
 * Initialize Web Audio API
 */
function initializeAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (error) {
    console.error('Web Audio API not supported:', error);
  }
}

/**
 * Start the game
 */
function startGame() {
  gameStarted = true;
  currentNoteIndex = 0;
  userSequence = [];
  
  // Show first note background
  showCurrentNote();
  
  console.log('Game started');
}

/**
 * Show the current note information and update background
 */
function showCurrentNote() {
  if (currentNoteIndex >= perfectMelody.length) {
    endGame(true); // Game completed successfully
    return;
  }
  
  const currentNote = perfectMelody[currentNoteIndex];
  
  // Update background based on duration
  updateBackground(currentNote.duration);
}

/**
 * Update background and overlay based on note duration
 */
function updateBackground(duration) {
  // Reset overlay
  durationOverlay.innerHTML = '';
  durationOverlay.className = 'duration-overlay absolute inset-0 flex items-center justify-center';
  
  // Add duration-specific styling
  durationOverlay.classList.add(`duration-${duration}`);
  
  // Add visual symbols for different durations
  switch (duration) {
    case 'blanche':
      // White background (default)
      break;
      
    case 'noire':
    case 'noire-pointee':
      // Black background (handled by CSS)
      if (duration === 'noire-pointee') {
        const point = document.createElement('div');
        point.className = 'symbol-point';
        durationOverlay.appendChild(point);
      }
      break;
      
    case 'ronde':
      // Black background with white filled circle
      const rond = document.createElement('div');
      rond.className = 'symbol-rond';
      durationOverlay.appendChild(rond);
      break;
      
    case 'croche':
      // Black background with one white baton
      const baton = document.createElement('div');
      baton.className = 'symbol-baton';
      durationOverlay.appendChild(baton);
      break;
      
    case 'demi-croche':
      // Black background with two white batons
      const doubleBaton = document.createElement('div');
      doubleBaton.className = 'symbol-double-baton';
      doubleBaton.innerHTML = '<div class="baton"></div><div class="baton"></div>';
      durationOverlay.appendChild(doubleBaton);
      break;
  }
}

/**
 * Handle keyboard input
 */
function handleKeyPress(event) {
  if (!gameStarted) return;
  
  let key = event.key;
  
  // Handle both main number keys and numpad
  if (event.code.startsWith('Numpad')) {
    key = event.code.replace('Numpad', '');
  }
  
  // Check if it's a valid note key (1-9)
  if (noteMapping[key]) {
    playNote(key);
    event.preventDefault();
  }
}

/**
 * Play a note and check if it's correct
 */
function playNote(key) {
  if (currentNoteIndex >= perfectMelody.length) return;
  
  const expectedNote = perfectMelody[currentNoteIndex];
  const playedNote = noteMapping[key];
  
  // Play the sound immediately when key is pressed
  if (audioContext) {
    playTone(playedNote.frequency, 0.5); // 50% volume
  }
  
  // Add to user sequence
  userSequence.push(key);
  
  // Move to next note
  currentNoteIndex++;
  
  // Check if we've finished all 12 notes
  if (currentNoteIndex >= perfectMelody.length) {
    // Check if sequence is correct
    const isCorrect = checkSequence();
    if (isCorrect) {
      playSuccessSequence();
    } else {
      playFailureSequence();
    }
  } else {
    // Show next note
    showCurrentNote();
  }
}

/**
 * Check if user sequence matches perfect melody
 */
function checkSequence() {
  if (userSequence.length !== perfectMelody.length) return false;
  
  for (let i = 0; i < perfectMelody.length; i++) {
    if (userSequence[i] !== perfectMelody[i].key) {
      return false;
    }
  }
  return true;
}

/**
 * Play the entire melody and then success sound
 */
function playSuccessSequence() {
  // Play entire melody
  playMelodySequence(() => {
    // After melody, play success sound and show code
    playAudio('assets/success.mp3');
    showSuccessCode();
  });
}

/**
 * Play failure sound and restart
 */
function playFailureSequence() {
  playAudio('assets/failure.mp3');
  setTimeout(() => {
    resetGame();
  }, 2000);
}

/**
 * Play the entire perfect melody
 */
function playMelodySequence(callback) {
  let noteIndex = 0;
  const playNextNote = () => {
    if (noteIndex >= perfectMelody.length) {
      if (callback) callback();
      return;
    }
    
    const note = perfectMelody[noteIndex];
    const frequency = noteMapping[note.key].frequency;
    playTone(frequency, 0.5);
    
    noteIndex++;
    setTimeout(playNextNote, 600); // 600ms between notes
  };
  
  playNextNote();
}

/**
 * Play audio file
 */
function playAudio(src) {
  const audio = new Audio(src);
  audio.volume = 0.5;
  audio.play().catch(e => console.error('Audio play failed:', e));
}

/**
 * Show success code
 */
function showSuccessCode() {
  // Set background to black
  durationOverlay.innerHTML = '';
  durationOverlay.className = 'duration-overlay absolute inset-0 flex items-center justify-center duration-noire';
  
  // Show success code
  successCode.classList.remove('hidden');
}

/**
 * Reset game to beginning
 */
function resetGame() {
  currentNoteIndex = 0;
  userSequence = [];
  successCode.classList.add('hidden');
  showCurrentNote();
}

/**
 * Play a tone with the given frequency
 */
function playTone(frequency, volume = 0.5) {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.8);
}

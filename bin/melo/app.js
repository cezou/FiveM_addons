/**
 * Musical Melody Game
 * Players must play specific notes with correct durations using keyboard keys 1-9
 */

// Game state
let gameStarted = false;
let currentNoteIndex = 0;
let userSequence = [];
let audioContext = null;
let isPlayingNote = false; // Track if a note is currently playing

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

// Duration in seconds for each note type
const durationTimes = {
  'ronde': 4.0,        // 4 temps
  'blanche': 2.0,      // 2 temps
  'noire': 1.0,        // 1 temps
  'noire-pointee': 1.5, // 1.5 temps
  'croche': 0.5,       // 1/2 temps
  'demi-croche': 0.25  // 1/4 temps
};

// DOM elements
let durationOverlay, successCode, startupScreen, powerButtonArea;

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
  startupScreen = document.getElementById('startup-screen');
  powerButtonArea = document.getElementById('power-button-area');

  // Add event listeners
  document.addEventListener('keydown', handleKeyPress);
  powerButtonArea.addEventListener('click', startComputer);

  // Initialize audio context
  initializeAudio();
  
  // Don't start game immediately - wait for power button
  console.log('App initialized - waiting for power button');
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
 * Start the computer with startup sequence
 */
function startComputer() {
  // Play startup sound
  playAudio('assets/startup.mp3');
  
  // Start fade transition
  startupScreen.style.transition = 'opacity 3s ease-out';
  startupScreen.style.opacity = '0';
  
  // Remove startup screen and start game after fade
  setTimeout(() => {
    startupScreen.style.display = 'none';
    powerButtonArea.style.display = 'none'; // Hide power button area
    startGame();
  }, 3000);
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
    // Change body background color based on duration
  const body = document.body;
  switch (duration) {
    case 'blanche':
    case 'ronde':
      body.style.backgroundColor = 'white';
      break;
      
    case 'noire':
    case 'noire-pointee':
    case 'croche':
    case 'demi-croche':
      body.style.backgroundColor = 'black';
      break;
  }
  
  // Add visual symbols for different durations
  switch (duration) {
    case 'blanche':
      // White background (already set above)
      break;
      
    case 'noire':
    case 'noire-pointee':
      // Black background (already set above)
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
  if (!gameStarted || isPlayingNote) return; // Block input if note is playing
  
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
  if (currentNoteIndex >= perfectMelody.length || isPlayingNote) return;
  
  const expectedNote = perfectMelody[currentNoteIndex];
  const playedNote = noteMapping[key];
  
  // Set playing state to block further input
  isPlayingNote = true;
  
  // Play the sound with correct duration when key is pressed
  if (audioContext) {
    const noteDuration = durationTimes[expectedNote.duration];
    playTone(playedNote.frequency, 0.5, noteDuration);
    
    // Wait for the note to finish before allowing next input
    setTimeout(() => {
      isPlayingNote = false;
      
      // Add to user sequence
      userSequence.push(key);
      
      // Move to next note
      currentNoteIndex++;
      
      // Check if we've finished all 12 notes
      if (currentNoteIndex >= perfectMelody.length) {        // Always play the user's melody first, then check if correct
        playUserMelodySequence(() => {
          const isCorrect = checkSequence();
          if (isCorrect) {
            // Play success sound, then wait 2 seconds before blinking and showing code
            playAudio('assets/success.mp3');
            setTimeout(() => {
              showSuccessWithBlinking();
            }, 2300);
          } else {
            playFailureSequence();
          }
        });
      } else {
        // Show next note
        showCurrentNote();
      }
    }, noteDuration * 1000);
  } else {
    // Fallback if no audio context
    setTimeout(() => {
      isPlayingNote = false;
      userSequence.push(key);
      currentNoteIndex++;
      
      if (currentNoteIndex >= perfectMelody.length) {        playUserMelodySequence(() => {
          const isCorrect = checkSequence();
          if (isCorrect) {
            // Play success sound, then wait 2 seconds before blinking and showing code
            playAudio('assets/success.mp3');
            setTimeout(() => {
              showSuccessWithBlinking();
            }, 2300);
          } else {
            playFailureSequence();
          }
        });
      } else {
        showCurrentNote();
      }
    }, durationTimes[expectedNote.duration] * 1000);
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
 * Play the user's melody sequence
 */
function playUserMelodySequence(callback) {
  let noteIndex = 0;
  const playNextNote = () => {
    if (noteIndex >= userSequence.length) {
      if (callback) callback();
      return;
    }
    
    const userKey = userSequence[noteIndex];
    const originalNote = perfectMelody[noteIndex];
    const playedNote = noteMapping[userKey];
    
    if (audioContext && playedNote) {
      // Use original duration for visual but speed up audio 3x
      const originalDuration = durationTimes[originalNote.duration];
      const speedUpDuration = originalDuration / 3;
      
      // Show background for the original duration type
      updateBackground(originalNote.duration);
      
      playTone(playedNote.frequency, 0.3, speedUpDuration);
      
      // Wait for the sped-up duration before playing next note
      setTimeout(() => {
        noteIndex++;
        playNextNote();
      }, speedUpDuration * 1000);
    } else {
      noteIndex++;
      playNextNote();
    }
  };
  
  playNextNote();
}

/**
 * Play the entire melody and then success sound
 */
function playSuccessSequence() {
  // This function is now simplified since user melody is played elsewhere
  playAudio('assets/success.mp3');
	setTimeout(() => {
	showSuccessWithBlinking();
}, 2300);
}

/**
 * Play failure sound and restart
 */
function playFailureSequence() {
  playAudio('assets/failure.mp3');
  // Wait 2 seconds before starting the blinking
  setTimeout(() => {
    showFailureWithBlinking();
  }, 2300);
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
 * Show success with green blinking background
 */
function showSuccessWithBlinking() {
  let blinkCount = 0;
  const maxBlinks = 4; // 2 complete blinks (on/off/on/off)
  
  const blink = () => {
    if (blinkCount >= maxBlinks) {
      // After blinking, show success code
      showSuccessCode();
      return;
    }
    
    // Alternate between green and white
    const isGreen = blinkCount % 2 === 0;
    durationOverlay.innerHTML = '';
    durationOverlay.className = 'duration-overlay absolute inset-0 flex items-center justify-center';
    durationOverlay.style.backgroundColor = isGreen ? '#00ff00' : '#ffffff';
    
    blinkCount++;
    setTimeout(blink, 300); // 300ms between blinks
  };
  
  blink();
}

/**
 * Show failure with red/white blinking background then restart
 */
function showFailureWithBlinking() {
  let blinkCount = 0;
  const maxBlinks = 4; // 2 complete blinks (red/white/red/white)
  
  const blink = () => {
    if (blinkCount >= maxBlinks) {
      // After blinking, reset game
      setTimeout(() => {
        resetGame();
      }, 500);
      return;
    }
    
    // Alternate between red and white
    const isRed = blinkCount % 2 === 0;
    durationOverlay.innerHTML = '';
    durationOverlay.className = 'duration-overlay absolute inset-0 flex items-center justify-center';
    durationOverlay.style.backgroundColor = isRed ? '#ff0000' : '#ffffff';
    
    blinkCount++;
    setTimeout(blink, 300); // 300ms between blinks
  };
  
  blink();
}

/**
 * Reset game to beginning
 */
function resetGame() {
  currentNoteIndex = 0;
  userSequence = [];
  isPlayingNote = false; // Reset playing state
  successCode.classList.add('hidden');
  
  // Reset any inline styles from blinking
  durationOverlay.style.backgroundColor = '';
  
  showCurrentNote();
}

/**
 * Play a tone with the given frequency
 */
function playTone(frequency, volume = 0.5, duration = 0.8) {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

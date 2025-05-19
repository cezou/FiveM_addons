/**
 * Musical note pitch detection
 * Uses Web Audio API to capture microphone input and detect musical notes
 */

// Audio context and variables
let audioContext;
let analyser;
let microphone;
let javascriptNode;
let isRecording = false;

// DOM elements
const startButton = document.getElementById('start-button');
const noteDisplay = document.getElementById('note-display');
const frequencyDisplay = document.getElementById('frequency-display');

// Musical notes with their frequency ranges (in Hz)
const noteFrequencies = [
  { note: 'C', frequency: 261.63 },
  { note: 'C#', frequency: 277.18 },
  { note: 'D', frequency: 293.66 },
  { note: 'D#', frequency: 311.13 },
  { note: 'E', frequency: 329.63 },
  { note: 'F', frequency: 349.23 },
  { note: 'F#', frequency: 369.99 },
  { note: 'G', frequency: 392.00 },
  { note: 'G#', frequency: 415.30 },
  { note: 'A', frequency: 440.00 },
  { note: 'A#', frequency: 466.16 },
  { note: 'B', frequency: 493.88 }
];

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  startButton.addEventListener('click', toggleRecording);
});

/**
 * Toggle between starting and stopping the recording
 */
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

/**
 * Detects browser name and version
 * @returns {Object} Object containing browser name and version
 */
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";
  let browserEngine = "Unknown";
  let isFiveM = false;
  
  // Check for FiveM's CitizenFX
  if (userAgent.indexOf("CitizenFX") > -1) {
    browserName = "FiveM Browser";
    isFiveM = true;
    
    // Extract CitizenFX version
    const fiveMMatch = userAgent.match(/CitizenFX\/(\d+\.\d+\.\d+\.\d+)/i);
    if (fiveMMatch && fiveMMatch.length >= 2) {
      browserVersion = fiveMMatch[1];
    }
    
    // Also get Chrome version it's based on
    const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/i);
    if (chromeMatch && chromeMatch.length >= 2) {
      browserVersion += ` (Chrome ${chromeMatch[1]})`;
    }
    
    browserEngine = "Blink (FiveM Modified)";
  }
  // Check for Chrome or Chromium-based browsers
  else if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome/Chromium";
    browserEngine = "Blink";
  } 
  // Check for Firefox
  else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
    browserEngine = "Gecko";
  } 
  // Check for Safari
  else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
    browserEngine = "WebKit";
  } 
  // Check for IE/Edge
  else if (userAgent.match(/msie|trident|edge/i)) {
    browserName = userAgent.indexOf("Edge") > -1 ? "Edge" : "Internet Explorer";
    browserEngine = "EdgeHTML/Trident";
  }
  
  // Extract version
  const match = userAgent.match(/(chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (match && match.length >= 3) {
    browserVersion = match[2];
  }
  
  return {
    name: browserName,
    version: browserVersion,
    engine: browserEngine,
    userAgent: userAgent,
    isFiveM: isFiveM,
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasWebAudio: !!(window.AudioContext || window.webkitAudioContext)
  };
}

/**
 * Start the microphone recording and pitch detection
 */
async function startRecording() {
  // Audio context initialization
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (error) {
    const browserInfo = getBrowserInfo();
    console.error('Erreur lors de la création du contexte audio:', error);
    alert(`Votre navigateur ne supporte pas l'API Web Audio requise pour cette application.
    
Informations du navigateur:
- Nom: ${browserInfo.name}
- Version: ${browserInfo.version}
- Moteur: ${browserInfo.engine}
- Support Web Audio: ${browserInfo.hasWebAudio ? 'Oui' : 'Non'}
- Support getUserMedia: ${browserInfo.hasGetUserMedia ? 'Oui' : 'Non'}

User Agent: ${browserInfo.userAgent}`);
    return;
  }
  
  // Microphone access
  let stream;
  try {
    // For FiveM, add special handling
    const browserInfo = getBrowserInfo();
    
    if (browserInfo.isFiveM) {
      console.log("FiveM browser detected, using special handling");
      // Add a more specific message for FiveM users
      alert(`Navigateur FiveM détecté!

Pour utiliser le micro dans FiveM:
1. Une boîte de dialogue apparaîtra dans la console (accessible avec F8)
2. Cliquez sur "Allow" pour autoriser l'accès au microphone
3. Si aucune boîte de dialogue n'apparaît, appuyez sur F8 pour vérifier

Cliquez sur OK pour continuer...`);
    }
    
    // Wait for the user to see the message and possibly handle the permission dialog
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to get user media with audio with more basic constraints for FiveM
    const constraints = 
      {audio : {}
      };
    
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    
  } catch (error) {
    const browserInfo = getBrowserInfo();
    console.error('Erreur d\'accès au microphone:', error);
    
    let errorMessage = "";
    
    // Special handling for FiveM
    if (browserInfo.isFiveM) {
      errorMessage = `Erreur d'accès au microphone dans FiveM:
      
Causes possibles:
1. Vous avez refusé l'autorisation dans la boîte de dialogue F8
2. Aucun microphone n'est détecté sur votre système
3. La version de FiveM (${browserInfo.version}) a des restrictions de confidentialité

Conseils:
• Essayez de redémarrer FiveM
• Vérifiez que votre micro fonctionne dans d'autres applications
• Vérifiez que vous n'avez pas bloqué l'accès au micro dans les paramètres Windows

Détails techniques: ${error.name} - ${error.message}`;
    } else {
      errorMessage = `${browserInfo.name} : ${browserInfo.version} : ${browserInfo.engine} : ${browserInfo.hasWebAudio ? 'Oui' : 'Non'} : ${browserInfo.hasGetUserMedia ? 'Oui' : 'Non'}`;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = `

${errorMessage}`;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = `Aucun microphone détecté sur votre appareil.

${errorMessage}`;
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = `Votre microphone est peut-être utilisé par une autre application.

${errorMessage}`;
      } else if (error.name === 'NotSupportedError') {
        errorMessage = `Votre navigateur ne prend pas en charge l'accès au microphone ou les contraintes demandées sont incompatibles.

${errorMessage}

Note FiveM: Le navigateur intégré à FiveM peut avoir des limitations concernant l'accès au microphone.`;
      }
    }
    
    alert(errorMessage);
    
    // Close audio context if it was created
    if (audioContext) {
      audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    }
    return;
  }
  
  // Analyzer setup
  try {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
  } catch (error) {
    console.error('Erreur lors de la création de l\'analyseur audio:', error);
    alert('Erreur lors de la configuration de l\'analyseur audio.');
    stream.getTracks().forEach(track => track.stop());
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    return;
  }
  
  // Connect microphone to analyzer
  try {
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
  } catch (error) {
    console.error('Erreur lors de la connexion du microphone:', error);
    alert('Impossible de connecter le microphone à l\'analyseur audio.');
    stream.getTracks().forEach(track => track.stop());
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    return;
  }
  
  // JavaScript node setup
  try {
    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
  } catch (error) {
    console.error('Erreur lors de la création du nœud de traitement audio:', error);
    alert('Impossible de configurer le processeur audio.');
    stream.getTracks().forEach(track => track.stop());
    microphone.disconnect();
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    return;
  }
  
  // Set up audio processing
  try {
    javascriptNode.onaudioprocess = processAudio;
    
    // Update UI
    isRecording = true;
    startButton.textContent = 'Arrêter l\'enregistrement';
    startButton.classList.remove('bg-green-600', 'hover:bg-green-700');
    startButton.classList.add('bg-red-600', 'hover:bg-red-700');
    
    console.log('Recording started');
  } catch (error) {
    console.error('Erreur lors de la configuration du traitement audio:', error);
    alert('Une erreur est survenue lors du lancement de l\'enregistrement.');
    cleanupAudioResources(stream);
  }
}

/**
 * Stop the microphone recording
 */
function stopRecording() {
  if (javascriptNode) {
    javascriptNode.onaudioprocess = null;
    javascriptNode.disconnect();
    analyser.disconnect();
    microphone.disconnect();
    audioContext.close();
  }
  
  // Update UI
  isRecording = false;
  startButton.textContent = 'Commencer l\'enregistrement';
  startButton.classList.remove('bg-red-600', 'hover:bg-red-700');
  startButton.classList.add('bg-green-600', 'hover:bg-green-700');
  
  // Reset displays
  noteDisplay.textContent = '--';
  frequencyDisplay.textContent = 'Fréquence: -- Hz';
  
  console.log('Recording stopped');
}

/**
 * Process audio data from microphone
 * @param {AudioProcessingEvent} e - Audio processing event
 */
function processAudio(e) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  analyser.getByteFrequencyData(dataArray);
  
  // Get the frequency with the highest amplitude
  let maxValue = 0;
  let maxIndex = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    if (dataArray[i] > maxValue) {
      maxValue = dataArray[i];
      maxIndex = i;
    }
  }
  
  // Calculate frequency from the index
  const frequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
  
  // Only process strong enough signals (above ambient noise)
  if (maxValue > 100 && frequency > 80) { // Adjust threshold as needed
    const note = getNote(frequency);
    
    // Update UI with detected note and frequency
    if (note !== noteDisplay.textContent) {
      noteDisplay.textContent = note;
      noteDisplay.classList.add('note-animation');
      setTimeout(() => noteDisplay.classList.remove('note-animation'), 300);
    }
    
    frequencyDisplay.textContent = `Fréquence: ${Math.round(frequency)} Hz`;
  }
}

/**
 * Get the musical note name from a frequency
 * @param {number} frequency - The frequency in Hz
 * @returns {string} The name of the musical note
 */
function getNote(frequency) {
  // Find the note octave (assuming A4 = 440Hz)
  const noteA4 = 440;
  const octaveBase = Math.log2(frequency / noteA4);
  const octave = Math.floor(octaveBase * 12) / 12;
  
  // Calculate octave number (A4's octave is 4)
  const octaveNumber = Math.floor(4 + octaveBase);
  
  // Calculate note index (0-11) in the chromatic scale
  const semitonesFromA = Math.round(octave * 12);
  const noteIndex = (semitonesFromA + 9) % 12; // A is 9 semitones from C
  
  // Get the note name from the index
  const noteName = noteFrequencies[noteIndex].note;
  
  return `${noteName}${octaveNumber}`;
}

/**
 * Helper function to clean up audio resources
 * @param {MediaStream} stream - The media stream to clean up
 */
function cleanupAudioResources(stream) {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(track => track.stop());
  }
  
  if (javascriptNode) {
    javascriptNode.onaudioprocess = null;
    javascriptNode.disconnect();
  }
  
  if (analyser) {
    analyser.disconnect();
  }
  
  if (microphone) {
    microphone.disconnect();
  }
  
  if (audioContext) {
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
  }
}

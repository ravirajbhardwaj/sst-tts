const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const grantAccessButton = document.getElementById("grant-access-btn");
const startListeningButton = document.getElementById("start-listening-btn");
const statusDiv = document.getElementById("status");
const waveVisualization = document.getElementById("wave-visualization");
const chatContainer = document.getElementById("chat-container");

let recognition;
let isListening = false;

// Add message to chat container
function addMessage(text, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isUser ? "message user-message" : "message ai-message";
  messageDiv.textContent = text;
  chatContainer.appendChild(messageDiv);

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return messageDiv;
}

// Add typing indicator
function addTypingIndicator() {
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing-indicator";
  typingIndicator.id = "typing-indicator";

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    typingIndicator.appendChild(dot);
  }

  chatContainer.appendChild(typingIndicator);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return typingIndicator;
}

// Remove typing indicator
function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

grantAccessButton.addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(() => {
      statusDiv.textContent = "Microphone access granted";
      statusDiv.style.color = "var(--success)";
      grantAccessButton.disabled = true;
      startListeningButton.disabled = false;
    })
    .catch((error) => {
      statusDiv.textContent = "Microphone access denied";
      statusDiv.style.color = "var(--error)";
      console.error("Mic error:", error);
    });
});

if (!SpeechRecognition) {
  statusDiv.textContent = "Speech Recognition not supported in this browser";
  statusDiv.style.color = "var(--error)";
  startListeningButton.disabled = true;
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    waveVisualization.style.display = "flex";
    statusDiv.textContent = "Listening...";
    statusDiv.style.color = "var(--primary)";
    isListening = true;
    startListeningButton.textContent = "Stop Listening";
  };

  recognition.onend = () => {
    if (isListening) {
      waveVisualization.style.display = "none";
      statusDiv.textContent = "Ready to chat";
      statusDiv.style.color = "var(--text-secondary)";
      isListening = false;
      startListeningButton.textContent = "Start Talking";
    }
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    addMessage(transcript, true);
    statusDiv.textContent = "Thinking...";

    // Add typing indicator while waiting for response
    addTypingIndicator();

    try {
      const body = {
        system_instruction: {
          parts: [
            {
              text: `You are a concise and friendly voice assistant for developers. 
                    Explain topics like authentication, authorization, JWT, sessions, password hashing, config, stateful vs stateless auth, OpenID Connect, and OAuth 2.0 in plain, simple English. 
                    Speak in a natural and casual tone that sounds good in voice. Avoid technical jargon, formatting, bullet points, or asterisks. Keep your answers short and easy to follow. 
                    If asked for an example, mention this GitHub repo: github.com/ravirajbhardwaj/authentication`,
            },
          ],
        },
        contents: [
          {
            parts: [{ text: transcript }],
          },
        ],
      };

      const geminiReply = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((res) => res.json());

      removeTypingIndicator();

      const replyText =
        geminiReply?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response from AI.";

      const cleanedReply = replyText
        .replace(/\*/g, "")
        .replace(/[\r\n]+/g, ". ")
        .replace(/^\s*[-–•]\s*/gm, "")
        .trim();

      addMessage(cleanedReply, false);
      statusDiv.textContent = "Speaking...";
      statusDiv.style.color = "var(--warning)";

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(cleanedReply);

      // Set language and voice
      utterance.lang = "en-US";

      // Find a female voice (browser-dependent)
      const voices = synth.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes("Google UK English Female") ||
          v.name.includes("Google US English") ||
          (v.lang === "en-US" && v.name.toLowerCase().includes("female"))
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else {
        console.warn("Preferred voice not found, using default.");
      }

      utterance.pitch = 1.2; // Slightly sweet tone
      utterance.rate = 0.95;
      utterance.volume = 1;

      utterance.onend = () => {
        statusDiv.innerText = "✅ Done speaking.";
      };

      synth.speak(utterance);
    } catch (error) {
      removeTypingIndicator();
      addMessage("Error communicating with AI.", false);
      statusDiv.textContent = "Error occurred";
      statusDiv.style.color = "var(--error)";
      console.error("Error:", error);
    }
  };
}

startListeningButton.addEventListener("click", () => {
  if (!isListening) {
    recognition.start();
  } else {
    recognition.stop();
    waveVisualization.style.display = "none";
    statusDiv.textContent = "Ready to chat";
    statusDiv.style.color = "var(--text-secondary)";
    isListening = false;
    startListeningButton.textContent = "Start Talking";
  }
});

// Initialize voice synthesis
speechSynthesis.onvoiceschanged = function () {
  // This is just to ensure voices are loaded
};

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBMmPpRt4qdlMLtaCEAAnMmF8S73azv2B8",
  authDomain: "chat-app-599.firebaseapp.com",
  databaseURL: "https://chat-app-599-default-rtdb.firebaseio.com",
  projectId: "chat-app-599",
  storageBucket: "chat-app-599.firebasestorage.app",
  messagingSenderId: "746950973247",
  appId: "1:746950973247:web:a2a280d3f258da47dfa58a",
  measurementId: "G-Y620B0FN0M"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const authMessage = document.getElementById('auth-message');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const contextMenu = document.getElementById('context-menu');
const replyOption = document.getElementById('reply-option');
const deleteOption = document.getElementById('delete-option');
const popup = document.getElementById('popup');
const popupMessage = document.getElementById('popup-message');
const popupClose = document.getElementById('popup-close');

let replyingTo = null; // Track the message being replied to
let selectedMessageKey = null; // Track the selected message key

// Sign out the user on page load
auth.signOut().then(() => {
  console.log("User signed out.");
}).catch((error) => {
  console.error("Error signing out:", error);
});

// Login
loginButton.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (email && password) {
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        authMessage.textContent = '';
        authContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
      })
      .catch((error) => {
        authMessage.textContent = error.message;
      });
  } else {
    authMessage.textContent = 'Please enter email and password';
  }
});

// Send Message
sendButton.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message !== "") {
    const messageData = {
      text: message,
      sender: auth.currentUser.email,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      replyTo: replyingTo ? replyingTo.key : null // Include reply reference
    };

    database.ref('messages').push(messageData)
      .then(() => {
        messageInput.value = "";
        replyingTo = null; // Reset reply state
        messageInput.placeholder = "Type a message...";
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  }
});

// Receive Messages
function loadMessages() {
  database.ref('messages').once('value', (snapshot) => {
    chatBox.innerHTML = ''; // Clear the chat box
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      displayMessage(message, childSnapshot.key);
    });
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
  });
}

// Display a message
function displayMessage(message, key) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', message.sender === auth.currentUser.email ? 'user' : 'other');
  messageElement.dataset.key = key; // Store the message key for replies

  // Add reply container if this is a reply
  if (message.replyTo) {
    const replyContainer = document.createElement('div');
    replyContainer.classList.add('reply-container');

    // Add reply box (message being replied to)
    const replyBox = document.createElement('div');
    replyBox.classList.add('reply-box');
    replyBox.textContent = getMessageText(message.replyTo);
    replyBox.dataset.replyTo = message.replyTo; // Link to the original message
    replyContainer.appendChild(replyBox);

    // Add click/touch listener to the reply box
    addReplyBoxListener(replyBox, message.replyTo);

    // Add reply message (the actual reply)
    const bubble = document.createElement('div');
    bubble.classList.add('reply-message');
    bubble.textContent = message.text;
    replyContainer.appendChild(bubble);

    messageElement.appendChild(replyContainer);
    messageElement.classList.add('reply'); // Add class for reply messages
  } else {
    // Regular message (not a reply)
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.textContent = message.text;
    messageElement.appendChild(bubble);
  }

  chatBox.appendChild(messageElement);

  // Add double-tap gesture for mobile
  addDoubleTapGesture(messageElement, key);

  // Add right-click context menu for desktop
  addContextMenu(messageElement, key);
}

// Get the text of a message by its key (truncated to 50 characters)
function getMessageText(key) {
  let messageText = "Original message not found";
  database.ref('messages/' + key).once('value', (snapshot) => {
    if (snapshot.exists()) {
      const fullText = snapshot.val().text;
      messageText = fullText.length > 50 ? fullText.substring(0, 50) + "..." : fullText;
    }
  });
  return messageText;
}

// Add double-tap gesture to a message (for mobile)
function addDoubleTapGesture(element, key) {
  let lastTap = 0;
  const handleTap = () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) { // Double-tap detected
      element.classList.add('bounce');
      setTimeout(() => {
        element.classList.remove('bounce');
      }, 300); // Match animation duration

      // Find the message text (either from .message-bubble or .reply-message)
      const messageBubble = element.querySelector('.message-bubble');
      const replyMessage = element.querySelector('.reply-message');
      const messageText = messageBubble ? messageBubble.textContent : replyMessage ? replyMessage.textContent : null;

      if (messageText) {
        replyingTo = { key, text: messageText };
        messageInput.placeholder = `Replying to: ${replyingTo.text}`;
      } else {
        console.error("Could not find message text for reply.");
      }
    }

    lastTap = currentTime;
  };

  // Add event listeners for both touch and click
  element.addEventListener('touchend', handleTap);
  element.addEventListener('dblclick', handleTap);
}

// Add context menu to a message (for desktop)
function addContextMenu(element, key) {
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent default right-click menu
    selectedMessageKey = key; // Store the selected message key
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
  });
}

// Handle context menu options
replyOption.addEventListener('click', () => {
  if (selectedMessageKey) {
    const messageElement = chatBox.querySelector(`[data-key="${selectedMessageKey}"]`);
    if (messageElement) {
      const messageBubble = messageElement.querySelector('.message-bubble');
      const replyMessage = messageElement.querySelector('.reply-message');
      const messageText = messageBubble ? messageBubble.textContent : replyMessage ? replyMessage.textContent : null;

      if (messageText) {
        replyingTo = { key: selectedMessageKey, text: messageText };
        messageInput.placeholder = `Replying to: ${replyingTo.text}`;
      } else {
        console.error("Could not find message text for reply.");
      }
    }
  }
  contextMenu.style.display = 'none';
});

deleteOption.addEventListener('click', () => {
  if (selectedMessageKey) {
    const messageElement = chatBox.querySelector(`[data-key="${selectedMessageKey}"]`);
    if (messageElement) {
      const messageSender = messageElement.classList.contains('user') ? auth.currentUser.email : null;

      // Check if the message belongs to the current user
      if (messageSender === auth.currentUser.email) {
        // Delete the message
        database.ref('messages/' + selectedMessageKey).remove()
          .then(() => {
            console.log("Message deleted successfully.");
          })
          .catch((error) => {
            console.error("Error deleting message:", error);
          });
      } else {
        // Show popup for unauthorized deletion
        showPopup("Mera message kahe delete krna hai re tereko🤣");
      }
    }
  }
  contextMenu.style.display = 'none';
});

// Show popup with a message
function showPopup(message) {
  popupMessage.textContent = message;
  popup.style.display = 'flex';
}

// Close popup
popupClose.addEventListener('click', () => {
  popup.style.display = 'none';
});

// Hide popup when clicking outside
popup.addEventListener('click', (e) => {
  if (e.target === popup) {
    popup.style.display = 'none';
  }
});

// Add click/touch listener to the reply box
function addReplyBoxListener(replyBox, replyToKey) {
  replyBox.addEventListener('click', () => {
    // Handle click/touch on the reply box
    const messageElement = chatBox.querySelector(`[data-key="${replyToKey}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      setTimeout(() => {
        messageElement.classList.remove('highlight');
      }, 1000); // Remove highlight after 1 second
    }
  });
}

// Check Auth State
auth.onAuthStateChanged((user) => {
  if (user) {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    loadMessages(); // Load existing messages

    // Listen for new messages
    database.ref('messages').on('child_added', (snapshot) => {
      const message = snapshot.val();
      displayMessage(message, snapshot.key);
      chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
    });

    // Listen for removed messages
    database.ref('messages').on('child_removed', (snapshot) => {
      const messageKey = snapshot.key;

      // Remove the deleted message from the UI
      const messageElement = chatBox.querySelector(`[data-key="${messageKey}"]`);
      if (messageElement) {
        messageElement.remove();
      }

      // Update reply boxes that reference the deleted message
      const replyBoxes = chatBox.querySelectorAll('.reply-box');
      replyBoxes.forEach((replyBox) => {
        if (replyBox.dataset.replyTo === messageKey) {
          replyBox.textContent = "Message deleted";
        }
      });
    });
  } else {
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
  }
});
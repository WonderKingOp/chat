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
const sendButton = document.getElementById('send-button');
const contextMenu = document.getElementById('context-menu');
const replyOption = document.getElementById('reply-option');
const deleteOption = document.getElementById('delete-option');
const popup = document.getElementById('popup');
const popupMessage = document.getElementById('popup-message');
const popupClose = document.getElementById('popup-close');
const replyPreview = document.getElementById('reply-preview');
const replyPreviewText = document.getElementById('reply-preview-text');
const cancelReplyButton = document.getElementById('cancel-reply-button');
const messageInput = document.getElementById('message-input');

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
        calculateLines(messageInput);
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

// Function to display a message
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


// Get the text of a message by its key (truncated to 35 characters)
function getMessageText(key) {
  let messageText = "Original message not found";
  database.ref('messages/' + key).once('value', (snapshot) => {
    if (snapshot.exists()) {
      const fullText = snapshot.val().text;
      messageText = fullText.length > 35 ? fullText.substring(0, 35) + "..." : fullText;
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
        showReplyPreview(messageText); // Show the reply preview box
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

// Function to show the reply preview box
function showReplyPreview(messageText) {
  // Truncate the message text to 25 characters
  const truncatedText = messageText.length > 25 ? messageText.substring(0, 25) + "..." : messageText;
  replyPreviewText.textContent = `Replying to: ${truncatedText}`;
  replyPreview.style.display = 'flex'; // Show the reply preview box
}

// Function to hide the reply preview box
function hideReplyPreview() {
  replyPreview.style.display = 'none'; // Hide the reply preview box
  replyingTo = null; // Reset the reply state
  messageInput.placeholder = "Type a message..."; // Reset the placeholder
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
        showReplyPreview(messageText); // Show the reply preview box
      } else {
        console.error("Could not find message text for reply.");
      }
    }
  }
  contextMenu.style.display = 'none';
  scrollToBottom();
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
        showPopup("You can’t delete others’ messages. We are working on this feature for now.");
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

// Add event listener to hide context menu when clicking outside
document.addEventListener('click', (e) => {
  const isClickInsideContextMenu = contextMenu.contains(e.target);
  const isClickOnMessage = e.target.closest('.message'); // Check if click is on a message

  // Hide the context menu if the click is outside the menu and not on a message
  if (!isClickInsideContextMenu) {
    contextMenu.style.display = 'none';
  }
});

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

    // Listen for updated messages (THIS IS THE CRITICAL PART)
    database.ref('messages').on('child_changed', (snapshot) => {
      const updatedMessage = snapshot.val();
      const messageKey = snapshot.key;

      // Find the message element in the DOM
      const messageElement = chatBox.querySelector(`[data-key="${messageKey}"]`);
      if (messageElement) {
        // Update the message text in the DOM
        const messageBubble = messageElement.querySelector('.message-bubble');
        const replyMessage = messageElement.querySelector('.reply-message');

        if (messageBubble) {
          // Update regular message text
          messageBubble.textContent = updatedMessage.text;
        }

        if (replyMessage) {
          // Update replied message text
          replyMessage.textContent = updatedMessage.text;
        }
      }
    });
  } else {
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
  }
});

// Cancel reply when the cancel button is clicked
cancelReplyButton.addEventListener('click', () => {
  hideReplyPreview(); // Hide the reply preview box
});

// Hide reply preview when sending a message
sendButton.addEventListener('click', () => {
  if (replyingTo) {
    hideReplyPreview(); // Hide the reply preview box after sending
  }
});

// Add click listener to the reply preview box
replyPreview.addEventListener('click', () => {
  if (replyingTo) {
    const messageElement = chatBox.querySelector(`[data-key="${replyingTo.key}"]`);
    if (messageElement) {
      // Scroll to the message being replied to
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight the message
      messageElement.classList.add('highlight');
      setTimeout(() => {
        messageElement.classList.remove('highlight');
      }, 1000); // Remove highlight after 1 second
    }
  }
});

// Function to calculate the number of lines in the textarea
function calculateLines(textarea) {
  const lineHeight = 20; // Line height in pixels (matches CSS)
  const padding = 20; // Total vertical padding (10px top + 10px bottom)
  const minHeight = 20; // Minimum height (1 line)
  const maxHeight = 80; // Maximum height (4 lines)

  // Temporarily set height to auto to calculate scroll height
  textarea.style.height = 'auto';
  const scrollHeight = textarea.scrollHeight - padding; // Subtract padding to get content height

  // Calculate the number of lines
  const lines = Math.floor(scrollHeight / lineHeight) - 1;
  console.log(lines);

  // Adjust height based on the number of lines
  if (lines <= 1) {
    textarea.style.height = `${minHeight}px`; // 1 line
  } else if (lines > 4) {
    textarea.style.height = `${maxHeight}px`; // 4 lines (max)
  } else {
    textarea.style.height = `${lines * lineHeight}px`; // Adjust height for 2-4 lines
  }

  // Enable scrolling if content exceeds 4 lines
  textarea.style.overflowY = lines > 4 ? 'scroll' : 'hidden';

}

// Add input event listener to adjust height dynamically
messageInput.addEventListener('input', () => calculateLines(messageInput));

// Adjust height on page load (in case there's pre-filled text)
calculateLines(messageInput);

// Function to render a message in the chat window
function renderMessage(message) {
  const chatWindow = document.getElementById("chat-window");

  // Create a message bubble
  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";
  messageBubble.textContent = message;

  // Append the message bubble to the chat window
  chatWindow.appendChild(messageBubble);

  // Scroll to the bottom of the chat window
  chatWindow.scrollTop = chatWindow.scrollHeight;
}







// Variables
let selectedMessageBubble = null;

// Function to show the context menu
function showContextMenu(event, messageBubble) {
  event.preventDefault(); // Prevent default right-click menu
  const contextMenu = document.getElementById("context-menu");
  contextMenu.style.display = "block";
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;

  // Store the selected message bubble
  selectedMessageBubble = messageBubble;
}

// Function to enter edit mode
function enterEditMode(messageBubble) {
  const messageText = messageBubble.textContent;

  // Store the original message in a data attribute
  messageBubble.dataset.originalMessage = messageText;

  // Get the dimensions of the message bubble
  const bubbleStyles = window.getComputedStyle(messageBubble);

  const bubbleHeight = bubbleStyles.height;



  // Extract the numeric value from bubbleHeight (e.g., "100px" -> 100)
  const bubbleHeightValue = parseFloat(bubbleHeight);

  // Add 50px to the height
  const newHeight = bubbleHeightValue + 50;

  // Create edit mode elements from the template
  const template = document.getElementById('edit-mode-template');
  const editMode = template.content.cloneNode(true);

  // Set the textarea value to the current message
  const editTextarea = editMode.querySelector('.edit-textarea');
  editTextarea.value = messageText;

  // Apply the new height (original height + 50px) to the textarea
  editTextarea.style.height = `${newHeight}px`;

  // Replace the message bubble content with the edit mode
  messageBubble.innerHTML = "";
  messageBubble.appendChild(editMode);

  editTextarea.focus();

  // Add event listener to the save button
  const saveButton = messageBubble.querySelector('.save-button');
  saveButton.addEventListener('click', () => saveChanges(messageBubble));
}

// Function to save changes
function saveChanges(messageBubble) {
  const editTextarea = messageBubble.querySelector('.edit-textarea');
  const newMessage = editTextarea.value.trim();

  if (newMessage !== "") {
    // Update the message bubble with the new message
    messageBubble.textContent = newMessage;

    // Find the parent message element
    const messageElement = messageBubble.closest('.message');
    if (messageElement) {
      const messageKey = messageElement.dataset.key; // Get the message key

      // Update the message in Firebase
      database.ref(`messages/${messageKey}`).update({ text: newMessage })
        .then(() => {
          console.log("Message updated in Firebase.");

          // Update reply boxes for the current user
          const replyBoxes = chatBox.querySelectorAll('.reply-box');
          replyBoxes.forEach((replyBox) => {
            if (replyBox.dataset.replyTo === messageKey) {
              replyBox.textContent = newMessage.length > 35
                ? newMessage.substring(0, 35) + "..."
                : newMessage;
            }
          });
        })
        .catch((error) => {
          console.error("Error updating message in Firebase:", error);
        });
    } else {
      console.error("Parent message element not found.");
    }
  } else {
    // If the message is empty, revert to the original message
    const originalMessage = messageBubble.dataset.originalMessage;
    if (originalMessage) {
      messageBubble.textContent = originalMessage;
    } else {
      console.error("Original message not found.");
    }
  }
}

// Add event listeners to message bubbles for right-click
document.addEventListener("contextmenu", (event) => {
  // Check if the clicked element is a message bubble or a reply message
  const messageBubble = event.target.closest(".message-bubble, .reply-message");
  if (messageBubble) {
    const messageElement = messageBubble.closest(".message"); // Find the parent message element
    if (messageElement) {
      showContextMenu(event, messageBubble); // Pass the message bubble to the context menu
    }
  }
});

function denyEdit() {
showPopup("You cannot edit messages from the opposite user.") 
}

// Add event listener to the "Edit" option in the context menu
document.getElementById("edit-message").addEventListener("click", () => {
  if (selectedMessageBubble) {
    // Find the parent message element of the selected message bubble
    const messageElement = selectedMessageBubble.closest(".message");

    if (messageElement) {
      // Check if the message belongs to the current user
      const isCurrentUser = messageElement.classList.contains("user");

      if (isCurrentUser) {
        enterEditMode(selectedMessageBubble);
      } else {
        denyEdit();
      }
    } else {
      console.error("Parent message element not found.");
    }
  } else {
    console.error("No message bubble selected.");
  }
  contextMenu.style.display = 'none';
});

// Listen for changes to messages in Firebase
database.ref('messages').on('child_changed', (snapshot) => {
  const updatedMessage = snapshot.val();
  const messageKey = snapshot.key;

  // Find the message element in the DOM
  const messageElement = chatBox.querySelector(`[data-key="${messageKey}"]`);
  if (messageElement) {
    // Update the message text in the DOM
    const messageBubble = messageElement.querySelector('.message-bubble');
    const replyMessage = messageElement.querySelector('.reply-message');

    if (messageBubble) {
      // Update regular message text
      messageBubble.textContent = updatedMessage.text;
    }

    if (replyMessage) {
      // Update replied message text
      replyMessage.textContent = updatedMessage.text;
    }
  }

  // Update all reply boxes that reference this message
  const replyBoxes = chatBox.querySelectorAll('.reply-box');
  replyBoxes.forEach((replyBox) => {
    if (replyBox.dataset.replyTo === messageKey) {
      // Update the reply box with the edited message
      replyBox.textContent = updatedMessage.text.length > 35
        ? updatedMessage.text.substring(0, 35) + "..."
        : updatedMessage.text;
    }
  });
});


// Handle the "Copy" option in the context menu
document.getElementById('copy-option').addEventListener('click', () => {
  if (selectedMessageKey) {
    // Find the message element in the DOM
    const messageElement = chatBox.querySelector(`[data-key="${selectedMessageKey}"]`);
    if (messageElement) {
      // Get the message text (either from .message-bubble or .reply-message)
      const messageBubble = messageElement.querySelector('.message-bubble');
      const replyMessage = messageElement.querySelector('.reply-message');
      const messageText = messageBubble ? messageBubble.textContent : replyMessage ? replyMessage.textContent : null;

      if (messageText) {
        // Copy the message text to the clipboard
        navigator.clipboard.writeText(messageText)
          .then(() => {
            console.log("Message copied to clipboard:", messageText);
            showPopup("Message copied to clipboard!"); // Optional: Show a confirmation popup
          })
          .catch((error) => {
            console.error("Failed to copy message:", error);
            showPopup("Failed to copy message."); // Optional: Show an error popup
          });
      } else {
        console.error("Could not find message text to copy.");
      }
    }
  }
  contextMenu.style.display = 'none'; // Hide the context menu after copying
});

// Function to scroll to the bottom of the chat box
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Scroll event listener for the chat box
chatBox.addEventListener('scroll', () => {
  const scrollButton = document.getElementById('scroll-to-bottom-button');

  // Show the button if the user is not at the bottom
  if (chatBox.scrollTop + chatBox.clientHeight < chatBox.scrollHeight - 50) {
    scrollButton.style.display = 'block';
  } else {
    scrollButton.style.display = 'none';
  }
});

// Scroll to the bottom when the button is clicked
document.getElementById('scroll-to-bottom-button').addEventListener('click', () => {
  scrollToBottom();
});
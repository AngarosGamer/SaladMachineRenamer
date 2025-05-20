/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *\
|                       Created by Angaros                        |
|                                                                 |
|                    Revision 1.2 - 05/20/2025                    |
 \* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Debug
console.log("Salad's Machine Renamer is running!");

const selectors = [ // Current known selectors that contain the machine ID
    "span.css-cke5iv.ei767vo0",
    "span.css-15d7bl7.ei767vo0",
    "span.css-fxzn2p.ei767vo0",
    "div.c01104",
    "div.c0196",
    "span.recharts-tooltip-item-name"
  ];

/**
 * CreateEditButton creates the edit button element used
 * in the page, and associated edit box.
 * @param {string} originalText The original machine's name
 * @param {span} spanElement The span element next to which the button will spawn
 * @return <button>
 */
function createEditButton(originalText, spanElement) {
  const button = document.createElement("button");
  button.textContent = "✏️";
  button.title = "Rename";
  button.classList.add("inline-edit-button"); // Prevents re-checking item on page mutation
  Object.assign(button.style, { // Style button
    marginLeft: "5px",
    cursor: "pointer",
    background: "transparent",
    border: "none"
  });

  button.onclick = () => { // Add onclick function to spawn edit box
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0, left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.6)", // Add dark backdrop when edit box is open
      zIndex: "9999"
    });

    const popup = document.createElement("div"); // Add edit box
    Object.assign(popup.style, { // Style edit box
      position: "fixed",
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      background: "#0a2133",
      color: "#fff",
      border: "1px solid #53a626",
      padding: "20px",
      borderRadius: "10px",
      zIndex: "9999",
      minWidth: "300px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      fontFamily: "Mallory"
    });

    const label = document.createElement("p"); // Add text label
    label.textContent = `Renaming: ${originalText}`;
    label.style.margin = "0";

    const input = document.createElement("input"); // Add input for new name
    input.type = "text";
    input.value = spanElement.textContent;
    input.placeholder = originalText;
    Object.assign(input.style, { // Style input
      padding: "8px",
      fontSize: "14px",
      borderRadius: "10px",
      border: "1px solid #ccc",
      outline: "none",
      fontFamily: "Mallory"
    });

    const buttonRow = document.createElement("div"); // Make row for buttons
    Object.assign(buttonRow.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px"
    });

    const saveBtn = document.createElement("button"); // Add a "Save" button to confirm saving name
    saveBtn.textContent = "Save";
    Object.assign(saveBtn.style, { // Style save
      background: "#53a626", // Style with salad-green confirm
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      padding: "6px 12px",
      cursor: "pointer",
      fontFamily: "Mallory"
    });

    const cancelBtn = document.createElement("button"); // Add a "Cancel" button to cancel saving name
    cancelBtn.textContent = "Cancel";
    Object.assign(cancelBtn.style, { // Style cancel
      background: "#e57373", // Style with light red
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      padding: "6px 12px",
      cursor: "pointer",
      fontFamily: "Mallory"
    });

    saveBtn.onclick = () => { // Logic when the save button is pressed
      const newName = input.value.trim(); // Get new value
      if (newName && newName !== originalText) {
        chrome.storage.local.set({ [originalText]: newName }, () => { // Persistent save of changes in local storage (required to show changes even after page reload)
          console.log(`Renamed ${originalText} -> ${newName}`);

          // Update instances of the name
          updateAllMatchingElements(originalText, newName);
        });
      }
      popup.remove(); // Close edit box 
      overlay.remove(); // Remove dark background
    };

    cancelBtn.onclick = overlay.onclick = () => { // When cancelled or clicked out of popup, close popup & background
      popup.remove();
      overlay.remove();
    };

    // Construct input box structure, add to HTML structure
    buttonRow.append(cancelBtn, saveBtn);
    popup.append(label, input, buttonRow);
    document.body.append(overlay, popup);
    input.focus(); // Make user focused on input to directly start typing
  };

  return button;
}

/**
 * Update all items that contain the previous name.
 * @param {string} original The original machine's name
 * @param {string} renamed The new name 
 */
function updateAllMatchingElements(original, renamed) {
  selectors.forEach(selector => { // Loop over items, 
    document.querySelectorAll(selector).forEach(element => {
      if (element.textContent === original) {
        element.textContent = renamed; // Exact match -> set whole text content
      } else if (element.textContent.includes(original)) { 
        element.textContent = element.textContent.replace(original, renamed); // Partial match -> set only matched text
      }
    });
  });
}

/**
 * Process the page and attach buttons + replace names for all known elements
 */
function processSpans() {
  selectors.forEach((selector, index) => {
    document.querySelectorAll(selector).forEach((element, i) => {
      if (index === 0 && i === 0) return; // skip very first match (element cke5iv.ei767vo0 has non-machine ID occurences for which we don't want an edit button)
      //if (element.dataset._renamed === "true") return; // Has it already been processed? Skip

      // Ensure it corresponds to a machine ID
      const match = element.textContent.match(/\b([a-f0-9]{8})\b/);
      if (!match) return;

      const id = match[1]; // Get the corresponding machine ID
      element.dataset._renamed = "true";

      chrome.storage.local.get(id, (data) => { // Link machine ID to storage content to see if it was renamed
        const renamed = data[id]; 
        if (renamed) { // Was renamed? -> Replace content
          element.textContent = element.textContent.replace(id, renamed);
        }

        // Only add edit button to first selector (others just "receive" updates)
        if (selector === "span.css-cke5iv.ei767vo0") {
          if (!element.nextSibling || !element.nextSibling.classList?.contains("inline-edit-button")) {
            // Add the edit button after the element
            const editButton = createEditButton(id, element);
            element.after(editButton);
          }
        }
      });
    });
  });
}

// Initial page load, attempt to process
processSpans();

// Since Salad uses React / Dynamic content and data is loaded client-side,
// we monitor for page changes to make machine ID changes even when content is reset
const observer = new MutationObserver(processSpans);
observer.observe(document.body, { childList: true, subtree: true });
